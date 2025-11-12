// Visual screenshot capture for all pages and states
// This test captures screenshots of every page and their different states
// for visual review without manual navigation

describe('Visual Screenshots - All Pages and States', () => {
	const viewportWidth = 1280
	const viewportHeight = 720

	beforeEach(() => {
		cy.viewport(viewportWidth, viewportHeight)
		cy.ensureSignedOut()
	})

	// Helper function to take screenshots with consistent naming
	function takeScreenshot(name, state = 'default') {
		const filename = `${name}-${state}`
		cy.screenshot(filename, {
			overwrite: true,
			capture: 'fullPage'
		})
	}

	// Helper function to dismiss cookie banners using existing command
	function dismissCookieBanner() {
		cy.dismissCookieBanner()
	}

	// Helper function to wait for page to be ready
	function waitForPageReady() {
		cy.get('[data-cy="app-loaded"]').should('exist')
		cy.wait(1000) // Give time for all content to load

		// Dismiss any cookie banners
		dismissCookieBanner()

		// Wait a bit more to ensure banners are gone
		cy.wait(500)
	}

	// Helper function to sign in a user using existing Cypress commands
	function signInUser(email, password = 'passWORD123') {
		// Use the existing signIn command which actually performs the sign-in
		cy.signIn(email, password)
		cy.waitForAuth()
	}

	// Test public pages (no authentication required)
	describe('Public Pages', () => {
		it('should capture home page', () => {
			cy.visit('/')
			waitForPageReady()
			takeScreenshot('home', 'default')
		})

		it('should capture signin page', () => {
			cy.visit('/signin')
			waitForPageReady()
			takeScreenshot('signin', 'default')
		})

		it('should capture signup page', () => {
			cy.visit('/signup')
			waitForPageReady()
			takeScreenshot('signup', 'default')
		})

		it('should capture reset password page', () => {
			cy.visit('/reset-password')
			waitForPageReady()
			takeScreenshot('reset-password', 'default')
		})

		it('should capture updates page', () => {
			cy.visit('/updates')
			waitForPageReady()
			takeScreenshot('updates', 'default')
		})

		it('should capture privacy policy page', () => {
			cy.visit('/privacy-policy')
			waitForPageReady()
			takeScreenshot('privacy-policy', 'default')
		})

		it('should capture cookie policy page', () => {
			cy.visit('/cookie-policy')
			waitForPageReady()
			takeScreenshot('cookie-policy', 'default')
		})

		it('should capture terms of use page', () => {
			cy.visit('/terms-of-use')
			waitForPageReady()
			takeScreenshot('terms-of-use', 'default')
		})

		it('should capture 404 page', () => {
			cy.visit('/non-existent-page', { failOnStatusCode: false })
			waitForPageReady()
			takeScreenshot('404', 'default')
		})
	})

	// Test authentication flow pages
	describe('Authentication Flow', () => {
		it('should capture verify email page - default state', () => {
			// Sign in as regular user
			signInUser('user@example.com')
			cy.visit('/verify-email')
			waitForPageReady()
			// Wait a bit longer for the page to fully load
			cy.wait(1000)
			// Ensure we're on the right page and can see the main content
			cy.url().should('include', '/verify-email')
			cy.get('body').should('contain', 'Verify')
			takeScreenshot('verify-email', 'default')
		})

		it('should capture verify email page - success state', () => {
			// Sign in as regular user and force success state
			signInUser('user@example.com')
			cy.visit('/verify-email?forceState=success')
			waitForPageReady()
			// Wait for the forced state to take effect
			cy.wait(500)
			// Ensure we're on the right page and success state is shown
			cy.url().should('include', '/verify-email')
			cy.url().should('include', 'forceState=success')
			cy.get('body').should('contain', 'successfully')
			takeScreenshot('verify-email', 'success')
		})

		it('should capture verify email success page - error state', () => {
			cy.visit('/verify-email-success?forceState=error')
			waitForPageReady()
			// Wait for the forced state to take effect
			cy.wait(500)
			// Ensure we're on the right page and error state is shown
			cy.url().should('include', '/verify-email-success')
			cy.url().should('include', 'forceState=error')
			cy.get('body').should('contain', 'Failed')
			takeScreenshot('verify-email-success', 'error')
		})

		it('should capture verify email success page - success state', () => {
			// Sign in as a user and force success state
			signInUser('user@example.com')
			cy.visit('/verify-email-success?forceState=success')
			waitForPageReady()
			// Wait for the forced state to take effect
			cy.wait(500)
			// Ensure we're on the right page and success state is shown
			cy.url().should('include', '/verify-email-success')
			cy.url().should('include', 'forceState=success')
			cy.get('body').should('contain', 'Verified')
			takeScreenshot('verify-email-success-page', 'success')
		})

		it('should capture reset password confirm page - form state', () => {
			// Generate a reset code
			cy.task('generatePasswordResetCode', 'user@example.com').then((result) => {
				cy.visit(`/reset-password-confirm?oobCode=${result.oobCode}`)
				waitForPageReady()
				takeScreenshot('reset-password-confirm', 'form')
			})
		})

		it('should capture reset password confirm page - error state', () => {
			cy.visit('/reset-password-confirm')
			waitForPageReady()
			takeScreenshot('reset-password-confirm', 'error')
		})
	})

	// Test authenticated user pages
	describe('Authenticated User Pages', () => {
		beforeEach(() => {
			// Ensure we're signed out first, then sign in as regular user
			cy.ensureSignedOut()
			signInUser('user@example.com')
		})

		it('should capture account page', () => {
			cy.visit('/account')
			waitForPageReady()
			takeScreenshot('account', 'default')
		})

		it('should capture account page - edit profile state', () => {
			cy.visit('/account')
			waitForPageReady()
			// Click edit profile button if it exists
			cy.get('body').then(($body) => {
				if (
					$body.find('button:contains("Edit Profile"), [data-cy="edit-profile-button"]')
						.length > 0
				) {
					cy.get(
						'button:contains("Edit Profile"), [data-cy="edit-profile-button"]'
					).click()
					cy.wait(500) // Wait for edit mode to activate
				}
			})
			takeScreenshot('account', 'edit-profile')
		})

		it('should capture account page - unverified user state', () => {
			// Sign in as unverified user
			cy.ensureSignedOut()
			signInUser('unverified@example.com')
			cy.visit('/account')
			waitForPageReady()
			takeScreenshot('account', 'unverified')
		})

		it('should capture change password page', () => {
			cy.visit('/change-password')
			waitForPageReady()
			takeScreenshot('change-password', 'default')
		})

		it('should capture suggestions page', () => {
			cy.visit('/suggestions')
			waitForPageReady()
			takeScreenshot('suggestions', 'default')
		})
	})

	// Test admin pages
	describe('Admin Pages', () => {
		beforeEach(() => {
			// Ensure we're signed out first, then sign in as admin user
			cy.ensureSignedOut()
			signInUser('admin@example.com')
		})

		it('should capture admin dashboard', () => {
			cy.visit('/admin')
			waitForPageReady()
			takeScreenshot('admin', 'default')
		})

		it('should capture shop manager', () => {
			cy.visit('/shop-manager')
			waitForPageReady()
			takeScreenshot('shop-manager', 'default')
		})

		it('should capture add item page', () => {
			cy.visit('/add')
			waitForPageReady()
			takeScreenshot('add-item', 'default')
		})

		it('should capture edit item page', () => {
			// Visit edit page with a sample item ID
			cy.visit('/edit/sample-item-id')
			waitForPageReady()
			takeScreenshot('edit-item', 'default')
		})

		it('should capture missing items page', () => {
			cy.visit('/missing-items')
			waitForPageReady()
			takeScreenshot('missing-items', 'default')
		})

		it('should capture bulk update page', () => {
			cy.visit('/bulk-update')
			waitForPageReady()
			takeScreenshot('bulk-update', 'default')
		})

		it('should capture servers page', () => {
			cy.visit('/servers')
			waitForPageReady()
			takeScreenshot('servers', 'default')
		})

		it('should capture shops page', () => {
			cy.visit('/shops')
			waitForPageReady()
			takeScreenshot('shops', 'default')
		})

		it('should capture shop items page', () => {
			cy.visit('/shop')
			waitForPageReady()
			takeScreenshot('shop', 'default')
		})

		it('should capture market overview page', () => {
			cy.visit('/market-overview')
			waitForPageReady()
			takeScreenshot('market-overview', 'default')
		})

		it('should capture recipe import page', () => {
			cy.visit('/recipes/import')
			waitForPageReady()
			takeScreenshot('recipes-import', 'default')
		})

		it('should capture recipe manage page', () => {
			cy.visit('/recipes/manage')
			waitForPageReady()
			takeScreenshot('recipes-manage', 'default')
		})

		it('should capture recipe recalculate page', () => {
			cy.visit('/recipes/recalculate')
			waitForPageReady()
			takeScreenshot('recipes-recalculate', 'default')
		})

		it('should capture edit recipe page', () => {
			// Visit edit recipe page with a real recipe ID and version
			cy.visit('/edit-recipe/brush?version=1.20')
			waitForPageReady()
			takeScreenshot('edit-recipe', 'default')
		})

		it('should capture suggestions admin page', () => {
			cy.visit('/suggestions/all')
			waitForPageReady()
			takeScreenshot('suggestions-admin', 'default')
		})

		it('should capture styleguide page', () => {
			cy.visit('/styleguide')
			waitForPageReady()
			takeScreenshot('styleguide', 'default')
		})

		it('should capture crate rewards page', () => {
			cy.visit('/crate-rewards')
			waitForPageReady()
			takeScreenshot('crate-rewards', 'default')
		})

		it('should capture crate rewards detail page', () => {
			// Visit the detail page for the test crate we seeded
			cy.visit('/crate-rewards/test-crate-1')
			waitForPageReady()
			takeScreenshot('crate-rewards-detail', 'default')
		})
	})

	// Test restricted access page
	describe('Access Control', () => {
		beforeEach(() => {
			// Sign in as regular user (not admin)
			cy.ensureSignedOut()
			signInUser('user@example.com')
		})

		it('should capture restricted access page', () => {
			// Try to access admin page as regular user
			cy.visit('/admin')
			waitForPageReady()
			takeScreenshot('restricted-access', 'default')
		})
	})

	// Test home page variations
	describe('Home Page Variations', () => {
		beforeEach(() => {
			// Ensure we're signed out for public page captures
			cy.ensureSignedOut()
		})

		it('should capture home page in list view', () => {
			cy.visit('/')
			waitForPageReady()
			// Switch to list view
			cy.get('body').then(($body) => {
				if ($body.find('button:contains("List")').length > 0) {
					cy.get('button:contains("List")').click()
					cy.wait(500)
				}
			})
			takeScreenshot('home', 'list-view')
		})

		it('should capture home page in compact layout', () => {
			cy.visit('/')
			waitForPageReady()
			// Switch to compact layout
			cy.get('body').then(($body) => {
				if ($body.find('button:contains("Compact")').length > 0) {
					cy.get('button:contains("Compact")').click()
					cy.wait(500)
				}
			})
			takeScreenshot('home', 'compact-layout')
		})
	})

	// Test responsive breakpoints
	describe('Responsive Breakpoints', () => {
		beforeEach(() => {
			// Ensure we're signed out for public page captures
			cy.ensureSignedOut()
		})

		it('should capture home page on mobile', () => {
			cy.viewport(375, 667)
			cy.visit('/')
			waitForPageReady()
			takeScreenshot('home', 'mobile')
		})

		it('should capture home page on tablet', () => {
			cy.viewport(768, 1024)
			cy.visit('/')
			waitForPageReady()
			takeScreenshot('home', 'tablet')
		})

		it('should capture home page on large desktop', () => {
			cy.viewport(1440, 900)
			cy.visit('/')
			waitForPageReady()
			takeScreenshot('home', 'large-desktop')
		})
	})

	// Test modal states
	describe('Modal States', () => {
		beforeEach(() => {
			// Ensure we're signed out for public page modal captures
			cy.ensureSignedOut()
			cy.visit('/')
			waitForPageReady()
			// Extra dismissal for modal tests since they're more sensitive
			dismissCookieBanner()
		})

		it('should capture settings modal', () => {
			cy.get('body').then(($body) => {
				if ($body.find('button:contains("Settings")').length > 0) {
					cy.get('button:contains("Settings")').click()
					cy.wait(500)
					takeScreenshot('settings-modal', 'default')
					// Close modal
					cy.get('body').type('{esc}')
				}
			})
		})

		it('should capture export modal', () => {
			cy.get('body').then(($body) => {
				if ($body.find('button:contains("Export")').length > 0) {
					cy.get('button:contains("Export")').click()
					cy.wait(500)
					takeScreenshot('export-modal', 'default')
					// Close modal
					cy.get('body').type('{esc}')
				}
			})
		})
	})
})
