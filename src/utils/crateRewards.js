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
 * Add an item to a crate reward (creates NEW structure with items array)
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

		// Convert enchantments object to array format for consistency with YAML imports
		const enchantmentsArray = itemData.enchantments ? Object.keys(itemData.enchantments) : []

		// Create NEW structure with single item in items array
		const rewardDocument = {
			crate_reward_id: crateId,
			weight: itemData.weight || 50,
			display_name: itemData.display_name || '',
			display_item: itemData.display_item || itemData.item_id,
			display_amount: itemData.display_amount || itemData.quantity || 1,
			display_enchantments: enchantmentsArray, // Add missing display_enchantments field
			custom_model_data: itemData.custom_model_data || -1,
			import_source: 'manual',
			items: [
				{
					item_id: itemData.item_id,
					quantity: itemData.quantity || 1,
					enchantments: enchantmentsArray, // Convert object to array format
					catalog_item: true,
					matched: true,
					name: '' // Only populated for imported items with special names
				}
			],
			created_at: now,
			updated_at: now
		}

		const docRef = await addDoc(collection(db, 'crate_reward_items'), rewardDocument)
		return { id: docRef.id, ...rewardDocument }
	} catch (error) {
		console.error('Error adding crate reward item:', error)
		throw error
	}
}

/**
 * Delete a crate reward item by document ID
 */
export async function deleteCrateRewardItem(documentId) {
	try {
		await deleteDoc(doc(db, 'crate_reward_items', documentId))
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
 * Helper function to check if a reward document contains multiple items
 */
export function isMultiItemReward(rewardDocument) {
	return (
		rewardDocument?.items &&
		Array.isArray(rewardDocument.items) &&
		rewardDocument.items.length > 1
	)
}

/**
 * Get all items for a specific crate reward
 * Returns document-based data structure
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

	const { data: rewardDocuments, pending, error } = useCollection(rewardItemsQuery)

	return {
		rewardDocuments, // Raw documents (document-based structure)
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
 * Works with both flattened rewardItems and document-based rewardDocuments
 */
export function calculateCrateRewardTotalValue(rewardData, allItems, version = '1_20') {
	if (!rewardData || !allItems) return 0

	let totalValue = 0

	rewardData.forEach((reward) => {
		// Handle document-based structure (new)
		if (reward.items && Array.isArray(reward.items)) {
			reward.items.forEach((item) => {
				const itemData = allItems.find((i) => i.id === item.item_id)
				if (itemData) {
					totalValue += calculateRewardItemValue(item, itemData, version)
				}
			})
		}
		// Handle flattened structure (legacy)
		else if (reward.item_id) {
			const item = allItems.find((i) => i.id === reward.item_id)
			if (item) {
				totalValue += calculateRewardItemValue(reward, item, version)
			}
		}
	})

	return totalValue
}

/**
 * Convert an item object back to Crazy Crates item string format
 */
function itemObjectToItemString(itemObj, allItems = []) {
	if (!itemObj) return ''

	// Find the item document to get material_id, or use materialId if no match
	const itemDoc = allItems.find((i) => i.id === itemObj.item_id)
	const materialId = itemDoc ? itemDoc.material_id : itemObj.materialId

	if (!materialId) return ''

	let itemString = `item:${materialId}`
	itemString += `, amount:${itemObj.quantity || 1}`

	// Add custom name if present
	if (itemObj.name) {
		itemString += `, Name:${itemObj.name}`
	}

	// Add player texture for player heads
	if (itemObj.player) {
		itemString += `, Player:${itemObj.player}`
	}

	// Add skull ID for player heads
	if (itemObj.skull_id) {
		itemString += `, Skull:${itemObj.skull_id}`
	}

	// Add armor trim material for trimmed armor
	if (itemObj.trim_material) {
		itemString += `, Trim-Material:${itemObj.trim_material}`
	}

	// Add armor trim pattern for trimmed armor
	if (itemObj.trim_pattern) {
		itemString += `, Trim-Pattern:${itemObj.trim_pattern}`
	}

	// Add custom properties
	if (itemObj.custom_properties && Object.keys(itemObj.custom_properties).length > 0) {
		Object.entries(itemObj.custom_properties).forEach(([key, value]) => {
			itemString += `, ${key}:${value}`
		})
	}

	// Add enchantments if present
	if (itemObj.enchantments && itemObj.enchantments.length > 0) {
		// Handle new array format (post-flattening removal)
		if (Array.isArray(itemObj.enchantments)) {
			itemObj.enchantments.forEach((enchantId) => {
				const enchantDoc = allItems.find((i) => i.id === enchantId)
				if (enchantDoc && enchantDoc.name) {
					// Extract enchantment name from "enchanted book (unbreaking iii)"
					const match = enchantDoc.name.match(/^enchanted book \((.+)\)$/)
					if (match) {
						const contentInParentheses = match[1].trim()
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
						const enchantment = enchantmentParts.join('_')

						// Convert roman numerals to numbers
						const levelMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }
						const displayLevel = romanLevel ? levelMap[romanLevel] : 1

						itemString += `, ${enchantment}:${displayLevel}`
					} else {
						// Fallback if name doesn't match expected format
						itemString += `, ${enchantId}:1`
					}
				} else {
					// Fallback if enchantment item not found
					itemString += `, ${enchantId}:1`
				}
			})
		}
		// Handle old object format for backward compatibility
		else if (
			typeof itemObj.enchantments === 'object' &&
			Object.keys(itemObj.enchantments).length > 0
		) {
			Object.entries(itemObj.enchantments).forEach(([enchantId, level]) => {
				const enchantDoc = allItems.find((i) => i.id === enchantId)
				if (enchantDoc && enchantDoc.name) {
					// Extract enchantment name from "enchanted book (unbreaking iii)"
					const match = enchantDoc.name.match(/^enchanted book \((.+)\)$/)
					if (match) {
						const contentInParentheses = match[1].trim()
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
						const enchantment = enchantmentParts.join('_')

						// Convert roman numerals to numbers
						const levelMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }
						const displayLevel = romanLevel ? levelMap[romanLevel] : level

						itemString += `, ${enchantment}:${displayLevel}`
					} else {
						// Fallback if name doesn't match expected format
						itemString += `, ${enchantId}:${level}`
					}
				} else {
					// Fallback if enchantment item not found
					itemString += `, ${enchantId}:${level}`
				}
			})
		}
	}

	return itemString
}

/**
 * Format a single reward document for YAML export
 * Now works with reward documents directly instead of flattened items
 */
export function formatRewardItemForYaml(rewardDoc, prizeId, allItems = []) {
	if (!rewardDoc) return null

	// Use display_name as-is from the reward document
	const displayName = rewardDoc.display_name

	// Convert display_item from document ID to material_id if needed
	let displayItem
	if (rewardDoc.display_item) {
		const displayItemObj = allItems.find((i) => i.id === rewardDoc.display_item)
		displayItem = displayItemObj ? displayItemObj.material_id : rewardDoc.display_item
	} else {
		displayItem = 'tripwire_hook' // Default display item
	}

	const displayAmount = rewardDoc.display_amount || 1
	const weight = rewardDoc.weight || 50

	// Parse display_enchantments if it's a comma-separated string
	let displayEnchantments = []
	if (rewardDoc.display_enchantments) {
		if (Array.isArray(rewardDoc.display_enchantments)) {
			displayEnchantments = rewardDoc.display_enchantments
		} else if (typeof rewardDoc.display_enchantments === 'string') {
			// Handle comma-separated string format
			displayEnchantments = rewardDoc.display_enchantments
				.split(',')
				.map((e) => e.trim())
				.filter((e) => e)
		}
	}

	// Convert items array to item strings
	const itemStrings = (rewardDoc.items || [])
		.map((itemObj) => itemObjectToItemString(itemObj, allItems))
		.filter((str) => str) // Remove empty strings

	return {
		prizeId: prizeId.toString(),
		displayName,
		displayItem,
		displayAmount,
		weight,
		customModelData: rewardDoc.custom_model_data || -1,
		displayEnchantments,
		commands: rewardDoc.commands || [],
		items: itemStrings,
		messages: rewardDoc.messages || [],
		player: rewardDoc.player || null, // NEW: Player field for player heads
		displayTrim: rewardDoc.display_trim || null, // NEW: DisplayTrim field for armor trims
		displayLore: rewardDoc.display_lore || [], // NEW: DisplayLore field
		firework: rewardDoc.firework || false, // NEW: Firework field
		displayPatterns: rewardDoc.display_patterns || [] // NEW: DisplayPatterns field
	}
}

/**
 * Generate Crazy Crates YAML configuration
 */
export function generateCrazyCratesYaml(crateReward, rewardDocuments, allItems, version = '1_20') {
	if (!crateReward || !rewardDocuments || !allItems) return ''

	const yamlLines = ['Prizes:']

	// Sort reward documents by weight (high to low)
	const sortedRewardDocs = [...rewardDocuments].sort((a, b) => (b.weight || 0) - (a.weight || 0))

	sortedRewardDocs.forEach((rewardDoc, index) => {
		// Pass the reward document directly - no need to lookup item
		const formattedItem = formatRewardItemForYaml(rewardDoc, index + 1, allItems)
		if (!formattedItem) return

		yamlLines.push(`    "${formattedItem.prizeId}":`)
		yamlLines.push(`      DisplayName: "${formattedItem.displayName}"`)

		// Add DisplayEnchantments if the item has enchantments
		if (formattedItem.displayEnchantments && formattedItem.displayEnchantments.length > 0) {
			yamlLines.push(`      DisplayEnchantments:`)
			formattedItem.displayEnchantments.forEach((enchantmentId) => {
				// Convert enchantment ID to human-readable format
				const enchantDoc = allItems.find((i) => i.id === enchantmentId)
				if (enchantDoc && enchantDoc.name) {
					// Extract enchantment name from "enchanted book (unbreaking iii)"
					const match = enchantDoc.name.match(/^enchanted book \((.+)\)$/)
					if (match) {
						const contentInParentheses = match[1].trim()
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
						const enchantment = enchantmentParts.join('_')

						// Convert roman numerals to numbers
						const levelMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }
						const displayLevel = romanLevel ? levelMap[romanLevel] : 1

						yamlLines.push(`        - "${enchantment}:${displayLevel}"`)
					} else {
						// Fallback if name doesn't match expected format
						yamlLines.push(`        - "${enchantmentId}"`)
					}
				} else {
					// Fallback if enchantment item not found
					yamlLines.push(`        - "${enchantmentId}"`)
				}
			})
		}

		yamlLines.push(`      DisplayItem: "${formattedItem.displayItem}"`)
		yamlLines.push(
			`      Settings: { Custom-Model-Data: ${formattedItem.customModelData}, Model: { Namespace: "", Id: "" } }`
		)
		yamlLines.push(`      DisplayAmount: ${formattedItem.displayAmount}`)
		yamlLines.push(`      Weight: ${formattedItem.weight}`)

		// Add Player field if present (for player heads)
		if (formattedItem.player) {
			yamlLines.push(`      Player: "${formattedItem.player}"`)
		}

		// Add DisplayTrim field if present (for armor trims)
		if (formattedItem.displayTrim) {
			yamlLines.push(`      DisplayTrim:`)
			yamlLines.push(`        Material: "${formattedItem.displayTrim.material}"`)
			yamlLines.push(`        Pattern: "${formattedItem.displayTrim.pattern}"`)
		}

		// Add DisplayLore field if present
		if (formattedItem.displayLore && formattedItem.displayLore.length > 0) {
			yamlLines.push(`      DisplayLore:`)
			formattedItem.displayLore.forEach((lore) => {
				yamlLines.push(`        - "${lore}"`)
			})
		}

		// Add DisplayPatterns field if present
		if (formattedItem.displayPatterns && formattedItem.displayPatterns.length > 0) {
			yamlLines.push(`      DisplayPatterns:`)
			formattedItem.displayPatterns.forEach((pattern) => {
				yamlLines.push(`        - "${pattern}"`)
			})
		}

		// Add Firework field if present
		if (formattedItem.firework) {
			yamlLines.push(`      Firework: true`)
		}

		// Add Items section (always present, may be empty)
		yamlLines.push(`      Items:`)
		if (formattedItem.items && formattedItem.items.length > 0) {
			// Export items array directly
			formattedItem.items.forEach((itemStr) => {
				yamlLines.push(`        - "${itemStr}"`)
			})
		} else {
			// No items (command-based rewards or empty)
			yamlLines.push(`        []`)
		}

		// Add Commands section if present
		if (formattedItem.commands && formattedItem.commands.length > 0) {
			yamlLines.push(`      Commands:`)
			formattedItem.commands.forEach((command) => {
				yamlLines.push(`        - "${command}"`)
			})
		}

		// Add Messages section if present
		if (formattedItem.messages && formattedItem.messages.length > 0) {
			yamlLines.push(`      Messages:`)
			formattedItem.messages.forEach((message) => {
				yamlLines.push(`        - "${message}"`)
			})
		}

		yamlLines.push('')
	})

	return yamlLines.join('\n')
}

/**
 * Export crate reward as downloadable YAML file
 */
export function downloadCrateRewardYaml(crateReward, rewardDocuments, allItems, version = '1_20') {
	const yamlContent = generateCrazyCratesYaml(crateReward, rewardDocuments, allItems, version)
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
 * Expects Crazy Crates format: Crate: { Prizes: {} }
 *
 * @param {string} yamlContent - Raw YAML string content of complete crate file
 * @returns {Array} Array of prize objects
 * @throws {Error} If YAML is invalid or not in proper Crate format
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

		// Step 3: Validate Crate format and locate Prizes section
		// Only support proper Crazy Crates format: Crate: { Prizes: {} }
		if (!parsedYaml.Crate) {
			throw new Error(
				'Invalid crate file format. Expected Crazy Crates format with "Crate:" at root level. Please upload a complete crate configuration file.'
			)
		}

		if (!parsedYaml.Crate.Prizes || typeof parsedYaml.Crate.Prizes !== 'object') {
			throw new Error(
				'Invalid crate file format. "Prizes:" section not found under "Crate:". Please upload a complete crate configuration file.'
			)
		}

		const prizesSection = parsedYaml.Crate.Prizes
		console.log('✅ Detected valid Crazy Crates format: Crate.Prizes')

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

		console.log(`✅ Successfully parsed ${prizes.length} prizes`)
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
			enchantments: [], // Array of enchantment item IDs (like display_enchantments)
			player: null,
			skull_id: null,
			trim_material: null,
			trim_pattern: null,
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
					itemData.item_id = itemMatch ? itemMatch.id : null // Don't store material_id as item_id
					itemData.materialId = itemSlug
					itemData.catalog_item = !!itemMatch
					itemData.matched = !!itemMatch
				} else {
					itemData.item_id = null // Don't store material_id as item_id
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
				itemData.player = part.substring(7)
			} else if (part.startsWith('Skull:')) {
				// Extract skull database ID: "Skull:7129" -> "7129"
				itemData.skull_id = part.substring(6)
			} else if (part.startsWith('Trim-Material:')) {
				// Extract armor trim material: "Trim-Material:quartz" -> "quartz"
				itemData.trim_material = part.substring(14)
			} else if (part.startsWith('Trim-Pattern:')) {
				// Extract armor trim pattern: "Trim-Pattern:sentry" -> "sentry"
				itemData.trim_pattern = part.substring(13)
			} else if (part.includes(':')) {
				// Check if this is a valid enchantment using whitelist
				const [name, level] = part.split(':')
				const validEnchantments = getValidEnchantments(version)

				if (name && level && validEnchantments.includes(name.toLowerCase())) {
					// Valid enchantment - parse level
					const enchantLevel = parseInt(level) || 1

					// For enchanted books, find the specific enchanted book item
					if (itemData.materialId === 'enchanted_book') {
						const enchantmentMaterialId = `enchanted_book_${name}_${enchantLevel}`
						const enchantmentItem = allItems.find(
							(item) => item.material_id === enchantmentMaterialId
						)

						if (enchantmentItem) {
							// Convert enchantments to array format like display_enchantments
							if (!Array.isArray(itemData.enchantments)) {
								itemData.enchantments = []
							}
							itemData.enchantments.push(enchantmentItem.id)
							console.log(
								`✅ Found enchantment for book: ${name}:${enchantLevel} -> ${enchantmentItem.id}`
							)
						} else {
							// Fallback to material_id format if document ID not found
							if (!Array.isArray(itemData.enchantments)) {
								itemData.enchantments = []
							}
							itemData.enchantments.push(enchantmentMaterialId)
							console.log(`⚠️ Enchantment not in catalog: ${enchantmentMaterialId}`)
						}
					} else {
						// For other items, find the enchantment document ID by material_id
						const enchantmentMaterialId = `enchanted_book_${name}_${enchantLevel}`
						const enchantmentItem = allItems.find(
							(item) => item.material_id === enchantmentMaterialId
						)

						if (enchantmentItem) {
							// Convert enchantments to array format like display_enchantments
							if (!Array.isArray(itemData.enchantments)) {
								itemData.enchantments = []
							}
							itemData.enchantments.push(enchantmentItem.id)
							console.log(
								`✅ Found enchantment item: ${name}:${enchantLevel} -> ${enchantmentItem.id}`
							)
						} else {
							// Fallback to material_id format if document ID not found
							if (!Array.isArray(itemData.enchantments)) {
								itemData.enchantments = []
							}
							itemData.enchantments.push(enchantmentMaterialId)
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
 * Import crate rewards from YAML content using NEW structure (items embedded)
 * Each prize becomes ONE document in crate_reward_items with items array embedded
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

		// Parse YAML to get raw prize data
		const yamlContent_cleaned = yamlContent
			.split('\n')
			.filter((line) => !line.trim().startsWith('#'))
			.join('\n')
		const parsedYaml = yaml.load(yamlContent_cleaned)
		const allPrizes = parsedYaml?.Crate?.Prizes || {}

		if (!allPrizes || Object.keys(allPrizes).length === 0) {
			throw new Error('No prizes found in YAML file')
		}

		const importedPrizes = []
		const errors = []
		const warnings = []

		// Process each prize
		for (const [prizeKey, prizeData] of Object.entries(allPrizes)) {
			try {
				// Validate prize has weight
				const weight = prizeData.Weight || 50
				if (!prizeData.Weight || prizeData.Weight < 1) {
					warnings.push(
						`Prize ${prizeKey}: Invalid weight (${prizeData.Weight}), using default value of 50`
					)
				}

				// Parse all items for this prize
				const items = []
				if (prizeData.Items && Array.isArray(prizeData.Items)) {
					for (const itemString of prizeData.Items) {
						const parsedItem = parseItemString(itemString, allItems)
						if (parsedItem) {
							items.push(parsedItem)
						} else {
							warnings.push(`Prize ${prizeKey}: Failed to parse item "${itemString}"`)
						}
					}
				}

				// Allow prizes without items (e.g., money rewards, command rewards, etc.)
				// if (items.length === 0) {
				// 	errors.push(`Prize ${prizeKey}: No valid items found`)
				// 	continue
				// }

				// Extract Player field from items (for player heads)
				// Check if any item has a player field, and if so, store it at root level
				let playerField = null
				if (items.length > 0) {
					const playerHeadItem = items.find((item) => item.player)
					if (playerHeadItem) {
						playerField = playerHeadItem.player
					}
				}

				// Extract DisplayTrim field from items (for armor with trims)
				// Check if any item has trim_material and trim_pattern, and if so, store at root level
				let displayTrim = null
				if (items.length > 0) {
					const trimItem = items.find((item) => item.trim_material && item.trim_pattern)
					if (trimItem) {
						displayTrim = {
							material: trimItem.trim_material,
							pattern: trimItem.trim_pattern
						}
					}
				}

				// Find display item
				const displayItemSlug = prizeData.DisplayItem || ''
				const displayItemMatch = allItems.find(
					(item) => item.material_id === displayItemSlug
				)

				// Parse display enchantments
				const displayEnchantments = []
				if (prizeData.DisplayEnchantments && Array.isArray(prizeData.DisplayEnchantments)) {
					for (const enchString of prizeData.DisplayEnchantments) {
						const enchMatch = enchString.match(/^(.+):(\d+)$/)
						if (enchMatch) {
							const enchName = enchMatch[1]
							const enchLevel = parseInt(enchMatch[2])

							// Try to find the specific enchanted book item
							const enchItem = allItems.find(
								(item) =>
									item.material_id === `enchanted_book_${enchName}_${enchLevel}`
							)

							if (enchItem) {
								displayEnchantments.push(enchItem.id) // Just store the item ID
							}
							// Note: If specific enchanted book doesn't exist, we skip it
							// The user will need to run addEnchantedBooks.js script first
						}
					}
				}

				// Build complete prize document with NEW structure (embedded items)
				const prizeDocument = {
					crate_reward_id: targetCrateId,
					display_name: prizeData.DisplayName || '',
					display_item: displayItemMatch?.id || displayItemSlug,
					display_amount: prizeData.DisplayAmount || 1,
					weight: weight,
					display_enchantments: displayEnchantments,
					display_lore: prizeData.DisplayLore || [],
					firework: prizeData.Firework || false,
					commands: prizeData.Commands || [],
					messages: prizeData.Messages || [],
					display_patterns: prizeData.DisplayPatterns || [],
					blacklisted_permissions: prizeData['BlackListed-Permissions'] || [],
					custom_model_data: prizeData.Settings?.['Custom-Model-Data'] || -1,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					import_source: 'yaml_import',
					import_timestamp: new Date().toISOString(),
					original_yaml_key: prizeKey,
					items: items, // NEW: Items embedded in document
					player: playerField, // NEW: Player field for player heads
					display_trim: displayTrim // NEW: DisplayTrim field for armor trims
				}

				// Save prize document directly to crate_reward_items collection
				await addDoc(collection(db, 'crate_reward_items'), prizeDocument)
				importedPrizes.push(prizeKey)
			} catch (error) {
				errors.push(`Prize ${prizeKey}: Failed to import - ${error.message}`)
			}
		}

		return {
			success: true,
			importedCount: importedPrizes.length,
			totalPrizes: Object.keys(allPrizes).length,
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
