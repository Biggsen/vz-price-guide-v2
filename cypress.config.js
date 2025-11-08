const { defineConfig } = require('cypress')
const admin = require('firebase-admin')

// Check if we're using emulators (same logic as seed-emulator.js)
function usingEmulators() {
	const flag = (process.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase()
	return (
		!!process.env.FIRESTORE_EMULATOR_HOST ||
		!!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
		flag === '1' ||
		flag === 'true'
	)
}

// Initialize Firebase Admin SDK for emulator tasks
function initializeAdminForEmulator() {
	if (!admin.apps.length) {
		// When targeting emulators, never read service-account.json
		// Use the same logic as seed-emulator.js
		// For Cypress tasks, always assume emulator mode since we're running tests
		// This avoids credential issues when running in test environment
		const projectId =
			process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-vz-price-guide'
		console.log(`[cypress-task] Initializing Admin SDK with projectId: ${projectId}`)

		// Set emulator hosts for Admin SDK
		process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
		process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'

		admin.initializeApp({ projectId })
	}
	return admin
}

module.exports = defineConfig({
	video: false,
	screenshotOnRunFailure: true,
	// Run in headless mode by default for faster execution
	headless: true,
	e2e: {
		baseUrl: 'http://localhost:5180',
		specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
		supportFile: 'cypress/support/e2e.js',
		// Performance optimizations
		defaultCommandTimeout: 15000, // Balanced timeout for auth operations
		requestTimeout: 10000, // Reduced from default 5000ms
		responseTimeout: 10000, // Reduced from default 30000ms
		pageLoadTimeout: 15000, // Reduced from default 60000ms
		// Faster assertion timeouts
		execTimeout: 30000, // Reduced from default 60000ms
		// Viewport optimization for faster rendering
		viewportWidth: 1280,
		viewportHeight: 720,
		setupNodeEvents(on, config) {
			on('task', {
				async verifyUserEmail(email) {
					try {
						// Debug: show environment info
						console.log('[cypress-task] Environment check:')
						console.log(
							'  VITE_FIREBASE_EMULATORS:',
							process.env.VITE_FIREBASE_EMULATORS
						)
						console.log(
							'  FIRESTORE_EMULATOR_HOST:',
							process.env.FIRESTORE_EMULATOR_HOST
						)
						console.log(
							'  FIREBASE_AUTH_EMULATOR_HOST:',
							process.env.FIREBASE_AUTH_EMULATOR_HOST
						)
						console.log('  GCLOUD_PROJECT:', process.env.GCLOUD_PROJECT)
						console.log('  Using emulators:', usingEmulators())

						const adminApp = initializeAdminForEmulator()
						const user = await adminApp.auth().getUserByEmail(email)
						await adminApp.auth().updateUser(user.uid, { emailVerified: true })
						console.log(`[cypress-task] Verified email for user: ${email}`)
						return { success: true, email }
					} catch (error) {
						console.error(
							`[cypress-task] Failed to verify email for ${email}:`,
							error.message
						)
						throw error
					}
				},
				async signInUser(email, password = 'password123') {
					try {
						console.log(`[cypress-task] Signing in user: ${email}`)

						const adminApp = initializeAdminForEmulator()

						// Get user and verify email
						const user = await adminApp.auth().getUserByEmail(email)
						await adminApp.auth().updateUser(user.uid, { emailVerified: true })

						// Create custom token for sign in
						const customToken = await adminApp.auth().createCustomToken(user.uid)

						console.log(`[cypress-task] Created custom token for user: ${email}`)
						return { success: true, email, customToken }
					} catch (error) {
						console.error(
							`[cypress-task] Failed to sign in user ${email}:`,
							error.message
						)
						throw error
					}
				},
				async generatePasswordResetCode(email) {
					try {
						console.log(`[cypress-task] Generating password reset code for: ${email}`)

						const adminApp = initializeAdminForEmulator()

						// Generate a password reset code using Firebase Admin SDK
						const resetCode = await adminApp.auth().generatePasswordResetLink(email, {
							url: 'http://localhost:5180/reset-password-confirm'
						})

						// Extract oobCode from the reset link
						const url = new URL(resetCode)
						const oobCode = url.searchParams.get('oobCode')

						if (!oobCode) {
							throw new Error('Failed to extract oobCode from reset link')
						}

						console.log(`[cypress-task] Generated oobCode for ${email}: ${oobCode}`)
						return { success: true, oobCode, email }
					} catch (error) {
						console.error(
							`[cypress-task] Failed to generate password reset code for ${email}:`,
							error.message
						)
						throw error
					}
				}
			})
		}
	}
})
