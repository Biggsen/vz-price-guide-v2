import { ref, computed, watch } from 'vue'
import { STORAGE_KEYS } from '../constants/homepage.js'
import { clearPriceCache } from '../utils/pricing.js'

export function useEconomyConfig(selectedVersion) {
	// State
	const priceMultiplier = ref(1)
	const sellMargin = ref(0.3)
	const roundToWhole = ref(false)
	const showStackSize = ref(false)
	const showFullNumbers = ref(false)
	const viewMode = ref('categories') // 'categories' or 'list'
	const layout = ref('comfortable') // 'comfortable' or 'condensed'

	// Computed
	const economyConfig = computed(() => ({
		priceMultiplier: priceMultiplier.value,
		sellMargin: sellMargin.value,
		roundToWhole: roundToWhole.value,
		showStackSize: showStackSize.value,
		showFullNumbers: showFullNumbers.value,
		version: selectedVersion.value
	}))

	// Methods
	function loadConfig() {
		const savedPriceMultiplier = localStorage.getItem(STORAGE_KEYS.PRICE_MULTIPLIER)
		const savedSellMargin = localStorage.getItem(STORAGE_KEYS.SELL_MARGIN)
		const savedRoundToWhole = localStorage.getItem(STORAGE_KEYS.ROUND_TO_WHOLE)
		const savedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE)
		const savedLayout = localStorage.getItem(STORAGE_KEYS.LAYOUT)
		const savedSelectedVersion = localStorage.getItem(STORAGE_KEYS.SELECTED_VERSION)
		const savedShowStackSize = localStorage.getItem(STORAGE_KEYS.SHOW_STACK_SIZE)
		const savedShowFullNumbers = localStorage.getItem(STORAGE_KEYS.SHOW_FULL_NUMBERS)

		if (savedPriceMultiplier !== null) {
			priceMultiplier.value = parseFloat(savedPriceMultiplier)
		}
		if (savedSellMargin !== null) {
			sellMargin.value = parseFloat(savedSellMargin)
		}
		if (savedRoundToWhole !== null) {
			roundToWhole.value = savedRoundToWhole === 'true'
		}
		if (savedViewMode !== null) {
			viewMode.value = savedViewMode
		}
		if (savedLayout !== null) {
			layout.value = savedLayout
		}
		if (savedShowStackSize !== null) {
			showStackSize.value = savedShowStackSize === 'true'
		}
		if (savedShowFullNumbers !== null) {
			showFullNumbers.value = savedShowFullNumbers === 'true'
		}
		// Note: selectedVersion is managed by useFilters, not here
		// We just load it for initial setup, but it should be set by useFilters
	}

	function saveConfig() {
		localStorage.setItem(STORAGE_KEYS.PRICE_MULTIPLIER, priceMultiplier.value.toString())
		localStorage.setItem(STORAGE_KEYS.SELL_MARGIN, sellMargin.value.toString())
		localStorage.setItem(STORAGE_KEYS.ROUND_TO_WHOLE, roundToWhole.value.toString())
		localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode.value)
		localStorage.setItem(STORAGE_KEYS.LAYOUT, layout.value)
		if (selectedVersion) {
			localStorage.setItem(STORAGE_KEYS.SELECTED_VERSION, selectedVersion.value)
		}
		localStorage.setItem(STORAGE_KEYS.SHOW_STACK_SIZE, showStackSize.value.toString())
		localStorage.setItem(STORAGE_KEYS.SHOW_FULL_NUMBERS, showFullNumbers.value.toString())
	}

	function resetToDefaults() {
		priceMultiplier.value = 1
		sellMargin.value = 0.3
		roundToWhole.value = false
		showStackSize.value = false
		showFullNumbers.value = false
		viewMode.value = 'categories'
		layout.value = 'comfortable'
		// Note: selectedVersion is managed by useFilters
		saveConfig()
	}

	// Watch for changes and save to localStorage
	watch(
		[
			priceMultiplier,
			sellMargin,
			roundToWhole,
			viewMode,
			layout,
			showStackSize,
			showFullNumbers,
			selectedVersion
		],
		() => {
			saveConfig()
			// Clear price cache when economy config changes
			clearPriceCache()
		},
		{ deep: true }
	)

	return {
		// State
		priceMultiplier,
		sellMargin,
		roundToWhole,
		showStackSize,
		showFullNumbers,
		viewMode,
		layout,

		// Computed
		economyConfig,

		// Methods
		loadConfig,
		saveConfig,
		resetToDefaults
	}
}

