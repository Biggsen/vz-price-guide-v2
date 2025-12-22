describe('Shop Manager - Market Overview', () => {
	before(() => {
		cy.visit('/')
		cy.acceptCookies()
	})

	describe('Navigation to Market Overview', () => {
		it('navigates to market overview from shop manager', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.wait(1000)

			// Click Market Overview button
			cy.contains('Market Overview').first().click()
			cy.location('pathname').should('eq', '/market-overview')
			cy.location('search').should('include', 'serverId')
		})

		it('navigates to market overview from shop items view', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			// Click Market Overview button
			cy.get('[data-cy="shop-items-market-overview-button"]').click()
			cy.location('pathname').should('eq', '/market-overview')
			cy.location('search').should('include', 'serverId=test-server-1')
		})

		it('displays back button to return to shop manager', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			cy.get('[data-cy="market-overview-back-button"]').should('be.visible')
			cy.get('[data-cy="market-overview-back-button"]').click()
			cy.location('pathname').should('eq', '/shop-manager')
		})
	})

	describe('Market Overview Display', () => {
		it('loads market overview for selected server', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Should see server name in title
			cy.contains('Test Server 1 Market Overview').should('be.visible')
			cy.contains('Browse and analyze items across all shops').should('be.visible')
		})

		it('displays market statistics', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Should see stat cards
			cy.contains('Items').should('be.visible')
			cy.contains('Shops').should('be.visible')
			cy.contains('Your Shops').should('be.visible')
			cy.contains('Player shops').should('be.visible')
		})

		it('displays all shops on server', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Should see items table with shop information
			cy.get('table').should('be.visible')
			// Check that shop links are present
			cy.get('[data-cy="market-overview-shop-link"]').should('have.length.at.least', 1)
		})

		it('displays empty state when no items match search', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Search for something that doesn't exist
			cy.get('[data-cy="market-overview-search-input"]').type('nonexistentitem12345')
			cy.wait(500)

			// Should see empty search state
			cy.get('[data-cy="market-overview-empty-search-state"]').should('be.visible')
			cy.contains('No items found matching').should('be.visible')
		})
	})

	describe('Search and Filtering', () => {
		it('searches items by name', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Search for an item
			cy.get('[data-cy="market-overview-search-input"]').type('diamond')
			cy.wait(500)

			// Should see filtered results
			cy.contains('Showing').should('be.visible')
			cy.contains('matching "diamond"').should('be.visible')
		})

		it('resets search query', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Enter search query
			cy.get('[data-cy="market-overview-search-input"]').type('diamond')
			cy.wait(500)

			// Reset search
			cy.get('[data-cy="market-overview-reset-search-button"]').click()
			cy.wait(500)

			// Search input should be empty
			cy.get('[data-cy="market-overview-search-input"]').should('have.value', '')
		})
	})

	describe('View Mode Toggle', () => {
		it('switches between categories and list view', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Default should be categories
			cy.get('[data-cy="market-overview-view-mode-categories"]').should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Switch to list view
			cy.get('[data-cy="market-overview-view-mode-list"]').click()
			cy.get('[data-cy="market-overview-view-mode-list"]').should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Switch back to categories
			cy.get('[data-cy="market-overview-view-mode-categories"]').click()
			cy.get('[data-cy="market-overview-view-mode-categories"]').should(
				'have.class',
				'bg-gray-asparagus'
			)
		})
	})

	describe('Layout Toggle', () => {
		it('switches between comfortable and condensed layout', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Default should be comfortable
			cy.get('[data-cy="market-overview-layout-comfortable"]').should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Switch to condensed
			cy.get('[data-cy="market-overview-layout-condensed"]').click()
			cy.get('[data-cy="market-overview-layout-condensed"]').should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Switch back to comfortable
			cy.get('[data-cy="market-overview-layout-comfortable"]').click()
			cy.get('[data-cy="market-overview-layout-comfortable"]').should(
				'have.class',
				'bg-gray-asparagus'
			)
		})
	})

	describe('Price Comparison', () => {
		it('displays price comparison table', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Should see table with price columns
			cy.get('table').should('be.visible')
			cy.contains('Buy Price').should('be.visible')
			cy.contains('Sell Price').should('be.visible')
		})

		it('navigates to shop items when clicking shop link', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Click on a shop link
			cy.get('[data-cy="market-overview-shop-link"]').first().click()
			cy.location('pathname').should('match', /^\/shop\/.+/)
		})
	})

	describe('Trading Opportunities', () => {
		it('displays trading opportunities when available', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Check if opportunities section exists (may or may not have opportunities)
			cy.get('body').then(($body) => {
				if ($body.find('[data-cy="market-overview-opportunities-section"]').length > 0) {
					cy.get('[data-cy="market-overview-opportunities-section"]').should('be.visible')
					cy.contains('Opportunities').should('be.visible')
				}
			})
		})

		it('toggles opportunities section', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// Check if opportunities section exists
			cy.get('body').then(($body) => {
				if ($body.find('[data-cy="market-overview-opportunities-toggle"]').length > 0) {
					// Click to expand
					cy.get('[data-cy="market-overview-opportunities-toggle"]').click()
					cy.wait(500)
					// Click to collapse
					cy.get('[data-cy="market-overview-opportunities-toggle"]').click()
					cy.wait(500)
				}
			})
		})
	})

	describe('Error Handling', () => {
		it('redirects when server does not exist', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=nonexistent-server')
			cy.wait(1000)

			// Should redirect to shop manager
			cy.location('pathname').should('eq', '/shop-manager')
		})

		it('redirects when user has no servers', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/market-overview?serverId=test-server-1')
			cy.wait(1000)

			// user@example.com doesn't own test-server-1, should redirect
			cy.location('pathname').should('eq', '/shop-manager')
		})
	})
})

