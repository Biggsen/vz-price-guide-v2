<script setup>
import { useFirestore } from 'vuefire'
import { useRoute, RouterLink } from 'vue-router'
import { doc, deleteDoc } from 'firebase/firestore'
import { buyUnitPrice, sellUnitPrice, buyStackPrice, sellStackPrice } from '../utils/pricing.js'
import { getEffectivePrice } from '../utils/pricing.js'
import { useAdmin } from '../utils/admin.js'
import { getImageUrl } from '../utils/image.js'
import { computed, ref, watch } from 'vue'
import { Squares2X2Icon } from '@heroicons/vue/16/solid'

const { user, canEditItems } = useAdmin()
const db = useFirestore()
const route = useRoute()

// Sorting state
const sortField = ref('')
const sortDirection = ref('asc') // 'asc' or 'desc'

const props = defineProps({
	collection: {
		type: Object
	},
	category: {
		type: String
	},
	categories: {
		type: Array
	},
	economyConfig: {
		type: Object
	},
	viewMode: {
		type: String,
		default: 'categories'
	},
	layout: {
		type: String,
		default: 'comfortable'
	}
})

// Use computed properties to stay reactive to prop changes
const priceMultiplier = computed(() => props.economyConfig.priceMultiplier)
const sellMargin = computed(() => props.economyConfig.sellMargin)
const roundToWhole = computed(() => props.economyConfig.roundToWhole)
const currentVersion = computed(() => props.economyConfig.version || '1.18')

// Check if sorting is enabled (only in list view)
const sortingEnabled = computed(() => props.viewMode === 'list')

// Sorted collection
const sortedCollection = computed(() => {
	if (!props.collection || !sortingEnabled.value || !sortField.value) {
		return props.collection
	}

	return [...props.collection].sort((a, b) => {
		let valueA, valueB

		if (sortField.value === 'name') {
			valueA = a.name?.toLowerCase() || ''
			valueB = b.name?.toLowerCase() || ''
			const comparison = valueA.localeCompare(valueB)
			return sortDirection.value === 'asc' ? comparison : -comparison
		}

		if (sortField.value === 'buy') {
			// Calculate buy prices for comparison using effective price
			const versionKey = currentVersion.value.replace('.', '_')
			valueA = getEffectivePrice(a, versionKey) * (priceMultiplier.value || 1)
			valueB = getEffectivePrice(b, versionKey) * (priceMultiplier.value || 1)
			const comparison = valueA - valueB
			return sortDirection.value === 'asc' ? comparison : -comparison
		}

		return 0
	})
})

// Watch for view mode changes and reset/set sorting accordingly
watch(
	() => props.viewMode,
	(newMode) => {
		if (newMode === 'list') {
			// Enable default sorting in list view
			sortField.value = 'name'
			sortDirection.value = 'asc'
		} else {
			// Disable sorting in category view
			sortField.value = ''
		}
	},
	{ immediate: true }
)

// Toggle sort function (only works when sorting is enabled)
function toggleSort(field) {
	if (!sortingEnabled.value) return

	if (sortField.value === field) {
		sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
	} else {
		sortField.value = field
		sortDirection.value = 'asc'
	}
}

// Create the redirect URL with current query parameters
function getEditLinkQuery() {
	// Use the current route's query object directly to avoid double-encoding
	const queryString = new URLSearchParams(route.query).toString()
	const redirectPath = route.path + (queryString ? `?${queryString}` : '')
	return {
		redirect: redirectPath
	}
}

async function deleteItem(itemId) {
	if (confirm('Are you sure you want to delete this item?')) {
		await deleteDoc(doc(db, 'items', itemId))
	}
}

// Helper function to get effective price for template use
function getItemEffectivePrice(item) {
	const versionKey = currentVersion.value.replace('.', '_')
	return getEffectivePrice(item, versionKey)
}
</script>

<template>
	<table
		v-if="collection.length > 0"
		class="w-full table-auto"
		:class="{ 'table-condensed': layout === 'condensed' }">
		<caption :id="category == 'ores' ? 'ores' : ''">
			{{ category }}
			({{ sortedCollection.length }})
		</caption>
		<thead>
			<tr>
				<th rowspan="2" class="hidden">Material ID</th>
				<th
					rowspan="2"
					:class="[sortingEnabled ? 'cursor-pointer hover:bg-opacity-80 transition' : '']"
					@click="sortingEnabled ? toggleSort('name') : null">
					<div v-if="sortingEnabled" class="flex items-center justify-center gap-1">
						<span>Item/Block Name</span>
						<span class="text-xs">
							<span v-if="sortField === 'name' && sortDirection === 'asc'">▲</span>
							<span v-else-if="sortField === 'name' && sortDirection === 'desc'">
								▼
							</span>
							<span v-else class="opacity-50">▲▼</span>
						</span>
					</div>
					<span v-else>Item/Block Name</span>
				</th>
				<th rowspan="2"></th>
				<th colspan="2">
					<span class="hidden min-[330px]:inline">Unit Price</span>
					<span class="min-[330px]:hidden">Unit</span>
				</th>
				<th colspan="2">
					<span class="hidden min-[330px]:inline">Stack Price</span>
					<span class="min-[330px]:hidden">Stack</span>
				</th>
				<th rowspan="2" v-if="canEditItems">Actions</th>
			</tr>
			<tr>
				<th
					:class="[sortingEnabled ? 'cursor-pointer hover:bg-opacity-80 transition' : '']"
					@click="sortingEnabled ? toggleSort('buy') : null">
					<div v-if="sortingEnabled" class="flex items-center justify-center gap-1">
						<span>Buy</span>
						<span class="text-xs">
							<span v-if="sortField === 'buy' && sortDirection === 'asc'">▲</span>
							<span v-else-if="sortField === 'buy' && sortDirection === 'desc'">
								▼
							</span>
							<span v-else class="opacity-50">▲▼</span>
						</span>
					</div>
					<span v-else>Buy</span>
				</th>
				<th>Sell</th>
				<th>Buy</th>
				<th>Sell</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="item in sortedCollection" :key="item.id">
				<td class="hidden">{{ item.material_id }}</td>
				<th width="50%" class="text-left">
					<div class="flex items-center gap-1">
						<a
							:href="
								item.url && item.url.trim() !== ''
									? item.url
									: `https://minecraft.fandom.com/wiki/${item.material_id}`
							"
							target="_blank"
							class="font-normal hover:text-gray-asparagus hover:underline">
							{{ item.name }}
						</a>
						<span
							v-if="item.pricing_type === 'dynamic'"
							class="text-laurel text-xs cursor-help ml-auto"
							title="Dynamic pricing - calculated from recipe ingredients">
							<Squares2X2Icon class="w-3 h-3 sm:w-4 sm:h-4" />
						</span>
					</div>
				</th>
				<td width="5%">
					<img
						:src="getImageUrl(item.image)"
						:alt="item.name"
						loading="lazy"
						decoding="async"
						fetchpriority="low"
						:class="
							layout === 'condensed'
								? 'max-w-[20px] lg:max-w-[30px]'
								: 'max-w-[30px] lg:max-w-[50px]'
						" />
				</td>
				<td class="text-center">
					{{ buyUnitPrice(getItemEffectivePrice(item), priceMultiplier, roundToWhole) }}
				</td>

				<td class="text-center">
					{{
						sellUnitPrice(
							getItemEffectivePrice(item),
							priceMultiplier,
							sellMargin,
							roundToWhole
						)
					}}
				</td>

				<td class="text-center">
					{{
						buyStackPrice(
							getItemEffectivePrice(item),
							item.stack,
							priceMultiplier,
							roundToWhole
						)
					}}
				</td>
				<td class="text-center">
					{{
						sellStackPrice(
							getItemEffectivePrice(item),
							item.stack,
							priceMultiplier,
							sellMargin,
							roundToWhole
						)
					}}
				</td>
				<td v-if="canEditItems">
					<RouterLink
						:to="{ path: `/edit/${item.id}`, query: getEditLinkQuery() }"
						class="text-gray-asparagus underline hover:text-heavy-metal px-1 py-0">
						Edit
					</RouterLink>
					<span class="mx-1">|</span>
					<a
						href="#"
						@click.prevent="deleteItem(item.id)"
						class="text-red-600 underline hover:text-red-800 px-1 py-0">
						Delete
					</a>
				</td>
			</tr>
		</tbody>
	</table>
</template>

<style lang="scss" scoped>
nav {
	@apply bg-norway border-x-2 border-white border-b-4 py-1 sm:py-2 px-3 sm:px-4 flex justify-between;
	a {
		@apply text-heavy-metal text-sm sm:text-base font-bold capitalize underline;
	}
}

caption {
	@apply bg-gray-asparagus text-white text-base sm:text-xl capitalize font-bold py-2 sm:py-5 border-2 border-white border-b-0;
}

thead th {
	@apply bg-gray-asparagus text-norway;
}

tbody {
	th,
	td {
		@apply bg-norway;
	}
}

th,
td {
	@apply text-sm sm:text-base border-2 border-white px-1 sm:px-3 py-0.5 sm:py-1;
}

// Condensed table styles
.table-condensed {
	caption {
		@apply py-1 sm:py-2 text-sm sm:text-base;
	}

	th,
	td {
		@apply text-xs sm:text-sm px-1 sm:px-2 py-0.5;
	}

	th {
		@apply font-medium;
	}

	tbody tr {
		@apply leading-tight;
	}
}
</style>
