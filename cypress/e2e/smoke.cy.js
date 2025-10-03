describe('Smoke: Home loads and seeded data available', () => {
	it('loads the home page', () => {
		cy.visit('/')
		cy.title().should('include', 'price guide')
		cy.get('#app').should('exist')
	})

	it('shows seeded items in the UI (oak planks and oak log)', () => {
		cy.visit('/')
		// Ensure category/table renders
		cy.contains('caption', 'wood', { matchCase: false })

		// oak planks by visible name link and expected unit buy price 2
		cy.contains('a', /^oak planks$/i)
			.should('be.visible')
			.parents('tr')
			.within(() => {
				cy.contains(/\b2\b/).should('be.visible')
			})

		// oak log by visible name link and expected unit buy price 8
		cy.contains('a', /^oak log$/i)
			.should('be.visible')
			.parents('tr')
			.within(() => {
				cy.contains(/\b8\b/).should('be.visible')
			})
	})
})
