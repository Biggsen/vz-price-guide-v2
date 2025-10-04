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
	if (hasEnchantments && !itemName.toLowerCase().includes('enchanted')) {
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
						itemString += `, ${enchant}:${level}`
					}
				} else {
					// Fallback if enchantment item not found
					itemString += `, ${enchant}:${level}`
				}
			})
		}
	}

	return {
		prizeId: prizeId.toString(),
		displayName,
		displayItem,
		displayAmount,
		weight,
		itemString,
		customModelData: rewardItem.custom_model_data || -1
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
 * Parse YAML content and extract prize data
 */
export function parseCrateRewardsYaml(yamlContent) {
	try {
		// Simple YAML parser for the specific format we're dealing with
		const lines = yamlContent.split('\n')
		const prizes = {}
		let currentPrize = null
		let currentPrizeId = null
		let inPrizesSection = false

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]
			const trimmed = line.trim()

			// Check if we're entering the Prizes section (indented with 2 spaces under Crate:)
			if (trimmed === 'Prizes:') {
				inPrizesSection = true
				continue
			}

			// If we hit another section at the same level as Prizes, stop parsing prizes
			if (
				inPrizesSection &&
				line &&
				!line.startsWith('  ') &&
				!line.startsWith('\t') &&
				line.includes(':')
			) {
				break
			}

			if (!inPrizesSection) continue

			// Parse prize ID (e.g., "1":) - indented with 4 spaces
			const prizeIdMatch = line.match(/^ {4}"(\d+)":\s*$/)
			if (prizeIdMatch) {
				currentPrizeId = prizeIdMatch[1]
				currentPrize = {
					id: currentPrizeId,
					displayName: '',
					displayItem: '',
					displayAmount: 1,
					weight: 50,
					items: []
				}
				prizes[currentPrizeId] = currentPrize
				continue
			}

			// Parse prize properties - indented with 6 spaces
			if (currentPrize) {
				// Only parse Weight - that's what we actually need
				const weightMatch = line.match(/^ {6}Weight:\s*(\d+)/)
				if (weightMatch) {
					currentPrize.weight = parseInt(weightMatch[1])
					continue
				}

				// Parse item strings (e.g., - "item:torch, amount:64") - indented with 8 spaces
				const itemMatch = line.match(/^ {8}-\s*"(.+)"/)
				if (itemMatch) {
					currentPrize.items.push(itemMatch[1])
					continue
				}
			}
		}

		return Object.values(prizes)
	} catch (error) {
		console.error('Error parsing YAML:', error)
		throw new Error('Failed to parse YAML file: ' + error.message)
	}
}

/**
 * Parse item string and extract item data
 */
export function parseItemString(itemString, allItems = []) {
	try {
		const parts = itemString.split(', ')
		const itemData = {
			materialId: '',
			amount: 1,
			enchantments: {}
		}

		for (const part of parts) {
			if (part.startsWith('item:')) {
				itemData.materialId = part.replace('item:', '')
			} else if (part.startsWith('amount:')) {
				itemData.amount = parseInt(part.replace('amount:', ''))
			} else if (part.includes(':')) {
				// This is likely an enchantment
				const [enchantment, level] = part.split(':')

				// For enchanted books, store the enchantment in original format
				// The findMatchingItem function will handle converting to the full item ID
				if (itemData.materialId === 'enchanted_book') {
					itemData.enchantments[enchantment] = parseInt(level)
				} else {
					// For other items, find the enchantment document ID by material_id
					const enchantmentMaterialId = `enchanted_book_${enchantment}_${level}`
					const enchantmentItem = allItems.find(
						(item) => item.material_id === enchantmentMaterialId
					)

					if (enchantmentItem) {
						itemData.enchantments[enchantmentItem.id] = 1
					} else {
						// Fallback to material_id format if document ID not found
						itemData.enchantments[enchantmentMaterialId] = 1
					}
				}
			}
		}

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
 * Import crate rewards from YAML content
 */
export async function importCrateRewardsFromYaml(crateId, yamlContent, allItems) {
	try {
		const prizes = parseCrateRewardsYaml(yamlContent)
		const importedItems = []
		const errors = []

		for (let i = 0; i < prizes.length; i++) {
			const prize = prizes[i]

			if (!prize.items || prize.items.length === 0) {
				const errorMsg = `Prize ${prize.id}: No items found`
				errors.push(errorMsg)
				continue
			}

			// Parse the first item (we'll ignore multiple items for now)
			const itemString = prize.items[0]
			const parsedItem = parseItemString(itemString, allItems)

			if (!parsedItem) {
				const errorMsg = `Prize ${prize.id}: Failed to parse item string "${itemString}"`
				errors.push(errorMsg)
				continue
			}

			// Find matching item in our database
			const matchingItem = findMatchingItem(parsedItem, allItems)

			if (!matchingItem) {
				const errorMsg = `Prize ${prize.id}: No matching item found for "${parsedItem.materialId}"`
				errors.push(errorMsg)
				continue
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
				const newItem = await addCrateRewardItem(crateId, rewardItemData, matchingItem)
				importedItems.push(newItem)
			} catch (error) {
				const errorMsg = `Prize ${prize.id}: Failed to add item - ${error.message}`
				errors.push(errorMsg)
			}
		}

		return {
			success: true,
			importedCount: importedItems.length,
			errorCount: errors.length,
			errors: errors
		}
	} catch (error) {
		console.error('Import process failed:', error)
		return {
			success: false,
			importedCount: 0,
			errorCount: 0,
			errors: [error.message]
		}
	}
}
