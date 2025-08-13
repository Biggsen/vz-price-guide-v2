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
		cy.ensureSignedIn('admin@example.com', 'passWORD123')
		cy.waitForAuth()
		cy.visit('/admin')
		cy.location('pathname').should('eq', '/admin')
	})

	it('unverified user is redirected to verify-email for routes requiring verification', () => {
		cy.ensureSignedIn('unverified@example.com', 'passWORD123')
		cy.waitForAuth()
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
