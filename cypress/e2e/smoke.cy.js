describe('Smoke: Home loads', () => {
	it('loads the home page', () => {
		cy.visit('/')
		cy.title().should('include', 'price guide')
		cy.get('#app').should('exist')
	})
})
