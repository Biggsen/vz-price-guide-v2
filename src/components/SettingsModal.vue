<script setup>
import { ref, computed, watch } from 'vue'
import { useAdmin } from '../utils/admin.js'
import { versions } from '../constants.js'
import { useRoute } from 'vue-router'
import BaseModal from './BaseModal.vue'

const props = defineProps({
	isOpen: {
		type: Boolean,
		default: false
	},
	currentSettings: {
		type: Object,
		default: () => ({})
	}
})

const emit = defineEmits(['close', 'save-settings'])

// Router access
const route = useRoute()

// Admin access
const { user, canEditItems } = useAdmin()

// Define which versions are currently available for regular users
const baseEnabledVersions = ['1.16', '1.17', '1.18', '1.19', '1.20']

// Computed property for enabled versions based on user type
const enabledVersions = computed(() => {
	try {
		// Admin users can access all versions (but only if admin status is fully loaded)
		if (user.value?.email && canEditItems.value === true) {
			return [...(versions || ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21'])]
		}
		// Regular users only get base enabled versions
		return [...baseEnabledVersions]
	} catch (error) {
		// Fallback to base enabled versions if anything goes wrong
		console.warn('Error in enabledVersions computed:', error)
		return [...baseEnabledVersions]
	}
})

// Settings state
const selectedVersion = ref('1.20')
const priceMultiplier = ref(1)
const sellMargin = ref(0.3)
const roundToWhole = ref(false)
const showZeroPricedItems = ref(false)
const currencyType = ref('money')
const diamondConversionRatio = ref(32)
const hideSellColumns = ref(false)

// Computed property for percentage display (30 instead of 0.3)
const sellMarginPercentage = computed({
	get: () => Math.round(sellMargin.value * 100),
	set: (value) => {
		sellMargin.value = value / 100
	}
})

// Load settings from current props first, then localStorage, but prioritize URL query parameters
function loadSettings() {
	const currentSettings = props.currentSettings || {}

	const savedPriceMultiplier = localStorage.getItem('priceMultiplier')
	const savedSellMargin = localStorage.getItem('sellMargin')
	const savedRoundToWhole = localStorage.getItem('roundToWhole')
	const savedSelectedVersion = localStorage.getItem('selectedVersion')
	const savedShowZeroPricedItems = localStorage.getItem('showZeroPricedItems')
	const savedCurrencyType = localStorage.getItem('currencyType')
	const savedDiamondConversionRatio = localStorage.getItem('diamondConversionRatio')
	const savedHideSellColumns = localStorage.getItem('hideSellColumns')

	// Check URL query parameters first for version
	const versionParam = route.query.version
	if (versionParam && enabledVersions.value.includes(versionParam)) {
		selectedVersion.value = versionParam
	} else if (currentSettings.selectedVersion !== undefined) {
		selectedVersion.value = currentSettings.selectedVersion
	} else if (savedSelectedVersion !== null) {
		selectedVersion.value = savedSelectedVersion
	}

	if (currentSettings.priceMultiplier !== undefined) {
		priceMultiplier.value = currentSettings.priceMultiplier
	} else if (savedPriceMultiplier !== null) {
		priceMultiplier.value = parseFloat(savedPriceMultiplier)
	}

	if (currentSettings.sellMargin !== undefined) {
		sellMargin.value = currentSettings.sellMargin
	} else if (savedSellMargin !== null) {
		sellMargin.value = parseFloat(savedSellMargin)
	}

	if (currentSettings.roundToWhole !== undefined) {
		roundToWhole.value = currentSettings.roundToWhole
	} else if (savedRoundToWhole !== null) {
		roundToWhole.value = savedRoundToWhole === 'true'
	}

	if (currentSettings.showZeroPricedItems !== undefined) {
		showZeroPricedItems.value = currentSettings.showZeroPricedItems
	} else if (savedShowZeroPricedItems !== null) {
		showZeroPricedItems.value = savedShowZeroPricedItems === 'true'
	}

	if (currentSettings.currencyType !== undefined) {
		currencyType.value = currentSettings.currencyType
	} else if (savedCurrencyType !== null) {
		currencyType.value = savedCurrencyType
	}

	if (currentSettings.diamondConversionRatio !== undefined) {
		diamondConversionRatio.value = currentSettings.diamondConversionRatio
	} else if (savedDiamondConversionRatio !== null) {
		diamondConversionRatio.value = parseFloat(savedDiamondConversionRatio)
	}

	// Always prioritize current settings from props over localStorage
	if (currentSettings.hideSellColumns !== undefined) {
		hideSellColumns.value = currentSettings.hideSellColumns
	} else if (savedHideSellColumns !== null) {
		hideSellColumns.value = savedHideSellColumns === 'true'
	} else {
		// Default to false (show sell prices) for new users
		hideSellColumns.value = false
	}
}

// Save settings to localStorage and emit to parent
function saveSettings() {
	localStorage.setItem('priceMultiplier', priceMultiplier.value.toString())
	localStorage.setItem('sellMargin', sellMargin.value.toString())
	localStorage.setItem('roundToWhole', roundToWhole.value.toString())
	localStorage.setItem('selectedVersion', selectedVersion.value)
	localStorage.setItem('showZeroPricedItems', showZeroPricedItems.value.toString())
	localStorage.setItem('currencyType', currencyType.value)
	localStorage.setItem('diamondConversionRatio', diamondConversionRatio.value.toString())
	localStorage.setItem('hideSellColumns', hideSellColumns.value.toString())

	// Emit settings to parent component
	emit('save-settings', {
		selectedVersion: selectedVersion.value,
		priceMultiplier: priceMultiplier.value,
		sellMargin: sellMargin.value,
		roundToWhole: roundToWhole.value,
		showZeroPricedItems: showZeroPricedItems.value,
		currencyType: currencyType.value,
		diamondConversionRatio: diamondConversionRatio.value,
		hideSellColumns: hideSellColumns.value
	})
}

function selectVersion(version) {
	// Only allow selecting enabled versions
	if (enabledVersions.value.includes(version)) {
		selectedVersion.value = version
	}
}

function closeModal() {
	emit('close')
}

// Load settings when modal opens
function handleOpen() {
	loadSettings()
}

// Watch for modal opening and load current settings
watch(
	() => props.isOpen,
	(isOpen) => {
		if (isOpen) {
			loadSettings()
		}
	}
)

// Watch for changes in current settings and update modal state
watch(
	() => props.currentSettings,
	(newSettings) => {
		if (newSettings && Object.keys(newSettings).length > 0) {
			loadSettings()
		}
	},
	{ deep: true }
)

// Watch for changes in enabledVersions and re-initialize version from query
watch(
	enabledVersions,
	(newEnabledVersions) => {
		// Only re-initialize if we have enabled versions and there's a version param
		if (newEnabledVersions.length > 0 && route.query.version) {
			const versionParam = route.query.version
			if (newEnabledVersions.includes(versionParam)) {
				selectedVersion.value = versionParam
			}
		}
	},
	{ immediate: true }
)

// Save settings when modal closes
function handleClose() {
	saveSettings()
	closeModal()
}

// Expose methods for parent component
defineExpose({
	handleOpen,
	handleClose
})
</script>

<template>
	<BaseModal :isOpen="isOpen" title="Settings" @close="closeModal">
		<!-- Version Selection -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">Minecraft Version:</label>

			<!-- Desktop: Button Pills -->
			<div
				class="hidden sm:inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
				<button
					v-for="version in versions"
					:key="version"
					@click="selectVersion(version)"
					:class="[
						selectedVersion === version
							? 'bg-gray-asparagus text-white'
							: enabledVersions.includes(version)
							? 'bg-norway text-heavy-metal hover:bg-gray-100'
							: 'bg-gray-200 text-gray-400 cursor-not-allowed',
						'px-3 py-1 text-sm font-medium transition border-r border-gray-asparagus last:border-r-0',
						!enabledVersions.includes(version) ? 'opacity-60' : ''
					]">
					{{ version }}
				</button>
			</div>

			<!-- Mobile: Dropdown -->
			<select
				v-model="selectedVersion"
				class="sm:hidden w-full border-2 border-gray-asparagus rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-asparagus focus:border-transparent">
				<option
					v-for="version in versions"
					:key="version"
					:value="version"
					:disabled="!enabledVersions.includes(version)">
					{{ version }}{{ !enabledVersions.includes(version) ? ' (Admin only)' : '' }}
				</option>
			</select>

			<div class="text-sm text-gray-600 mt-1">
				<span v-if="user?.email && canEditItems">
					All versions available for admin users
				</span>
				<span v-else>Grayed out versions will be available soon</span>
			</div>
		</div>

		<!-- Currency Configuration (Admin only) -->
		<div v-if="canEditItems">
			<label class="block text-sm font-medium text-gray-700 mb-2">Currency:</label>

			<!-- Currency Type Toggle -->
			<div class="flex items-center gap-4 mb-3">
				<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
					<button
						@click="currencyType = 'money'"
						:class="[
							currencyType === 'money'
								? 'bg-gray-asparagus text-white'
								: 'bg-norway text-heavy-metal hover:bg-gray-100',
							'px-3 py-1 text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
						]">
						Money
					</button>
					<button
						@click="currencyType = 'diamond'"
						:class="[
							currencyType === 'diamond'
								? 'bg-gray-asparagus text-white'
								: 'bg-norway text-heavy-metal hover:bg-gray-100',
							'px-3 py-1 text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
						]">
						Diamond
					</button>
				</div>

				<!-- Diamond Conversion Ratio (only show when diamond currency is selected) -->
				<div v-if="currencyType === 'diamond'" class="flex items-center gap-2">
					<label
						for="diamondConversionRatio"
						class="text-sm font-medium text-gray-700 whitespace-nowrap">
						Ratio:
					</label>
					<input
						id="diamondConversionRatio"
						v-model.number="diamondConversionRatio"
						type="number"
						min="1"
						max="100"
						step="1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm" />
					<span class="text-xs text-gray-600">money:diamond</span>
				</div>
			</div>
		</div>

		<!-- Price Configuration -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">Prices:</label>

			<div class="space-y-3 mb-3">
				<!-- Price Multiplier -->
				<div>
					<label
						for="priceMultiplier"
						class="block text-sm font-medium text-gray-700 mb-1">
						Buy price multiplier
					</label>
					<input
						id="priceMultiplier"
						v-model.number="priceMultiplier"
						type="number"
						min="0.1"
						max="10"
						step="0.1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-20 text-sm" />
				</div>

				<!-- Sell Margin -->
				<div>
					<label for="sellMargin" class="block text-sm font-medium text-gray-700 mb-1">
						Sell percentage
					</label>
					<input
						id="sellMargin"
						v-model.number="sellMarginPercentage"
						type="number"
						min="1"
						max="100"
						step="1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-20 text-sm" />
				</div>

				<!-- Hide Sell Prices -->
				<div class="flex items-center gap-2">
					<input
						id="hideSellColumns"
						v-model="hideSellColumns"
						type="checkbox"
						class="checkbox-input" />
					<label for="hideSellColumns" class="text-sm text-gray-700">
						Don't display sell prices in lists
					</label>
				</div>
			</div>

			<!-- Round to Whole -->
			<div class="flex items-center gap-2">
				<input
					id="roundToWhole"
					v-model="roundToWhole"
					type="checkbox"
					class="checkbox-input" />
				<label for="roundToWhole" class="text-sm text-gray-700">
					Round prices to the nearest whole number
				</label>
			</div>

			<!-- Show Zero Priced Items (admin only) -->
			<div v-if="canEditItems" class="flex items-center gap-2 mt-2">
				<input
					id="showZeroPricedItems"
					v-model="showZeroPricedItems"
					type="checkbox"
					class="checkbox-input" />
				<label for="showZeroPricedItems" class="text-sm text-gray-700">
					Show zero priced items
				</label>
			</div>
		</div>

		<template #footer>
			<div
				class="flex items-center justify-end p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
				<div class="flex space-x-3">
					<button @click="closeModal" class="btn-secondary--outline">Cancel</button>
					<button @click="handleClose" class="btn-primary">Save Settings</button>
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
</style>
