describe('Shop Manager Access Control', () => {
	before(() => {
		cy.visit('/')
		cy.acceptCookies()
	})

	describe('Unauthenticated Users', () => {
		beforeEach(() => {
			cy.ensureSignedOut()
		})

		it('shows CTA/modal prompting sign up when accessing /shop-manager', () => {
			cy.visit('/shop-manager')
			cy.location('pathname').should('eq', '/shop-manager')

			// Should see the feature page with CTA button
			cy.get('[data-cy="shop-manager-cta-button"]').should('be.visible')
			cy.contains('Try the Shop Manager').should('be.visible')
		})

		it('opens modal when clicking CTA button', () => {
			cy.visit('/shop-manager')
			cy.get('[data-cy="shop-manager-cta-button"]').click()

			// Modal should open with sign up content
			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')
			cy.contains('Almost there!').should('be.visible')
			cy.contains("You'll need an account to use the Shop Manager").should('be.visible')
		})

		it('redirects when accessing protected shop manager routes', () => {
			// Try to access shop items view
			cy.visit('/shop/invalid-shop-id')
			cy.location('pathname').should('eq', '/signin')

			// Try to access market overview
			cy.visit('/market-overview')
			cy.location('pathname').should('eq', '/signin')
		})

		it('modal navigation to sign up works', () => {
			cy.visit('/shop-manager')
			cy.get('[data-cy="shop-manager-cta-button"]').click()
			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')

			// Click create account button
			cy.get('[data-cy="shop-manager-modal-signup"]').click()
			cy.location('pathname').should('eq', '/signup')
		})

		it('modal navigation to sign in works', () => {
			cy.visit('/shop-manager')
			cy.get('[data-cy="shop-manager-cta-button"]').click()
			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')

			// Click sign in link
			cy.get('[data-cy="shop-manager-modal-signin-link"]').click()
			cy.location('pathname').should('eq', '/signin')
		})
	})

	describe('Unverified Users', () => {
		beforeEach(() => {
			cy.ensureSignedOut()
		})

		it('shows email verification prompt modal', () => {
			cy.signIn('unverified@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.location('pathname').should('eq', '/shop-manager')

			// Should see CTA button for unverified users
			cy.get('[data-cy="shop-manager-cta-button"]').should('be.visible')
			cy.get('[data-cy="shop-manager-cta-button"]').click()

			// Modal should show verification content
			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')
			cy.contains('So close!').should('be.visible')
			cy.contains('Please verify your email address').should('be.visible')
		})

		it('modal navigation to verify email works', () => {
			cy.signIn('unverified@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.get('[data-cy="shop-manager-cta-button"]').click()
			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')

			// Click verify email button
			cy.get('[data-cy="shop-manager-modal-verify-email"]').click()
			cy.location('pathname').should('eq', '/verify-email')
		})
	})

	describe('Verified Users with Access', () => {
		it('can access shop manager dashboard', () => {
			cy.ensureSignedOut()
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.location('pathname').should('eq', '/shop-manager')

			// Should see the actual shop manager, not the CTA
			cy.contains('Player Shop Manager').should('be.visible')
			cy.get('[data-cy="shop-manager-cta-button"]').should('not.exist')
		})

		it('can access shop items view', () => {
			cy.ensureSignedOut()
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Try to navigate to a shop if one exists
			// This will be expanded when we have seeded shop data
			cy.get('body').then(($body) => {
				const shopLink = $body.find('a[href*="/shop/"]')
				if (shopLink.length > 0) {
					cy.wrap(shopLink.first()).click({ force: true })
					cy.location('pathname').should('match', /^\/shop\/.+/)
				}
			})
		})
	})
})
