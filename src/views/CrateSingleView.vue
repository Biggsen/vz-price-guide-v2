<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useCurrentUser, useFirestore, useCollection, useDocument } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { query, collection, orderBy, doc, updateDoc, where, getDocs } from 'firebase/firestore'
import {
	useCrateReward,
	useCrateRewardItems,
	updateCrateReward,
	deleteCrateReward,
	addCrateRewardItem,
	deleteCrateRewardItem,
	downloadCrateRewardYaml,
	formatRewardItemForYaml,
	importCrateRewardsFromYaml,
	validateYamlForMultipleItems,
	getUniqueCrateName
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
	ChevronDoubleLeftIcon,
	QuestionMarkCircleIcon
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
const editingRewardDoc = ref(null)
const loading = ref(false)
const error = ref(null)
const showCopyToast = ref(false)

// Debug flag for YAML preview
const showYamlPreview = ref(false)

// Modal-specific error states
const editFormError = ref(null)
const addItemFormError = ref(null)
const importModalError = ref(null)

// Edit form validation states
const editNameValidationError = ref(null)
const isCheckingEditName = ref(false)

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
	enchantments: {},
	value_source: 'catalog',
	custom_value: null
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
	rewardDocuments,
	pending: rewardItemsPending,
	error: rewardItemsError
} = useCrateRewardItems(selectedCrateId)

// Watch for when rewardDocuments data is loaded
watch(
	rewardDocuments,
	(newRewardDocuments) => {
		if (newRewardDocuments && newRewardDocuments.length > 0) {
			console.log('Loaded rewardDocuments:', newRewardDocuments)
			newRewardDocuments.forEach((rewardDoc, index) => {
				console.log(`rewardDoc[${index}]:`, rewardDoc)
			})
		}
	},
	{ immediate: true }
)

// Computed properties
const selectedCrate = computed(() => crateReward.value)
const currentVersion = computed(() => {
	const version = selectedCrate.value?.minecraft_version || '1.20'
	return version.replace('.', '_')
})

// Calculate total value of current crate reward
const totalValue = computed(() => {
	if (!rewardDocuments.value || !allItems.value) return 0
	return rewardDocuments.value.reduce((total, doc) => total + getRewardDocValue(doc), 0)
})

// Calculate total weight of current crate reward
const totalWeight = computed(() => {
	if (!rewardDocuments.value) return 0
	return rewardDocuments.value.reduce((total, doc) => total + (doc.weight || 0), 0)
})

// Sorted reward documents
const sortedRewardDocuments = computed(() => {
	if (!rewardDocuments.value || sortBy.value === 'none') return rewardDocuments.value

	return [...rewardDocuments.value].sort((a, b) => {
		let aValue, bValue

		switch (sortBy.value) {
			case 'value':
				aValue = getRewardDocValue(a)
				bValue = getRewardDocValue(b)
				break
			case 'weight':
				aValue = a.weight || 0
				bValue = b.weight || 0
				break
			case 'chance':
				aValue = getRewardDocChance(a)
				bValue = getRewardDocChance(b)
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

		// Filter out 0-price items (unless it's the base enchanted book used for normalization)
		const effectivePrice = getEffectivePrice(item, version.replace('.', '_'))
		if ((!effectivePrice || effectivePrice === 0) && item.material_id !== 'enchanted_book')
			return false

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
async function checkEditCrateNameAvailability(name) {
	if (!name.trim()) {
		editNameValidationError.value = null
		return
	}

	isCheckingEditName.value = true
	editNameValidationError.value = null

	try {
		// Get all crates except the current one being edited
		const cratesQuery = query(
			collection(db, 'crate_rewards'),
			where('user_id', '==', user.value.uid),
			orderBy('name')
		)
		const querySnapshot = await getDocs(cratesQuery)

		const existingNames = querySnapshot.docs
			.filter((doc) => doc.id !== selectedCrateId.value)
			.map((doc) => doc.data().name)

		if (existingNames.includes(name.trim())) {
			editNameValidationError.value = 'A crate with this name already exists'
		}
	} catch (err) {
		console.error('Error checking edit crate name:', err)
		// Don't show error to user for validation failures
	} finally {
		isCheckingEditName.value = false
	}
}

async function updateCrateRewardData() {
	if (!crateForm.value.name.trim()) {
		editNameValidationError.value = 'Crate name is required'
		return
	}

	// Check for duplicate name before updating (in case user didn't blur the field)
	if (!editNameValidationError.value) {
		await checkEditCrateNameAvailability(crateForm.value.name)
	}

	// Check for duplicate name before updating
	if (editNameValidationError.value) {
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
		editNameValidationError.value = null
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
		enchantments: {},
		value_source: 'catalog',
		custom_value: null
	}
	addItemFormError.value = null
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

function getItemName(itemId, rewardItem = null) {
	const item = getItemById(itemId)
	const name = rewardItem?.display_name || item?.name || 'Unknown Item'
	return stripColorCodes(name)
}

// ===== DOCUMENT-BASED HELPER FUNCTIONS =====

function getRewardDocValue(rewardDoc) {
	// Check for custom value first (works for both item-based and itemless rewards)
	if (rewardDoc.value_source === 'custom' && rewardDoc.custom_value) {
		return rewardDoc.custom_value
	}

	// For catalog-based pricing, we need items
	if (!rewardDoc.items || !rewardDoc.items.length || !allItems.value) return 0

	let totalValue = 0
	rewardDoc.items.forEach((item) => {
		const itemData = getItemById(item.item_id)
		if (itemData) {
			const unitPrice = getEffectivePrice(itemData, currentVersion.value)
			const baseValue = unitPrice * (item.quantity || 1)

			// Calculate enchantment values from item's actual enchantments
			let enchantmentValue = 0
			if (item.enchantments && Array.isArray(item.enchantments)) {
				item.enchantments.forEach((enchId) => {
					const enchItem = getItemById(enchId)
					if (enchItem) {
						enchantmentValue += getEffectivePrice(enchItem, currentVersion.value)
					}
				})
			}

			totalValue += baseValue + enchantmentValue
		}
	})

	return totalValue
}

function getRewardDocChance(rewardDoc) {
	if (!totalWeight.value || totalWeight.value === 0) return 0
	return ((rewardDoc.weight || 0) / totalWeight.value) * 100
}

function getValueDisplay(rewardDoc) {
	const value = getRewardDocValue(rewardDoc)

	// Show "Unknown" if value is 0
	if (value === 0) {
		return 'Unknown'
	}

	return Math.ceil(value)
}

function getDisplayItemImageFromDoc(rewardDoc) {
	if (rewardDoc.display_item) {
		const displayItem = getItemById(rewardDoc.display_item)
		if (displayItem?.image) {
			return displayItem.image
		}
	}
	return null
}

function isMultiItemReward(rewardDoc) {
	return rewardDoc.items && rewardDoc.items.length > 1
}

function canEditReward(rewardDoc) {
	// Can edit if single-item reward
	return !rewardDoc.items || rewardDoc.items.length <= 1
}

// ===== DOCUMENT UPDATE FUNCTIONS =====

async function updateRewardDocument(rewardDoc, updates) {
	try {
		let processedUpdates = { ...updates }
		processedUpdates.updated_at = new Date().toISOString()

		await updateDoc(doc(db, 'crate_reward_items', rewardDoc.id), processedUpdates)
		return true
	} catch (error) {
		console.error('Error updating reward document:', error)
		throw error
	}
}

async function increaseRewardWeight(rewardDoc) {
	const newWeight = Math.min(rewardDoc.weight + 10, 1000)
	if (newWeight !== rewardDoc.weight) {
		try {
			await updateRewardDocument(rewardDoc, { weight: newWeight })
		} catch (err) {
			console.error('Failed to update reward weight:', err)
			error.value = 'Failed to update reward weight'
		}
	}
}

async function decreaseRewardWeight(rewardDoc) {
	const newWeight = Math.max(rewardDoc.weight - 10, 1)
	if (newWeight !== rewardDoc.weight) {
		try {
			await updateRewardDocument(rewardDoc, { weight: newWeight })
		} catch (err) {
			console.error('Failed to update reward weight:', err)
			error.value = 'Failed to update reward weight'
		}
	}
}

function startEditWeight(rewardDoc) {
	editingWeightId.value = rewardDoc.id
	editingWeightValue.value = rewardDoc.weight.toString()
	nextTick(() => {
		const input = weightInputRefs.value[rewardDoc.id]
		if (input) {
			input.focus()
			input.select()
		}
	})
}

async function saveWeight(rewardDoc) {
	const newWeight = parseInt(editingWeightValue.value)
	if (isNaN(newWeight) || newWeight < 1) {
		cancelEditWeight()
		return
	}

	if (newWeight !== rewardDoc.weight) {
		try {
			await updateRewardDocument(rewardDoc, { weight: newWeight })
		} catch (err) {
			console.error('Failed to update reward weight:', err)
			error.value = 'Failed to update reward weight'
		}
	}
	cancelEditWeight()
}

function cancelEditWeight() {
	editingWeightId.value = null
	editingWeightValue.value = ''
}

// ===== DOCUMENT EDIT FUNCTIONS =====

function startEditReward(rewardDoc) {
	console.log('=== startEditReward() called ===')
	console.log('rewardDoc:', rewardDoc)

	// Only allow editing single-item rewards
	if (!canEditReward(rewardDoc)) {
		error.value = 'Cannot edit multi-item rewards. Please re-import from YAML to modify.'
		return
	}

	// Check if reward has items
	if (rewardDoc.items && rewardDoc.items.length > 0) {
		// Extract the single item
		const singleItem = rewardDoc.items[0]
		console.log('singleItem from rewardDoc:', singleItem)

		// Convert to form format
		itemForm.value = {
			item_id: singleItem.item_id,
			quantity: singleItem.quantity,
			weight: rewardDoc.weight,
			enchantments: {}, // Convert array to object for form
			value_source: rewardDoc.value_source || 'catalog',
			custom_value: rewardDoc.custom_value || null
		}

		// Convert enchantments array to object for editing
		if (singleItem.enchantments && Array.isArray(singleItem.enchantments)) {
			singleItem.enchantments.forEach((enchId) => {
				itemForm.value.enchantments[enchId] = 1
			})
		}
	} else {
		// Handle rewards without items (command rewards, etc.)
		itemForm.value = {
			item_id: null, // No item ID for command rewards
			quantity: rewardDoc.display_amount || 1,
			weight: rewardDoc.weight,
			enchantments: {},
			value_source: rewardDoc.value_source || 'catalog',
			custom_value: rewardDoc.custom_value || null
		}
	}

	console.log('itemForm.value after setup:', itemForm.value)
	editingRewardDoc.value = rewardDoc
	showAddItemForm.value = true
	console.log('Form opened for editing')
}

function confirmRemoveReward(rewardDoc) {
	const itemCount = rewardDoc.items?.length || 0
	const warningText = isMultiItemReward(rewardDoc) ? ` (contains ${itemCount} items)` : ''

	itemToDelete.value = {
		type: 'reward',
		id: rewardDoc.id,
		name: stripColorCodes(rewardDoc.display_name || 'Unknown Reward') + warningText,
		isMultiItem: isMultiItemReward(rewardDoc)
	}
	showDeleteModal.value = true
}

function generateDisplayName(itemForm) {
	const item = getItemById(itemForm.item_id)
	if (!item) return ''

	const quantity = itemForm.quantity || 1
	const itemName = stripColorCodes(item.name)

	// Capitalize the item name (convert to title case)
	const capitalizedItemName = itemName.replace(/\b\w/g, (l) => l.toUpperCase())

	// Only show quantity prefix if quantity is more than 1
	const quantityPrefix = quantity > 1 ? `${quantity}x ` : ''

	return `<white>${quantityPrefix}${capitalizedItemName}`
}

// Helper function to get enchantment IDs from either array or object format
function getEnchantmentIds(enchantments) {
	if (!enchantments) return []

	// Handle array format (new structure)
	if (Array.isArray(enchantments)) {
		return enchantments
	}

	// Handle object format (legacy structure)
	if (typeof enchantments === 'object') {
		return Object.keys(enchantments)
	}

	return []
}

// Helper function to strip color codes from text
function stripColorCodes(text) {
	if (!text) return ''

	// Remove <color> format (e.g., <red>, <blue>, <#ff0000>)
	let cleaned = text.replace(/<[^>]*>/g, '')

	// Remove § format color codes (e.g., §c, §4, §r)
	cleaned = cleaned.replace(/§[0-9a-fk-or]/gi, '')

	return cleaned.trim()
}

async function saveItem() {
	console.log('=== saveItem() called ===')
	console.log('selectedCrateId.value:', selectedCrateId.value)
	console.log('itemForm.value:', itemForm.value)
	console.log('editingRewardDoc.value:', editingRewardDoc.value)

	// Clear previous errors
	addItemFormError.value = null

	// Validate required fields
	if (!selectedCrateId.value) {
		console.log('Validation failed: missing selectedCrateId')
		addItemFormError.value = 'No crate selected'
		return
	}

	// For new items, require item selection
	if (!editingRewardDoc.value && !itemForm.value.item_id) {
		console.log('Validation failed: missing item_id for new item')
		addItemFormError.value = 'Please select an item'
		return
	}

	if (!itemForm.value.quantity || itemForm.value.quantity < 1) {
		console.log('Validation failed: invalid quantity')
		addItemFormError.value = 'quantity'
		return
	}

	if (!itemForm.value.weight || itemForm.value.weight < 1) {
		console.log('Validation failed: invalid weight')
		addItemFormError.value = 'weight'
		return
	}

	// Validate custom value if using custom pricing
	if (
		itemForm.value.value_source === 'custom' &&
		(!itemForm.value.custom_value || itemForm.value.custom_value < 0)
	) {
		console.log('Validation failed: invalid custom value')
		addItemFormError.value = 'custom_value'
		return
	}

	console.log('All validations passed, starting save process...')
	loading.value = true

	try {
		if (editingRewardDoc.value) {
			console.log('Editing existing reward document...')
			// Check if reward has items
			const hasItems = editingRewardDoc.value.items && editingRewardDoc.value.items.length > 0
			const singleItem = hasItems ? editingRewardDoc.value.items[0] : null
			console.log('hasItems:', hasItems)
			console.log('singleItem:', singleItem)

			// Check if this is a catalog item or unknown item
			const isCatalogItem = getItemById(itemForm.value.item_id)
			console.log('isCatalogItem:', isCatalogItem)
			console.log('itemForm.value.item_id:', itemForm.value.item_id)

			// Prepare updates for the document
			const updates = {
				weight: itemForm.value.weight,
				// Preserve display_name for imported items, regenerate for manual items
				display_name:
					editingRewardDoc.value.import_source === 'yaml_import' &&
					editingRewardDoc.value.display_name
						? editingRewardDoc.value.display_name // Preserve imported custom names
						: generateDisplayName(itemForm.value), // Generate for manual items or missing display_name
				value_source: itemForm.value.value_source,
				custom_value:
					itemForm.value.value_source === 'custom' ? itemForm.value.custom_value : null
			}

			// Handle items and enchantments only for item-based rewards
			if (hasItems) {
				updates.items = [
					{
						...singleItem,
						// Only update item_id for catalog items, preserve original for unknown items
						item_id: isCatalogItem ? itemForm.value.item_id : singleItem.item_id,
						quantity: itemForm.value.quantity,
						enchantments: Object.keys(itemForm.value.enchantments || {})
					}
				]
				updates.display_enchantments = Object.keys(itemForm.value.enchantments || {})
			} else {
				// For itemless rewards, clear items and enchantments
				updates.items = []
				updates.display_enchantments = []
			}

			console.log('Prepared updates:', updates)
			await updateRewardDocument(editingRewardDoc.value, updates)
			console.log('Successfully updated reward document')
		} else {
			// Add new item - pass the selected item data to avoid extra queries
			const selectedItem = getItemById(itemForm.value.item_id)

			// Generate display_name for new items
			const itemDataWithDisplayName = {
				...itemForm.value,
				display_name: generateDisplayName(itemForm.value)
			}

			await addCrateRewardItem(selectedCrateId.value, itemDataWithDisplayName, selectedItem)
		}

		showAddItemForm.value = false
		editingRewardDoc.value = null
		itemForm.value = {
			item_id: '',
			quantity: 1,
			weight: 50,
			enchantments: {},
			value_source: 'catalog',
			custom_value: null
		}
	} catch (err) {
		console.error('Error in saveItem:', err)
		addItemFormError.value = 'Failed to save item: ' + err.message
	} finally {
		loading.value = false
		console.log('saveItem() completed')
	}
}

async function executeDelete() {
	if (!itemToDelete.value) return

	loading.value = true
	error.value = null

	try {
		if (itemToDelete.value.type === 'crate') {
			await deleteCrateRewardFromDetail()
		} else if (itemToDelete.value.type === 'item' || itemToDelete.value.type === 'reward') {
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
		if (rewardDocuments.value && rewardDocuments.value.length > 0) {
			const deletePromises = rewardDocuments.value.map((doc) => deleteCrateRewardItem(doc.id))
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
	if (!selectedCrate.value || !rewardDocuments.value || !allItems.value) return
	downloadCrateRewardYaml(
		selectedCrate.value,
		rewardDocuments.value,
		allItems.value,
		currentVersion.value
	)
}

function copyRewardList() {
	if (!rewardDocuments.value || !allItems.value) return

	// Get the sorted items (respecting current sort order)
	const sortedItems = [...rewardDocuments.value].sort((a, b) => {
		const itemA = getItemById(a.items?.[0]?.item_id)
		const itemB = getItemById(b.items?.[0]?.item_id)

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
		.map((rewardDoc) => {
			if (isMultiItemReward(rewardDoc)) {
				// For multi-item rewards, show summary
				const totalValue = getRewardDocValue(rewardDoc)
				const chance = getRewardDocChance(rewardDoc).toFixed(1)
				return `${stripColorCodes(
					rewardDoc.display_name || 'Multi-item Reward'
				)} - Value: ${getValueDisplay(rewardDoc)} - Weight: ${
					rewardDoc.weight
				} - Chance: ${chance}% (${rewardDoc.items.length} items)`
			} else {
				// For single-item rewards, show details
				const singleItem = rewardDoc.items[0]
				const itemData = getItemById(singleItem.item_id)
				if (!itemData)
					return `${stripColorCodes(
						rewardDoc.display_name || 'Unknown'
					)} - Value: Unknown`

				const value = getRewardDocValue(rewardDoc)
				const chance = getRewardDocChance(rewardDoc).toFixed(1)

				return `${singleItem.quantity}x ${stripColorCodes(
					itemData.name
				)} - Value: ${getValueDisplay(rewardDoc)} - Weight: ${
					rewardDoc.weight
				} - Chance: ${chance}%`
			}
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
	const enchantmentItem = getItemById(enchantmentId)
	if (!enchantmentItem) return enchantmentId

	// Try to extract from material_id first (most reliable)
	const materialId = enchantmentItem.material_id
	if (materialId && materialId.startsWith('enchanted_book_')) {
		// Extract enchantment name from material_id like "enchanted_book_aqua_affinity_1"
		const enchantmentPart = materialId.replace('enchanted_book_', '')

		// Try to extract enchantment with level first (e.g., "unbreaking_3" -> "unbreaking 3")
		const enchantWithLevelMatch = enchantmentPart.match(/^(.+)_(\d+)$/)
		if (enchantWithLevelMatch) {
			const enchantName = enchantWithLevelMatch[1]
			const level = enchantWithLevelMatch[2]

			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			return `${capitalizedEnchant} ${level}`
		}

		// Try enchantment without level (e.g., "silk_touch" -> "silk touch")
		const enchantWithoutLevelMatch = enchantmentPart.match(/^(.+)$/)
		if (enchantWithoutLevelMatch) {
			const enchantName = enchantWithoutLevelMatch[1]
			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			return capitalizedEnchant
		}
	}

	// Fallback: Try to extract from item name
	const itemName = enchantmentItem.name || enchantmentId

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

	// Final fallback - clean up the name
	return itemName
		.replace(/^enchanted book /i, '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (l) => l.toUpperCase())
}

// Extract enchantments from material_id (e.g., "enchanted_book_mending_1" -> [{id: "mending", level: 1}])
function extractEnchantmentsFromMaterialId(materialId) {
	if (!materialId || !materialId.startsWith('enchanted_book_')) {
		return []
	}

	// Remove "enchanted_book_" prefix
	const enchantmentPart = materialId.replace('enchanted_book_', '')

	// Try to extract enchantment with level first (e.g., "mending_1" -> "mending:1")
	const enchantWithLevelMatch = enchantmentPart.match(/^(.+)_(\d+)$/)
	if (enchantWithLevelMatch) {
		const enchantName = enchantWithLevelMatch[1]
		const enchantLevel = parseInt(enchantWithLevelMatch[2])
		return [{ id: enchantName, level: enchantLevel }]
	}

	// Try to extract enchantment without level (e.g., "silk_touch" -> "silk_touch:1")
	const enchantWithoutLevelMatch = enchantmentPart.match(/^(.+)$/)
	if (enchantWithoutLevelMatch) {
		const enchantName = enchantWithoutLevelMatch[1]
		return [{ id: enchantName, level: 1 }]
	}

	return []
}

// Item search functions
function selectItem(item) {
	// Check if this is an enchanted book that needs normalization
	if (
		item.material_id &&
		item.material_id.startsWith('enchanted_book_') &&
		item.material_id !== 'enchanted_book'
	) {
		// Find the base enchanted book item by material_id instead of hardcoded ID
		const baseEnchantedBook = allItems.value.find(
			(item) => item.material_id === 'enchanted_book'
		)
		if (baseEnchantedBook) {
			// Use the base enchanted book instead
			itemForm.value.item_id = baseEnchantedBook.id

			// Extract enchantments from the original item's material_id
			const extractedEnchantments = extractEnchantmentsFromMaterialId(item.material_id)

			// Add the extracted enchantments to the form
			if (extractedEnchantments.length > 0) {
				itemForm.value.enchantments = {}
				extractedEnchantments.forEach((enchantment) => {
					// Find the catalog item by material_id and use its document ID
					const enchantmentMaterialId = `enchanted_book_${enchantment.id}_${enchantment.level}`
					const enchantmentItem = allItems.value.find(
						(item) => item.material_id === enchantmentMaterialId
					)
					if (enchantmentItem) {
						itemForm.value.enchantments[enchantmentItem.id] = enchantment.level
					}
				})
			}
		} else {
			// Fallback to original item if base enchanted book not found
			itemForm.value.item_id = item.id
		}
	} else {
		// Normal item selection
		itemForm.value.item_id = item.id
	}

	searchQuery.value = '' // Clear search query when item is selected
	highlightedIndex.value = -1 // Reset highlight
}

function clearSelectedItem() {
	itemForm.value.item_id = ''
	itemForm.value.enchantments = {} // Clear enchantments when clearing item
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

function getFormattedYamlForItem(rewardDoc) {
	if (!rewardDoc || !allItems.value) return null

	// rewardDoc is already the document, no need to find parent
	return formatRewardItemForYaml(rewardDoc, 1, allItems.value)
}

function getYamlPreview(rewardDoc) {
	const formatted = getFormattedYamlForItem(rewardDoc)
	if (!formatted) return 'Loading...'

	let yaml = `    "1":\n`
	yaml += `      DisplayName: "${formatted.displayName}"\n`

	// Add DisplayEnchantments if present
	if (formatted.displayEnchantments && formatted.displayEnchantments.length > 0) {
		yaml += `      DisplayEnchantments:\n`
		formatted.displayEnchantments.forEach((enchantmentId) => {
			// Convert enchantment ID to human-readable format
			const enchantDoc = allItems.value.find((i) => i.id === enchantmentId)
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
					const enchantmentParts = levelIndex >= 0 ? parts.slice(0, levelIndex) : parts
					const enchantment = enchantmentParts.join('_')

					// Convert roman numerals to numbers
					const levelMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }
					const displayLevel = romanLevel ? levelMap[romanLevel] : 1

					yaml += `        - "${enchantment}:${displayLevel}"\n`
				} else {
					// Fallback if name doesn't match expected format
					yaml += `        - "${enchantmentId}"\n`
				}
			} else {
				// Fallback if enchantment item not found
				yaml += `        - "${enchantmentId}"\n`
			}
		})
	}

	yaml += `      DisplayItem: "${formatted.displayItem}"\n`
	yaml += `      Settings:\n`
	yaml += `        Custom-Model-Data: ${formatted.settings['Custom-Model-Data'] ?? -1}\n`
	yaml += `        Model:\n`
	yaml += `          Namespace: "${formatted.settings.Model.Namespace}"\n`
	yaml += `          Id: "${formatted.settings.Model.Id}"\n`

	// Add other settings if present
	if (formatted.settings['Max-Pulls']) {
		yaml += `        Max-Pulls: ${formatted.settings['Max-Pulls']}\n`
	}
	if (formatted.settings['Mob-Type']) {
		yaml += `        Mob-Type: ${formatted.settings['Mob-Type']}\n`
	}
	if (formatted.settings['RGB']) {
		yaml += `        RGB: "${formatted.settings['RGB']}"\n`
	}
	if (formatted.settings['Color']) {
		yaml += `        Color: ${formatted.settings['Color']}\n`
	}
	if (formatted.settings['Broadcast']) {
		yaml += `        Broadcast:\n`
		yaml += `          Toggle: ${formatted.settings['Broadcast'].Toggle}\n`
		if (
			formatted.settings['Broadcast'].Messages &&
			formatted.settings['Broadcast'].Messages.length > 0
		) {
			yaml += `          Messages:\n`
			formatted.settings['Broadcast'].Messages.forEach((message) => {
				yaml += `            - "${message}"\n`
			})
		}
		if (formatted.settings['Broadcast'].Permission) {
			yaml += `          Permission: "${formatted.settings['Broadcast'].Permission}"\n`
		}
	}
	yaml += `      DisplayAmount: ${formatted.displayAmount}\n`
	yaml += `      Weight: ${formatted.weight}\n`

	// Add Player field if present (for player heads)
	if (formatted.player) {
		yaml += `      Player: "${formatted.player}"\n`
	}

	// Add DisplayTrim field if present (for armor trims)
	if (formatted.displayTrim) {
		yaml += `      DisplayTrim:\n`
		yaml += `        Material: "${formatted.displayTrim.material}"\n`
		yaml += `        Pattern: "${formatted.displayTrim.pattern}"\n`
	}

	// Add DisplayLore field if present
	if (formatted.displayLore && formatted.displayLore.length > 0) {
		yaml += `      DisplayLore:\n`
		formatted.displayLore.forEach((lore) => {
			yaml += `        - "${lore}"\n`
		})
	}

	// Add DisplayPatterns field if present
	if (formatted.displayPatterns && formatted.displayPatterns.length > 0) {
		yaml += `      DisplayPatterns:\n`
		formatted.displayPatterns.forEach((pattern) => {
			yaml += `        - "${pattern}"\n`
		})
	}

	// Add Firework field if present
	if (formatted.firework) {
		yaml += `      Firework: true\n`
	}

	// Add Items section (always present)
	yaml += `      Items:\n`
	if (formatted.items && formatted.items.length > 0) {
		// Export items array directly
		formatted.items.forEach((itemStr) => {
			yaml += `        - "${itemStr}"\n`
		})
	} else {
		// No items (command-based rewards or empty)
		yaml += `        []\n`
	}

	// Add Commands section if present
	if (formatted.commands && formatted.commands.length > 0) {
		yaml += `      Commands:\n`
		formatted.commands.forEach((command) => {
			yaml += `        - "${command}"\n`
		})
	}

	// Add Messages section if present
	if (formatted.messages && formatted.messages.length > 0) {
		yaml += `      Messages:\n`
		formatted.messages.forEach((message) => {
			yaml += `        - "${message}"\n`
		})
	}

	return yaml
}

// Item weight adjustment functions (for existing items in the list)

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
	if (!rewardDocuments.value || rewardDocuments.value.length === 0) return

	const totalWeight = rewardDocuments.value.reduce((sum, doc) => sum + (doc.weight || 0), 0)
	if (totalWeight === 0) return

	// Generate random number between 0 and totalWeight
	const random = Math.random() * totalWeight

	// Find which reward document was selected
	let currentWeight = 0
	for (const rewardDoc of rewardDocuments.value) {
		currentWeight += rewardDoc.weight || 0
		if (random <= currentWeight) {
			// This reward document was selected
			const itemData = getItemById(rewardDoc.items[0]?.item_id) // Use first item for display

			simulationResults.value.unshift({
				id: Date.now() + Math.random(),
				item: rewardDoc, // Store the whole document
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
	if (!rewardDocuments.value || rewardDocuments.value.length === 0) return

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

		// Validate for multiple item rewards and get prizes to skip
		const validation = validateYamlForMultipleItems(fileContent)
		if (!validation.success) {
			importModalError.value = `Import failed: ${validation.errors.join(', ')}`
			return
		}

		// Import the crate rewards, skipping problematic prizes
		const result = await importCrateRewardsFromYaml(
			selectedCrateId.value,
			fileContent,
			allItems.value,
			null, // crateName
			null, // userId
			validation.prizesToSkip // prizesToSkip
		)

		// Combine validation warnings with import warnings
		result.warnings = [...(validation.warnings || []), ...(result.warnings || [])]
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
								class="text-sm"
								data-cy="back-button">
								<template #left-icon>
									<ArrowLeftIcon class="w-4 h-4" />
								</template>
								Back to Crates
							</BaseButton>
						</div>

						<div class="flex items-center gap-3">
							<h1 class="text-3xl font-bold text-gray-900">
								{{ selectedCrate.name }}
							</h1>
							<button
								@click="startEditCrate"
								class="text-gray-900 hover:text-gray-600 transition-colors"
								title="Edit crate"
								data-cy="edit-crate-button">
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
								<span class="font-medium">Rewards:</span>
								{{ rewardDocuments?.length || 0 }}
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
			<BaseButton
				@click="exportYaml"
				variant="secondary"
				:disabled="!rewardDocuments?.length">
				<template #left-icon>
					<ArrowDownTrayIcon class="w-4 h-4" />
				</template>
				Export YAML
			</BaseButton>
			<BaseButton
				@click="copyRewardList"
				variant="secondary"
				:disabled="!rewardDocuments?.length">
				<template #left-icon>
					<ClipboardIcon class="w-4 h-4" />
				</template>
				Copy List
			</BaseButton>
			<BaseButton
				@click="showTestRewardsModal = true"
				variant="secondary"
				:disabled="!rewardDocuments?.length">
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
			v-if="selectedCrate && rewardDocuments && rewardDocuments.length > 0"
			class="flex items-center justify-between gap-4 mb-4">
			<BaseButton @click="startAddItem" variant="primary" data-cy="add-item-button">
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
						data-cy="sort-by-value"
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
						data-cy="sort-by-weight"
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
			<div v-if="rewardDocuments?.length" class="bg-white rounded-lg" data-cy="item-list">
				<div class="px-6 py-4 bg-gray-asparagus border-b-2 border-white">
					<h3 class="text-xl font-semibold text-white">Reward Items</h3>
				</div>

				<div v-if="rewardItemsPending" class="p-6 text-gray-600">
					Loading reward items...
				</div>
				<div v-else>
					<div class="divide-y-2 divide-white">
						<div
							v-for="rewardDoc in sortedRewardDocuments"
							:key="rewardDoc.id"
							class="pr-6 bg-norway"
							data-cy="item-row">
							<!-- Multi-item indicator badge -->
							<div
								v-if="isMultiItemReward(rewardDoc)"
								class="px-4 py-1 bg-blue-100 border-b border-white">
								<span class="text-xs font-medium text-blue-800">
									⚠️ Multi-item reward (imported from YAML, read-only)
								</span>
							</div>
							<div class="flex items-stretch justify-between">
								<div class="flex-1">
									<div class="flex items-stretch gap-4">
										<div
											class="w-16 bg-highland border-r-2 border-white flex items-center justify-center">
											<img
												v-if="getDisplayItemImageFromDoc(rewardDoc)"
												:src="
													getImageUrl(
														getDisplayItemImageFromDoc(rewardDoc)
													)
												"
												:alt="rewardDoc.display_name"
												loading="lazy"
												decoding="async"
												fetchpriority="low"
												class="max-w-10 max-h-10" />
											<QuestionMarkCircleIcon
												v-else
												class="w-8 h-8 text-white" />
										</div>
										<div class="flex-1 flex items-center justify-between">
											<div class="pt-2 pb-3">
												<h4 class="text-base font-semibold text-gray-900">
													{{
														stripColorCodes(
															rewardDoc.display_name ||
																'Unknown Reward'
														)
													}}
												</h4>
												<div class="text-sm text-heavy-metal">
													<span class="font-medium">Value:</span>
													{{ getValueDisplay(rewardDoc) }}
												</div>
												<!-- Items list (only for multi-item rewards) -->
												<div
													v-if="
														isMultiItemReward(rewardDoc) &&
														rewardDoc.items &&
														rewardDoc.items.length > 0
													"
													class="mt-2">
													<div
														class="text-sm text-heavy-metal font-medium mb-1">
														Contains {{ rewardDoc.items.length }} items:
													</div>
													<div class="space-y-1">
														<div
															v-for="(item, idx) in rewardDoc.items"
															:key="idx"
															class="text-sm text-heavy-metal flex items-center gap-2">
															<span>
																• {{ item.quantity }}x
																{{
																	getItemById(item.item_id)
																		?.name || 'Unknown'
																}}
															</span>
														</div>
													</div>
												</div>

												<!-- Commands Display -->
												<div
													v-if="
														rewardDoc.commands &&
														rewardDoc.commands.length > 0
													"
													class="text-sm text-heavy-metal">
													<span class="font-medium">Commands:</span>
													<div class="mt-1 space-y-1">
														<div
															v-for="(
																command, index
															) in rewardDoc.commands"
															:key="index"
															class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
															{{ command }}
														</div>
													</div>
												</div>
												<!-- Enchantments Display -->
												<div
													v-if="
														rewardDoc.display_enchantments &&
														getEnchantmentIds(
															rewardDoc.display_enchantments
														).length > 0
													"
													class="mt-1">
													<div class="flex flex-wrap gap-1">
														<span
															v-for="enchantmentId in getEnchantmentIds(
																rewardDoc.display_enchantments
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
														@click="toggleReviewPanel(rewardDoc.id)"
														class="flex items-center gap-2 text-sm text-heavy-metal hover:text-gray-800 transition-colors">
														<svg
															:class="[
																'w-4 h-4 transition-transform',
																isReviewPanelExpanded(rewardDoc.id)
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
															isReviewPanelExpanded(rewardDoc.id)
																? 'Hide'
																: 'Show'
														}}
														YAML Preview
													</button>

													<pre
														v-if="isReviewPanelExpanded(rewardDoc.id)"
														class="mt-3 text-xs bg-white p-3 rounded border overflow-x-auto"><code>{{ getYamlPreview(rewardDoc) }}</code></pre>
												</div>
											</div>
											<!-- Weight and Chance Boxes -->
											<div class="flex gap-2">
												<div
													class="bg-blue-50 border-2 border-gray-asparagus rounded flex items-stretch">
													<button
														@click="decreaseRewardWeight(rewardDoc)"
														class="flex items-center justify-center px-1 py-1 bg-sea-mist hover:bg-saltpan transition-colors rounded-l border-r-2 border-gray-asparagus min-w-[2rem]"
														title="Decrease weight by 10">
														<MinusIcon
															class="w-4 h-4 text-heavy-metal" />
													</button>
													<div
														v-if="editingWeightId !== rewardDoc.id"
														@click="startEditWeight(rewardDoc)"
														class="flex items-center justify-center px-1 py-1 text-center cursor-pointer bg-norway hover:bg-saltpan transition-colors min-w-[2.5rem] border-r-2 border-gray-asparagus">
														<span
															class="text-base font-bold text-heavy-metal">
															{{ rewardDoc.weight }}
														</span>
													</div>
													<input
														v-else
														:ref="
															(el) =>
																(weightInputRefs[rewardDoc.id] = el)
														"
														v-model="editingWeightValue"
														type="number"
														min="1"
														@blur="saveWeight(rewardDoc)"
														@keyup.enter="saveWeight(rewardDoc)"
														@keydown.escape="cancelEditWeight"
														class="px-1 py-1 text-center text-base font-semibold text-heavy-metal focus:outline-none focus:ring-2 focus:ring-blue-500 w-10 border-r-2 border-gray-asparagus bg-norway [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
														autofocus />
													<button
														@click="increaseRewardWeight(rewardDoc)"
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
														{{
															getRewardDocChance(rewardDoc).toFixed(
																1
															)
														}}%
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div class="flex items-center gap-2 ml-8">
									<button
										v-if="canEditReward(rewardDoc)"
										@click="startEditReward(rewardDoc)"
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
										title="Edit reward"
										data-cy="edit-item-button">
										<PencilIcon class="w-4 h-4" />
									</button>
									<button
										v-else
										disabled
										class="p-1 bg-gray-300 text-gray-500 cursor-not-allowed rounded"
										title="Cannot edit multi-item rewards (imported from YAML)">
										<PencilIcon class="w-4 h-4" />
									</button>
									<button
										@click="confirmRemoveReward(rewardDoc)"
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
										title="Delete reward"
										data-cy="delete-item-button">
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
			v-if="selectedCrate && !rewardItemsPending && !rewardDocuments?.length"
			class="bg-white rounded-lg pt-6 pr-6 pb-6"
			data-cy="empty-items-message">
			<div class="text-gray-600">
				<p class="text-lg font-medium mb-2">No items added yet</p>
				<p class="text-sm">Click "Add Item" to get started with your crate rewards.</p>
			</div>
		</div>

		<!-- Add Item Button -->
		<div v-if="selectedCrate" class="mt-4 flex justify-start">
			<BaseButton @click="startAddItem" variant="primary" data-cy="add-item-button">
				<template #left-icon>
					<PlusIcon class="w-5 h-5" />
				</template>
				Add Item
			</BaseButton>
		</div>

		<!-- Clear All Rewards Link -->
		<div v-if="selectedCrate && rewardDocuments?.length" class="mt-4 flex justify-start">
			<button
				@click="showClearAllConfirmation"
				:disabled="loading"
				class="inline-flex items-center text-sm text-gray-600 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				data-cy="clear-all-items-button">
				<TrashIcon class="w-4 h-4 mr-1" />
				Clear all items
			</button>
		</div>

		<!-- Edit Crate Reward Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showEditForm"
			title="Edit Crate"
			maxWidth="max-w-md"
			@close="showEditForm = false; editFormError = null; editNameValidationError = null">

			<form @submit.prevent="updateCrateRewardData" class="space-y-4">
				<div>
					<label
						for="edit-crate-name"
						class="block text-sm font-medium text-gray-700 mb-1">
						Name *
					</label>
					<div class="relative">
					<input
						id="edit-crate-name"
						v-model="crateForm.name"
						type="text"
						required
						data-cy="crate-name-input"
						:class="[
							'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans pr-10',
							editNameValidationError 
								? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]"
						@blur="checkEditCrateNameAvailability(crateForm.name)"
						@input="editNameValidationError = null; editFormError = null" />
						
						<!-- Loading spinner -->
						<div v-if="isCheckingEditName" class="absolute right-3 top-1/2 transform -translate-y-1/2">
							<div class="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
						</div>
					</div>
					
					<!-- Name validation error -->
					<div v-if="editNameValidationError" class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ editNameValidationError }}
					</div>
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
					data-cy="crate-description-input"
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
					data-cy="crate-version-select"
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
							@click="showEditForm = false; editFormError = null; editNameValidationError = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="updateCrateRewardData"
							:disabled="loading"
							variant="primary"
							data-cy="crate-update-button">
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
			:title="editingRewardDoc ? 'Edit Reward' : 'Add Item to Crate Reward'"
			maxWidth="max-w-2xl"
			@close="showAddItemForm = false; editingRewardDoc = null; addItemFormError = null">

			<form @submit.prevent="saveItem" class="space-y-4">
				<!-- Item selection -->
				<div v-if="!editingRewardDoc">
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
							data-cy="item-search-input"
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans" />

						<!-- Error message for item selection -->
						<div
							v-if="addItemFormError && addItemFormError === 'Please select an item'"
							class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1"
							data-cy="item-search-error">
							<XCircleIcon class="w-4 h-4" />
							{{ addItemFormError }}
						</div>

						<!-- Item selection dropdown -->
						<div
							v-if="searchQuery && filteredItems.length > 0"
							ref="dropdownContainer"
							class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white"
							data-cy="item-search-results">
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
					v-else-if="editingRewardDoc"
					class="p-3 bg-gray-100 border border-gray-300 rounded">
					<div class="flex items-center justify-between">
						<div>
							<div class="font-medium">
								{{ stripColorCodes(getItemById(itemForm.item_id)?.name || editingRewardDoc.display_name || 'Unknown Item') }}
							</div>
							<div class="text-sm text-gray-600">
								{{ getItemById(editingRewardDoc.display_item)?.material_id || editingRewardDoc.display_item || itemForm.item_id }}
							</div>
						</div>
						<div class="w-8 h-8 flex items-center justify-center">
							<img
								v-if="getItemById(itemForm.item_id)?.image"
								:src="getImageUrl(getItemById(itemForm.item_id).image)"
								:alt="getItemById(itemForm.item_id).name"
								loading="lazy"
								decoding="async"
								fetchpriority="low"
								class="max-w-full max-h-full object-contain" />
							<QuestionMarkCircleIcon v-else class="w-6 h-6 text-gray-600" />
						</div>
					</div>
				</div>

				<div class="space-y-4">
					<!-- Quantity field - only show for item-based rewards -->
					<div v-if="!editingRewardDoc || (editingRewardDoc.items && editingRewardDoc.items.length > 0)">
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
								data-cy="item-quantity-input"
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
							class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1"
							data-cy="item-quantity-error">
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
							data-cy="item-weight-input"
							:class="[
								'block w-20 rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
								addItemFormError && addItemFormError.includes('weight') 
									? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
									: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
							]" />
						<div
							v-if="addItemFormError && addItemFormError.includes('weight')"
							class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1"
							data-cy="item-weight-error">
							<XCircleIcon class="w-4 h-4" />
							Weight must be at least 1
						</div>
					</div>
				</div>

				<!-- Value Source Section -->
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Value Source
						</label>
						<div class="space-y-2">
							<label class="flex items-center cursor-pointer">
								<input
									v-model="itemForm.value_source"
									type="radio"
									value="catalog"
									class="mr-2 radio-input" />
								<span class="text-sm text-gray-700">Use price guide</span>
							</label>
							<label class="flex items-center cursor-pointer">
								<input
									v-model="itemForm.value_source"
									type="radio"
									value="custom"
									class="mr-2 radio-input" />
								<span class="text-sm text-gray-700">Set custom value</span>
							</label>
						</div>
					</div>

					<!-- Custom Value Input (only show when custom is selected) -->
					<div v-if="itemForm.value_source === 'custom'">
						<label class="block text-sm font-medium text-gray-700 mb-1">
							Custom Value *
						</label>
						<input
							v-model.number="itemForm.custom_value"
							type="number"
							min="0"
							step="0.01"
							:class="[
								'block w-32 rounded border-2 px-3 py-1 text-gray-900 focus:ring-2 font-sans',
								addItemFormError && addItemFormError.includes('custom_value') 
									? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
									: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
							]" />
						<div
							v-if="addItemFormError && addItemFormError.includes('custom_value')"
							class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
							<XCircleIcon class="w-4 h-4" />
							Custom value is required when using custom pricing
						</div>
					</div>
				</div>

				<!-- Enchantments Section - only show for item-based rewards -->
				<div v-if="!editingRewardDoc || (editingRewardDoc.items && editingRewardDoc.items.length > 0)" class="mt-4">
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
							@click="showAddItemForm = false; editingRewardDoc = null; addItemFormError = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton @click="saveItem" :disabled="loading" variant="primary" data-cy="item-submit-button">
							{{ loading ? 'Saving...' : editingRewardDoc ? 'Update' : 'Add' }}
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
			title="Import Crate"
			maxWidth="max-w-md"
			@close="closeImportModal">
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
						Upload a complete CrazyCrates YAML file with
						<code>Crate: { Prizes: {} }</code>
						format.
					</p>
				</div>

				<!-- Error Display -->
				<div v-if="importModalError" class="p-3 bg-red-50 border-l-4 border-l-red-500">
					<div class="flex items-start">
						<ExclamationTriangleIcon class="w-6 h-6 text-red-600 mr-2 flex-shrink-0" />
						<div>
							<div class="text-heavy-metal font-medium">Import failed</div>
							<div class="text-heavy-metal text-sm mt-1">
								{{ importModalError.replace('Import failed: ', '') }}
							</div>
						</div>
					</div>
				</div>

				<!-- Import Results -->
				<div v-if="importResult" class="space-y-3">
					<!-- Success Message -->
					<div
						v-if="importResult.success"
						class="p-3 bg-semantic-success-light border-l-4 border-l-semantic-success">
						<div class="flex items-start">
							<CheckCircleIcon class="w-6 h-6 text-heavy-metal mr-2 flex-shrink-0" />
							<div>
								<div class="text-heavy-metal font-medium">
									Import completed successfully!
								</div>
								<div class="text-heavy-metal text-sm mt-1">
									{{ importResult.importedCount }} of
									{{ importResult.totalPrizes }} prizes imported
									<span v-if="importResult.errorCount > 0">
										({{ importResult.errorCount }} failed)
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Warnings -->
					<div
						v-if="importResult.warnings && importResult.warnings.length > 0"
						class="p-3 bg-yellow-50 border-l-4 border-l-yellow-400 rounded">
						<div class="flex items-start">
							<ExclamationTriangleIcon
								class="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
							<div class="flex-1">
								<div class="text-yellow-800 font-medium mb-2">
									Warnings ({{ importResult.warningCount }}):
								</div>
								<div
									class="text-yellow-700 text-sm space-y-1 max-h-32 overflow-y-auto">
									<div v-for="warning in importResult.warnings" :key="warning">
										• {{ warning }}
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Errors -->
					<div
						v-if="importResult.errors && importResult.errors.length > 0"
						class="p-3 bg-red-50 border-l-4 border-l-red-400 rounded">
						<div class="flex items-start">
							<ExclamationTriangleIcon
								class="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
							<div class="flex-1">
								<div class="text-red-800 font-medium mb-2">
									Errors ({{ importResult.errorCount }}):
								</div>
								<div
									class="text-red-700 text-sm space-y-1 max-h-32 overflow-y-auto">
									<div v-for="error in importResult.errors" :key="error">
										• {{ error }}
									</div>
								</div>
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
							class="btn-secondary--outline"
							data-cy="cancel-delete-item-button">
							Cancel
						</button>
						<BaseButton
							@click="executeDelete"
							:disabled="loading"
							variant="primary"
							class="bg-semantic-danger hover:bg-opacity-90"
							data-cy="confirm-delete-item-button">
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
						{{ rewardDocuments?.length || 0 }} rewards.
					</p>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end p-4">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="showClearAllModal = false"
							class="btn-secondary--outline"
							data-cy="cancel-clear-all-button">
							Cancel
						</button>
						<BaseButton
							@click="clearAllRewards"
							:disabled="loading"
							variant="primary"
							class="bg-semantic-danger hover:bg-opacity-90"
							data-cy="confirm-clear-all-button">
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
							:disabled="!rewardDocuments?.length || isSimulating"
							variant="primary">
							Open 1 Crate
						</BaseButton>
						<BaseButton
							@click="simulateMultipleOpens(10)"
							:disabled="!rewardDocuments?.length || isSimulating"
							variant="primary">
							Open 10 Crates
						</BaseButton>
						<BaseButton
							@click="simulateMultipleOpens(50)"
							:disabled="!rewardDocuments?.length || isSimulating"
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
										v-if="getDisplayItemImageFromDoc(result.item)"
										:src="getImageUrl(getDisplayItemImageFromDoc(result.item))"
										:alt="result.item.display_name"
										loading="lazy"
										decoding="async"
										fetchpriority="low"
										class="max-w-6 max-h-6 object-contain" />
									<QuestionMarkCircleIcon v-else class="w-6 h-6 text-white" />
									<div class="flex-1 min-w-0">
										<div class="text-xs font-medium text-gray-900 truncate">
											{{
												result.item.display_name ||
												result.itemData?.name ||
												'Unknown'
											}}
											<span
												v-if="
													result.item.display_enchantments &&
													getEnchantmentIds(
														result.item.display_enchantments
													).length > 0
												"
												class="text-blue-600">
												(enchanted)
											</span>
										</div>
										<div class="text-xs text-gray-500">
											{{ getRewardDocChance(result.item).toFixed(1) }}% chance
										</div>
										<!-- Multi-item indicator -->
										<div
											v-if="isMultiItemReward(result.item)"
											class="text-xs text-blue-600 font-medium">
											{{ result.item.items.length }} items
										</div>
										<!-- Enchantments Display -->
										<div
											v-if="
												result.item.display_enchantments &&
												getEnchantmentIds(result.item.display_enchantments)
													.length > 0
											"
											class="mt-1">
											<div class="flex flex-wrap gap-x-2 gap-y-1">
												<span
													v-for="enchantmentId in getEnchantmentIds(
														result.item.display_enchantments
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

<style scoped>
.radio-input {
	@apply w-5 h-5;
	accent-color: theme('colors.gray-asparagus');
}
</style>
