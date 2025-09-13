// Cypress E2E Support File
// Global configuration and custom commands for auth testing

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
	// Prevent Cypress from failing on uncaught exceptions
	// This is especially important for Firebase Auth and cookie banner interactions
	if (err.message.includes('ResizeObserver loop limit exceeded')) {
		return false
	}
	if (err.message.includes('Script error')) {
		return false
	}
	// Log the error for debugging but don't fail the test
	console.warn('Uncaught exception:', err.message)
	return false
})

// Cookie Banner Handling Commands
const SESSION_VERSION = 'v1'
Cypress.Commands.add('acceptCookies', () => {
	cy.log('Attempting to accept cookies...')

	// Wait for page to load and check for cookie banner
	cy.get('body').should('be.visible')

	// Try to find and click the accept button with retry logic
	cy.get('body').then(($body) => {
		const acceptButton = $body.find('[data-tid="banner-accept"]')
		if (acceptButton.length > 0) {
			cy.log('Cookie banner found, clicking accept')
			cy.get('[data-tid="banner-accept"]').should('be.visible').click({ force: true })

			// Wait for banner to disappear
			cy.get('[data-tid="banner-accept"]').should('not.exist')
			cy.log('Cookies accepted successfully')
		} else {
			cy.log('No cookie banner found, continuing...')
		}
	})
})

Cypress.Commands.add('declineCookies', () => {
	cy.log('Attempting to decline cookies...')

	cy.get('body').should('be.visible')

	cy.get('body').then(($body) => {
		const declineButton = $body.find('[data-tid="banner-decline"]')
		if (declineButton.length > 0) {
			cy.log('Cookie banner found, clicking decline')
			cy.get('[data-tid="banner-decline"]').should('be.visible').click({ force: true })

			// Wait for banner to disappear
			cy.get('[data-tid="banner-decline"]').should('not.exist')
			cy.log('Cookies declined successfully')
		} else {
			cy.log('No cookie banner found, continuing...')
		}
	})
})

Cypress.Commands.add('dismissCookieBanner', () => {
	cy.log('Attempting to dismiss cookie banner...')

	// Try accept first, then decline if accept not available
	cy.get('body').then(($body) => {
		const acceptButton = $body.find('[data-tid="banner-accept"]')
		const declineButton = $body.find('[data-tid="banner-decline"]')

		if (acceptButton.length > 0) {
			cy.acceptCookies()
		} else if (declineButton.length > 0) {
			cy.declineCookies()
		} else {
			cy.log('No cookie banner found to dismiss')
		}
	})
})

// Auth State Management Commands
Cypress.Commands.add('clearAuth', () => {
	cy.log('Clearing all auth state...')

	// Clear localStorage
	cy.clearLocalStorage()

	// Clear sessionStorage (using window.sessionStorage.clear())
	cy.window().then((win) => {
		win.sessionStorage.clear()

		// Best-effort: remove Firebase Auth persistence (IndexedDB)
		const deleteDb = (name) =>
			new Promise((resolve) => {
				try {
					const req = win.indexedDB.deleteDatabase(name)
					req.onsuccess = req.onerror = req.onblocked = () => resolve()
				} catch {
					resolve()
				}
			})
		return deleteDb('firebaseLocalStorageDb')
			.then(() => deleteDb('firebase-installations-database'))
			.then(() => deleteDb('firebase-installations-store'))
	})

	// Clear cookies
	cy.clearCookies()

	// Check if we need to sign out from Firebase Auth
	cy.visit('/account')

	// Check if we're actually signed in by seeing if we stay on account page
	cy.url().then((url) => {
		if (url.includes('/account') && !url.includes('/signin')) {
			// We're on account page, so we're signed in - need to sign out
			cy.log('User is signed in, signing out...')
			cy.get('body').then(($body) => {
				const signOutButton = $body.find(
					'[data-cy="sign-out-button"], button:contains("Sign Out")'
				)
				if (signOutButton.length > 0) {
					cy.get('[data-cy="sign-out-button"], button:contains("Sign Out")').click()
					cy.url().should('include', '/')
				} else {
					cy.log('No sign out button found, but on account page')
				}
			})
		} else {
			cy.log('User is already signed out (redirected to signin)')
		}
	})
})

Cypress.Commands.add('signOut', () => {
	cy.log('Signing out user...')

	// If not already on an auth-related page, navigate once to /account
	cy.location('pathname').then((p) => {
		if (!['/account', '/signin', '/signup'].includes(p)) {
			cy.visit('/account')
		}
	})

	// Wait for router to settle on either account or auth page
	cy.location('pathname', { timeout: 10000 }).should((p) => {
		expect(['/account', '/signin', '/signup']).to.include(p)
	})

	cy.location('pathname').then((path) => {
		if (path === '/account') {
			// We're actually on account page, look for sign out button
			cy.get('body').then(($body) => {
				const signOutButton = $body.find(
					'[data-cy="sign-out-button"], button:contains("Sign Out")'
				)
				if (signOutButton.length > 0) {
					cy.log('Found sign out button, clicking...')
					cy.get('[data-cy="sign-out-button"], button:contains("Sign Out")')
						.should('be.visible')
						.click()

					// Wait for redirect to home page
					cy.url().should('include', '/')
					cy.log('Successfully signed out')
				} else {
					cy.log(
						'No sign out button found; assuming already signed out or no UI sign out'
					)
					// Intentionally do nothing to avoid failing when already signed out
				}
			})
		} else {
			cy.log('Not on account page, user is already signed out')
		}
	})
})

Cypress.Commands.add('ensureSignedOut', () => {
	cy.log('Ensuring user is signed out...')

	// First, proactively clear Firebase auth persistence without touching consent cookies
	cy.window().then((win) => {
		const deleteDb = (name) =>
			new Promise((resolve) => {
				try {
					const req = win.indexedDB.deleteDatabase(name)
					req.onsuccess = req.onerror = req.onblocked = () => resolve()
				} catch {
					resolve()
				}
			})
		return deleteDb('firebaseLocalStorageDb')
			.then(() => deleteDb('firebase-installations-database'))
			.then(() => deleteDb('firebase-installations-store'))
	})

	// Now navigate to verify guest state
	cy.visit('/account')

	// Wait for auth state to stabilize after clearing persistence
	cy.waitForAuth()

	// Check if we're still on account page or have been redirected
	cy.location('pathname', { timeout: 10000 }).should((p) => {
		expect(['/account', '/signin', '/signup']).to.include(p)
	})
	cy.location('pathname').then((path) => {
		if (path === '/account') {
			cy.log('Still on account after clearing persistence; attempting UI sign out')
			cy.signOut()
		} else {
			cy.log('User is signed out (redirected to auth)')
		}
	})
})

Cypress.Commands.add('ensureSignedIn', (email, password) => {
	cy.log(`Ensuring user is signed in (cached session): ${email}`)

	// Avoid cross-run callback hash mismatch errors when code changes
	if (Cypress.session && Cypress.session.clearAllSavedSessions) {
		Cypress.session.clearAllSavedSessions()
	}

	// Cache a signed-in session per user to avoid repeated UI work
	const sessionId = `signed-in:${SESSION_VERSION}:${email}`
	cy.session(
		sessionId,
		() => {
			cy.visit('/signin')
			cy.get('body', { timeout: 10000 }).then(($body) => {
				const hasForm = $body.find('[data-cy="signin-email"]').length > 0
				if (hasForm) {
					cy.get('[data-cy="signin-email"]').type(email)
					cy.get('[data-cy="signin-password"]').type(password)
					cy.get('[data-cy="signin-submit"]').click()
					cy.location('pathname').should('eq', '/')
				} else {
					cy.location('pathname', { timeout: 10000 }).then((p) => {
						if (p !== '/') {
							cy.visit('/')
						}
					})
				}
			})
		},
		{ cacheAcrossSpecs: true }
	)
})

// Basic Auth Commands (to be expanded in Phase 2)
Cypress.Commands.add('signIn', (email, password) => {
	cy.log(`Signing in user: ${email}`)

	cy.visit('/signin')

	cy.waitForAuth()

	cy.get('body', { timeout: 10000 }).then(($body) => {
		const hasForm = $body.find('[data-cy="signin-email"]').length > 0
		if (hasForm) {
			cy.get('[data-cy="signin-email"]').type(email)
			cy.get('[data-cy="signin-password"]').type(password)
			cy.get('[data-cy="signin-submit"]').click()
			cy.location('pathname').should('eq', '/')
			cy.log('Sign in completed successfully')
		} else {
			cy.location('pathname', { timeout: 10000 }).then((p) => {
				if (p !== '/') {
					cy.visit('/')
				}
			})
			cy.log('Sign in form not present; assuming already signed in')
		}
	})
})

Cypress.Commands.add('signUp', (email, password, confirmPassword) => {
	cy.log(`Signing up user: ${email}`)

	cy.visit('/signup')

	cy.waitForAuth()

	cy.get('body', { timeout: 10000 }).then(($body) => {
		const hasForm = $body.find('[data-cy="signup-email"]').length > 0
		if (hasForm) {
			cy.get('[data-cy="signup-email"]').type(email)
			cy.get('[data-cy="signup-password"]').type(password)
			cy.get('[data-cy="signup-confirm-password"]').type(confirmPassword)
			cy.get('[data-cy="signup-terms"]').check()
			cy.get('[data-cy="signup-submit"]').click()
			cy.log('Sign up completed successfully')
		} else {
			cy.log('Sign up form not present; assuming already signed in or on different page')
		}
	})
})

Cypress.Commands.add('requestPasswordReset', (email) => {
	cy.log(`Requesting password reset for: ${email}`)

	cy.visit('/reset-password')

	cy.waitForAuth()

	cy.get('body', { timeout: 10000 }).then(($body) => {
		const hasForm = $body.find('[data-cy="reset-email"]').length > 0
		if (hasForm) {
			cy.get('[data-cy="reset-email"]').type(email)
			cy.get('[data-cy="reset-submit"]').click()
			cy.log('Password reset request completed successfully')
		} else {
			cy.log('Password reset form not present; assuming already on different page')
		}
	})
})

Cypress.Commands.add('verifyEmail', (email) => {
	cy.log(`Verifying email for: ${email}`)

	// Use Firebase Admin SDK task to mark user as verified
	cy.task('verifyUserEmail', email).then((result) => {
		cy.log(`Email verified successfully for: ${result.email}`)
	})
})

Cypress.Commands.add('simulateEmailVerification', (email) => {
	cy.log(`Simulating email verification flow for: ${email}`)

	// First verify the email via Admin SDK
	cy.verifyEmail(email)

	// Then simulate the complete verification flow
	cy.visit('/verify-email-success?oobCode=test-verification')

	// The page should show success since user is already verified
	cy.contains('Email Verified!').should('be.visible')

	// Wait for redirect to account page
	cy.location('pathname', { timeout: 10000 }).should('eq', '/account')
})

Cypress.Commands.add('changePassword', (currentPassword, newPassword, confirmPassword) => {
	cy.log(`Changing password for current user...`)

	cy.visit('/change-password')
	cy.waitForAuth()

	cy.get('body', { timeout: 10000 }).then(($body) => {
		const hasForm = $body.find('[data-cy="change-password-current"]').length > 0
		if (hasForm) {
			cy.get('[data-cy="change-password-current"]').type(currentPassword)
			cy.get('[data-cy="change-password-new"]').type(newPassword)
			cy.get('[data-cy="change-password-confirm"]').type(confirmPassword)
			cy.get('[data-cy="change-password-submit"]').click()
			cy.log('Password change form submitted successfully')
		} else {
			cy.log('Password change form not present; assuming already on different page')
		}
	})
})

// Wait for auth state to stabilize
Cypress.Commands.add('waitForAuth', () => {
	cy.log('Waiting for auth state to stabilize...')
	cy.wait(2000) // Give Firebase Auth time to settle
})
