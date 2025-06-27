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

// Admin configuration
export const ADMIN_UIDS = [
	// Add your UID here - you can get it from the Firebase console or by logging it in your profile
	'dx4cm54EArZeVE3d1CPJuU2kJbl2' // Replace with your actual Firebase UID
]

// Admin utility functions
export function isAdmin(user) {
	return user && ADMIN_UIDS.includes(user.uid)
}

export function requiresAdmin(user) {
	return !isAdmin(user)
}
