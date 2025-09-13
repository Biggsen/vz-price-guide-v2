describe('Auth Flow', () => {
	before(() => {
		// Accept cookies once to avoid banner noise across tests
		cy.visit('/')
		cy.acceptCookies()
	})

	it('redirects guest to signin with redirect param when visiting protected route', () => {
		cy.ensureSignedOut()
		cy.visit('/admin')
		cy.location('pathname').should('eq', '/signin')
		cy.location('search').then((search) => {
			const params = new URLSearchParams(search)
			expect(params.get('redirect')).to.eq('/admin')
		})
	})

	it('sign-in honors redirect query and lands on target path', () => {
		cy.ensureSignedOut()
		cy.visit('/signin?redirect=/account')
		cy.get('[data-cy="signin-email"]').type('user@example.com')
		cy.get('[data-cy="signin-password"]').type('passWORD123')
		cy.get('[data-cy="signin-submit"]').click()
		cy.location('pathname').should('eq', '/account')
	})

	it('non-admin is blocked from admin route', () => {
		cy.ensureSignedIn('user@example.com', 'passWORD123')
		cy.waitForAuth()
		cy.visit('/admin')
		cy.location('pathname').should('eq', '/restricted')
	})

	it('admin can access admin route', () => {
		cy.ensureSignedOut()
		cy.signIn('admin@example.com', 'passWORD123')
		cy.visit('/admin')
		cy.location('pathname').should('eq', '/admin')
	})

	it('unverified user is redirected to verify-email for routes requiring verification', () => {
		cy.ensureSignedOut()
		cy.signIn('unverified@example.com', 'passWORD123')
		cy.visit('/recipes/import')
		cy.location('pathname').should('eq', '/verify-email')
	})

	it('signed-in users are redirected away from auth pages', () => {
		cy.ensureSignedIn('user@example.com', 'passWORD123')
		cy.waitForAuth()
		cy.visit('/signin')
		cy.location('pathname').should('eq', '/account')
	})
})

describe('Change Password Flow', () => {
	it('allows verified user to change password successfully', () => {
		const timestamp = Date.now()
		const tempEmail = `passwordtest${timestamp}@example.com`

		// Create temporary user and verify email
		cy.ensureSignedOut()
		cy.signUp(tempEmail, 'passWORD123', 'passWORD123')
		cy.location('pathname').should('eq', '/verify-email')
		cy.simulateEmailVerification(tempEmail)

		// Test password change
		cy.visit('/change-password')
		cy.changePassword('passWORD123', 'NewPass123', 'NewPass123')

		// Verify success redirect and message
		cy.location('pathname').should('eq', '/account')
		cy.contains('Password updated successfully').should('be.visible')

		// Verify new password works
		cy.signOut()
		cy.signIn(tempEmail, 'NewPass123')
		cy.location('pathname').should('eq', '/')
	})

	it('shows error for incorrect current password', () => {
		const timestamp = Date.now()
		const tempEmail = `passwordtest${timestamp}@example.com`

		// Create temporary user and verify email
		cy.ensureSignedOut()
		cy.signUp(tempEmail, 'passWORD123', 'passWORD123')
		cy.simulateEmailVerification(tempEmail)

		// Test password change with wrong current password
		cy.visit('/change-password')
		cy.changePassword('wrongpassword', 'NewPass123', 'NewPass123')

		// Verify error message
		cy.contains('Current password is incorrect').should('be.visible')
		cy.location('pathname').should('eq', '/change-password')
	})

	it('shows error for weak new password', () => {
		const timestamp = Date.now()
		const tempEmail = `passwordtest${timestamp}@example.com`

		// Create temporary user and verify email
		cy.ensureSignedOut()
		cy.signUp(tempEmail, 'passWORD123', 'passWORD123')
		cy.simulateEmailVerification(tempEmail)

		// Test password change with weak password
		cy.visit('/change-password')
		cy.get('[data-cy="change-password-current"]').type('passWORD123')
		cy.get('[data-cy="change-password-new"]').type('weak')
		cy.get('[data-cy="change-password-confirm"]').type('weak')

		// Verify error message
		cy.contains('Password is invalid').should('be.visible')

		// Submit button should be enabled but form validation prevents submission
		cy.get('[data-cy="change-password-submit"]').should('be.enabled')

		// Try to submit - should stay on the same page due to validation
		cy.get('[data-cy="change-password-submit"]').click()
		cy.location('pathname').should('eq', '/change-password')
	})

	it('shows error for mismatched password confirmation', () => {
		const timestamp = Date.now()
		const tempEmail = `passwordtest${timestamp}@example.com`

		// Create temporary user and verify email
		cy.ensureSignedOut()
		cy.signUp(tempEmail, 'passWORD123', 'passWORD123')
		cy.location('pathname').should('eq', '/verify-email')
		cy.simulateEmailVerification(tempEmail)

		// Test password change with mismatched confirmation
		cy.visit('/change-password')
		cy.get('[data-cy="change-password-current"]').type('passWORD123')
		cy.get('[data-cy="change-password-new"]').type('NewPass123')
		cy.get('[data-cy="change-password-confirm"]').type('DifferentPass123')

		// Verify error message
		cy.contains('Passwords do not match').should('be.visible')

		// Submit button should be enabled but form validation prevents submission
		cy.get('[data-cy="change-password-submit"]').should('be.enabled')

		// Try to submit - should stay on the same page due to validation
		cy.get('[data-cy="change-password-submit"]').click()
		cy.location('pathname').should('eq', '/change-password')
	})
})
