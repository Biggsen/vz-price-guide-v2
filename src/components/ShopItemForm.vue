<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getEffectivePrice } from '../utils/pricing.js'
import { disabledCategories } from '../constants.js'
import BaseButton from './BaseButton.vue'
import { XCircleIcon } from '@heroicons/vue/20/solid'

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
	notes: ''
})

// Form state
const formError = ref(null)
const searchQuery = ref('')
const showMoreFields = ref(false)
const highlightedIndex = ref(-1)
const searchInput = ref(null)
const dropdownContainer = ref(null)

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
		notes: ''
	}
	searchQuery.value = ''
	formError.value = null
	highlightedIndex.value = -1
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
			notes: props.editingItem.notes || ''
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
		console.log('ShopItemForm: editingItem changed, isEditing:', !!newEditingItem)
		if (newEditingItem) {
			formData.value = {
				item_id: newEditingItem.item_id,
				buy_price: newEditingItem.buy_price,
				sell_price: newEditingItem.sell_price,
				stock_quantity: newEditingItem.stock_quantity,
				stock_full: newEditingItem.stock_full || false,
				notes: newEditingItem.notes || ''
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
const selectedItem = computed(
	() => props.availableItems.find((item) => item.id === formData.value.item_id) || null
)

const isModalVariant = computed(() => props.displayVariant === 'modal')

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
	// Use the server's Minecraft version for price checking
	const serverVersion = props.server?.minecraft_version?.replace('.', '_') || '1_16'
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
	if (!query) return categorizedItems

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

	return grouped
})

// Flattened items list for keyboard navigation - matches visual order
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

// Form validation
const isFormValid = computed(() => {
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
		console.log('ShopItemForm: Validation failed - missing item_id')
		return false
	}

	if (!hasAtLeastOnePrice) {
		console.log('ShopItemForm: Validation failed - no prices set')
		return false
	}

	// Validate price values if they exist
	if (hasBuyPrice && (isNaN(formData.value.buy_price) || formData.value.buy_price < 0)) {
		console.log('ShopItemForm: Validation failed - invalid buy_price')
		return false
	}

	if (hasSellPrice && (isNaN(formData.value.sell_price) || formData.value.sell_price < 0)) {
		console.log('ShopItemForm: Validation failed - invalid sell_price')
		return false
	}

	return true
})

// Form handlers
function handleSubmit() {
	formError.value = null

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
		buy_price: formData.value.buy_price || null,
		sell_price: formData.value.sell_price || null,
		stock_quantity: formData.value.stock_quantity || null,
		notes: formData.value.notes?.trim() || ''
	}

	console.log('Submitting cleaned data:', submitData)
	emit('submit', submitData)
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
	if (formError.value === 'item_id') {
		formError.value = null
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

// Select item handler
function selectItem(item) {
	formData.value.item_id = item.id
	searchQuery.value = '' // Clear search query when item is selected
	highlightedIndex.value = -1 // Reset highlight
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Clear selected item
function clearSelectedItem() {
	formData.value.item_id = ''
	searchQuery.value = ''
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

// Expose focus function, submit method, and form validity for parent component
defineExpose({
	focusSearchInput,
	submit: handleSubmit,
	isFormValid
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
				<!-- Show search input when no item is selected -->
				<div v-if="!selectedItem">
					<label for="item-search" class="block text-sm font-medium text-gray-700 mb-1">
						Search and Select Item *
					</label>
					<input
						id="item-search"
						ref="searchInput"
						v-model="searchQuery"
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
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						Please select an item
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
								:class="[
									'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center justify-between',
									getItemVisualIndex(category, categoryIndex) === highlightedIndex
										? 'bg-norway text-heavy-metal'
										: 'hover:bg-sea-mist'
								]">
								<div>
									<div class="font-medium">{{ item.name }}</div>
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
					<label class="block text-sm font-medium text-gray-700 mb-1">Item *</label>
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

			<!-- Price inputs -->
			<div class="space-y-4">
				<div>
					<label for="buy-price" class="block text-sm font-medium text-gray-700 mb-1">
						Buy Price
					</label>
					<input
						id="buy-price"
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
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						Buy price must be a valid number greater than or equal to 0
					</div>
				</div>

				<div>
					<label for="sell-price" class="block text-sm font-medium text-gray-700 mb-1">
						Sell Price
					</label>
					<div class="flex items-center gap-2">
						<input
							id="sell-price"
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
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						Sell price must be a valid number greater than or equal to 0
					</div>
					<div
						v-if="formError === 'prices'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						At least one price (buy or sell) is required
					</div>
				</div>
			</div>

			<!-- Stock Full checkbox (only for competitor shops) -->
			<div v-if="shop && !shop.is_own_shop">
				<label class="flex items-center">
					<input v-model="formData.stock_full" type="checkbox" class="checkbox-input" />
					<span class="ml-2 text-sm text-gray-700">Stock full</span>
				</label>
				<p class="text-xs text-gray-500 mt-1">Mark when you can't sell any more</p>
			</div>

			<!-- Notes -->
			<div>
				<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
					Notes (Optional)
				</label>
				<textarea
					id="notes"
					v-model="formData.notes"
					rows="3"
					placeholder="Add any notes about this item, pricing, or stock..."
					class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
			</div>

			<!-- Show more link -->
			<div>
				<button
					type="button"
					@click="showMoreFields = !showMoreFields"
					class="text-sm text-gray-900 hover:text-gray-700 underline">
					{{ showMoreFields ? 'Show less' : 'Show more' }}
				</button>
			</div>

			<!-- Optional fields (hidden by default) -->
			<div v-if="showMoreFields" class="space-y-4">
				<!-- Stock quantity -->
				<div>
					<label
						for="stock-quantity"
						class="block text-sm font-medium text-gray-700 mb-1">
						Stock Quantity (Optional)
					</label>
					<input
						id="stock-quantity"
						:value="formData.stock_quantity"
						@input="handleQuantityInput"
						type="number"
						min="0"
						placeholder="64"
						class="mt-2 block w-[150px] rounded border-2 border-gray-asparagus px-3 py-1 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans" />
					<p class="text-xs text-gray-500 mt-1">Current stock amount</p>
				</div>
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
