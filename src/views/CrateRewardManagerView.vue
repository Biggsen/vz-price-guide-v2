<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { query, collection, orderBy, where } from 'firebase/firestore'
import {
	useCrateRewards,
	useCrateReward,
	useCrateRewardItems,
	createCrateReward,
	updateCrateReward,
	deleteCrateReward,
	addCrateRewardItem,
	updateCrateRewardItem,
	deleteCrateRewardItem,
	calculateCrateRewardTotalValue,
	downloadCrateRewardYaml,
	formatRewardItemForYaml
} from '../utils/crateRewards.js'
import { getEffectivePrice } from '../utils/pricing.js'
import { versions } from '../constants.js'
import {
	PlusIcon,
	PencilIcon,
	TrashIcon,
	ArrowDownTrayIcon,
	XMarkIcon,
	CheckIcon,
	ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const user = useCurrentUser()
const router = useRouter()
const route = useRoute()
const db = useFirestore()

// Reactive state
const selectedCrateId = ref('')
const showCreateForm = ref(false)
const showEditForm = ref(false)
const showAddItemForm = ref(false)
const editingItem = ref(null)
const loading = ref(false)
const error = ref(null)

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

// Enchantment state
const showEnchantmentModal = ref(false)
const enchantmentForm = ref({
	enchantment: ''
})

// Get all items for selection
const allItemsQuery = query(collection(db, 'items'), orderBy('name', 'asc'))
const { data: allItems } = useCollection(allItemsQuery)

// Get user's crate rewards
const {
	crateRewards,
	pending: crateRewardsPending,
	error: crateRewardsError
} = useCrateRewards(computed(() => user.value?.uid))

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
const hasCrateRewards = computed(() => crateRewards.value && crateRewards.value.length > 0)
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

// Filter items by version
const availableItems = computed(() => {
	if (!allItems.value) return []
	const version = selectedCrate.value?.minecraft_version || '1.20'
	return allItems.value.filter((item) => {
		// Item must be available in the selected version
		if (item.version && item.version > version) return false
		if (item.version_removed && item.version_removed <= version) return false
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

// Methods
async function createNewCrateReward() {
	if (!crateForm.value.name.trim()) {
		error.value = 'Crate reward name is required'
		return
	}

	loading.value = true
	error.value = null

	try {
		const newCrate = await createCrateReward(user.value.uid, crateForm.value)
		selectedCrateId.value = newCrate.id
		router.push(`/crate-rewards/${newCrate.id}`)
		showCreateForm.value = false
		crateForm.value = {
			name: '',
			description: '',
			minecraft_version: '1.20'
		}
	} catch (err) {
		error.value = 'Failed to create crate reward: ' + err.message
	} finally {
		loading.value = false
	}
}

async function updateCrateRewardData() {
	if (!selectedCrateId.value || !crateForm.value.name.trim()) {
		error.value = 'Crate reward name is required'
		return
	}

	loading.value = true
	error.value = null

	try {
		await updateCrateReward(selectedCrateId.value, crateForm.value)
		showEditForm.value = false
	} catch (err) {
		error.value = 'Failed to update crate reward: ' + err.message
	} finally {
		loading.value = false
	}
}

async function deleteCrateRewardData() {
	if (!selectedCrateId.value) return

	if (
		!confirm('Are you sure you want to delete this crate reward? This action cannot be undone.')
	) {
		return
	}

	loading.value = true
	error.value = null

	try {
		await deleteCrateReward(selectedCrateId.value)
		selectedCrateId.value = ''
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
	showEditForm.value = true
}

function startAddItem() {
	itemForm.value = {
		item_id: '',
		quantity: 1,
		weight: 50,
		enchantments: {}
	}
	searchQuery.value = ''
	highlightedIndex.value = -1
	showAddItemForm.value = true
	// Focus search input after modal opens
	setTimeout(() => {
		if (searchInput.value) {
			searchInput.value.focus()
		}
	}, 100)
}

function setQuantityToStack() {
	console.log('setQuantityToStack called', itemForm.value.item_id)
	if (itemForm.value.item_id) {
		const item = getItemById(itemForm.value.item_id)
		console.log('Found item:', item)
		if (item) {
			const stackSize = item.stack || 64
			console.log('Setting quantity to:', stackSize)
			itemForm.value.quantity = stackSize
		} else {
			// Fallback to 64 if item not found
			console.log('Item not found, using default 64')
			itemForm.value.quantity = 64
		}
	} else {
		// If no item selected, set to default stack size
		console.log('No item selected, using default 64')
		itemForm.value.quantity = 64
	}
}

function startEditItem(item) {
	editingItem.value = item
	itemForm.value = {
		item_id: item.item_id,
		quantity: item.quantity,
		weight: item.weight,
		enchantments: item.enchantments || {}
	}
	showAddItemForm.value = true
}

function startEditWeight(item) {
	editingWeightId.value = item.id
	editingWeightValue.value = item.weight.toString()
	// Focus the input after Vue updates the DOM
	nextTick(() => {
		const input = weightInputRefs.value[item.id]
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

async function saveWeight(item) {
	const newWeight = parseInt(editingWeightValue.value)
	if (!isNaN(newWeight) && newWeight > 0) {
		try {
			await updateCrateRewardItem(item.id, { weight: newWeight })
			cancelEditWeight()
		} catch (err) {
			console.error('Failed to update item weight:', err)
			error.value = 'Failed to update item weight'
		}
	} else {
		// If value is empty or invalid, just cancel without error message
		cancelEditWeight()
	}
}

async function saveItem() {
	if (!selectedCrateId.value || !itemForm.value.item_id) {
		error.value = 'Please select an item'
		return
	}

	loading.value = true
	error.value = null

	try {
		if (editingItem.value) {
			// Update existing item
			await updateCrateRewardItem(editingItem.value.id, itemForm.value)
		} else {
			// Add new item
			await addCrateRewardItem(selectedCrateId.value, itemForm.value)
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
		error.value = 'Failed to save item: ' + err.message
	} finally {
		loading.value = false
	}
}

async function removeItem(itemId) {
	if (!confirm('Are you sure you want to remove this item from the crate reward?')) {
		return
	}

	loading.value = true
	error.value = null

	try {
		await deleteCrateRewardItem(itemId)
	} catch (err) {
		error.value = 'Failed to remove item: ' + err.message
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

function getItemById(itemId) {
	return allItems.value?.find((item) => item.id === itemId)
}

function getItemValue(rewardItem) {
	const item = getItemById(rewardItem.item_id)
	if (!item) return 0

	let totalValue = getEffectivePrice(item, currentVersion.value) * rewardItem.quantity

	// Add enchantment values
	if (rewardItem.enchantments && Object.keys(rewardItem.enchantments).length > 0) {
		Object.keys(rewardItem.enchantments).forEach((enchantmentId) => {
			const enchantmentItem = getItemById(enchantmentId)
			if (enchantmentItem) {
				totalValue += getEffectivePrice(enchantmentItem, currentVersion.value)
			}
		})
	}

	return totalValue
}

function getItemChance(rewardItem) {
	if (!totalWeight.value || totalWeight.value === 0) return 0
	return (rewardItem.weight / totalWeight.value) * 100
}

function formatEnchantmentName(enchantmentId) {
	// Extract enchantment name and level from ID like "enchanted_book_efficiency_4" or "enchanted_book_feather_falling_4"
	const parts = enchantmentId.split('_')
	if (parts.length >= 4 && parts[0] === 'enchanted' && parts[1] === 'book') {
		// Find the level (last part that's a number or roman numeral)
		let level = null
		let enchantmentParts = []

		for (let i = 2; i < parts.length; i++) {
			const part = parts[i].toLowerCase()
			if (['1', '2', '3', '4', '5', 'i', 'ii', 'iii', 'iv', 'v'].includes(part)) {
				level = parts[i]
				break
			} else {
				enchantmentParts.push(parts[i])
			}
		}

		// Join enchantment parts and capitalize
		const enchantment = enchantmentParts.join(' ')
		const capitalizedEnchantment = enchantment.replace(/\b\w/g, (l) => l.toUpperCase())

		if (level) {
			// Convert roman numerals to numbers for display
			const levelMap = {
				1: '1',
				2: '2',
				3: '3',
				4: '4',
				5: '5',
				i: '1',
				ii: '2',
				iii: '3',
				iv: '4',
				v: '5'
			}
			const displayLevel = levelMap[level.toLowerCase()] || level
			return `${capitalizedEnchantment} ${displayLevel}`
		} else {
			// No level found, just return the enchantment name
			return capitalizedEnchantment
		}
	}

	// Fallback to original name if format doesn't match
	return (
		getItemById(enchantmentId)?.name ||
		enchantmentId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
	)
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

	return formatRewardItemForYaml(rewardItem, item, 1)
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

	// Find which item this random number corresponds to
	let currentWeight = 0
	for (const item of rewardItems.value) {
		currentWeight += item.weight || 0
		if (random <= currentWeight) {
			// Add to simulation results
			const result = {
				id: Date.now() + Math.random(), // Unique ID
				item: item,
				itemData: getItemById(item.item_id),
				timestamp: new Date()
			}
			simulationResults.value.unshift(result) // Add to beginning

			// Keep only last 20 results
			if (simulationResults.value.length > 20) {
				simulationResults.value = simulationResults.value.slice(0, 20)
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
			if (highlightedIndex.value <= 0) {
				highlightedIndex.value = -1
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
			highlightedIndex.value = -1
			break
	}

	// Scroll highlighted item into view if index changed
	if (oldIndex !== highlightedIndex.value) {
		scrollToHighlightedItem()
	}
}

// Scroll highlighted item into view
function scrollToHighlightedItem() {
	if (!dropdownContainer.value || highlightedIndex.value < 0) return

	setTimeout(() => {
		const highlightedElement = dropdownContainer.value.querySelector('.bg-blue-100')
		if (highlightedElement) {
			highlightedElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			})
		}
	}, 0)
}

// Reset highlighted index when search changes
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
					<!-- Dashboard Header -->
					<div v-if="!selectedCrateId">
						<h1 class="text-3xl font-bold text-gray-900">Crate Reward Manager</h1>
						<p class="text-gray-600">
							Create and manage crate rewards for Crazy Crates plugin
						</p>
					</div>
					<!-- Crate Header -->
					<div v-else-if="selectedCrate">
						<h1 class="text-3xl font-bold text-gray-900">{{ selectedCrate.name }}</h1>
						<p v-if="selectedCrate.description" class="text-gray-600 mt-1">
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
						</div>
						<div class="mt-2 text-sm text-gray-900">
							<span class="font-medium">Total Weight:</span>
							{{ totalWeight }}
						</div>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						v-if="selectedCrateId"
						@click="exportYaml"
						class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
						:disabled="!rewardItems?.length">
						<ArrowDownTrayIcon class="w-4 h-4 mr-2" />
						Export YAML
					</button>
					<button
						v-if="selectedCrateId"
						@click="startEditCrate"
						class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
						<PencilIcon class="w-4 h-4 mr-2" />
						Edit
					</button>
					<button
						v-if="selectedCrateId"
						@click="deleteCrateRewardData"
						class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
						<TrashIcon class="w-4 h-4 mr-2" />
						Delete
					</button>
					<button
						v-if="!selectedCrateId"
						@click="showCreateForm = true"
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
						<PlusIcon class="w-4 h-4 mr-2" />
						New Crate Reward
					</button>
				</div>
			</div>
		</div>

		<!-- Error Display -->
		<div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
			<div class="flex items-center">
				<ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
				<span class="text-red-800">{{ error }}</span>
			</div>
		</div>

		<!-- Crate Rewards List -->
		<div v-if="!selectedCrateId" class="mb-8">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Your Crate Rewards</h2>
			<div v-if="crateRewardsPending" class="text-gray-600">Loading crate rewards...</div>
			<div v-else-if="!hasCrateRewards" class="text-gray-600">
				No crate rewards found. Create your first one to get started.
			</div>
			<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<div
					v-for="crate in crateRewards"
					:key="crate.id"
					@click="router.push(`/crate-rewards/${crate.id}`)"
					class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300 cursor-pointer">
					<h3 class="text-lg font-semibold text-gray-900 mb-2">{{ crate.name }}</h3>
					<p v-if="crate.description" class="text-gray-600 text-sm mb-2">
						{{ crate.description }}
					</p>
					<div class="text-sm text-gray-500">
						<span class="font-medium">Version:</span>
						{{ crate.minecraft_version }}
					</div>
					<div class="text-sm text-gray-500">
						<span class="font-medium">Created:</span>
						{{ new Date(crate.created_at).toLocaleDateString() }}
					</div>
				</div>
			</div>
		</div>

		<!-- Selected Crate Reward -->
		<div v-if="selectedCrateId && selectedCrate" class="space-y-6">
			<!-- Reward Items -->
			<div class="bg-white rounded-lg shadow-md border border-gray-200">
				<div class="p-6 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">Reward Items</h3>
						<button
							@click="startAddItem"
							class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
							<PlusIcon class="w-4 h-4 mr-2" />
							Add Item
						</button>
					</div>
				</div>

				<div v-if="rewardItemsPending" class="p-6 text-gray-600">
					Loading reward items...
				</div>
				<div v-else-if="!rewardItems?.length" class="p-6 text-gray-600">
					No items added yet. Click "Add Item" to get started.
				</div>
				<div v-else>
					<!-- Sorting Controls -->
					<div class="flex items-center gap-4 p-4 bg-gray-50 border-b">
						<span class="text-sm font-medium text-gray-700">Sort by:</span>
						<div class="flex gap-2">
							<button
								@click="setSortBy('value')"
								:class="[
									'px-3 py-1 text-sm rounded transition-colors',
									sortBy === 'value'
										? 'bg-blue-100 text-blue-800 font-medium'
										: 'bg-white text-gray-600 hover:bg-gray-100'
								]">
								Value
								{{
									sortBy === 'value' ? (sortDirection === 'asc' ? '↑' : '↓') : ''
								}}
							</button>
							<button
								@click="setSortBy('weight')"
								:class="[
									'px-3 py-1 text-sm rounded transition-colors',
									sortBy === 'weight'
										? 'bg-blue-100 text-blue-800 font-medium'
										: 'bg-white text-gray-600 hover:bg-gray-100'
								]">
								Weight
								{{
									sortBy === 'weight' ? (sortDirection === 'asc' ? '↑' : '↓') : ''
								}}
							</button>
							<button
								@click="setSortBy('chance')"
								:class="[
									'px-3 py-1 text-sm rounded transition-colors',
									sortBy === 'chance'
										? 'bg-blue-100 text-blue-800 font-medium'
										: 'bg-white text-gray-600 hover:bg-gray-100'
								]">
								Chance
								{{
									sortBy === 'chance' ? (sortDirection === 'asc' ? '↑' : '↓') : ''
								}}
							</button>
							<button
								@click="setSortBy('none')"
								:class="[
									'px-3 py-1 text-sm rounded transition-colors',
									sortBy === 'none'
										? 'bg-blue-100 text-blue-800 font-medium'
										: 'bg-white text-gray-600 hover:bg-gray-100'
								]">
								None
							</button>
						</div>
					</div>

					<!-- Simulation Controls -->
					<div class="flex items-center gap-4 p-4 bg-yellow-50 border-b">
						<span class="text-sm font-medium text-gray-700">Test Rewards:</span>
						<div class="flex gap-2">
							<button
								@click="simulateCrateOpen"
								:disabled="!rewardItems?.length || isSimulating"
								class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
								Open 1 Crate
							</button>
							<button
								@click="simulateMultipleOpens(10)"
								:disabled="!rewardItems?.length || isSimulating"
								class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
								Open 10 Crates
							</button>
							<button
								@click="simulateMultipleOpens(100)"
								:disabled="!rewardItems?.length || isSimulating"
								class="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
								Open 100 Crates
							</button>
							<button
								@click="clearSimulationResults"
								:disabled="!simulationResults.length"
								class="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
								Clear Results
							</button>
						</div>
						<div v-if="isSimulating" class="text-sm text-yellow-700 font-medium">
							Simulating...
						</div>
					</div>

					<!-- Simulation Results -->
					<div v-if="simulationResults.length > 0" class="p-4 bg-gray-50 border-b">
						<h4 class="text-sm font-medium text-gray-700 mb-3">
							Recent Simulation Results ({{ simulationResults.length }}):
						</h4>
						<div
							class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
							<div
								v-for="result in simulationResults.slice(0, 12)"
								:key="result.id"
								class="p-2 bg-white rounded border">
								<div class="flex items-center gap-2 mb-1">
									<img
										:src="result.itemData?.image || '/images/items/unknown.png'"
										:alt="result.itemData?.name"
										class="w-6 h-6 object-contain" />
									<div class="flex-1 min-w-0">
										<div class="text-xs font-medium text-gray-900 truncate">
											{{ result.item.quantity }}x
											{{ result.itemData?.name || 'Unknown' }}
										</div>
										<div class="text-xs text-gray-500">
											{{ getItemChance(result.item).toFixed(1) }}% chance
										</div>
									</div>
								</div>
								<!-- Enchantments Display -->
								<div
									v-if="
										result.item.enchantments &&
										Object.keys(result.item.enchantments).length > 0
									"
									class="mt-1">
									<div class="flex flex-wrap gap-1">
										<span
											v-for="enchantmentId in Object.keys(
												result.item.enchantments
											)"
											:key="enchantmentId"
											class="px-1 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
											{{ formatEnchantmentName(enchantmentId) }}
										</span>
									</div>
								</div>
							</div>
						</div>
						<div
							v-if="simulationResults.length > 12"
							class="text-xs text-gray-500 mt-2">
							... and {{ simulationResults.length - 12 }} more results
						</div>
					</div>

					<div class="divide-y divide-gray-200">
						<div
							v-for="rewardItem in sortedRewardItems"
							:key="rewardItem.id"
							class="p-6 hover:bg-gray-50">
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-4">
										<div
											class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
											<img
												v-if="getItemById(rewardItem.item_id)?.image"
												:src="getItemById(rewardItem.item_id).image"
												:alt="getItemById(rewardItem.item_id)?.name"
												class="w-8 h-8" />
											<span v-else class="text-gray-400 text-xs">?</span>
										</div>
										<div class="flex-1 flex items-center justify-between">
											<div>
												<h4 class="font-medium text-gray-900">
													{{
														`${rewardItem.quantity}x ${
															getItemById(rewardItem.item_id)?.name ||
															'Unknown Item'
														}`
													}}
												</h4>
												<div class="text-sm text-gray-500">
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
															class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
															{{
																formatEnchantmentName(enchantmentId)
															}}
														</span>
													</div>
												</div>
											</div>
											<!-- Weight and Chance Boxes -->
											<div class="flex gap-2">
												<div
													class="bg-blue-50 border border-blue-200 rounded flex items-stretch">
													<button
														@click="decreaseItemWeight(rewardItem)"
														class="flex items-center justify-center px-2 py-1 bg-white hover:bg-gray-50 transition-colors rounded-l border-r border-blue-200 min-w-[2rem]"
														title="Decrease weight by 10">
														<span
															class="text-sm font-semibold text-gray-600">
															−
														</span>
													</button>
													<div
														v-if="editingWeightId !== rewardItem.id"
														@click="startEditWeight(rewardItem)"
														class="flex items-center justify-center px-2 py-1 text-center cursor-pointer hover:bg-blue-100 transition-colors min-w-[2rem] border-r border-blue-200">
														<span
															class="text-sm font-semibold text-blue-800">
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
														class="px-1 py-1 text-center text-sm font-semibold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-8 border-r border-blue-200 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
														autofocus />
													<button
														@click="increaseItemWeight(rewardItem)"
														class="flex items-center justify-center px-2 py-1 bg-white hover:bg-gray-50 transition-colors rounded-r min-w-[2rem]"
														title="Increase weight by 10">
														<span
															class="text-sm font-semibold text-gray-600">
															+
														</span>
													</button>
												</div>
												<div
													class="bg-green-50 border border-green-200 rounded px-2 py-1 inline-block min-w-[60px] text-center">
													<span
														class="text-sm font-semibold text-green-800">
														{{ getItemChance(rewardItem).toFixed(1) }}%
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div class="flex gap-2 ml-8">
									<button
										@click="startEditItem(rewardItem)"
										class="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
										<PencilIcon class="w-4 h-4" />
									</button>
									<button
										@click="removeItem(rewardItem.id)"
										class="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
										<TrashIcon class="w-4 h-4" />
									</button>
								</div>
							</div>

							<!-- Review Panel -->
							<div class="mt-4">
								<button
									@click="toggleReviewPanel(rewardItem.id)"
									class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
									<svg
										:class="[
											'w-4 h-4 transition-transform',
											isReviewPanelExpanded(rewardItem.id) ? 'rotate-90' : ''
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
									{{ isReviewPanelExpanded(rewardItem.id) ? 'Hide' : 'Show' }}
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
					</div>
				</div>
			</div>
		</div>

		<!-- Add Item Button -->
		<div v-if="selectedCrateId" class="mt-4 flex justify-center">
			<button
				@click="startAddItem"
				class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
				<PlusIcon class="w-5 h-5 mr-2" />
				Add Item
			</button>
		</div>

		<!-- Create Crate Reward Modal -->
		<div
			v-if="showCreateForm"
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
				<div class="p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-900">Create New Crate Reward</h3>
						<button
							@click="showCreateForm = false"
							class="text-gray-400 hover:text-gray-600">
							<XMarkIcon class="w-6 h-6" />
						</button>
					</div>

					<form @submit.prevent="createNewCrateReward" class="space-y-4">
						<div>
							<label
								for="crate-name"
								class="block text-sm font-medium text-gray-700 mb-1">
								Name *
							</label>
							<input
								id="crate-name"
								v-model="crateForm.name"
								type="text"
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
						</div>

						<div>
							<label
								for="crate-description"
								class="block text-sm font-medium text-gray-700 mb-1">
								Description
							</label>
							<textarea
								id="crate-description"
								v-model="crateForm.description"
								rows="3"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
						</div>

						<div>
							<label
								for="crate-version"
								class="block text-sm font-medium text-gray-700 mb-1">
								Minecraft Version
							</label>
							<select
								id="crate-version"
								v-model="crateForm.minecraft_version"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
								<option v-for="version in versions" :key="version" :value="version">
									{{ version }}
								</option>
							</select>
						</div>

						<div class="flex gap-3 pt-4">
							<button
								type="button"
								@click="showCreateForm = false"
								class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
								Cancel
							</button>
							<button
								type="submit"
								:disabled="loading"
								class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
								{{ loading ? 'Creating...' : 'Create' }}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>

		<!-- Edit Crate Reward Modal -->
		<div
			v-if="showEditForm"
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
				<div class="p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-900">Edit Crate Reward</h3>
						<button
							@click="showEditForm = false"
							class="text-gray-400 hover:text-gray-600">
							<XMarkIcon class="w-6 h-6" />
						</button>
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
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
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
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
								<option v-for="version in versions" :key="version" :value="version">
									{{ version }}
								</option>
							</select>
						</div>

						<div class="flex gap-3 pt-4">
							<button
								type="button"
								@click="showEditForm = false"
								class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
								Cancel
							</button>
							<button
								type="submit"
								:disabled="loading"
								class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
								{{ loading ? 'Updating...' : 'Update' }}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>

		<!-- Add/Edit Item Modal -->
		<div
			v-if="showAddItemForm"
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div
				class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
				<div class="p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-900">
							{{ editingItem ? 'Edit Item' : 'Add Item to Crate Reward' }}
						</h3>
						<!-- prettier-ignore -->
						<button
							@click="showAddItemForm = false; editingItem = null"
							class="text-gray-400 hover:text-gray-600">
							<XMarkIcon class="w-6 h-6" />
						</button>
					</div>

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
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />

								<!-- Item selection dropdown -->
								<div
									v-if="searchQuery && filteredItems.length > 0"
									ref="dropdownContainer"
									class="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-white">
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
												highlightedIndex = getItemVisualIndex(
													category,
													categoryIndex
												)
											"
											:class="[
												'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center justify-between',
												getItemVisualIndex(category, categoryIndex) ===
												highlightedIndex
													? 'bg-blue-100 text-blue-900'
													: 'hover:bg-blue-50'
											]">
											<div>
												<div class="font-medium">{{ item.name }}</div>
												<div class="text-sm text-gray-500">
													{{ item.material_id }}
												</div>
											</div>
											<div v-if="item.image" class="w-8 h-8">
												<img
													:src="item.image"
													:alt="item.name"
													class="w-full h-full object-contain" />
											</div>
										</div>
									</template>
								</div>
							</div>

							<!-- Show selected item when item is selected -->
							<div v-else>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									Item *
								</label>
								<div
									class="p-3 bg-green-50 border border-green-200 rounded flex items-center justify-between">
									<div>
										<div class="font-medium text-green-800">
											{{ selectedItem.name }}
										</div>
										<div class="text-sm text-green-600">
											{{ selectedItem.material_id }}
										</div>
									</div>
									<div v-if="selectedItem.image" class="w-8 h-8">
										<img
											:src="selectedItem.image"
											:alt="selectedItem.name"
											class="w-full h-full object-contain" />
									</div>
								</div>
								<button
									type="button"
									@click="clearSelectedItem"
									class="mt-2 text-sm text-blue-600 hover:text-blue-800 underline">
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
								<div v-if="getItemById(editingItem.item_id).image" class="w-8 h-8">
									<img
										:src="getItemById(editingItem.item_id).image"
										:alt="getItemById(editingItem.item_id).name"
										class="w-full h-full object-contain" />
								</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									Quantity *
								</label>
								<div class="flex gap-2">
									<button
										type="button"
										@click="setQuantityToStack"
										class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap">
										Stack
									</button>
									<input
										id="item-quantity"
										v-model.number="itemForm.quantity"
										type="number"
										min="1"
										required
										placeholder="Custom"
										class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
							</div>
						</div>

						<!-- Enchantments Section -->
						<div class="mt-4">
							<div class="flex items-center justify-between mb-2">
								<label class="text-sm font-medium text-gray-700">
									Enchantments
								</label>
								<button
									type="button"
									@click="addEnchantment"
									class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
									+ Add Enchantment
								</button>
							</div>
							<div
								v-if="Object.keys(itemForm.enchantments).length > 0"
								class="space-y-2">
								<div
									v-for="(level, enchantment, index) in itemForm.enchantments"
									:key="index"
									class="flex items-center gap-2 p-2 bg-gray-50 rounded">
									<span class="text-sm font-medium text-gray-700">
										{{
											getItemById(enchantment)?.name ||
											enchantment
												.replace(/_/g, ' ')
												.replace(/\b\w/g, (l) => l.toUpperCase())
										}}
									</span>
									<button
										type="button"
										@click="removeEnchantment(enchantment)"
										class="text-red-500 hover:text-red-700 text-sm">
										Remove
									</button>
								</div>
							</div>
							<div v-else class="text-sm text-gray-500 italic">
								No enchantments added
							</div>
						</div>

						<div class="flex gap-3 pt-4">
							<!-- prettier-ignore -->
							<button
								type="button"
								@click="showAddItemForm = false; editingItem = null"
								class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
								Cancel
							</button>
							<button
								type="submit"
								:disabled="loading"
								class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
								{{ loading ? 'Saving...' : editingItem ? 'Update' : 'Add' }}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>

		<!-- Enchantment Selection Modal -->
		<div
			v-if="showEnchantmentModal"
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-semibold text-gray-900">Add Enchantment</h3>
					<button @click="cancelEnchantment" class="text-gray-400 hover:text-gray-600">
						<XMarkIcon class="w-6 h-6" />
					</button>
				</div>

				<form @submit.prevent="saveEnchantment" class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Enchantment
						</label>
						<select
							v-model="enchantmentForm.enchantment"
							@change="onEnchantmentSelected"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
							<option value="">Select an enchantment...</option>
							<option
								v-for="enchantment in enchantmentItems"
								:key="enchantment.id"
								:value="enchantment.id">
								{{ enchantment.name }}
							</option>
						</select>
					</div>

					<div class="pt-4">
						<button
							type="button"
							@click="cancelEnchantment"
							class="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>
