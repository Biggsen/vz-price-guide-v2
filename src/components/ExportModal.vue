<script setup>
import { ref, computed, watch } from 'vue'
import { ArrowDownTrayIcon, UserPlusIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { UserIcon } from '@heroicons/vue/24/solid'
import { enabledCategories, baseEnabledVersions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import {
	getEffectivePrice,
	buyUnitPriceRaw,
	sellUnitPriceRaw,
	buyStackPriceRaw,
	sellStackPriceRaw,
	getDiamondPricing,
	getDiamondShulkerPricing
} from '../utils/pricing.js'
import { useRouter } from 'vue-router'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
	isOpen: {
		type: Boolean,
		default: false
	},
	items: {
		type: Array,
		default: () => []
	},
	economyConfig: {
		type: Object,
		default: () => ({})
	},
	selectedVersion: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['close'])

const router = useRouter()

// Admin access
const { user, canEditItems } = useAdmin()

// Check if user is authenticated and verified
const isAuthenticated = computed(() => {
	return user.value?.email && user.value?.emailVerified
})

// Check if user is signed in but not verified
const isSignedInButNotVerified = computed(() => {
	return user.value?.email && !user.value?.emailVerified
})

// Computed property for enabled versions based on user type
const enabledVersions = computed(() => {
	try {
		// Admin users can access all versions (but only if admin status is fully loaded)
		if (user.value?.email && canEditItems.value === true) {
			return [...baseEnabledVersions]
		}
		// Regular users only get base enabled versions
		return [...baseEnabledVersions]
	} catch (error) {
		// Fallback to base enabled versions if anything goes wrong
		console.warn('Error in enabledVersions computed:', error)
		return [...baseEnabledVersions]
	}
})

// Export configuration
const selectedVersion = ref(props.selectedVersion) // Internal version state for export modal
const selectedCategories = ref([])
const selectedPriceFields = ref(['unit_buy', 'unit_sell', 'stack_buy', 'stack_sell'])
const includeMetadata = ref(false)

// Sorting - 'default' uses curated order, others override
const sortField = ref('default') // 'default', 'name', 'buy', 'sell'
const sortDirection = ref('asc') // 'asc', 'desc' (only used when sortField !== 'default')
const roundToWhole = ref(false) // Round to whole numbers

// Watch for prop changes and update local state
watch(
	() => props.selectedVersion,
	(newVersion) => {
		selectedVersion.value = newVersion
	}
)

// Initialize roundToWhole from economy config
watch(
	() => props.economyConfig.roundToWhole,
	(newValue) => {
		roundToWhole.value = newValue || false
	},
	{ immediate: true }
)

// Computed properties
const priceMultiplier = computed(() => props.economyConfig.priceMultiplier || 1)
const sellMargin = computed(() => props.economyConfig.sellMargin || 0.3)
const currencyType = computed(() => props.economyConfig.currencyType || 'money')
const diamondItemId = computed(() => props.economyConfig.diamondItemId)
const diamondRoundingDirection = computed(() => props.economyConfig.diamondRoundingDirection || 'nearest')

// Find diamond item from all items
const diamondItem = computed(() => {
	if (!diamondItemId.value || !props.items || props.items.length === 0) {
		// Fallback: try to find by material_id 'diamond'
		return props.items?.find((item) => item.material_id === 'diamond') || null
	}
	return props.items?.find((item) => item.id === diamondItemId.value || item.material_id === 'diamond') || null
})

// Check if we're in diamond currency mode
const isDiamondCurrency = computed(() => currencyType.value === 'diamond' && diamondItem.value !== null)

// Available price fields - labels change based on currency type
const priceFields = computed(() => {
	if (isDiamondCurrency.value) {
		return [
			{ key: 'unit_buy', label: 'Buy' },
			{ key: 'unit_sell', label: 'Sell' },
			{ key: 'stack_buy', label: 'Shulker Buy' },
			{ key: 'stack_sell', label: 'Shulker Sell' }
		]
	}
	return [
		{ key: 'unit_buy', label: 'Unit Buy' },
		{ key: 'unit_sell', label: 'Unit Sell' },
		{ key: 'stack_buy', label: 'Stack Buy' },
		{ key: 'stack_sell', label: 'Stack Sell' }
	]
})

// Helper function to compare version strings (e.g., "1.16" vs "1.17")
function isVersionLessOrEqual(itemVersion, targetVersion) {
	if (!itemVersion || !targetVersion) return false

	const [itemMajor, itemMinor] = itemVersion.split('.').map(Number)
	const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)

	if (itemMajor < targetMajor) return true
	if (itemMajor > targetMajor) return false
	return itemMinor <= targetMinor
}

function shouldShowItemForVersion(item, selectedVersion) {
	// Item must have a version and be <= selected version
	if (!item.version || !isVersionLessOrEqual(item.version, selectedVersion)) {
		return false
	}

	// If item has version_removed and it's <= selected version, don't show it
	if (item.version_removed && isVersionLessOrEqual(item.version_removed, selectedVersion)) {
		return false
	}

	return true
}

// Filter items based on selected categories and version
const filteredItems = computed(() => {
	let filtered = props.items

	// Filter by version using proper version comparison
	filtered = filtered.filter((item) => shouldShowItemForVersion(item, selectedVersion.value))

	// Filter by categories if any are selected
	if (selectedCategories.value.length > 0) {
		filtered = filtered.filter((item) => selectedCategories.value.includes(item.category))
	}

	// Filter out items from disabled categories
	filtered = filtered.filter((item) => enabledCategories.includes(item.category))

	// Filter out items with 0 base price
	const versionKey = selectedVersion.value.replace('.', '_')
	filtered = filtered.filter((item) => {
		const basePrice = getEffectivePrice(item, versionKey)
		return basePrice > 0
	})

	return filtered
})

// Sorted items - default preserves curated order, others override
const sortedFilteredItems = computed(() => {
	// Default sort preserves curated order (category, subcategory, name from Firestore)
	if (sortField.value === 'default') {
		return filteredItems.value
	}

	// Apply custom sorting
	return [...filteredItems.value].sort((a, b) => {
		let valueA, valueB

		if (sortField.value === 'name') {
			valueA = a.name?.toLowerCase() || ''
			valueB = b.name?.toLowerCase() || ''
			const comparison = valueA.localeCompare(valueB)
			return sortDirection.value === 'asc' ? comparison : -comparison
		}

		if (sortField.value === 'buy') {
			const versionKey = selectedVersion.value.replace('.', '_')
			const basePriceA = getEffectivePrice(a, versionKey)
			const basePriceB = getEffectivePrice(b, versionKey)

			valueA = basePriceA * priceMultiplier.value
			valueB = basePriceB * priceMultiplier.value

			const comparison = valueA - valueB
			return sortDirection.value === 'asc' ? comparison : -comparison
		}

		return 0
	})
})

// Generate export data - always flat structure
const exportData = computed(() => {
	const itemsToProcess = sortedFilteredItems.value
	const data = {}

	itemsToProcess.forEach((item) => {
		const versionKey = selectedVersion.value.replace('.', '_')
		const basePrice = getEffectivePrice(item, versionKey)
		const stackSize = item.stack || 64

		const itemData = {}

		// Add metadata if requested
		if (includeMetadata.value) {
			itemData.name = item.name
			itemData.category = item.category
			itemData.stack = stackSize
		}

		// Handle diamond currency vs money currency differently
		if (isDiamondCurrency.value && diamondItem.value) {
			// Diamond currency: export ratio objects with simpler property names
			const diamondPricing = getDiamondPricing(
				item,
				diamondItem.value,
				versionKey,
				sellMargin.value,
				diamondRoundingDirection.value
			)
			const shulkerPricing = getDiamondShulkerPricing(
				item,
				diamondItem.value,
				versionKey,
				sellMargin.value,
				diamondRoundingDirection.value
			)

			if (selectedPriceFields.value.includes('unit_buy')) {
				itemData.buy = diamondPricing.buy
			}
			if (selectedPriceFields.value.includes('unit_sell')) {
				itemData.sell = diamondPricing.sell
			}
			if (selectedPriceFields.value.includes('stack_buy')) {
				itemData.shulker_buy = shulkerPricing.buy
			}
			if (selectedPriceFields.value.includes('stack_sell')) {
				itemData.shulker_sell = shulkerPricing.sell
			}
		} else {
			// Money currency: export raw numbers with existing property names
			if (selectedPriceFields.value.includes('unit_buy')) {
				itemData.unit_buy = buyUnitPriceRaw(
					basePrice,
					priceMultiplier.value,
					roundToWhole.value
				)
			}
			if (selectedPriceFields.value.includes('unit_sell')) {
				itemData.unit_sell = sellUnitPriceRaw(
					basePrice,
					priceMultiplier.value,
					sellMargin.value,
					roundToWhole.value
				)
			}
			if (selectedPriceFields.value.includes('stack_buy')) {
				itemData.stack_buy = buyStackPriceRaw(
					basePrice,
					stackSize,
					priceMultiplier.value,
					roundToWhole.value
				)
			}
			if (selectedPriceFields.value.includes('stack_sell')) {
				itemData.stack_sell = sellStackPriceRaw(
					basePrice,
					stackSize,
					priceMultiplier.value,
					sellMargin.value,
					roundToWhole.value
				)
			}
		}

		data[item.material_id] = itemData
	})

	// Add metadata about the export
	data._export_metadata = {
		source: "Verzion's Economy Price Guide",
		url: 'https://minecraft-economy-price-guide.net',
		version: selectedVersion.value,
		export_date: new Date().toISOString(),
		item_count: itemsToProcess.length,
		currency_type: currencyType.value,
		price_multiplier: priceMultiplier.value,
		sell_margin: sellMargin.value,
		round_to_whole: roundToWhole.value,
		sort_field: sortField.value,
		sort_direction: sortField.value === 'default' ? 'curated' : sortDirection.value
	}

	// Add diamond-specific metadata if applicable
	if (isDiamondCurrency.value && diamondItem.value) {
		data._export_metadata.diamond_item_id = diamondItem.value.material_id
		data._export_metadata.diamond_rounding_direction = diamondRoundingDirection.value
	}

	return data
})

// Preview data without metadata
const previewData = computed(() => {
	const { _export_metadata, ...items } = exportData.value
	return items
})

// Export functions
function exportJSON() {
	const dataStr = JSON.stringify(exportData.value, null, 2)
	downloadFile(dataStr, 'json', 'application/json')
}

function exportYAML() {
	// For now, we'll use a simple YAML-like format
	// In a real implementation, you'd use js-yaml library
	const yamlStr = generateYAML(exportData.value)
	downloadFile(yamlStr, 'yml', 'text/yaml')
}

function generateYAML(data) {
	let yaml = ''
	for (const [key, value] of Object.entries(data)) {
		if (key === '_export_metadata') {
			// Skip metadata in YAML for cleaner output
			continue
		}
		yaml += `${key}:\n`
		for (const [field, val] of Object.entries(value)) {
			// Handle ratio objects for diamond currency
			if (typeof val === 'object' && val !== null && 'diamonds' in val && 'quantity' in val) {
				yaml += `  ${field}:\n`
				yaml += `    diamonds: ${val.diamonds}\n`
				yaml += `    quantity: ${val.quantity}\n`
			} else {
				yaml += `  ${field}: ${val}\n`
			}
		}
		yaml += '\n'
	}
	return yaml
}

function downloadFile(content, extension, mimeType) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
	const versionKey = selectedVersion.value.replace('.', '_')
	const filename = `prices_${versionKey}_${timestamp}.${extension}`

	const blob = new Blob([content], { type: mimeType })
	const url = URL.createObjectURL(blob)

	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

function closeModal() {
	emit('close')
}

function goToSignUp() {
	closeModal()
	router.push('/signup')
}

function goToSignIn() {
	closeModal()
	router.push('/signin')
}

function goToVerifyEmail() {
	closeModal()
	router.push('/verify-email')
}

function toggleCategory(category) {
	const index = selectedCategories.value.indexOf(category)
	if (index > -1) {
		selectedCategories.value.splice(index, 1)
	} else {
		selectedCategories.value.push(category)
	}
}

function togglePriceField(field) {
	const index = selectedPriceFields.value.indexOf(field)
	if (index > -1) {
		selectedPriceFields.value.splice(index, 1)
	} else {
		selectedPriceFields.value.push(field)
	}
}

function resetCategories() {
	selectedCategories.value = []
}

function selectVersion(version) {
	// Only allow selecting enabled versions
	if (enabledVersions.value.includes(version)) {
		selectedVersion.value = version
	}
}
</script>

<template>
	<BaseModal :isOpen="isOpen" title="Export Price List" @close="closeModal">
		<!-- Sign-up content for unauthenticated users -->
		<div v-if="!user?.email" class="text-left pt-2 pb-4 sm:py-4">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Almost there!</h1>
				<p class="mb-6">You'll need an account to export the price list.</p>
				<p class="text-sm text-gray-900 mb-2">With an account, you can:</p>
				<ul class="text-sm text-gray-900 space-y-1 list-disc list-inside">
					<li>export one or multiple categories</li>
					<li>export to JSON or YAML</li>
				</ul>
			</div>

			<!-- Action buttons -->
			<div>
				<BaseButton @click="goToSignUp" variant="primary">
					<template #left-icon>
						<UserIcon />
					</template>
					Create Account
				</BaseButton>
				<div class="text-left pt-4">
					<p class="text-sm text-gray-500">
						Already have an account?
						<button @click="goToSignIn" class="text-gray-700 hover:text-opacity-80">
							<span class="underline">Sign in</span>
						</button>
					</p>
				</div>
			</div>
		</div>

		<!-- Email verification content for signed-in but unverified users -->
		<div v-else-if="isSignedInButNotVerified" class="text-left pt-2 pb-4 sm:py-4">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">So close!</h1>
				<p class="mb-6">Please verify your email address to export the price list.</p>
				<p class="text-sm text-gray-900 mb-2">Once verified, you can:</p>
				<ul class="text-sm text-gray-900 space-y-1 list-disc list-inside">
					<li>export one or multiple categories</li>
					<li>export to JSON or YAML</li>
				</ul>
			</div>

			<!-- Action buttons -->
			<div>
				<BaseButton @click="goToVerifyEmail" variant="primary">
					<template #left-icon>
						<CheckCircleIcon />
					</template>
					Resend verification email
				</BaseButton>
				<div class="text-left pt-4">
					<p class="text-sm text-gray-500">
						Need to sign in with a different account?
						<button @click="goToSignIn" class="text-gray-700 hover:text-opacity-80">
							<span class="underline">Sign in</span>
						</button>
					</p>
				</div>
			</div>
		</div>

		<!-- Regular export content for authenticated users -->
		<div v-else>
			<!-- Version Selection -->
			<div class="mb-6">
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Minecraft Version:
				</label>

				<!-- Mobile: Dropdown -->
				<div class="block mobile-only">
					<select
						v-model="selectedVersion"
						class="border-2 border-gray-asparagus rounded px-3 py-1 text-sm focus:outline-none focus:border-black">
						<option v-for="version in enabledVersions" :key="version" :value="version">
							{{ version }}
						</option>
					</select>
				</div>

				<!-- Desktop: Button Group -->
				<div class="hidden desktop-only">
					<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
						<button
							v-for="version in enabledVersions"
							:key="version"
							@click="selectVersion(version)"
							:class="[
								selectedVersion === version
									? 'bg-gray-asparagus text-white'
									: 'bg-norway text-heavy-metal hover:bg-gray-100',
								'px-3 py-1 text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
							]">
							{{ version }}
						</button>
					</div>
				</div>
			</div>

			<!-- Categories Selection -->
			<div class="mb-6">
				<div class="flex items-center justify-between mb-2">
					<label class="block text-sm font-medium text-gray-700">
						Categories (leave empty to include all)
					</label>
					<button
						@click="resetCategories"
						class="text-xs text-gray-500 hover:text-gray-700 underline">
						Reset
					</button>
				</div>
				<div
					class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto border-2 border-gray-asparagus rounded p-2">
					<label
						v-for="category in enabledCategories"
						:key="category"
						class="flex items-center space-x-2 text-sm">
						<input
							type="checkbox"
							:checked="selectedCategories.includes(category)"
							@change="toggleCategory(category)"
							class="checkbox-input" />
						<span class="capitalize">{{ category }}</span>
					</label>
				</div>
			</div>

			<!-- Sort Order -->
			<div class="mb-6">
				<label class="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
				<div class="flex items-center space-x-4">
					<select
						v-model="sortField"
						class="border-2 border-gray-asparagus rounded px-2 py-1 text-sm">
						<option value="default">Default Order</option>
						<option value="name">Name</option>
						<option value="buy">Buy Price</option>
					</select>
					<select
						v-model="sortDirection"
						v-if="sortField !== 'default'"
						class="border-2 border-gray-asparagus rounded px-2 py-1 text-sm">
						<option value="asc">Ascending</option>
						<option value="desc">Descending</option>
					</select>
				</div>
			</div>

			<!-- Price Fields Selection -->
			<div class="mb-6">
				<label class="block text-sm font-medium text-gray-700 mb-2">Price Fields</label>
				<div class="space-y-2">
					<label
						v-for="field in priceFields"
						:key="field.key"
						class="flex items-center space-x-2">
						<input
							type="checkbox"
							:checked="selectedPriceFields.includes(field.key)"
							@change="togglePriceField(field.key)"
							class="checkbox-input" />
						<span class="text-sm">{{ field.label }}</span>
					</label>

					<!-- Round to Whole Numbers -->
					<label class="flex items-center space-x-2">
						<input type="checkbox" v-model="roundToWhole" class="checkbox-input" />
						<span class="text-sm">Round to whole numbers</span>
					</label>
				</div>
			</div>

			<!-- Advanced Options -->
			<div class="mb-6 space-y-4">
				<h3 class="text-sm font-medium text-gray-700">Advanced Options</h3>

				<!-- Include Metadata -->
				<label class="flex items-center space-x-2">
					<input type="checkbox" v-model="includeMetadata" class="checkbox-input" />
					<span class="text-sm">Include metadata (name, category, stack size)</span>
				</label>
			</div>

			<!-- Preview -->
			<div v-if="Object.keys(previewData).length > 0">
				<h3 class="text-sm font-medium text-gray-700 mb-2">
					Preview ({{ Object.keys(previewData).length }} items)
				</h3>
				<div class="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto text-xs font-mono">
					<pre>{{
						JSON.stringify(
							Object.fromEntries(Object.entries(previewData).slice(0, 3)),
							null,
							2
						)
					}}</pre>
					<span v-if="Object.keys(previewData).length > 3" class="text-gray-500">
						... and {{ Object.keys(previewData).length - 3 }} more items
					</span>
				</div>
			</div>
		</div>

		<template v-if="isAuthenticated" #footer>
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div class="text-sm text-gray-600 text-center sm:text-left">
					{{ filteredItems.length }} items will be exported
				</div>
				<div class="flex justify-center space-x-2 sm:space-x-3">
					<BaseButton @click="closeModal" variant="tertiary">Cancel</BaseButton>
					<BaseButton
						@click="exportJSON"
						:disabled="Object.keys(exportData).length === 0"
						variant="primary">
						<template #left-icon>
							<ArrowDownTrayIcon />
						</template>
						JSON
					</BaseButton>
					<BaseButton
						@click="exportYAML"
						:disabled="Object.keys(exportData).length === 0"
						variant="primary">
						<template #left-icon>
							<ArrowDownTrayIcon />
						</template>
						YAML
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}

/* Custom breakpoint at 400px */
@media (max-width: 399px) {
	.mobile-only {
		display: block !important;
	}
	.desktop-only {
		display: none !important;
	}
}

@media (min-width: 400px) {
	.mobile-only {
		display: none !important;
	}
	.desktop-only {
		display: block !important;
	}
}
</style>
