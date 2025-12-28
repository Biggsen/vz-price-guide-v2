describe('Shop Manager - Shop Management', () => {
	before(() => {
		cy.visit('/')
		cy.acceptCookies()
	})

	describe('Create Shop', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsAdmin()
		})

		it('creates shop with valid data', () => {
			// Click add shop button (assuming a server exists)
			cy.get('[data-cy="shop-manager-add-shop-button"]').first().click()

			// Modal should open
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')

			// Fill in form (server is inferred from the button context)
			cy.get('[data-cy="shop-name-input"]').type('Test Shop')

			// Submit
			cy.get('[data-cy="create-shop-submit-button"]').click()

			// Modal should close
			cy.get('[data-cy="shop-form-modal"]').should('not.exist')

			// Shop should appear in list
			cy.contains('Test Shop').should('be.visible')
		})

		it('creates player shop with player name', () => {
			// Click add player shop button
			cy.get('[data-cy="shop-manager-add-shop-button"]').last().click()

			// Modal should open
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')

			// Fill in form (server is inferred from the button context)
			cy.get('[data-cy="shop-player-input"]').type('TestPlayer')
			cy.get('[data-cy="shop-name-input"]').type('Test Player Shop')

			// Ensure cookie banner is not blocking
			cy.ensureCookieBannerDismissed()

			// Submit
			cy.get('[data-cy="create-shop-submit-button"]').click()

			// Modal should close
			cy.get('[data-cy="shop-form-modal"]').should('not.exist')

			// Shop should appear in list
			cy.contains('Test Player Shop').should('be.visible')
		})

		it('shows validation error for missing shop name', () => {
			cy.get('[data-cy="shop-manager-add-shop-button"]').first().click()
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')

			// Try to submit without name
			cy.get('[data-cy="create-shop-submit-button"]').click()

			// Should show validation error
			cy.contains('Shop name is required').should('be.visible')
		})

		it('shows validation error for missing player name on player shop', () => {
			cy.get('[data-cy="shop-manager-add-shop-button"]').last().click()
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')

			// Fill in name but not player (server is inferred from the button context)
			cy.get('[data-cy="shop-name-input"]').type('Test Player Shop')

			// Try to submit
			cy.get('[data-cy="create-shop-submit-button"]').click()

			// Should show validation error
			cy.contains('Player name is required').should('be.visible')
		})

		it('creates shop with location and description', () => {
			cy.get('[data-cy="shop-manager-add-shop-button"]').first().click()
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')

			// Fill in form (server is inferred from the button context)
			cy.get('[data-cy="shop-name-input"]').type('Shop with Details')
			cy.get('[data-cy="shop-location-input"]').type('/warp shops')
			cy.get('textarea').type('This is a test shop description')

			// Submit
			cy.get('[data-cy="create-shop-submit-button"]').click()

			// Modal should close
			cy.get('[data-cy="shop-form-modal"]').should('not.exist')

			// Shop should appear
			cy.contains('Shop with Details').should('be.visible')
		})

		it('uses player name as shop name when checkbox is checked', () => {
			cy.get('[data-cy="shop-manager-add-shop-button"]').last().click()
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')

			// Fill in player name
			cy.get('[data-cy="shop-player-input"]').type('PlayerName')

			// Check the "Use Player as Shop Name" checkbox
			cy.get('input[type="checkbox"]').check()

			// Shop name should be auto-filled
			cy.get('[data-cy="shop-name-input"]').should('have.value', 'PlayerName')
			cy.get('[data-cy="shop-name-input"]').should('be.disabled')
		})
	})

	describe('Edit Shop', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsAdmin()
		})

		it('edits existing shop', () => {
			// Find edit button for first shop (assuming shops exist)
			cy.get('body').then(($body) => {
				const editButton = $body.find('[data-cy="shop-edit-button"]')
				if (editButton.length > 0) {
					cy.wrap(editButton.first()).click({ force: true })

					// Modal should open with existing data
					cy.get('[data-cy="shop-form-modal"]').should('be.visible')
					cy.contains('Edit Shop').should('be.visible')

					// Update name
					cy.get('[data-cy="edit-shop-name-input"]').clear().type('Updated Shop Name')

					// Submit
					cy.get('[data-cy="edit-shop-submit-button"]').click()

					// Modal should close
					cy.get('[data-cy="shop-form-modal"]').should('not.exist')

					// Updated name should appear
					cy.contains('Updated Shop Name').should('be.visible')
				}
			})
		})

		it('cancels edit operation', () => {
			cy.get('body').then(($body) => {
				const editButton = $body.find('[data-cy="shop-edit-button"]')
				if (editButton.length > 0) {
					cy.wrap(editButton.first()).click({ force: true })

					// Modal should open
					cy.get('[data-cy="shop-form-modal"]').should('be.visible')

					// Cancel
					cy.get('[data-cy="shop-form-modal-close"]').click()

					// Modal should close
					cy.get('[data-cy="shop-form-modal"]').should('not.exist')
				}
			})
		})
	})

	describe('Delete Shop', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsAdmin()
		})

		it('deletes shop with confirmation', () => {
			// Create a test shop first (server is inferred from the button context)
			cy.get('[data-cy="shop-manager-add-shop-button"]').first().click()
			cy.get('[data-cy="shop-name-input"]').type('Shop to Delete')
			cy.get('[data-cy="create-shop-submit-button"]').click()
			cy.wait(500) // Wait for shop to be created

			// Find delete button for the shop we just created
			cy.contains('Shop to Delete')
				.parents('tr, [data-cy="shop-row"]')
				.within(() => {
					cy.get('[data-cy="shop-delete-button"]').click()
				})

			// Delete confirmation modal should open
			cy.contains('Delete Shop').should('be.visible')
			cy.contains('Shop to Delete').should('be.visible')

			// Confirm delete
			cy.get('button').contains('Delete').click()

			// Shop should be removed
			cy.contains('Shop to Delete').should('not.exist')
		})

		it('cancels delete operation', () => {
			cy.get('body').then(($body) => {
				const deleteButton = $body.find('[data-cy="shop-delete-button"]')
				if (deleteButton.length > 0) {
					cy.wrap(deleteButton.first()).click({ force: true })

					// Delete confirmation modal should open
					cy.contains('Delete Shop').should('be.visible')

					// Cancel
					cy.get('button').contains('Cancel').click()

					// Modal should close and shop should still exist
					cy.contains('Delete Shop').should('not.exist')
				}
			})
		})
	})

	describe('Shop List Display', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsAdmin()
		})

		it('displays shops grouped by server', () => {
			// Should see shops for the test server
			cy.contains('Test Server 1').should('be.visible')
			// Shops should be visible in the server card
			cy.get('body').then(($body) => {
				const shopLinks = $body.find('a[href*="/shop/"]')
				expect(shopLinks.length).to.be.greaterThan(0)
			})
		})

		it('displays shop location when provided', () => {
			// Check if any shop has a location displayed
			cy.get('body').then(($body) => {
				if ($body.find('[data-cy="shop-location"]').length > 0) {
					cy.get('[data-cy="shop-location"]').first().should('be.visible')
				}
			})
		})
	})

	describe('Navigation to Shop Items', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsAdmin()
			cy.wait(1000) // Wait for shops to load
		})

		it('navigates to shop items view when clicking shop link', () => {
			// Click on the shop name link (TestPlayer1's Shop is seeded)
			cy.contains('a', "TestPlayer1's Shop").click()
			cy.location('pathname').should('match', /^\/shop\/.+/)
		})
	})

	after(() => {
		cy.navigateToShopManagerAsAdmin()
		cy.wait(1000) // Wait for shops to load

		const testShopNames = ['Test Shop', 'Test Player Shop', 'Shop with Details']

		testShopNames.forEach((shopName) => {
			cy.get('body').then(($body) => {
				if ($body.text().includes(shopName)) {
					cy.contains(shopName)
						.parents('tr, [data-cy="shop-row"]')
						.within(() => {
							cy.get('[data-cy="shop-delete-button"]').click({ force: true })
						})
					cy.get('button').contains('Delete').click({ force: true })
					cy.wait(500) // Wait for deletion to complete
				}
			})
		})
	})
})
