describe('Shop Manager - Shop Items Management', () => {
	before(() => {
		cy.visit('/')
		cy.acceptCookies()
	})

	describe('Navigation to Shop Items View', () => {
		it('navigates to shop items view from shop manager', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.wait(1000) // Wait for shops to load

			// Click on the shop name link (TestPlayer1's Shop is seeded)
			cy.contains('a', "TestPlayer1's Shop").click()
			cy.location('pathname').should('match', /^\/shop\/.+/)
			cy.contains("TestPlayer1's Shop").should('be.visible')
		})

		it('displays back button to return to shop manager', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-back-button"]').should('be.visible')
			cy.get('[data-cy="shop-items-back-button"]').click()
			cy.location('pathname').should('eq', '/shop-manager')
		})
	})

	describe('Shop Items Display', () => {
		it('displays existing shop items', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			// Should see items in the table
			cy.get('table').should('be.visible')
			// Check that items are displayed (at least one row)
			cy.get('tbody tr').should('have.length.at.least', 1)
		})

		it('displays empty state when no items exist', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop-manager')
			cy.wait(1000)

			// First, create a server (user@example.com has no servers)
			cy.get('[data-cy="shop-manager-add-server-button"]').click()
			cy.get('[data-cy="server-form-modal"]').should('be.visible')
			cy.get('[data-cy="create-server-name-input"]').type('Empty Shop Test Server')
			cy.get('[data-cy="create-server-submit-button"]').click()
			cy.wait(1000) // Wait for server to be created

			// Now create a shop on that server
			cy.get('[data-cy="shop-manager-add-shop-button"]').first().click()
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')
			cy.get('[data-cy="shop-name-input"]').type('Empty Shop Test')
			cy.get('[data-cy="create-shop-submit-button"]').click()
			cy.wait(1500) // Wait for shop to be created and modal to close

			// Verify shop appears in list
			cy.contains('Empty Shop Test').should('be.visible')

			// Navigate to the shop by clicking the link
			cy.contains('a', 'Empty Shop Test').click()
			cy.wait(2000) // Wait for shop items page to fully load

			// Should see empty state - the empty state div should be visible
			cy.get('[data-cy="shop-items-empty-state"]', { timeout: 5000 }).should('be.visible')
			cy.contains('No items in this shop yet').should('be.visible')
		})
	})

	describe('Add Item', () => {
		it('opens add item form modal', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-add-item-button"]').click()
			cy.get('[data-cy="shop-item-form-modal"]').should('be.visible')
			cy.contains('Add Shop Item').should('be.visible')
		})

		it('adds single item with valid data', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-add-item-button"]').click()
			cy.get('[data-cy="shop-item-form-modal"]').should('be.visible')

			// Search for an item
			cy.get('[data-cy="shop-item-search-input"]').type('diamond')
			cy.wait(500)

			// Select first item from dropdown
			cy.get('[data-cy="shop-item-dropdown-item"]').first().click()

			// Fill in prices
			cy.get('[data-cy="shop-item-buy-price-input"]').type('10')
			cy.get('[data-cy="shop-item-sell-price-input"]').type('8')

			// Submit
			cy.get('[data-cy="shop-item-form-submit-button"]').click()
			cy.wait(1000)

			// Modal should close
			cy.get('[data-cy="shop-item-form-modal"]').should('not.exist')

			// Item should appear in table
			cy.get('tbody tr').should('have.length.at.least', 1)
		})

		it('adds multiple items with bulk selection', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-add-item-button"]').click()
			cy.get('[data-cy="shop-item-form-modal"]').should('be.visible')

			// Enable multiple selection
			cy.get('[data-cy="shop-item-multiple-selection-checkbox"]').check()

			// Search for items
			cy.get('[data-cy="shop-item-search-input"]').type('iron')
			cy.wait(500)

			// Select multiple items
			cy.get('[data-cy="shop-item-dropdown-item"]').first().click()
			cy.get('[data-cy="shop-item-dropdown-item"]').eq(1).click()

			// Fill in prices
			cy.get('[data-cy="shop-item-buy-price-input"]').type('5')
			cy.get('[data-cy="shop-item-sell-price-input"]').type('4')

			// Ensure cookie banner is not blocking (accept again if needed)
			cy.get('body').then(($body) => {
				if ($body.find('[aria-label*="Cookie"]').length > 0) {
					cy.acceptCookies()
				}
			})

			// Submit should show "Add 2 Items"
			cy.get('[data-cy="shop-item-form-submit-button"]').should('contain', 'Add 2 Items')
			cy.get('[data-cy="shop-item-form-submit-button"]').click()
			cy.wait(1000)

			// Modal should close
			cy.get('[data-cy="shop-item-form-modal"]').should('not.exist')
		})

		it('shows validation error for missing item selection', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-add-item-button"]').click()
			cy.get('[data-cy="shop-item-form-modal"]').should('be.visible')

			// Try to submit without selecting item
			cy.get('[data-cy="shop-item-buy-price-input"]').type('10')
			cy.get('[data-cy="shop-item-form-submit-button"]').should('be.disabled')
		})

		it('shows validation error for missing prices', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-add-item-button"]').click()
			cy.get('[data-cy="shop-item-form-modal"]').should('be.visible')

			// Select item
			cy.get('[data-cy="shop-item-search-input"]').type('diamond')
			cy.wait(500)
			cy.get('[data-cy="shop-item-dropdown-item"]').first().click()

			// Try to submit without prices
			cy.get('[data-cy="shop-item-form-submit-button"]').should('be.disabled')
		})

		it('cancels add item form', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-add-item-button"]').click()
			cy.get('[data-cy="shop-item-form-modal"]').should('be.visible')

			// Ensure cookie banner is not blocking (accept again if needed)
			cy.get('body').then(($body) => {
				if ($body.find('[aria-label*="Cookie"]').length > 0) {
					cy.acceptCookies()
				}
			})

			// Cancel
			cy.get('[data-cy="shop-item-form-cancel-button"]').click()

			// Modal should close
			cy.get('[data-cy="shop-item-form-modal"]').should('not.exist')
		})
	})

	describe('Edit Item', () => {
		it('opens edit item form', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			// Click edit button on first item
			cy.get('[data-cy="shop-item-edit-button"]').first().click()
			cy.get('[data-cy="shop-item-form-modal"]').should('be.visible')
			cy.contains('Edit Shop Item').should('be.visible')
		})

		it('updates item with new prices', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			// Click edit button on first item
			cy.get('[data-cy="shop-item-edit-button"]').first().click()
			cy.get('[data-cy="shop-item-form-modal"]').should('be.visible')

			// Update prices
			cy.get('[data-cy="shop-item-buy-price-input"]').clear().type('15')
			cy.get('[data-cy="shop-item-sell-price-input"]').clear().type('12')

			// Ensure cookie banner is not blocking (accept again if needed)
			cy.get('body').then(($body) => {
				if ($body.find('[aria-label*="Cookie"]').length > 0) {
					cy.acceptCookies()
				}
			})

			// Submit
			cy.get('[data-cy="shop-item-form-submit-button"]').click()
			cy.wait(1000)

			// Modal should close
			cy.get('[data-cy="shop-item-form-modal"]').should('not.exist')
		})
	})

	describe('Delete Item', () => {
		it('deletes item with confirmation', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			// Get initial item count
			cy.get('tbody tr').then(($rows) => {
				const initialCount = $rows.length

				// Click delete button on first item
				cy.get('[data-cy="shop-item-delete-button"]').first().click()

				// Delete confirmation modal should open
				cy.get('[data-cy="shop-item-delete-modal"]').should('be.visible')
				cy.contains('Delete Item').should('be.visible')

				// Confirm delete
				cy.get('[data-cy="shop-item-delete-confirm-button"]').click()
				cy.wait(1000)

				// Modal should close
				cy.get('[data-cy="shop-item-delete-modal"]').should('not.exist')

				// Item count should decrease
				cy.get('tbody tr').should('have.length', initialCount - 1)
			})
		})

		it('cancels delete operation', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			// Get initial item count
			cy.get('tbody tr').then(($rows) => {
				const initialCount = $rows.length

				// Click delete button
				cy.get('[data-cy="shop-item-delete-button"]').first().click()

				// Delete confirmation modal should open
				cy.get('[data-cy="shop-item-delete-modal"]').should('be.visible')

				// Cancel
				cy.get('[data-cy="shop-item-delete-cancel-button"]').click()

				// Modal should close
				cy.get('[data-cy="shop-item-delete-modal"]').should('not.exist')

				// Item count should remain the same
				cy.get('tbody tr').should('have.length', initialCount)
			})
		})
	})

	describe('View Mode Toggle', () => {
		it('switches between categories and list view', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			// Default should be categories
			cy.get('[data-cy="shop-items-view-mode-categories"]').should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Switch to list view
			cy.get('[data-cy="shop-items-view-mode-list"]').click()
			cy.get('[data-cy="shop-items-view-mode-list"]').should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Switch back to categories
			cy.get('[data-cy="shop-items-view-mode-categories"]').click()
			cy.get('[data-cy="shop-items-view-mode-categories"]').should(
				'have.class',
				'bg-gray-asparagus'
			)
		})
	})

	describe('Layout Toggle', () => {
		it('switches between comfortable and compact layout', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			// Default should be comfortable
			cy.get('[data-cy="shop-items-layout-comfortable"]').should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Switch to compact
			cy.get('[data-cy="shop-items-layout-compact"]').click()
			cy.get('[data-cy="shop-items-layout-compact"]').should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Switch back to comfortable
			cy.get('[data-cy="shop-items-layout-comfortable"]').click()
			cy.get('[data-cy="shop-items-layout-comfortable"]').should(
				'have.class',
				'bg-gray-asparagus'
			)
		})
	})

	describe('Shop Status Checkboxes', () => {
		it('toggles fully cataloged checkbox', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-2') // Use test-shop-2 which is a player shop (is_own_shop: false)
			cy.wait(1000)

			// Checkbox should be visible (for player shops)
			cy.get('[data-cy="shop-items-fully-cataloged-checkbox"]').should('be.visible')
			cy.get('[data-cy="shop-items-fully-cataloged-checkbox"]').check()
			cy.wait(500)
			cy.get('[data-cy="shop-items-fully-cataloged-checkbox"]').should('be.checked')
		})

		it('toggles out of money checkbox', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-2') // Use test-shop-2 which is a player shop (is_own_shop: false)
			cy.wait(1000)

			cy.get('[data-cy="shop-items-out-of-money-checkbox"]').should('be.visible')
			cy.get('[data-cy="shop-items-out-of-money-checkbox"]').check()
			cy.wait(500)
			cy.get('[data-cy="shop-items-out-of-money-checkbox"]').should('be.checked')
		})

		it('toggles archive checkbox', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-archive-checkbox"]').should('be.visible')
			cy.get('[data-cy="shop-items-archive-checkbox"]').check()
			cy.wait(500)
			cy.get('[data-cy="shop-items-archive-checkbox"]').should('be.checked')
		})
	})

	describe('Navigation', () => {
		it('navigates to market overview', () => {
			cy.ensureSignedOut()
			cy.visit('/')
			cy.acceptCookies()
			cy.signIn('admin@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/shop/test-shop-1')
			cy.wait(1000)

			cy.get('[data-cy="shop-items-market-overview-button"]').should('be.visible')
			cy.get('[data-cy="shop-items-market-overview-button"]').click()
			cy.location('pathname').should('include', '/market-overview')
		})
	})
})

