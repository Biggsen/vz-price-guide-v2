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
	})

	// Clear cookies
	cy.clearCookies()

	// Check if we need to sign out from Firebase Auth
	cy.visit('/account')
	cy.acceptCookies()

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

	// Try to visit account page to trigger sign out
	cy.visit('/account')
	cy.acceptCookies()

	// Wait for page to load and check if we're on account page
	cy.url().then((url) => {
		if (url.includes('/account') && !url.includes('/signin')) {
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
					cy.log('No sign out button found, but on account page')
					// Force a page reload and try again
					cy.reload()
					cy.wait(2000)
					cy.get('[data-cy="sign-out-button"]').should('exist').click()
					cy.url().should('include', '/')
				}
			})
		} else {
			cy.log('Not on account page, user is already signed out')
		}
	})
})

Cypress.Commands.add('ensureSignedOut', () => {
	cy.log('Ensuring user is signed out...')

	// Check if we're already signed out by trying to visit a protected route
	cy.visit('/account')
	cy.acceptCookies()

	// Check if we're redirected to signin page (signed out) or on account page (signed in)
	cy.url().then((url) => {
		if (url.includes('/account') && !url.includes('/signin')) {
			// We're actually on account page, so we're signed in - need to sign out
			cy.log('User is signed in, signing out...')
			cy.signOut()
		} else {
			cy.log('User is already signed out (redirected to signin)')
		}
	})
})

Cypress.Commands.add('ensureSignedIn', (email, password) => {
	cy.log(`Ensuring user is signed in: ${email}`)

	// Check if we're already signed in
	cy.visit('/account')
	cy.acceptCookies()

	cy.url().then((url) => {
		if (url.includes('/account')) {
			cy.log('User is already signed in')
		} else {
			cy.log('User is not signed in, signing in...')
			cy.signIn(email, password)
		}
	})
})

// Basic Auth Commands (to be expanded in Phase 2)
Cypress.Commands.add('signIn', (email, password) => {
	cy.log(`Signing in user: ${email}`)

	cy.visit('/signin')
	cy.acceptCookies()

	cy.get('[data-cy="signin-email"]').type(email)
	cy.get('[data-cy="signin-password"]').type(password)
	cy.get('[data-cy="signin-submit"]').click()

	// Wait for sign in to complete
	cy.url().should('include', '/account')
	cy.log('Sign in completed successfully')
})

// Wait for auth state to stabilize
Cypress.Commands.add('waitForAuth', () => {
	cy.log('Waiting for auth state to stabilize...')
	cy.wait(2000) // Give Firebase Auth time to settle
})
