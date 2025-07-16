export const categories = [
	'ores',
	'stone',
	'earth',
	'sand',
	'wood',
	'drops',
	'food',
	'utility',
	'light',
	'plants',
	'redstone',
	'ocean',
	'nether',
	'end',
	'deep dark',
	'tools',
	'weapons',
	'armor',
	'enchantments',
	'ice',
	'dyed',
	'spawn',
	'discs'
]

export const disabledCategories = ['spawn']

export const enabledCategories = categories.filter((cat) => !disabledCategories.includes(cat))

export const versions = ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21']

export const roadmapStatusLegend = {
	Pending: {
		description: 'Not yet started',
		color: '#6B7280'
	},
	'In Development': {
		description: 'Being built and tested - not yet available to users',
		color: '#3B82F6'
	},
	'In Progress': {
		description: 'Being delivered incrementally - users may see updates',
		color: '#F59E0B'
	},
	Completed: {
		description: 'Fully available to all users',
		color: '#10B981'
	}
}

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
