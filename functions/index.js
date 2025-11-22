const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

admin.initializeApp()

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
			throw new HttpsError(
				'permission-denied',
				'Only admins can update shop manager access'
			)
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

