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
	FEATURE_ANNOUNCEMENT_DISMISSED: 'featureAnnouncementDismissed'
}
