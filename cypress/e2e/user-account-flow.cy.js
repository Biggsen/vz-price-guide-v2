describe('User Account Flow', () => {
	before(() => {
		// Accept cookies once to avoid banner noise across tests
		cy.visit('/')
		cy.acceptCookies()
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

	describe('Forgot Password Flow', () => {
		it('completes the entire forgot password journey - happy path', () => {
			const timestamp = Date.now()
			const tempEmail = `completeflow${timestamp}@example.com`
			const originalPassword = 'passWORD123'
			const newPassword = 'NewPass123'

			// Test the complete flow: registration → verification → forgot password → reset → sign in
			cy.completeForgotPasswordFlow(tempEmail, originalPassword, newPassword)
		})

		it('shows error for invalid reset link', () => {
			cy.ensureSignedOut()

			// Visit reset confirmation page without valid oobCode
			cy.visit('/reset-password-confirm')
			cy.contains('Invalid Reset Link').should('be.visible')
			cy.contains('Invalid reset link. Please request a new password reset.').should(
				'be.visible'
			)

			// Should have option to request new reset link
			cy.contains('Request New Reset Link').should('be.visible')
		})

		it('shows error for non-existent email in reset request', () => {
			cy.ensureSignedOut()

			// Request password reset for non-existent email
			cy.visit('/reset-password')
			cy.get('[data-cy="reset-email"]').type('nonexistent@example.com')
			cy.get('[data-cy="reset-submit"]').click()

			// Should show error message
			cy.contains('No account found with this email address.').should('be.visible')
		})
	})

	describe('Profile Creation Flow', () => {
		it('completes the entire profile creation journey - happy path', () => {
			const timestamp = Date.now()
			const tempEmail = `profiletest${timestamp}@example.com`
			const password = 'passWORD123'
			const minecraftUsername = `TestPlayer${timestamp}`
			const displayName = `Test Player ${timestamp}`
			const bio = 'This is a test bio for profile creation'

			// Test the complete flow: registration → verification → profile creation
			cy.completeProfileCreationFlow(tempEmail, password, minecraftUsername, displayName, bio)
		})

		it('creates profile with minimal required fields', () => {
			const timestamp = Date.now()
			const tempEmail = `minimalprofile${timestamp}@example.com`
			const password = 'passWORD123'
			const minecraftUsername = `MinimalPlayer${timestamp}`

			// Test profile creation with only required fields (no bio, use Minecraft username as display name)
			cy.completeProfileCreationFlow(tempEmail, password, minecraftUsername, '', '', true)
		})
	})

	describe('Sign Up Flow', () => {
		it('completes sign up flow with valid data', () => {
			const timestamp = Date.now()
			const uniqueEmail = `signuptest${timestamp}@example.com`

			cy.ensureSignedOut()
			cy.visit('/signup')

			// Fill out sign up form
			cy.get('[data-cy="signup-email"]').type(uniqueEmail)
			cy.get('[data-cy="signup-password"]').type('Password123')
			cy.get('[data-cy="signup-confirm-password"]').type('Password123')
			cy.get('[data-cy="signup-terms"]').check()
			cy.get('[data-cy="signup-submit"]').click()

			// Should redirect to email verification page
			cy.location('pathname').should('eq', '/verify-email')
			cy.contains('Check Your Email').should('be.visible')
		})

		it('shows error for email already in use', () => {
			cy.ensureSignedOut()
			cy.visit('/signup')

			// Try to sign up with existing email
			cy.get('[data-cy="signup-email"]').type('user@example.com')
			cy.get('[data-cy="signup-password"]').type('Password123')
			cy.get('[data-cy="signup-confirm-password"]').type('Password123')
			cy.get('[data-cy="signup-terms"]').check()
			cy.get('[data-cy="signup-submit"]').click()

			// Should show error message
			cy.contains('An account with this email address already exists.').should('be.visible')
		})

		it('validates password strength requirements', () => {
			cy.ensureSignedOut()
			cy.visit('/signup')

			// Test weak password
			cy.get('[data-cy="signup-password"]').type('weak')
			cy.get('[data-cy="signup-confirm-password"]').type('weak')

			// Should show password validation error
			cy.contains('Password is invalid').should('be.visible')
			cy.contains(
				'Password must be at least 8 characters with uppercase, lowercase, and number'
			).should('be.visible')

			// Submit button should be enabled but form validation prevents submission
			cy.get('[data-cy="signup-submit"]').should('be.enabled')
			cy.get('[data-cy="signup-submit"]').click()
			// Should stay on signup page due to validation
			cy.location('pathname').should('eq', '/signup')
		})

		it('validates password confirmation matching', () => {
			cy.ensureSignedOut()
			cy.visit('/signup')

			// Test mismatched passwords
			cy.get('[data-cy="signup-password"]').type('Password123')
			cy.get('[data-cy="signup-confirm-password"]').type('DifferentPassword123')

			// Should show password mismatch error
			cy.contains('Passwords do not match').should('be.visible')

			// Submit button should be enabled but form validation prevents submission
			cy.get('[data-cy="signup-submit"]').should('be.enabled')
			cy.get('[data-cy="signup-submit"]').click()
			// Should stay on signup page due to validation
			cy.location('pathname').should('eq', '/signup')
		})
	})

	describe('Sign In Flow', () => {
		it('shows error for non-existent user', () => {
			cy.ensureSignedOut()
			cy.visit('/signin')

			// Try to sign in with non-existent email
			cy.get('[data-cy="signin-email"]').type('nonexistent@example.com')
			cy.get('[data-cy="signin-password"]').type('password')
			cy.get('[data-cy="signin-submit"]').click()

			// Should show error message
			cy.contains('No account found with this email address.').should('be.visible')
		})

		it('shows error for incorrect password', () => {
			cy.ensureSignedOut()
			cy.visit('/signin')

			// Try to sign in with wrong password
			cy.get('[data-cy="signin-email"]').type('user@example.com')
			cy.get('[data-cy="signin-password"]').type('wrongpassword')
			cy.get('[data-cy="signin-submit"]').click()

			// Should show error message
			cy.contains('Incorrect password. Please try again.').should('be.visible')
		})

		it('shows success message after password reset', () => {
			cy.ensureSignedOut()
			cy.visit('/signin?message=password-reset-success')

			// Should show success message
			cy.contains('Your password has been reset successfully!').should('be.visible')
			cy.contains('You can now sign in with your new password.').should('be.visible')
		})

		it('shows success message after email verification', () => {
			cy.ensureSignedOut()
			cy.visit('/signin?message=email-verified')

			// Should show success message
			cy.contains('Your email has been verified successfully!').should('be.visible')
			cy.contains('You can now sign in to your account.').should('be.visible')
		})
	})
})
