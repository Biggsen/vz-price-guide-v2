<script setup>
import { computed, ref, useSlots, watch } from 'vue'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
	columns: {
		type: Array,
		required: true
	},
	rows: {
		type: Array,
		required: true
	},
	rowKey: {
		type: [String, Function],
		default: 'id'
	},
	hoverable: {
		type: Boolean,
		default: false
	},
	layout: {
		type: String,
		default: 'comfortable',
		validator: (value) => ['comfortable', 'condensed'].includes(value)
	},
	caption: {
		type: String,
		default: null
	},
	initialSortField: {
		type: String,
		default: ''
	},
	initialSortDirection: {
		type: String,
		default: 'asc',
		validator: (value) => ['asc', 'desc'].includes(value)
	}
})

const emit = defineEmits(['sort'])

const slots = useSlots()

// Check if any columns have fixed widths
const hasFixedWidthColumns = computed(() => {
	return props.columns.some((col) => col.width || col.widthStyle)
})

// Sorting state
const sortField = ref(props.initialSortField || '')
const sortDirection = ref(props.initialSortDirection || 'asc') // 'asc' or 'desc'

// Watch for prop changes to update internal state
watch(() => props.initialSortField, (newValue) => {
	if (newValue !== sortField.value) {
		sortField.value = newValue || ''
	}
})

watch(() => props.initialSortDirection, (newValue) => {
	if (newValue !== sortDirection.value) {
		sortDirection.value = newValue || 'asc'
	}
})

// Computed sorted rows
const sortedRows = computed(() => {
	if (!sortField.value) return props.rows

	return [...props.rows].sort((a, b) => {
		const column = props.columns.find((col) => col.key === sortField.value)
		if (!column) return 0

		// Use custom sort function if provided
		if (column.sortFn && typeof column.sortFn === 'function') {
			const comparison = column.sortFn(a, b)
			return sortDirection.value === 'asc' ? comparison : -comparison
		}

		// Default sorting logic
		let valueA = a?.[sortField.value]
		let valueB = b?.[sortField.value]

		// Handle null/undefined
		if (valueA == null) valueA = ''
		if (valueB == null) valueB = ''

		// Try numeric comparison first (handles strings that represent numbers)
		const numA = Number(valueA)
		const numB = Number(valueB)
		if (!isNaN(numA) && !isNaN(numB) && valueA !== '' && valueB !== '') {
			const comparison = numA - numB
			return sortDirection.value === 'asc' ? comparison : -comparison
		}

		// String comparison
		const strA = String(valueA).toLowerCase()
		const strB = String(valueB).toLowerCase()
		const comparison = strA.localeCompare(strB)
		return sortDirection.value === 'asc' ? comparison : -comparison
	})
})

// Toggle sort function
function toggleSort(columnKey) {
	const column = props.columns.find((col) => col.key === columnKey)
	if (!column || !column.sortable) return

	if (sortField.value === columnKey) {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	} else {
		sortField.value = columnKey
		sortDirection.value = 'asc'
	}

	emit('sort', {
		field: sortField.value,
		direction: sortDirection.value
	})
}

// Get sort icon for a column
function getSortIcon(columnKey) {
	if (sortField.value !== columnKey) return null
	return sortDirection.value === 'asc' ? 'up' : 'down'
}

const alignmentClasses = computed(() => {
	return props.columns.reduce((acc, column) => {
		const align = column.align || 'left'
		if (align === 'center') {
			acc[column.key] = 'text-center'
		} else if (align === 'right') {
			acc[column.key] = 'text-right'
		} else {
			acc[column.key] = 'text-left'
		}
		return acc
	}, {})
})

// Layout classes based on layout prop
const layoutClasses = computed(() => {
	return {
		cellPadding: props.layout === 'condensed' ? 'px-2 py-1' : 'px-4 py-3',
		headerPadding: props.layout === 'condensed' ? 'px-2 py-2' : 'px-4 py-3',
		fontSize: props.layout === 'condensed' ? 'text-sm' : 'text-base',
		imageSize: props.layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8',
		headerWeight: props.layout === 'condensed' ? 'font-semibold' : ''
	}
})

function resolveRowKey(row, index) {
	if (typeof props.rowKey === 'function') {
		return props.rowKey(row, index)
	}

	if (props.rowKey && row && Object.prototype.hasOwnProperty.call(row, props.rowKey)) {
		return row[props.rowKey]
	}

	return index
}
</script>

<template>
	<div class="overflow-hidden">
		<table class="w-full border-collapse" :class="{ 'table-fixed': hasFixedWidthColumns }">
			<caption
				v-if="caption"
				:class="[
					'bg-gray-asparagus text-white font-semibold text-center px-4 mb-0 border-2 border-white border-b-0',
					layout === 'comfortable' ? 'text-xl py-2' : 'text-lg py-1.5'
				]">
				{{ caption }}
			</caption>
			<thead>
				<tr>
					<th
						v-for="column in columns"
						:key="column.key"
						class="bg-gray-asparagus text-norway border-2 border-white"
						:class="[
							layoutClasses.headerPadding,
							layoutClasses.fontSize,
							layoutClasses.headerWeight,
							column.headerAlign === 'right'
								? 'text-right'
								: column.headerAlign === 'center'
								? 'text-center'
								: alignmentClasses[column.key],
							column.sortable
								? 'cursor-pointer select-none'
								: 'hover:bg-gray-asparagus',
							column.width
						]"
						:style="column.widthStyle || null"
						@click="column.sortable ? toggleSort(column.key) : null">
						<slot
							:name="`header-${column.key}`"
							:column="column"
							:sortField="sortField"
							:sortDirection="sortDirection"
							:layout="layout">
							<div
								class="flex items-center"
								:class="[
									(column.headerAlign || column.align) === 'right'
										? 'justify-end'
										: (column.headerAlign || column.align) === 'center'
										? 'justify-center'
										: 'justify-start'
								]">
								<span>{{ column.label }}</span>
								<span
									v-if="column.sortable"
									class="inline-flex items-center ml-1.5 w-4 h-4 flex-shrink-0">
									<ArrowUpIcon
										v-if="getSortIcon(column.key) === 'up'"
										class="w-4 h-4" />
									<ArrowDownIcon
										v-else-if="getSortIcon(column.key) === 'down'"
										class="w-4 h-4" />
								</span>
							</div>
						</slot>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="(row, rowIndex) in sortedRows"
					:key="resolveRowKey(row, rowIndex)"
					:class="hoverable ? 'hover:bg-sea-mist [&>td]:hover:bg-sea-mist' : ''">
					<td
						v-for="column in columns"
						:key="column.key"
						class="bg-norway text-heavy-metal border-2 border-white"
						:class="[
							layoutClasses.cellPadding,
							layoutClasses.fontSize,
							alignmentClasses[column.key],
							column.width
						]"
						:style="column.widthStyle || null">
						<slot
							:name="`cell-${column.key}`"
							:row="row"
							:column="column"
							:layout="layout">
							<slot name="cell" :row="row" :column="column" :layout="layout">
								{{ row?.[column.key] ?? '—' }}
							</slot>
						</slot>
					</td>
				</tr>
				<tr v-if="rows.length === 0">
					<td
						:colspan="columns.length"
						class="bg-norway text-heavy-metal px-6 py-8 text-center text-sm border-2 border-white">
						<slot name="empty">No records found.</slot>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>
