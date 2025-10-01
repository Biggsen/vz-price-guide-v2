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
		const crateReward = {
			user_id: userId,
			name: crateData.name,
			description: crateData.description || '',
			minecraft_version: crateData.minecraft_version || '1.20',
			created_at: new Date(),
			updated_at: new Date()
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
			updated_at: new Date()
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
export async function addCrateRewardItem(crateId, itemData) {
	try {
		const rewardItem = {
			crate_reward_id: crateId,
			item_id: itemData.item_id,
			quantity: itemData.quantity || 1,
			weight: itemData.weight || 50,
			display_name: itemData.display_name || '',
			display_item: itemData.display_item || itemData.item_id,
			display_amount: itemData.display_amount || itemData.quantity || 1,
			custom_model_data: itemData.custom_model_data || -1,
			enchantments: itemData.enchantments || {},
			created_at: new Date(),
			updated_at: new Date()
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
			updated_at: new Date()
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
export function formatRewardItemForYaml(rewardItem, item, prizeId) {
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

		const formattedItem = formatRewardItemForYaml(rewardItem, item, index + 1)
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
