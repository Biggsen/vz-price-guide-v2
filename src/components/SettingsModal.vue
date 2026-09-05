<script setup>
import { ref, computed, watch } from 'vue'
import { useAdmin } from '../utils/admin.js'
import { versions, baseEnabledVersions } from '../constants.js'
import { useRoute } from 'vue-router'
import { trackModalInteraction } from '../utils/analytics.js'
import { STORAGE_KEYS, readProcessingCostToggles } from '../constants/homepage.js'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import VersionSelector from './VersionSelector.vue'

const props = defineProps({
	isOpen: {
		type: Boolean,
		default: false
	},
	selectedVersion: {
		type: String,
		required: true
	},
	viewMode: {
		type: String,
		default: 'categories'
	},
	layout: {
		type: String,
		default: 'comfortable'
	},
	pagePath: {
		type: String,
		default: '/'
	}
})

const emit = defineEmits(['close', 'save-settings'])

// Router access
const route = useRoute()

// Admin access
const { user, canEditItems } = useAdmin()

const authState = computed(() => {
	if (!user.value?.email) return 'anonymous'
	if (user.value?.emailVerified) return 'signed_in_verified'
	return 'signed_in_unverified'
})

function getModalAnalyticsContext(extra = {}) {
	return {
		page_path: props.pagePath,
		selected_version: selectedVersion.value,
		view_mode: props.viewMode,
		layout: props.layout,
		auth_state: authState.value,
		...extra
	}
}

function trackSettingsChange(field, value) {
	trackModalInteraction('settings', 'change', getModalAnalyticsContext({ field, value }))
}

function trackSettingsCta(value) {
	trackModalInteraction('settings', 'cta_click', getModalAnalyticsContext({ field: 'cta', value }))
}

// Computed property for enabled versions based on user type
const enabledVersions = computed(() => {
	try {
		// Admin users can access all versions (but only if admin status is fully loaded)
		if (user.value?.email && canEditItems.value === true) {
			return [...versions]
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
const selectedVersion = ref(props.selectedVersion)
const priceMultiplier = ref(1)
const sellMargin = ref(0.3)
const roundToWhole = ref(false)
const showStackSize = ref(false)
const showFullNumbers = ref(false)
const hideSellPrices = ref(false)
const currencyType = ref('money')
const diamondItemId = ref(null)
const diamondRoundingDirection = ref('nearest')
const craftingCostEnabled = ref(false)
const smeltingCostEnabled = ref(false)
const craftingCost = ref(2)
const smeltingCost = ref(3)

// Watch for prop changes and update local state
watch(
	() => props.selectedVersion,
	(newVersion) => {
		selectedVersion.value = newVersion
	}
)

// Computed property for percentage display (30 instead of 0.3)
const sellMarginPercentage = computed({
	get: () => Math.round(sellMargin.value * 100),
	set: (value) => {
		sellMargin.value = value / 100
	}
})

// Load settings from localStorage, but prioritize URL query parameters
function loadSettings() {
	const savedPriceMultiplier = localStorage.getItem('priceMultiplier')
	const savedSellMargin = localStorage.getItem('sellMargin')
	const savedRoundToWhole = localStorage.getItem('roundToWhole')
	const savedSelectedVersion = localStorage.getItem('selectedVersion')
	const savedShowStackSize = localStorage.getItem('showStackSize')
	const savedShowFullNumbers = localStorage.getItem('showFullNumbers')
	const savedHideSellPrices = localStorage.getItem('hideSellPrices')
	const savedCurrencyType = localStorage.getItem('currencyType')
	const savedDiamondItemId = localStorage.getItem('diamondItemId')
	const savedDiamondRoundingDirection = localStorage.getItem('diamondRoundingDirection')
	const savedCraftingCost = localStorage.getItem(STORAGE_KEYS.CRAFTING_COST)
	const savedSmeltingCost = localStorage.getItem(STORAGE_KEYS.SMELTING_COST)
	const costToggles = readProcessingCostToggles()

	// Check URL query parameters first for version
	const versionParam = route.query.version
	if (versionParam && enabledVersions.value.includes(versionParam)) {
		selectedVersion.value = versionParam
	} else if (savedSelectedVersion !== null) {
		selectedVersion.value = savedSelectedVersion
	}

	if (savedPriceMultiplier !== null) {
		priceMultiplier.value = parseFloat(savedPriceMultiplier)
	}
	if (savedSellMargin !== null) {
		sellMargin.value = parseFloat(savedSellMargin)
	}
	if (savedRoundToWhole !== null) {
		roundToWhole.value = savedRoundToWhole === 'true'
	}
	if (savedShowStackSize !== null) {
		showStackSize.value = savedShowStackSize === 'true'
	}
	if (savedShowFullNumbers !== null) {
		showFullNumbers.value = savedShowFullNumbers === 'true'
	}
	if (savedHideSellPrices !== null) {
		hideSellPrices.value = savedHideSellPrices === 'true'
	}
	if (savedCurrencyType !== null) {
		currencyType.value = savedCurrencyType
	}
	if (savedDiamondItemId !== null) {
		diamondItemId.value = savedDiamondItemId
	}
	if (savedDiamondRoundingDirection !== null) {
		diamondRoundingDirection.value = savedDiamondRoundingDirection
	}
	craftingCostEnabled.value = costToggles.craftingCostEnabled
	smeltingCostEnabled.value = costToggles.smeltingCostEnabled
	if (savedCraftingCost !== null) {
		const parsed = parseFloat(savedCraftingCost)
		if (Number.isFinite(parsed)) {
			craftingCost.value = Math.min(100, Math.max(0, parsed))
		}
	}
	if (savedSmeltingCost !== null) {
		const parsed = parseFloat(savedSmeltingCost)
		if (Number.isFinite(parsed)) {
			smeltingCost.value = Math.min(100, Math.max(0, parsed))
		}
	}
}

// Save settings to localStorage and emit to parent
function saveSettings() {
	localStorage.setItem('priceMultiplier', priceMultiplier.value.toString())
	localStorage.setItem('sellMargin', sellMargin.value.toString())
	localStorage.setItem('roundToWhole', roundToWhole.value.toString())
	localStorage.setItem('selectedVersion', selectedVersion.value)
	localStorage.setItem('showStackSize', showStackSize.value.toString())
	localStorage.setItem('showFullNumbers', showFullNumbers.value.toString())
	localStorage.setItem('hideSellPrices', hideSellPrices.value.toString())
	localStorage.setItem('currencyType', currencyType.value)
	if (diamondItemId.value) {
		localStorage.setItem('diamondItemId', diamondItemId.value)
	}
	localStorage.setItem('diamondRoundingDirection', diamondRoundingDirection.value)
	localStorage.setItem(STORAGE_KEYS.CRAFTING_COST_ENABLED, craftingCostEnabled.value.toString())
	localStorage.setItem(STORAGE_KEYS.SMELTING_COST_ENABLED, smeltingCostEnabled.value.toString())
	localStorage.removeItem(STORAGE_KEYS.PROCESSING_COST_ENABLED)
	localStorage.setItem(STORAGE_KEYS.CRAFTING_COST, craftingCost.value.toString())
	localStorage.setItem(STORAGE_KEYS.SMELTING_COST, smeltingCost.value.toString())

	// Emit settings to parent component
	emit('save-settings', {
		selectedVersion: selectedVersion.value,
		priceMultiplier: priceMultiplier.value,
		sellMargin: sellMargin.value,
		roundToWhole: roundToWhole.value,
		showStackSize: showStackSize.value,
		showFullNumbers: showFullNumbers.value,
		hideSellPrices: hideSellPrices.value,
		currencyType: currencyType.value,
		diamondItemId: diamondItemId.value,
		diamondRoundingDirection: diamondRoundingDirection.value,
		craftingCostEnabled: craftingCostEnabled.value,
		smeltingCostEnabled: smeltingCostEnabled.value,
		craftingCost: craftingCost.value,
		smeltingCost: smeltingCost.value
	})
}

function handleBaseModalClose(reason) {
	trackModalInteraction(
		'settings',
		'close',
		getModalAnalyticsContext({ close_reason: reason || 'x_button' })
	)
	emit('close', reason)
}

function handleCancel() {
	trackSettingsCta('cancel')
	trackModalInteraction('settings', 'close', getModalAnalyticsContext({ close_reason: 'cancel' }))
	emit('close', 'cancel')
}

// Load settings when modal opens
function handleOpen() {
	loadSettings()
}

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

// Watch for modal open/close state and load settings when opening
watch(
	() => props.isOpen,
	(isOpen) => {
		if (isOpen) {
			trackModalInteraction('settings', 'open', getModalAnalyticsContext())
			loadSettings()
		}
	}
)

// Save settings when modal closes
function handleClose() {
	trackSettingsCta('save')
	saveSettings()
	trackModalInteraction('settings', 'close', getModalAnalyticsContext({ close_reason: 'save' }))
	emit('close', 'save')
}

// Expose methods for parent component
defineExpose({
	handleOpen,
	handleClose
})
</script>

<template>
	<BaseModal :isOpen="isOpen" title="Settings" @close="handleBaseModalClose">
		<!-- Version Selection -->
		<VersionSelector
			v-model="selectedVersion"
			:versions="enabledVersions"
			:enabled-versions="enabledVersions"
			@update:model-value="trackSettingsChange('selectedVersion', selectedVersion)" />

		<!-- Currency Type -->
		<div class="mb-6">
			<label class="block text-sm font-medium text-gray-700 mb-2">Currency:</label>
			<div class="space-y-2">
				<label class="flex items-center cursor-pointer">
					<input
						type="radio"
						v-model="currencyType"
						value="money"
						@change="trackSettingsChange('currencyType', currencyType)"
						class="mr-2 radio-input"
						name="currencyType" />
					<span class="text-sm">Money</span>
				</label>
				<label class="flex items-center cursor-pointer">
					<input
						type="radio"
						v-model="currencyType"
						value="diamond"
						@change="trackSettingsChange('currencyType', currencyType)"
						class="mr-2 radio-input"
						name="currencyType" />
					<span class="text-sm">Diamond</span>
				</label>
			</div>
		</div>

		<!-- Price Configuration -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">Prices:</label>
			<div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
				<!-- Price Multiplier -->
				<div class="flex items-center gap-2">
					<label
						for="priceMultiplier"
						class="text-sm text-gray-700 whitespace-nowrap">
						Buy ×
					</label>
					<input
						id="priceMultiplier"
						v-model.number="priceMultiplier"
						type="number"
						@change="trackSettingsChange('priceMultiplier', priceMultiplier)"
						min="0.1"
						max="10"
						step="0.1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm" />
				</div>

				<!-- Sell Margin -->
				<div class="flex items-center gap-2">
					<label
						for="sellMargin"
						class="text-sm text-gray-700 whitespace-nowrap">
						Sell %
					</label>
					<input
						id="sellMargin"
						v-model.number="sellMarginPercentage"
						type="number"
						@change="trackSettingsChange('sellMarginPercentage', sellMarginPercentage)"
						min="1"
						max="100"
						step="1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm" />
				</div>
			</div>

			<div class="grid grid-cols-[auto_auto_auto] gap-x-2 gap-y-2 items-center w-max mb-3">
				<input
					id="craftingCostEnabled"
					v-model="craftingCostEnabled"
					type="checkbox"
					aria-label="Enable crafting cost"
					@change="trackSettingsChange('craftingCostEnabled', craftingCostEnabled)"
					class="checkbox-input" />
				<label
					for="craftingCostEnabled"
					class="text-sm text-gray-700 whitespace-nowrap">
					Crafting cost
				</label>
				<input
					id="craftingCost"
					v-model.number="craftingCost"
					type="number"
					aria-label="Crafting cost amount"
					:disabled="!craftingCostEnabled"
					@change="trackSettingsChange('craftingCost', craftingCost)"
					min="0"
					max="100"
					step="1"
					class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm disabled:opacity-50" />
				<input
					id="smeltingCostEnabled"
					v-model="smeltingCostEnabled"
					type="checkbox"
					aria-label="Enable smelting cost"
					@change="trackSettingsChange('smeltingCostEnabled', smeltingCostEnabled)"
					class="checkbox-input" />
				<label
					for="smeltingCostEnabled"
					class="text-sm text-gray-700 whitespace-nowrap">
					Smelting cost
				</label>
				<input
					id="smeltingCost"
					v-model.number="smeltingCost"
					type="number"
					aria-label="Smelting cost amount"
					:disabled="!smeltingCostEnabled"
					@change="trackSettingsChange('smeltingCost', smeltingCost)"
					min="0"
					max="100"
					step="1"
					class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm disabled:opacity-50" />
			</div>

			<label class="block text-sm font-medium text-gray-700 mt-4 mb-2">Display:</label>

			<!-- Round to Whole -->
			<div class="flex items-center gap-2">
				<input
					id="roundToWhole"
					v-model="roundToWhole"
					type="checkbox"
					@change="trackSettingsChange('roundToWhole', roundToWhole)"
					class="checkbox-input" />
				<label for="roundToWhole" class="text-sm text-gray-700">Round to whole</label>
			</div>

			<div class="flex items-center gap-2 mt-2">
				<input
					id="showFullNumbers"
					v-model="showFullNumbers"
					type="checkbox"
					@change="trackSettingsChange('showFullNumbers', showFullNumbers)"
					class="checkbox-input" />
				<label for="showFullNumbers" class="text-sm text-gray-700">
					Show full numbers (1000 instead of 1k)
				</label>
			</div>

			<!-- Show Zero Priced Items (admin only) -->

			<!-- Show Stack Size -->
			<div class="flex items-center gap-2 mt-2">
				<input
					id="showStackSize"
					v-model="showStackSize"
					type="checkbox"
					@change="trackSettingsChange('showStackSize', showStackSize)"
					class="checkbox-input" />
				<label for="showStackSize" class="text-sm text-gray-700">Show stack size</label>
			</div>

			<div class="flex items-center gap-2 mt-2">
				<input
					id="hideSellPrices"
					v-model="hideSellPrices"
					type="checkbox"
					@change="trackSettingsChange('hideSellPrices', hideSellPrices)"
					class="checkbox-input" />
				<label for="hideSellPrices" class="text-sm text-gray-700">Hide sell prices</label>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<button @click="handleCancel" class="btn-secondary--outline">Cancel</button>
					<BaseButton @click="handleClose" variant="primary">Save Settings</BaseButton>
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
