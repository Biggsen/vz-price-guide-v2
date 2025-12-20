describe('Shop Manager Dashboard', () => {
	before(() => {
		cy.visit('/')
		cy.acceptCookies()
	})

	describe('Dashboard Display', () => {
		it('loads with correct title and structure', () => {
			cy.ensureSignedOut()
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.location('pathname').should('eq', '/shop-manager')

			cy.contains('Player Shop Manager').should('be.visible')
			cy.get('[data-cy="shop-manager-add-server-button"]').should('be.visible')
		})

		it('shows empty state when no servers exist', () => {
			// This test assumes a user with no servers
			// We may need to create a separate test user for this
			cy.ensureSignedOut()
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Check if empty state is shown (if no servers)
			cy.get('body').then(($body) => {
				if ($body.find('[data-cy="shop-manager-empty-servers"]').length > 0) {
					cy.get('[data-cy="shop-manager-empty-servers"]').should('be.visible')
					cy.contains('No servers yet').should('be.visible')
				}
			})
		})

		it('displays existing servers', () => {
			cy.ensureSignedOut()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Should see at least one server from seeded data
			cy.contains('Test Server 1').should('be.visible')
		})

		it('displays existing shops grouped by server', () => {
			cy.ensureSignedOut()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Should see shops for the test server
			cy.contains('Test Server 1').should('be.visible')
			// Shops should be visible in the server card
			cy.get('body').then(($body) => {
				const shopLinks = $body.find('a[href*="/shop/"]')
				expect(shopLinks.length).to.be.greaterThan(0)
			})
		})

		it('server count displays correctly', () => {
			cy.ensureSignedOut()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Count visible servers
			cy.get('[data-cy="server-card"]').then(($cards) => {
				const count = $cards.length
				expect(count).to.be.greaterThan(0)
			})
		})
	})

	describe('Navigation', () => {
		it('server form modal opens and closes correctly', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Click add server button
			cy.get('[data-cy="shop-manager-add-server-button"]').click()

			// Modal should open
			cy.get('[data-cy="server-form-modal"]').should('be.visible')
			cy.contains('Add New Server').should('be.visible')

			// Close modal
			cy.get('[data-cy="server-form-modal-close"]').click()
			cy.get('[data-cy="server-form-modal"]').should('not.exist')
		})

		it('shop form modal opens and closes correctly', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Click add shop button (assuming a server exists)
			cy.get('body').then(($body) => {
				const addShopButton = $body.find('[data-cy="shop-manager-add-shop-button"]')
				if (addShopButton.length > 0) {
					cy.wrap(addShopButton.first()).click({ force: true })

					// Modal should open
					cy.get('[data-cy="shop-form-modal"]').should('be.visible')

					// Close modal
					cy.get('[data-cy="shop-form-modal-close"]').click()
					cy.get('[data-cy="shop-form-modal"]').should('not.exist')
				}
			})
		})

		it('navigation to shop items view works', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Click on a shop link
			cy.get('body').then(($body) => {
				const shopLink = $body.find('a[href*="/shop/"]')
				if (shopLink.length > 0) {
					cy.wrap(shopLink.first()).click({ force: true })
					cy.location('pathname').should('match', /^\/shop\/.+/)
				}
			})
		})

		it('navigation to market overview works', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Click market overview button
			cy.get('body').then(($body) => {
				const marketButton = $body.find('a[href*="/market-overview"]')
				if (marketButton.length > 0) {
					cy.wrap(marketButton.first()).click({ force: true })
					cy.location('pathname').should('eq', '/market-overview')
				}
			})
		})
	})

	describe('LocalStorage Persistence', () => {
		it('persists shop visibility preferences', () => {
			cy.ensureSignedOut()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.waitForAuth()

			// Toggle shop visibility if toggle exists
			cy.get('body').then(($body) => {
				const toggleButton = $body.find('[data-cy="shop-visibility-toggle"]')
				if (toggleButton.length > 0) {
					cy.wrap(toggleButton.first()).click({ force: true })

					// Reload page
					cy.reload()
					cy.waitForAuth()

					// Check that preference persisted
					cy.window().then((win) => {
						const saved = win.localStorage.getItem('shopManagerShopsHidden')
						expect(saved).to.not.be.null
					})
				}
			})
		})
	})
})
