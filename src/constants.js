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
