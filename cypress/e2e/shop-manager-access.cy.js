describe('Shop Manager Access Control', () => {
	before(() => {
		cy.visit('/')
		cy.acceptCookies()
	})

	// Player Shops CTA — Admin Shop has a separate button on the same landing page
	function visitShopManagerLanding() {
		cy.visit('/shop-manager')
		cy.acceptCookies()
	}

	function clickPlayerShopManagerCta() {
		cy.contains('Open the Shop Manager').click()
	}

	describe('Unauthenticated Users', () => {
		beforeEach(() => {
			cy.ensureSignedOut()
		})

		it('shows CTA/modal prompting sign up when accessing /shop-manager', () => {
			visitShopManagerLanding()
			cy.location('pathname').should('eq', '/shop-manager')

			cy.contains('Player Shops').should('be.visible')
			cy.contains('Open the Shop Manager').should('be.visible')
		})

		it('opens modal when clicking CTA button', () => {
			visitShopManagerLanding()
			clickPlayerShopManagerCta()

			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')
			cy.contains('Almost there!').should('be.visible')
			cy.contains("You'll need an account to use Shop Manager.").should('be.visible')
		})

		it('redirects when accessing protected shop manager routes', () => {
			cy.visit('/shop/invalid-shop-id')
			cy.location('pathname').should('eq', '/signin')

			cy.visit('/market-overview')
			cy.location('pathname').should('eq', '/signin')
		})

		it('modal navigation to sign up works', () => {
			visitShopManagerLanding()
			clickPlayerShopManagerCta()
			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')

			cy.get('[data-cy="shop-manager-modal-signup"]').click()
			cy.location('pathname').should('eq', '/signup')
		})

		it('modal navigation to sign in works', () => {
			visitShopManagerLanding()
			clickPlayerShopManagerCta()
			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')

			cy.get('[data-cy="shop-manager-modal-signin-link"]').click({ force: true })
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
			cy.acceptCookies()
			cy.location('pathname').should('eq', '/shop-manager')

			cy.contains('Open the Shop Manager').should('be.visible')
			clickPlayerShopManagerCta()

			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')
			cy.contains('So close!').should('be.visible')
			cy.contains('Please verify your email address to use Shop Manager.').should('be.visible')
		})

		it('modal navigation to verify email works', () => {
			cy.signIn('unverified@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.acceptCookies()
			clickPlayerShopManagerCta()
			cy.get('[data-cy="shop-manager-modal"]').should('be.visible')

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
			cy.acceptCookies()
			cy.location('pathname').should('eq', '/shop-manager')

			cy.contains('h1', 'Shop Manager').should('be.visible')
			cy.contains('Open the Shop Manager').should('not.exist')
		})

		it('can access shop items view', () => {
			cy.ensureSignedOut()
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

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
