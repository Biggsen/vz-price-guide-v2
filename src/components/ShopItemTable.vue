<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
	items: {
		type: Array,
		required: true
	},
	server: {
		type: Object,
		required: true
	},
	shop: {
		type: Object,
		default: null
	},
	showShopNames: {
		type: Boolean,
		default: false
	},
	readOnly: {
		type: Boolean,
		default: false
	},
	viewMode: {
		type: String,
		default: 'categories',
		validator: (value) => ['categories', 'list'].includes(value)
	},
	layout: {
		type: String,
		default: 'comfortable',
		validator: (value) => ['comfortable', 'condensed'].includes(value)
	},
	appearance: {
		type: String,
		default: 'card',
		validator: (value) => ['card', 'embedded', 'guide'].includes(value)
	}
})

const emit = defineEmits(['edit', 'delete', 'bulk-update', 'quick-edit'])

// Router setup
const router = useRouter()

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
			case 'shop_name':
				valueA = a.shopData?.name?.toLowerCase() || ''
				valueB = b.shopData?.name?.toLowerCase() || ''
				break
			case 'buy_price':
				valueA = a.buy_price || 0
				valueB = b.buy_price || 0
				break
			case 'sell_price':
				valueA = a.sell_price || 0
				valueB = b.sell_price || 0
				break
			case 'profit_margin':
				valueA = calculateMargin(a) || 0
				valueB = calculateMargin(b) || 0
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

// Track first occurrence of each item for grouping
const firstOccurrenceMap = computed(() => {
	const map = new Map()
	sortedItems.value.forEach((item, index) => {
		const itemName = item.itemData?.name || 'Unknown Item'
		if (!map.has(itemName)) {
			map.set(itemName, index)
		}
	})
	return map
})

// Layout classes based on layout prop
const layoutClasses = computed(() => {
	return {
		cellPadding: props.layout === 'condensed' ? 'px-2 py-1' : 'px-3 py-2',
		headerPadding: props.layout === 'condensed' ? 'px-2 py-2' : 'px-4 py-3',
		bulkToolbarPadding: props.layout === 'condensed' ? 'px-3 py-2' : 'px-4 py-3',
		imageSize: props.layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8',
		inputSize:
			props.layout === 'condensed' ? 'w-16 px-1 py-0.5 text-xs' : 'w-20 px-2 py-1 text-sm'
	}
})

const isGuide = computed(() => props.appearance === 'guide')

const tableClass = computed(() => {
	return props.appearance === 'guide' ? 'w-full table-guide' : 'w-full'
})

const outerContainerClass = computed(() => {
	if (props.appearance === 'guide') {
		return 'rounded-lg overflow-hidden'
	}
	if (props.appearance === 'embedded') {
		return 'rounded-lg overflow-hidden border-white border-0 shadow-none bg-transparent'
	}
	return 'bg-white rounded-lg shadow-md overflow-hidden'
})

function headerClass(field = null, sortable = false) {
	const classes = [
		layoutClasses.value.headerPadding,
		'text-left text-xs uppercase tracking-wider'
	]

	if (sortable) {
		classes.push('cursor-pointer transition-colors')
	}

	if (isGuide.value) {
		classes.push('font-semibold text-norway')
		if (sortable) {
			classes.push('hover:bg-gray-asparagus/90')
		}
	} else {
		classes.push('font-medium text-gray-500')
		if (sortable) {
			classes.push('hover:bg-gray-100')
		}
	}

	if (!isGuide.value && sortable && field && sortField.value === field) {
		classes.push('bg-blue-50')
	}

	return classes
}

function cellClass(additional = '') {
	const parts = [layoutClasses.value.cellPadding, additional]
	if (isGuide.value) {
		parts.push('border-2 border-white bg-norway text-heavy-metal')
	}
	return parts.filter(Boolean).join(' ')
}

// Check if this is the first occurrence of an item
function isFirstOccurrence(item, index) {
	const itemName = item.itemData?.name || 'Unknown Item'
	return firstOccurrenceMap.value.get(itemName) === index
}

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
	if (sortField.value !== field) return null
	return sortDirection.value === 'asc' ? 'up' : 'down'
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
	// Cancel any existing edit first
	cancelEdit()

	// Debug logging
	console.log('ShopItemTable: Starting edit for item ID:', item.id)

	// Set the new editing item
	editingItemId.value = item.id
	editingValues.value = {
		buy_price: item.buy_price,
		sell_price: item.sell_price,
		stock_full: item.stock_full || false,
		shop_owner_broke: hasInsufficientFunds(item),
		notes: item.notes || ''
	}
}

function cancelEdit() {
	console.log('ShopItemTable: Canceling edit')
	editingItemId.value = null
	editingValues.value = {}
}

function saveEdit() {
	console.log('ShopItemTable: Saving edit for item ID:', editingItemId.value)
	if (editingItemId.value) {
		const item = props.items.find((i) => i.id === editingItemId.value)
		if (item) {
			const updatedItem = {
				...item,
				...editingValues.value
			}

			// Include shop update information if needed
			if (editingValues.value._resetOwnerFunds) {
				updatedItem._resetOwnerFunds = true
				updatedItem._shopId = editingValues.value._shopId
			}
			if (editingValues.value._setOwnerFunds !== undefined) {
				updatedItem._setOwnerFunds = editingValues.value._setOwnerFunds
				updatedItem._shopId = editingValues.value._shopId
			}

			// Clean up internal flags from the updated item
			delete updatedItem._resetOwnerFunds
			delete updatedItem._shopId
			delete updatedItem._setOwnerFunds

			// But keep the flags for the emit
			const emitData = { ...updatedItem }
			if (editingValues.value._resetOwnerFunds) {
				emitData._resetOwnerFunds = true
				emitData._shopId = editingValues.value._shopId
			}
			if (editingValues.value._setOwnerFunds !== undefined) {
				emitData._setOwnerFunds = editingValues.value._setOwnerFunds
				emitData._shopId = editingValues.value._shopId
			}

			emit('quick-edit', emitData)
		}
	}
	cancelEdit()
}

// Helper function to check if an item is currently being edited
function isEditing(itemId) {
	return editingItemId.value === itemId
}

// Watch for items changes
watch(
	() => props.items,
	(newItems) => {
		if (newItems && newItems.length > 0) {
			console.log('ShopItemTable: Items loaded, count:', newItems.length)

			// Check for missing IDs
			const missingIds = newItems.filter((item) => !item.id)
			if (missingIds.length > 0) {
				console.warn('ShopItemTable: Items missing IDs:', missingIds.length)
				console.log('First missing ID item:', missingIds[0])
			}
		}
	},
	{ immediate: true }
)

// Utility methods
function formatPrice(price) {
	if (price === null || price === undefined) return '-'
	return parseFloat(price).toFixed(2)
}

function formatDate(dateString) {
	if (!dateString) return '-'

	const date = new Date(dateString)
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

	const diffTime = today.getTime() - itemDate.getTime()
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		return 'Today'
	} else if (diffDays === 1) {
		return 'Yesterday'
	} else {
		return `${diffDays} days ago`
	}
}

function calculateMargin(item) {
	// Only calculate margin if both buy and sell prices exist
	if (!item.buy_price || !item.sell_price || item.buy_price === 0) {
		return null
	}

	// Calculate profit margin: (revenue - cost) / revenue * 100
	const profit = item.buy_price - item.sell_price
	const margin = (profit / item.buy_price) * 100
	return margin
}

function formatMargin(margin) {
	if (margin === null || margin === undefined) return '-'

	const formattedMargin = margin.toFixed(1) + '%'
	return formattedMargin
}

function getMarginColor(margin) {
	if (margin === null || margin === undefined) return 'bg-gray-100 text-gray-700'
	// Higher margins are better for shop profitability
	if (margin > 70) return 'bg-green-100 text-green-800' // Excellent margin
	if (margin > 40) return 'bg-yellow-100 text-yellow-800' // Good margin
	if (margin > 0) return 'bg-orange-100 text-orange-800' // Low margin
	return 'bg-red-100 text-red-800' // Losing money
}

function hasPriceHistory(item) {
	return item.previous_buy_price !== null || item.previous_sell_price !== null
}

function hasPriceChanged(current, previous) {
	if (previous === null || previous === undefined) return false
	if (current === null || current === undefined) return false

	return current !== previous
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

function handleBrokeCheckboxChange(checked) {
	editingValues.value.shop_owner_broke = checked

	// Find the current item being edited to get shop data
	const currentItem = props.items.find((i) => i.id === editingItemId.value)
	if (currentItem) {
		const shopData = props.shop || currentItem.shopData
		if (shopData) {
			if (checked) {
				// Set owner_funds to 0 to mark as broke
				editingValues.value._setOwnerFunds = 0
			} else {
				// Set owner_funds to null to allow automatic calculation
				editingValues.value._setOwnerFunds = null
			}
			editingValues.value._shopId = shopData.id
		}
	}
}

// Check if shop has insufficient funds to buy items from customers
function hasInsufficientFunds(item) {
	// Get shop data either from props (single shop view) or from item.shopData (multi-shop view)
	const shopData = props.shop || item.shopData

	if (
		!shopData ||
		shopData.owner_funds === null ||
		shopData.owner_funds === undefined ||
		!item.sell_price
	) {
		return false
	}
	return shopData.owner_funds < item.sell_price
}

// Navigation methods
function navigateToShopItems(shopId) {
	router.push({
		path: '/shop-items',
		query: { shop: shopId }
	})
}
</script>

<template>
	<div :class="outerContainerClass">
		<!-- Bulk actions toolbar -->
		<div
			v-if="hasSelected && !readOnly"
			:class="['bg-blue-50 border-b border-blue-200', layoutClasses.bulkToolbarPadding]">
			<div class="flex items-center justify-between">
				<span class="text-sm text-blue-700">
					{{ selectedItems.length }} item{{ selectedItems.length !== 1 ? 's' : '' }}
					selected
				</span>
				<div class="space-x-2">
					<button
						@click="bulkUpdateSelected"
						class="px-3 py-1 text-sm bg-semantic-info text-white rounded hover:bg-opacity-80 transition-colors">
						Bulk Update
					</button>
					<button
						@click="selectedItems = []"
						class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-opacity-80 transition-colors">
						Clear Selection
					</button>
				</div>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto">
			<table :class="tableClass">
				<thead :class="isGuide ? '' : 'bg-gray-50'">
					<tr>
						<th v-if="!readOnly" :class="headerClass(null, false)">
							<input
								type="checkbox"
								:checked="allSelected"
								:indeterminate="someSelected"
								@change="toggleSelectAll"
								class="checkbox-input" />
						</th>
						<th
							@click="setSortField('name')"
							:class="headerClass('name', true)">
							<div class="flex items-center gap-1">
								<span>Item</span>
								<ArrowUpIcon
									v-if="getSortIcon('name') === 'up'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
								<ArrowDownIcon
									v-else-if="getSortIcon('name') === 'down'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
							</div>
						</th>
						<th
							v-if="showShopNames"
							@click="setSortField('shop_name')"
							:class="headerClass('shop_name', true)">
							<div class="flex items-center gap-1">
								<span>Shop</span>
								<ArrowUpIcon
									v-if="getSortIcon('shop_name') === 'up'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
								<ArrowDownIcon
									v-else-if="getSortIcon('shop_name') === 'down'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
							</div>
						</th>
						<th
							@click="setSortField('buy_price')"
							:class="headerClass('buy_price', true)">
							<div class="flex items-center gap-1">
								<span>Buy Price</span>
								<ArrowUpIcon
									v-if="getSortIcon('buy_price') === 'up'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
								<ArrowDownIcon
									v-else-if="getSortIcon('buy_price') === 'down'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
							</div>
						</th>
						<th
							@click="setSortField('sell_price')"
							:class="headerClass('sell_price', true)">
							<div class="flex items-center gap-1">
								<span>Sell Price</span>
								<ArrowUpIcon
									v-if="getSortIcon('sell_price') === 'up'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
								<ArrowDownIcon
									v-else-if="getSortIcon('sell_price') === 'down'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
							</div>
						</th>
						<th
							@click="setSortField('profit_margin')"
							:class="headerClass('profit_margin', true)">
							<div class="flex items-center gap-1">
								<span>Profit Margin</span>
								<ArrowUpIcon
									v-if="getSortIcon('profit_margin') === 'up'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
								<ArrowDownIcon
									v-else-if="getSortIcon('profit_margin') === 'down'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
							</div>
						</th>
						<th
							@click="setSortField('last_updated')"
							:class="headerClass('last_updated', true)">
							<div class="flex items-center gap-1">
								<span>Last Updated</span>
								<ArrowUpIcon
									v-if="getSortIcon('last_updated') === 'up'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
								<ArrowDownIcon
									v-else-if="getSortIcon('last_updated') === 'down'"
									:class="['w-4 h-4', isGuide ? 'text-norway' : 'text-gray-700']" />
							</div>
						</th>
						<th
							v-if="!readOnly"
							:class="headerClass(null, false)">
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					<tr
						v-for="(item, index) in sortedItems"
						:key="item.id"
						:class="[
							!isGuide && isEditing(item.id) && !readOnly ? 'bg-yellow-50 border-yellow-200' : '',
							!isGuide && isSelected(item.id) && !readOnly && !isEditing(item.id) ? 'bg-blue-50' : '',
							!isGuide && item.shopData?.is_own_shop && !isSelected(item.id) && !isEditing(item.id)
								? 'bg-green-50'
								: ''
						]">
						<!-- Selection checkbox -->
						<td v-if="!readOnly" :class="cellClass()">
							<input
								type="checkbox"
								:checked="isSelected(item.id)"
								@change="toggleSelectItem(item.id)"
								class="checkbox-input" />
						</td>

						<!-- Item info -->
						<td :class="cellClass()">
							<div class="flex items-center">
								<div
									v-if="item.itemData?.image"
									:class="[layoutClasses.imageSize, 'mr-3 flex-shrink-0']">
									<img
										:src="item.itemData.image"
										:alt="item.itemData.name"
										class="w-full h-full object-contain" />
								</div>
								<div>
									<div class="font-medium text-gray-900">
										{{ item.itemData?.name || 'Unknown Item' }}
									</div>
									<div v-if="item.notes" class="text-xs text-gray-400 mt-1">
										📝 {{ item.notes }}
									</div>
								</div>
							</div>
						</td>

						<!-- Shop name (only when showing shop names) -->
						<td v-if="showShopNames" :class="cellClass()">
							<div
								@click="navigateToShopItems(item.shopData?.id)"
								class="text-sm text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
								{{ item.shopData?.name || 'Unknown Shop' }}
							</div>
							<div v-if="item.shopData?.location" class="text-xs text-gray-500">
								📍 {{ item.shopData.location }}
							</div>
						</td>

						<!-- Buy price -->
						<td :class="cellClass()">
							<div v-if="isEditing(item.id) && !readOnly">
								<input
									:value="editingValues.buy_price"
									@input="handlePriceInput('buy_price', $event)"
									type="number"
									step="0.01"
									min="0"
									class="w-20 px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
							</div>
							<div v-else>
								<div class="text-sm text-gray-900">
									{{ formatPrice(item.buy_price) }}
								</div>
								<div
									v-if="hasPriceChanged(item.buy_price, item.previous_buy_price)"
									class="text-xs text-gray-500">
									{{
										getPriceChangeIcon(item.buy_price, item.previous_buy_price)
									}}
									was {{ formatPrice(item.previous_buy_price) }}
								</div>
							</div>
						</td>

						<!-- Sell price -->
						<td :class="cellClass()">
							<div v-if="isEditing(item.id) && !readOnly">
								<div class="flex items-start gap-2">
									<input
										:value="editingValues.sell_price"
										@input="handlePriceInput('sell_price', $event)"
										type="number"
										step="0.01"
										min="0"
										class="w-20 px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
									<div class="space-y-1">
										<label class="flex items-center">
											<input
												v-model="editingValues.stock_full"
												type="checkbox"
												class="text-blue-600 rounded text-xs" />
											<span class="ml-1 text-xs text-gray-600">Full</span>
										</label>
										<label class="flex items-center">
											<input
												:checked="editingValues.shop_owner_broke"
												type="checkbox"
												@change="
													handleBrokeCheckboxChange($event.target.checked)
												"
												class="text-blue-600 rounded text-xs" />
											<span class="ml-1 text-xs text-gray-600">Broke</span>
										</label>
									</div>
								</div>
							</div>
							<div v-else>
								<div class="flex items-center gap-1">
									<span
										class="text-sm"
										:class="
											hasInsufficientFunds(item) || item.stock_full
												? 'text-gray-400 line-through'
												: 'text-gray-900'
										">
										{{ formatPrice(item.sell_price) }}
									</span>
									<span
										v-if="hasInsufficientFunds(item)"
										class="text-xs text-red-500">
										broke
									</span>
									<span
										v-else-if="item.stock_full"
										class="text-xs text-orange-500">
										full
									</span>
								</div>

								<div
									v-if="
										!hasInsufficientFunds(item) &&
										!item.stock_full &&
										hasPriceChanged(item.sell_price, item.previous_sell_price)
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

						<!-- Profit Margin -->
						<td :class="cellClass()">
							<span
								v-if="calculateMargin(item) !== null"
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
								:class="getMarginColor(calculateMargin(item))">
								{{ formatMargin(calculateMargin(item)) }}
							</span>
						</td>

						<!-- Last updated -->
						<td :class="cellClass()">
							<div class="text-sm text-gray-900">
								{{ formatDate(item.last_updated) }}
							</div>
						</td>

						<!-- Actions -->
						<td v-if="!readOnly" :class="cellClass()">
							<div v-if="isEditing(item.id)" class="flex space-x-2">
								<button
									@click="saveEdit"
									class="px-2 py-1 text-xs bg-semantic-success text-white rounded hover:bg-opacity-80 transition-colors">
									Save
								</button>
								<button
									@click="cancelEdit"
									class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-opacity-80 transition-colors">
									Cancel
								</button>
							</div>
							<div v-else class="flex space-x-2">
								<button
									@click="startEdit(item)"
									class="px-2 py-1 text-xs bg-semantic-info text-white rounded hover:bg-opacity-80 transition-colors">
									Quick Edit
								</button>
								<button
									@click="handleEdit(item)"
									class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-opacity-80 transition-colors">
									Edit
								</button>
								<button
									@click="handleDelete(item)"
									class="px-2 py-1 text-xs bg-semantic-danger text-white rounded hover:bg-opacity-80 transition-colors">
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

.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}

.table-guide {
	border-collapse: separate;
	border-spacing: 0;
}

.table-guide :deep(thead th) {
	@apply bg-gray-asparagus text-norway border-2 border-white;
}

.table-guide :deep(tbody th),
.table-guide :deep(tbody td) {
	@apply bg-norway text-heavy-metal border-2 border-white;
}

.table-guide :deep(tbody tr:hover td) {
	@apply bg-sea-mist;
}
</style>
