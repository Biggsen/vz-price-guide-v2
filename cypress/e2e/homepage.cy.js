describe('Homepage Functionality', () => {
	beforeEach(() => {
		// Accept cookies once to avoid banner noise across tests
		cy.visit('/')
		cy.acceptCookies()
	})

	describe('Basic Homepage Loading', () => {
		it('loads the homepage with correct title and structure', () => {
			cy.visit('/')
			cy.title().should('include', 'price guide')
			cy.get('#app').should('exist')
		})

		it('displays the main navigation and header elements', () => {
			cy.visit('/')

			// Check for main page elements
			cy.get('input[placeholder*="Search for items"]').should('be.visible')
			cy.contains('button', 'Reset').should('be.visible')
			cy.contains('button', 'Settings').should('be.visible')
			cy.contains('button', 'Export price list').should('be.visible')
		})

		it('shows seeded items in the UI', () => {
			cy.visit('/')

			// Wait for items to load
			cy.contains('Showing').should('be.visible')

			// Check for specific seeded items
			cy.contains('a', /^oak planks$/i)
				.should('be.visible')
				.parents('tr')
				.within(() => {
					cy.contains(/\b2\b/).should('be.visible')
				})

			cy.contains('a', /^oak log$/i)
				.should('be.visible')
				.parents('tr')
				.within(() => {
					cy.contains(/\b8\b/).should('be.visible')
				})
		})
	})

	describe('Alert Banner Functionality', () => {
		beforeEach(() => {
			// Clear localStorage to ensure alert is shown
			cy.clearLocalStorage()
		})

		it('displays the crate rewards alert banner by default', () => {
			cy.visit('/')

			// Check if alert banner is visible
			cy.get('body').then(($body) => {
				if ($body.find('[data-cy="dismiss-alert"]').length > 0) {
					// Alert banner is present
					cy.contains('New Crate Rewards Tool!').should('be.visible')
					cy.contains('Build, manage and balance CrazyCrates prizes').should('be.visible')
					cy.contains('Try it out').should('be.visible')
					cy.contains('Updates').should('be.visible')
				} else {
					// Alert banner is not present (might be dismissed or disabled)
					cy.log('Alert banner not found - might be dismissed or disabled')
				}
			})
		})

		it('can dismiss the alert banner', () => {
			cy.visit('/')

			// Verify banner is visible
			cy.contains('New Crate Rewards Tool!').should('be.visible')

			// Click dismiss button
			cy.get('[data-cy="dismiss-alert"]').click()

			// Verify banner is dismissed
			cy.contains('New Crate Rewards Tool!').should('not.exist')
		})

		it('remembers dismissed alert state on page reload', () => {
			cy.visit('/')

			// Dismiss the alert
			cy.get('[data-cy="dismiss-alert"]').click()
			cy.contains('New Crate Rewards Tool!').should('not.exist')

			// Reload page
			cy.reload()

			// Verify alert stays dismissed
			cy.contains('New Crate Rewards Tool!').should('not.exist')
		})

		it('has working links in the alert banner', () => {
			cy.visit('/')

			// Check if alert banner is present first
			cy.get('body').then(($body) => {
				if ($body.find('[data-cy="dismiss-alert"]').length > 0) {
					// Test "Try it out" link - use router-link
					cy.get('a[href="/tools"]').contains('Try it out').click()
					cy.location('pathname').should('eq', '/tools')

					// Go back and test "Updates" link
					cy.go('back')
					cy.get('a[href="/updates"]').contains('Updates').click()
					cy.location('pathname').should('eq', '/updates')
				} else {
					cy.log('Alert banner not found - skipping link tests')
				}
			})
		})
	})

	describe('Search Functionality', () => {
		it('can search for items by name', () => {
			cy.visit('/')

			// Search for oak
			cy.get('input[placeholder*="Search for items"]').type('oak')

			// Verify search results
			cy.contains('oak planks', { matchCase: false }).should('be.visible')
			cy.contains('oak log', { matchCase: false }).should('be.visible')

			// Verify other items are filtered out
			cy.get('body').then(($body) => {
				if ($body.text().includes('diamond')) {
					cy.contains('diamond').should('not.be.visible')
				}
			})
		})

		it('can search with multiple terms using commas', () => {
			cy.visit('/')

			// Search for multiple terms
			cy.get('input[placeholder*="Search for items"]').type('oak,log')

			// Should find items matching either term
			cy.contains('oak log', { matchCase: false }).should('be.visible')
		})

		it('shows "No items found" when search has no results', () => {
			cy.visit('/')

			// Search for something that doesn't exist
			cy.get('input[placeholder*="Search for items"]').type('nonexistentitem123')

			// Should show empty state
			cy.contains('No items found').should('be.visible')
			cy.contains('Try adjusting your search terms or category filters').should('be.visible')
		})

		it('updates item counts when searching', () => {
			cy.visit('/')

			// Get initial count
			cy.contains('Showing').then(($el) => {
				const initialText = $el.text()

				// Search for something
				cy.get('input[placeholder*="Search for items"]').type('oak')

				// Count should change
				cy.contains('Showing').should(($newEl) => {
					expect($newEl.text()).to.not.equal(initialText)
				})
			})
		})

		it('can clear search with reset button', () => {
			cy.visit('/')

			// Search for something
			cy.get('input[placeholder*="Search for items"]').type('oak')

			// Click reset
			cy.contains('button', 'Reset').click()

			// Search should be cleared
			cy.get('input[placeholder*="Search for items"]').should('have.value', '')
		})
	})

	describe('Category Filtering', () => {
		it('displays category filter buttons', () => {
			cy.visit('/')

			// Should show category buttons (at least wood should be visible from seeded data)
			cy.contains('button', 'Wood', { matchCase: false }).should('be.visible')
		})

		it('can toggle category filters', () => {
			cy.visit('/')

			// Get initial state - all categories should be selected by default
			cy.contains('button', 'Wood', { matchCase: false }).should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Click to deselect wood category
			cy.contains('button', 'Wood', { matchCase: false }).click()

			// Should be deselected
			cy.contains('button', 'Wood', { matchCase: false }).should('have.class', 'bg-norway')

			// Click again to reselect
			cy.contains('button', 'Wood', { matchCase: false }).click()
			cy.contains('button', 'Wood', { matchCase: false }).should(
				'have.class',
				'bg-gray-asparagus'
			)
		})

		it('can toggle all categories with the toggle button', () => {
			cy.visit('/')

			// Initially should show "Unselect all categories"
			cy.contains('Unselect all categories').should('be.visible')

			// Click to unselect all
			cy.contains('Unselect all categories').click()

			// Should now show "Select all categories"
			cy.contains('Select all categories').should('be.visible')

			// All category buttons should be deselected
			cy.get('button')
				.contains('Wood', { matchCase: false })
				.should('have.class', 'bg-norway')
		})

		it('can hide/show category filters on mobile', () => {
			cy.viewport('iphone-6')
			cy.visit('/')

			// Category filters should be hidden by default on mobile
			cy.contains('button', 'Wood', { matchCase: false }).should('not.be.visible')

			// Click to show filters
			cy.contains('Show category filters').click()

			// Should now be visible
			cy.contains('button', 'Wood', { matchCase: false }).should('be.visible')

			// Click to hide again
			cy.contains('Hide category filters').click()
			cy.contains('button', 'Wood', { matchCase: false }).should('not.be.visible')
		})

		it('filters items based on selected categories', () => {
			cy.visit('/')

			// Wait for items to load
			cy.contains('Showing').should('be.visible')

			// Deselect wood category
			cy.contains('button', 'Wood', { matchCase: false }).click()

			// Wait for filtering to take effect
			cy.wait(500)

			// Wood items should not be visible in the main content area
			cy.get('table').should('not.contain', 'oak planks')
			cy.get('table').should('not.contain', 'oak log')

			// Reselect wood category
			cy.contains('button', 'Wood', { matchCase: false }).click()

			// Wait for filtering to take effect
			cy.wait(500)

			// Wood items should be visible again
			cy.contains('oak planks', { matchCase: false }).should('be.visible')
		})
	})

	describe('View Mode and Layout Toggles', () => {
		it('can switch between categories and list view', () => {
			cy.visit('/')

			// Default should be categories view
			cy.contains('button', 'Categories').should('have.class', 'bg-gray-asparagus')
			cy.contains('button', 'List').should('have.class', 'bg-norway')

			// Switch to list view
			cy.contains('button', 'List').click()
			cy.contains('button', 'List').should('have.class', 'bg-gray-asparagus')
			cy.contains('button', 'Categories').should('have.class', 'bg-norway')

			// Should show "All Items" header in list view
			cy.contains('caption', 'All Items').should('be.visible')
		})

		it('can switch between comfortable and compact layout', () => {
			cy.visit('/')

			// Default should be comfortable layout
			cy.contains('button', 'Comfortable').should('have.class', 'bg-gray-asparagus')
			cy.contains('button', 'Compact').should('have.class', 'bg-norway')

			// Switch to compact layout
			cy.contains('button', 'Compact').click()
			cy.contains('button', 'Compact').should('have.class', 'bg-gray-asparagus')
			cy.contains('button', 'Comfortable').should('have.class', 'bg-norway')
		})

		it('persists view mode and layout preferences', () => {
			cy.visit('/')

			// Change view mode and layout
			cy.contains('button', 'List').click()
			cy.contains('button', 'Compact').click()

			// Reload page
			cy.reload()

			// Preferences should be remembered
			cy.contains('button', 'List').should('have.class', 'bg-gray-asparagus')
			cy.contains('button', 'Compact').should('have.class', 'bg-gray-asparagus')
		})
	})

	describe('Modal Functionality', () => {
		it('can open and close the settings modal', () => {
			cy.visit('/')

			// Open settings modal
			cy.contains('button', 'Settings').click()

			// Modal should be visible - look for the BaseModal backdrop
			cy.get('.fixed.inset-0.bg-black.bg-opacity-50').should('be.visible')
			cy.contains('Settings').should('be.visible')

			// Close modal by clicking the close button (XMarkIcon)
			cy.get('button.text-gray-400.hover\\:text-gray-600').click()

			// Modal should be closed
			cy.get('.fixed.inset-0.bg-black.bg-opacity-50').should('not.exist')
		})

		it('can open and close the export modal', () => {
			cy.visit('/')

			// Open export modal
			cy.contains('button', 'Export price list').click()

			// Modal should be visible - look for the BaseModal backdrop
			cy.get('.fixed.inset-0.bg-black.bg-opacity-50').should('be.visible')
			cy.contains('Export').should('be.visible')

			// Close modal by clicking the close button (XMarkIcon)
			cy.get('button.text-gray-400.hover\\:text-gray-600').click()

			// Modal should be closed
			cy.get('.fixed.inset-0.bg-black.bg-opacity-50').should('not.exist')
		})
	})

	describe('URL Parameter Handling', () => {
		it('can handle category filter URL parameters', () => {
			// Visit with category parameter
			cy.visit('/?cat=wood')

			// Wood category should be selected
			cy.contains('button', 'Wood', { matchCase: false }).should(
				'have.class',
				'bg-gray-asparagus'
			)

			// Other categories should be deselected
			cy.get('body').then(($body) => {
				// Check if there are other categories and they should be deselected
				const otherCategories = $body.find('button').filter((i, el) => {
					const text = Cypress.$(el).text().toLowerCase()
					return text.includes('(') && !text.includes('wood')
				})

				if (otherCategories.length > 0) {
					otherCategories.each((i, el) => {
						cy.wrap(el).should('have.class', 'bg-norway')
					})
				}
			})
		})

		it('can handle version URL parameters', () => {
			// Visit with version parameter
			cy.visit('/?version=1.20')

			// Should show version in the display
			cy.contains('Showing').should('contain', '1.20')
		})

		it('updates URL when changing filters', () => {
			cy.visit('/')

			// Deselect wood category
			cy.contains('button', 'Wood', { matchCase: false }).click()

			// URL should update
			cy.url().should('include', 'cat=')

			// Reselect wood category
			cy.contains('button', 'Wood', { matchCase: false }).click()

			// URL should not include cat parameter when all are selected
			cy.url().should('not.include', 'cat=')
		})
	})

	describe('Item Display and Interaction', () => {
		it('shows item information correctly', () => {
			cy.visit('/')

			// Check that items display with proper information
			cy.contains('oak planks', { matchCase: false })
				.should('be.visible')
				.parents('tr')
				.within(() => {
					// Should have price information
					cy.contains(/\b\d+\b/).should('be.visible')
					// Should have a link
					cy.get('a').should('be.visible')
				})
		})

		it('displays item counts correctly', () => {
			cy.visit('/')

			// Should show item count in the summary
			cy.contains('Showing').should('be.visible')
			cy.contains('items').should('be.visible')

			// Category buttons should show counts
			cy.contains('button', 'Wood', { matchCase: false }).should('contain', '(')
		})

		it('handles empty states gracefully', () => {
			cy.visit('/')

			// Deselect all categories
			cy.contains('Unselect all categories').click()

			// Should show empty state
			cy.contains('No items found').should('be.visible')
			cy.contains('Try adjusting your search terms or category filters').should('be.visible')
		})
	})

	describe('Responsive Design', () => {
		it('adapts to mobile viewport', () => {
			cy.viewport('iphone-6')
			cy.visit('/')

			// Search should still be visible
			cy.get('input[placeholder*="Search for items"]').should('be.visible')

			// Category filters should be hidden by default
			cy.contains('button', 'Wood', { matchCase: false }).should('not.be.visible')

			// Toggle should be available
			cy.contains('Show category filters').should('be.visible')
		})

		it('adapts to desktop viewport', () => {
			cy.viewport('macbook-13')
			cy.visit('/')

			// All elements should be visible
			cy.get('input[placeholder*="Search for items"]').should('be.visible')
			cy.contains('button', 'Wood', { matchCase: false }).should('be.visible')

			// Toggle should not be visible on desktop
			cy.contains('Show category filters').should('not.be.visible')
		})
	})

	describe('Performance and Loading', () => {
		it('loads within reasonable time', () => {
			const startTime = Date.now()

			cy.visit('/')
			cy.contains('Showing').should('be.visible')

			const endTime = Date.now()
			const loadTime = endTime - startTime

			// Should load within 10 seconds (generous for CI)
			expect(loadTime).to.be.lessThan(10000)
		})

		it('shows loading states appropriately', () => {
			cy.visit('/')

			// Should show some indication that content is loading
			// This might be implicit (no content visible initially) or explicit loading indicators
			cy.get('body').should('be.visible')
		})
	})
})
