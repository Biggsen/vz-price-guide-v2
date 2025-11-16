<script setup>
import { computed, useSlots } from 'vue'

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
		default: true
	}
})

const slots = useSlots()

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
	<div class="base-table__wrapper" :class="{ 'base-table__wrapper--hoverable': hoverable }">
		<table class="base-table">
			<thead>
				<tr>
					<th
						v-for="column in columns"
						:key="column.key"
						class="base-table__header-cell"
						:class="alignmentClasses[column.key]">
						<slot :name="`header-${column.key}`" :column="column">
							{{ column.label }}
						</slot>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, rowIndex) in rows" :key="resolveRowKey(row, rowIndex)" class="base-table__row">
					<td
						v-for="column in columns"
						:key="column.key"
						class="base-table__cell"
						:class="alignmentClasses[column.key]">
						<slot :name="`cell-${column.key}`" :row="row" :column="column">
							<slot name="cell" :row="row" :column="column">
								{{ row?.[column.key] ?? '—' }}
							</slot>
						</slot>
					</td>
				</tr>
				<tr v-if="rows.length === 0">
					<td :colspan="columns.length" class="base-table__empty">
						<slot name="empty">No records found.</slot>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped>
.base-table__wrapper {
	@apply overflow-hidden border border-white;
}

.base-table {
	@apply w-full border-collapse;
}

.base-table__header-cell {
	@apply bg-gray-asparagus text-norway border border-white px-4 py-3 text-base font-bold;
}

.base-table__cell {
	@apply bg-norway text-heavy-metal border border-white px-4 py-3 text-base;
}

.base-table__wrapper--hoverable :deep(tbody tr:hover td) {
	@apply bg-sea-mist;
}

.base-table__empty {
	@apply bg-norway text-heavy-metal px-6 py-8 text-center text-sm border border-white;
}
</style>

