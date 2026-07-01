<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getEffectivePrice } from '../utils/pricing.js'
import { disabledCategories, enabledCategories } from '../constants.js'
import { getMajorMinorVersion } from '../utils/serverProfile.js'
import {
	isItemEnchantable,
	getCompatibleEnchantments,
	hasEnchantmentConflict,
	getEnchantmentConflictReason
} from '../utils/enchantments.js'
import { computeRecipePriceForShop, getRecipeForItem } from '../utils/serverShopRecipes.js'
import {
	buildMergedGuideByMaterialId,
	canonicalGuideItemForMaterial,
	normalizeMaterialIdKey
} from '../utils/guideItemMaterialPick.js'
import {
	DEFAULT_MAX_SHOP_ITEMS_PER_SHOP,
	isOfferedShopPrice,
	normalizeShopPriceField
} from '../utils/shopItems.js'
import BaseButton from './BaseButton.vue'
import FieldHelpTooltip from './FieldHelpTooltip.vue'
import NotificationBanner from './NotificationBanner.vue'
import { XCircleIcon } from '@heroicons/vue/20/solid'
import { ArchiveBoxIcon, ArchiveBoxXMarkIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
	availableItems: {
		type: Array,
		default: () => []
	},
	existingItemIds: {
		type: Array,
		default: () => []
	},
	editingItem: {
		type: Object,
		default: null
	},
	server: {
		type: Object,
		required: true
	},
	shop: {
		type: Object,
		default: null
	},
	shopItemsForRecipe: {
		type: Array,
		default: () => []
	},
	serverVersionKey: {
		type: String,
		default: ''
	},
	displayVariant: {
		type: String,
		default: 'card',
		validator: (value) => ['card', 'modal'].includes(value)
	}
})

const emit = defineEmits(['submit', 'cancel'])

// Form data
const formData = ref({
	item_id: '',
	buy_price: 0,
	sell_price: 0,
	pricing_type: 'manual',
	stock_quantity: null,
	stock_full: false,
	notes: '',
	enchantments: []
})

const isServerShop = computed(() => Boolean(props.shop?.server_shop))

// Server shop: computed recipe buy and sell prices (when pricing type is from_recipe)
const recipePriceResult = computed(() => {
	if (!isServerShop.value || !props.availableItems?.length || !props.serverVersionKey) {
		return { buy: { price: null, error: null }, sell: { price: null, error: null } }
	}
	const guideItem = props.availableItems.find((g) => g.id === formData.value.item_id)
	if (!guideItem) return { buy: { price: null, error: null }, sell: { price: null, error: null } }
	const guideByMaterialId = buildMergedGuideByMaterialId(props.availableItems)
	const shopItems = [...(props.shopItemsForRecipe || [])]
	const existing = shopItems.find((s) => s.item_id === formData.value.item_id)
	if (!existing) {
		shopItems.push({
			item_id: formData.value.item_id,
			buy_price: formData.value.buy_price,
			sell_price: formData.value.sell_price,
			pricing_type: formData.value.pricing_type
		})
	}
	const byItemId = {}
	shopItems.forEach((s) => { byItemId[s.item_id] = s })
	const current = byItemId[formData.value.item_id] || {
		...formData.value,
		item_id: formData.value.item_id
	}
	if (formData.value.pricing_type !== 'from_recipe') {
		return { buy: { price: null, error: null }, sell: { price: null, error: null } }
	}
	const buyResult = computeRecipePriceForShop(
		current,
		guideItem,
		byItemId,
		guideByMaterialId,
		props.serverVersionKey,
		'buy'
	)
	const sellResult = computeRecipePriceForShop(
		current,
		guideItem,
		byItemId,
		guideByMaterialId,
		props.serverVersionKey,
		'sell'
	)
	return { buy: buyResult, sell: sellResult }
})

// Recipe ingredients for display when Recipe pricing is selected
const recipeDisplay = computed(() => {
	if (
		!isServerShop.value ||
		formData.value.pricing_type !== 'from_recipe' ||
		!props.availableItems?.length ||
		!props.serverVersionKey
	) {
		return null
	}
	const itemId = formData.value.item_id
	if (!itemId) return null
	const guideItem = props.availableItems.find((g) => g.id === itemId)
	if (!guideItem) return null
	const recipe = getRecipeForItem(guideItem, props.serverVersionKey)
	if (!recipe?.ingredients?.length) return null
	const byMaterialId = buildMergedGuideByMaterialId(props.availableItems)
	const shopItems = [...(props.shopItemsForRecipe || [])]
	const existing = shopItems.find((s) => s.item_id === formData.value.item_id)
	if (!existing) {
		shopItems.push({
			item_id: formData.value.item_id,
			buy_price: formData.value.buy_price,
			sell_price: formData.value.sell_price,
			pricing_type: formData.value.pricing_type
		})
	}
	const shopByItemId = {}
	shopItems.forEach((s) => {
		if (s.item_id) shopByItemId[s.item_id] = s
	})
	return {
		ingredients: recipe.ingredients.map((ing) => {
			const item = byMaterialId[normalizeMaterialIdKey(ing.material_id)]
			const shopItem = item ? shopByItemId[item.id] : null
			const buyPrice = isOfferedShopPrice(shopItem?.buy_price)
				? Number(shopItem.buy_price)
				: null
			const sellPrice = isOfferedShopPrice(shopItem?.sell_price)
				? Number(shopItem.sell_price)
				: null
			const issues = []
			if (!shopItem) {
				issues.push('Not in shop')
			} else {
				if (buyPrice == null) issues.push('No buy price')
				if (sellPrice == null) issues.push('No sell price')
			}
			return {
				quantity: ing.quantity ?? 1,
				name: item?.name || ing.material_id,
				image: item?.image || null,
				buy_price: buyPrice,
				sell_price: sellPrice,
				item_id: item?.id ?? null,
				issues
			}
		})
	}
})

// Form state
const formError = ref(null)
const searchQuery = ref('')
const highlightedIndex = ref(-1)
const searchInput = ref(null)
const dropdownContainer = ref(null)
const buyPriceInput = ref(null)
const enableMultipleSelection = ref(false) // Toggle for multiple selection mode
const selectedItemIds = ref([]) // Track multiple selected items

// Enchantment state
const enchantmentSearchQuery = ref('')
const enchantmentHighlightedIndex = ref(-1)
const enchantmentSearchInput = ref(null)
const enchantmentDropdownContainer = ref(null)
const enchantmentError = ref(null)

// Auto-focus search input when form is shown for adding new items
function focusSearchInput() {
	if (searchInput.value) {
		searchInput.value.focus()
	}
}

// Reset form data
function resetForm() {
	formData.value = {
		item_id: '',
		buy_price: 0,
		sell_price: 0,
		pricing_type: 'manual',
		stock_quantity: null,
		stock_full: false,
		notes: '',
		enchantments: []
	}
	searchQuery.value = ''
	formError.value = null
	highlightedIndex.value = -1
	enableMultipleSelection.value = false
	selectedItemIds.value = []
	enchantmentSearchQuery.value = ''
	enchantmentHighlightedIndex.value = -1
	enchantmentError.value = null
}

// Initialize form when editing
onMounted(() => {
	if (props.editingItem) {
		const guideItem =
			props.editingItem.itemData ||
			props.availableItems.find((a) => a.id === props.editingItem.item_id)
		const hasRecipe = guideItem && !!getRecipeForItem(guideItem, props.serverVersionKey)
		const pricingType =
			props.editingItem.pricing_type === 'from_recipe' ||
			props.editingItem.buy_pricing_type === 'from_recipe' ||
			props.editingItem.sell_pricing_type === 'from_recipe'
				? 'from_recipe'
				: props.editingItem.pricing_type === 'base' || !hasRecipe
					? 'base'
					: 'manual'
		formData.value = {
			item_id: props.editingItem.item_id,
			buy_price: normalizeShopPriceField(props.editingItem.buy_price),
			sell_price: normalizeShopPriceField(props.editingItem.sell_price),
			pricing_type: pricingType,
			stock_quantity: props.editingItem.stock_quantity,
			stock_full: props.editingItem.stock_full || false,
			notes: props.editingItem.notes || '',
			enchantments: Array.isArray(props.editingItem.enchantments)
				? [...props.editingItem.enchantments]
				: []
		}
	} else {
		resetForm()
		// Focus search input for new items
		setTimeout(() => {
			focusSearchInput()
		}, 100)
	}
})

// Computed: selected item (must be before hasRecipeForSelectedItem and sync watcher)
const selectedItem = computed(() => {
	if (props.editingItem && props.editingItem.itemData && formData.value.item_id === props.editingItem.item_id) {
		return props.editingItem.itemData
	}
	return props.availableItems.find((item) => item.id === formData.value.item_id) || null
})

// Server shop: pricing type only in single-select add flow (multi-add uses shared manual prices; no recipe UI)
const showServerShopPricingTypeSection = computed(() => {
	if (!isServerShop.value) return false
	if (props.editingItem) return true
	if (enableMultipleSelection.value) return false
	return !!selectedItem.value
})

// "Usable recipe" for UI: guide has a recipe for this MC version. Do not use
// hasCircularRecipeDependency here — it false-positives when the same material appears
// on multiple paths (e.g. armor → diamond → diamond block → diamond).
const hasRecipeForSelectedItem = computed(() => {
	if (!isServerShop.value || !props.serverVersionKey || !selectedItem.value) return false
	return getRecipeForItem(selectedItem.value, props.serverVersionKey) != null
})

// Sync pricing_type to base when selected item has no recipe (server shop)
watch(
	[() => formData.value.item_id, hasRecipeForSelectedItem],
	([itemId, hasRecipe]) => {
		if (!isServerShop.value || !itemId) return
		if (!hasRecipe) {
			formData.value.pricing_type = 'base'
		} else if (formData.value.pricing_type === 'base') {
			formData.value.pricing_type = 'manual'
		}
	}
)

// Watch for editing item changes
watch(
	() => props.editingItem,
	(newEditingItem) => {
		if (newEditingItem) {
			const guideItem =
				newEditingItem.itemData ||
				props.availableItems.find((a) => a.id === newEditingItem.item_id)
			const hasRecipe = guideItem && !!getRecipeForItem(guideItem, props.serverVersionKey)
			const pricingType =
				newEditingItem.pricing_type === 'from_recipe' ||
				newEditingItem.buy_pricing_type === 'from_recipe' ||
				newEditingItem.sell_pricing_type === 'from_recipe'
					? 'from_recipe'
					: newEditingItem.pricing_type === 'base' || !hasRecipe
						? 'base'
						: 'manual'
			formData.value = {
				item_id: newEditingItem.item_id,
				buy_price: normalizeShopPriceField(newEditingItem.buy_price),
				sell_price: normalizeShopPriceField(newEditingItem.sell_price),
				pricing_type: pricingType,
				stock_quantity: newEditingItem.stock_quantity,
				stock_full: newEditingItem.stock_full || false,
				notes: newEditingItem.notes || '',
				enchantments: Array.isArray(newEditingItem.enchantments)
					? [...newEditingItem.enchantments]
					: []
			}
		} else {
			resetForm()
			// Focus search input when switching to add mode
			setTimeout(() => {
				focusSearchInput()
			}, 100)
		}
	}
)

// Computed properties (selectedItem and hasRecipeForSelectedItem moved above sync watcher)
const selectedItems = computed(() => {
	return props.availableItems.filter((item) => selectedItemIds.value.includes(item.id))
})

const isModalVariant = computed(() => props.displayVariant === 'modal')

const showAlreadyInShopNotice = computed(() => {
	if (props.editingItem || !(props.existingItemIds || []).length) return false
	const ids = props.existingItemIds || []
	if (enableMultipleSelection.value) {
		return selectedItemIds.value.some((id) => ids.includes(id))
	}
	return !!formData.value.item_id && ids.includes(formData.value.item_id)
})

const resolvedMaxShopItems = computed(() => {
	const raw = props.shop?.max_shop_items
	if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1) return raw
	return DEFAULT_MAX_SHOP_ITEMS_PER_SHOP
})

/** New rows that would be created (selection minus items already in the shop). */
const newShopItemsFromSelectionCount = computed(() => {
	if (props.editingItem || !enableMultipleSelection.value) return 0
	const existing = new Set(props.existingItemIds || [])
	return selectedItemIds.value.filter((id) => !existing.has(id)).length
})

const shopItemLimitExceeded = computed(() => {
	if (props.editingItem || !enableMultipleSelection.value) return false
	const current = (props.existingItemIds || []).length
	return current + newShopItemsFromSelectionCount.value > resolvedMaxShopItems.value
})

const shopItemLimitExceededMessage = computed(() => {
	if (!shopItemLimitExceeded.value) return ''
	const max = resolvedMaxShopItems.value
	const current = (props.existingItemIds || []).length
	const newCount = newShopItemsFromSelectionCount.value
	const exceededBy = current + newCount - max
	return (
		`Limit exceeded by ${exceededBy} items\n` +
		`(${newCount} selected • ${max} max • ${current} already in shop)`
	)
})

// Get all enchantment items
const allEnchantmentItems = computed(() => {
	if (!props.availableItems) return []
	return props.availableItems.filter((item) => item.category === 'enchantments')
})

// Get compatible enchantments for selected item
const compatibleEnchantments = computed(() => {
	if (!selectedItem.value || !allEnchantmentItems.value.length) return []
	
	// Hide enchantments for enchanted books themselves
	if (selectedItem.value.category === 'enchantments') return []
	
	// Filter to only compatible enchantments
	return getCompatibleEnchantments(selectedItem.value, allEnchantmentItems.value)
})

// Filter enchantments by search query
const filteredEnchantments = computed(() => {
	if (!enchantmentSearchQuery.value || enchantmentSearchQuery.value.length < 1) return []
	
	const query = enchantmentSearchQuery.value.toLowerCase().trim()
	return compatibleEnchantments.value.filter((enchantment) => {
		const name = formatEnchantmentName(enchantment.id).toLowerCase()
		return name.includes(query)
	})
})

// Check if enchantment section should be shown
const showEnchantmentSection = computed(() => {
	if (!selectedItem.value) return false
	
	// Hide for enchanted books themselves
	if (selectedItem.value.category === 'enchantments') return false
	
	// Show if item is enchantable
	return isItemEnchantable(selectedItem.value)
})

// Calculate profit margin when both prices are available
const profitMargin = computed(() => {
	const buyPrice = formData.value.buy_price
	const sellPrice = formData.value.sell_price

	if (!isOfferedShopPrice(buyPrice) || !isOfferedShopPrice(sellPrice)) {
		return null
	}

	const profit = buyPrice - sellPrice
	const margin = (profit / buyPrice) * 100
	return margin
})

// Filter items based on search query and exclude zero-priced items
const filteredItems = computed(() => {
	if (!props.availableItems) return []

	// First filter out items with zero prices using effective pricing
	// Use the server's Minecraft version for price checking (extract major.minor if needed)
	const majorMinorVersion = getMajorMinorVersion(props.server?.minecraft_version) || '1.16'
	const serverVersion = majorMinorVersion.replace('.', '_')
	const nonZeroItems = props.availableItems.filter((item) => {
		const effectivePrice = getEffectivePrice(item, serverVersion)
		return effectivePrice > 0
	})

	// Filter out uncategorized items and disabled categories
	const categorizedItems = nonZeroItems.filter((item) => {
		const category = item.category?.trim()
		if (!category || category === 'Uncategorized' || category === '') return false
		// Filter out disabled categories
		return !disabledCategories.includes(category.toLowerCase())
	})

	const query = searchQuery.value.toLowerCase().trim()
	if (!query || query.length < 2) return []

	return categorizedItems.filter(
		(item) =>
			item.name?.toLowerCase().includes(query) ||
			item.material_id?.toLowerCase().includes(query) ||
			item.category?.toLowerCase().includes(query)
	)
})

// Group items by category for better organization
const itemsByCategory = computed(() => {
	const grouped = {}

	filteredItems.value.forEach((item) => {
		const category = item.category || 'Uncategorized'
		if (!grouped[category]) {
			grouped[category] = []
		}
		grouped[category].push(item)
	})

	// Sort items within each category by subcategory and name (matching HomeView ordering)
	Object.keys(grouped).forEach((category) => {
		grouped[category].sort((a, b) => {
			// First sort by subcategory
			const subcatA = a.subcategory || ''
			const subcatB = b.subcategory || ''
			if (subcatA !== subcatB) {
				return subcatA.localeCompare(subcatB)
			}
			// Then sort by name
			const nameA = a.name || ''
			const nameB = b.name || ''
			return nameA.localeCompare(nameB)
		})
	})

	return grouped
})

// Order categories according to enabledCategories array (matching main price guide)
const orderedItemsByCategory = computed(() => {
	const grouped = itemsByCategory.value
	const ordered = {}

	// Iterate through enabledCategories in order
	enabledCategories.forEach((category) => {
		if (grouped[category]) {
			ordered[category] = grouped[category]
		}
	})

	// Add any remaining categories that aren't in enabledCategories (shouldn't happen, but just in case)
	Object.keys(grouped).forEach((category) => {
		if (!ordered[category]) {
			ordered[category] = grouped[category]
		}
	})

	return ordered
})

// Flattened items list for keyboard navigation - matches visual order
const flattenedItems = computed(() => {
	const flattened = []
	const ordered = orderedItemsByCategory.value

	// Flatten items in the same order they appear visually (by category, ordered)
	Object.keys(ordered).forEach((category) => {
		ordered[category].forEach((item) => {
			flattened.push(item)
		})
	})

	return flattened
})

// Helper: effective buy/sell price validity (server shop from_recipe uses computed buy/sell from recipe)
function effectiveHasBuyPrice() {
	if (isServerShop.value && formData.value.pricing_type === 'from_recipe') {
		return !recipePriceResult.value.buy.error && recipePriceResult.value.buy.price != null
	}
	return (
		formData.value.buy_price !== null &&
		formData.value.buy_price !== undefined &&
		formData.value.buy_price !== ''
	)
}
function effectiveHasSellPrice() {
	if (isServerShop.value && formData.value.pricing_type === 'from_recipe') {
		return !recipePriceResult.value.sell.error && recipePriceResult.value.sell.price != null
	}
	return (
		formData.value.sell_price !== null &&
		formData.value.sell_price !== undefined &&
		formData.value.sell_price !== ''
	)
}

// Form validation
const isFormValid = computed(() => {
	const hasBuyPrice = effectiveHasBuyPrice()
	const hasSellPrice = effectiveHasSellPrice()
	const hasRequiredPrices =
		isServerShop.value && formData.value.pricing_type === 'from_recipe'
			? hasBuyPrice && hasSellPrice
			: true

	// For editing, use single item validation
	if (props.editingItem) {
		const hasItemId = !!formData.value.item_id
		if (!hasItemId) return false
		if (!hasRequiredPrices) return false
		if (
			!(isServerShop.value && formData.value.pricing_type === 'from_recipe') &&
			hasBuyPrice &&
			(isNaN(formData.value.buy_price) || formData.value.buy_price < 0)
		) {
			return false
		}
		if (
			!(isServerShop.value && formData.value.pricing_type === 'from_recipe') &&
			hasSellPrice &&
			(isNaN(formData.value.sell_price) || formData.value.sell_price < 0)
		) {
			return false
		}
		return true
	}

	// For adding new items
	const hasItem = enableMultipleSelection.value
		? selectedItemIds.value.length > 0
		: !!formData.value.item_id
	if (!hasItem) return false
	if (enableMultipleSelection.value && shopItemLimitExceeded.value) return false
	if (!hasRequiredPrices) return false
	if (
		!(isServerShop.value && formData.value.pricing_type === 'from_recipe') &&
		hasBuyPrice &&
		(isNaN(formData.value.buy_price) || formData.value.buy_price < 0)
	) {
		return false
	}
	if (
		!(isServerShop.value && formData.value.pricing_type === 'from_recipe') &&
		hasSellPrice &&
		(isNaN(formData.value.sell_price) || formData.value.sell_price < 0)
	) {
		return false
	}
	return true
})

// Form handlers
function handleSubmit() {
	formError.value = null

	// Handle editing mode (single item)
	if (props.editingItem) {
		// Validate item selection
		if (!formData.value.item_id) {
			formError.value = 'item_id'
			return
		}

		// Validate recipe prices when from_recipe (manual prices can both be empty)
		if (isServerShop.value && formData.value.pricing_type === 'from_recipe') {
			if (
				recipePriceResult.value.buy.error ||
				recipePriceResult.value.sell.error ||
				recipePriceResult.value.buy.price == null ||
				recipePriceResult.value.sell.price == null
			) {
				formError.value = 'prices'
				return
			}
		}

		// Validate buy price if provided (skip when from_recipe — already validated above)
		if (
			formData.value.pricing_type !== 'from_recipe' &&
			formData.value.buy_price !== null &&
			formData.value.buy_price !== undefined &&
			formData.value.buy_price !== ''
		) {
			if (isNaN(formData.value.buy_price) || formData.value.buy_price < 0) {
				formError.value = 'buy_price'
				return
			}
		}

		// Validate sell price if provided (skip when from_recipe — already validated above)
		if (
			formData.value.pricing_type !== 'from_recipe' &&
			formData.value.sell_price !== null &&
			formData.value.sell_price !== undefined &&
			formData.value.sell_price !== ''
		) {
			if (isNaN(formData.value.sell_price) || formData.value.sell_price < 0) {
				formError.value = 'sell_price'
				return
			}
		}

		// Clean up form data before submitting
		let buyPrice = normalizeShopPriceField(formData.value.buy_price)
		let sellPrice = normalizeShopPriceField(formData.value.sell_price)
		if (isServerShop.value && formData.value.pricing_type === 'from_recipe') {
			if (recipePriceResult.value.buy.price != null) buyPrice = recipePriceResult.value.buy.price
			if (recipePriceResult.value.sell.price != null) sellPrice = recipePriceResult.value.sell.price
		}
		const submitData = {
			...formData.value,
			buy_price: buyPrice,
			sell_price: sellPrice,
			pricing_type: formData.value.pricing_type || 'manual',
			stock_quantity: formData.value.stock_quantity ?? null,
			notes: formData.value.notes?.trim() || '',
			enchantments: Array.isArray(formData.value.enchantments) ? [...formData.value.enchantments] : []
		}

		emit('submit', submitData)
		return
	}

	// Handle adding mode - check if multiple selection is enabled
	if (enableMultipleSelection.value) {
		// Multiple selection mode
		// Validate item selection
		if (selectedItemIds.value.length === 0) {
			formError.value = 'item_id'
			return
		}

		if (shopItemLimitExceeded.value) return

		// Validate buy price if provided (both can be empty for catalog bulk-add)
		if (
			formData.value.buy_price !== null &&
			formData.value.buy_price !== undefined &&
			formData.value.buy_price !== ''
		) {
			if (isNaN(formData.value.buy_price) || formData.value.buy_price < 0) {
				formError.value = 'buy_price'
				return
			}
		}

		// Validate sell price if provided
		if (
			formData.value.sell_price !== null &&
			formData.value.sell_price !== undefined &&
			formData.value.sell_price !== ''
		) {
			if (isNaN(formData.value.sell_price) || formData.value.sell_price < 0) {
				formError.value = 'sell_price'
				return
			}
		}

		// Create array of items with shared form data (multi-select does not support from_recipe)
		const baseData = {
			buy_price: normalizeShopPriceField(formData.value.buy_price),
			sell_price: normalizeShopPriceField(formData.value.sell_price),
			pricing_type: formData.value.pricing_type || 'manual',
			stock_quantity: formData.value.stock_quantity ?? null,
			stock_full: formData.value.stock_full || false,
			notes: formData.value.notes?.trim() || ''
		}

		const itemsToSubmit = selectedItemIds.value.map((itemId) => ({
			...baseData,
			item_id: itemId,
			enchantments: []
		}))

		emit('submit', itemsToSubmit)
	} else {
		// Single selection mode (original behavior)
		// Validate item selection
		if (!formData.value.item_id) {
			formError.value = 'item_id'
			return
		}

		// Validate recipe prices when from_recipe (manual prices can both be empty)
		if (isServerShop.value && formData.value.pricing_type === 'from_recipe') {
			if (
				recipePriceResult.value.buy.error ||
				recipePriceResult.value.sell.error ||
				recipePriceResult.value.buy.price == null ||
				recipePriceResult.value.sell.price == null
			) {
				formError.value = 'prices'
				return
			}
		}

		// Validate buy price if provided (skip when from_recipe — already validated above)
		if (
			formData.value.pricing_type !== 'from_recipe' &&
			formData.value.buy_price !== null &&
			formData.value.buy_price !== undefined &&
			formData.value.buy_price !== ''
		) {
			if (isNaN(formData.value.buy_price) || formData.value.buy_price < 0) {
				formError.value = 'buy_price'
				return
			}
		}

		// Validate sell price if provided (skip when from_recipe — already validated above)
		if (
			formData.value.pricing_type !== 'from_recipe' &&
			formData.value.sell_price !== null &&
			formData.value.sell_price !== undefined &&
			formData.value.sell_price !== ''
		) {
			if (isNaN(formData.value.sell_price) || formData.value.sell_price < 0) {
				formError.value = 'sell_price'
				return
			}
		}

		// Clean up form data before submitting
		let buyPrice = normalizeShopPriceField(formData.value.buy_price)
		let sellPrice = normalizeShopPriceField(formData.value.sell_price)
		if (isServerShop.value && formData.value.pricing_type === 'from_recipe') {
			if (recipePriceResult.value.buy.price != null) buyPrice = recipePriceResult.value.buy.price
			if (recipePriceResult.value.sell.price != null) sellPrice = recipePriceResult.value.sell.price
		}
		const submitData = {
			...formData.value,
			buy_price: buyPrice,
			sell_price: sellPrice,
			pricing_type: formData.value.pricing_type || 'manual',
			stock_quantity: formData.value.stock_quantity ?? null,
			notes: formData.value.notes?.trim() || '',
			enchantments: Array.isArray(formData.value.enchantments) ? [...formData.value.enchantments] : []
		}

		emit('submit', submitData)
	}
}

function handleCancel() {
	resetForm()
	emit('cancel')
}

// Keyboard navigation handlers
function handleKeyDown(event) {
	if (!flattenedItems.value.length) return

	const oldIndex = highlightedIndex.value

	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault()
			if (highlightedIndex.value < 0) {
				highlightedIndex.value = 0
			} else {
				highlightedIndex.value = Math.min(
					highlightedIndex.value + 1,
					flattenedItems.value.length - 1
				)
			}
			break
		case 'ArrowUp':
			event.preventDefault()
			if (highlightedIndex.value <= 0) {
				highlightedIndex.value = -1
			} else {
				highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
			}
			break
		case 'Enter':
			event.preventDefault()
			if (
				highlightedIndex.value >= 0 &&
				highlightedIndex.value < flattenedItems.value.length
			) {
				const item = flattenedItems.value[highlightedIndex.value]
				if (enableMultipleSelection.value) {
					toggleItemSelection(item)
				} else {
					selectItem(item)
				}
			}
			break
		case 'Escape':
			highlightedIndex.value = -1
			break
	}

	// Scroll highlighted item into view if index changed
	if (oldIndex !== highlightedIndex.value) {
		scrollToHighlightedItem()
	}
}

// Scroll highlighted item into view
function scrollToHighlightedItem() {
	if (!dropdownContainer.value || highlightedIndex.value < 0) return

	setTimeout(() => {
		const highlightedElement = dropdownContainer.value.querySelector('.bg-norway')
		if (highlightedElement) {
			highlightedElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			})
		}
	}, 0)
}

// Reset highlighted index when search changes
function handleSearchInput() {
	highlightedIndex.value = -1
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Toggle item selection (for multiple selection)
function toggleItemSelection(item) {
	const best = isServerShop.value
		? canonicalGuideItemForMaterial(props.availableItems, item)
		: item
	const index = selectedItemIds.value.indexOf(best.id)
	if (index > -1) {
		selectedItemIds.value.splice(index, 1)
	} else {
		selectedItemIds.value.push(best.id)
	}
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Handle multiple selection toggle
function handleMultipleSelectionToggle(checked) {
	enableMultipleSelection.value = checked
	if (!checked) {
		// Clear multiple selections when disabling
		selectedItemIds.value = []
		// If we had a single item selected, keep it
		if (formData.value.item_id) {
			// Keep the single selection
		}
	} else {
		// When enabling, move single selection to multiple if exists
		if (formData.value.item_id && !selectedItemIds.value.includes(formData.value.item_id)) {
			selectedItemIds.value = [formData.value.item_id]
			formData.value.item_id = '' // Clear single selection
		}
	}
}

// Check if item is selected
function isItemSelected(itemId) {
	return selectedItemIds.value.includes(itemId)
}

// Category selection (multiple selection mode)
function isCategoryFullySelected(category) {
	const items = orderedItemsByCategory.value[category] || []
	return items.length > 0 && items.every((item) => selectedItemIds.value.includes(item.id))
}

function isCategoryPartiallySelected(category) {
	const items = orderedItemsByCategory.value[category] || []
	if (items.length === 0) return false
	const selectedCount = items.filter((item) => selectedItemIds.value.includes(item.id)).length
	return selectedCount > 0 && selectedCount < items.length
}

function toggleCategorySelection(category) {
	const items = orderedItemsByCategory.value[category] || []
	const ids = items.map((i) => i.id)
	const allSelected = ids.every((id) => selectedItemIds.value.includes(id))
	if (allSelected) {
		selectedItemIds.value = selectedItemIds.value.filter((id) => !ids.includes(id))
	} else {
		const toAdd = ids.filter((id) => !selectedItemIds.value.includes(id))
		selectedItemIds.value = [...selectedItemIds.value, ...toAdd]
	}
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Remove selected item
function removeSelectedItem(itemId) {
	const index = selectedItemIds.value.indexOf(itemId)
	if (index > -1) {
		selectedItemIds.value.splice(index, 1)
	}
}

// Form submission on Enter key
function handleFormKeyDown(event) {
	if (event.key === 'Enter' && !event.shiftKey) {
		// Don't submit if we're in the search input and dropdown is open
		if (
			event.target.id === 'item-search' &&
			searchQuery.value &&
			filteredItems.value.length > 0
		) {
			return
		}

		// Don't submit if in textarea
		if (event.target.tagName === 'TEXTAREA') {
			return
		}

		event.preventDefault()
		if (isFormValid.value) {
			handleSubmit()
		}
	}
}

// Select item handler (kept for backward compatibility, but not used in new multi-select mode)
function selectItem(item) {
	const best = isServerShop.value
		? canonicalGuideItemForMaterial(props.availableItems, item)
		: item
	formData.value.item_id = best.id
	if (isServerShop.value && props.serverVersionKey) {
		const recipe = getRecipeForItem(best, props.serverVersionKey)
		formData.value.pricing_type = recipe ? 'manual' : 'base'
	}
	// Clear enchantments when item changes (if new item is not enchantable or is different)
	if (!isItemEnchantable(best) || best.category === 'enchantments') {
		formData.value.enchantments = []
	}
	searchQuery.value = '' // Clear search query when item is selected
	highlightedIndex.value = -1 // Reset highlight
	if (formError.value === 'item_id') {
		formError.value = null
	}

	// Auto-focus buy price field in single-select mode
	if (!enableMultipleSelection.value) {
		nextTick(() => {
			if (buyPriceInput.value) {
				buyPriceInput.value.focus()
			}
		})
	}
}

// Clear all selected items
function clearSelectedItems() {
	selectedItemIds.value = []
	searchQuery.value = ''
	highlightedIndex.value = -1
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Clear selected item (single mode)
function clearSelectedItem() {
	formData.value.item_id = ''
	formData.value.enchantments = [] // Clear enchantments when clearing item
	searchQuery.value = ''
	highlightedIndex.value = -1
	if (formError.value === 'item_id') {
		formError.value = null
	}
}

// Enchantment functions
function removeEnchantment(enchantmentId) {
	const index = formData.value.enchantments.indexOf(enchantmentId)
	if (index > -1) {
		formData.value.enchantments.splice(index, 1)
	}
}

// Extract enchantment type and level from enchantment ID
function getEnchantmentTypeAndLevel(enchantmentId) {
	const enchantmentItem = allEnchantmentItems.value.find((item) => item.id === enchantmentId)
	if (!enchantmentItem) return null

	const materialId = enchantmentItem.material_id
	if (!materialId || !materialId.startsWith('enchanted_book_')) return null

	const enchantmentPart = materialId.replace('enchanted_book_', '')
	const match = enchantmentPart.match(/^(.+)_(\d+)$/)
	if (match) {
		return {
			type: match[1],
			level: parseInt(match[2], 10),
			id: enchantmentId
		}
	}

	// Enchantment without level
	return {
		type: enchantmentPart,
		level: 1,
		id: enchantmentId
	}
}

function selectEnchantment(enchantment) {
	enchantmentError.value = null

	const newEnchantmentData = getEnchantmentTypeAndLevel(enchantment.id)
	if (!newEnchantmentData) {
		enchantmentError.value = 'Could not parse enchantment data'
		return
	}

	// Check for same enchantment type in existing enchantments
	const existingEnchantmentIndex = formData.value.enchantments.findIndex((existingId) => {
		const existingData = getEnchantmentTypeAndLevel(existingId)
		return existingData && existingData.type === newEnchantmentData.type
	})

	if (existingEnchantmentIndex !== -1) {
		// Same enchantment type exists - check if new one is higher level
		const existingData = getEnchantmentTypeAndLevel(formData.value.enchantments[existingEnchantmentIndex])
		if (existingData && newEnchantmentData.level > existingData.level) {
			// Replace lower level with higher level
			formData.value.enchantments[existingEnchantmentIndex] = enchantment.id
			enchantmentSearchQuery.value = ''
			enchantmentHighlightedIndex.value = -1
			return
		} else if (existingData && newEnchantmentData.level <= existingData.level) {
			// New level is same or lower - don't add, but don't show error
			enchantmentSearchQuery.value = ''
			enchantmentHighlightedIndex.value = -1
			return
		}
	}

	// Check for conflicts with existing enchantments
	if (
		hasEnchantmentConflict(
			enchantment.id,
			formData.value.enchantments,
			allEnchantmentItems.value
		)
	) {
		const reason = getEnchantmentConflictReason(
			enchantment.id,
			formData.value.enchantments,
			allEnchantmentItems.value
		)
		enchantmentError.value = reason || 'This enchantment conflicts with existing enchantments'
		return
	}

	// Check if already added (exact same enchantment)
	if (formData.value.enchantments.includes(enchantment.id)) {
		enchantmentError.value = 'This enchantment is already added'
		return
	}

	// Add enchantment
	formData.value.enchantments.push(enchantment.id)
	enchantmentSearchQuery.value = ''
	enchantmentHighlightedIndex.value = -1
}

// Enchantment keyboard navigation
function handleEnchantmentKeyDown(event) {
	if (!filteredEnchantments.value.length) return

	const oldIndex = enchantmentHighlightedIndex.value

	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault()
			if (enchantmentHighlightedIndex.value < 0) {
				enchantmentHighlightedIndex.value = 0
			} else {
				enchantmentHighlightedIndex.value = Math.min(
					enchantmentHighlightedIndex.value + 1,
					filteredEnchantments.value.length - 1
				)
			}
			break
		case 'ArrowUp':
			event.preventDefault()
			if (enchantmentHighlightedIndex.value <= 0) {
				enchantmentHighlightedIndex.value = -1
			} else {
				enchantmentHighlightedIndex.value = Math.max(enchantmentHighlightedIndex.value - 1, 0)
			}
			break
		case 'Enter':
			event.preventDefault()
			if (
				enchantmentHighlightedIndex.value >= 0 &&
				enchantmentHighlightedIndex.value < filteredEnchantments.value.length
			) {
				const enchantment = filteredEnchantments.value[enchantmentHighlightedIndex.value]
				selectEnchantment(enchantment)
			}
			break
		case 'Escape':
			enchantmentHighlightedIndex.value = -1
			enchantmentSearchQuery.value = ''
			break
	}

	// Scroll highlighted enchantment into view if index changed
	if (oldIndex !== enchantmentHighlightedIndex.value) {
		scrollToHighlightedEnchantment()
	}
}

function scrollToHighlightedEnchantment() {
	if (!enchantmentDropdownContainer.value || enchantmentHighlightedIndex.value < 0) return

	setTimeout(() => {
		const highlightedElement = enchantmentDropdownContainer.value.querySelector('.bg-norway')
		if (highlightedElement) {
			highlightedElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			})
		}
	}, 0)
}

function handleEnchantmentSearchInput() {
	enchantmentHighlightedIndex.value = -1
	if (enchantmentError.value) {
		enchantmentError.value = null
	}
}

function formatEnchantmentName(enchantmentId) {
	if (!enchantmentId) return ''

	// Get enchantment item from availableItems
	const enchantmentItem = props.availableItems.find((item) => item.id === enchantmentId)
	if (!enchantmentItem) return enchantmentId

	// Try to extract from material_id first (most reliable)
	const materialId = enchantmentItem.material_id
	if (materialId && materialId.startsWith('enchanted_book_')) {
		// Extract enchantment name from material_id like "enchanted_book_aqua_affinity_1"
		const enchantmentPart = materialId.replace('enchanted_book_', '')

		// Try to extract enchantment with level first (e.g., "unbreaking_3" -> "unbreaking 3")
		const enchantWithLevelMatch = enchantmentPart.match(/^(.+)_(\d+)$/)
		if (enchantWithLevelMatch) {
			const enchantName = enchantWithLevelMatch[1]
			const level = enchantWithLevelMatch[2]

			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			
			// Don't display level 1 for single-level enchantments (max level 1)
			const maxLevel = enchantmentItem.enchantment_max_level
			if (level === '1' && maxLevel === 1) {
				return capitalizedEnchant
			}
			
			return `${capitalizedEnchant} ${level}`
		}

		// Try enchantment without level (e.g., "silk_touch" -> "silk touch")
		const enchantWithoutLevelMatch = enchantmentPart.match(/^(.+)$/)
		if (enchantWithoutLevelMatch) {
			const enchantName = enchantWithoutLevelMatch[1]
			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			return capitalizedEnchant
		}
	}

	// Fallback: Use item name
	return enchantmentItem.name || enchantmentId
}

// Get visual index of an item in the dropdown (accounting for category grouping)
function getItemVisualIndex(targetCategory, targetCategoryIndex) {
	let visualIndex = 0
	const ordered = orderedItemsByCategory.value

	for (const [category, categoryItems] of Object.entries(ordered)) {
		if (category === targetCategory) {
			return visualIndex + targetCategoryIndex
		}
		visualIndex += categoryItems.length
	}

	return -1
}

// Number input helpers
function handlePriceInput(field, event) {
	// Clear error for this field when user types
	if (formError.value === field || formError.value === 'prices') {
		formError.value = null
	}
	const value = event.target.value
	if (value === '' || value === null) {
		formData.value[field] = null
	} else {
		const numValue = parseFloat(value)
		formData.value[field] = isNaN(numValue) ? null : numValue
	}
}

function handleOutOfStockChange(checked) {
	if (checked) {
		formData.value.stock_quantity = 0
	} else {
		formData.value.stock_quantity = null
	}
}

// Expose focus function, submit method, form validity, and selected items count for parent component
defineExpose({
	focusSearchInput,
	submit: handleSubmit,
	isFormValid,
	selectedItemsCount: computed(() => selectedItemIds.value.length)
})
</script>

<template>
	<div
		:class="
			isModalVariant ? 'space-y-4' : 'mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50'
		">
		<h2 v-if="!isModalVariant" class="text-xl font-semibold mb-4">
			{{ editingItem ? 'Edit Shop Item' : 'Add New Shop Item' }}
		</h2>

		<form @submit.prevent="handleSubmit" @keydown="handleFormKeyDown" class="space-y-4">
			<!-- Item selection -->
			<div v-if="!editingItem">
				<!-- Show search input when no item is selected (single mode) or in multiple mode -->
				<div v-if="!selectedItem || enableMultipleSelection">
					<label for="item-search" class="block text-sm font-medium text-gray-700 mb-1">
						Search and Select {{ enableMultipleSelection ? 'Items' : 'Item' }} *
						<span
							v-if="enableMultipleSelection && selectedItemIds.length > 0"
							class="text-gray-500 font-normal">
							({{ selectedItemIds.length }} selected)
						</span>
					</label>

					<!-- Enable multiple selection checkbox -->
					<div class="mb-2">
						<label class="flex items-center">
							<input
								v-model="enableMultipleSelection"
								data-cy="shop-item-multiple-selection-checkbox"
								@change="handleMultipleSelectionToggle($event.target.checked)"
								type="checkbox"
								class="checkbox-input" />
							<span class="ml-2 text-sm text-gray-700">
								Enable multiple selection
							</span>
						</label>
					</div>

					<input
						id="item-search"
						ref="searchInput"
						v-model="searchQuery"
						data-cy="shop-item-search-input"
						@input="handleSearchInput"
						@keydown="handleKeyDown"
						type="text"
						autocomplete="off"
						placeholder="Search items by name, material ID, or category..."
						:class="[
							'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
							formError === 'item_id'
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />

					<!-- Error message for item selection -->
					<div
						v-if="formError === 'item_id'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
						<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
						{{
							enableMultipleSelection
								? 'Please select at least one item'
								: 'Please select an item'
						}}
					</div>

					<!-- Selected items display (multiple mode only; show first 10 then "and N more") -->
					<div
						v-if="enableMultipleSelection && selectedItems.length > 0"
						class="mt-2 mb-2">
						<div class="flex flex-wrap gap-2 items-center">
							<template v-for="item in selectedItems.slice(0, 10)" :key="item.id">
								<div
									class="px-2 py-1 bg-sea-mist border border-highland rounded flex items-center gap-2">
									<span class="text-sm font-medium text-heavy-metal">
										{{ item.name }}
									</span>
									<button
										type="button"
										@click="removeSelectedItem(item.id)"
										class="text-gray-600 hover:text-gray-900">
										<XCircleIcon class="w-4 h-4" />
									</button>
								</div>
							</template>
							<span
								v-if="selectedItems.length > 10"
								class="text-sm text-gray-600 italic">
								and {{ selectedItems.length - 10 }} more
							</span>
						</div>
						<button
							type="button"
							@click="clearSelectedItems"
							class="mt-2 text-sm text-gray-900 hover:text-gray-700 underline">
							Clear all selections
						</button>
						<NotificationBanner
							v-if="showAlreadyInShopNotice"
							type="info"
							size="compact"
							title="Already in shop"
							message="One or more of these items have already been added to this shop"
							class="mt-2" />
						<NotificationBanner
							v-if="shopItemLimitExceeded"
							type="error"
							title="Too many items selected"
							:message="shopItemLimitExceededMessage"
							class="mt-2" />
					</div>

					<!-- Item selection dropdown -->
					<div
						v-if="searchQuery && filteredItems.length > 0"
						ref="dropdownContainer"
						class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white">
						<template
							v-for="(categoryItems, category) in orderedItemsByCategory"
							:key="category">
							<div
								:class="[
									'px-3 py-2 border-b flex items-center gap-3 text-sm font-medium text-gray-700',
									enableMultipleSelection ? 'bg-gray-100 cursor-pointer hover:bg-gray-200' : 'bg-gray-100'
								]"
								@click="enableMultipleSelection && toggleCategorySelection(category)">
								<input
									v-if="enableMultipleSelection"
									type="checkbox"
									:checked="isCategoryFullySelected(category)"
									:indeterminate.prop="isCategoryPartiallySelected(category)"
									class="checkbox-input flex-shrink-0"
									@click.stop
									@change.stop="toggleCategorySelection(category)" />
								<span class="flex-1">{{ category }}</span>
							</div>
							<div
								v-for="(item, categoryIndex) in categoryItems"
								:key="item.id"
								data-cy="shop-item-dropdown-item"
								@click="
									enableMultipleSelection
										? toggleItemSelection(item)
										: selectItem(item)
								"
								:class="[
									'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center gap-3',
									getItemVisualIndex(category, categoryIndex) === highlightedIndex
										? 'bg-norway text-heavy-metal'
										: 'hover:bg-sea-mist'
								]">
								<input
									v-if="enableMultipleSelection"
									type="checkbox"
									:checked="isItemSelected(item.id)"
									@click.stop
									@change.stop="toggleItemSelection(item)"
									class="checkbox-input flex-shrink-0" />
								<div class="flex-1">
									<div class="font-medium">{{ item.name }}</div>
								</div>
								<div v-if="item.image" class="w-8 h-8 flex-shrink-0">
									<img
										:src="item.image"
										:alt="item.name"
										class="w-full h-full object-contain" />
								</div>
							</div>
						</template>
					</div>
				</div>

				<!-- Show selected item when item is selected (single mode only) -->
				<div v-else>
					<label class="block text-sm font-medium text-gray-700 mb-1">Item *</label>

					<!-- Enable multiple selection checkbox -->
					<div class="mb-2">
						<label class="flex items-center">
							<input
								v-model="enableMultipleSelection"
								data-cy="shop-item-multiple-selection-checkbox"
								@change="handleMultipleSelectionToggle($event.target.checked)"
								type="checkbox"
								class="checkbox-input" />
							<span class="ml-2 text-sm text-gray-700">
								Enable multiple selection
							</span>
						</label>
					</div>

					<div
						class="px-3 py-2 bg-sea-mist border-2 border-highland rounded flex items-center justify-between">
						<div>
							<div class="font-medium text-heavy-metal">{{ selectedItem.name }}</div>
						</div>
						<div v-if="selectedItem.image" class="w-8 h-8">
							<img
								:src="selectedItem.image"
								:alt="selectedItem.name"
								class="w-full h-full object-contain" />
						</div>
					</div>
					<button
						type="button"
						@click="clearSelectedItem"
						class="mt-2 text-sm text-gray-900 hover:text-gray-700 underline">
						Select different item
					</button>
					<NotificationBanner
						v-if="showAlreadyInShopNotice"
						type="info"
						size="compact"
						title="Already in shop"
						message="This item has already been added to this shop"
						class="mt-2" />
				</div>
			</div>

			<!-- Show selected item when editing -->
			<div
				v-else-if="editingItem && editingItem.itemData"
				class="px-3 py-2 bg-sea-mist border-2 border-highland rounded">
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">{{ editingItem.itemData.name }}</div>
					</div>
					<div v-if="editingItem.itemData.image" class="w-8 h-8">
						<img
							:src="editingItem.itemData.image"
							:alt="editingItem.itemData.name"
							class="w-full h-full object-contain" />
					</div>
				</div>
			</div>

			<!-- Enchantments Section - only show for enchantable items and single selection mode -->
			<div
				v-if="showEnchantmentSection && !enableMultipleSelection && !editingItem"
				class="mt-4">
				<label for="enchantment-search" class="block text-sm font-medium text-gray-700 mb-1">
					Enchantments
				</label>
				
				<!-- Selected enchantments display -->
				<div
					v-if="formData.enchantments && formData.enchantments.length > 0"
					class="mb-2 flex flex-wrap gap-2">
					<div
						v-for="enchantmentId in formData.enchantments"
						:key="enchantmentId"
						class="flex items-center gap-2 pl-3 pr-2 py-1 bg-sea-mist text-heavy-metal rounded-md text-sm font-medium">
						<span>{{ formatEnchantmentName(enchantmentId) }}</span>
						<button
							type="button"
							@click="removeEnchantment(enchantmentId)"
							class="text-heavy-metal hover:text-red-700">
							<XMarkIcon class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Enchantment search input -->
				<input
					id="enchantment-search"
					ref="enchantmentSearchInput"
					v-model="enchantmentSearchQuery"
					data-cy="shop-item-enchantment-search-input"
					@input="handleEnchantmentSearchInput"
					@keydown="handleEnchantmentKeyDown"
					type="text"
					autocomplete="off"
					placeholder="Search enchantments..."
					class="block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus" />

				<!-- Error message -->
				<div
					v-if="enchantmentError"
					class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
					<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
					{{ enchantmentError }}
				</div>

				<!-- Enchantment dropdown -->
				<div
					v-if="enchantmentSearchQuery && filteredEnchantments.length > 0"
					ref="enchantmentDropdownContainer"
					class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white">
					<div
						v-for="(enchantment, index) in filteredEnchantments"
						:key="enchantment.id"
						data-cy="shop-item-enchantment-dropdown-item"
						@click="selectEnchantment(enchantment)"
						:class="[
							'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center gap-3',
							index === enchantmentHighlightedIndex
								? 'bg-norway text-heavy-metal'
								: 'hover:bg-sea-mist'
						]">
						<div class="flex-1">
							<div class="font-medium">{{ formatEnchantmentName(enchantment.id) }}</div>
						</div>
						<div v-if="enchantment.image" class="w-8 h-8 flex-shrink-0">
							<img
								:src="enchantment.image"
								:alt="formatEnchantmentName(enchantment.id)"
								class="w-full h-full object-contain" />
						</div>
					</div>
				</div>
				<div
					v-else-if="enchantmentSearchQuery && filteredEnchantments.length === 0"
					class="px-3 py-2 text-sm text-gray-500 italic">
					No enchantments found
				</div>
				<div
					v-else-if="!enchantmentSearchQuery && compatibleEnchantments.length === 0"
					class="mt-2 text-sm text-gray-500 italic">
					No compatible enchantments available for this item
				</div>
			</div>

			<!-- Enchantments Section - for editing mode -->
			<div
				v-if="showEnchantmentSection && editingItem"
				class="mt-4">
				<label for="enchantment-search-edit" class="block text-sm font-medium text-gray-700 mb-1">
					Enchantments
				</label>
				
				<!-- Selected enchantments display -->
				<div
					v-if="formData.enchantments && formData.enchantments.length > 0"
					class="mb-2 flex flex-wrap gap-2">
					<div
						v-for="enchantmentId in formData.enchantments"
						:key="enchantmentId"
						class="flex items-center gap-2 pl-3 pr-2 py-1 bg-sea-mist text-heavy-metal rounded-md text-sm font-medium">
						<span>{{ formatEnchantmentName(enchantmentId) }}</span>
						<button
							type="button"
							@click="removeEnchantment(enchantmentId)"
							class="text-heavy-metal hover:text-red-700">
							<XMarkIcon class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Enchantment search input -->
				<input
					id="enchantment-search-edit"
					ref="enchantmentSearchInput"
					v-model="enchantmentSearchQuery"
					data-cy="shop-item-enchantment-search-input"
					@input="handleEnchantmentSearchInput"
					@keydown="handleEnchantmentKeyDown"
					type="text"
					autocomplete="off"
					placeholder="Search enchantments..."
					class="block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus" />

				<!-- Error message -->
				<div
					v-if="enchantmentError"
					class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
					<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
					{{ enchantmentError }}
				</div>

				<!-- Enchantment dropdown -->
				<div
					v-if="enchantmentSearchQuery && filteredEnchantments.length > 0"
					ref="enchantmentDropdownContainer"
					class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white">
					<div
						v-for="(enchantment, index) in filteredEnchantments"
						:key="enchantment.id"
						data-cy="shop-item-enchantment-dropdown-item"
						@click="selectEnchantment(enchantment)"
						:class="[
							'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center gap-3',
							index === enchantmentHighlightedIndex
								? 'bg-norway text-heavy-metal'
								: 'hover:bg-sea-mist'
						]">
						<div class="flex-1">
							<div class="font-medium">{{ formatEnchantmentName(enchantment.id) }}</div>
						</div>
						<div v-if="enchantment.image" class="w-8 h-8 flex-shrink-0">
							<img
								:src="enchantment.image"
								:alt="formatEnchantmentName(enchantment.id)"
								class="w-full h-full object-contain" />
						</div>
					</div>
				</div>
				<div
					v-else-if="enchantmentSearchQuery && filteredEnchantments.length === 0"
					class="px-3 py-2 text-sm text-gray-500 italic">
					No enchantments found
				</div>
				<div
					v-else-if="!enchantmentSearchQuery && compatibleEnchantments.length === 0"
					class="mt-2 text-sm text-gray-500 italic">
					No compatible enchantments available for this item
				</div>
			</div>

			<!-- Server shop: pricing type (Custom vs Recipe) -->
			<div v-if="showServerShopPricingTypeSection" class="space-y-4">
				<div>
					<div class="mb-1 flex flex-wrap items-center gap-1.5">
						<label for="pricing-type" class="text-sm font-medium text-gray-700">
							Pricing type
						</label>
						<FieldHelpTooltip
							data-cy="shop-item-pricing-type-help"
							button-label="How pricing types work">
							<div class="space-y-3">
								<p>
									<strong class="block">Base</strong>
									<span class="block">
										No recipe → you set the price (usually raw materials).
									</span>
								</p>
								<p>
									<strong class="block">Recipe</strong>
									<span class="block">Auto-calculated from ingredients.</span>
								</p>
								<p>
									<strong class="block">Custom</strong>
									<span class="block">Manual price override.</span>
								</p>
							</div>
						</FieldHelpTooltip>
					</div>
					<input
						v-if="selectedItem && !hasRecipeForSelectedItem"
						id="pricing-type"
						type="text"
						value="Base"
						readonly
						disabled
						class="mt-2 block w-full max-w-[200px] rounded border-2 border-gray-300 bg-gray-100 px-3 py-1.5 text-gray-600 font-sans cursor-not-allowed" />
					<select
						v-else-if="selectedItem"
						id="pricing-type"
						v-model="formData.pricing_type"
						class="mt-2 block w-full max-w-[200px] rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans">
						<option value="manual">Custom</option>
						<option value="from_recipe">Recipe</option>
					</select>
					<div v-if="recipeDisplay" class="mt-3">
						<label class="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
						<div class="flex flex-col gap-2">
							<div
								v-for="(ing, idx) in recipeDisplay.ingredients"
								:key="idx"
								class="flex items-center gap-2 text-sm text-gray-900">
								<div class="flex items-center gap-2 min-w-[160px] flex-shrink-0">
									<img
										v-if="ing.image"
										:src="ing.image"
										:alt="ing.name"
										class="w-5 h-5 object-contain flex-shrink-0" />
									<span>{{ ing.quantity }} {{ ing.name }}</span>
								</div>
								<template v-if="ing.issues.length">
									<span
										v-for="(issue, issueIdx) in ing.issues"
										:key="issueIdx"
										class="bg-red-600 text-white text-xs font-medium px-1.5 py-0.5 rounded uppercase">
										{{ issue }}
									</span>
								</template>
								<span
									v-else
									class="text-gray-900">
									Buy: <span class="font-semibold">{{ parseFloat(ing.buy_price.toFixed(2)).toString() }}</span>
									<span class="mx-1.5">Sell: <span class="font-semibold">{{ parseFloat(ing.sell_price.toFixed(2)).toString() }}</span></span>
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Price inputs -->
			<div class="space-y-4">
				<div>
					<label for="buy-price" class="block text-sm font-medium text-gray-700 mb-1">
						Buy Price
					</label>
					<p class="text-xs text-gray-500 mb-1">
						This is the amount players need to pay for the item
					</p>
					<input
						id="buy-price"
						ref="buyPriceInput"
						data-cy="shop-item-buy-price-input"
						:value="
							isServerShop && formData.pricing_type === 'from_recipe' && recipePriceResult.buy.price != null
								? (typeof recipePriceResult.buy.price === 'number'
										? parseFloat(recipePriceResult.buy.price.toFixed(2)).toString()
										: recipePriceResult.buy.price)
								: formData.buy_price
						"
						:readonly="isServerShop && formData.pricing_type === 'from_recipe'"
						@input="
							!(isServerShop && formData.pricing_type === 'from_recipe') && handlePriceInput('buy_price', $event)
						"
						type="number"
						step="0.01"
						min="0"
						placeholder="0.00"
						:class="[
							'mt-2 block w-[150px] rounded border-2 px-3 py-1 font-sans',
							isServerShop && formData.pricing_type === 'from_recipe'
								? 'bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300 font-semibold'
								: [
										'text-gray-900 placeholder:text-gray-400 focus:ring-2',
										formError === 'buy_price'
											? 'border-red-500 focus:ring-red-500 focus:border-red-500'
											: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
									]
						]" />
					<div
						v-if="formError === 'buy_price'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
						<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
						Buy price must be a valid number greater than or equal to 0
					</div>
					<!-- Out of stock checkbox (hidden for server shops) -->
					<div v-if="shop && !isServerShop" class="mt-2">
						<label class="flex items-center">
							<input
								:checked="formData.stock_quantity === 0"
								@change="handleOutOfStockChange($event.target.checked)"
								type="checkbox"
								class="checkbox-input" />
							<span class="ml-2 text-sm text-gray-700 flex items-center gap-1">
								Out of stock
								<ArchiveBoxXMarkIcon class="w-4 h-4" />
							</span>
						</label>
					</div>
				</div>

				<div>
					<label for="sell-price" class="block text-sm font-medium text-gray-700 mb-1">
						Sell Price
					</label>
					<p class="text-xs text-gray-500 mb-1">
						This is the amount players get when selling the item
					</p>
					<div class="flex items-center gap-2">
						<input
							id="sell-price"
							data-cy="shop-item-sell-price-input"
							:value="
								isServerShop && formData.pricing_type === 'from_recipe' && recipePriceResult.sell.price != null
									? (typeof recipePriceResult.sell.price === 'number'
											? parseFloat(recipePriceResult.sell.price.toFixed(2)).toString()
											: recipePriceResult.sell.price)
									: formData.sell_price
							"
							:readonly="isServerShop && formData.pricing_type === 'from_recipe'"
							@input="
								!(isServerShop && formData.pricing_type === 'from_recipe') && handlePriceInput('sell_price', $event)
							"
							type="number"
							step="0.01"
							min="0"
							placeholder="0.00"
							:class="[
								'mt-2 block w-[150px] rounded border-2 px-3 py-1 font-sans',
								isServerShop && formData.pricing_type === 'from_recipe'
									? 'bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300 font-semibold'
									: [
											'text-gray-900 placeholder:text-gray-400 focus:ring-2',
											formError === 'sell_price'
												? 'border-red-500 focus:ring-red-500 focus:border-red-500'
												: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
										]
							]" />
						<span v-if="profitMargin !== null" class="mt-2 text-sm text-gray-600">
							{{ profitMargin.toFixed(1) }}%
						</span>
					</div>
					<div
						v-if="formError === 'sell_price'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
						<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
						Sell price must be a valid number greater than or equal to 0
					</div>
					<div
						v-if="formError === 'prices'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-start gap-1">
						<XCircleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
						At least one price (buy or sell) is required
					</div>
					<!-- Stock Full checkbox (only for competitor shops) -->
					<div v-if="shop && !shop.is_own_shop" class="mt-2">
						<label class="flex items-center">
							<input
								v-model="formData.stock_full"
								type="checkbox"
								class="checkbox-input" />
							<span class="ml-2 text-sm text-gray-700 flex items-center gap-1">
								Stock full
								<ArchiveBoxIcon class="w-4 h-4" />
							</span>
						</label>
						<p class="text-xs text-gray-500 mt-1">Mark when you can't sell any more</p>
					</div>
				</div>
			</div>

			<!-- Notes -->
			<div>
				<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
					Notes (Optional)
				</label>
				<textarea
					id="notes"
					v-model="formData.notes"
					data-cy="shop-item-notes-input"
					rows="3"
					placeholder="Add any notes about this item, pricing, or stock..."
					class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
			</div>

			<!-- Form actions (only show when not in modal mode) -->
			<div
				v-if="!isModalVariant"
				class="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<BaseButton type="button" variant="tertiary" @click="handleCancel">
					Cancel
				</BaseButton>
				<BaseButton type="submit" variant="primary" :disabled="!isFormValid">
					{{ editingItem ? 'Update Item' : 'Add Item' }}
				</BaseButton>
			</div>
		</form>

	</div>
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
