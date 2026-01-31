const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')

admin.initializeApp()

// Stripe secret key - set via `firebase functions:secrets:set STRIPE_SECRET_KEY`
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY')

exports.updateShopManagerAccess = onCall({ region: 'us-central1' }, async (request) => {
	try {
		const { data, auth } = request

		// Verify user is authenticated
		if (!auth) {
			throw new HttpsError('unauthenticated', 'User must be authenticated')
		}

		// Verify user is admin
		const callerToken = await admin.auth().getUser(auth.uid)
		const callerClaims = callerToken.customClaims || {}

		if (callerClaims.admin !== true) {
			throw new HttpsError('permission-denied', 'Only admins can update shop manager access')
		}

		const { userId, shopManager } = data || {}

		if (!userId || typeof shopManager !== 'boolean') {
			throw new HttpsError(
				'invalid-argument',
				'userId and shopManager (boolean) are required'
			)
		}

		// Get current user claims
		const user = await admin.auth().getUser(userId)
		const currentClaims = user.customClaims || {}

		// Update claims (preserve admin if exists)
		const newClaims = {
			...currentClaims,
			shopManager: shopManager
		}

		await admin.auth().setCustomUserClaims(userId, newClaims)

		// Also update Firestore for easier querying
		const db = admin.firestore()
		await db.collection('users').doc(userId).set(
			{
				shopManager: shopManager
			},
			{ merge: true }
		)

		return { success: true, userId, shopManager }
	} catch (error) {
		console.error('Error in updateShopManagerAccess:', error)
		if (error instanceof HttpsError) {
			throw error
		}
		throw new HttpsError('internal', 'An internal error occurred', error.message)
	}
})

/**
 * Creates a Stripe Checkout session for export donations.
 * Requires authenticated and email-verified user.
 */
exports.createDonationCheckout = onCall(
	{ region: 'us-central1', secrets: [stripeSecretKey] },
	async (request) => {
		try {
			const { data, auth } = request

			// Verify user is authenticated
			if (!auth) {
				throw new HttpsError('unauthenticated', 'User must be authenticated')
			}

			// Verify email is verified
			const user = await admin.auth().getUser(auth.uid)
			if (!user.emailVerified) {
				throw new HttpsError('permission-denied', 'Email must be verified')
			}

			const { amount, currency = 'usd', exportConfig, successUrl, cancelUrl } = data || {}

			// Validate amount (100-50000 cents = $1-$500)
			if (!amount || typeof amount !== 'number' || amount < 100 || amount > 50000) {
				throw new HttpsError(
					'invalid-argument',
					'Amount must be between 100 and 50000 cents ($1-$500)'
				)
			}

			// Validate URLs
			if (!successUrl || !cancelUrl) {
				throw new HttpsError('invalid-argument', 'successUrl and cancelUrl are required')
			}

			// Validate export config
			if (!exportConfig || !exportConfig.format || !exportConfig.version) {
				throw new HttpsError(
					'invalid-argument',
					'exportConfig with format and version is required'
				)
			}

			// Initialize Stripe with the secret key
			const stripe = require('stripe')(stripeSecretKey.value())

			// Create Checkout session
			const session = await stripe.checkout.sessions.create({
				mode: 'payment',
				payment_method_types: ['card'],
				line_items: [
					{
						price_data: {
							currency: currency,
							product_data: {
								name: "Verzion's Price Guide Donation",
								description: 'Supporting the Price Guide'
							},
							unit_amount: amount
						},
						quantity: 1
					}
				],
				success_url: successUrl,
				cancel_url: cancelUrl,
				customer_email: user.email,
				metadata: {
					userId: auth.uid,
					exportFormat: exportConfig.format,
					exportVersion: exportConfig.version,
					itemCount: String(exportConfig.itemCount || 0)
				}
			})

			return {
				sessionId: session.id,
				url: session.url
			}
		} catch (error) {
			console.error('Error in createDonationCheckout:', error)
			if (error instanceof HttpsError) {
				throw error
			}
			throw new HttpsError('internal', 'Failed to create checkout session', error.message)
		}
	}
)

/**
 * Verifies a Stripe Checkout session was paid successfully.
 * Updates user profile with donation info.
 */
exports.verifyDonationSession = onCall(
	{ region: 'us-central1', secrets: [stripeSecretKey] },
	async (request) => {
		try {
			const { data, auth } = request

			// Verify user is authenticated
			if (!auth) {
				throw new HttpsError('unauthenticated', 'User must be authenticated')
			}

			const { sessionId } = data || {}

			if (!sessionId || typeof sessionId !== 'string') {
				throw new HttpsError('invalid-argument', 'sessionId is required')
			}

			// Initialize Stripe with the secret key
			const stripe = require('stripe')(stripeSecretKey.value())

			// Retrieve the checkout session from Stripe
			const session = await stripe.checkout.sessions.retrieve(sessionId)

			// Verify the session belongs to this user
			if (session.metadata?.userId !== auth.uid) {
				throw new HttpsError('permission-denied', 'Session does not belong to this user')
			}

			// Check payment status
			if (session.payment_status !== 'paid') {
				return {
					verified: false,
					reason: 'Payment not completed',
					paymentStatus: session.payment_status
				}
			}

			// Update user profile in Firestore
			const db = admin.firestore()
			await db.collection('users').doc(auth.uid).set(
				{
					hasDonated: true,
					lastDonatedAt: FieldValue.serverTimestamp()
				},
				{ merge: true }
			)

			return {
				verified: true,
				amount: session.amount_total,
				currency: session.currency,
				metadata: {
					exportFormat: session.metadata?.exportFormat,
					exportVersion: session.metadata?.exportVersion,
					itemCount: session.metadata?.itemCount
				}
			}
		} catch (error) {
			console.error('Error in verifyDonationSession:', error)
			if (error instanceof HttpsError) {
				throw error
			}
			// Handle Stripe-specific errors
			if (error.type === 'StripeInvalidRequestError') {
				throw new HttpsError('not-found', 'Checkout session not found')
			}
			throw new HttpsError('internal', 'Failed to verify session', error.message)
		}
	}
)
