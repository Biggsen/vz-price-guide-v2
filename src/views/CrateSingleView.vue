<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
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
	validateYamlForMultipleItems
} from '../utils/crateRewards.js'
import { getEffectivePrice } from '../utils/pricing.js'
import { getImageUrl, getItemImageUrl } from '../utils/image.js'
import { isItemEnchantable, getEnchantmentIds } from '../utils/enchantments.js'
import { stripColorCodes } from '../utils/minecraftText.js'
import {
	getEnchantmentDefsForVersion,
	buildAllowedEnchantmentMaxLevels,
	isEnchantmentItemAllowedForVersion,
	parseEnchantedBookMaterialId,
	extractEnchantmentsFromMaterialId
} from '../utils/enchantmentVersioning.js'
import { versions, enabledCategories, baseEnabledVersions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { useCategorizedItemSearch } from '../composables/useCategorizedItemSearch.js'
import { useEnchantmentSearch } from '../composables/useEnchantmentSearch.js'
import BaseButton from '../components/BaseButton.vue'
import CrateRewardItemRow from '../components/CrateRewardItemRow.vue'
import CrateRewardItemFormModal from '../components/CrateRewardItemFormModal.vue'
import CrateEditModal from '../components/CrateEditModal.vue'
import CrateImportModal from '../components/CrateImportModal.vue'
import RewardItemDeleteConfirmationModal from '../components/RewardItemDeleteConfirmationModal.vue'
import CrateClearAllModal from '../components/CrateClearAllModal.vue'
import CrateTestRewardsModal from '../components/CrateTestRewardsModal.vue'
import {
	PlusIcon,
	PencilIcon,
	TrashIcon,
	ArrowDownTrayIcon,
	ArrowUpTrayIcon,
	ArrowLeftIcon,
	ClipboardIcon,
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
const { canEditItems, isAdmin } = useAdmin()

// Computed property for enabled versions based on user type
const enabledVersions = computed(() => {
	try {
		// Admin users can access all versions (but only if admin status is fully loaded)
		if (user.value?.email && isAdmin.value === true) {
			return [...(versions || ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21'])]
		}
		// Regular users only get base enabled versions
		return [...baseEnabledVersions]
	} catch (error) {
		// Fallback to base enabled versions if anything goes wrong
		console.warn('Error in enabledVersions computed:', error)
		return [...baseEnabledVersions]
	}
})

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
	enchantments: [],
	value_source: 'catalog',
	custom_value: null
})

// Item search state
const searchInput = ref(null)

// Weight editing state
const editingWeightId = ref(null)
const editingWeightValue = ref('')
const weightInputRefs = ref({})

function setWeightInputRef(id, el) {
	if (!el) return
	weightInputRefs.value[id] = el
}

// Sorting state
const sortBy = ref('none')
const sortDirection = ref('asc')

// Simulation state
const simulationResults = ref([])
const isSimulating = ref(false)
const showTestRewardsModal = ref(false)

// Enchantment state (Shop Manager-style search)
const enchantmentSearchInput = ref(null)

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
} = useCrateReward(selectedCrateId)

// Get items for selected crate reward
const {
	rewardDocuments,
	pending: rewardItemsPending,
} = useCrateRewardItems(selectedCrateId)

// Watch for when rewardDocuments data is loaded
watch(
	rewardDocuments,
	(newRewardDocuments) => {
		if (newRewardDocuments && newRewardDocuments.length > 0) {
			// Reward documents loaded successfully
		}
	},
	{ immediate: true }
)

// Computed properties
const selectedCrate = computed(() => crateReward.value)
const currentVersion = computed(() => {
	const version = selectedCrate.value?.minecraft_version || '1.21'
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

const {
	searchQuery,
	highlightedIndex,
	dropdownContainer,
	filteredItems,
	itemsByCategory,
	handleKeyDown,
	handleSearchInput,
	getItemVisualIndex
} = useCategorizedItemSearch({ items: availableItems, onSelect: selectItem })

// Selected item for display
const selectedItem = computed(
	() => availableItems.value.find((item) => item.id === itemForm.value.item_id) || null
)

// Enchantment items (raw)
const allEnchantmentItems = computed(() => {
	if (!allItems.value) return []
	return allItems.value.filter((item) => item.category === 'enchantments')
})

const enchantmentDefsForVersion = computed(() => {
	const version = selectedCrate.value?.minecraft_version || '1.20'
	return getEnchantmentDefsForVersion(version)
})

const allowedEnchantmentMaxLevels = computed(() => {
	return buildAllowedEnchantmentMaxLevels(enchantmentDefsForVersion.value.defs, allEnchantmentItems.value)
})

// Enchantment items for selection (version + maxLevel filtered)
const enchantmentItems = computed(() => {
	return allEnchantmentItems.value.filter((item) =>
		isEnchantmentItemAllowedForVersion(item, allowedEnchantmentMaxLevels.value)
	)
})

const selectedItemForEnchantments = computed(() => getItemById(itemForm.value.item_id))
const isBaseEnchantedBookSelected = computed(
	() => selectedItemForEnchantments.value?.material_id === 'enchanted_book'
)
const isSelectedItemEnchantable = computed(() => {
	if (!selectedItemForEnchantments.value) return false
	if (isBaseEnchantedBookSelected.value) return true
	return isItemEnchantable(selectedItemForEnchantments.value)
})
const hasSelectedEnchantments = computed(
	() => getEnchantmentIds(itemForm.value.enchantments).length > 0
)
const showEnchantmentsSection = computed(() => {
	if (!itemForm.value.item_id) return false
	return isSelectedItemEnchantable.value || hasSelectedEnchantments.value
})
const canAddEnchantments = computed(() => isSelectedItemEnchantable.value)
const {
	searchQuery: enchantmentSearchQuery,
	highlightedIndex: enchantmentHighlightedIndex,
	dropdownContainer: enchantmentDropdownContainer,
	filteredItems: filteredEnchantments,
	handleSearchInput: handleEnchantmentSearchInput,
	handleKeyDown: handleEnchantmentKeyDown
} = useEnchantmentSearch({
	items: enchantmentItems,
	getLabel: (enchantment) => formatEnchantmentName(enchantment.id),
	onSelect: addEnchantmentToForm,
	minQueryLength: 1
})

function getEnchantmentTypeForId(enchantmentId) {
	const enchantDoc = allItems.value?.find((i) => i.id === enchantmentId)
	const parsed = parseEnchantedBookMaterialId(enchantDoc?.material_id || enchantmentId)
	return parsed?.name || null
}

function addEnchantmentToForm(enchantmentItem) {
	if (!canAddEnchantments.value) return
	if (!enchantmentItem?.id) return

	const newType = parseEnchantedBookMaterialId(enchantmentItem.material_id)?.name
	if (!newType) return

	const existing = getEnchantmentIds(itemForm.value.enchantments)
	const next = [...existing]
	const existingIndex = next.findIndex((id) => getEnchantmentTypeForId(id) === newType)

	if (existingIndex >= 0) {
		next[existingIndex] = enchantmentItem.id
	} else {
		next.push(enchantmentItem.id)
	}

	itemForm.value.enchantments = next
	enchantmentSearchQuery.value = ''
	enchantmentHighlightedIndex.value = -1
}

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
		enchantments: [],
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
	// Start editing reward document

	// Only allow editing single-item rewards
	if (!canEditReward(rewardDoc)) {
		error.value = 'Cannot edit multi-item rewards. Please re-import from YAML to modify.'
		return
	}

	// Check if reward has items
	if (rewardDoc.items && rewardDoc.items.length > 0) {
		// Extract the single item
		const singleItem = rewardDoc.items[0]

		// Convert to form format
		itemForm.value = {
			item_id: singleItem.item_id,
			quantity: singleItem.quantity,
			weight: rewardDoc.weight,
			enchantments: getEnchantmentIds(singleItem.enchantments),
			value_source: rewardDoc.value_source || 'catalog',
			custom_value: rewardDoc.custom_value || null
		}
	} else {
		// Handle rewards without items (command rewards, etc.)
		itemForm.value = {
			item_id: null, // No item ID for command rewards
			quantity: rewardDoc.display_amount || 1,
			weight: rewardDoc.weight,
			enchantments: [],
			value_source: rewardDoc.value_source || 'catalog',
			custom_value: rewardDoc.custom_value || null
		}
	}

	editingRewardDoc.value = rewardDoc
	showAddItemForm.value = true
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

async function saveItem() {
	// Save item to crate reward

	// Clear previous errors
	addItemFormError.value = null

	// Validate required fields
	if (!selectedCrateId.value) {
		addItemFormError.value = 'No crate selected'
		return
	}

	// For new items, require item selection
	if (!editingRewardDoc.value && !itemForm.value.item_id) {
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

	// Validate custom value if using custom pricing
	if (
		itemForm.value.value_source === 'custom' &&
		(!itemForm.value.custom_value || itemForm.value.custom_value < 0)
	) {
		addItemFormError.value = 'custom_value'
		return
	}

	// All validations passed, starting save process
	loading.value = true

	try {
		if (editingRewardDoc.value) {
			// Editing existing reward document
			// Check if reward has items
			const hasItems = editingRewardDoc.value.items && editingRewardDoc.value.items.length > 0
			const singleItem = hasItems ? editingRewardDoc.value.items[0] : null

			// Check if this is a catalog item or unknown item
			const isCatalogItem = getItemById(itemForm.value.item_id)

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
				const enchantmentIds = getEnchantmentIds(itemForm.value.enchantments)
				updates.items = [
					{
						...singleItem,
						// Only update item_id for catalog items, preserve original for unknown items
						item_id: isCatalogItem ? itemForm.value.item_id : singleItem.item_id,
						quantity: itemForm.value.quantity,
						enchantments: enchantmentIds
					}
				]
				updates.display_enchantments = enchantmentIds
			} else {
				// For itemless rewards, clear items and enchantments
				updates.items = []
				updates.display_enchantments = []
			}

			await updateRewardDocument(editingRewardDoc.value, updates)
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
			enchantments: [],
			value_source: 'catalog',
			custom_value: null
		}
		enchantmentSearchQuery.value = ''
		enchantmentHighlightedIndex.value = -1
	} catch (err) {
		console.error('Error in saveItem:', err)
		addItemFormError.value = 'Failed to save item: ' + err.message
	} finally {
		loading.value = false
		// saveItem() completed
	}
}

async function executeDelete() {
	if (!itemToDelete.value) return

	loading.value = true
	error.value = null

	try {
		await deleteCrateRewardItem(itemToDelete.value.id)
	} catch (err) {
		error.value = `Failed to delete reward: ` + err.message
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
				const chance = getRewardDocChance(rewardDoc).toFixed(1)
				return `${stripColorCodes(
					rewardDoc.display_name || 'Multi-item Reward'
				)} - Value: ${getValueDisplay(rewardDoc)} - Weight: ${
					rewardDoc.weight
				} - Chance: ${chance}% (${rewardDoc.items.length} items)`
			} else {
				// For single-item rewards, show details
				const singleItem = rewardDoc.items?.[0]
				const chance = getRewardDocChance(rewardDoc).toFixed(1)

				if (!singleItem) {
					return `${stripColorCodes(
						rewardDoc.display_name || 'Unknown'
					)} - Value: Unknown (No items) - Weight: ${
						rewardDoc.weight
					} - Chance: ${chance}%`
				}

				const itemData = getItemById(singleItem.item_id)
				if (!itemData) {
					return `${stripColorCodes(
						rewardDoc.display_name || 'Unknown'
					)} - Value: Unknown (Item not found) - Weight: ${
						rewardDoc.weight
					} - Chance: ${chance}%`
				}

				return `${singleItem.quantity || 1}x ${stripColorCodes(
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

			// Don't display level 1 for single-level enchantments
			const maxLevel =
				Number(enchantmentItem.enchantment_max_level) ||
				Number(allowedEnchantmentMaxLevels.value?.get(enchantName)) ||
				null
			if (level === '1' && maxLevel === 1) {
				return capitalizedEnchant
			}

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

			// Don't display level 1 for single-level enchantments
			const maxLevel =
				Number(enchantmentItem.enchantment_max_level) ||
				Number(allowedEnchantmentMaxLevels.value?.get(enchantment.toLowerCase().replace(/ /g, '_'))) ||
				null
			if (displayLevel === '1' && maxLevel === 1) {
				return capitalizedEnchantment
			}

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

// Item search functions
function selectItem(item) {
	// Selecting an item resets enchantments
	itemForm.value.enchantments = []
	enchantmentSearchQuery.value = ''
	enchantmentHighlightedIndex.value = -1

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
				extractedEnchantments.forEach((enchantment) => {
					// Find the catalog item by material_id and use its document ID
					const enchantmentMaterialId = `enchanted_book_${enchantment.id}_${enchantment.level}`
					const enchantmentItem = allItems.value.find(
						(item) => item.material_id === enchantmentMaterialId
					)
					if (enchantmentItem) {
						itemForm.value.enchantments.push(enchantmentItem.id)
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
	itemForm.value.enchantments = [] // Clear enchantments when clearing item
	enchantmentSearchQuery.value = ''
	enchantmentHighlightedIndex.value = -1
	searchQuery.value = ''
	highlightedIndex.value = -1
}

function removeEnchantment(enchantmentId) {
	itemForm.value.enchantments = itemForm.value.enchantments.filter((id) => id !== enchantmentId)
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
		const toNameLevel = (enchantmentId) => {
			const enchantDoc = allItems.value.find((i) => i.id === enchantmentId)
			const parsed = parseEnchantedBookMaterialId(enchantDoc?.material_id || enchantmentId)
			if (parsed) return parsed
			return { name: enchantmentId, level: 1 }
		}

		const sorted = [...formatted.displayEnchantments].sort((a, b) => {
			const ea = toNameLevel(a)
			const eb = toNameLevel(b)
			if (ea.name !== eb.name) return ea.name.localeCompare(eb.name)
			return (ea.level || 0) - (eb.level || 0)
		})

		sorted.forEach((enchantmentId) => {
			const { name, level } = toNameLevel(enchantmentId)
			yaml += `        - "${name}:${level || 1}"\n`
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
			validation.prizesToSkip, // prizesToSkip
			isAdmin.value // isAdmin
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
		reader.onerror = () => reject(new Error('Failed to read file'))
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
	<div class="px-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<!-- Back Button -->
			<div v-if="selectedCrate" class="mb-4 flex items-center justify-between w-full">
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
				<BaseButton
					v-if="canEditItems"
					@click="showYamlPreview = !showYamlPreview"
					:variant="showYamlPreview ? 'primary' : 'secondary'"
					class="hidden sm:inline-flex">
					{{ showYamlPreview ? 'Hide' : 'Show' }} YAML Debug
				</BaseButton>
			</div>
			<div class="flex items-center justify-between mb-4">
				<div>
					<!-- Crate Header -->
					<div v-if="selectedCrate">
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
						<div
							class="flex items-center gap-4 max-[640px]:gap-2 max-[640px]:gap-y-1 mt-2 text-sm text-gray-500 flex-wrap">
							<span>
								<span class="font-medium">Version:</span>
								{{ selectedCrate.minecraft_version }}
							</span>
							<span>
								<span class="font-medium">Total Value:</span>
								{{ Math.ceil(totalValue) }}
							</span>
							<div
								class="max-[640px]:basis-full max-[640px]:flex max-[640px]:items-center max-[640px]:gap-4">
								<span>
									<span class="font-medium">Rewards:</span>
									{{ rewardDocuments?.length || 0 }}&nbsp;
								</span>
								<span>
									<span class="font-medium">Created:</span>
									{{ formatDate(selectedCrate.created_at) }}
								</span>
							</div>
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
		<div v-if="selectedCrate" class="mb-8 flex gap-2 flex-wrap">
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
				:disabled="!rewardDocuments?.length"
				class="hidden sm:inline-flex">
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
			class="flex items-center justify-between gap-4 mb-4 flex-wrap max-[450px]:flex-col max-[450px]:items-start">
			<BaseButton @click="startAddItem" variant="primary" data-cy="add-item-button">
				<template #left-icon>
					<PlusIcon class="w-4 h-4" />
				</template>
				Add Item
			</BaseButton>
			<div
				class="flex items-center gap-4 max-[450px]:w-full max-[450px]:flex-col max-[450px]:items-start max-[450px]:gap-2">
				<span class="text-sm font-medium text-heavy-metal">Sort by:</span>
				<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
					<button
						@click="setSortBy('value')"
						data-cy="sort-by-value"
						:class="[
							sortBy === 'value'
								? 'bg-gray-asparagus text-white pl-2 pr-2 sm:pl-3 hover:bg-highland'
								: 'bg-norway text-heavy-metal hover:bg-gray-100 px-2 sm:px-4',
							'py-1 text-xs sm:text-sm font-medium transition border-r-2 border-gray-asparagus last:border-r-0 whitespace-nowrap flex-shrink-0'
						]">
						Value
						<ArrowUpIcon
							v-if="sortBy === 'value' && sortDirection === 'asc'"
							class="w-3 h-3 inline align-middle -mt-0.5 max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3" />
						<ArrowDownIcon
							v-else-if="sortBy === 'value' && sortDirection === 'desc'"
							class="w-3 h-3 inline align-middle -mt-0.5 max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3" />
						<span
							v-else
							class="hidden max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3"></span>
					</button>
					<button
						@click="setSortBy('weight')"
						data-cy="sort-by-weight"
						:class="[
							sortBy === 'weight'
								? 'bg-gray-asparagus text-white pl-2 pr-2 sm:pl-3 hover:bg-highland'
								: 'bg-norway text-heavy-metal hover:bg-gray-100 px-2 sm:px-4',
							'py-1 text-xs sm:text-sm font-medium transition border-r-2 border-gray-asparagus last:border-r-0 whitespace-nowrap flex-shrink-0'
						]">
						Weight
						<ArrowUpIcon
							v-if="sortBy === 'weight' && sortDirection === 'asc'"
							class="w-3 h-3 inline align-middle -mt-0.5 max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3" />
						<ArrowDownIcon
							v-else-if="sortBy === 'weight' && sortDirection === 'desc'"
							class="w-3 h-3 inline align-middle -mt-0.5 max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3" />
						<span
							v-else
							class="hidden max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3"></span>
					</button>
					<button
						@click="setSortBy('chance')"
						:class="[
							sortBy === 'chance'
								? 'bg-gray-asparagus text-white pl-2 pr-2 sm:pl-3 hover:bg-highland'
								: 'bg-norway text-heavy-metal hover:bg-gray-100 px-2 sm:px-4',
							'py-1 text-xs sm:text-sm font-medium transition border-r-2 border-gray-asparagus last:border-r-0 whitespace-nowrap flex-shrink-0'
						]">
						Chance
						<ArrowUpIcon
							v-if="sortBy === 'chance' && sortDirection === 'asc'"
							class="w-3 h-3 inline align-middle -mt-0.5 max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3" />
						<ArrowDownIcon
							v-else-if="sortBy === 'chance' && sortDirection === 'desc'"
							class="w-3 h-3 inline align-middle -mt-0.5 max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3" />
						<span
							v-else
							class="hidden max-[640px]:inline-block max-[640px]:w-3 max-[640px]:h-3"></span>
					</button>
					<button
						@click="setSortBy('none')"
						:class="[
							sortBy === 'none'
								? 'bg-gray-asparagus text-white'
								: 'bg-norway text-heavy-metal hover:bg-gray-100',
							'px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0'
						]">
						None
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Selected Crate Reward -->
	<div v-if="selectedCrate" class="space-y-6">
		<!-- Reward Items -->
		<div
			v-if="rewardDocuments?.length"
			class="bg-white rounded-lg max-[640px]:border-x-2 max-[640px]:border-white sm:px-4 sm:pb-4"
			data-cy="item-list">
			<div
				class="px-6 max-[640px]:px-4 py-4 max-[640px]:py-2 bg-gray-asparagus border-b-2 border-white">
				<h3 class="text-base sm:text-xl font-semibold text-white">Reward Items</h3>
			</div>

			<div v-if="rewardItemsPending" class="p-6 text-gray-600">Loading reward items...</div>
			<div v-else>
				<div class="divide-y-2 divide-white">
					<CrateRewardItemRow
						v-for="rewardDoc in sortedRewardDocuments"
						:key="rewardDoc.id"
						:rewardDoc="rewardDoc"
						:canEdit="canEditReward(rewardDoc)"
						:isMultiItem="isMultiItemReward(rewardDoc)"
						:showYamlPreview="showYamlPreview"
						:getDisplayItemImageFromDoc="getDisplayItemImageFromDoc"
						:getValueDisplay="getValueDisplay"
						:getRewardDocChance="getRewardDocChance"
						:getItemById="getItemById"
						:formatEnchantmentName="formatEnchantmentName"
						:getYamlPreview="getYamlPreview"
						:toggleReviewPanel="toggleReviewPanel"
						:isReviewPanelExpanded="isReviewPanelExpanded"
						:editingWeightId="editingWeightId"
						:editingWeightValue="editingWeightValue"
						:setWeightInputRef="setWeightInputRef"
						:startEditWeight="startEditWeight"
						:saveWeight="saveWeight"
						:cancelEditWeight="cancelEditWeight"
						:increaseRewardWeight="increaseRewardWeight"
						:decreaseRewardWeight="decreaseRewardWeight"
						@update:editingWeightValue="editingWeightValue = $event"
						@edit="startEditReward"
						@delete="confirmRemoveReward" />
				</div>
			</div>
		</div>
	</div>

	<!-- Empty State Message -->
	<div
		v-if="selectedCrate && !rewardItemsPending && !rewardDocuments?.length"
		class="bg-white rounded-lg pt-6 pb-6 px-4"
		data-cy="empty-items-message">
		<div class="text-gray-600">
			<p class="text-lg font-medium mb-2">No items added yet</p>
			<p class="text-sm">Click "Add Item" to get started with your crate rewards.</p>
		</div>
	</div>

	<!-- Add Item Button -->
	<div v-if="selectedCrate" class="mt-4 flex justify-start px-4">
		<BaseButton @click="startAddItem" variant="primary" data-cy="add-item-button">
			<template #left-icon>
				<PlusIcon class="w-5 h-5" />
			</template>
			Add Item
		</BaseButton>
	</div>

	<!-- Clear All Rewards Link -->
	<div v-if="selectedCrate && rewardDocuments?.length" class="mt-4 flex justify-start px-4">
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
	<CrateEditModal
		:isOpen="showEditForm"
		v-model:crateForm="crateForm"
		:enabledVersions="enabledVersions"
		:editNameValidationError="editNameValidationError"
		:isCheckingEditName="isCheckingEditName"
		:loading="loading"
		:checkEditCrateNameAvailability="checkEditCrateNameAvailability"
		:updateCrateRewardData="updateCrateRewardData"
		@close="showEditForm = false; editFormError = null; editNameValidationError = null" />

	<!-- Add/Edit Item Modal -->
	<CrateRewardItemFormModal
		:isOpen="showAddItemForm"
		:editingRewardDoc="editingRewardDoc"
		:itemForm="itemForm"
		:selectedItem="selectedItem"
		:searchQuery="searchQuery"
		:filteredItems="filteredItems"
		:itemsByCategory="itemsByCategory"
		:highlightedIndex="highlightedIndex"
		:getItemVisualIndex="getItemVisualIndex"
		:showEnchantmentsSection="showEnchantmentsSection"
		:canAddEnchantments="canAddEnchantments"
		:enchantmentSearchQuery="enchantmentSearchQuery"
		:filteredEnchantments="filteredEnchantments"
		:enchantmentHighlightedIndex="enchantmentHighlightedIndex"
		:addItemFormError="addItemFormError"
		:loading="loading"
		:getItemById="getItemById"
		:formatEnchantmentName="formatEnchantmentName"
		:handleSearchInput="handleSearchInput"
		:handleKeyDown="handleKeyDown"
		:selectItem="selectItem"
		:clearSelectedItem="clearSelectedItem"
		:handleEnchantmentSearchInput="handleEnchantmentSearchInput"
		:handleEnchantmentKeyDown="handleEnchantmentKeyDown"
		:addEnchantmentToForm="addEnchantmentToForm"
		:removeEnchantment="removeEnchantment"
		:setQuantityToStack="setQuantityToStack"
		:saveItem="saveItem"
		@update:searchQuery="searchQuery = $event"
		@update:enchantmentSearchQuery="enchantmentSearchQuery = $event"
		@update:itemForm="itemForm = $event"
		@close="showAddItemForm = false; editingRewardDoc = null; addItemFormError = null" />

	<!-- Import YAML Modal -->
	<CrateImportModal
		:isOpen="showImportModal"
		:importFile="importFile"
		:importResult="importResult"
		:importModalError="importModalError"
		:isImporting="isImporting"
		:handleFileSelect="handleFileSelect"
		:importYamlFile="importYamlFile"
		@close="closeImportModal" />

	<!-- Delete Confirmation Modal -->
	<RewardItemDeleteConfirmationModal
		:isOpen="showDeleteModal"
		:itemToDelete="itemToDelete"
		:loading="loading"
		:executeDelete="executeDelete"
		@close="showDeleteModal = false; itemToDelete = null" />

	<!-- Clear All Confirmation Modal -->
	<CrateClearAllModal
		:isOpen="showClearAllModal"
		:rewardCount="rewardDocuments?.length || 0"
		:loading="loading"
		:clearAllRewards="clearAllRewards"
		@close="showClearAllModal = false" />

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
	<CrateTestRewardsModal
		:isOpen="showTestRewardsModal"
		:rewardDocuments="rewardDocuments"
		:simulationResults="simulationResults"
		:isSimulating="isSimulating"
		:getDisplayItemImageFromDoc="getDisplayItemImageFromDoc"
		:getRewardDocChance="getRewardDocChance"
		:isMultiItemReward="isMultiItemReward"
		:formatEnchantmentName="formatEnchantmentName"
		:simulateCrateOpen="simulateCrateOpen"
		:simulateMultipleOpens="simulateMultipleOpens"
		:clearSimulationResults="clearSimulationResults"
		@close="showTestRewardsModal = false" />
</template>

<style scoped>
.radio-input {
	@apply w-5 h-5;
	accent-color: theme('colors.gray-asparagus');
}
</style>
