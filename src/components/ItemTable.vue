<script setup>
import {
	buyUnitPrice,
	sellUnitPrice,
	buyStackPrice,
	sellStackPrice,
	getEffectivePrice,
	getEffectivePriceMemoized,
	getDiamondPricing,
	getDiamondShulkerPricing,
	formatDiamondRatio,
	formatDiamondRatioFull,
	formatNumber
} from '../utils/pricing.js'
import { getImageUrl, getWikiUrl } from '../utils/image.js'
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { Squares2X2Icon } from '@heroicons/vue/16/solid'

// Sorting state
const sortField = ref('')
const sortDirection = ref('asc') // 'asc' or 'desc'

// Track if user has clicked on any recipe icon (like a dismissible banner)
// Check localStorage on component mount
const hasClickedRecipe = ref(localStorage.getItem('hasClickedRecipe') === 'true')

// Mobile detection (below 640px, Tailwind's sm breakpoint)
const isMobile = ref(false)

function checkMobile() {
	isMobile.value = window.innerWidth < 640
}

onMounted(() => {
	checkMobile()
	window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
	window.removeEventListener('resize', checkMobile)
})

// Format diamond ratio for mobile (uses "/" instead of " per ")
function formatDiamondRatioMobile(diamonds, quantity) {
	if (diamonds === 0 || quantity === 0) return '—'
	if (quantity === 1) {
		return `${diamonds}/1`
	}
	return `${diamonds}/${quantity}`
}

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
	allItems: {
		type: Array,
		default: () => []
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
const showFullNumbers = computed(() => props.economyConfig.showFullNumbers === true)
const hideSellPrices = computed(() => props.economyConfig.hideSellPrices === true)
const useSmartNumberFormatting = computed(() => !showFullNumbers.value)
const currentVersion = computed(() => props.economyConfig.version || '1.21')
const currencyType = computed(() => props.economyConfig.currencyType || 'money')
const diamondItemId = computed(() => props.economyConfig.diamondItemId)
const diamondRoundingDirection = computed(() => props.economyConfig.diamondRoundingDirection || 'nearest')

// Find diamond item from all items
const diamondItem = computed(() => {
	if (!diamondItemId.value || !props.allItems || props.allItems.length === 0) {
		// Fallback: try to find by material_id 'diamond'
		return props.allItems?.find((item) => item.material_id === 'diamond') || null
	}
	return props.allItems?.find((item) => item.id === diamondItemId.value || item.material_id === 'diamond') || null
})

// Check if we're in diamond currency mode
const isDiamondCurrency = computed(() => currencyType.value === 'diamond' && diamondItem.value !== null)

// Check if sorting is enabled (only in list view)
const sortingEnabled = computed(() => props.viewMode === 'list')

// Filter out diamond items when in diamond currency mode
const filteredCollection = computed(() => {
	if (!props.collection) return []
	
	// Exclude diamond and diamond_block when using diamond currency
	if (isDiamondCurrency.value) {
		return props.collection.filter(
			(item) => item.material_id !== 'diamond' && item.material_id !== 'diamond_block'
		)
	}
	
	return props.collection
})

// Sorted collection
const sortedCollection = computed(() => {
	if (!filteredCollection.value || !sortingEnabled.value || !sortField.value) {
		return filteredCollection.value
	}

	return [...filteredCollection.value].sort((a, b) => {
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

// Get diamond pricing for an item
function getItemDiamondPricing(item) {
	if (!isDiamondCurrency.value || !diamondItem.value) {
		return null
	}
	return getDiamondPricing(
		item,
		diamondItem.value,
		currentVersion.value,
		sellMargin.value,
		diamondRoundingDirection.value
	)
}

// Get diamond shulker pricing for an item
function getItemDiamondShulkerPricing(item) {
	if (!isDiamondCurrency.value || !diamondItem.value) {
		return null
	}
	return getDiamondShulkerPricing(
		item,
		diamondItem.value,
		currentVersion.value,
		sellMargin.value,
		diamondRoundingDirection.value
	)
}

// Wrapper for toggle hover panel that stops event propagation
function handleToggleHoverPanel(itemId, event) {
	event.stopPropagation()
	hasClickedRecipe.value = true // Stop animation after first click
	localStorage.setItem('hasClickedRecipe', 'true') // Persist to localStorage
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
		.map((v) => v.replace('_', '.'))
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
		.filter((v) => {
			const vParts = v.split('.').map(Number)
			const currentParts = currentVersion.value.split('.').map(Number)
			return (
				vParts[0] < currentParts[0] ||
				(vParts[0] === currentParts[0] && vParts[1] <= currentParts[1])
			)
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
			v-if="filteredCollection.length > 0"
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
					<th :colspan="hideSellPrices ? 1 : 2">
						<span class="hidden min-[330px]:inline">
							{{ isDiamondCurrency ? 'Diamond Price' : 'Unit Price' }}
						</span>
						<span class="min-[330px]:hidden">
							{{ isDiamondCurrency ? 'Diamond' : 'Unit' }}
						</span>
					</th>
					<th :colspan="hideSellPrices ? 1 : 2">
						<span class="hidden min-[330px]:inline">
							{{ isDiamondCurrency ? 'Diamond Price per Shulker' : 'Stack Price' }}
						</span>
						<span class="min-[330px]:hidden">
							{{ isDiamondCurrency ? 'Shulker' : 'Stack' }}
						</span>
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
					<th v-if="!hideSellPrices">Sell</th>
					<th>Buy</th>
					<th v-if="!hideSellPrices">Sell</th>
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
								<Squares2X2Icon
									:class="[
										'w-3 h-3 sm:w-4 sm:h-4',
										!hasClickedRecipe ? 'gentle-pulse' : ''
									]" />
								<!-- Hover Panel -->
								<div
									v-if="props.openHoverPanel === item.id"
									:class="[
										'absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-sea-mist border-2 border-highland rounded-lg shadow-md z-50 w-max cursor-default',
										layout === 'comfortable' ? 'px-4 py-3' : 'px-3 py-2'
									]"
									@click.stop>
									<!-- Speech bubble pointer -->
									<div
										class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-highland"></div>
									<div
										class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-sea-mist"></div>
									<div class="text-sm">
										<div v-if="getItemRecipe(item)" class="space-y-1">
											<div
												v-for="ingredient in getItemRecipe(item)
													.ingredients"
												:key="ingredient.material_id"
												:class="[
													'flex items-center gap-2 whitespace-nowrap',
													layout === 'comfortable' ? 'text-sm' : 'text-xs'
												]">
												<img
													:src="
														getImageUrl(
															`/images/items/${ingredient.material_id}.png`
														)
													"
													:alt="ingredient.material_id.replace(/_/g, ' ')"
													:class="
														layout === 'comfortable'
															? 'w-5 h-5'
															: 'w-4 h-4'
													"
													loading="lazy" />
												<span
													:class="[
														'text-gray-800',
														layout === 'comfortable'
															? 'font-medium'
															: ''
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
					<!-- Unit Buy Price -->
					<td class="text-center">
						<template v-if="isDiamondCurrency">
							<span
								v-if="getItemDiamondPricing(item)"
								:title="hideSellPrices ? undefined : formatDiamondRatioFull(
									getItemDiamondPricing(item).buy.diamonds,
									getItemDiamondPricing(item).buy.quantity,
									item.name
								)">
								{{
									hideSellPrices && !isMobile
										? formatDiamondRatioFull(
												getItemDiamondPricing(item).buy.diamonds,
												getItemDiamondPricing(item).buy.quantity,
												item.name
											)
										: isMobile
										? formatDiamondRatioMobile(
												getItemDiamondPricing(item).buy.diamonds,
												getItemDiamondPricing(item).buy.quantity
											)
										: formatDiamondRatio(
												getItemDiamondPricing(item).buy.diamonds,
												getItemDiamondPricing(item).buy.quantity
											)
								}}
							</span>
							<span v-else>—</span>
						</template>
						<template v-else>
							{{
								buyUnitPrice(
									getItemEffectivePrice(item),
									priceMultiplier,
									roundToWhole,
									useSmartNumberFormatting
								)
							}}
						</template>
					</td>

					<!-- Unit Sell Price -->
					<td v-if="!hideSellPrices" class="text-center">
						<template v-if="isDiamondCurrency">
							<span
								v-if="getItemDiamondPricing(item)"
								:title="formatDiamondRatioFull(
									getItemDiamondPricing(item).sell.diamonds,
									getItemDiamondPricing(item).sell.quantity,
									item.name
								)">
								{{
									isMobile
										? formatDiamondRatioMobile(
												getItemDiamondPricing(item).sell.diamonds,
												getItemDiamondPricing(item).sell.quantity
											)
										: formatDiamondRatio(
												getItemDiamondPricing(item).sell.diamonds,
												getItemDiamondPricing(item).sell.quantity
											)
								}}
							</span>
							<span v-else>—</span>
						</template>
						<template v-else>
							{{
								sellUnitPrice(
									getItemEffectivePrice(item),
									priceMultiplier,
									sellMargin,
									roundToWhole,
									useSmartNumberFormatting
								)
							}}
						</template>
					</td>

					<!-- Stack/Shulker Buy Price -->
					<td class="text-center">
						<template v-if="isDiamondCurrency">
							<span
								v-if="getItemDiamondShulkerPricing(item)"
								:title="hideSellPrices ? undefined : formatDiamondRatioFull(
									getItemDiamondShulkerPricing(item).buy.diamonds,
									getItemDiamondShulkerPricing(item).buy.quantity,
									item.name
								)">
								{{
									hideSellPrices
										? `${useSmartNumberFormatting ? formatNumber(getItemDiamondShulkerPricing(item).buy.diamonds) : getItemDiamondShulkerPricing(item).buy.diamonds} per shulker`
										: formatDiamondRatio(
												getItemDiamondShulkerPricing(item).buy.diamonds,
												getItemDiamondShulkerPricing(item).buy.quantity
											)
								}}
							</span>
							<span v-else>—</span>
						</template>
						<template v-else>
							{{
								buyStackPrice(
									getItemEffectivePrice(item),
									item.stack,
									priceMultiplier,
									roundToWhole,
									useSmartNumberFormatting
								)
							}}
						</template>
					</td>

					<!-- Stack/Shulker Sell Price -->
					<td v-if="!hideSellPrices" class="text-center">
						<template v-if="isDiamondCurrency">
							<span
								v-if="getItemDiamondShulkerPricing(item)"
								:title="formatDiamondRatioFull(
									getItemDiamondShulkerPricing(item).sell.diamonds,
									getItemDiamondShulkerPricing(item).sell.quantity,
									item.name
								)">
								{{
									formatDiamondRatio(
										getItemDiamondShulkerPricing(item).sell.diamonds,
										getItemDiamondShulkerPricing(item).sell.quantity
									)
								}}
							</span>
							<span v-else>—</span>
						</template>
						<template v-else>
							{{
								sellStackPrice(
									getItemEffectivePrice(item),
									item.stack,
									priceMultiplier,
									sellMargin,
									roundToWhole,
									useSmartNumberFormatting
								)
							}}
						</template>
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

// Gentle pulse animation for recipe icons
@keyframes gentlePulse {
	0%,
	95% {
		transform: scale(1);
	}
	97.5% {
		transform: scale(1.25);
	}
	100% {
		transform: scale(1);
	}
}

.gentle-pulse {
	animation: gentlePulse 10s ease-in-out infinite;
}
</style>
