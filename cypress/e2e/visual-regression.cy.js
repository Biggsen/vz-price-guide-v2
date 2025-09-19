// Visual regression testing for all pages and states
describe('Visual Regression - All Pages and States', () => {
	// Test configuration
	const viewportWidth = 1280
	const viewportHeight = 720

	// Define all routes and their states
	const routes = [
		// Public pages
		{ path: '/', name: 'home', states: ['default', 'no-data', 'with-alert', 'without-alert'] },
		{ path: '/signin', name: 'signin', states: ['default', 'error', 'success'] },
		{ path: '/signup', name: 'signup', states: ['default', 'error'] },
		{
			path: '/reset-password',
			name: 'reset-password',
			states: ['default', 'success', 'error']
		},
		{
			path: '/reset-password-confirm',
			name: 'reset-password-confirm',
			states: ['loading', 'success', 'error', 'form']
		},
		{ path: '/verify-email', name: 'verify-email', states: ['default'] },
		{ path: '/verify-email-success', name: 'verify-email-success', states: ['default'] },
		{ path: '/updates', name: 'updates', states: ['default'] },
		{ path: '/privacy-policy', name: 'privacy-policy', states: ['default'] },
		{ path: '/cookie-policy', name: 'cookie-policy', states: ['default'] },
		{ path: '/terms-of-use', name: 'terms-of-use', states: ['default'] },
		{ path: '/not-found', name: 'not-found', states: ['default'] },

		// Auth required pages
		{ path: '/account', name: 'account', states: ['default', 'verified', 'unverified'] },
		{ path: '/change-password', name: 'change-password', states: ['default', 'error'] },
		{ path: '/suggestions', name: 'suggestions', states: ['default', 'error'] },

		// Admin pages
		{ path: '/admin', name: 'admin', states: ['default', 'error'] },
		{ path: '/shop-manager', name: 'shop-manager', states: ['default'] },
		{ path: '/add', name: 'add-item', states: ['default'] },
		{ path: '/edit/test-item', name: 'edit-item', states: ['default', 'loading'] },
		{ path: '/missing-items', name: 'missing-items', states: ['default', 'loading'] },
		{ path: '/bulk-update', name: 'bulk-update', states: ['default', 'loading'] },
		{ path: '/servers', name: 'servers', states: ['default', 'loading', 'error', 'empty'] },
		{ path: '/shops', name: 'shops', states: ['default', 'loading', 'error', 'empty'] },
		{
			path: '/shop-items',
			name: 'shop-items',
			states: ['default', 'loading', 'error', 'empty']
		},
		{
			path: '/market-overview',
			name: 'market-overview',
			states: ['default', 'loading', 'error', 'empty']
		},
		{ path: '/recipes/import', name: 'recipes-import', states: ['default', 'loading'] },
		{ path: '/recipes/manage', name: 'recipes-manage', states: ['default', 'loading'] },
		{
			path: '/recipes/recalculate',
			name: 'recipes-recalculate',
			states: ['default', 'loading', 'error', 'success']
		},
		{ path: '/edit-recipe/test-recipe', name: 'edit-recipe', states: ['default', 'loading'] },
		{ path: '/suggestions/all', name: 'suggestions-admin', states: ['default', 'loading'] },
		{ path: '/styleguide', name: 'styleguide', states: ['default'] },
		{ path: '/restricted', name: 'restricted-access', states: ['default'] }
	]

	beforeEach(() => {
		// Set consistent viewport
		cy.viewport(viewportWidth, viewportHeight)

		// Clear localStorage to ensure consistent state
		cy.clearLocalStorage()
	})

	// Helper function to take screenshots with consistent naming
	function takeScreenshot(name, state = 'default') {
		const filename = `${name}-${state}`
		cy.screenshot(filename, {
			overwrite: true,
			capture: 'fullPage'
		})
	}

	// Helper function to wait for page to be ready
	function waitForPageReady() {
		// Wait for any loading spinners to disappear
		cy.get('[data-cy="loading"]', { timeout: 10000 }).should('not.exist')

		// Wait for content to be visible
		cy.get('body').should('be.visible')

		// Wait for Vue to finish rendering
		cy.get('[data-cy="app-loaded"]')
			.should('exist')
			.then(() => {
				// Small delay to ensure all animations are complete
				cy.wait(500)
			})
	}

	// Helper function to simulate different states
	function simulateState(state, route) {
		switch (state) {
			case 'error':
				// Simulate error state by intercepting network requests
				cy.intercept('GET', '**/items**', { statusCode: 500 }).as('errorRequest')
				break
			case 'no-data':
				// Simulate empty data state
				cy.intercept('GET', '**/items**', { body: [] }).as('emptyRequest')
				break
			case 'loading':
				// Add a loading indicator that we can wait for
				cy.window().then((win) => {
					const loadingDiv = win.document.createElement('div')
					loadingDiv.setAttribute('data-cy', 'loading')
					loadingDiv.className =
						'fixed inset-0 bg-white z-50 flex items-center justify-center'
					loadingDiv.innerHTML =
						'<div class="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>'
					win.document.body.appendChild(loadingDiv)
				})
				break
			case 'success':
				// Add success message to the page
				cy.get('body').then(($body) => {
					if ($body.find('[data-cy="success-message"]').length === 0) {
						cy.window().then((win) => {
							const successDiv = win.document.createElement('div')
							successDiv.setAttribute('data-cy', 'success-message')
							successDiv.className =
								'bg-green-50 border border-green-200 rounded-lg p-4 mb-4'
							successDiv.innerHTML =
								'<p class="text-green-800">Operation completed successfully!</p>'
							win.document.body.insertBefore(successDiv, win.document.body.firstChild)
						})
					}
				})
				break
		}
	}

	// Test all routes and their states
	routes.forEach((route) => {
		describe(`${route.name} page`, () => {
			route.states.forEach((state) => {
				it(`should capture ${state} state`, () => {
					// Handle authentication requirements
					if (
						route.path.includes('/admin') ||
						route.path.includes('/account') ||
						route.path.includes('/change-password') ||
						route.path.includes('/suggestions')
					) {
						// Sign in as admin user
						cy.task('verifyUserEmail', 'admin@example.com')
						cy.visit('/signin')
						cy.get('[data-cy="email-input"]').type('admin@example.com')
						cy.get('[data-cy="password-input"]').type('password123')
						cy.get('[data-cy="signin-button"]').click()
						cy.url().should('include', '/account')
					} else if (route.path.includes('/verify-email')) {
						// Sign in as unverified user
						cy.task('verifyUserEmail', 'user@example.com')
						cy.visit('/signin')
						cy.get('[data-cy="email-input"]').type('user@example.com')
						cy.get('[data-cy="password-input"]').type('password123')
						cy.get('[data-cy="signin-button"]').click()
						cy.url().should('include', '/verify-email')
					}

					// Navigate to the route
					cy.visit(route.path)

					// Simulate the specific state
					simulateState(state, route)

					// Wait for page to be ready
					waitForPageReady()

					// Take screenshot
					takeScreenshot(route.name, state)
				})
			})
		})
	})

	// Special test for home page with different configurations
	describe('Home page variations', () => {
		it('should capture home page with alert', () => {
			cy.visit('/')
			waitForPageReady()
			takeScreenshot('home', 'with-alert')
		})

		it('should capture home page without alert', () => {
			cy.visit('/')
			cy.get('[data-cy="dismiss-alert"]').click()
			waitForPageReady()
			takeScreenshot('home', 'without-alert')
		})

		it('should capture home page in categories view', () => {
			cy.visit('/')
			cy.get('[data-cy="view-categories"]').click()
			waitForPageReady()
			takeScreenshot('home', 'categories-view')
		})

		it('should capture home page in list view', () => {
			cy.visit('/')
			cy.get('[data-cy="view-list"]').click()
			waitForPageReady()
			takeScreenshot('home', 'list-view')
		})

		it('should capture home page in compact layout', () => {
			cy.visit('/')
			cy.get('[data-cy="layout-compact"]').click()
			waitForPageReady()
			takeScreenshot('home', 'compact-layout')
		})

		it('should capture home page with no items (empty state)', () => {
			cy.intercept('GET', '**/items**', { body: [] }).as('emptyItems')
			cy.visit('/')
			cy.wait('@emptyItems')
			waitForPageReady()
			takeScreenshot('home', 'empty-state')
		})
	})

	// Test modals and overlays
	describe('Modals and overlays', () => {
		beforeEach(() => {
			cy.visit('/')
			waitForPageReady()
		})

		it('should capture settings modal', () => {
			cy.get('[data-cy="settings-button"]').click()
			cy.get('[data-cy="settings-modal"]').should('be.visible')
			takeScreenshot('settings-modal', 'default')
		})

		it('should capture export modal', () => {
			cy.get('[data-cy="export-button"]').click()
			cy.get('[data-cy="export-modal"]').should('be.visible')
			takeScreenshot('export-modal', 'default')
		})
	})

	// Test error pages
	describe('Error pages', () => {
		it('should capture 404 page', () => {
			cy.visit('/non-existent-page', { failOnStatusCode: false })
			waitForPageReady()
			takeScreenshot('404', 'default')
		})

		it('should capture restricted access page', () => {
			cy.visit('/admin')
			waitForPageReady()
			takeScreenshot('restricted-access', 'default')
		})
	})

	// Test responsive breakpoints
	describe('Responsive breakpoints', () => {
		const breakpoints = [
			{ width: 375, height: 667, name: 'mobile' },
			{ width: 768, height: 1024, name: 'tablet' },
			{ width: 1024, height: 768, name: 'desktop-small' },
			{ width: 1440, height: 900, name: 'desktop-large' }
		]

		breakpoints.forEach((breakpoint) => {
			it(`should capture home page at ${breakpoint.name} breakpoint`, () => {
				cy.viewport(breakpoint.width, breakpoint.height)
				cy.visit('/')
				waitForPageReady()
				takeScreenshot('home', breakpoint.name)
			})
		})
	})
})
