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
		default: false
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
	<div class="overflow-hidden">
		<table class="w-full border-collapse">
			<thead>
				<tr>
					<th
						v-for="column in columns"
						:key="column.key"
						class="bg-gray-asparagus text-norway border-2 border-white px-4 py-3 text-base font-bold hover:bg-gray-asparagus"
						:class="alignmentClasses[column.key]">
						<slot :name="`header-${column.key}`" :column="column">
							{{ column.label }}
						</slot>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, rowIndex) in rows" :key="resolveRowKey(row, rowIndex)">
					<td
						v-for="column in columns"
						:key="column.key"
						class="bg-norway text-heavy-metal border-2 border-white px-4 py-3 text-base"
						:class="[
							alignmentClasses[column.key],
							hoverable ? 'hover:bg-sea-mist' : ''
						]">
						<slot :name="`cell-${column.key}`" :row="row" :column="column">
							<slot name="cell" :row="row" :column="column">
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
