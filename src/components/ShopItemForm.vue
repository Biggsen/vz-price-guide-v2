<script setup>
import { ref, computed, watch, onMounted } from 'vue'

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
const error = ref(null)
const searchQuery = ref('')
const showMoreFields = ref(false)

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
	error.value = null
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
				notes: newEditingItem.notes || ''
			}
		} else {
			resetForm()
		}
	}
)

// Computed properties
const selectedItem = computed(
	() => props.availableItems.find((item) => item.id === formData.value.item_id) || null
)

// Filter items based on search query
const filteredItems = computed(() => {
	if (!props.availableItems) return []

	const query = searchQuery.value.toLowerCase().trim()
	if (!query) return props.availableItems

	return props.availableItems.filter(
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

// Form validation
const isFormValid = computed(() => {
	if (!formData.value.item_id) return false
	if (!formData.value.buy_price && !formData.value.sell_price) return false

	// Validate price values
	if (formData.value.buy_price !== null && formData.value.buy_price !== undefined) {
		if (isNaN(formData.value.buy_price) || formData.value.buy_price < 0) return false
	}
	if (formData.value.sell_price !== null && formData.value.sell_price !== undefined) {
		if (isNaN(formData.value.sell_price) || formData.value.sell_price < 0) return false
	}

	return true
})

// Form handlers
function handleSubmit() {
	error.value = null

	if (!isFormValid.value) {
		error.value = 'Please fill in all required fields with valid values'
		return
	}

	// Clean up form data before submitting
	const submitData = {
		...formData.value,
		buy_price: formData.value.buy_price || null,
		sell_price: formData.value.sell_price || null,
		stock_quantity: formData.value.stock_quantity || null,
		notes: formData.value.notes?.trim() || ''
	}

	emit('submit', submitData)
}

function handleCancel() {
	resetForm()
	emit('cancel')
}

// Select item handler
function selectItem(item) {
	formData.value.item_id = item.id
	searchQuery.value = '' // Clear search query when item is selected
}

// Clear selected item
function clearSelectedItem() {
	formData.value.item_id = ''
	searchQuery.value = ''
}

// Number input helpers
function handlePriceInput(field, event) {
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
</script>

<template>
	<div class="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
		<h2 class="text-xl font-semibold mb-4">
			{{ editingItem ? 'Edit Shop Item' : 'Add New Shop Item' }}
		</h2>

		<!-- Error message -->
		<div v-if="error" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
			{{ error }}
		</div>

		<form @submit.prevent="handleSubmit" class="space-y-4">
			<!-- Item selection -->
			<div v-if="!editingItem">
				<!-- Show search input when no item is selected -->
				<div v-if="!selectedItem">
					<label for="item-search" class="block text-sm font-medium text-gray-700 mb-1">
						Search and Select Item *
					</label>
					<input
						id="item-search"
						v-model="searchQuery"
						type="text"
						placeholder="Search items by name, material ID, or category..."
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />

					<!-- Item selection dropdown -->
					<div
						v-if="searchQuery && filteredItems.length > 0"
						class="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-white">
						<div v-for="(categoryItems, category) in itemsByCategory" :key="category">
							<div
								class="px-3 py-2 bg-gray-100 text-sm font-medium text-gray-700 border-b">
								{{ category }}
							</div>
							<div
								v-for="item in categoryItems"
								:key="item.id"
								@click="selectItem(item)"
								class="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex items-center justify-between">
								<div>
									<div class="font-medium">{{ item.name }}</div>
									<div class="text-sm text-gray-500">{{ item.material_id }}</div>
								</div>
								<div v-if="item.image" class="w-8 h-8">
									<img
										:src="item.image"
										:alt="item.name"
										class="w-full h-full object-contain" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Show selected item when item is selected -->
				<div v-else>
					<label class="block text-sm font-medium text-gray-700 mb-1">Item *</label>
					<div
						class="p-3 bg-green-50 border border-green-200 rounded flex items-center justify-between">
						<div>
							<div class="font-medium text-green-800">{{ selectedItem.name }}</div>
							<div class="text-sm text-green-600">{{ selectedItem.material_id }}</div>
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
				v-else-if="editingItem && editingItem.itemData"
				class="p-3 bg-gray-100 border border-gray-300 rounded">
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">{{ editingItem.itemData.name }}</div>
						<div class="text-sm text-gray-600">
							{{ editingItem.itemData.material_id }}
						</div>
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
			<div class="grid grid-cols-2 gap-4">
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
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
					<p class="text-xs text-gray-500 mt-1">Leave empty if you don't buy this item</p>
				</div>

				<div>
					<label for="sell-price" class="block text-sm font-medium text-gray-700 mb-1">
						Sell Price
					</label>
					<input
						id="sell-price"
						:value="formData.sell_price"
						@input="handlePriceInput('sell_price', $event)"
						type="number"
						step="0.01"
						min="0"
						placeholder="0.00"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
					<p class="text-xs text-gray-500 mt-1">
						Leave empty if you don't sell this item
					</p>
				</div>
			</div>

			<!-- Stock Full checkbox -->
			<div>
				<label class="flex items-center">
					<input
						v-model="formData.stock_full"
						type="checkbox"
						class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
					<span class="ml-2 text-sm text-gray-700">Stock Full</span>
				</label>
				<p class="text-xs text-gray-500 mt-1">Check if chest is full (can't buy more)</p>
			</div>

			<!-- Show more link -->
			<div>
				<button
					type="button"
					@click="showMoreFields = !showMoreFields"
					class="text-sm text-blue-600 hover:text-blue-800 underline">
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
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
					<p class="text-xs text-gray-500 mt-1">Current stock amount</p>
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
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
				</div>
			</div>

			<!-- Form actions -->
			<div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
				<button
					type="button"
					@click="handleCancel"
					class="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
					Cancel
				</button>
				<button
					type="submit"
					:disabled="!isFormValid"
					:class="[
						'px-4 py-2 rounded transition-colors font-medium',
						isFormValid
							? 'bg-blue-600 text-white hover:bg-blue-700'
							: 'bg-gray-300 text-gray-500 cursor-not-allowed'
					]">
					{{ editingItem ? 'Update Item' : 'Add Item' }}
				</button>
			</div>
		</form>
	</div>
</template>
