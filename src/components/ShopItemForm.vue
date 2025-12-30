<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getEffectivePrice } from '../utils/pricing.js'
import { disabledCategories, enabledCategories } from '../constants.js'
import { getMajorMinorVersion } from '../utils/serverProfile.js'
import {
	isItemEnchantable,
	getCompatibleEnchantments,
	hasEnchantmentConflict,
	getEnchantmentConflictReason
} from '../utils/enchantments.js'
import BaseButton from './BaseButton.vue'
import BaseModal from './BaseModal.vue'
import { XCircleIcon } from '@heroicons/vue/20/solid'
import { ArchiveBoxIcon, ArchiveBoxXMarkIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
	availableItems: {
		type: Array,
		default: () => []
	},
	editingItem: {
		type: Object,
		default: null
	},
	server: {
		type: Object,
		required: true
	},
	shop: {
		type: Object,
		default: null
	},
	displayVariant: {
		type: String,
		default: 'card',
		validator: (value) => ['card', 'modal'].includes(value)
	}
})

const emit = defineEmits(['submit', 'cancel'])

// Form data
const formData = ref({
	item_id: '',
	buy_price: null,
	sell_price: null,
	stock_quantity: null,
	stock_full: false,
	notes: '',
	enchantments: []
})

// Form state
const formError = ref(null)
const searchQuery = ref('')
const highlightedIndex = ref(-1)
const searchInput = ref(null)
const dropdownContainer = ref(null)
const buyPriceInput = ref(null)
const enableMultipleSelection = ref(false) // Toggle for multiple selection mode
const selectedItemIds = ref([]) // Track multiple selected items

// Enchantment state
const enchantmentSearchQuery = ref('')
const enchantmentHighlightedIndex = ref(-1)
const enchantmentSearchInput = ref(null)
const enchantmentDropdownContainer = ref(null)
const enchantmentError = ref(null)

// Auto-focus search input when form is shown for adding new items
function focusSearchInput() {
	if (searchInput.value) {
		searchInput.value.focus()
	}
}

// Reset form data
function resetForm() {
	formData.value = {
		item_id: '',
		buy_price: null,
		sell_price: null,
		stock_quantity: null,
		stock_full: false,
		notes: '',
		enchantments: []
	}
	searchQuery.value = ''
	formError.value = null
	highlightedIndex.value = -1
	enableMultipleSelection.value = false
	selectedItemIds.value = []
	enchantmentSearchQuery.value = ''
	enchantmentHighlightedIndex.value = -1
	enchantmentError.value = null
}

// Initialize form when editing
onMounted(() => {
	if (props.editingItem) {
		formData.value = {
			item_id: props.editingItem.item_id,
			buy_price: props.editingItem.buy_price,
			sell_price: props.editingItem.sell_price,
			stock_quantity: props.editingItem.stock_quantity,
			stock_full: props.editingItem.stock_full || false,
			notes: props.editingItem.notes || '',
			enchantments: Array.isArray(props.editingItem.enchantments)
				? [...props.editingItem.enchantments]
				: []
		}
	} else {
		resetForm()
		// Focus search input for new items
		setTimeout(() => {
			focusSearchInput()
		}, 100)
	}
})

// Watch for editing item changes
watch(
	() => props.editingItem,
	(newEditingItem) => {
		if (newEditingItem) {
			formData.value = {
				item_id: newEditingItem.item_id,
				buy_price: newEditingItem.buy_price,
				sell_price: newEditingItem.sell_price,
				stock_quantity: newEditingItem.stock_quantity,
				stock_full: newEditingItem.stock_full || false,
				notes: newEditingItem.notes || '',
				enchantments: Array.isArray(newEditingItem.enchantments)
					? [...newEditingItem.enchantments]
					: []
			}
		} else {
			resetForm()
			// Focus search input when switching to add mode
			setTimeout(() => {
				focusSearchInput()
			}, 100)
		}
	}
)

// Computed properties
const selectedItem = computed(() => {
	// When editing, use itemData from editingItem if available
	if (props.editingItem && props.editingItem.itemData && formData.value.item_id === props.editingItem.item_id) {
		return props.editingItem.itemData
	}
	// Otherwise, look up in availableItems
	return props.availableItems.find((item) => item.id === formData.value.item_id) || null
})

const selectedItems = computed(() => {
	return props.availableItems.filter((item) => selectedItemIds.value.includes(item.id))
})

const isModalVariant = computed(() => props.displayVariant === 'modal')

// Get all enchantment items
const allEnchantmentItems = computed(() => {
	if (!props.availableItems) return []
	return props.availableItems.filter((item) => item.category === 'enchantments')
})

// Get compatible enchantments for selected item
const compatibleEnchantments = computed(() => {
	if (!selectedItem.value || !allEnchantmentItems.value.length) return []
	
	// Hide enchantments for enchanted books themselves
	if (selectedItem.value.category === 'enchantments') return []
	
	// Filter to only compatible enchantments
	return getCompatibleEnchantments(selectedItem.value, allEnchantmentItems.value)
})

// Filter enchantments by search query
const filteredEnchantments = computed(() => {
	if (!enchantmentSearchQuery.value || enchantmentSearchQuery.value.length < 1) return []
	
	const query = enchantmentSearchQuery.value.toLowerCase().trim()
	return compatibleEnchantments.value.filter((enchantment) => {
		const name = formatEnchantmentName(enchantment.id).toLowerCase()
		return name.includes(query)
	})
})

// Check if enchantment section should be shown
const showEnchantmentSection = computed(() => {
	if (!selectedItem.value) return false
	
	// Hide for enchanted books themselves
	if (selectedItem.value.category === 'enchantments') return false
	
	// Show if item is enchantable
	return isItemEnchantable(selectedItem.value)
})

// Calculate profit margin when both prices are available
const profitMargin = computed(() => {
	const buyPrice = formData.value.buy_price
	const sellPrice = formData.value.sell_price

	if (!buyPrice || !sellPrice || buyPrice === 0) {
		return null
	}

	const profit = buyPrice - sellPrice
	const margin = (profit / buyPrice) * 100
	return margin
})

// Filter items based on search query and exclude zero-priced items
const filteredItems = computed(() => {
	if (!props.availableItems) return []

	// First filter out items with zero prices using effective pricing
	// Use the server's Minecraft version for price checking (extract major.minor if needed)
	const majorMinorVersion = getMajorMinorVersion(props.server?.minecraft_version) || '1.16'
	const serverVersion = majorMinorVersion.replace('.', '_')
	const nonZeroItems = props.availableItems.filter((item) => {
		const effectivePrice = getEffectivePrice(item, serverVersion)
		return effectivePrice > 0
	})

	// Filter out uncategorized items and disabled categories
	const categorizedItems = nonZeroItems.filter((item) => {
		const category = item.category?.trim()
		if (!category || category === 'Uncategorized' || category === '') return false
		// Filter out disabled categories
		return !disabledCategories.includes(category.toLowerCase())
	})

	const query = searchQuery.value.toLowerCase().trim()
	if (!query || query.length < 2) return []

	return categorizedItems.filter(
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

	// Sort items within each category by subcategory and name (matching HomeView ordering)
	Object.keys(grouped).forEach((category) => {
		grouped[category].sort((a, b) => {
			// First sort by subcategory
			const subcatA = a.subcategory || ''
			const subcatB = b.subcategory || ''
			if (subcatA !== subcatB) {
				return subcatA.localeCompare(subcatB)
			}
			// Then sort by name
			const nameA = a.name || ''
			const nameB = b.name || ''
			return nameA.localeCompare(nameB)
		})
	})

	return grouped
})

// Order categories according to enabledCategories array (matching main price guide)
const orderedItemsByCategory = computed(() => {
	const grouped = itemsByCategory.value
	const ordered = {}

	// Iterate through enabledCategories in order
	enabledCategories.forEach((category) => {
		if (grouped[category]) {
			ordered[category] = grouped[category]
		}
	})

	// Add any remaining categories that aren't in enabledCategories (shouldn't happen, but just in case)
	Object.keys(grouped).forEach((category) => {
		if (!ordered[category]) {
			ordered[category] = grouped[category]
		}
	})

	return ordered
})

// Flattened items list for keyboard navigation - matches visual order
const flattenedItems = computed(() => {
	const flattened = []
	const ordered = orderedItemsByCategory.value

	// Flatten items in the same order they appear visually (by category, ordered)
	Object.keys(ordered).forEach((category) => {
		ordered[category].forEach((item) => {
			flattened.push(item)
		})
	})

	return flattened
})

// Form validation
const isFormValid = computed(() => {
	// For editing, use single item validation
	if (props.editingItem) {
		const hasItemId = !!formData.value.item_id
		const hasBuyPrice =
			formData.value.buy_price !== null &&
			formData.value.buy_price !== undefined &&
			formData.value.buy_price !== ''
		const hasSellPrice =
			formData.value.sell_price !== null &&
			formData.value.sell_price !== undefined &&
			formData.value.sell_price !== ''
		const hasAtLeastOnePrice = hasBuyPrice || hasSellPrice

		if (!hasItemId) {
			return false
		}

		if (!hasAtLeastOnePrice) {
			return false
		}

		if (hasBuyPrice && (isNaN(formData.value.buy_price) || formData.value.buy_price < 0)) {
			return false
		}

		if (hasSellPrice && (isNaN(formData.value.sell_price) || formData.value.sell_price < 0)) {
			return false
		}

		return true
	}

	// For adding new items, check based on selection mode
	const hasItem = enableMultipleSelection.value
		? selectedItemIds.value.length > 0
		: !!formData.value.item_id
	const hasBuyPrice =
		formData.value.buy_price !== null &&
		formData.value.buy_price !== undefined &&
		formData.value.buy_price !== ''
	const hasSellPrice =
		formData.value.sell_price !== null &&
		formData.value.sell_price !== undefined &&
		formData.value.sell_price !== ''
	const hasAtLeastOnePrice = hasBuyPrice || hasSellPrice

	if (!hasItem) {
		return false
	}

	if (!hasAtLeastOnePrice) {
		return false
	}

	if (hasBuyPrice && (isNaN(formData.value.buy_price) || formData.value.buy_price < 0)) {
		return false
	}

	if (hasSellPrice && (isNaN(formData.value.sell_price) || formData.value.sell_price < 0)) {
		return false
	}

	return true
})

// Form handlers
function handleSubmit() {
	formError.value = null

	// Handle editing mode (single item)
	if (props.editingItem) {
		// Validate item selection
		if (!formData.value.item_id) {
			formError.value = 'item_id'
			return
		}

		// Validate at least one price
		if (!formData.value.buy_price && !formData.value.sell_price) {
			formError.value = 'prices'
			return
		}

		// Validate buy price if provided
		if (
			formData.value.buy_price !== null &&
			formData.value.buy_price !== undefined &&
			formData.value.buy_price !== ''
		) {
			if (isNaN(formData.value.buy_price) || formData.value.buy_price < 0) {
				formError.value = 'buy_price'
				return
			}
		}

		// Validate sell price if provided
		if (
			formData.value.sell_price !== null &&
			formData.value.sell_price !== undefined &&
			formData.value.sell_price !== ''
		) {
			if (isNaN(formData.value.sell_price) || formData.value.sell_price < 0) {
				formError.value = 'sell_price'
				return
			}
		}

		// Clean up form data before submitting
		const submitData = {
			...formData.value,
			buy_price: formData.value.buy_price ?? null,
			sell_price: formData.value.sell_price ?? null,
			stock_quantity: formData.value.stock_quantity ?? null,
			notes: formData.value.notes?.trim() || '',
			enchantments: Array.isArray(formData.value.enchantments) ? [...formData.value.enchantments] : []
		}

		emit('submit', submitData)
		return
	}

	// Handle adding mode - check if multiple selection is enabled
	if (enableMultipleSelection.value) {
		// Multiple selection mode
		// Validate item selection
		if (selectedItemIds.value.length === 0) {
			formError.value = 'item_id'
			return
		}

		// Validate at least one price
		if (!formData.value.buy_price && !formData.value.sell_price) {
			formError.value = 'prices'
			return
		}

		// Validate buy price if provided
		if (
			formData.value.buy_price !== null &&
			formData.value.buy_price !== undefined &&
			formData.value.buy_price !== ''
		) {
			if (isNaN(formData.value.buy_price) || formData.value.buy_price < 0) {
				formError.value = 'buy_price'
				return
			}
		}

		// Validate sell price if provided
		if (
			formData.value.sell_price !== null &&
			formData.value.sell_price !== undefined &&
			formData.value.sell_price !== ''
		) {
			if (isNaN(formData.value.sell_price) || formData.value.sell_price < 0) {
				formError.value = 'sell_price'
				return
			}
		}

		// Create array of items with shared form data
		const baseData = {
			buy_price: formData.value.buy_price ?? null,
			sell_price: formData.value.sell_price ?? null,
			stock_quantity: formData.value.stock_quantity ?? null,
			stock_full: formData.value.stock_full || false,
			notes: formData.value.notes?.trim() || ''
		}

		const itemsToSubmit = selectedItemIds.value.map((itemId) => ({
			...baseData,
			item_id: itemId,
			enchantments: [] // Multiple selection mode doesn't support enchantments per item
		}))

		emit('submit', itemsToSubmit)
	} else {
		// Single selection mode (original behavior)
		// Validate item selection
		if (!formData.value.item_id) {
			formError.value = 'item_id'
			return
		}

		// Validate at least one price
		if (!formData.value.buy_price && !formData.value.sell_price) {
			formError.value = 'prices'
			return
		}

		// Validate buy price if provided
		if (
			formData.value.buy_price !== null &&
			formData.value.buy_price !== undefined &&
			formData.value.buy_price !== ''
		) {
			if (isNaN(formData.value.buy_price) || formData.value.buy_price < 0) {
				formError.value = 'buy_price'
				return
			}
		}

		// Validate sell price if provided
		if (
			formData.value.sell_price !== null &&
			formData.value.sell_price !== undefined &&
			formData.value.sell_price !== ''
		) {
			if (isNaN(formData.value.sell_price) || formData.value.sell_price < 0) {
				formError.value = 'sell_price'
				return
			}
		}

		// Clean up form data before submitting
		const submitData = {
			...formData.value,
			buy_price: formData.value.buy_price ?? null,
			sell_price: formData.value.sell_price ?? null,
			stock_quantity: formData.value.stock_quantity ?? null,
			notes: formData.value.notes?.trim() || '',
			enchantments: Array.isArray(formData.value.enchantments) ? [...formData.value.enchantments] : []
		}

		emit('submit', submitData)
	}
}

function handleCancel() {
	resetForm()
	emit('cancel')
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
				const item = flattenedItems.value[highlightedIndex.value]
				if (enableMultipleSelection.value) {
					toggleItemSelection(item)
				} else {
					selectItem(item)
				}
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
		const highlightedElement = dropdownContainer.value.querySelector('.bg-norway')
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
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Toggle item selection (for multiple selection)
function toggleItemSelection(item) {
	const index = selectedItemIds.value.indexOf(item.id)
	if (index > -1) {
		selectedItemIds.value.splice(index, 1)
	} else {
		selectedItemIds.value.push(item.id)
	}
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Handle multiple selection toggle
function handleMultipleSelectionToggle(checked) {
	enableMultipleSelection.value = checked
	if (!checked) {
		// Clear multiple selections when disabling
		selectedItemIds.value = []
		// If we had a single item selected, keep it
		if (formData.value.item_id) {
			// Keep the single selection
		}
	} else {
		// When enabling, move single selection to multiple if exists
		if (formData.value.item_id && !selectedItemIds.value.includes(formData.value.item_id)) {
			selectedItemIds.value = [formData.value.item_id]
			formData.value.item_id = '' // Clear single selection
		}
	}
}

// Check if item is selected
function isItemSelected(itemId) {
	return selectedItemIds.value.includes(itemId)
}

// Remove selected item
function removeSelectedItem(itemId) {
	const index = selectedItemIds.value.indexOf(itemId)
	if (index > -1) {
		selectedItemIds.value.splice(index, 1)
	}
}

// Form submission on Enter key
function handleFormKeyDown(event) {
	if (event.key === 'Enter' && !event.shiftKey) {
		// Don't submit if we're in the search input and dropdown is open
		if (
			event.target.id === 'item-search' &&
			searchQuery.value &&
			filteredItems.value.length > 0
		) {
			return
		}

		// Don't submit if in textarea
		if (event.target.tagName === 'TEXTAREA') {
			return
		}

		event.preventDefault()
		if (isFormValid.value) {
			handleSubmit()
		}
	}
}

// Select item handler (kept for backward compatibility, but not used in new multi-select mode)
function selectItem(item) {
	formData.value.item_id = item.id
	// Clear enchantments when item changes (if new item is not enchantable or is different)
	if (!isItemEnchantable(item) || item.category === 'enchantments') {
		formData.value.enchantments = []
	}
	searchQuery.value = '' // Clear search query when item is selected
	highlightedIndex.value = -1 // Reset highlight
	if (formError.value === 'item_id') {
		formError.value = null
	}

	// Auto-focus buy price field in single-select mode
	if (!enableMultipleSelection.value) {
		nextTick(() => {
			if (buyPriceInput.value) {
				buyPriceInput.value.focus()
			}
		})
	}
}

// Clear all selected items
function clearSelectedItems() {
	selectedItemIds.value = []
	searchQuery.value = ''
	highlightedIndex.value = -1
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Clear selected item (single mode)
function clearSelectedItem() {
	formData.value.item_id = ''
	formData.value.enchantments = [] // Clear enchantments when clearing item
	searchQuery.value = ''
	highlightedIndex.value = -1
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Enchantment functions
function removeEnchantment(enchantmentId) {
	const index = formData.value.enchantments.indexOf(enchantmentId)
	if (index > -1) {
		formData.value.enchantments.splice(index, 1)
	}
}

// Extract enchantment type and level from enchantment ID
function getEnchantmentTypeAndLevel(enchantmentId) {
	const enchantmentItem = allEnchantmentItems.value.find((item) => item.id === enchantmentId)
	if (!enchantmentItem) return null

	const materialId = enchantmentItem.material_id
	if (!materialId || !materialId.startsWith('enchanted_book_')) return null

	const enchantmentPart = materialId.replace('enchanted_book_', '')
	const match = enchantmentPart.match(/^(.+)_(\d+)$/)
	if (match) {
		return {
			type: match[1],
			level: parseInt(match[2], 10),
			id: enchantmentId
		}
	}

	// Enchantment without level
	return {
		type: enchantmentPart,
		level: 1,
		id: enchantmentId
	}
}

function selectEnchantment(enchantment) {
	enchantmentError.value = null

	const newEnchantmentData = getEnchantmentTypeAndLevel(enchantment.id)
	if (!newEnchantmentData) {
		enchantmentError.value = 'Could not parse enchantment data'
		return
	}

	// Check for same enchantment type in existing enchantments
	const existingEnchantmentIndex = formData.value.enchantments.findIndex((existingId) => {
		const existingData = getEnchantmentTypeAndLevel(existingId)
		return existingData && existingData.type === newEnchantmentData.type
	})

	if (existingEnchantmentIndex !== -1) {
		// Same enchantment type exists - check if new one is higher level
		const existingData = getEnchantmentTypeAndLevel(formData.value.enchantments[existingEnchantmentIndex])
		if (existingData && newEnchantmentData.level > existingData.level) {
			// Replace lower level with higher level
			formData.value.enchantments[existingEnchantmentIndex] = enchantment.id
			enchantmentSearchQuery.value = ''
			enchantmentHighlightedIndex.value = -1
			return
		} else if (existingData && newEnchantmentData.level <= existingData.level) {
			// New level is same or lower - don't add, but don't show error
			enchantmentSearchQuery.value = ''
			enchantmentHighlightedIndex.value = -1
			return
		}
	}

	// Check for conflicts with existing enchantments
	if (
		hasEnchantmentConflict(
			enchantment.id,
			formData.value.enchantments,
			allEnchantmentItems.value
		)
	) {
		const reason = getEnchantmentConflictReason(
			enchantment.id,
			formData.value.enchantments,
			allEnchantmentItems.value
		)
		enchantmentError.value = reason || 'This enchantment conflicts with existing enchantments'
		return
	}

	// Check if already added (exact same enchantment)
	if (formData.value.enchantments.includes(enchantment.id)) {
		enchantmentError.value = 'This enchantment is already added'
		return
	}

	// Add enchantment
	formData.value.enchantments.push(enchantment.id)
	enchantmentSearchQuery.value = ''
	enchantmentHighlightedIndex.value = -1
}

// Enchantment keyboard navigation
function handleEnchantmentKeyDown(event) {
	if (!filteredEnchantments.value.length) return

	const oldIndex = enchantmentHighlightedIndex.value

	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault()
			if (enchantmentHighlightedIndex.value < 0) {
				enchantmentHighlightedIndex.value = 0
			} else {
				enchantmentHighlightedIndex.value = Math.min(
					enchantmentHighlightedIndex.value + 1,
					filteredEnchantments.value.length - 1
				)
			}
			break
		case 'ArrowUp':
			event.preventDefault()
			if (enchantmentHighlightedIndex.value <= 0) {
				enchantmentHighlightedIndex.value = -1
			} else {
				enchantmentHighlightedIndex.value = Math.max(enchantmentHighlightedIndex.value - 1, 0)
			}
			break
		case 'Enter':
			event.preventDefault()
			if (
				enchantmentHighlightedIndex.value >= 0 &&
				enchantmentHighlightedIndex.value < filteredEnchantments.value.length
			) {
				const enchantment = filteredEnchantments.value[enchantmentHighlightedIndex.value]
				selectEnchantment(enchantment)
			}
			break
		case 'Escape':
			enchantmentHighlightedIndex.value = -1
			enchantmentSearchQuery.value = ''
			break
	}

	// Scroll highlighted enchantment into view if index changed
	if (oldIndex !== enchantmentHighlightedIndex.value) {
		scrollToHighlightedEnchantment()
	}
}

function scrollToHighlightedEnchantment() {
	if (!enchantmentDropdownContainer.value || enchantmentHighlightedIndex.value < 0) return

	setTimeout(() => {
		const highlightedElement = enchantmentDropdownContainer.value.querySelector('.bg-norway')
		if (highlightedElement) {
			highlightedElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			})
		}
	}, 0)
}

function handleEnchantmentSearchInput() {
	enchantmentHighlightedIndex.value = -1
	if (enchantmentError.value) {
		enchantmentError.value = null
	}
}

function formatEnchantmentName(enchantmentId) {
	if (!enchantmentId) return ''

	// Get enchantment item from availableItems
	const enchantmentItem = props.availableItems.find((item) => item.id === enchantmentId)
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

	// Fallback: Use item name
	return enchantmentItem.name || enchantmentId
}

// Get visual index of an item in the dropdown (accounting for category grouping)
function getItemVisualIndex(targetCategory, targetCategoryIndex) {
	let visualIndex = 0
	const ordered = orderedItemsByCategory.value

	for (const [category, categoryItems] of Object.entries(ordered)) {
		if (category === targetCategory) {
			return visualIndex + targetCategoryIndex
		}
		visualIndex += categoryItems.length
	}

	return -1
}

// Number input helpers
function handlePriceInput(field, event) {
	// Clear error for this field when user types
	if (formError.value === field || formError.value === 'prices') {
		formError.value = null
	}
	const value = event.target.value
	if (value === '' || value === null) {
		formData.value[field] = null
	} else {
		const numValue = parseFloat(value)
		formData.value[field] = isNaN(numValue) ? null : numValue
	}
}

function handleQuantityInput(event) {
	const value = event.target.value
	if (value === '' || value === null) {
		formData.value.stock_quantity = null
	} else {
		const numValue = parseInt(value)
		formData.value.stock_quantity = isNaN(numValue) ? null : numValue
	}
}

function handleOutOfStockChange(checked) {
	if (checked) {
		formData.value.stock_quantity = 0
	} else {
		formData.value.stock_quantity = null
	}
}

// Expose focus function, submit method, form validity, and selected items count for parent component
defineExpose({
	focusSearchInput,
	submit: handleSubmit,
	isFormValid,
	selectedItemsCount: computed(() => selectedItemIds.value.length)
})
</script>

<template>
	<div
		:class="
			isModalVariant ? 'space-y-4' : 'mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50'
		">
		<h2 v-if="!isModalVariant" class="text-xl font-semibold mb-4">
			{{ editingItem ? 'Edit Shop Item' : 'Add New Shop Item' }}
		</h2>

		<form @submit.prevent="handleSubmit" @keydown="handleFormKeyDown" class="space-y-4">
			<!-- Item selection -->
			<div v-if="!editingItem">
				<!-- Show search input when no item is selected (single mode) or in multiple mode -->
				<div v-if="!selectedItem || enableMultipleSelection">
					<label for="item-search" class="block text-sm font-medium text-gray-700 mb-1">
						Search and Select {{ enableMultipleSelection ? 'Items' : 'Item' }} *
						<span
							v-if="enableMultipleSelection && selectedItemIds.length > 0"
							class="text-gray-500 font-normal">
							({{ selectedItemIds.length }} selected)
						</span>
					</label>

					<!-- Enable multiple selection checkbox -->
					<div class="mb-2">
						<label class="flex items-center">
							<input
								v-model="enableMultipleSelection"
								data-cy="shop-item-multiple-selection-checkbox"
								@change="handleMultipleSelectionToggle($event.target.checked)"
								type="checkbox"
								class="checkbox-input" />
							<span class="ml-2 text-sm text-gray-700">
								Enable multiple selection
							</span>
						</label>
					</div>

					<input
						id="item-search"
						ref="searchInput"
						v-model="searchQuery"
						data-cy="shop-item-search-input"
						@input="handleSearchInput"
						@keydown="handleKeyDown"
						type="text"
						autocomplete="off"
						placeholder="Search items by name, material ID, or category..."
						:class="[
							'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
							formError === 'item_id'
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />

					<!-- Error message for item selection -->
					<div
						v-if="formError === 'item_id'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
						<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
						{{
							enableMultipleSelection
								? 'Please select at least one item'
								: 'Please select an item'
						}}
					</div>

					<!-- Selected items display (multiple mode only) -->
					<div
						v-if="enableMultipleSelection && selectedItems.length > 0"
						class="mt-2 mb-2">
						<div class="flex flex-wrap gap-2">
							<div
								v-for="item in selectedItems"
								:key="item.id"
								class="px-2 py-1 bg-sea-mist border border-highland rounded flex items-center gap-2">
								<span class="text-sm font-medium text-heavy-metal">
									{{ item.name }}
								</span>
								<button
									type="button"
									@click="removeSelectedItem(item.id)"
									class="text-gray-600 hover:text-gray-900">
									<XCircleIcon class="w-4 h-4" />
								</button>
							</div>
						</div>
						<button
							type="button"
							@click="clearSelectedItems"
							class="mt-2 text-sm text-gray-900 hover:text-gray-700 underline">
							Clear all selections
						</button>
					</div>

					<!-- Item selection dropdown -->
					<div
						v-if="searchQuery && filteredItems.length > 0"
						ref="dropdownContainer"
						class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white">
						<template
							v-for="(categoryItems, category) in orderedItemsByCategory"
							:key="category">
							<div
								class="px-3 py-2 bg-gray-100 text-sm font-medium text-gray-700 border-b">
								{{ category }}
							</div>
							<div
								v-for="(item, categoryIndex) in categoryItems"
								:key="item.id"
								data-cy="shop-item-dropdown-item"
								@click="
									enableMultipleSelection
										? toggleItemSelection(item)
										: selectItem(item)
								"
								:class="[
									'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center gap-3',
									getItemVisualIndex(category, categoryIndex) === highlightedIndex
										? 'bg-norway text-heavy-metal'
										: 'hover:bg-sea-mist'
								]">
								<input
									v-if="enableMultipleSelection"
									type="checkbox"
									:checked="isItemSelected(item.id)"
									@click.stop
									@change.stop="toggleItemSelection(item)"
									class="checkbox-input flex-shrink-0" />
								<div class="flex-1">
									<div class="font-medium">{{ item.name }}</div>
								</div>
								<div v-if="item.image" class="w-8 h-8 flex-shrink-0">
									<img
										:src="item.image"
										:alt="item.name"
										class="w-full h-full object-contain" />
								</div>
							</div>
						</template>
					</div>
				</div>

				<!-- Show selected item when item is selected (single mode only) -->
				<div v-else>
					<label class="block text-sm font-medium text-gray-700 mb-1">Item *</label>

					<!-- Enable multiple selection checkbox -->
					<div class="mb-2">
						<label class="flex items-center">
							<input
								v-model="enableMultipleSelection"
								data-cy="shop-item-multiple-selection-checkbox"
								@change="handleMultipleSelectionToggle($event.target.checked)"
								type="checkbox"
								class="checkbox-input" />
							<span class="ml-2 text-sm text-gray-700">
								Enable multiple selection
							</span>
						</label>
					</div>

					<div
						class="px-3 py-2 bg-sea-mist border-2 border-highland rounded flex items-center justify-between">
						<div>
							<div class="font-medium text-heavy-metal">{{ selectedItem.name }}</div>
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
						class="mt-2 text-sm text-gray-900 hover:text-gray-700 underline">
						Select different item
					</button>
				</div>
			</div>

			<!-- Show selected item when editing -->
			<div
				v-else-if="editingItem && editingItem.itemData"
				class="px-3 py-2 bg-sea-mist border-2 border-highland rounded">
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">{{ editingItem.itemData.name }}</div>
					</div>
					<div v-if="editingItem.itemData.image" class="w-8 h-8">
						<img
							:src="editingItem.itemData.image"
							:alt="editingItem.itemData.name"
							class="w-full h-full object-contain" />
					</div>
				</div>
			</div>

			<!-- Enchantments Section - only show for enchantable items and single selection mode -->
			<div
				v-if="showEnchantmentSection && !enableMultipleSelection && !editingItem"
				class="mt-4">
				<label for="enchantment-search" class="block text-sm font-medium text-gray-700 mb-1">
					Enchantments
				</label>
				
				<!-- Selected enchantments display -->
				<div
					v-if="formData.enchantments && formData.enchantments.length > 0"
					class="mb-2 flex flex-wrap gap-2">
					<div
						v-for="enchantmentId in formData.enchantments"
						:key="enchantmentId"
						class="flex items-center gap-2 pl-3 pr-2 py-1 bg-sea-mist text-heavy-metal rounded-md text-sm font-medium">
						<span>{{ formatEnchantmentName(enchantmentId) }}</span>
						<button
							type="button"
							@click="removeEnchantment(enchantmentId)"
							class="text-heavy-metal hover:text-red-700">
							<XMarkIcon class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Enchantment search input -->
				<input
					id="enchantment-search"
					ref="enchantmentSearchInput"
					v-model="enchantmentSearchQuery"
					data-cy="shop-item-enchantment-search-input"
					@input="handleEnchantmentSearchInput"
					@keydown="handleEnchantmentKeyDown"
					type="text"
					autocomplete="off"
					placeholder="Search enchantments..."
					class="block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus" />

				<!-- Error message -->
				<div
					v-if="enchantmentError"
					class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
					<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
					{{ enchantmentError }}
				</div>

				<!-- Enchantment dropdown -->
				<div
					v-if="enchantmentSearchQuery && filteredEnchantments.length > 0"
					ref="enchantmentDropdownContainer"
					class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white">
					<div
						v-for="(enchantment, index) in filteredEnchantments"
						:key="enchantment.id"
						data-cy="shop-item-enchantment-dropdown-item"
						@click="selectEnchantment(enchantment)"
						:class="[
							'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center gap-3',
							index === enchantmentHighlightedIndex
								? 'bg-norway text-heavy-metal'
								: 'hover:bg-sea-mist'
						]">
						<div class="flex-1">
							<div class="font-medium">{{ formatEnchantmentName(enchantment.id) }}</div>
						</div>
						<div v-if="enchantment.image" class="w-8 h-8 flex-shrink-0">
							<img
								:src="enchantment.image"
								:alt="formatEnchantmentName(enchantment.id)"
								class="w-full h-full object-contain" />
						</div>
					</div>
				</div>
				<div
					v-else-if="enchantmentSearchQuery && filteredEnchantments.length === 0"
					class="px-3 py-2 text-sm text-gray-500 italic">
					No enchantments found
				</div>
				<div
					v-else-if="!enchantmentSearchQuery && compatibleEnchantments.length === 0"
					class="mt-2 text-sm text-gray-500 italic">
					No compatible enchantments available for this item
				</div>
			</div>

			<!-- Enchantments Section - for editing mode -->
			<div
				v-if="showEnchantmentSection && editingItem"
				class="mt-4">
				<label for="enchantment-search-edit" class="block text-sm font-medium text-gray-700 mb-1">
					Enchantments
				</label>
				
				<!-- Selected enchantments display -->
				<div
					v-if="formData.enchantments && formData.enchantments.length > 0"
					class="mb-2 flex flex-wrap gap-2">
					<div
						v-for="enchantmentId in formData.enchantments"
						:key="enchantmentId"
						class="flex items-center gap-2 pl-3 pr-2 py-1 bg-sea-mist text-heavy-metal rounded-md text-sm font-medium">
						<span>{{ formatEnchantmentName(enchantmentId) }}</span>
						<button
							type="button"
							@click="removeEnchantment(enchantmentId)"
							class="text-heavy-metal hover:text-red-700">
							<XMarkIcon class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Enchantment search input -->
				<input
					id="enchantment-search-edit"
					ref="enchantmentSearchInput"
					v-model="enchantmentSearchQuery"
					data-cy="shop-item-enchantment-search-input"
					@input="handleEnchantmentSearchInput"
					@keydown="handleEnchantmentKeyDown"
					type="text"
					autocomplete="off"
					placeholder="Search enchantments..."
					class="block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus" />

				<!-- Error message -->
				<div
					v-if="enchantmentError"
					class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
					<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
					{{ enchantmentError }}
				</div>

				<!-- Enchantment dropdown -->
				<div
					v-if="enchantmentSearchQuery && filteredEnchantments.length > 0"
					ref="enchantmentDropdownContainer"
					class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white">
					<div
						v-for="(enchantment, index) in filteredEnchantments"
						:key="enchantment.id"
						data-cy="shop-item-enchantment-dropdown-item"
						@click="selectEnchantment(enchantment)"
						:class="[
							'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center gap-3',
							index === enchantmentHighlightedIndex
								? 'bg-norway text-heavy-metal'
								: 'hover:bg-sea-mist'
						]">
						<div class="flex-1">
							<div class="font-medium">{{ formatEnchantmentName(enchantment.id) }}</div>
						</div>
						<div v-if="enchantment.image" class="w-8 h-8 flex-shrink-0">
							<img
								:src="enchantment.image"
								:alt="formatEnchantmentName(enchantment.id)"
								class="w-full h-full object-contain" />
						</div>
					</div>
				</div>
				<div
					v-else-if="enchantmentSearchQuery && filteredEnchantments.length === 0"
					class="px-3 py-2 text-sm text-gray-500 italic">
					No enchantments found
				</div>
				<div
					v-else-if="!enchantmentSearchQuery && compatibleEnchantments.length === 0"
					class="mt-2 text-sm text-gray-500 italic">
					No compatible enchantments available for this item
				</div>
			</div>

			<!-- Price inputs -->
			<div class="space-y-4">
				<div>
					<label for="buy-price" class="block text-sm font-medium text-gray-700 mb-1">
						Buy Price
					</label>
					<p class="text-xs text-gray-500 mb-1">
						This is the amount players need to pay for the item
					</p>
					<input
						id="buy-price"
						ref="buyPriceInput"
						data-cy="shop-item-buy-price-input"
						:value="formData.buy_price"
						@input="handlePriceInput('buy_price', $event)"
						type="number"
						step="0.01"
						min="0"
						placeholder="0.00"
						:class="[
							'mt-2 block w-[150px] rounded border-2 px-3 py-1 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
							formError === 'buy_price'
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />
					<div
						v-if="formError === 'buy_price'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
						<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
						Buy price must be a valid number greater than or equal to 0
					</div>
					<!-- Out of stock checkbox (only for player shops, not own) -->
					<div v-if="shop && !shop.is_own_shop" class="mt-2">
						<label class="flex items-center">
							<input
								:checked="formData.stock_quantity === 0"
								@change="handleOutOfStockChange($event.target.checked)"
								type="checkbox"
								class="checkbox-input" />
							<span class="ml-2 text-sm text-gray-700 flex items-center gap-1">
								Out of stock
								<ArchiveBoxXMarkIcon class="w-4 h-4" />
							</span>
						</label>
					</div>
				</div>

				<div>
					<label for="sell-price" class="block text-sm font-medium text-gray-700 mb-1">
						Sell Price
					</label>
					<p class="text-xs text-gray-500 mb-1">
						This is the amount players get when selling the item to a shop
					</p>
					<div class="flex items-center gap-2">
						<input
							id="sell-price"
							data-cy="shop-item-sell-price-input"
							:value="formData.sell_price"
							@input="handlePriceInput('sell_price', $event)"
							type="number"
							step="0.01"
							min="0"
							placeholder="0.00"
							:class="[
								'mt-2 block w-[150px] rounded border-2 px-3 py-1 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
								formError === 'sell_price'
									? 'border-red-500 focus:ring-red-500 focus:border-red-500'
									: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
							]" />
						<span v-if="profitMargin !== null" class="mt-2 text-sm text-gray-600">
							{{ profitMargin.toFixed(1) }}%
						</span>
					</div>
					<div
						v-if="formError === 'sell_price'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
						<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
						Sell price must be a valid number greater than or equal to 0
					</div>
					<div
						v-if="formError === 'prices'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
						<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
						At least one price (buy or sell) is required
					</div>
					<!-- Stock Full checkbox (only for competitor shops) -->
					<div v-if="shop && !shop.is_own_shop" class="mt-2">
						<label class="flex items-center">
							<input
								v-model="formData.stock_full"
								type="checkbox"
								class="checkbox-input" />
							<span class="ml-2 text-sm text-gray-700 flex items-center gap-1">
								Stock full
								<ArchiveBoxIcon class="w-4 h-4" />
							</span>
						</label>
						<p class="text-xs text-gray-500 mt-1">Mark when you can't sell any more</p>
					</div>
				</div>
			</div>

			<!-- Notes -->
			<div>
				<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
					Notes (Optional)
				</label>
				<textarea
					id="notes"
					v-model="formData.notes"
					data-cy="shop-item-notes-input"
					rows="3"
					placeholder="Add any notes about this item, pricing, or stock..."
					class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
			</div>

			<!-- Form actions (only show when not in modal mode) -->
			<div
				v-if="!isModalVariant"
				class="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<BaseButton type="button" variant="tertiary" @click="handleCancel">
					Cancel
				</BaseButton>
				<BaseButton type="submit" variant="primary" :disabled="!isFormValid">
					{{ editingItem ? 'Update Item' : 'Add Item' }}
				</BaseButton>
			</div>
		</form>

	</div>
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
