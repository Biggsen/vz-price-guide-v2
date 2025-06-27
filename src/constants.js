export const categories = [
	'ores',
	'stone',
	'earth',
	'sand',
	'wood',
	'drops',
	'food',
	'utility',
	'plants',
	'redstone',
	'nether',
	'ocean',
	'tools',
	'weapons',
	'armor',
	'end',
	'ice',
	'dyed',
	'spawn',
	'discs'
]

export const disabledCategories = ['spawn']

export const enabledCategories = categories.filter((cat) => !disabledCategories.includes(cat))

// Admin utility functions using custom claims
export async function isAdmin(user) {
	if (!user) return false

	try {
		// Get the user's ID token to access custom claims
		const idTokenResult = await user.getIdTokenResult()
		return idTokenResult.claims.admin === true
	} catch (error) {
		console.error('Error checking admin status:', error)
		return false
	}
}

export async function requiresAdmin(user) {
	return !(await isAdmin(user))
}
