import { ref, computed, watch } from 'vue'
import { STORAGE_KEYS, readProcessingCostToggles } from '../constants/homepage.js'
import { clearPriceCache } from '../utils/pricing.js'

export function useEconomyConfig(selectedVersion) {
	// State
	const priceMultiplier = ref(1)
	const sellMargin = ref(0.3)
	const roundToWhole = ref(false)
	const showStackSize = ref(false)
	const showFullNumbers = ref(false)
	const hideSellPrices = ref(false)
	const viewMode = ref('categories') // 'categories' or 'list'
	const layout = ref('comfortable') // 'comfortable' or 'condensed'
	const currencyType = ref('money') // 'money' or 'diamond'
	const diamondItemId = ref(null) // Reference to diamond item for ratio calculation
	const diamondRoundingDirection = ref('nearest') // 'nearest' | 'up' | 'down'
	const craftingCostEnabled = ref(false)
	const smeltingCostEnabled = ref(false)
	const craftingCost = ref(2)
	const smeltingCost = ref(3)

	// Computed
	const economyConfig = computed(() => ({
		priceMultiplier: priceMultiplier.value,
		sellMargin: sellMargin.value,
		roundToWhole: roundToWhole.value,
		showStackSize: showStackSize.value,
		showFullNumbers: showFullNumbers.value,
		hideSellPrices: hideSellPrices.value,
		version: selectedVersion.value,
		currencyType: currencyType.value,
		diamondItemId: diamondItemId.value,
		diamondRoundingDirection: diamondRoundingDirection.value,
		craftingCostEnabled: craftingCostEnabled.value,
		smeltingCostEnabled: smeltingCostEnabled.value,
		craftingCost: craftingCost.value,
		smeltingCost: smeltingCost.value
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
		const savedHideSellPrices = localStorage.getItem(STORAGE_KEYS.HIDE_SELL_PRICES)
		const savedCurrencyType = localStorage.getItem(STORAGE_KEYS.CURRENCY_TYPE)
		const savedDiamondItemId = localStorage.getItem(STORAGE_KEYS.DIAMOND_ITEM_ID)
		const savedDiamondRoundingDirection = localStorage.getItem(STORAGE_KEYS.DIAMOND_ROUNDING_DIRECTION)
		const savedCraftingCost = localStorage.getItem(STORAGE_KEYS.CRAFTING_COST)
		const savedSmeltingCost = localStorage.getItem(STORAGE_KEYS.SMELTING_COST)
		const costToggles = readProcessingCostToggles()

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
		localStorage.setItem(STORAGE_KEYS.HIDE_SELL_PRICES, hideSellPrices.value.toString())
		localStorage.setItem(STORAGE_KEYS.CURRENCY_TYPE, currencyType.value)
		if (diamondItemId.value) {
			localStorage.setItem(STORAGE_KEYS.DIAMOND_ITEM_ID, diamondItemId.value)
		}
		localStorage.setItem(STORAGE_KEYS.DIAMOND_ROUNDING_DIRECTION, diamondRoundingDirection.value)
		localStorage.setItem(
			STORAGE_KEYS.CRAFTING_COST_ENABLED,
			craftingCostEnabled.value.toString()
		)
		localStorage.setItem(
			STORAGE_KEYS.SMELTING_COST_ENABLED,
			smeltingCostEnabled.value.toString()
		)
		localStorage.removeItem(STORAGE_KEYS.PROCESSING_COST_ENABLED)
		localStorage.setItem(STORAGE_KEYS.CRAFTING_COST, craftingCost.value.toString())
		localStorage.setItem(STORAGE_KEYS.SMELTING_COST, smeltingCost.value.toString())
	}

	function resetPricingToDefaults() {
		priceMultiplier.value = 1
		sellMargin.value = 0.3
		roundToWhole.value = false
		currencyType.value = 'money'
		diamondItemId.value = null
		diamondRoundingDirection.value = 'nearest'
		craftingCostEnabled.value = false
		smeltingCostEnabled.value = false
		craftingCost.value = 2
		smeltingCost.value = 3
		saveConfig()
	}

	function resetToDefaults() {
		resetPricingToDefaults()
		showStackSize.value = false
		showFullNumbers.value = false
		hideSellPrices.value = false
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
			hideSellPrices,
			currencyType,
			diamondItemId,
			diamondRoundingDirection,
			craftingCostEnabled,
			smeltingCostEnabled,
			craftingCost,
			smeltingCost,
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
		hideSellPrices,
		viewMode,
		layout,
		currencyType,
		diamondItemId,
		diamondRoundingDirection,
		craftingCostEnabled,
		smeltingCostEnabled,
		craftingCost,
		smeltingCost,

		// Computed
		economyConfig,

		// Methods
		loadConfig,
		saveConfig,
		resetPricingToDefaults,
		resetToDefaults
	}
}
