describe('Shop Manager - Shop Management', () => {
	before(() => {
		cy.visit('/')
		cy.acceptCookies()
	})

	function clickAddMyShop() {
		cy.contains('[data-cy="shop-manager-add-shop-button"]', 'Add My Shop').first().click()
	}

	function clickAddPlayerShop() {
		cy.contains('[data-cy="shop-manager-add-shop-button"]', 'Add Player Shop').first().click()
	}

	function ensureShopsTableVisible() {
		cy.get('body').then(($body) => {
			const toggles = $body.find('[data-cy="shop-visibility-toggle"]')
			const hiddenToggle = toggles.filter((_, el) => el.textContent.includes('Show all shops'))
			if (hiddenToggle.length) {
				cy.wrap(hiddenToggle.first()).click()
			}
		})
	}

	function deleteShopByName(shopName) {
		ensureShopsTableVisible()
		cy.contains('table tbody tr a', shopName)
			.closest('tr')
			.find('[data-cy="shop-delete-button"]')
			.click({ force: true })
	}

	function confirmDeleteShopModal(shopName) {
		cy.location('pathname').should('eq', '/shop-manager')
		cy.get('[data-cy="shop-delete-modal"]').should('be.visible')
		cy.contains('[data-cy="shop-delete-modal"]', shopName).should('be.visible')
		cy.get('[data-cy="shop-delete-confirm-button"]').click()
	}

	describe('Create Shop', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsAdmin()
		})

		it('creates shop with valid data', () => {
			clickAddMyShop()

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
			clickAddPlayerShop()

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
			clickAddMyShop()
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')

			// Try to submit without name
			cy.get('[data-cy="create-shop-submit-button"]').click()

			// Should show validation error
			cy.contains('Shop name is required').should('be.visible')
		})

		it('shows validation error for missing player name on player shop', () => {
			clickAddPlayerShop()
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')

			// Fill in name but not player (server is inferred from the button context)
			cy.get('[data-cy="shop-name-input"]').type('Test Player Shop')

			// Try to submit
			cy.get('[data-cy="create-shop-submit-button"]').click()

			// Should show validation error
			cy.contains('Player name is required').should('be.visible')
		})

		it('creates shop with location and description', () => {
			clickAddMyShop()
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
			clickAddPlayerShop()
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
			clickAddMyShop()
			cy.get('[data-cy="shop-form-modal"]').should('be.visible')
			cy.get('[data-cy="shop-name-input"]').type('Shop to Delete')
			cy.get('[data-cy="create-shop-submit-button"]').click()
			cy.get('[data-cy="shop-form-modal"]').should('not.exist')

			deleteShopByName('Shop to Delete')
			confirmDeleteShopModal('Shop to Delete')

			// Shop should be removed
			cy.contains('Shop to Delete').should('not.exist')
		})

		it('cancels delete operation', () => {
			cy.get('body').then(($body) => {
				const deleteButton = $body.find('[data-cy="shop-delete-button"]')
				if (deleteButton.length > 0) {
					cy.wrap(deleteButton.first()).click({ force: true })

					cy.get('[data-cy="shop-delete-modal"]').should('be.visible')
					cy.get('[data-cy="shop-delete-modal"]').contains('button', 'Cancel').click()

					cy.get('[data-cy="shop-delete-modal"]').should('not.exist')
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
					deleteShopByName(shopName)
					cy.get('[data-cy="shop-delete-confirm-button"]').click({ force: true })
					cy.get('[data-cy="shop-delete-modal"]').should('not.exist')
				}
			})
		})
	})
})
