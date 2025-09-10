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
	e2e: {
		baseUrl: 'http://localhost:5173',
		specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
		supportFile: 'cypress/support/e2e.js',
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
				}
			})
		}
	}
})
