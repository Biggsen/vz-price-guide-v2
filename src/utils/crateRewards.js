import { ref, computed } from 'vue'
import { useFirestore, useCollection, useDocument } from 'vuefire'
import {
	collection,
	doc,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	writeBatch,
	getDocs
} from 'firebase/firestore'
import * as yaml from 'js-yaml'
import { getEffectivePrice } from './pricing.js'

const db = useFirestore()

/**
 * Crate Reward Data Models
 */

// Crate Reward Collection Structure
// Collection: 'crate_rewards'
// Document fields:
// {
//   id: string (auto-generated)
//   user_id: string (owner)
//   name: string
//   description: string
//   minecraft_version: string (e.g., "1.20")
//   created_at: timestamp
//   updated_at: timestamp
// }

// Crate Reward Item Collection Structure
// Collection: 'crate_reward_items'
// Document fields:
// {
//   id: string (auto-generated)
//   crate_reward_id: string (parent crate reward)
//   item_id: string (reference to items collection)
//   quantity: number
//   weight: number (for Crazy Crates probability)
//   display_name: string (custom display name)
//   display_item: string (material_id for display)
//   display_amount: number (amount to show in GUI)
//   custom_model_data: number (optional)
//   enchantments: object (optional, for enchanted items)
//   created_at: timestamp
//   updated_at: timestamp
// }

/**
 * Create a new crate reward
 */
export async function createCrateReward(userId, crateData) {
	try {
		const now = new Date().toISOString()
		const crateReward = {
			user_id: userId,
			name: crateData.name,
			description: crateData.description || '',
			minecraft_version: crateData.minecraft_version || '1.20',
			created_at: now,
			updated_at: now
		}

		const docRef = await addDoc(collection(db, 'crate_rewards'), crateReward)
		return { id: docRef.id, ...crateReward }
	} catch (error) {
		console.error('Error creating crate reward:', error)
		throw error
	}
}

/**
 * Update an existing crate reward
 */
export async function updateCrateReward(crateId, updates) {
	try {
		const updateData = {
			...updates,
			updated_at: new Date().toISOString()
		}

		await updateDoc(doc(db, 'crate_rewards', crateId), updateData)
		return true
	} catch (error) {
		console.error('Error updating crate reward:', error)
		throw error
	}
}

/**
 * Delete a crate reward and all its items
 */
export async function deleteCrateReward(crateId) {
	try {
		const batch = writeBatch(db)

		// Delete all reward items first
		const rewardItemsQuery = query(
			collection(db, 'crate_reward_items'),
			where('crate_reward_id', '==', crateId)
		)
		const rewardItemsSnapshot = await getDocs(rewardItemsQuery)
		rewardItemsSnapshot.forEach((itemDoc) => {
			batch.delete(itemDoc.ref)
		})

		// Delete the crate reward
		batch.delete(doc(db, 'crate_rewards', crateId))

		await batch.commit()
		return true
	} catch (error) {
		console.error('Error deleting crate reward:', error)
		throw error
	}
}

/**
 * Add an item to a crate reward
 */
export async function addCrateRewardItem(crateId, itemData, itemDoc = null) {
	try {
		// Use provided itemDoc or fetch if not provided
		let materialId = itemData.item_id // fallback to item_id if item not found

		if (itemDoc) {
			// Use the provided item document data
			materialId = itemDoc.material_id || itemData.item_id
		} else if (itemData.material_id) {
			// Use material_id if provided directly in itemData
			materialId = itemData.material_id
		}

		const now = new Date().toISOString()
		const rewardItem = {
			crate_reward_id: crateId,
			item_id: itemData.item_id,
			quantity: itemData.quantity || 1,
			weight: itemData.weight || 50,
			display_name: itemData.display_name || '',
			display_item: itemData.display_item || materialId,
			display_amount: itemData.display_amount || itemData.quantity || 1,
			custom_model_data: itemData.custom_model_data || -1,
			enchantments: itemData.enchantments || {},
			created_at: now,
			updated_at: now
		}

		const docRef = await addDoc(collection(db, 'crate_reward_items'), rewardItem)
		return { id: docRef.id, ...rewardItem }
	} catch (error) {
		console.error('Error adding crate reward item:', error)
		throw error
	}
}

/**
 * Update a crate reward item
 */
export async function updateCrateRewardItem(itemId, updates) {
	try {
		const updateData = {
			...updates,
			updated_at: new Date().toISOString()
		}

		await updateDoc(doc(db, 'crate_reward_items', itemId), updateData)
		return true
	} catch (error) {
		console.error('Error updating crate reward item:', error)
		throw error
	}
}

/**
 * Delete a crate reward item
 */
export async function deleteCrateRewardItem(itemId) {
	try {
		await deleteDoc(doc(db, 'crate_reward_items', itemId))
		return true
	} catch (error) {
		console.error('Error deleting crate reward item:', error)
		throw error
	}
}

/**
 * Get all crate rewards for a user
 */
export function useCrateRewards(userId) {
	const crateRewardsQuery = computed(() => {
		if (!userId.value) return null
		return query(
			collection(db, 'crate_rewards'),
			where('user_id', '==', userId.value),
			orderBy('created_at', 'desc')
		)
	})

	const { data: crateRewards, pending, error } = useCollection(crateRewardsQuery)

	return {
		crateRewards,
		pending,
		error
	}
}

/**
 * Get a specific crate reward
 */
export function useCrateReward(crateId) {
	const crateRewardRef = computed(() => {
		if (!crateId.value) return null
		return doc(db, 'crate_rewards', crateId.value)
	})

	const { data: crateReward, pending, error } = useDocument(crateRewardRef)

	return {
		crateReward,
		pending,
		error
	}
}

/**
 * Get all items for a specific crate reward
 */
export function useCrateRewardItems(crateId) {
	const rewardItemsQuery = computed(() => {
		if (!crateId.value) return null
		return query(
			collection(db, 'crate_reward_items'),
			where('crate_reward_id', '==', crateId.value),
			orderBy('created_at', 'asc')
		)
	})

	const { data: rewardItems, pending, error } = useCollection(rewardItemsQuery)

	return {
		rewardItems,
		pending,
		error
	}
}

/**
 * Calculate the total value of a crate reward item
 */
export function calculateRewardItemValue(rewardItem, item, version = '1_20') {
	if (!rewardItem || !item) return 0

	const unitPrice = getEffectivePrice(item, version)
	const totalValue = unitPrice * rewardItem.quantity

	return totalValue
}

/**
 * Calculate the total value of all items in a crate reward
 */
export function calculateCrateRewardTotalValue(rewardItems, allItems, version = '1_20') {
	if (!rewardItems || !allItems) return 0

	let totalValue = 0

	rewardItems.forEach((rewardItem) => {
		const item = allItems.find((i) => i.id === rewardItem.item_id)
		if (item) {
			totalValue += calculateRewardItemValue(rewardItem, item, version)
		}
	})

	return totalValue
}

/**
 * Format a single reward item for YAML export
 */
export function formatRewardItemForYaml(rewardItem, item, prizeId, allItems = []) {
	if (!rewardItem || !item) return null

	// Check if item has enchantments
	const hasEnchantments =
		(rewardItem.enchantments && Object.keys(rewardItem.enchantments).length > 0) ||
		(item.material_id.startsWith('enchanted_book_') && item.material_id !== 'enchanted_book')

	// Build display name with "enchanted" prefix if applicable
	let itemName = item.name
	if (
		hasEnchantments &&
		!itemName.toLowerCase().includes('enchanted') &&
		item.material_id !== 'enchanted_book'
	) {
		itemName = `enchanted ${itemName}`
	}

	const displayName = rewardItem.display_name || `<white>${rewardItem.quantity}x ${itemName}`

	// For enchanted books, always use "enchanted_book" as DisplayItem
	let displayItem = rewardItem.display_item || item.material_id
	if (item.material_id === 'enchanted_book' || item.material_id.startsWith('enchanted_book_')) {
		displayItem = 'enchanted_book'
	}

	const displayAmount = rewardItem.quantity
	const weight = rewardItem.weight || 50

	// Build the item string
	let itemString

	// Handle enchanted books differently - use base item and list enchantments separately
	if (item.material_id === 'enchanted_book' || item.material_id.startsWith('enchanted_book_')) {
		itemString = `item:enchanted_book`
		// Always include amount for consistency
		itemString += `, amount:${rewardItem.quantity}`

		// For enchanted books, extract enchantment from material_id if not in enchantments object
		if (
			item.material_id.startsWith('enchanted_book_') &&
			item.material_id !== 'enchanted_book'
		) {
			// Try to extract enchantment with level first (e.g., "enchanted_book_mending_1" -> "mending:1")
			const enchantWithLevelMatch = item.material_id.match(/^enchanted_book_(.+)_(\d+)$/)
			if (enchantWithLevelMatch) {
				const enchantName = enchantWithLevelMatch[1] // Get the enchantment name
				const enchantLevel = parseInt(enchantWithLevelMatch[2]) // Get the level as number
				itemString += `, ${enchantName}:${enchantLevel}`
			} else {
				// Try to extract enchantment without level (e.g., "enchanted_book_silk_touch" -> "silk_touch:1")
				const enchantWithoutLevelMatch = item.material_id.match(/^enchanted_book_(.+)$/)
				if (enchantWithoutLevelMatch) {
					const enchantName = enchantWithoutLevelMatch[1] // Get the enchantment name
					itemString += `, ${enchantName}:1` // Default to level 1
				}
			}
		}

		// Add enchantments from enchantments object if any
		if (rewardItem.enchantments && Object.keys(rewardItem.enchantments).length > 0) {
			Object.entries(rewardItem.enchantments).forEach(([enchant, level]) => {
				// Convert enchantment format from "enchanted_book_unbreaking_3" to "unbreaking:3"
				let formattedEnchant = enchant
				let enchantLevel = level

				// Remove "enchanted_book_" prefix if present
				if (formattedEnchant.startsWith('enchanted_book_')) {
					formattedEnchant = formattedEnchant.replace('enchanted_book_', '')
				}

				// Extract level from enchantment name if it ends with a number
				const levelMatch = formattedEnchant.match(/^(.+)_(\d+)$/)
				if (levelMatch) {
					formattedEnchant = levelMatch[1] // Get the enchantment name without level
					enchantLevel = parseInt(levelMatch[2]) // Get the level as number
				}

				// Don't remove underscores - they're part of the enchantment name
				// (e.g., "feather_falling" should stay as "feather_falling")

				itemString += `, ${formattedEnchant}:${enchantLevel}`
			})
		}
	} else {
		// Regular items (gear, tools, etc.)
		itemString = `item:${item.material_id}`
		// Always include amount for consistency
		itemString += `, amount:${rewardItem.quantity}`

		// Add enchantments if any
		if (rewardItem.enchantments && Object.keys(rewardItem.enchantments).length > 0) {
			Object.entries(rewardItem.enchantments).forEach(([enchant, level]) => {
				// Look up the enchantment item to get its name
				const enchantItem = allItems.find((item) => item.id === enchant)
				if (enchantItem && enchantItem.name) {
					// Extract enchantment name and level from name like "enchanted book (unbreaking iii)"
					const match = enchantItem.name.match(/^enchanted book \((.+)\)$/)
					if (match) {
						const contentInParentheses = match[1].trim()

						// Split by spaces and process each part
						const parts = contentInParentheses.split(' ')

						// Find the last part that's a roman numeral
						const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v']
						let levelIndex = -1
						let romanLevel = null

						for (let i = parts.length - 1; i >= 0; i--) {
							if (romanNumerals.includes(parts[i].toLowerCase())) {
								levelIndex = i
								romanLevel = parts[i].toLowerCase()
								break
							}
						}

						// Extract enchantment name (everything except the level)
						const enchantmentParts =
							levelIndex >= 0 ? parts.slice(0, levelIndex) : parts
						const enchantment = enchantmentParts.join('_') // Use underscores for YAML format

						// Convert roman numerals to numbers for display
						const levelMap = {
							i: 1,
							ii: 2,
							iii: 3,
							iv: 4,
							v: 5
						}
						const displayLevel = romanLevel ? levelMap[romanLevel] : 1

						itemString += `, ${enchantment}:${displayLevel}`
					} else {
						// Fallback if name doesn't match expected format
						// Try to extract enchantment name from the enchant ID
						let enchantmentName = enchant
						if (enchant.startsWith('enchanted_book_')) {
							// Extract from material_id format like "enchanted_book_aqua_affinity_1"
							enchantmentName = enchant.replace('enchanted_book_', '')
							// Remove level suffix if present
							enchantmentName = enchantmentName.replace(/_\d+$/, '')
						}
						itemString += `, ${enchantmentName}:${level}`
					}
				} else {
					// Fallback if enchantment item not found
					// Try to extract enchantment name from the enchant ID
					let enchantmentName = enchant
					if (enchant.startsWith('enchanted_book_')) {
						// Extract from material_id format like "enchanted_book_aqua_affinity_1"
						enchantmentName = enchant.replace('enchanted_book_', '')
						// Remove level suffix if present
						enchantmentName = enchantmentName.replace(/_\d+$/, '')
					}
					itemString += `, ${enchantmentName}:${level}`
				}
			})
		}
	}

	// Build display enchantments array
	const displayEnchantments = []

	// Handle enchanted books - extract enchantment from material_id first
	if (item.material_id === 'enchanted_book' || item.material_id.startsWith('enchanted_book_')) {
		// For enchanted books, extract enchantment from material_id if not in enchantments object
		if (
			item.material_id.startsWith('enchanted_book_') &&
			item.material_id !== 'enchanted_book'
		) {
			// Try to extract enchantment with level first (e.g., "enchanted_book_mending_1" -> "mending:1")
			const enchantWithLevelMatch = item.material_id.match(/^enchanted_book_(.+)_(\d+)$/)
			if (enchantWithLevelMatch) {
				const enchantName = enchantWithLevelMatch[1] // Get the enchantment name
				const enchantLevel = parseInt(enchantWithLevelMatch[2]) // Get the level as number
				displayEnchantments.push(`${enchantName}:${enchantLevel}`)
			} else {
				// Try to extract enchantment without level (e.g., "enchanted_book_silk_touch" -> "silk_touch:1")
				const enchantWithoutLevelMatch = item.material_id.match(/^enchanted_book_(.+)$/)
				if (enchantWithoutLevelMatch) {
					const enchantName = enchantWithoutLevelMatch[1] // Get the enchantment name
					displayEnchantments.push(`${enchantName}:1`) // Default to level 1
				}
			}
		}
	}

	// Add enchantments from enchantments object (for both regular items and enchanted books with additional enchantments)
	if (rewardItem.enchantments && Object.keys(rewardItem.enchantments).length > 0) {
		Object.entries(rewardItem.enchantments).forEach(([enchantmentId, level]) => {
			// Look up the enchantment item to get its name (same logic as in itemString generation)
			const enchantItem = allItems.find((item) => item.id === enchantmentId)
			if (enchantItem && enchantItem.name) {
				// Extract enchantment name and level from name like "enchanted book (unbreaking iii)"
				const match = enchantItem.name.match(/^enchanted book \((.+)\)$/)
				if (match) {
					const contentInParentheses = match[1].trim()

					// Split by spaces and process each part
					const parts = contentInParentheses.split(' ')

					// Find the last part that's a roman numeral
					const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v']
					let levelIndex = -1
					let romanLevel = null

					for (let i = parts.length - 1; i >= 0; i--) {
						if (romanNumerals.includes(parts[i].toLowerCase())) {
							levelIndex = i
							romanLevel = parts[i].toLowerCase()
							break
						}
					}

					// Extract enchantment name (everything except the level)
					const enchantmentParts = levelIndex >= 0 ? parts.slice(0, levelIndex) : parts
					const enchantment = enchantmentParts.join('_') // Use underscores for YAML format

					// Convert roman numerals to numbers for display
					const levelMap = {
						i: 1,
						ii: 2,
						iii: 3,
						iv: 4,
						v: 5
					}
					const displayLevel = romanLevel ? levelMap[romanLevel] : level

					displayEnchantments.push(`${enchantment}:${displayLevel}`)
				} else {
					// Fallback if name doesn't match expected format
					displayEnchantments.push(`${enchantmentId}:${level}`)
				}
			} else {
				// Fallback if enchantment item not found
				displayEnchantments.push(`${enchantmentId}:${level}`)
			}
		})
	}

	return {
		prizeId: prizeId.toString(),
		displayName,
		displayItem,
		displayAmount,
		weight,
		itemString,
		customModelData: rewardItem.custom_model_data || -1,
		displayEnchantments
	}
}

/**
 * Generate Crazy Crates YAML configuration
 */
export function generateCrazyCratesYaml(crateReward, rewardItems, allItems, version = '1_20') {
	if (!crateReward || !rewardItems || !allItems) return ''

	const yamlLines = ['Prizes:']

	// Sort reward items by weight (high to low)
	const sortedRewardItems = [...rewardItems].sort((a, b) => (b.weight || 0) - (a.weight || 0))

	sortedRewardItems.forEach((rewardItem, index) => {
		const item = allItems.find((i) => i.id === rewardItem.item_id)
		if (!item) return

		const formattedItem = formatRewardItemForYaml(rewardItem, item, index + 1, allItems)
		if (!formattedItem) return

		yamlLines.push(`    "${formattedItem.prizeId}":`)
		yamlLines.push(`      DisplayName: "${formattedItem.displayName}"`)

		// Add DisplayEnchantments if the item has enchantments
		if (formattedItem.displayEnchantments && formattedItem.displayEnchantments.length > 0) {
			yamlLines.push(`      DisplayEnchantments:`)
			formattedItem.displayEnchantments.forEach((enchantment) => {
				yamlLines.push(`        - "${enchantment}"`)
			})
		}

		yamlLines.push(`      DisplayItem: "${formattedItem.displayItem}"`)
		yamlLines.push(
			`      Settings: { Custom-Model-Data: ${formattedItem.customModelData}, Model: { Namespace: "", Id: "" } }`
		)
		yamlLines.push(`      DisplayAmount: ${formattedItem.displayAmount}`)
		yamlLines.push(`      Weight: ${formattedItem.weight}`)
		yamlLines.push(`      Items:`)
		yamlLines.push(`        - "${formattedItem.itemString}"`)
		yamlLines.push('')
	})

	return yamlLines.join('\n')
}

/**
 * Export crate reward as downloadable YAML file
 */
export function downloadCrateRewardYaml(crateReward, rewardItems, allItems, version = '1_20') {
	const yamlContent = generateCrazyCratesYaml(crateReward, rewardItems, allItems, version)
	const blob = new Blob([yamlContent], { type: 'text/yaml' })
	const url = URL.createObjectURL(blob)

	const link = document.createElement('a')
	link.href = url
	link.download = `${crateReward.name.replace(/[^a-zA-Z0-9]/g, '_')}_crate_rewards.yaml`
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

/**
 * Enchantment Validation
 * Version-aware whitelist of valid Minecraft enchantments
 */

// Enchantment whitelist by version
const enchantmentsByVersion = {
	'1_16': [
		'protection',
		'fire_protection',
		'feather_falling',
		'blast_protection',
		'projectile_protection',
		'respiration',
		'aqua_affinity',
		'thorns',
		'depth_strider',
		'frost_walker',
		'soul_speed',
		'sharpness',
		'smite',
		'bane_of_arthropods',
		'knockback',
		'fire_aspect',
		'looting',
		'sweeping',
		'efficiency',
		'silk_touch',
		'unbreaking',
		'fortune',
		'power',
		'punch',
		'flame',
		'infinity',
		'luck_of_the_sea',
		'lure',
		'loyalty',
		'impaling',
		'riptide',
		'channeling',
		'multishot',
		'piercing',
		'quick_charge',
		'mending',
		'curse_of_binding',
		'curse_of_vanishing'
	],
	'1_19': [
		'protection',
		'fire_protection',
		'feather_falling',
		'blast_protection',
		'projectile_protection',
		'respiration',
		'aqua_affinity',
		'thorns',
		'depth_strider',
		'frost_walker',
		'soul_speed',
		'swift_sneak',
		'sharpness',
		'smite',
		'bane_of_arthropods',
		'knockback',
		'fire_aspect',
		'looting',
		'sweeping',
		'efficiency',
		'silk_touch',
		'unbreaking',
		'fortune',
		'power',
		'punch',
		'flame',
		'infinity',
		'luck_of_the_sea',
		'lure',
		'loyalty',
		'impaling',
		'riptide',
		'channeling',
		'multishot',
		'piercing',
		'quick_charge',
		'mending',
		'curse_of_binding',
		'curse_of_vanishing'
	]
}

/**
 * Get valid enchantments for a Minecraft version
 * @param {string} version - Minecraft version (e.g., '1_20')
 * @returns {Array<string>} Array of valid enchantment names
 */
function getValidEnchantments(version = '1_20') {
	// Map newer versions to 1.19+ list
	const versionKey = ['1_19', '1_20', '1_21'].includes(version) ? '1_19' : '1_16'
	return enchantmentsByVersion[versionKey] || enchantmentsByVersion['1_19']
}

/**
 * Parse full crate YAML content and extract prize data
 * Expects a complete crate configuration, not individual prize snippets
 * Supports: root-level Prizes: or Crate: { Prizes: {} }
 *
 * @param {string} yamlContent - Raw YAML string content of complete crate file
 * @returns {Array} Array of prize objects
 * @throws {Error} If YAML is invalid or Prizes section not found
 */
export function parseCrateRewardsYaml(yamlContent) {
	try {
		// Step 1: Remove comments from YAML content
		const cleanedContent = yamlContent
			.split('\n')
			.map((line) => {
				// Find the first # that's not inside quotes
				let inQuotes = false
				let quoteChar = null

				for (let i = 0; i < line.length; i++) {
					const char = line[i]

					if (!inQuotes && (char === '"' || char === "'")) {
						inQuotes = true
						quoteChar = char
					} else if (inQuotes && char === quoteChar) {
						inQuotes = false
						quoteChar = null
					} else if (!inQuotes && char === '#') {
						// Found a comment outside quotes, remove everything from here
						return line.substring(0, i).trimEnd()
					}
				}

				return line
			})
			.filter((line) => line.trim() !== '') // Remove empty lines
			.join('\n')

		// Step 2: Parse YAML into JavaScript object
		let parsedYaml = null
		try {
			parsedYaml = yaml.load(cleanedContent)
			if (!parsedYaml || typeof parsedYaml !== 'object') {
				throw new Error('YAML file is empty or invalid')
			}
		} catch (yamlError) {
			throw new Error(`Invalid YAML syntax: ${yamlError.message}`)
		}

		// Step 3: Locate Prizes section (support both full crate formats)
		let prizesSection = null
		let format = 'unknown'

		// Format 1: Root-level Prizes: {...}
		if (parsedYaml.Prizes && typeof parsedYaml.Prizes === 'object') {
			prizesSection = parsedYaml.Prizes
			format = 'root-prizes'
			console.log('✅ Detected full crate format: Root-level Prizes')
		}
		// Format 2: Crate: { Prizes: {...} }
		else if (
			parsedYaml.Crate &&
			parsedYaml.Crate.Prizes &&
			typeof parsedYaml.Crate.Prizes === 'object'
		) {
			prizesSection = parsedYaml.Crate.Prizes
			format = 'nested-crate'
			console.log('✅ Detected full crate format: Crate.Prizes')
		}

		if (!prizesSection) {
			throw new Error(
				'Invalid crate file format. Expected a full crate YAML with "Prizes:" section at root level or under "Crate:"'
			)
		}

		// Step 4: Convert prizes object to array format
		const prizes = []
		for (const [prizeId, prizeData] of Object.entries(prizesSection)) {
			if (!prizeData || typeof prizeData !== 'object') {
				console.warn(`Prize ${prizeId} has invalid data, skipping`)
				continue
			}

			prizes.push({
				id: prizeId,
				displayName: prizeData.DisplayName || '',
				displayItem: prizeData.DisplayItem || '',
				displayAmount: prizeData.DisplayAmount || 1,
				weight: prizeData.Weight || 50,
				items: Array.isArray(prizeData.Items) ? prizeData.Items : []
			})
		}

		if (prizes.length === 0) {
			throw new Error('No valid prizes found in crate file')
		}

		console.log(`✅ Successfully parsed ${prizes.length} prizes from ${format} format`)
		return prizes
	} catch (error) {
		console.error('Error parsing crate YAML:', error)
		throw new Error('Failed to parse crate file: ' + error.message)
	}
}

/**
 * Parse item string and extract item data (Enhanced version with validation)
 * Supports: item:material_id, amount:N, enchantment:level, Name:custom, Player:texture, Skull:id
 * @param {string} itemString - The item string to parse (e.g., "Item:diamond_sword, Name:<red>Sword, sharpness:5")
 * @param {Array} allItems - Array of all items from database for matching
 * @param {string} version - Minecraft version for enchantment validation (default: '1_20')
 * @returns {Object|null} Parsed item data or null if parsing fails
 */
export function parseItemString(itemString, allItems = [], version = '1_20') {
	try {
		console.log(`Parsing item string: ${itemString}`)

		const itemData = {
			item_id: null, // Will be looked up in items collection
			materialId: '', // For backward compatibility
			quantity: 1,
			amount: 1, // For backward compatibility
			name: '', // Custom display name
			enchantments: {},
			player_texture: null,
			skull_id: null,
			custom_properties: {}
		}

		// Split by comma and parse each part
		const parts = itemString.split(',').map((part) => part.trim())

		for (const part of parts) {
			if (part.startsWith('Item:') || part.startsWith('item:')) {
				// Extract item type: "Item:diamond_sword" -> "diamond_sword"
				const itemSlug = part.substring(part.indexOf(':') + 1)

				// Look up item in database if available
				if (allItems && allItems.length > 0) {
					const itemMatch = allItems.find((item) => item.material_id === itemSlug)
					itemData.item_id = itemMatch ? itemMatch.id : itemSlug
					itemData.materialId = itemSlug
					itemData.catalog_item = !!itemMatch
					itemData.matched = !!itemMatch
				} else {
					itemData.item_id = itemSlug
					itemData.materialId = itemSlug
				}
			} else if (part.startsWith('Name:')) {
				// Extract custom name: "Name:<red>Diamond Sword" -> "<red>Diamond Sword"
				itemData.name = part.substring(5)
			} else if (part.startsWith('amount:')) {
				// Extract quantity: "amount:5" -> 5
				const qty = parseInt(part.substring(7)) || 1
				itemData.quantity = qty
				itemData.amount = qty // For backward compatibility
			} else if (part.startsWith('Player:')) {
				// Extract player head texture: "Player:1ee3126ff2c343da..." -> "1ee3126ff2c343da..."
				itemData.player_texture = part.substring(7)
			} else if (part.startsWith('Skull:')) {
				// Extract skull database ID: "Skull:7129" -> "7129"
				itemData.skull_id = part.substring(6)
			} else if (part.includes(':')) {
				// Check if this is a valid enchantment using whitelist
				const [name, level] = part.split(':')
				const validEnchantments = getValidEnchantments(version)

				if (name && level && validEnchantments.includes(name.toLowerCase())) {
					// Valid enchantment - parse level
					const enchantLevel = parseInt(level) || 1

					// For enchanted books, store enchantment name directly
					if (itemData.materialId === 'enchanted_book') {
						itemData.enchantments[name] = enchantLevel
						console.log(`✅ Found enchantment for book: ${name}:${enchantLevel}`)
					} else {
						// For other items, find the enchantment document ID by material_id
						const enchantmentMaterialId = `enchanted_book_${name}_${enchantLevel}`
						const enchantmentItem = allItems.find(
							(item) => item.material_id === enchantmentMaterialId
						)

						if (enchantmentItem) {
							itemData.enchantments[enchantmentItem.id] = 1
							console.log(
								`✅ Found enchantment item: ${name}:${enchantLevel} -> ${enchantmentItem.id}`
							)
						} else {
							// Fallback to material_id format if document ID not found
							itemData.enchantments[enchantmentMaterialId] = 1
							console.log(`⚠️ Enchantment not in catalog: ${enchantmentMaterialId}`)
						}
					}
				} else if (name && level) {
					// Not a valid enchantment - store as custom property (skip 'amount' since we have quantity)
					if (name.toLowerCase() !== 'amount') {
						itemData.custom_properties[name] = level
						console.log(`📋 Found custom property: ${name}:${level}`)
					}
				}
			}
		}

		console.log('Parsed item data:', itemData)
		return itemData
	} catch (error) {
		console.error('Error parsing item string:', error)
		return null
	}
}

/**
 * Find matching item in the items collection
 */
export function findMatchingItem(parsedItem, allItems) {
	if (!parsedItem || !allItems) {
		return null
	}

	// First try exact material_id match, but skip for enchanted_book with enchantments
	// (we want to find the specific variant, not the generic enchanted_book)
	const isEnchantedBookWithEnchantments =
		parsedItem.materialId === 'enchanted_book' &&
		Object.keys(parsedItem.enchantments).length > 0

	let item = null

	if (!isEnchantedBookWithEnchantments) {
		item = allItems.find((i) => i.material_id === parsedItem.materialId)
		if (item) {
			return item
		}
	}

	// For enchanted books, try to find the specific enchantment variant
	if (
		parsedItem.materialId === 'enchanted_book' &&
		Object.keys(parsedItem.enchantments).length > 0
	) {
		const enchantment = Object.keys(parsedItem.enchantments)[0]
		const level = parsedItem.enchantments[enchantment]

		// Try different formats for specific enchanted books
		// This works for both local and production - we match by material_id, not document ID
		const possibleIds = [
			`enchanted_book_${enchantment}_${level}`,
			`enchanted_book_${enchantment}`,
			`enchanted_book_${enchantment}_${level.toString().toLowerCase()}`
		]

		for (const id of possibleIds) {
			item = allItems.find((i) => i.material_id === id)
			if (item) {
				// Found the specific enchanted book variant
				// Update the parsedItem to use the found item's material_id for display_item
				parsedItem.materialId = item.material_id
				// Clear enchantments from parsed item since the material_id already contains the enchantment info
				parsedItem.enchantments = {}
				return item
			}
		}
	}

	// Try case-insensitive match
	item = allItems.find((i) => i.material_id.toLowerCase() === parsedItem.materialId.toLowerCase())
	if (item) {
		return item
	}

	// Try name-based matching as last resort
	item = allItems.find((i) => i.name.toLowerCase().includes(parsedItem.materialId.toLowerCase()))
	if (item) {
		return item
	}

	return null
}

/**
 * Import crate rewards from YAML content (Enhanced with warnings and format detection)
 * @param {string} crateId - Target crate ID (or null to create new)
 * @param {string} yamlContent - Raw YAML content
 * @param {Array} allItems - All items from database
 * @param {string} crateName - Name for new crate (if creating)
 * @param {string} userId - User ID (if creating new crate)
 * @returns {Object} Import result with success, counts, errors, and warnings
 */
export async function importCrateRewardsFromYaml(
	crateId,
	yamlContent,
	allItems,
	crateName = null,
	userId = null
) {
	try {
		let targetCrateId = crateId

		// If no crateId provided, create a new crate first
		if (!targetCrateId && crateName && userId) {
			const newCrate = await createCrateReward(userId, {
				name: crateName,
				description: `Imported from YAML file`,
				minecraft_version: '1.20'
			})
			targetCrateId = newCrate.id
		}

		if (!targetCrateId) {
			throw new Error('No crate ID provided and unable to create new crate')
		}

		// Parse full crate YAML (supports root-level Prizes or Crate.Prizes formats)
		const prizes = parseCrateRewardsYaml(yamlContent)
		const importedItems = []
		const errors = []
		const warnings = []

		for (let i = 0; i < prizes.length; i++) {
			const prize = prizes[i]

			// Validate prize has weight
			if (!prize.weight || prize.weight < 1) {
				warnings.push(
					`Prize ${prize.id}: Invalid weight (${prize.weight}), using default value of 50`
				)
				prize.weight = 50
			}

			if (!prize.items || prize.items.length === 0) {
				errors.push(`Prize ${prize.id}: No items found`)
				continue
			}

			// Parse the first item (we'll ignore multiple items for now)
			const itemString = prize.items[0]
			const parsedItem = parseItemString(itemString, allItems)

			if (!parsedItem) {
				errors.push(`Prize ${prize.id}: Failed to parse item string "${itemString}"`)
				continue
			}

			// Find matching item in our database
			const matchingItem = findMatchingItem(parsedItem, allItems)

			if (!matchingItem) {
				errors.push(
					`Prize ${prize.id}: No matching item found for "${parsedItem.materialId}"`
				)
				continue
			}

			// Check for enchantments on items that might need validation
			if (
				parsedItem.enchantments &&
				Object.keys(parsedItem.enchantments).length > 0 &&
				parsedItem.materialId !== 'enchanted_book'
			) {
				warnings.push(
					`Prize ${prize.id}: Item has ${
						Object.keys(parsedItem.enchantments).length
					} enchantment(s)`
				)
			}

			// Create reward item data
			const rewardItemData = {
				item_id: matchingItem.id,
				quantity: parsedItem.amount,
				weight: prize.weight,
				enchantments: parsedItem.enchantments,
				material_id: matchingItem.material_id // Pass material_id directly
			}

			// Add to crate reward
			try {
				const newItem = await addCrateRewardItem(
					targetCrateId,
					rewardItemData,
					matchingItem
				)
				importedItems.push(newItem)
			} catch (error) {
				errors.push(`Prize ${prize.id}: Failed to add item - ${error.message}`)
			}
		}

		return {
			success: true,
			importedCount: importedItems.length,
			totalPrizes: prizes.length,
			errorCount: errors.length,
			warningCount: warnings.length,
			errors: errors,
			warnings: warnings
		}
	} catch (error) {
		console.error('Import process failed:', error)
		return {
			success: false,
			importedCount: 0,
			totalPrizes: 0,
			errorCount: 1,
			warningCount: 0,
			errors: [error.message],
			warnings: []
		}
	}
}
