export const categoryDefinitions = [
	{ key: 'ores', icon_material: 'IRON_INGOT' },
	{ key: 'stone', icon_material: 'STONE' },
	{ key: 'brick', icon_material: 'BRICKS' },
	{ key: 'copper', icon_material: 'COPPER_INGOT' },
	{ key: 'earth', icon_material: 'DIRT' },
	{ key: 'sand', icon_material: 'SAND' },
	{ key: 'wood', icon_material: 'OAK_LOG' },
	{ key: 'drops', icon_material: 'ROTTEN_FLESH' },
	{ key: 'food', icon_material: 'BREAD' },
	{ key: 'utility', icon_material: 'COMPASS' },
	{ key: 'transport', icon_material: 'MINECART' },
	{ key: 'light', icon_material: 'TORCH' },
	{ key: 'plants', icon_material: 'WHEAT' },
	{ key: 'redstone', icon_material: 'REDSTONE' },
	{ key: 'tools', icon_material: 'IRON_PICKAXE' },
	{ key: 'weapons', icon_material: 'IRON_SWORD' },
	{ key: 'armor', icon_material: 'IRON_CHESTPLATE' },
	{ key: 'enchantments', icon_material: 'ENCHANTED_BOOK' },
	{ key: 'brewing', icon_material: 'POTION' },
	{ key: 'ocean', icon_material: 'COD' },
	{ key: 'nether', icon_material: 'NETHERRACK' },
	{ key: 'end', icon_material: 'END_STONE' },
	{ key: 'deep dark', icon_material: 'SCULK' },
	{ key: 'archaeology', icon_material: 'BRUSH' },
	{ key: 'ice', icon_material: 'ICE' },
	{ key: 'dyed', icon_material: 'WHITE_DYE' },
	{ key: 'spawn', icon_material: 'SPAWNER' },
	{ key: 'discs', icon_material: 'MUSIC_DISC_13' }
]

export const disabledCategories = ['spawn']

export const categories = categoryDefinitions.map((category) => category.key)

export const enabledCategories = categoryDefinitions
	.filter((category) => !disabledCategories.includes(category.key))
	.map((category) => category.key)

export const categoryByKey = Object.fromEntries(
	categoryDefinitions.map((category) => [category.key, category])
)

export const versions = ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21']

export const baseEnabledVersions = ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21']

export const roadmapStatusLegend = {
	Idea: {
		description: 'Concept stage - not yet planned for implementation',
		color: '#8B5CF6'
	},
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