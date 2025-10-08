<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useCurrentUser, useFirestore, useCollection, useDocument } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { query, collection, orderBy, doc } from 'firebase/firestore'
import {
	useCrateReward,
	useCrateRewardItems,
	updateCrateReward,
	deleteCrateReward,
	addCrateRewardItem,
	updateCrateRewardItem,
	deleteCrateRewardItem,
	calculateCrateRewardTotalValue,
	downloadCrateRewardYaml,
	formatRewardItemForYaml,
	importCrateRewardsFromYaml
} from '../utils/crateRewards.js'
import { getEffectivePrice } from '../utils/pricing.js'
import { getImageUrl } from '../utils/image.js'
import { versions, enabledCategories } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import {
	PlusIcon,
	MinusIcon,
	PencilIcon,
	TrashIcon,
	ArrowDownTrayIcon,
	ArrowUpTrayIcon,
	ArrowLeftIcon,
	ClipboardIcon,
	XMarkIcon,
	CheckIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
	ArrowUpIcon,
	ArrowDownIcon,
	PlayIcon,
	ChevronDoubleLeftIcon
} from '@heroicons/vue/24/outline'
import { XMarkIcon as XMarkIconMini, XCircleIcon } from '@heroicons/vue/20/solid'

const user = useCurrentUser()
const router = useRouter()
const route = useRoute()
const db = useFirestore()
const { canEditItems } = useAdmin()

// Reactive state
const selectedCrateId = ref('')
const showEditForm = ref(false)
const showAddItemForm = ref(false)
const showImportModal = ref(false)
const editingItem = ref(null)
const loading = ref(false)
const error = ref(null)
const showCopyToast = ref(false)

// Debug flag for YAML preview
const showYamlPreview = ref(false)

// Modal-specific error states
const editFormError = ref(null)
const addItemFormError = ref(null)
const importModalError = ref(null)

// Delete confirmation modal state
const showDeleteModal = ref(false)
const itemToDelete = ref(null)

// Clear all confirmation modal state
const showClearAllModal = ref(false)

// Review panel state
const expandedReviewPanels = ref(new Set())

// Form data
const crateForm = ref({
	name: '',
	description: '',
	minecraft_version: '1.20'
})

const itemForm = ref({
	item_id: '',
	quantity: 1,
	weight: 50,
	enchantments: {}
})

// Item search state
const searchQuery = ref('')
const highlightedIndex = ref(-1)
const searchInput = ref(null)
const dropdownContainer = ref(null)

// Weight editing state
const editingWeightId = ref(null)
const editingWeightValue = ref('')
const weightInputRefs = ref({})

// Sorting state
const sortBy = ref('none')
const sortDirection = ref('asc')

// Simulation state
const simulationResults = ref([])
const isSimulating = ref(false)
const showTestRewardsModal = ref(false)

// Enchantment state
const showEnchantmentModal = ref(false)
const enchantmentForm = ref({
	enchantment: ''
})

// Import state
const importFile = ref(null)
const importResult = ref(null)
const isImporting = ref(false)

// Get all items for selection
const allItemsQuery = query(collection(db, 'items'), orderBy('name', 'asc'))
const { data: allItems } = useCollection(allItemsQuery)

// Watch for route changes to load crate reward
watch(
	() => route.params.id,
	(newId) => {
		if (newId) {
			selectedCrateId.value = newId
		}
	},
	{ immediate: true }
)

// Get selected crate reward
const {
	crateReward,
	pending: crateRewardPending,
	error: crateRewardError
} = useCrateReward(selectedCrateId)

// Get items for selected crate reward
const {
	rewardItems,
	pending: rewardItemsPending,
	error: rewardItemsError
} = useCrateRewardItems(selectedCrateId)

// Computed properties
const selectedCrate = computed(() => crateReward.value)
const currentVersion = computed(() => {
	const version = selectedCrate.value?.minecraft_version || '1.20'
	return version.replace('.', '_')
})

// Calculate total value of current crate reward
const totalValue = computed(() => {
	if (!rewardItems.value || !allItems.value) return 0
	return calculateCrateRewardTotalValue(rewardItems.value, allItems.value, currentVersion.value)
})

// Calculate total weight of current crate reward
const totalWeight = computed(() => {
	if (!rewardItems.value) return 0
	return rewardItems.value.reduce((total, item) => total + (item.weight || 0), 0)
})

// Sorted reward items
const sortedRewardItems = computed(() => {
	if (!rewardItems.value || sortBy.value === 'none') return rewardItems.value

	return [...rewardItems.value].sort((a, b) => {
		let aValue, bValue

		switch (sortBy.value) {
			case 'value':
				aValue = getItemValue(a)
				bValue = getItemValue(b)
				break
			case 'weight':
				aValue = a.weight || 0
				bValue = b.weight || 0
				break
			case 'chance':
				aValue = getItemChance(a)
				bValue = getItemChance(b)
				break
			default:
				return 0
		}

		if (sortDirection.value === 'desc') {
			return bValue - aValue
		} else {
			return aValue - bValue
		}
	})
})

// Filter items by version, category, price, and image (same logic as homepage)
const availableItems = computed(() => {
	if (!allItems.value) return []
	const version = selectedCrate.value?.minecraft_version || '1.20'

	return allItems.value.filter((item) => {
		// Item must be available in the selected version
		if (item.version && item.version > version) return false
		if (item.version_removed && item.version_removed <= version) return false

		// Filter out disabled categories (same as homepage)
		if (!enabledCategories.includes(item.category)) return false

		// Filter out items without valid images (for non-admin users)
		if (!user.value?.email && (!item.image || item.image.trim() === '')) return false

		// Filter out 0-price items (unless admin has showZeroPricedItems enabled)
		// For crate rewards, we don't have a showZeroPricedItems toggle, so always filter out 0-price items
		const effectivePrice = getEffectivePrice(item, version.replace('.', '_'))
		if (!effectivePrice || effectivePrice === 0) return false

		return true
	})
})

// Filter items based on search query
const filteredItems = computed(() => {
	if (!availableItems.value) return []

	const query = searchQuery.value.toLowerCase().trim()
	if (!query) return availableItems.value

	return availableItems.value.filter(
		(item) =>
			item.name?.toLowerCase().includes(query) ||
			item.material_id?.toLowerCase().includes(query) ||
			item.category?.toLowerCase().includes(query)
	)
})

// Group items by category for better organization
const itemsByCategory = computed(() => {
	const grouped = {}

	filteredItems.value.forEach((item) => {
		const category = item.category || 'Uncategorized'
		if (!grouped[category]) {
			grouped[category] = []
		}
		grouped[category].push(item)
	})

	return grouped
})

// Flattened items list for keyboard navigation
const flattenedItems = computed(() => {
	const flattened = []
	const grouped = itemsByCategory.value

	// Flatten items in the same order they appear visually (by category)
	Object.keys(grouped).forEach((category) => {
		grouped[category].forEach((item) => {
			flattened.push(item)
		})
	})

	return flattened
})

// Selected item for display
const selectedItem = computed(
	() => availableItems.value.find((item) => item.id === itemForm.value.item_id) || null
)

// Enchantment items for selection
const enchantmentItems = computed(() => {
	if (!allItems.value) return []
	return allItems.value.filter((item) => item.category === 'enchantments')
})

// Validate crate existence and redirect if not found
watch(
	[crateReward, crateRewardPending],
	([crate, pending]) => {
		// Only check after loading is complete
		if (!pending && route.params.id && !crate) {
			// Crate doesn't exist or user doesn't have access, redirect to list
			router.push('/crate-rewards')
		}
	},
	{ immediate: true }
)

// Methods
async function updateCrateRewardData() {
	if (!crateForm.value.name.trim()) {
		editFormError.value = 'Crate reward name is required'
		return
	}

	if (!selectedCrateId.value) {
		editFormError.value = 'No crate selected for update'
		return
	}

	loading.value = true
	editFormError.value = null

	try {
		await updateCrateReward(selectedCrateId.value, crateForm.value)
		showEditForm.value = false
	} catch (err) {
		editFormError.value = 'Failed to update crate reward: ' + err.message
	} finally {
		loading.value = false
	}
}

async function deleteCrateRewardFromDetail() {
	loading.value = true
	error.value = null

	try {
		await deleteCrateReward(selectedCrateId.value)
		router.push('/crate-rewards')
	} catch (err) {
		error.value = 'Failed to delete crate reward: ' + err.message
	} finally {
		loading.value = false
	}
}

function startEditCrate() {
	if (!selectedCrate.value) return
	crateForm.value = {
		name: selectedCrate.value.name,
		description: selectedCrate.value.description || '',
		minecraft_version: selectedCrate.value.minecraft_version
	}
	editFormError.value = null
	showEditForm.value = true
}

function startAddItem() {
	itemForm.value = {
		item_id: '',
		quantity: 1,
		weight: 50,
		enchantments: {}
	}
	addItemFormError.value = null
	editingItem.value = null
	showAddItemForm.value = true
}

function startEditItem(rewardItem) {
	itemForm.value = {
		item_id: rewardItem.item_id,
		quantity: rewardItem.quantity,
		weight: rewardItem.weight,
		enchantments: { ...rewardItem.enchantments } || {}
	}
	addItemFormError.value = null
	editingItem.value = rewardItem
	showAddItemForm.value = true
}

function setQuantityToStack() {
	if (itemForm.value.item_id) {
		const item = getItemById(itemForm.value.item_id)
		if (item) {
			const stackSize = item.stack || 64
			itemForm.value.quantity = stackSize
		} else {
			// Fallback to 64 if item not found
			itemForm.value.quantity = 64
		}
	} else {
		// If no item selected, set to default stack size
		itemForm.value.quantity = 64
	}
}

// Utility functions
function getItemById(itemId) {
	if (!allItems.value) return null
	return allItems.value.find((item) => item.id === itemId) || null
}

function getItemName(itemId) {
	const item = getItemById(itemId)
	return item ? item.name : 'Unknown Item'
}

function getItemValue(rewardItem) {
	const item = getItemById(rewardItem.item_id)
	if (!item) return 0
	const unitPrice = getEffectivePrice(item, currentVersion.value)
	return unitPrice * (rewardItem.quantity || 1)
}

function getItemChance(rewardItem) {
	if (!totalWeight.value || totalWeight.value === 0) return 0
	return ((rewardItem.weight || 0) / totalWeight.value) * 100
}

// Weight editing functions
function startEditWeight(rewardItem) {
	editingWeightId.value = rewardItem.id
	editingWeightValue.value = rewardItem.weight.toString()

	nextTick(() => {
		const input = weightInputRefs.value[rewardItem.id]
		if (input) {
			input.focus()
			input.select()
		}
	})
}

function cancelEditWeight() {
	editingWeightId.value = null
	editingWeightValue.value = ''
}

async function saveWeight(rewardItem) {
	const newWeight = parseInt(editingWeightValue.value)

	// Validate the new weight
	if (isNaN(newWeight) || newWeight < 1) {
		// If value is empty or invalid, just cancel without error message
		cancelEditWeight()
		return
	}

	// Only update if the value changed
	if (newWeight !== rewardItem.weight) {
		try {
			await updateCrateRewardItem(rewardItem.id, { weight: newWeight })
		} catch (err) {
			console.error('Failed to update item weight:', err)
			error.value = 'Failed to update item weight'
		}
	}

	cancelEditWeight()
}

// Handle keydown event for weight input
function handleWeightKeyDown(event, rewardItem) {
	if (event.key === 'Enter') {
		event.preventDefault()
		saveWeight(rewardItem)
	} else if (event.key === 'Escape') {
		event.preventDefault()
		// If value is empty or invalid, just cancel without error message
		cancelEditWeight()
	}
}

async function saveItem() {
	// Clear previous errors
	addItemFormError.value = null

	// Validate required fields
	if (!selectedCrateId.value || !itemForm.value.item_id) {
		addItemFormError.value = 'Please select an item'
		return
	}

	if (!itemForm.value.quantity || itemForm.value.quantity < 1) {
		addItemFormError.value = 'quantity'
		return
	}

	if (!itemForm.value.weight || itemForm.value.weight < 1) {
		addItemFormError.value = 'weight'
		return
	}

	loading.value = true

	try {
		if (editingItem.value) {
			// Update existing item
			await updateCrateRewardItem(editingItem.value.id, itemForm.value)
		} else {
			// Add new item - pass the selected item data to avoid extra queries
			const selectedItem = getItemById(itemForm.value.item_id)
			await addCrateRewardItem(selectedCrateId.value, itemForm.value, selectedItem)
		}

		showAddItemForm.value = false
		editingItem.value = null
		itemForm.value = {
			item_id: '',
			quantity: 1,
			weight: 50,
			enchantments: {}
		}
	} catch (err) {
		addItemFormError.value = 'Failed to save item: ' + err.message
	} finally {
		loading.value = false
	}
}

function confirmRemoveItem(item) {
	itemToDelete.value = {
		type: 'item',
		id: item.id,
		name: getItemById(item.item_id)?.name || 'Unknown Item'
	}
	showDeleteModal.value = true
}

async function executeDelete() {
	if (!itemToDelete.value) return

	loading.value = true
	error.value = null

	try {
		if (itemToDelete.value.type === 'crate') {
			await deleteCrateRewardFromDetail()
		} else if (itemToDelete.value.type === 'item') {
			await deleteCrateRewardItem(itemToDelete.value.id)
		}
	} catch (err) {
		error.value = `Failed to delete ${itemToDelete.value.type}: ` + err.message
	} finally {
		loading.value = false
		showDeleteModal.value = false
		itemToDelete.value = null
	}
}

function showClearAllConfirmation() {
	showClearAllModal.value = true
}

async function clearAllRewards() {
	loading.value = true
	error.value = null

	try {
		// Delete all reward items for the selected crate
		if (rewardItems.value && rewardItems.value.length > 0) {
			const deletePromises = rewardItems.value.map((item) => deleteCrateRewardItem(item.id))
			await Promise.all(deletePromises)
		}
		showClearAllModal.value = false
	} catch (err) {
		error.value = 'Failed to clear rewards: ' + err.message
	} finally {
		loading.value = false
	}
}

function exportYaml() {
	if (!selectedCrate.value || !rewardItems.value || !allItems.value) return
	downloadCrateRewardYaml(
		selectedCrate.value,
		rewardItems.value,
		allItems.value,
		currentVersion.value
	)
}

function copyRewardList() {
	if (!rewardItems.value || !allItems.value) return

	// Get the sorted items (respecting current sort order)
	const sortedItems = [...rewardItems.value].sort((a, b) => {
		const itemA = getItemById(a.item_id)
		const itemB = getItemById(b.item_id)

		if (!itemA || !itemB) return 0

		if (sortBy.value === 'name') {
			return sortDirection.value === 'asc'
				? itemA.name.localeCompare(itemB.name)
				: itemB.name.localeCompare(itemA.name)
		} else if (sortBy.value === 'value') {
			const valueA = getEffectivePrice(itemA, currentVersion.value) * (a.quantity || 1)
			const valueB = getEffectivePrice(itemB, currentVersion.value) * (b.quantity || 1)
			return sortDirection.value === 'asc' ? valueA - valueB : valueB - valueA
		} else if (sortBy.value === 'weight') {
			return sortDirection.value === 'asc'
				? (a.weight || 0) - (b.weight || 0)
				: (b.weight || 0) - (a.weight || 0)
		}
		return 0
	})

	// Generate the text list
	const listText = sortedItems
		.map((item) => {
			const itemData = getItemById(item.item_id)
			if (!itemData) return `${item.item_id} (${item.quantity || 1}) - Value: Unknown`

			const value = getItemValue(item)
			const chance = getItemChance(item).toFixed(1)

			return `${item.quantity}x ${itemData.name} - Value: ${Math.ceil(value)} - Weight: ${
				item.weight
			} - Chance: ${chance}%`
		})
		.join('\n')

	// Copy to clipboard
	navigator.clipboard
		.writeText(listText)
		.then(() => {
			// Show success toast
			showCopyToast.value = true
			setTimeout(() => {
				showCopyToast.value = false
			}, 2000)
		})
		.catch((err) => {
			console.error('Failed to copy:', err)
			error.value = 'Failed to copy to clipboard'
		})
}

function formatDate(dateValue) {
	if (!dateValue) return 'Unknown'

	// Expect ISO string format: "2025-10-04T09:33:49.883Z"
	if (typeof dateValue !== 'string') {
		return 'Invalid Date'
	}

	const date = new Date(dateValue)

	// Check if the date is valid
	if (isNaN(date.getTime())) {
		return 'Invalid Date'
	}

	return date.toLocaleDateString()
}

function formatEnchantmentName(enchantmentId) {
	if (!enchantmentId) return ''

	// Get enchantment item from allItems
	const itemName = getItemById(enchantmentId)?.name || enchantmentId

	// Expected format: "Enchanted Book (Sharpness IV)"
	const match = itemName.match(/Enchanted Book \((.+?)\s*(I|II|III|IV|V|X)?\)/)

	if (match) {
		const enchantment = match[1]
		const level = match[2]

		// Capitalize the first letter of each word in enchantment
		const capitalizedEnchantment = enchantment.replace(/\b\w/g, (l) => l.toUpperCase())

		if (level) {
			// Convert Roman numerals to numbers for consistency
			const levelMap = {
				I: '1',
				II: '2',
				III: '3',
				IV: '4',
				V: '5',
				X: '10'
			}
			const displayLevel = levelMap[level] || level
			return `${capitalizedEnchantment} ${displayLevel}`
		} else {
			// No level found, just return the enchantment name
			return capitalizedEnchantment
		}
	}

	// Try to extract from material_id if name doesn't match expected format
	const materialId = getItemById(enchantmentId)?.material_id || enchantmentId
	if (materialId.startsWith('enchanted_book_')) {
		// Extract enchantment name from material_id like "enchanted_book_aqua_affinity_1"
		const enchantmentPart = materialId.replace('enchanted_book_', '')
		const parts = enchantmentPart.split('_')

		// Remove the last part if it's a number (level)
		if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
			parts.pop()
		}

		// Join and capitalize
		const enchantment = parts.join(' ').replace(/\b\w/g, (l) => l.toUpperCase())
		return enchantment
	}

	// Final fallback - clean up the name
	return itemName
		.replace(/^enchanted book /i, '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (l) => l.toUpperCase())
}

// Item search functions
function selectItem(item) {
	itemForm.value.item_id = item.id
	searchQuery.value = '' // Clear search query when item is selected
	highlightedIndex.value = -1 // Reset highlight
}

function clearSelectedItem() {
	itemForm.value.item_id = ''
	searchQuery.value = ''
	highlightedIndex.value = -1
}

// Enchantment functions
function addEnchantment() {
	showEnchantmentModal.value = true
	enchantmentForm.value = {
		enchantment: ''
	}
}

function removeEnchantment(enchantment) {
	delete itemForm.value.enchantments[enchantment]
}

function saveEnchantment() {
	if (enchantmentForm.value.enchantment) {
		itemForm.value.enchantments[enchantmentForm.value.enchantment] = 1
		showEnchantmentModal.value = false
	}
}

function onEnchantmentSelected() {
	if (enchantmentForm.value.enchantment) {
		// Add the enchantment immediately
		itemForm.value.enchantments[enchantmentForm.value.enchantment] = 1
		// Close the modal
		showEnchantmentModal.value = false
	}
}

function cancelEnchantment() {
	showEnchantmentModal.value = false
	enchantmentForm.value = {
		enchantment: ''
	}
}

// Review panel functions
function toggleReviewPanel(itemId) {
	if (expandedReviewPanels.value.has(itemId)) {
		expandedReviewPanels.value.delete(itemId)
	} else {
		expandedReviewPanels.value.add(itemId)
	}
}

function isReviewPanelExpanded(itemId) {
	return expandedReviewPanels.value.has(itemId)
}

function getFormattedYamlForItem(rewardItem) {
	if (!rewardItem || !allItems.value) return null

	const item = allItems.value.find((i) => i.id === rewardItem.item_id)
	if (!item) return null

	return formatRewardItemForYaml(rewardItem, item, 1, allItems.value)
}

// Item weight adjustment functions (for existing items in the list)
async function increaseItemWeight(rewardItem) {
	const newWeight = Math.min(rewardItem.weight + 10, 1000)
	if (newWeight !== rewardItem.weight) {
		try {
			await updateCrateRewardItem(rewardItem.id, { weight: newWeight })
		} catch (err) {
			console.error('Failed to update item weight:', err)
			error.value = 'Failed to update item weight'
		}
	}
}

async function decreaseItemWeight(rewardItem) {
	const newWeight = Math.max(rewardItem.weight - 10, 1)
	if (newWeight !== rewardItem.weight) {
		try {
			await updateCrateRewardItem(rewardItem.id, { weight: newWeight })
		} catch (err) {
			console.error('Failed to update item weight:', err)
			error.value = 'Failed to update item weight'
		}
	}
}

// Sorting functions
function setSortBy(field) {
	if (sortBy.value === field) {
		// Toggle direction if same field
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	} else {
		// Set new field and default to ascending
		sortBy.value = field
		sortDirection.value = 'asc'
	}
}

// Simulation functions
function simulateCrateOpen() {
	if (!rewardItems.value || rewardItems.value.length === 0) return

	const totalWeight = rewardItems.value.reduce((sum, item) => sum + (item.weight || 0), 0)
	if (totalWeight === 0) return

	// Generate random number between 0 and totalWeight
	const random = Math.random() * totalWeight

	// Find which item was selected
	let currentWeight = 0
	for (const item of rewardItems.value) {
		currentWeight += item.weight || 0
		if (random <= currentWeight) {
			// This item was selected
			const itemData = getItemById(item.item_id)

			simulationResults.value.unshift({
				id: Date.now() + Math.random(),
				item,
				itemData
			})

			// Keep only the last 100 results to avoid memory issues
			if (simulationResults.value.length > 100) {
				simulationResults.value = simulationResults.value.slice(0, 100)
			}

			break
		}
	}
}

function simulateMultipleOpens(count) {
	if (!rewardItems.value || rewardItems.value.length === 0) return

	isSimulating.value = true

	// Simulate multiple opens with a small delay for visual effect
	let completed = 0
	const interval = setInterval(() => {
		simulateCrateOpen()
		completed++

		if (completed >= count) {
			clearInterval(interval)
			isSimulating.value = false
		}
	}, 100) // 100ms delay between each simulation
}

function clearSimulationResults() {
	simulationResults.value = []
}

// Keyboard navigation handlers
function handleKeyDown(event) {
	if (!flattenedItems.value.length) return

	const oldIndex = highlightedIndex.value

	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault()
			if (highlightedIndex.value < 0) {
				highlightedIndex.value = 0
			} else {
				highlightedIndex.value = Math.min(
					highlightedIndex.value + 1,
					flattenedItems.value.length - 1
				)
			}
			break
		case 'ArrowUp':
			event.preventDefault()
			if (highlightedIndex.value < 0) {
				highlightedIndex.value = flattenedItems.value.length - 1
			} else {
				highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
			}
			break
		case 'Enter':
			event.preventDefault()
			if (
				highlightedIndex.value >= 0 &&
				highlightedIndex.value < flattenedItems.value.length
			) {
				selectItem(flattenedItems.value[highlightedIndex.value])
			}
			break
		case 'Escape':
			event.preventDefault()
			searchQuery.value = ''
			highlightedIndex.value = -1
			break
	}

	// Auto-scroll the dropdown if needed
	if (highlightedIndex.value !== oldIndex && dropdownContainer.value) {
		nextTick(() => {
			const container = dropdownContainer.value
			const highlightedElement = container?.querySelector('.bg-norway')
			if (highlightedElement) {
				highlightedElement.scrollIntoView({ block: 'nearest' })
			}
		})
	}
}

function handleSearchInput() {
	highlightedIndex.value = -1
}

// Get visual index of an item in the dropdown (accounting for category grouping)
function getItemVisualIndex(targetCategory, targetCategoryIndex) {
	let visualIndex = 0
	const grouped = itemsByCategory.value

	for (const [category, categoryItems] of Object.entries(grouped)) {
		if (category === targetCategory) {
			return visualIndex + targetCategoryIndex
		}
		visualIndex += categoryItems.length
	}

	return -1
}

// Import functions
function handleFileSelect(event) {
	const file = event.target.files[0]
	if (
		(file && file.type === 'text/yaml') ||
		file.name.endsWith('.yml') ||
		file.name.endsWith('.yaml')
	) {
		importFile.value = file
		importResult.value = null
	} else {
		error.value = 'Please select a valid YAML file (.yml or .yaml)'
	}
}

async function importYamlFile() {
	if (!importFile.value || !selectedCrateId.value) {
		importModalError.value = 'No file selected or crate not found'
		return
	}

	isImporting.value = true
	importModalError.value = null

	try {
		// Read file content
		const fileContent = await readFileContent(importFile.value)

		// Import the crate rewards
		const result = await importCrateRewardsFromYaml(
			selectedCrateId.value,
			fileContent,
			allItems.value
		)

		importResult.value = result

		if (result.success && result.importedCount > 0) {
			// Clear the file input
			importFile.value = null
			const fileInput = document.getElementById('yaml-file-input')
			if (fileInput) fileInput.value = ''
		}
	} catch (err) {
		importModalError.value = 'Failed to import YAML file: ' + err.message
	} finally {
		isImporting.value = false
	}
}

function readFileContent(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = (e) => resolve(e.target.result)
		reader.onerror = (e) => reject(new Error('Failed to read file'))
		reader.readAsText(file)
	})
}

function closeImportModal() {
	showImportModal.value = false
	importFile.value = null
	importResult.value = null
	importModalError.value = null
}

// Initialize form when crate loads
watch(selectedCrate, (crate) => {
	if (crate) {
		crateForm.value = {
			name: crate.name,
			description: crate.description || '',
			minecraft_version: crate.minecraft_version
		}
	}
})
</script>

<template>
	<div class="p-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div>
					<!-- Crate Header -->
					<div v-if="selectedCrate">
						<!-- Back Button -->
						<div class="mb-4">
							<BaseButton
								variant="tertiary"
								@click="router.push('/crate-rewards')"
								class="text-sm">
								<template #left-icon>
									<ArrowLeftIcon class="w-4 h-4" />
								</template>
								Back to Crate Rewards Manager
							</BaseButton>
						</div>

						<div class="flex items-center gap-3">
							<h1 class="text-3xl font-bold text-gray-900">
								{{ selectedCrate.name }}
							</h1>
							<button
								@click="startEditCrate"
								class="text-gray-900 hover:text-gray-600 transition-colors"
								title="Edit crate">
								<PencilIcon class="w-5 h-5" />
							</button>
						</div>
						<p v-if="selectedCrate.description" class="text-gray-600 mt-1 max-w-2xl">
							{{ selectedCrate.description }}
						</p>
						<div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
							<span>
								<span class="font-medium">Version:</span>
								{{ selectedCrate.minecraft_version }}
							</span>
							<span>
								<span class="font-medium">Total Value:</span>
								{{ Math.ceil(totalValue) }}
							</span>
							<span>
								<span class="font-medium">Items:</span>
								{{ rewardItems?.length || 0 }}
							</span>
							<span>
								<span class="font-medium">Created:</span>
								{{ formatDate(selectedCrate.created_at) }}
							</span>
						</div>
						<div class="mt-2 text-sm text-gray-900">
							<span class="font-medium">Total Weight:</span>
							{{ totalWeight }}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- CTA Buttons for Single Crate View -->
		<div v-if="selectedCrate" class="mb-8 flex gap-2">
			<BaseButton @click="showImportModal = true" variant="secondary">
				<template #left-icon>
					<ArrowUpTrayIcon class="w-4 h-4" />
				</template>
				Import YAML
			</BaseButton>
			<BaseButton @click="exportYaml" variant="secondary" :disabled="!rewardItems?.length">
				<template #left-icon>
					<ArrowDownTrayIcon class="w-4 h-4" />
				</template>
				Export YAML
			</BaseButton>
			<BaseButton
				@click="copyRewardList"
				variant="secondary"
				:disabled="!rewardItems?.length">
				<template #left-icon>
					<ClipboardIcon class="w-4 h-4" />
				</template>
				Copy List
			</BaseButton>
			<BaseButton
				@click="showTestRewardsModal = true"
				variant="secondary"
				:disabled="!rewardItems?.length">
				<template #left-icon>
					<PlayIcon class="w-4 h-4" />
				</template>
				Test Rewards
			</BaseButton>
			<BaseButton
				v-if="canEditItems"
				@click="showYamlPreview = !showYamlPreview"
				:variant="showYamlPreview ? 'primary' : 'secondary'"
				class="ml-auto">
				{{ showYamlPreview ? 'Hide' : 'Show' }} YAML Debug
			</BaseButton>
		</div>

		<!-- Error Display -->
		<div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
			<div class="flex items-center">
				<ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
				<span class="text-red-800">{{ error }}</span>
			</div>
		</div>

		<!-- Sorting Controls -->
		<div
			v-if="selectedCrate && rewardItems && rewardItems.length > 0"
			class="flex items-center justify-between gap-4 mb-4">
			<BaseButton @click="startAddItem" variant="primary">
				<template #left-icon>
					<PlusIcon class="w-4 h-4" />
				</template>
				Add Item
			</BaseButton>
			<div class="flex items-center gap-4">
				<span class="text-sm font-medium text-heavy-metal">Sort by:</span>
				<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
					<button
						@click="setSortBy('value')"
						:class="[
							sortBy === 'value'
								? 'bg-gray-asparagus text-white pl-3 pr-2 hover:bg-highland'
								: 'bg-norway text-heavy-metal hover:bg-gray-100 px-4',
							'py-1 text-sm font-medium transition border-r-2 border-gray-asparagus last:border-r-0'
						]">
						Value
						<ArrowUpIcon
							v-if="sortBy === 'value' && sortDirection === 'asc'"
							class="w-3 h-3 inline align-middle -mt-0.5" />
						<ArrowDownIcon
							v-if="sortBy === 'value' && sortDirection === 'desc'"
							class="w-3 h-3 inline align-middle -mt-0.5" />
					</button>
					<button
						@click="setSortBy('weight')"
						:class="[
							sortBy === 'weight'
								? 'bg-gray-asparagus text-white pl-3 pr-2 hover:bg-highland'
								: 'bg-norway text-heavy-metal hover:bg-gray-100 px-4',
							'py-1 text-sm font-medium transition border-r-2 border-gray-asparagus last:border-r-0'
						]">
						Weight
						<ArrowUpIcon
							v-if="sortBy === 'weight' && sortDirection === 'asc'"
							class="w-3 h-3 inline align-middle -mt-0.5" />
						<ArrowDownIcon
							v-if="sortBy === 'weight' && sortDirection === 'desc'"
							class="w-3 h-3 inline align-middle -mt-0.5" />
					</button>
					<button
						@click="setSortBy('chance')"
						:class="[
							sortBy === 'chance'
								? 'bg-gray-asparagus text-white pl-3 pr-2 hover:bg-highland'
								: 'bg-norway text-heavy-metal hover:bg-gray-100 px-4',
							'py-1 text-sm font-medium transition border-r-2 border-gray-asparagus last:border-r-0'
						]">
						Chance
						<ArrowUpIcon
							v-if="sortBy === 'chance' && sortDirection === 'asc'"
							class="w-3 h-3 inline align-middle -mt-0.5" />
						<ArrowDownIcon
							v-if="sortBy === 'chance' && sortDirection === 'desc'"
							class="w-3 h-3 inline align-middle -mt-0.5" />
					</button>
					<button
						@click="setSortBy('none')"
						:class="[
							sortBy === 'none'
								? 'bg-gray-asparagus text-white'
								: 'bg-norway text-heavy-metal hover:bg-gray-100',
							'px-3 py-1 text-sm font-medium transition'
						]">
						None
					</button>
				</div>
			</div>
		</div>

		<!-- Selected Crate Reward -->
		<div v-if="selectedCrate" class="space-y-6">
			<!-- Reward Items -->
			<div v-if="rewardItems?.length" class="bg-white rounded-lg">
				<div class="px-6 py-4 bg-gray-asparagus border-b-2 border-white">
					<h3 class="text-xl font-semibold text-white">Reward Items</h3>
				</div>

				<div v-if="rewardItemsPending" class="p-6 text-gray-600">
					Loading reward items...
				</div>
				<div v-else>
					<div class="divide-y-2 divide-white">
						<div
							v-for="rewardItem in sortedRewardItems"
							:key="rewardItem.id"
							class="pr-6 bg-norway">
							<div class="flex items-stretch justify-between">
								<div class="flex-1">
									<div class="flex items-stretch gap-4">
										<div
											class="w-16 bg-highland border-r-2 border-white flex items-center justify-center">
											<img
												v-if="getItemById(rewardItem.item_id)?.image"
												:src="
													getImageUrl(
														getItemById(rewardItem.item_id).image
													)
												"
												:alt="getItemById(rewardItem.item_id)?.name"
												loading="lazy"
												decoding="async"
												fetchpriority="low"
												class="max-w-10 max-h-10" />
											<span v-else class="text-gray-400 text-xs">?</span>
										</div>
										<div class="flex-1 flex items-center justify-between">
											<div class="pt-2 pb-3">
												<h4 class="text-base font-semibold text-gray-900">
													{{
														`${rewardItem.quantity}x ${
															Object.keys(
																rewardItem.enchantments || {}
															).length > 0
																? `enchanted ${
																		getItemById(
																			rewardItem.item_id
																		)?.name || 'Unknown Item'
																  }`
																: getItemById(rewardItem.item_id)
																		?.name || 'Unknown Item'
														}`
													}}
												</h4>
												<div class="text-sm text-heavy-metal">
													<span class="font-medium">Value:</span>
													{{ Math.ceil(getItemValue(rewardItem)) }}
												</div>
												<!-- Enchantments Display -->
												<div
													v-if="
														rewardItem.enchantments &&
														Object.keys(rewardItem.enchantments)
															.length > 0
													"
													class="mt-1">
													<div class="flex flex-wrap gap-1">
														<span
															v-for="enchantmentId in Object.keys(
																rewardItem.enchantments
															)"
															:key="enchantmentId"
															class="px-2 py-1 border border-gray-asparagus text-heavy-metal text-[10px] font-medium rounded uppercase">
															{{
																formatEnchantmentName(enchantmentId)
															}}
														</span>
													</div>
												</div>

												<!-- YAML Preview (Debug) -->
												<div v-if="showYamlPreview" class="mt-2">
													<button
														@click="toggleReviewPanel(rewardItem.id)"
														class="flex items-center gap-2 text-sm text-heavy-metal hover:text-gray-800 transition-colors">
														<svg
															:class="[
																'w-4 h-4 transition-transform',
																isReviewPanelExpanded(rewardItem.id)
																	? 'rotate-90'
																	: ''
															]"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24">
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M9 5l7 7-7 7" />
														</svg>
														{{
															isReviewPanelExpanded(rewardItem.id)
																? 'Hide'
																: 'Show'
														}}
														YAML Preview
													</button>

													<pre
														v-if="isReviewPanelExpanded(rewardItem.id)"
														class="mt-3 text-xs bg-white p-3 rounded border overflow-x-auto"><code>{{ getFormattedYamlForItem(rewardItem) ? `    "1":
      DisplayName: "${getFormattedYamlForItem(rewardItem).displayName}"
      DisplayItem: "${getFormattedYamlForItem(rewardItem).displayItem}"
      Settings: { Custom-Model-Data: ${getFormattedYamlForItem(rewardItem).customModelData}, Model: { Namespace: "", Id: "" } }
      DisplayAmount: ${getFormattedYamlForItem(rewardItem).displayAmount}
      Weight: ${getFormattedYamlForItem(rewardItem).weight}
      Items:
        - "${getFormattedYamlForItem(rewardItem).itemString}"` : 'Loading...' }}</code></pre>
												</div>
											</div>
											<!-- Weight and Chance Boxes -->
											<div class="flex gap-2">
												<div
													class="bg-blue-50 border-2 border-gray-asparagus rounded flex items-stretch">
													<button
														@click="decreaseItemWeight(rewardItem)"
														class="flex items-center justify-center px-1 py-1 bg-sea-mist hover:bg-saltpan transition-colors rounded-l border-r-2 border-gray-asparagus min-w-[2rem]"
														title="Decrease weight by 10">
														<MinusIcon
															class="w-4 h-4 text-heavy-metal" />
													</button>
													<div
														v-if="editingWeightId !== rewardItem.id"
														@click="startEditWeight(rewardItem)"
														class="flex items-center justify-center px-1 py-1 text-center cursor-pointer bg-norway hover:bg-saltpan transition-colors min-w-[2.5rem] border-r-2 border-gray-asparagus">
														<span
															class="text-base font-bold text-heavy-metal">
															{{ rewardItem.weight }}
														</span>
													</div>
													<input
														v-else
														:ref="
															(el) =>
																(weightInputRefs[rewardItem.id] =
																	el)
														"
														v-model="editingWeightValue"
														type="number"
														min="1"
														@blur="saveWeight(rewardItem)"
														@keyup.enter="saveWeight(rewardItem)"
														@keydown.escape="cancelEditWeight"
														class="px-1 py-1 text-center text-base font-semibold text-heavy-metal focus:outline-none focus:ring-2 focus:ring-blue-500 w-10 border-r-2 border-gray-asparagus bg-norway [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
														autofocus />
													<button
														@click="increaseItemWeight(rewardItem)"
														class="flex items-center justify-center px-1 py-1 bg-sea-mist hover:bg-saltpan transition-colors rounded-r min-w-[2rem]"
														title="Increase weight by 10">
														<PlusIcon
															class="w-4 h-4 text-heavy-metal" />
													</button>
												</div>
												<div
													class="bg-transparent px-2 py-1 inline-block min-w-[60px] text-center">
													<span
														class="text-base font-semibold text-heavy-metal">
														{{ getItemChance(rewardItem).toFixed(1) }}%
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div class="flex items-center gap-2 ml-8">
									<button
										@click="startEditItem(rewardItem)"
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
										title="Edit item">
										<PencilIcon class="w-4 h-4" />
									</button>
									<button
										@click="confirmRemoveItem(rewardItem)"
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
										title="Delete item">
										<TrashIcon class="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Empty State Message -->
		<div
			v-if="selectedCrate && !rewardItemsPending && !rewardItems?.length"
			class="bg-white rounded-lg pt-6 pr-6 pb-6">
			<div class="text-gray-600">
				<p class="text-lg font-medium mb-2">No items added yet</p>
				<p class="text-sm">Click "Add Item" to get started with your crate rewards.</p>
			</div>
		</div>

		<!-- Add Item Button -->
		<div v-if="selectedCrate" class="mt-4 flex justify-start">
			<BaseButton @click="startAddItem" variant="primary">
				<template #left-icon>
					<PlusIcon class="w-5 h-5" />
				</template>
				Add Item
			</BaseButton>
		</div>

		<!-- Clear All Rewards Link -->
		<div v-if="selectedCrate && rewardItems?.length" class="mt-4 flex justify-start">
			<button
				@click="showClearAllConfirmation"
				:disabled="loading"
				class="inline-flex items-center text-sm text-gray-600 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
				<TrashIcon class="w-4 h-4 mr-1" />
				Clear all items
			</button>
		</div>

		<!-- Edit Crate Reward Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showEditForm"
			title="Edit Crate Reward"
			maxWidth="max-w-md"
			@close="showEditForm = false; editFormError = null">
			<!-- Error Display -->
			<div v-if="editFormError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
				<div class="flex items-center">
					<ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
					<span class="text-red-800">{{ editFormError }}</span>
				</div>
			</div>

			<form @submit.prevent="updateCrateRewardData" class="space-y-4">
				<div>
					<label
						for="edit-crate-name"
						class="block text-sm font-medium text-gray-700 mb-1">
						Name *
					</label>
					<input
						id="edit-crate-name"
						v-model="crateForm.name"
						type="text"
						required
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans" />
				</div>

				<div>
					<label
						for="edit-crate-description"
						class="block text-sm font-medium text-gray-700 mb-1">
						Description
					</label>
					<textarea
						id="edit-crate-description"
						v-model="crateForm.description"
						rows="3"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
				</div>

				<div>
					<label
						for="edit-crate-version"
						class="block text-sm font-medium text-gray-700 mb-1">
						Minecraft Version
					</label>
					<select
						id="edit-crate-version"
						v-model="crateForm.minecraft_version"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans">
						<option v-for="version in versions" :key="version" :value="version">
							{{ version }}
						</option>
					</select>
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<!-- prettier-ignore -->
						<button
							type="button"
							@click="showEditForm = false; editFormError = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="updateCrateRewardData"
							:disabled="loading"
							variant="primary">
							{{ loading ? 'Updating...' : 'Update' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Add/Edit Item Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showAddItemForm"
			:title="editingItem ? 'Edit Item' : 'Add Item to Crate Reward'"
			maxWidth="max-w-2xl"
			@close="showAddItemForm = false; editingItem = null; addItemFormError = null">

			<form @submit.prevent="saveItem" class="space-y-4">
				<!-- Item selection -->
				<div v-if="!editingItem">
					<!-- Show search input when no item is selected -->
					<div v-if="!selectedItem">
						<label
							for="item-search"
							class="block text-sm font-medium text-gray-700 mb-1">
							Search and Select Item *
						</label>
						<input
							id="item-search"
							ref="searchInput"
							v-model="searchQuery"
							@input="handleSearchInput"
							@keydown="handleKeyDown"
							type="text"
							placeholder="Search items by name, material ID, or category..."
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans" />

						<!-- Error message for item selection -->
						<div
							v-if="addItemFormError && addItemFormError === 'Please select an item'"
							class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
							<XCircleIcon class="w-4 h-4" />
							{{ addItemFormError }}
						</div>

						<!-- Item selection dropdown -->
						<div
							v-if="searchQuery && filteredItems.length > 0"
							ref="dropdownContainer"
							class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white">
							<template
								v-for="(categoryItems, category) in itemsByCategory"
								:key="category">
								<div
									class="px-3 py-2 bg-gray-100 text-sm font-medium text-gray-700 border-b">
									{{ category }}
								</div>
								<div
									v-for="(item, categoryIndex) in categoryItems"
									:key="item.id"
									@click="selectItem(item)"
									@mouseenter="
										highlightedIndex = getItemVisualIndex(category, categoryIndex)
									"
									:class="[
										'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center justify-between',
										getItemVisualIndex(category, categoryIndex) ===
										highlightedIndex
											? 'bg-norway text-blue-900'
											: 'hover:bg-blue-50'
									]">
									<div>
										<div class="font-medium text-heavy-metal">{{ item.name }}</div>
										<div class="text-sm text-gray-asparagus">
											{{ item.material_id }}
										</div>
									</div>
									<div v-if="item.image" class="w-8 h-8 flex items-center justify-center">
										<img
											:src="getImageUrl(item.image)"
											:alt="item.name"
											loading="lazy"
											decoding="async"
											fetchpriority="low"
											class="max-w-full max-h-full object-contain" />
									</div>
								</div>
							</template>
						</div>
					</div>

					<!-- Show selected item when item is selected -->
					<div v-else>
						<label class="block text-sm font-medium text-gray-700 mb-1">Item *</label>
						<div
							class="px-3 py-2 bg-norway border-2 border-highland rounded flex items-center justify-between">
							<div>
								<div class="font-medium text-heavy-metal">
									{{ selectedItem.name }}
								</div>
								<div class="text-sm text-gray-asparagus">
									{{ selectedItem.material_id }}
								</div>
							</div>
							<div v-if="selectedItem.image" class="w-8 h-8 flex items-center justify-center">
								<img
									:src="getImageUrl(selectedItem.image)"
									:alt="selectedItem.name"
									loading="lazy"
									decoding="async"
									fetchpriority="low"
									class="max-w-full max-h-full object-contain" />
							</div>
						</div>
						<button
							type="button"
							@click="clearSelectedItem"
							class="mt-2 text-sm text-heavy-metal hover:text-gray-asparagus underline">
							Select different item
						</button>
					</div>
				</div>

				<!-- Show selected item when editing -->
				<div
					v-else-if="editingItem && getItemById(editingItem.item_id)"
					class="p-3 bg-gray-100 border border-gray-300 rounded">
					<div class="flex items-center justify-between">
						<div>
							<div class="font-medium">
								{{ getItemById(editingItem.item_id).name }}
							</div>
							<div class="text-sm text-gray-600">
								{{ getItemById(editingItem.item_id).material_id }}
							</div>
						</div>
						<div v-if="getItemById(editingItem.item_id).image" class="w-8 h-8 flex items-center justify-center">
							<img
								:src="getImageUrl(getItemById(editingItem.item_id).image)"
								:alt="getItemById(editingItem.item_id).name"
								loading="lazy"
								decoding="async"
								fetchpriority="low"
								class="max-w-full max-h-full object-contain" />
						</div>
					</div>
				</div>

				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Quantity *
						</label>
						<div class="flex gap-2">
							<input
								id="item-quantity"
								v-model.number="itemForm.quantity"
								type="number"
								min="1"
								required
								:class="[
									'w-20 rounded border-2 px-3 py-1 text-gray-900 focus:ring-2 font-sans',
									addItemFormError && addItemFormError.includes('quantity') 
										? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
										: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
								]" />
							<BaseButton
								type="button"
								@click="setQuantityToStack"
								variant="tertiary"
								class="text-sm whitespace-nowrap">
								<template #left-icon>
									<ChevronDoubleLeftIcon class="w-4 h-4" />
								</template>
								Apply stack size
							</BaseButton>
						</div>
						<div
							v-if="addItemFormError && addItemFormError.includes('quantity')"
							class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
							<XCircleIcon class="w-4 h-4" />
							Quantity must be at least 1
						</div>
					</div>
					<div>
						<label
							for="item-weight"
							class="block text-sm font-medium text-gray-700 mb-1">
							Weight *
						</label>
						<input
							id="item-weight"
							v-model.number="itemForm.weight"
							type="number"
							min="1"
							required
							:class="[
								'block w-20 rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
								addItemFormError && addItemFormError.includes('weight') 
									? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
									: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
							]" />
						<div
							v-if="addItemFormError && addItemFormError.includes('weight')"
							class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
							<XCircleIcon class="w-4 h-4" />
							Weight must be at least 1
						</div>
					</div>
				</div>

				<!-- Enchantments Section -->
				<div class="mt-4">
					<div class="flex items-center justify-between mb-2">
						<label class="text-sm font-medium text-gray-700">Enchantments</label>
						<BaseButton
							type="button"
							@click="addEnchantment"
							variant="secondary"
							class="text-sm">
							+ Add Enchantment
						</BaseButton>
					</div>
					<div v-if="Object.keys(itemForm.enchantments).length > 0" class="flex flex-wrap gap-2">
						<div
							v-for="(level, enchantment, index) in itemForm.enchantments"
							:key="index"
							class="flex items-center gap-2 pl-3 pr-2 py-1 bg-sea-mist text-heavy-metal rounded-md text-sm font-medium">
							<span>{{ formatEnchantmentName(enchantment) }}</span>
							<button
								type="button"
								@click="removeEnchantment(enchantment)"
								class="text-heavy-metal hover:text-red-700">
								<XMarkIconMini class="w-4 h-4" />
							</button>
						</div>
					</div>
					<div v-else class="text-sm text-gray-500 italic">No enchantments added</div>
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<!-- prettier-ignore -->
						<button
							type="button"
							@click="showAddItemForm = false; editingItem = null; addItemFormError = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton @click="saveItem" :disabled="loading" variant="primary">
							{{ loading ? 'Saving...' : editingItem ? 'Update' : 'Add' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Enchantment Selection Modal -->
		<BaseModal
			:isOpen="showEnchantmentModal"
			title="Add Enchantment"
			maxWidth="max-w-md"
			@close="cancelEnchantment">
			<form @submit.prevent="saveEnchantment" class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Enchantment</label>
					<select
						v-model="enchantmentForm.enchantment"
						@change="onEnchantmentSelected"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans">
						<option value="">Select an enchantment...</option>
						<option
							v-for="enchantment in enchantmentItems"
							:key="enchantment.id"
							:value="enchantment.id">
							{{ formatEnchantmentName(enchantment.id) }}
						</option>
					</select>
				</div>
			</form>
		</BaseModal>

		<!-- Import YAML Modal -->
		<BaseModal
			:isOpen="showImportModal"
			title="Import Crate Rewards"
			maxWidth="max-w-md"
			@close="closeImportModal">
			<!-- Error Display -->
			<div
				v-if="importModalError"
				class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
				<div class="flex items-center">
					<ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
					<span class="text-red-800">{{ importModalError }}</span>
				</div>
			</div>

			<div class="space-y-4">
				<div>
					<label
						for="yaml-file-input"
						class="block text-sm font-medium text-gray-700 mb-1">
						Select YAML File
					</label>
					<input
						id="yaml-file-input"
						type="file"
						accept=".yml,.yaml"
						@change="handleFileSelect"
						class="block w-full pr-3 py-1 mt-2 mb-2 text-gray-900 font-sans" />
					<p class="text-xs text-gray-500 mt-1">
						Select a Crazy Crates YAML file containing prize definitions
					</p>
				</div>

				<!-- Import Results -->
				<div v-if="importResult" class="space-y-2">
					<div
						v-if="importResult.success"
						class="p-3 bg-semantic-success-light border-l-4 border-l-semantic-success">
						<div class="flex items-start">
							<CheckCircleIcon class="w-6 h-6 text-heavy-metal mr-2" />
							<div>
								<div class="text-heavy-metal font-medium">
									Import completed successfully!
								</div>
								<div class="text-heavy-metal text-sm">
									{{ importResult.importedCount }} items imported
									<span v-if="importResult.errorCount > 0">
										, {{ importResult.errorCount }} errors
									</span>
								</div>
							</div>
						</div>
					</div>

					<div
						v-if="importResult.errors && importResult.errors.length > 0"
						class="p-3 bg-red-50 border border-red-200 rounded-lg">
						<div class="text-red-800 font-medium mb-2">Import Errors:</div>
						<div class="text-red-700 text-sm space-y-1">
							<div v-for="error in importResult.errors" :key="error">
								{{ error }}
							</div>
						</div>
					</div>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="closeImportModal"
							class="btn-secondary--outline">
							{{ importResult ? 'Close' : 'Cancel' }}
						</button>
						<BaseButton
							v-if="!importResult"
							@click="importYamlFile"
							:disabled="!importFile || isImporting"
							variant="primary">
							{{ isImporting ? 'Importing...' : 'Import' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Delete Confirmation Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showDeleteModal"
			:title="`Delete ${itemToDelete?.type === 'crate' ? 'Crate Reward' : 'Item'}`"
			size="small"
			@close="showDeleteModal = false; itemToDelete = null">
			<div class="space-y-4">
				<div>
					<h3 class="font-normal text-gray-900">
						Are you sure you want to delete <span class="font-semibold">{{ itemToDelete?.name }}</span>?
					</h3>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end p-4">
					<div class="flex space-x-3">
						<!-- prettier-ignore -->
						<button
							type="button"
							@click="showDeleteModal = false; itemToDelete = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="executeDelete"
							:disabled="loading"
							variant="primary"
							class="bg-semantic-danger hover:bg-opacity-90">
							{{ loading ? 'Deleting...' : 'Delete' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Clear All Confirmation Modal -->
		<BaseModal
			:isOpen="showClearAllModal"
			title="Clear All Items"
			size="small"
			@close="showClearAllModal = false">
			<div class="space-y-4">
				<div>
					<h3 class="font-normal text-gray-900">
						Are you sure you want to clear
						<span class="font-semibold">ALL</span>
						items from this crate?
					</h3>
					<p class="text-sm text-gray-600 mt-2">
						This action cannot be undone and will permanently delete all
						{{ rewardItems?.length || 0 }} items.
					</p>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end p-4">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="showClearAllModal = false"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="clearAllRewards"
							:disabled="loading"
							variant="primary"
							class="bg-semantic-danger hover:bg-opacity-90">
							{{ loading ? 'Clearing...' : 'Clear All' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Copy Success Toast -->
		<div
			v-if="showCopyToast"
			class="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50 transition-all duration-300">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 13l4 4L19 7" />
			</svg>
			<span>Reward list copied to clipboard!</span>
		</div>

		<!-- Test Rewards Modal -->
		<BaseModal
			:isOpen="showTestRewardsModal"
			title="Test Crate Rewards"
			maxWidth="max-w-4xl"
			@close="showTestRewardsModal = false">
			<div class="space-y-6">
				<!-- Simulation Controls -->
				<div class="flex items-center gap-4">
					<div class="flex gap-2">
						<BaseButton
							@click="simulateCrateOpen"
							:disabled="!rewardItems?.length || isSimulating"
							variant="primary">
							Open 1 Crate
						</BaseButton>
						<BaseButton
							@click="simulateMultipleOpens(10)"
							:disabled="!rewardItems?.length || isSimulating"
							variant="primary">
							Open 10 Crates
						</BaseButton>
						<BaseButton
							@click="simulateMultipleOpens(50)"
							:disabled="!rewardItems?.length || isSimulating"
							variant="primary">
							Open 50 Crates
						</BaseButton>
					</div>
					<BaseButton
						@click="clearSimulationResults"
						:disabled="!simulationResults.length"
						variant="tertiary"
						class="ml-auto">
						Clear Results
					</BaseButton>
					<div v-if="isSimulating" class="text-sm text-gray-700 font-medium">
						Simulating...
					</div>
				</div>

				<!-- Simulation Results -->
				<div
					v-if="simulationResults.length > 0"
					class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
					<h4 class="text-sm font-medium text-gray-700 mb-3">
						Recent Simulation Results ({{ simulationResults.length }}):
					</h4>
					<div class="max-h-[60vh] overflow-y-auto">
						<div
							class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
							<div
								v-for="result in simulationResults"
								:key="result.id"
								class="p-2 bg-white rounded border">
								<div class="flex items-start gap-2 mb-1">
									<img
										:src="
											getImageUrl(
												result.itemData?.image ||
													'/images/items/unknown.png'
											)
										"
										:alt="result.itemData?.name"
										loading="lazy"
										decoding="async"
										fetchpriority="low"
										class="max-w-6 max-h-6 object-contain" />
									<div class="flex-1 min-w-0">
										<div class="text-xs font-medium text-gray-900 truncate">
											{{ result.item.quantity }}x
											{{ result.itemData?.name || 'Unknown' }}
											<span
												v-if="
													result.item.enchantments &&
													Object.keys(result.item.enchantments).length > 0
												"
												class="text-blue-600">
												(enchanted)
											</span>
										</div>
										<div class="text-xs text-gray-500">
											{{ getItemChance(result.item).toFixed(1) }}% chance
										</div>
										<!-- Enchantments Display -->
										<div
											v-if="
												result.item.enchantments &&
												Object.keys(result.item.enchantments).length > 0
											"
											class="mt-1">
											<div class="flex flex-wrap gap-x-2 gap-y-1">
												<span
													v-for="enchantmentId in Object.keys(
														result.item.enchantments
													)"
													:key="enchantmentId"
													class="text-heavy-metal text-[10px] font-medium capitalize leading-none">
													{{ formatEnchantmentName(enchantmentId) }}
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty State -->
				<div v-else class="text-center py-8 text-gray-500">
					<p>
						No simulation results yet. Click a button above to start testing your crate
						rewards!
					</p>
				</div>
			</div>
		</BaseModal>
	</div>
</template>
