<script setup>
import {
	buyUnitPrice,
	sellUnitPrice,
	buyStackPrice,
	sellStackPrice,
	getEffectivePrice,
	getEffectivePriceMemoized
} from '../utils/pricing.js'
import { useAdmin } from '../utils/admin.js'
import { getImageUrl, getWikiUrl } from '../utils/image.js'
import { computed, ref, watch, nextTick } from 'vue'
import { Squares2X2Icon } from '@heroicons/vue/16/solid'

const { canEditItems } = useAdmin()

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
	},
	showStackSize: {
		type: Boolean,
		default: true
	},
	openHoverPanel: {
		type: [String, null],
		default: null
	},
	toggleHoverPanel: {
		type: Function,
		required: true
	},
	closeHoverPanel: {
		type: Function,
		required: true
	}
})

// Use computed properties to stay reactive to prop changes
const priceMultiplier = computed(() => props.economyConfig.priceMultiplier)
const sellMargin = computed(() => props.economyConfig.sellMargin)
const roundToWhole = computed(() => props.economyConfig.roundToWhole)
const currentVersion = computed(() => props.economyConfig.version || '1.21')

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

// Helper function to get effective price for template use
function getItemEffectivePrice(item) {
	const versionKey = currentVersion.value.replace('.', '_')
	return getEffectivePriceMemoized(item, versionKey)
}

// Wrapper for toggle hover panel that stops event propagation
function handleToggleHoverPanel(itemId, event) {
	event.stopPropagation()
	props.toggleHoverPanel(itemId)
}

// Get recipe for an item based on current version with fallback logic
function getItemRecipe(item) {
	if (!item.recipes_by_version || !currentVersion.value) {
		return null
	}
	
	const versionKey = currentVersion.value.replace('.', '_')
	const availableVersions = Object.keys(item.recipes_by_version)
	
	// First try to get the exact version
	if (item.recipes_by_version[versionKey]) {
		return item.recipes_by_version[versionKey]
	}
	
	// If no exact match, find the latest available version that's <= current version
	const sortedVersions = availableVersions
		.map(v => v.replace('_', '.'))
		.sort((a, b) => {
			const aParts = a.split('.').map(Number)
			const bParts = b.split('.').map(Number)
			for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
				const aVal = aParts[i] || 0
				const bVal = bParts[i] || 0
				if (aVal !== bVal) return bVal - aVal // Sort descending (newest first)
			}
			return 0
		})
		.filter(v => {
			const vParts = v.split('.').map(Number)
			const currentParts = currentVersion.value.split('.').map(Number)
			return vParts[0] < currentParts[0] || 
				   (vParts[0] === currentParts[0] && vParts[1] <= currentParts[1])
		})
	
	if (sortedVersions.length > 0) {
		const fallbackVersion = sortedVersions[0].replace('.', '_')
		return item.recipes_by_version[fallbackVersion]
	}
	
	return null
}
</script>

<template>
	<div @click="props.closeHoverPanel">
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
						:class="[
							sortingEnabled ? 'cursor-pointer hover:bg-opacity-80 transition' : ''
						]"
						@click="sortingEnabled ? toggleSort('name') : null">
						<div v-if="sortingEnabled" class="flex items-center justify-center gap-1">
							<span>Item/Block Name</span>
							<span class="text-xs">
								<span v-if="sortField === 'name' && sortDirection === 'asc'">
									▲
								</span>
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
					<th v-if="showStackSize" rowspan="2" class="w-16">
						<span class="hidden min-[330px]:inline">Stack Size</span>
						<span class="min-[330px]:hidden">Size</span>
					</th>
				</tr>
				<tr>
					<th
						:class="[
							sortingEnabled ? 'cursor-pointer hover:bg-opacity-80 transition' : ''
						]"
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
								:href="getWikiUrl(item)"
								target="_blank"
								rel="noopener noreferrer"
								class="font-normal hover:text-gray-asparagus hover:underline">
								{{ item.name }}
							</a>
							<span
								v-if="item.pricing_type === 'dynamic'"
								class="text-highland text-xs cursor-pointer ml-auto relative"
								@click="handleToggleHoverPanel(item.id, $event)">
								<Squares2X2Icon class="w-3 h-3 sm:w-4 sm:h-4" />
								<!-- Hover Panel -->
								<div
									v-if="props.openHoverPanel === item.id"
									:class="[
										'absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-max cursor-default',
										layout === 'comfortable' ? 'px-4 py-3' : 'px-3 py-2'
									]"
									@click.stop>
									<!-- Speech bubble pointer -->
									<div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"></div>
									<div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
									<div class="text-sm">
										<div v-if="getItemRecipe(item)" class="space-y-1">
											<div
												v-for="ingredient in getItemRecipe(item).ingredients"
												:key="ingredient.material_id"
												:class="[
													'flex items-center gap-2 whitespace-nowrap',
													layout === 'comfortable' ? 'text-sm' : 'text-xs'
												]">
												<img
													:src="getImageUrl(`/images/items/${ingredient.material_id}.png`)"
													:alt="ingredient.material_id.replace(/_/g, ' ')"
													:class="layout === 'comfortable' ? 'w-5 h-5' : 'w-4 h-4'"
													loading="lazy" />
												<span :class="[
													'text-gray-800',
													layout === 'comfortable' ? 'font-medium' : ''
												]">
													<span>{{ ingredient.quantity }}</span>
													{{ ingredient.material_id.replace(/_/g, ' ') }}
												</span>
											</div>
										</div>
										<div v-else class="text-xs text-gray-500">
											No recipe data available
										</div>
									</div>
								</div>
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
						{{
							buyUnitPrice(getItemEffectivePrice(item), priceMultiplier, roundToWhole)
						}}
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
					<td v-if="showStackSize" class="text-center px-1 py-0.5 w-16">
						{{ item.stack }}
					</td>
				</tr>
			</tbody>
		</table>
	</div>
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
