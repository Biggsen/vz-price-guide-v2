describe('Shop Manager - Server Management', () => {
	before(() => {
		cy.visit('/')
		cy.acceptCookies()
	})

	after(() => {
		// Clean up test servers created during tests
		const testServerNames = [
			'Test Server 2',
			'Test Server with Description',
			'Server to Delete'
		]

		// Clean up servers for user@example.com
		cy.navigateToShopManagerAsUser()
		cy.wait(1000) // Wait for servers to load

		testServerNames.forEach((serverName) => {
			cy.get('body').then(($body) => {
				// Check if server exists by looking for the name text
				const serverExists = $body.text().includes(serverName)
				if (serverExists) {
					cy.contains(serverName)
						.parents('[data-cy="server-card"]')
						.first()
						.within(() => {
							cy.get('[data-cy="server-delete-button"]').click({ force: true })
						})

					// Wait for delete modal and confirm
					cy.contains('Delete Server', { timeout: 2000 })
					cy.get('button').contains('Delete').click({ force: true })
					cy.wait(500) // Wait for deletion to complete
				}
			})
		})
	})

	describe('Create Server', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsUser()
		})

		it('creates server with valid data', () => {
			cy.get('[data-cy="shop-manager-add-server-button"]').click()
			cy.get('[data-cy="server-form-modal"]').should('be.visible')

			// Fill in form
			cy.get('[data-cy="create-server-name-input"]').type('Test Server 2')
			cy.get('[data-cy="create-minecraft-version-select"]').select('1.21')

			// Ensure cookie banner is not blocking
			cy.ensureCookieBannerDismissed()

			// Submit
			cy.get('[data-cy="create-server-submit-button"]').click()

			// Modal should close
			cy.get('[data-cy="server-form-modal"]').should('not.exist')

			// Server should appear in list
			cy.contains('Test Server 2').should('be.visible')
		})

		it('shows validation error for missing server name', () => {
			cy.get('[data-cy="shop-manager-add-server-button"]').click()
			cy.get('[data-cy="server-form-modal"]').should('be.visible')

			// Try to submit without name
			cy.get('[data-cy="create-server-submit-button"]').click()

			// Should show validation error
			cy.contains('Server name is required').should('be.visible')
		})

		it('shows validation error for missing Minecraft version', () => {
			cy.get('[data-cy="shop-manager-add-server-button"]').click()
			cy.get('[data-cy="server-form-modal"]').should('be.visible')

			// Fill in name
			cy.get('[data-cy="create-server-name-input"]').type('Test Server 3')

			// Explicitly select "Select version..." to clear the default selection
			cy.get('[data-cy="create-minecraft-version-select"]').select('')

			// Try to submit
			cy.get('[data-cy="create-server-submit-button"]').click()

			// Should show validation error
			cy.contains('Minecraft version is required').should('be.visible')
		})

		it('creates server with description', () => {
			cy.get('[data-cy="shop-manager-add-server-button"]').click()
			cy.get('[data-cy="server-form-modal"]').should('be.visible')

			// Fill in form
			cy.get('[data-cy="create-server-name-input"]').type('Test Server with Description')
			cy.get('[data-cy="create-minecraft-version-select"]').select('1.20')
			cy.get('textarea').type('This is a test server description')

			// Ensure cookie banner is not blocking
			cy.ensureCookieBannerDismissed()

			// Submit
			cy.get('[data-cy="create-server-submit-button"]').click()

			// Modal should close
			cy.get('[data-cy="server-form-modal"]').should('not.exist')

			// Server should appear with description
			cy.contains('Test Server with Description').should('be.visible')
			cy.contains('This is a test server description').should('be.visible')
		})
	})

	describe('Edit Server', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsAdmin()
		})

		it('edits existing server', () => {
			// Find edit button for first server
			cy.get('[data-cy="server-card"]')
				.first()
				.within(() => {
					cy.get('[data-cy="server-edit-button"]').click()
				})

			// Modal should open with existing data
			cy.get('[data-cy="server-form-modal"]').should('be.visible')
			cy.contains('Edit Server').should('be.visible')

			// Update name
			cy.get('[data-cy="edit-server-name-input"]').clear().type('Updated Server Name')

			// Ensure cookie banner is not blocking
			cy.ensureCookieBannerDismissed()

			// Submit
			cy.get('[data-cy="edit-server-submit-button"]').click()

			// Modal should close
			cy.get('[data-cy="server-form-modal"]').should('not.exist')

			// Updated name should appear
			cy.contains('Updated Server Name').should('be.visible')

			// Restore original name for other tests
			cy.contains('Updated Server Name')
				.parents('[data-cy="server-card"]')
				.within(() => {
					cy.get('[data-cy="server-edit-button"]').click()
				})

			cy.get('[data-cy="server-form-modal"]').should('be.visible')
			cy.get('[data-cy="edit-server-name-input"]').clear().type('Test Server 1')
			cy.ensureCookieBannerDismissed()
			cy.get('[data-cy="edit-server-submit-button"]').click()
			cy.get('[data-cy="server-form-modal"]').should('not.exist')
		})

		it('cancels edit operation', () => {
			// Find edit button for first server
			cy.get('[data-cy="server-card"]')
				.first()
				.within(() => {
					cy.get('[data-cy="server-edit-button"]').click()
				})

			// Modal should open
			cy.get('[data-cy="server-form-modal"]').should('be.visible')

			// Ensure cookie banner is not blocking
			cy.ensureCookieBannerDismissed()

			// Cancel
			cy.get('[data-cy="server-form-modal-close"]').click()

			// Modal should close
			cy.get('[data-cy="server-form-modal"]').should('not.exist')
		})
	})

	describe('Delete Server', () => {
		it('deletes server with confirmation', () => {
			cy.navigateToShopManagerAsUser()
			// Create a test server first
			cy.get('[data-cy="shop-manager-add-server-button"]').click()
			cy.get('[data-cy="create-server-name-input"]').type('Server to Delete')
			cy.get('[data-cy="create-minecraft-version-select"]').select('1.19')
			cy.ensureCookieBannerDismissed()
			cy.get('[data-cy="create-server-submit-button"]').click()
			cy.wait(500) // Wait for server to be created

			// Find delete button for the server we just created
			cy.contains('Server to Delete')
				.parents('[data-cy="server-card"]')
				.within(() => {
					cy.get('[data-cy="server-delete-button"]').click()
				})

			// Delete confirmation modal should open
			cy.contains('Delete Server').should('be.visible')
			cy.contains('Server to Delete').should('be.visible')

			// Confirm delete
			cy.get('button').contains('Delete').click()

			// Server should be removed
			cy.contains('Server to Delete').should('not.exist')
		})

		it('cancels delete operation', () => {
			cy.navigateToShopManagerAsAdmin()
			// Find delete button for first server
			cy.get('[data-cy="server-card"]')
				.first()
				.within(() => {
					cy.get('[data-cy="server-delete-button"]').click()
				})

			// Delete confirmation modal should open
			cy.contains('Delete Server').should('be.visible')

			// Cancel
			cy.get('button').contains('Cancel').click()

			// Modal should close and server should still exist
			cy.contains('Delete Server').should('not.exist')
			cy.get('[data-cy="server-card"]').should('have.length.greaterThan', 0)
		})
	})

	describe('Server List Display', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsAdmin()
		})

		it('displays all user servers', () => {
			// Should see at least the seeded server
			cy.contains('Test Server 1').should('be.visible')
		})

		it('displays server with correct Minecraft version', () => {
			cy.contains('Test Server 1').should('be.visible')
			cy.contains('Version 1.20').should('be.visible')
		})

		it('displays server description', () => {
			cy.contains('Test Server 1')
				.parents('[data-cy="server-card"]')
				.within(() => {
					cy.contains('Test server for E2E testing').should('be.visible')
				})
		})
	})

	describe('Version Selection', () => {
		beforeEach(() => {
			cy.navigateToShopManagerAsUser()
			cy.get('[data-cy="shop-manager-add-server-button"]').click()
			cy.get('[data-cy="server-form-modal"]').should('be.visible')
		})

		it('shows all supported versions in dropdown', () => {
			cy.get('[data-cy="server-form-modal"]').should('be.visible')

			// Check for version options by getting all option elements
			cy.get('[data-cy="create-minecraft-version-select"]')
				.find('option')
				.then(($options) => {
					const optionTexts = Array.from($options).map((el) => el.textContent)
					expect(optionTexts).to.include('Minecraft 1.16')
					expect(optionTexts).to.include('Minecraft 1.17')
					expect(optionTexts).to.include('Minecraft 1.18')
					expect(optionTexts).to.include('Minecraft 1.19')
					expect(optionTexts).to.include('Minecraft 1.20')
					expect(optionTexts).to.include('Minecraft 1.21')
				})
		})

		it('default version selection works correctly', () => {
			// Check that default version is selected (should be 1.16, the first version in the array)
			cy.get('[data-cy="create-minecraft-version-select"]').should('have.value', '1.16')
		})
	})
})
