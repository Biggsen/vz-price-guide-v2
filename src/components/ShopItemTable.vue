<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
	items: {
		type: Array,
		required: true
	},
	server: {
		type: Object,
		required: true
	}
})

const emit = defineEmits(['edit', 'delete', 'bulk-update'])

// Table state
const sortField = ref('')
const sortDirection = ref('asc')
const selectedItems = ref([])
const editingItemId = ref(null)
const editingValues = ref({})

// Computed properties
const sortedItems = computed(() => {
	if (!sortField.value) return props.items

	return [...props.items].sort((a, b) => {
		let valueA, valueB

		switch (sortField.value) {
			case 'name':
				valueA = a.itemData?.name?.toLowerCase() || ''
				valueB = b.itemData?.name?.toLowerCase() || ''
				break
			case 'buy_price':
				valueA = a.buy_price || 0
				valueB = b.buy_price || 0
				break
			case 'sell_price':
				valueA = a.sell_price || 0
				valueB = b.sell_price || 0
				break
			case 'stock_quantity':
				valueA = a.stock_quantity || 0
				valueB = b.stock_quantity || 0
				break
			case 'last_updated':
				valueA = new Date(a.last_updated || 0).getTime()
				valueB = new Date(b.last_updated || 0).getTime()
				break
			default:
				return 0
		}

		if (typeof valueA === 'string' && typeof valueB === 'string') {
			const comparison = valueA.localeCompare(valueB)
			return sortDirection.value === 'asc' ? comparison : -comparison
		}

		const comparison = valueA - valueB
		return sortDirection.value === 'asc' ? comparison : -comparison
	})
})

const allSelected = computed(() => {
	return props.items.length > 0 && selectedItems.value.length === props.items.length
})

const someSelected = computed(() => {
	return selectedItems.value.length > 0 && selectedItems.value.length < props.items.length
})

const hasSelected = computed(() => {
	return selectedItems.value.length > 0
})

// Sorting methods
function setSortField(field) {
	if (sortField.value === field) {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	} else {
		sortField.value = field
		sortDirection.value = 'asc'
	}
}

function getSortIcon(field) {
	if (sortField.value !== field) return ''
	return sortDirection.value === 'asc' ? '↑' : '↓'
}

// Selection methods
function toggleSelectAll() {
	if (allSelected.value) {
		selectedItems.value = []
	} else {
		selectedItems.value = props.items.map((item) => item.id)
	}
}

function toggleSelectItem(itemId) {
	const index = selectedItems.value.indexOf(itemId)
	if (index > -1) {
		selectedItems.value.splice(index, 1)
	} else {
		selectedItems.value.push(itemId)
	}
}

function isSelected(itemId) {
	return selectedItems.value.includes(itemId)
}

// Inline editing methods
function startEdit(item) {
	editingItemId.value = item.id
	editingValues.value = {
		buy_price: item.buy_price,
		sell_price: item.sell_price,
		stock_quantity: item.stock_quantity,
		stock_full: item.stock_full || false,
		notes: item.notes || ''
	}
}

function cancelEdit() {
	editingItemId.value = null
	editingValues.value = {}
}

function saveEdit() {
	if (editingItemId.value) {
		const item = props.items.find((i) => i.id === editingItemId.value)
		if (item) {
			const updatedItem = {
				...item,
				...editingValues.value
			}
			emit('edit', updatedItem)
		}
	}
	cancelEdit()
}

// Utility methods
function formatPrice(price) {
	if (price === null || price === undefined) return '-'
	return parseFloat(price).toFixed(2)
}

function formatDate(dateString) {
	if (!dateString) return '-'
	const date = new Date(dateString)
	return (
		date.toLocaleDateString() +
		' ' +
		date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	)
}

function formatStock(quantity, isFull) {
	if (quantity === null || quantity === undefined) {
		return isFull ? 'Full' : '-'
	}
	return isFull ? `${quantity} (Full)` : quantity.toString()
}

function hasPriceHistory(item) {
	return item.previous_buy_price !== null || item.previous_sell_price !== null
}

function getPriceChangeIcon(current, previous) {
	if (previous === null || previous === undefined) return ''
	if (current === null || current === undefined) return ''

	if (current > previous) return '↗️'
	if (current < previous) return '↘️'
	return '➡️'
}

// Bulk operations
function bulkUpdateSelected() {
	if (!hasSelected.value) return

	const selectedItemsData = props.items.filter((item) => selectedItems.value.includes(item.id))
	emit('bulk-update', selectedItemsData)
	selectedItems.value = []
}

// Event handlers
function handleEdit(item) {
	emit('edit', item)
}

function handleDelete(item) {
	emit('delete', item)
}

function handlePriceInput(field, event) {
	const value = event.target.value
	if (value === '' || value === null) {
		editingValues.value[field] = null
	} else {
		const numValue = parseFloat(value)
		editingValues.value[field] = isNaN(numValue) ? null : numValue
	}
}

function handleQuantityInput(event) {
	const value = event.target.value
	if (value === '' || value === null) {
		editingValues.value.stock_quantity = null
	} else {
		const numValue = parseInt(value)
		editingValues.value.stock_quantity = isNaN(numValue) ? null : numValue
	}
}
</script>

<template>
	<div class="bg-white rounded-lg shadow-md overflow-hidden">
		<!-- Bulk actions toolbar -->
		<div v-if="hasSelected" class="bg-blue-50 border-b border-blue-200 px-4 py-3">
			<div class="flex items-center justify-between">
				<span class="text-sm text-blue-700">
					{{ selectedItems.length }} item{{
						selectedItems.length !== 1 ? 's' : ''
					}}
					selected
				</span>
				<div class="space-x-2">
					<button
						@click="bulkUpdateSelected"
						class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
						Bulk Update
					</button>
					<button
						@click="selectedItems = []"
						class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
						Clear Selection
					</button>
				</div>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left">
							<input
								type="checkbox"
								:checked="allSelected"
								:indeterminate="someSelected"
								@change="toggleSelectAll"
								class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Item
						</th>
						<th
							@click="setSortField('buy_price')"
							class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
							Buy Price {{ getSortIcon('buy_price') }}
						</th>
						<th
							@click="setSortField('sell_price')"
							class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
							Sell Price {{ getSortIcon('sell_price') }}
						</th>
						<th
							@click="setSortField('stock_quantity')"
							class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
							Stock {{ getSortIcon('stock_quantity') }}
						</th>
						<th
							@click="setSortField('last_updated')"
							class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
							Last Updated {{ getSortIcon('last_updated') }}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					<tr
						v-for="item in sortedItems"
						:key="item.id"
						:class="{ 'bg-blue-50': isSelected(item.id) }">
						<!-- Selection checkbox -->
						<td class="px-4 py-4">
							<input
								type="checkbox"
								:checked="isSelected(item.id)"
								@change="toggleSelectItem(item.id)"
								class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" />
						</td>

						<!-- Item info -->
						<td class="px-4 py-4">
							<div class="flex items-center">
								<div
									v-if="item.itemData?.image"
									class="w-10 h-10 mr-3 flex-shrink-0">
									<img
										:src="item.itemData.image"
										:alt="item.itemData.name"
										class="w-full h-full object-contain" />
								</div>
								<div>
									<div class="font-medium text-gray-900">
										{{ item.itemData?.name || 'Unknown Item' }}
									</div>
									<div class="text-sm text-gray-500">
										{{ item.itemData?.material_id || item.item_id }}
									</div>
									<div v-if="item.notes" class="text-xs text-gray-400 mt-1">
										📝 {{ item.notes }}
									</div>
								</div>
							</div>
						</td>

						<!-- Buy price -->
						<td class="px-4 py-4">
							<div v-if="editingItemId === item.id">
								<input
									:value="editingValues.buy_price"
									@input="handlePriceInput('buy_price', $event)"
									type="number"
									step="0.01"
									min="0"
									class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
							</div>
							<div v-else>
								<div class="text-sm text-gray-900">
									{{ formatPrice(item.buy_price) }}
								</div>
								<div
									v-if="hasPriceHistory(item) && item.previous_buy_price !== null"
									class="text-xs text-gray-500">
									{{
										getPriceChangeIcon(item.buy_price, item.previous_buy_price)
									}}
									was {{ formatPrice(item.previous_buy_price) }}
								</div>
							</div>
						</td>

						<!-- Sell price -->
						<td class="px-4 py-4">
							<div v-if="editingItemId === item.id">
								<input
									:value="editingValues.sell_price"
									@input="handlePriceInput('sell_price', $event)"
									type="number"
									step="0.01"
									min="0"
									class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
							</div>
							<div v-else>
								<div class="text-sm text-gray-900">
									{{ formatPrice(item.sell_price) }}
								</div>
								<div
									v-if="
										hasPriceHistory(item) && item.previous_sell_price !== null
									"
									class="text-xs text-gray-500">
									{{
										getPriceChangeIcon(
											item.sell_price,
											item.previous_sell_price
										)
									}}
									was {{ formatPrice(item.previous_sell_price) }}
								</div>
							</div>
						</td>

						<!-- Stock -->
						<td class="px-4 py-4">
							<div v-if="editingItemId === item.id">
								<div class="space-y-1">
									<input
										:value="editingValues.stock_quantity"
										@input="handleQuantityInput"
										type="number"
										min="0"
										class="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
									<label class="flex items-center">
										<input
											v-model="editingValues.stock_full"
											type="checkbox"
											class="text-blue-600 rounded text-xs" />
										<span class="ml-1 text-xs text-gray-600">Full</span>
									</label>
								</div>
							</div>
							<div v-else>
								<div class="text-sm text-gray-900">
									{{ formatStock(item.stock_quantity, item.stock_full) }}
								</div>
								<div v-if="item.stock_full" class="text-xs text-red-600">
									⚠️ Stock Full
								</div>
							</div>
						</td>

						<!-- Last updated -->
						<td class="px-4 py-4">
							<div class="text-sm text-gray-900">
								{{ formatDate(item.last_updated) }}
							</div>
							<div v-if="item.previous_price_date" class="text-xs text-gray-500">
								Price history: {{ formatDate(item.previous_price_date) }}
							</div>
						</td>

						<!-- Actions -->
						<td class="px-4 py-4">
							<div v-if="editingItemId === item.id" class="flex space-x-2">
								<button
									@click="saveEdit"
									class="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
									Save
								</button>
								<button
									@click="cancelEdit"
									class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
									Cancel
								</button>
							</div>
							<div v-else class="flex space-x-2">
								<button
									@click="startEdit(item)"
									class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
									Quick Edit
								</button>
								<button
									@click="handleEdit(item)"
									class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
									Edit
								</button>
								<button
									@click="handleDelete(item)"
									class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
									Delete
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Empty state -->
		<div v-if="props.items.length === 0" class="text-center py-8">
			<div class="text-gray-500">No items found</div>
		</div>
	</div>
</template>

<style scoped>
/* Custom checkbox indeterminate styling */
input[type='checkbox']:indeterminate {
	background-color: #3b82f6;
	border-color: #3b82f6;
}

/* Responsive table scrolling */
@media (max-width: 768px) {
	.overflow-x-auto {
		-webkit-overflow-scrolling: touch;
	}
}
</style>
