describe('Auth Commands - Phase 1 Testing', () => {
	before(() => {
		// Accept cookies once to avoid banner noise across tests
		cy.visit('/')
		cy.acceptCookies()
	})

	describe('Cookie Banner Commands', () => {
		it('should handle cookie banner acceptance', () => {
			cy.visit('/')
			cy.acceptCookies()
			// Should not throw errors and should handle banner if present
		})

		it('should handle cookie banner decline', () => {
			cy.visit('/')
			cy.declineCookies()
			// Should not throw errors and should handle banner if present
		})

		it('should dismiss cookie banner gracefully', () => {
			cy.visit('/')
			cy.dismissCookieBanner()
			// Should handle any cookie banner scenario
		})

		it('should handle pages without cookie banners', () => {
			cy.visit('/signin')
			cy.acceptCookies()
			// Should not fail when no banner is present
		})
	})

	describe('Auth State Management Commands', () => {
		it('should clear auth state completely', () => {
			cy.clearAuth()
			// Should clear all auth-related data
		})

		it('should handle sign out when user is signed in', () => {
			// First sign in a user
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()

			// Then sign out
			cy.signOut()
			cy.url().should('include', '/')
		})

		it('should handle sign out when user is already signed out', () => {
			cy.signOut()
			// Should not fail when user is already signed out
		})
	})

	describe('Basic Auth Commands', () => {
		it('should sign in with valid credentials', () => {
			cy.signIn('user@example.com', 'passWORD123')
			cy.location('pathname').should('eq', '/')
		})

		it('should wait for auth state to stabilize', () => {
			cy.visit('/')
			cy.waitForAuth()
			// Should not throw errors
		})
	})

	describe('Auth State Verification', () => {
		it('should verify signed out state', () => {
			cy.ensureSignedOut()
			cy.visit('/account')
			// Redirects to auth page; query may include "/account" as redirect param
			cy.location('pathname').should((p) => {
				expect(['/signin', '/signup']).to.include(p)
			})
		})

		it('should verify signed in state', () => {
			cy.ensureSignedIn('user@example.com', 'passWORD123')
			cy.visit('/account')
			cy.url().should('include', '/account')
		})
	})
})
