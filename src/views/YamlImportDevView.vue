<script setup>
import { ref, computed, watch } from 'vue'
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, addDoc } from 'firebase/firestore'
import * as yaml from 'js-yaml'
import { isUsingEmulators, isProductionDatabase } from '@/utils/productionSafety'
import { getImageUrl } from '../utils/image.js'
import { ClipboardIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()

// Get all items for matching
const allItemsQuery = collection(db, 'items')
const { data: allItems, pending: itemsPending, error: itemsError } = useCollection(allItemsQuery)

// Debug database connection
watch(
	[allItems, itemsPending, itemsError],
	([items, pending, error]) => {
		console.log('Database connection status:', {
			itemsLoaded: items?.length || 0,
			pending,
			error: error?.message || null
		})
	},
	{ immediate: true }
)

// State
const yamlInput = ref('')
const parseResult = ref(null)
const parseError = ref(null)
const matchedItems = ref([])
const autoParseEnabled = ref(true)
const parseMode = ref('single') // 'single' or 'full'
const currentPrizeIndex = ref(0) // For navigating through prizes in full mode

// Save functionality state
const isSaving = ref(false)
const saveError = ref(null)
const saveSuccess = ref(null)
const targetCrateId = ref('test-crate-1') // Default crate

// Example YAML for quick testing
const exampleFullCrate = `Prizes:
  '1':
    DisplayName: '<white>16x bread'
    DisplayItem: 'bread'
    Weight: 60
    Items:
      - 'item:bread, amount:16'
  '2':
    DisplayName: '<green>64x torch'
    DisplayItem: 'torch'
    Weight: 45
    Items:
      - 'item:torch, amount:64'
  '3':
    DisplayName: '<aqua>1x diamond'
    DisplayItem: 'diamond'
    Weight: 10
    Items:
      - 'item:diamond, amount:1'`

const exampleSinglePrize = `"2":
  DisplayName: "<red>Diamond Sword"
  DisplayEnchantments:
    - "sharpness:5"
    - "looting:3"
  DisplayItem: "diamond_sword"
  Settings:
    Custom-Model-Data: -1
    Model:
      Namespace: ""
      Id: ""
  DisplayAmount: 1
  Weight: 15.0
  Items:
    - "Item:diamond_sword, Name:<red>Diamond Sword, sharpness:5, looting:3"`

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

// Get valid enchantments for a version
function getValidEnchantments(version = '1_20') {
	// Map newer versions to 1.19+ list
	const versionKey = ['1_19', '1_20', '1_21'].includes(version) ? '1_19' : '1_16'
	return enchantmentsByVersion[versionKey] || enchantmentsByVersion['1_19']
}

// Watch for changes in textarea if auto-parse is enabled
watch(yamlInput, () => {
	if (autoParseEnabled.value && yamlInput.value.trim()) {
		parseYaml()
	} else if (!yamlInput.value.trim()) {
		clearResults()
	}
})

// Step 1: Basic YAML parsing (we'll build this step by step)
function parseYaml(resetIndex = true) {
	if (!yamlInput.value.trim()) {
		clearResults()
		return
	}

	parseError.value = null
	parseResult.value = null
	matchedItems.value = []
	if (resetIndex) {
		currentPrizeIndex.value = 0 // Reset prize navigation only when parsing new content
	}

	// Clear save messages when parsing new content
	saveError.value = null
	saveSuccess.value = null

	try {
		// Step 1 - Remove comments from YAML content
		const yamlContent = yamlInput.value.trim()

		// Remove YAML comments (lines starting with #)
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

		// Step 2 - Parse cleaned YAML into JavaScript object
		let parsedYaml = null
		try {
			parsedYaml = yaml.load(cleanedContent)
			if (!parsedYaml || typeof parsedYaml !== 'object') {
				throw new Error('YAML parsed to empty or invalid object')
			}
		} catch (yamlError) {
			throw new Error(`YAML parsing failed: ${yamlError.message}`)
		}

		// Auto-detect mode based on YAML structure
		let detectedMode = 'single'
		let prizeData = null
		let allPrizes = null

		if (parsedYaml) {
			// Check if it has a Prizes section (full crate) - either direct or nested
			let prizesSection = null

			// Check for direct Prizes section
			if (parsedYaml.Prizes) {
				prizesSection = parsedYaml.Prizes
				console.log(`Found direct Prizes section`)
			}
			// Check for nested Prizes section (Crate: { Prizes: {} })
			else if (parsedYaml.Crate && parsedYaml.Crate.Prizes) {
				prizesSection = parsedYaml.Crate.Prizes
				console.log(`Found nested Prizes section under Crate`)
			}

			if (prizesSection) {
				detectedMode = 'full'
				allPrizes = prizesSection
				console.log(
					`Auto-detected: Full crate mode with ${Object.keys(allPrizes).length} prizes`
				)
				// Process the currently selected prize
				const prizeKeys = Object.keys(allPrizes)
				if (prizeKeys.length > 0) {
					const currentKey = prizeKeys[currentPrizeIndex.value] || prizeKeys[0]
					prizeData = allPrizes[currentKey]
					console.log(
						`Processing prize ${currentPrizeIndex.value + 1}/${
							prizeKeys.length
						} from key: ${currentKey}`
					)
				}
			} else {
				// Check if it starts with a numeric key (single prize)
				const prizeKeys = Object.keys(parsedYaml)
				if (prizeKeys.length > 0) {
					const firstKey = prizeKeys[0]
					// Check if the first key is numeric (like "1", "2", etc.)
					if (/^\d+$/.test(firstKey)) {
						detectedMode = 'single'
						prizeData = parsedYaml[firstKey]
						console.log(`Auto-detected: Single prize mode from key: ${firstKey}`)
					} else {
						// Fallback - treat as single prize
						detectedMode = 'single'
						prizeData = parsedYaml[firstKey]
						console.log(
							`Auto-detected: Single prize mode (fallback) from key: ${firstKey}`
						)
					}
				}
			}
		}

		// Update the mode display to show detected mode
		const actualMode = detectedMode

		// Step 3 - Map prize data to DB structure
		let mappedData = null
		if (prizeData) {
			// Map simple fields directly
			mappedData = {
				crate_reward_id: 'test-crate-1', // TODO: Get from context
				items: [], // Will be populated by parsing Items array
				display_name: prizeData.DisplayName || '',
				display_item: prizeData.DisplayItem || '',
				display_amount: prizeData.DisplayAmount || 1,
				weight: prizeData.Weight || 50,
				display_enchantments: {}, // Keep for DisplayEnchantments
				display_lore: prizeData.DisplayLore || [], // Array of lore strings
				firework: prizeData.Firework || false, // Boolean for firework effect
				commands: prizeData.Commands || [], // Array of commands to execute
				messages: prizeData.Messages || [], // Array of messages to send to player
				display_patterns: prizeData.DisplayPatterns || [], // Array of display patterns
				blacklisted_permissions: prizeData['BlackListed-Permissions'] || [], // Array of blacklisted permissions
				custom_model_data: prizeData.Settings?.['Custom-Model-Data'] || -1,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			// Parse DisplayEnchantments array to object
			if (prizeData.DisplayEnchantments && Array.isArray(prizeData.DisplayEnchantments)) {
				mappedData.display_enchantments = {}
				const validEnchantments = getValidEnchantments('1_20') // TODO: Get version from context

				prizeData.DisplayEnchantments.forEach((enchantment) => {
					if (typeof enchantment === 'string' && enchantment.includes(':')) {
						const [name, level] = enchantment.split(':')
						if (validEnchantments.includes(name.toLowerCase())) {
							mappedData.display_enchantments[name] = parseInt(level)
							console.log(`✅ Found display enchantment: ${name}:${level}`)
						} else {
							console.log(
								`⚠️ Invalid enchantment in DisplayEnchantments: ${name}:${level}`
							)
						}
					}
				})
			}

			console.log('Mapped data:', mappedData)
		}

		// Step 4 - Parse Items string and populate items array
		if (prizeData && prizeData.Items && Array.isArray(prizeData.Items)) {
			mappedData.items = []

			prizeData.Items.forEach((itemString, index) => {
				console.log(`Parsing item ${index + 1}: ${itemString}`)

				// Parse the complex item string
				// Format: "Item:diamond_sword, Name:<red>Diamond Sword, sharpness:5, looting:3"
				const itemData = {
					item_id: null, // Will be looked up in items collection
					quantity: 1, // Default quantity
					name: '', // Custom display name
					enchantments: {}
				}

				// Split by comma and parse each part
				const parts = itemString.split(',').map((part) => part.trim())

				parts.forEach((part) => {
					if (part.startsWith('Item:')) {
						// Extract item type: "Item:diamond_sword" -> "diamond_sword"
						itemData.item_id = part.substring(5) // Remove "Item:"
					} else if (part.startsWith('Name:')) {
						// Extract custom name: "Name:<red>Diamond Sword" -> "<red>Diamond Sword"
						itemData.name = part.substring(5) // Remove "Name:"
					} else if (part.startsWith('amount:')) {
						// Extract quantity: "amount:5" -> 5
						itemData.quantity = parseInt(part.substring(7)) || 1
					} else if (part.startsWith('Player:')) {
						// Extract player head texture: "Player:1ee3126ff2c343da..." -> "1ee3126ff2c343da..."
						itemData.player = part.substring(7) // Remove "Player:"
					} else if (part.startsWith('Skull:')) {
						// Extract skull database ID: "Skull:7129" -> "7129"
						itemData.skull_id = part.substring(6) // Remove "Skull:"
					} else if (part.startsWith('Trim-Material:')) {
						// Extract armor trim material: "Trim-Material:quartz" -> "quartz"
						itemData.trim_material = part.substring(14) // Remove "Trim-Material:"
					} else if (part.startsWith('Trim-Pattern:')) {
						// Extract armor trim pattern: "Trim-Pattern:sentry" -> "sentry"
						itemData.trim_pattern = part.substring(13) // Remove "Trim-Pattern:"
					} else if (part.includes(':')) {
						// Check if this is a valid enchantment using whitelist
						const [name, level] = part.split(':')
						const validEnchantments = getValidEnchantments('1_20') // TODO: Get version from context

						if (name && level && validEnchantments.includes(name.toLowerCase())) {
							// Extract enchantments: "sharpness:5" -> {sharpness: 5}
							itemData.enchantments[name] = parseInt(level) || 1
							console.log(`✅ Found enchantment: ${name}:${level}`)
						} else if (name && level) {
							// Store other colon-separated properties as custom data (patterns, etc.)
							// Skip Amount since we already have quantity at the top level
							if (name.toLowerCase() !== 'amount') {
								if (!itemData.custom_properties) {
									itemData.custom_properties = {}
								}
								itemData.custom_properties[name] = level
								console.log(`📋 Found custom property: ${name}:${level}`)
							} else {
								console.log(
									`⏭️ Skipping redundant Amount property (using quantity instead)`
								)
							}
						}
					}
				})

				mappedData.items.push(itemData)
			})

			console.log('Parsed items:', mappedData.items)
		}

		// Step 5 - Match items against database
		if (mappedData && allItems.value) {
			console.log(`Available items in database: ${allItems.value.length}`)
			console.log(
				`First few items:`,
				allItems.value.slice(0, 5).map((item) => ({
					id: item.id,
					material_id: item.material_id,
					name: item.name
				}))
			)

			// Match display_item
			if (mappedData.display_item) {
				console.log(`Matching display_item: ${mappedData.display_item}`)

				const matchingDisplayItem = allItems.value.find(
					(dbItem) => dbItem.material_id === mappedData.display_item
				)

				if (matchingDisplayItem) {
					// Keep original material_id for reference, update with document ID
					mappedData.display_item_material_id = mappedData.display_item
					mappedData.display_item = matchingDisplayItem.id
					mappedData.display_item_matched = true
					console.log(
						`✅ Matched display_item: ${mappedData.display_item_material_id} -> ${matchingDisplayItem.name} (ID: ${matchingDisplayItem.id})`
					)
				} else {
					// Item not in catalog - keep original material_id as the item_id
					mappedData.display_item_material_id = mappedData.display_item
					mappedData.display_item_matched = false
					mappedData.display_item_catalog_item = false
					console.log(
						`⚠️ Display item not in catalog: ${mappedData.display_item} - will be saved as-is`
					)
				}
			}

			// Match items in the items array
			if (mappedData.items) {
				mappedData.items.forEach((item, index) => {
					console.log(`Matching item ${index + 1}: ${item.item_id}`)

					// Find matching item in database by material_id
					const matchingItem = allItems.value.find(
						(dbItem) => dbItem.material_id === item.item_id
					)

					if (matchingItem) {
						// Replace the material_id with the actual database item ID
						item.item_id = matchingItem.id
						item.material_id = matchingItem.material_id // Keep original for reference
						item.matched = true
						item.catalog_item = true
						console.log(
							`✅ Matched: ${item.material_id} -> ${matchingItem.name} (ID: ${matchingItem.id})`
						)
					} else {
						// Item not in catalog - keep original material_id as the item_id
						item.material_id = item.item_id // Keep original for reference
						item.matched = false
						item.catalog_item = false
						console.log(`⚠️ Item not in catalog: ${item.item_id} - will be saved as-is`)
					}
				})

				console.log('Final matched items:', mappedData.items)
			}
		}

		// Step 6 - Generate final DB structure
		let finalDbStructure = null
		if (mappedData) {
			finalDbStructure = {
				// Core fields (crate_reward_id will be generated by Firestore as document ID)
				// Note: items are saved separately in crate_reward_items collection
				display_name: mappedData.display_name || '',
				display_item: mappedData.display_item || '',
				display_amount: mappedData.display_amount || 1,
				weight: mappedData.weight || 50,

				// Display properties
				display_enchantments: mappedData.display_enchantments || {},
				display_lore: mappedData.display_lore || [],
				firework: mappedData.firework || false,
				commands: mappedData.commands || [],
				messages: mappedData.messages || [],
				display_patterns: mappedData.display_patterns || [],
				blacklisted_permissions: mappedData.blacklisted_permissions || [],

				// Metadata
				custom_model_data: mappedData.custom_model_data || -1,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),

				// Import metadata
				import_source: 'yaml_parser',
				import_timestamp: new Date().toISOString(),
				original_yaml_key: getCurrentPrizeKey(allPrizes, currentPrizeIndex.value),

				// Items data (for reference, but saved separately)
				items_preview: mappedData.items || []
			}

			console.log('Generated final DB structure:', finalDbStructure)
		}

		parseResult.value = {
			cleanedContent: cleanedContent,
			parsedYaml: parsedYaml,
			prizeData: prizeData,
			allPrizes: allPrizes,
			mappedData: mappedData,
			finalDbStructure: finalDbStructure,
			parseMode: actualMode,
			detectedMode: actualMode,
			message:
				actualMode === 'single'
					? 'Step 6: Final DB structure generated - Ready to save to Firestore'
					: `Step 6: Final DB structure generated for prize ${
							currentPrizeIndex.value + 1
					  } - Ready to save to Firestore`
		}
	} catch (error) {
		parseError.value = error.message
	}
}

function clearResults() {
	parseResult.value = null
	parseError.value = null
	matchedItems.value = []
}

// Auto-load the example on page load
// yamlInput.value = exampleSinglePrize
// if (autoParseEnabled.value) {
// 	parseYaml()
// }

function clearInput() {
	yamlInput.value = ''
	clearResults()
}

// Prize navigation functions for full crate mode
function nextPrize() {
	if (parseResult.value && parseResult.value.allPrizes) {
		const prizeKeys = Object.keys(parseResult.value.allPrizes)
		if (currentPrizeIndex.value < prizeKeys.length - 1) {
			currentPrizeIndex.value++
			parseYaml(false) // Re-parse without resetting index
		}
	}
}

function previousPrize() {
	if (currentPrizeIndex.value > 0) {
		currentPrizeIndex.value--
		parseYaml(false) // Re-parse without resetting index
	}
}

function goToPrize(index) {
	if (parseResult.value && parseResult.value.allPrizes) {
		const prizeKeys = Object.keys(parseResult.value.allPrizes)
		if (index >= 0 && index < prizeKeys.length) {
			currentPrizeIndex.value = index
			parseYaml(false) // Re-parse without resetting index
		}
	}
}

// Helper function to get the current prize key
function getCurrentPrizeKey(allPrizes, index) {
	if (!allPrizes) return null
	const prizeKeys = Object.keys(allPrizes)
	return prizeKeys[index] || null
}

// Parse individual item string (extracted from main parsing logic)
function parseItemString(itemString) {
	console.log(`Parsing item string: ${itemString}`)

	// Parse the complex item string
	// Format: "Item:diamond_sword, Name:<red>Diamond Sword, sharpness:5, looting:3"
	const itemData = {
		item_id: null, // Will be looked up in items collection
		quantity: 1, // Default quantity
		name: '', // Custom display name
		enchantments: {}
	}

	// Split by comma and parse each part
	const parts = itemString.split(',').map((part) => part.trim())

	parts.forEach((part) => {
		if (part.startsWith('Item:')) {
			// Extract item type: "Item:diamond_sword" -> "diamond_sword"
			const itemSlug = part.substring(5) // Remove "Item:"

			// Look up item in database
			const itemMatch = allItems.value.find((item) => item.material_id === itemSlug)
			itemData.item_id = itemMatch ? itemMatch.id : null // Don't store material_id as item_id
			itemData.catalog_item = !!itemMatch
			itemData.matched = !!itemMatch
		} else if (part.startsWith('Name:')) {
			// Extract custom name: "Name:<red>Diamond Sword" -> "<red>Diamond Sword"
			itemData.name = part.substring(5) // Remove "Name:"
		} else if (part.startsWith('amount:')) {
			// Extract quantity: "amount:5" -> 5
			itemData.quantity = parseInt(part.substring(7)) || 1
		} else if (part.startsWith('Player:')) {
			// Extract player head texture: "Player:1ee3126ff2c343da..." -> "1ee3126ff2c343da..."
			itemData.player = part.substring(7) // Remove "Player:"
		} else if (part.startsWith('Skull:')) {
			// Extract skull database ID: "Skull:7129" -> "7129"
			itemData.skull_id = part.substring(6) // Remove "Skull:"
		} else if (part.startsWith('Trim-Material:')) {
			// Extract armor trim material: "Trim-Material:quartz" -> "quartz"
			itemData.trim_material = part.substring(14) // Remove "Trim-Material:"
		} else if (part.startsWith('Trim-Pattern:')) {
			// Extract armor trim pattern: "Trim-Pattern:sentry" -> "sentry"
			itemData.trim_pattern = part.substring(13) // Remove "Trim-Pattern:"
		} else if (part.includes(':')) {
			// Check if this is a valid enchantment using whitelist
			const [name, level] = part.split(':')
			const validEnchantments = getValidEnchantments('1_20') // TODO: Get version from context

			if (name && level && validEnchantments.includes(name.toLowerCase())) {
				// Extract enchantments: "sharpness:5" -> {sharpness: 5}
				itemData.enchantments[name] = parseInt(level) || 1
				console.log(`✅ Found enchantment: ${name}:${level}`)
			} else if (name && level) {
				// Store other colon-separated properties as custom data (patterns, etc.)
				// Skip Amount since we already have quantity at the top level
				if (name.toLowerCase() !== 'amount') {
					if (!itemData.custom_properties) {
						itemData.custom_properties = {}
					}
					itemData.custom_properties[name] = level
				}
			}
		}
	})

	console.log('Parsed item data:', itemData)
	return itemData
}

// Save crate rewards to Firestore
async function saveCrateRewards() {
	if (!parseResult.value?.finalDbStructure) return

	// Safety check for production database
	if (!isUsingEmulators() && isProductionDatabase()) {
		const confirmed = confirm('⚠️ You are about to save to PRODUCTION database. Continue?')
		if (!confirmed) return
	}

	isSaving.value = true
	saveError.value = null
	saveSuccess.value = null

	try {
		if (parseResult.value.detectedMode === 'single') {
			// For single prize mode, save the entire prize as one document
			const { items_preview, ...rewardDataWithoutItems } = parseResult.value.finalDbStructure
			const prizeData = {
				crate_reward_id: targetCrateId.value,
				...rewardDataWithoutItems,
				items: items_preview || []
			}

			await addDoc(collection(db, 'crate_reward_items'), prizeData)
			saveSuccess.value = `Single prize added to crate: ${targetCrateId.value} (${
				items_preview?.length || 0
			} items)`
		} else {
			// For full crate mode, save each prize as one document
			const allPrizes = parseResult.value.allPrizes
			const prizeKeys = Object.keys(allPrizes)
			let prizesSaved = 0

			for (const prizeKey of prizeKeys) {
				// Re-parse each prize to get full mapped structure including items
				const prizeData = allPrizes[prizeKey]

				// Process the prize data (similar to main parseYaml logic)
				const items = []
				if (prizeData.Items && Array.isArray(prizeData.Items)) {
					for (const itemEntry of prizeData.Items) {
						if (typeof itemEntry === 'string') {
							const parsedItem = parseItemString(itemEntry)
							if (parsedItem) {
								items.push(parsedItem)
							}
						}
					}
				}

				// Extract display item and enchantments
				const displayItemSlug = prizeData.DisplayItem || ''
				const displayItemMatch = allItems.value.find(
					(item) => item.material_id === displayItemSlug
				)

				// Build display_enchantments from prize data
				const displayEnchantments = {}
				if (prizeData.DisplayEnchantments && Array.isArray(prizeData.DisplayEnchantments)) {
					for (const enchString of prizeData.DisplayEnchantments) {
						const enchMatch = enchString.match(/^(.+):(\d+)$/)
						if (enchMatch) {
							const enchId = enchMatch[1]
							const enchLevel = parseInt(enchMatch[2])
							const enchItem = allItems.value.find(
								(item) =>
									item.material_id === `enchanted_book_${enchId}_${enchLevel}`
							)
							if (enchItem) {
								displayEnchantments[enchItem.id] = enchLevel
							}
						}
					}
				}

				// Save the entire prize as one document
				const fullPrizeData = {
					crate_reward_id: targetCrateId.value,
					display_name: prizeData.DisplayName || '',
					display_item: displayItemMatch?.id || displayItemSlug,
					display_amount: prizeData.DisplayAmount || 1,
					weight: prizeData.Weight || 50,
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
					import_source: 'yaml_parser',
					import_timestamp: new Date().toISOString(),
					original_yaml_key: prizeKey,
					items: items
				}

				await addDoc(collection(db, 'crate_reward_items'), fullPrizeData)
				prizesSaved++
			}

			saveSuccess.value = `Added ${prizesSaved} prizes to crate: ${targetCrateId.value}`
			console.log(`Added ${prizesSaved} prizes to crate: ${targetCrateId.value}`)
		}
	} catch (error) {
		console.error('Save error:', error)
		saveError.value = error.message || 'Failed to save rewards'
	} finally {
		isSaving.value = false
	}
}

// Statistics - simplified for step-by-step development
const stats = computed(() => {
	if (!parseResult.value) return null

	return {
		total: 0,
		matched: 0,
		errors: 0,
		step: 'Step 1: Raw content parsing'
	}
})
</script>

<template>
	<div class="max-w-screen-2xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">YAML Import Development</h1>
			<p class="text-gray-600">Paste YAML content below to test parsing in real-time</p>
		</div>

		<!-- Controls -->
		<div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
			<div class="flex items-center gap-4 flex-wrap">
				<label class="flex items-center gap-2">
					<input
						v-model="autoParseEnabled"
						type="checkbox"
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
					<span class="text-sm font-medium text-gray-700">Auto-parse on change</span>
				</label>

				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-gray-700">Detected Mode:</span>
					<span
						:class="[
							'px-2 py-1 rounded text-xs font-medium',
							parseResult?.detectedMode === 'full'
								? 'bg-blue-100 text-blue-800'
								: 'bg-purple-100 text-purple-800'
						]">
						{{ parseResult?.detectedMode === 'full' ? 'Full Crate' : 'Single Prize' }}
					</span>
				</div>

				<button
					v-if="!autoParseEnabled && yamlInput.trim()"
					@click="parseYaml"
					class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
					Parse YAML
				</button>

				<button
					@click="clearInput"
					class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
					Clear
				</button>

				<!-- Stats -->
				<div v-if="stats" class="ml-auto flex items-center gap-4">
					<div class="text-sm">
						<span class="font-medium text-gray-700">Status:</span>
						<span class="text-gray-900 ml-1">{{ stats.step }}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Main Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Input Panel -->
			<div class="bg-white border border-gray-200 rounded-lg p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">YAML Input</h2>

				<textarea
					v-model="yamlInput"
					placeholder="Paste YAML content here..."
					class="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>

				<div class="mt-4 text-xs text-gray-500">
					<p class="font-medium mb-1">Supports:</p>
					<ul class="list-disc ml-5 space-y-1">
						<li>
							Root-level
							<code class="bg-gray-100 px-1 rounded">Prizes:</code>
							section
						</li>
						<li>
							Nested
							<code class="bg-gray-100 px-1 rounded">Crate: { Prizes: {} }</code>
							format
						</li>
						<li class="text-purple-600 font-medium">
							Single prize entry (just paste
							<code class="bg-purple-50 px-1 rounded">"1": { ... }</code>
							)
						</li>
					</ul>
				</div>
			</div>

			<!-- Results Panel -->
			<div class="bg-white border border-gray-200 rounded-lg p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Parse Results</h2>

				<!-- Error Display -->
				<div
					v-if="parseError"
					class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
					<ExclamationTriangleIcon class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div class="flex-1">
						<div class="font-medium text-red-900">Parse Error</div>
						<div class="text-sm text-red-700 mt-1">{{ parseError }}</div>
					</div>
				</div>

				<!-- Success Display -->
				<div
					v-else-if="parseResult"
					class="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
					<CheckCircleIcon class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
					<div class="flex-1">
						<div class="font-medium text-green-900">Step 1: Comments Removed</div>
						<div class="text-sm text-green-700 mt-1">
							{{ parseResult.message }}
						</div>
					</div>
				</div>

				<!-- Empty State -->
				<div
					v-else
					class="flex items-center justify-center h-64 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
					Paste YAML content to see results
				</div>

				<!-- Debug Output -->
				<div v-if="parseResult" class="mt-4 space-y-4">
					<!-- Prize Navigation for Full Crate Mode -->
					<div
						v-if="parseResult.detectedMode === 'full' && parseResult.allPrizes"
						class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<div class="flex items-center justify-between mb-3">
							<h3 class="font-medium text-gray-900">
								Prize {{ currentPrizeIndex + 1 }} of
								{{ Object.keys(parseResult.allPrizes).length }}
							</h3>
							<div class="flex items-center gap-2">
								<button
									@click="previousPrize"
									:disabled="currentPrizeIndex === 0"
									class="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700">
									← Previous
								</button>
								<button
									@click="nextPrize"
									:disabled="
										currentPrizeIndex >=
										Object.keys(parseResult.allPrizes).length - 1
									"
									class="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700">
									Next →
								</button>
							</div>
						</div>

						<!-- Prize Quick Navigation -->
						<div class="flex flex-wrap gap-1 mb-3">
							<button
								v-for="(prize, index) in Object.keys(parseResult.allPrizes)"
								:key="index"
								@click="goToPrize(index)"
								:class="[
									'px-2 py-1 text-xs rounded',
									currentPrizeIndex === index
										? 'bg-blue-600 text-white'
										: 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
								]">
								{{ index + 1 }}
							</button>
						</div>
					</div>
					<div>
						<h3 class="font-medium text-gray-900 mb-2">
							{{
								parseResult.detectedMode === 'single'
									? 'Extracted Prize Data (no wrapper):'
									: `Prize ${currentPrizeIndex + 1} Data (being processed):`
							}}
						</h3>
						<pre
							class="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs overflow-x-auto"
							>{{ JSON.stringify(parseResult.prizeData, null, 2) }}</pre
						>
					</div>
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Mapped DB Structure:</h3>
						<pre
							class="p-3 bg-purple-50 border border-purple-200 rounded text-xs overflow-x-auto"
							>{{ JSON.stringify(parseResult.mappedData, null, 2) }}</pre
						>
					</div>
					<div v-if="parseResult.finalDbStructure">
						<h3 class="font-medium text-gray-900 mb-2">
							Final DB Structure (Ready for Firestore):
						</h3>
						<pre
							class="p-3 bg-green-50 border border-green-200 rounded text-xs overflow-x-auto"
							>{{ JSON.stringify(parseResult.finalDbStructure, null, 2) }}</pre
						>
					</div>
				</div>
			</div>
		</div>

		<!-- Save to Database -->
		<div
			v-if="parseResult?.finalDbStructure"
			class="mt-6 bg-white border border-gray-200 rounded-lg p-6">
			<h3 class="font-medium text-gray-900 mb-4">Save to Database</h3>

			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-700 mb-2">Target Crate ID:</label>
				<input
					v-model="targetCrateId"
					type="text"
					placeholder="test-crate-1"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
			</div>

			<button
				@click="saveCrateRewards"
				:disabled="isSaving"
				class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
				{{ isSaving ? 'Saving...' : 'Save Crate Rewards' }}
			</button>

			<!-- Success Message -->
			<div
				v-if="saveSuccess"
				class="mt-3 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
				{{ saveSuccess }}
			</div>

			<!-- Error Message -->
			<div
				v-if="saveError"
				class="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
				{{ saveError }}
			</div>
		</div>

		<!-- Raw Parse Result -->
		<div v-if="parseResult" class="mt-6 bg-white border border-gray-200 rounded-lg p-6">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Raw Parse Output</h2>
			<pre class="p-4 bg-gray-50 rounded-lg text-xs overflow-x-auto">{{
				JSON.stringify(parseResult, null, 2)
			}}</pre>
		</div>
	</div>
</template>
