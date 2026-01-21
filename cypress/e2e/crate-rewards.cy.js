describe('Crate Rewards', () => {
	before(() => {
		// Accept cookies once to avoid banner noise across tests
		cy.visit('/')
		cy.acceptCookies()
	})

	beforeEach(() => {
		// Ensure we start with a clean state for each test
		cy.ensureSignedOut()
	})

	describe('Navigation', () => {
		it('redirects unauthenticated users to signin when directly accessing crate rewards', () => {
			cy.visit('/crate-rewards')
			cy.location('pathname').should('eq', '/signin')
			cy.location('search').then((search) => {
				const params = new URLSearchParams(search)
				expect(params.get('redirect')).to.eq('/crate-rewards')
			})
		})

		it('shows "Almost there!" modal when unauthenticated users click crate rewards from tools page', () => {
			// Navigate to tools page first
			cy.visit('/tools')
			cy.location('pathname').should('eq', '/tools')

			// Click on Crate Rewards tool
			cy.get('[data-cy="crate-rewards-tool"]').should('be.visible').click()

			// Should show the "Almost there!" modal instead of redirecting
			cy.contains('Almost there!').should('be.visible')
			cy.contains("You'll need an account to use the Crate Rewards tool.").should(
				'be.visible'
			)
			cy.contains('With an account, you can:').should('be.visible')
		})

		it('redirects unverified users to verify-email when directly accessing crate rewards', () => {
			cy.ensureSignedOut()
			cy.signIn('unverified@example.com', 'passWORD123')
			cy.visit('/crate-rewards')
			cy.location('pathname').should('eq', '/verify-email')
		})

		it('shows "So close!" modal when unverified users click crate rewards from tools page', () => {
			cy.ensureSignedOut()
			cy.signIn('unverified@example.com', 'passWORD123')

			// Navigate to tools page first
			cy.visit('/tools')
			cy.location('pathname').should('eq', '/tools')

			// Click on Crate Rewards tool
			cy.get('[data-cy="crate-rewards-tool"]').should('be.visible').click()

			// Should show the "So close!" modal instead of redirecting
			cy.contains('So close!').should('be.visible')
			cy.contains('Please verify your email address to use the Crate Rewards tool.').should(
				'be.visible'
			)
		})

		it('allows verified users to access crate rewards', () => {
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/crate-rewards')
			cy.location('pathname').should('eq', '/crate-rewards')
		// Wait for crate rewards page to load by checking for the "My Crates" heading
		cy.contains('My Crates').should('be.visible')
		})

		it('navigates to crate rewards from tools page', () => {
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()

			// Navigate to tools page
			cy.visit('/tools')
			cy.location('pathname').should('eq', '/tools')

			// Wait for tools page to fully load
			cy.get('[data-cy="app-loaded"]').should('be.visible')

			// Click on Crate Rewards tool
			cy.get('[data-cy="crate-rewards-tool"]').should('be.visible').click()

			// Should navigate to crate rewards page
			cy.location('pathname').should('eq', '/crate-rewards')
		})

		it('shows tools subnav when on crate rewards page', () => {
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/crate-rewards')

			// Check that tools subnav is visible (desktop only)
			cy.get('nav.bg-gray-700').should('be.visible')
			cy.get('nav.bg-gray-700 a[href="/tools"]').should('be.visible')
			cy.get('nav.bg-gray-700 a[href="/crate-rewards"]').should('be.visible')
		})
	})

	describe('Crate Management', () => {
		beforeEach(() => {
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/crate-rewards')
			// Handle cookie banner that might cover UI elements
			cy.dismissCookieBanner()
		})

		it('displays empty state when no crates exist', () => {
			// Should show empty state message
			cy.get('[data-cy="empty-crates-message"]').should('be.visible')
			cy.contains('No crate rewards found. Create your first one to get started.').should(
				'be.visible'
			)
		})

		it('creates a new crate successfully', () => {
			// Click create crate button
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()

			// Fill out crate form
			cy.get('[data-cy="crate-name-input"]').type('Test Crate')
			cy.get('[data-cy="crate-description-input"]').type('A test crate for testing purposes')
			cy.get('[data-cy="crate-version-select"]').select('1.20')

			// Submit form
			cy.get('[data-cy="crate-submit-button"]').click()

			// Should navigate to the new crate detail page
			cy.location('pathname').should('match', /\/crate-rewards\/[a-zA-Z0-9]+/)

			// Should show the crate name in the page
			cy.contains('Test Crate').should('be.visible')

			// Cleanup: Navigate back to crate manager and delete the crate
			cy.visit('/crate-rewards')

			// Find the specific crate card and click its delete button
			cy.contains('Test Crate')
				.parent()
				.parent()
				.parent()
				.within(() => {
					cy.get('[data-cy="delete-crate-button"]').should('be.visible').click()
				})

			// Confirm deletion in modal
			cy.get('[data-cy="confirm-delete-button"]').should('be.visible').click()

			// Crate should no longer exist
			cy.contains('Test Crate').should('not.exist')
		})

		it('validates crate name is required', () => {
			// Click create crate button
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()

			// Try to submit without name
			cy.get('[data-cy="crate-submit-button"]').click()

			// Should show validation error
			cy.get('[data-cy="crate-name-error"]').should('be.visible')
			cy.contains('Crate name is required').should('be.visible')
		})

		it('validates crate name uniqueness', () => {
			// Create first crate
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()
			cy.get('[data-cy="crate-name-input"]').type('Unique Crate')
			cy.get('[data-cy="crate-description-input"]').type('First crate')
			cy.get('[data-cy="crate-submit-button"]').click()

			// Wait for navigation to complete
			cy.location('pathname').should('match', /\/crate-rewards\/[a-zA-Z0-9]+/)

			// Go back to crate list
			cy.get('[data-cy="back-button"]').click()
			cy.location('pathname').should('eq', '/crate-rewards')

			// Try to create another crate with same name
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()
			cy.get('[data-cy="crate-name-input"]').type('Unique Crate')
			cy.get('[data-cy="crate-description-input"]').type('Second crate')
			cy.get('[data-cy="crate-submit-button"]').click()

			// Should show uniqueness error
			cy.get('[data-cy="crate-name-error"]').should('be.visible')
			cy.contains('A crate with this name already exists').should('be.visible')

			// Cleanup: Cancel the form and delete the original Unique Crate
			cy.get('[data-cy="cancel-crate-button"]').click()

			// Find the Unique Crate and delete it
			cy.contains('Unique Crate')
				.parent()
				.parent()
				.parent()
				.within(() => {
					cy.get('[data-cy="delete-crate-button"]').should('be.visible').click()
				})

			// Confirm deletion in modal
			cy.get('[data-cy="confirm-delete-button"]').should('be.visible').click()

			// Crate should no longer exist
			cy.contains('Unique Crate').should('not.exist')
		})

		it('edits crate metadata', () => {
			// Create a crate first
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()
			cy.get('[data-cy="crate-name-input"]').type('Editable Crate')
			cy.get('[data-cy="crate-description-input"]').type('Original description')
			cy.get('[data-cy="crate-submit-button"]').click()

			// Wait for navigation to detail page
			cy.location('pathname').should('match', /\/crate-rewards\/[a-zA-Z0-9]+/)

			// Click edit button
			cy.get('[data-cy="edit-crate-button"]').should('be.visible').click()

			// Update crate information
			cy.get('[data-cy="crate-name-input"]').clear().type('Updated Crate Name')
			cy.get('[data-cy="crate-description-input"]').clear().type('Updated description')
			cy.get('[data-cy="crate-version-select"]').select('1.20')

			// Save changes
			cy.get('[data-cy="crate-update-button"]').click()

			// Should show updated information
			cy.contains('Updated Crate Name').should('be.visible')
			cy.contains('Updated description').should('be.visible')

			// Cleanup: Navigate back to crate manager and delete the crate
			cy.visit('/crate-rewards')

			// Find the specific crate card and click its delete button
			cy.contains('Updated Crate Name')
				.parent()
				.parent()
				.parent()
				.within(() => {
					cy.get('[data-cy="delete-crate-button"]').should('be.visible').click()
				})

			// Confirm deletion in modal
			cy.get('[data-cy="confirm-delete-button"]').should('be.visible').click()

			// Crate should no longer exist
			cy.contains('Updated Crate Name').should('not.exist')
		})

		it('deletes a crate with confirmation', () => {
			// Create a crate first
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()
			cy.get('[data-cy="crate-name-input"]').type('Deletable Crate')
			cy.get('[data-cy="crate-description-input"]').type('This crate will be deleted')
			cy.get('[data-cy="crate-submit-button"]').click()

			// Wait for navigation to detail page
			cy.location('pathname').should('match', /\/crate-rewards\/[a-zA-Z0-9]+/)

			// Navigate back to crate manager to access delete button
			cy.visit('/crate-rewards')

			// Find the specific crate card and click its delete button
			cy.contains('Deletable Crate')
				.parent()
				.parent()
				.parent()
				.within(() => {
					cy.get('[data-cy="delete-crate-button"]').should('be.visible').click()
				})

			// Confirm deletion in modal
			cy.get('[data-cy="confirm-delete-button"]').should('be.visible').click()

			// Crate should no longer exist
			cy.contains('Deletable Crate').should('not.exist')
		})
	})

	describe('Item Management', () => {
		let crateId

		before(() => {
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/crate-rewards')
			cy.dismissCookieBanner()

			// Create a crate for item testing (only once for all tests in this describe block)
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()
			cy.get('[data-cy="crate-name-input"]').type('Item Test Crate')
			cy.get('[data-cy="crate-description-input"]').type('Crate for testing items')
			cy.get('[data-cy="crate-submit-button"]').click()

			// Wait for navigation and capture the crate ID
			cy.location('pathname').should('match', /\/crate-rewards\/([a-zA-Z0-9]+)/)
			cy.location('pathname').then((path) => {
				crateId = path.split('/').pop()
			})
		})

		beforeEach(() => {
			// Just ensure we're authenticated and on the right page for each test
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			// Navigate to the specific crate page for item testing
			cy.visit(`/crate-rewards/${crateId}`)
			cy.dismissCookieBanner()
		})

		it('displays empty state when no items exist in crate', () => {
			// Should show empty state for items
			cy.get('[data-cy="empty-items-message"]').should('be.visible')
			cy.contains('No items added yet').should('be.visible')
			cy.contains('Click "Add Item" to get started with your crate rewards.').should(
				'be.visible'
			)
		})

		it('adds an item to the crate', () => {
			// Click add item button
			cy.get('[data-cy="add-item-button"]').first().should('be.visible').click()

			// Fill out item form
			cy.get('[data-cy="item-search-input"]').type('diamond')
			cy.get('[data-cy="item-search-results"]').should('be.visible')
			cy.get('[data-cy="item-search-results"]').contains('diamond').click()

			cy.get('[data-cy="item-quantity-input"]').clear().should('have.value', '').type('5', { delay: 0 })
			cy.get('[data-cy="item-weight-input"]').clear().should('have.value', '').type('10', { delay: 0 })

		// Submit item
		cy.get('[data-cy="item-submit-button"]').click()

		// Wait for modal to close
		cy.get('[data-cy="add-item-button"]').should('be.visible')

		// Should show the item in the list
		cy.get('[data-cy="item-list"]').should('be.visible')
		cy.get('[data-cy="item-row"]').should('contain', '5x Diamond')

			// Should show the correct weight
			cy.get('[data-cy="item-weight-display"]').should('contain', '10')
		})

		it('validates item quantity is required', () => {
			// Click add item button
			cy.get('[data-cy="add-item-button"]').first().should('be.visible').click()

			// Select an item
			cy.get('[data-cy="item-search-input"]').type('diamond')
			cy.get('[data-cy="item-search-results"]').should('be.visible')
			cy.get('[data-cy="item-search-results"]').contains('diamond').click()

		// Clear quantity field
		cy.get('[data-cy="item-quantity-input"]').clear().should('have.value', '')

			// Try to submit without quantity
			cy.get('[data-cy="item-submit-button"]').click()

			// Should show validation error
			cy.get('[data-cy="item-quantity-error"]').should('be.visible')
			cy.contains('Quantity must be at least 1').should('be.visible')
		})

		it('validates item weight is required', () => {
			// Click add item button
			cy.get('[data-cy="add-item-button"]').first().should('be.visible').click()

			// Select an item and set quantity
			cy.get('[data-cy="item-search-input"]').type('diamond')
			cy.get('[data-cy="item-search-results"]').should('be.visible')
			cy.get('[data-cy="item-search-results"]').contains('diamond').click()
			cy.get('[data-cy="item-quantity-input"]').clear().should('have.value', '').type('5', { delay: 0 })

			// Clear weight field
			cy.get('[data-cy="item-weight-input"]').clear()

			// Try to submit without weight
			cy.get('[data-cy="item-submit-button"]').click()

			// Should show validation error
			cy.get('[data-cy="item-weight-error"]').should('be.visible')
			cy.contains('Weight must be at least 1').should('be.visible')
		})

		it('edits an existing item', () => {
			// Add an item first
			cy.get('[data-cy="add-item-button"]').first().should('be.visible').click()
			cy.get('[data-cy="item-search-input"]').type('diamond')
			cy.get('[data-cy="item-search-results"]').should('be.visible')
			cy.get('[data-cy="item-search-results"]').contains('diamond').click()
			cy.get('[data-cy="item-quantity-input"]').clear().should('have.value', '').type('5', { delay: 0 })
			cy.get('[data-cy="item-weight-input"]').clear().should('have.value', '').type('10', { delay: 0 })
			cy.get('[data-cy="item-submit-button"]').click()

			// Wait for item to appear
			cy.contains('diamond').should('be.visible')

			// Click edit button on the item
			cy.get('[data-cy="edit-item-button"]').first().click()

			// Update item details
			cy.get('[data-cy="item-quantity-input"]').clear().type('10')
			cy.get('[data-cy="item-weight-input"]').clear().should('have.value', '').type('20', { delay: 0 })

			// Save changes
			cy.get('[data-cy="item-submit-button"]').click()

			// Should show updated information
			cy.get('[data-cy="item-row"]').should('contain', '10x Diamond')
			cy.get('[data-cy="item-weight-display"]').should('contain', '20')
		})

		it('deletes an item with confirmation', () => {
			// Add an item first
			cy.get('[data-cy="add-item-button"]').first().should('be.visible').click()
			cy.get('[data-cy="item-search-input"]').type('iron ingot')
			cy.get('[data-cy="item-search-results"]').should('be.visible')
			cy.get('[data-cy="item-search-results"]').contains('iron ingot').click()
			cy.get('[data-cy="item-quantity-input"]').clear().should('have.value', '').type('3', { delay: 0 })
			cy.get('[data-cy="item-weight-input"]').clear().should('have.value', '').type('15', { delay: 0 })
			cy.get('[data-cy="item-submit-button"]').click()

			// Wait for item to appear in the list
			cy.get('[data-cy="item-row"]').should('contain', '3x Iron Ingot')

			// Click delete button on the iron ingot item (should be the last one added)
			cy.get('[data-cy="delete-item-button"]').last().click()

			// Confirm deletion in modal
			cy.get('[data-cy="confirm-delete-item-button"]').should('be.visible').click()

			// Wait for delete operation to complete and modal to disappear
			cy.get('[data-cy="confirm-delete-item-button"]').should('not.exist')

			// Item should be removed from the list
			cy.get('[data-cy="item-row"]').should('not.contain', '3x Iron Ingot')
		})

		it('clears all items with confirmation', () => {
			// Confirm we have one item (Diamond from previous tests)
			cy.get('[data-cy="item-row"]').should('have.length', 1)
			cy.get('[data-cy="item-row"]').should('contain', '10x Diamond')

			// Add second item
			cy.get('[data-cy="add-item-button"]').first().should('be.visible').click()
			cy.get('[data-cy="item-search-input"]').type('Gold')
			cy.get('[data-cy="item-search-results"]').should('be.visible')
			cy.get('[data-cy="item-search-results"]').contains('gold ingot').click()
			cy.get('[data-cy="item-quantity-input"]').clear().should('have.value', '').type('3', { delay: 0 })
			cy.get('[data-cy="item-weight-input"]').clear().should('have.value', '').type('5', { delay: 0 })
			cy.get('[data-cy="item-submit-button"]').click()

			// Wait for both items to appear
			cy.get('[data-cy="item-row"]').should('have.length', 2)
			cy.get('[data-cy="item-row"]').first().should('contain', '10x Diamond')
			cy.get('[data-cy="item-row"]').last().should('contain', '3x Gold Ingot')

			// Click clear all button
			cy.get('[data-cy="clear-all-items-button"]').should('be.visible').click()

			// Confirm clearing in modal
			cy.get('[data-cy="confirm-clear-all-button"]').should('be.visible').click()

			// Modal should disappear
			cy.get('[data-cy="confirm-clear-all-button"]').should('not.exist')

			// All items should be removed
			cy.get('[data-cy="item-row"]').should('not.exist')
			cy.contains('No items added yet').should('be.visible')
		})

		it('sorts items by different criteria', () => {
			// Confirm crate is empty before adding items
			cy.get('[data-cy="item-row"]').should('not.exist')
			cy.contains('No items added yet').should('be.visible')

			// Add multiple items with different weights
			cy.get('[data-cy="add-item-button"]').first().should('be.visible').click()
			cy.get('[data-cy="item-search-input"]').type('diamond')
			cy.get('[data-cy="item-search-results"]').should('be.visible')
			cy.get('[data-cy="item-search-results"]').contains('diamond').click()
			cy.get('[data-cy="item-quantity-input"]').clear().should('have.value', '').type('5', { delay: 0 })
			cy.get('[data-cy="item-weight-input"]').clear().should('have.value', '').type('10', { delay: 0 })
			cy.get('[data-cy="item-submit-button"]').click()

			// Add second item with higher weight
			cy.get('[data-cy="add-item-button"]').first().should('be.visible').click()
			cy.get('[data-cy="item-search-input"]').type('Gold')
			cy.get('[data-cy="item-search-results"]').should('be.visible')
			cy.get('[data-cy="item-search-results"]').contains('gold ingot').click()
			cy.get('[data-cy="item-quantity-input"]').clear().should('have.value', '').type('3', { delay: 0 })
			cy.get('[data-cy="item-weight-input"]').clear().should('have.value', '').type('20', { delay: 0 })
			cy.get('[data-cy="item-submit-button"]').click()

			// Wait for both items to appear
			cy.get('[data-cy="item-row"]').first().should('contain', '5x Diamond')
			cy.get('[data-cy="item-row"]').last().should('contain', '3x Gold Ingot')

			// Test sorting by weight (clicking weight button toggles between asc/desc)
			cy.get('[data-cy="sort-by-weight"]').should('be.visible').click()
			// Click again to get descending order (highest weight first)
			cy.get('[data-cy="sort-by-weight"]').click()

			// The items should be sorted by weight (exact order depends on implementation)
			cy.get('[data-cy="item-list"]').should('be.visible')
			cy.get('[data-cy="item-row"]').should('have.length', 2)

			// After sorting by weight, check the order
			// Gold Ingot (weight 20) should come before Diamond (weight 10) when sorted descending
			cy.get('[data-cy="item-row"]').first().should('contain', '3x Gold Ingot')
			cy.get('[data-cy="item-row"]').last().should('contain', '5x Diamond')
		})

		after(() => {
			// Cleanup: Delete the Item Test Crate after all tests in this suite have run
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
			cy.visit('/crate-rewards')
			cy.dismissCookieBanner()

			// Find the Item Test Crate and delete it
			cy.contains('Item Test Crate')
				.parent()
				.parent()
				.parent()
				.within(() => {
					cy.get('[data-cy="delete-crate-button"]').should('be.visible').click()
				})

			// Confirm deletion in modal
			cy.get('[data-cy="confirm-delete-button"]').should('be.visible').click()

			// Crate should no longer exist
			cy.contains('Item Test Crate').should('not.exist')
		})
	})

	describe('Navigation and Back Button', () => {
		beforeEach(() => {
			cy.signIn('user@example.com', 'passWORD123')
			cy.waitForAuth()
		})

		it('navigates back to crate list from crate detail', () => {
			// Start at crate list
			cy.visit('/crate-rewards')

			// Create a crate
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()
			cy.get('[data-cy="crate-name-input"]').type('Back Test Crate')
			cy.get('[data-cy="crate-description-input"]').type('Testing back navigation')
			cy.get('[data-cy="crate-submit-button"]').click()

			// Should be on detail page
			cy.location('pathname').should('match', /\/crate-rewards\/[a-zA-Z0-9]+/)

			// Click back button
			cy.get('[data-cy="back-button"]').should('be.visible').click()

			// Should return to crate list
			cy.location('pathname').should('eq', '/crate-rewards')
			cy.contains('Back Test Crate').should('be.visible')

			// Cleanup: Delete the crate
			cy.contains('Back Test Crate')
				.parent()
				.parent()
				.parent()
				.within(() => {
					cy.get('[data-cy="delete-crate-button"]').should('be.visible').click()
				})

			// Confirm deletion in modal
			cy.get('[data-cy="confirm-delete-button"]').should('be.visible').click()

			// Crate should no longer exist
			cy.contains('Back Test Crate').should('not.exist')
		})

		it('navigates to crate detail by clicking crate name', () => {
			// Start at crate list
			cy.visit('/crate-rewards')

			// Create a crate
			cy.get('[data-cy="create-crate-button"]').should('be.visible').click()
			cy.get('[data-cy="crate-name-input"]').type('Clickable Crate')
			cy.get('[data-cy="crate-description-input"]').type('Testing click navigation')
			cy.get('[data-cy="crate-submit-button"]').click()

			// Should be on detail page
			cy.location('pathname').should('match', /\/crate-rewards\/[a-zA-Z0-9]+/)

			// Go back to list
			cy.get('[data-cy="back-button"]').click()
			cy.location('pathname').should('eq', '/crate-rewards')

			// Click on crate name to go to detail
			cy.contains('Clickable Crate').click()

			// Should be on detail page again
			cy.location('pathname').should('match', /\/crate-rewards\/[a-zA-Z0-9]+/)
			cy.contains('Clickable Crate').should('be.visible')

			// Cleanup: Navigate back to crate manager and delete the crate
			cy.visit('/crate-rewards')

			// Find the specific crate card and click its delete button
			cy.contains('Clickable Crate')
				.parent()
				.parent()
				.parent()
				.within(() => {
					cy.get('[data-cy="delete-crate-button"]').should('be.visible').click()
				})

			// Confirm deletion in modal
			cy.get('[data-cy="confirm-delete-button"]').should('be.visible').click()

			// Crate should no longer exist
			cy.contains('Clickable Crate').should('not.exist')
		})
	})
})
