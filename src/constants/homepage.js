// Magic numbers and configuration values
export const MAX_CATEGORIES_FOR_DB = 10
export const LOADING_DELAY_FAST = 300
export const LOADING_DELAY_SLOW = 100
export const LOADING_THRESHOLD = 100

import { getPublicVersions } from './minecraftVersions.js'

// Fallback values
export const FALLBACK_VERSIONS = getPublicVersions()

// LocalStorage keys
export const STORAGE_KEYS = {
	PRICE_MULTIPLIER: 'priceMultiplier',
	SELL_MARGIN: 'sellMargin',
	ROUND_TO_WHOLE: 'roundToWhole',
	VIEW_MODE: 'viewMode',
	LAYOUT: 'layout',
	SELECTED_VERSION: 'selectedVersion',
	SHOW_STACK_SIZE: 'showStackSize',
	SHOW_FULL_NUMBERS: 'showFullNumbers',
	HIDE_SELL_PRICES: 'hideSellPrices',
	CURRENCY_TYPE: 'currencyType',
	DIAMOND_ITEM_ID: 'diamondItemId',
	DIAMOND_ROUNDING_DIRECTION: 'diamondRoundingDirection',
	PROCESSING_COST_ENABLED: 'processingCostEnabled',
	CRAFTING_COST_ENABLED: 'craftingCostEnabled',
	SMELTING_COST_ENABLED: 'smeltingCostEnabled',
	CRAFTING_COST: 'craftingCost',
	SMELTING_COST: 'smeltingCost',
	FEATURE_ANNOUNCEMENT_DISMISSED: 'featureAnnouncementDismissed'
}

/**
 * Independent crafting/smelting cost toggles.
 * If the new keys are missing, a legacy shared toggle of true turns both on.
 */
export function readProcessingCostToggles(storage = localStorage) {
	const craftingEnabled = storage.getItem(STORAGE_KEYS.CRAFTING_COST_ENABLED)
	const smeltingEnabled = storage.getItem(STORAGE_KEYS.SMELTING_COST_ENABLED)
	if (craftingEnabled !== null || smeltingEnabled !== null) {
		return {
			craftingCostEnabled: craftingEnabled === 'true',
			smeltingCostEnabled: smeltingEnabled === 'true'
		}
	}
	const bothOn = storage.getItem(STORAGE_KEYS.PROCESSING_COST_ENABLED) === 'true'
	return {
		craftingCostEnabled: bothOn,
		smeltingCostEnabled: bothOn
	}
}
