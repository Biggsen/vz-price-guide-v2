/**
 * Server shop recipe-based pricing: compute prices from recipe ingredients
 * using only prices from the same shop. Used when server_shop === true.
 */

import { updateShopItem } from './shopItems.js'

/**
 * Normalize version to key format (e.g. "1.21" -> "1_21")
 * @param {string} version
 * @returns {string}
 */
function versionToKey(version) {
	if (!version) return ''
	return String(version).replace('.', '_')
}

/**
 * Get recipe for a guide item for the given version (with fallback to earlier versions)
 * @param {Object} guideItem - Item from Firestore items collection
 * @param {string} versionKey - e.g. "1_21"
 * @returns {{ ingredients: Array<{ material_id: string, quantity: number }>, output_count: number } | null}
 */
export function getRecipeForItem(guideItem, versionKey) {
	if (!guideItem?.recipes_by_version || typeof guideItem.recipes_by_version !== 'object') {
		return null
	}
	const recipes = guideItem.recipes_by_version
	let recipe = recipes[versionKey]
	if (!recipe && Object.keys(recipes).length > 0) {
		const sorted = Object.keys(recipes).sort((a, b) => {
			const [aM, aN] = a.replace('_', '.').split('.').map(Number)
			const [bM, bN] = b.replace('_', '.').split('.').map(Number)
			if (aM !== bM) return bM - aM
			return bN - aN
		})
		const [reqM, reqN] = versionKey.replace('_', '.').split('.').map(Number)
		for (const k of sorted) {
			const [vM, vN] = k.replace('_', '.').split('.').map(Number)
			if (vM < reqM || (vM === reqM && vN <= reqN)) {
				recipe = recipes[k]
				break
			}
		}
	}
	if (!recipe) return null
	const ingredients = Array.isArray(recipe) ? recipe : recipe.ingredients
	const outputCount = Array.isArray(recipe) ? 1 : recipe.output_count || 1
	if (!ingredients || !Array.isArray(ingredients)) return null
	return { ingredients, output_count: outputCount }
}

/**
 * Detect circular recipe dependencies (direct or indirect) for an item.
 * Uses the same version fallback rules as getRecipeForItem.
 * @param {Object} guideItem
 * @param {Record<string, Object>} guideByMaterialId
 * @param {string} versionKey
 * @param {Set<string>} path
 * @returns {boolean}
 */
export function hasCircularRecipeDependency(
	guideItem,
	guideByMaterialId,
	versionKey,
	path = new Set()
) {
	if (!guideItem?.material_id) return false
	if (path.has(guideItem.material_id)) return true

	const recipe = getRecipeForItem(guideItem, versionKey)
	if (!recipe?.ingredients?.length) return false

	const nextPath = new Set(path)
	nextPath.add(guideItem.material_id)

	for (const ingredient of recipe.ingredients) {
		const ingredientGuideItem = guideByMaterialId?.[ingredient.material_id]
		if (!ingredientGuideItem) continue
		if (hasCircularRecipeDependency(ingredientGuideItem, guideByMaterialId, versionKey, nextPath)) {
			return true
		}
	}

	return false
}

/**
 * Build map: material_id -> guide item (first match)
 * @param {Array} guideItems
 * @returns {Record<string, Object>}
 */
function guideItemsByMaterialId(guideItems) {
	const map = {}
	;(guideItems || []).forEach((item) => {
		if (item.material_id && !map[item.material_id]) {
			map[item.material_id] = item
		}
	})
	return map
}

/**
 * Build map: item_id -> shop item for this shop
 * @param {Array} shopItems
 * @returns {Record<string, Object>}
 */
function shopItemsByItemId(shopItems) {
	const map = {}
	;(shopItems || []).forEach((si) => {
		if (si.item_id) map[si.item_id] = si
	})
	return map
}

/**
 * Compute a single price (buy or sell) from recipe for one shop item.
 * Ingredients must exist in this shop with a defined price (manual or recipe-derived).
 * @param {Object} shopItem - Shop item { item_id, buy_price, sell_price, pricing_type }
 * @param {Object} guideItem - Guide item with recipes_by_version
 * @param {Record<string, Object>} shopItemsByItemIdMap - item_id -> shop item
 * @param {Record<string, Object>} guideByMaterialId - material_id -> guide item
 * @param {string} versionKey - e.g. "1_21"
 * @param {'buy'|'sell'} priceKind - use ingredient buy_price or sell_price for the sum
 * @param {Set<string>} visited - material_ids being computed (cycle detection)
 * @returns {{ price: number | null, error: string | null }}
 */
export function computeRecipePriceForShop(
	shopItem,
	guideItem,
	shopItemsByItemIdMap,
	guideByMaterialId,
	versionKey,
	priceKind,
	visited = new Set()
) {
	const recipe = getRecipeForItem(guideItem, versionKey)
	if (!recipe) {
		return { price: null, error: 'No recipe for this item' }
	}

	if (hasCircularRecipeDependency(guideItem, guideByMaterialId, versionKey)) {
		return { price: null, error: `Circular dependency: ${guideItem.name || guideItem.material_id}` }
	}

	const priceField = priceKind === 'buy' ? 'buy_price' : 'sell_price'
	const priceLabel = priceKind === 'buy' ? 'buy' : 'sell'

	if (visited.has(guideItem.material_id)) {
		return { price: null, error: `Circular dependency: ${guideItem.name || guideItem.material_id}` }
	}
	visited.add(guideItem.material_id)

	let totalCost = 0
	for (const ing of recipe.ingredients) {
		const matId = ing.material_id
		const qty = ing.quantity || 1
		const ingGuideItem = guideByMaterialId[matId]
		if (!ingGuideItem) {
			visited.delete(guideItem.material_id)
			return { price: null, error: `Ingredient ${matId} not in item list` }
		}
		const ingShopItem = shopItemsByItemIdMap[ingGuideItem.id]
		if (!ingShopItem) {
			visited.delete(guideItem.material_id)
			return {
				price: null,
				error: `Add [${ingGuideItem.name || matId}] to this shop first.`
			}
		}
		const ingPrice = ingShopItem[priceField]
		if (ingPrice == null || (typeof ingPrice === 'number' && (isNaN(ingPrice) || ingPrice < 0))) {
			visited.delete(guideItem.material_id)
			return {
				price: null,
				error: `Add [${ingGuideItem.name || matId}] to this shop with a ${priceLabel} price first.`
			}
		}
		if (ingShopItem.pricing_type === 'from_recipe') {
			const sub = computeRecipePriceForShop(
				ingShopItem,
				ingGuideItem,
				shopItemsByItemIdMap,
				guideByMaterialId,
				versionKey,
				priceKind,
				new Set(visited)
			)
			if (sub.error) {
				visited.delete(guideItem.material_id)
				return sub
			}
			totalCost += (sub.price || 0) * qty
		} else {
			totalCost += Number(ingPrice) * qty
		}
	}

	visited.delete(guideItem.material_id)
	const pricePerUnit = recipe.output_count > 0 ? totalCost / recipe.output_count : 0
	return { price: pricePerUnit, error: null }
}

/**
 * Round price for display/storage (match pricing.js customRoundPrice)
 */
function roundPrice(price) {
	if (price < 5) return Math.ceil(price * 10) / 10
	return Math.ceil(price)
}

/**
 * Recalculate all "from_recipe" prices for a shop and persist to Firestore.
 * Iterates until no changes or max passes (handles dependency chains).
 * @param {string} _shopId - Unused, for API consistency
 * @param {Array} shopItems - All shop items for this shop
 * @param {Array} guideItems - All guide items (for item_id and recipes)
 * @param {string} versionKey - e.g. "1_21"
 * @param {function} updateShopItemFn - Optional; defaults to updateShopItem from shopItems.js
 * @returns {Promise<{ updated: Array<{ id: string, item_id: string, buy_price?: number, sell_price?: number }>, errors: Array<{ item_id: string, name?: string, error: string }> }>}
 */
export async function recalculateRecipePricesForShop(
	_shopId,
	shopItems,
	guideItems,
	versionKey,
	updateShopItemFn = updateShopItem
) {
	const updated = []
	const errors = []
	const byMaterialId = guideItemsByMaterialId(guideItems)
	const version = versionKey || '1_21'

	const needRecalc = shopItems.filter(
		(si) => si.pricing_type === 'from_recipe' || si.buy_pricing_type === 'from_recipe' || si.sell_pricing_type === 'from_recipe'
	)
	if (needRecalc.length === 0) return { updated, errors }

	// In-memory prices by shop item id (we update as we go)
	const pricesByShopItemId = new Map()
	shopItems.forEach((si) => {
		pricesByShopItemId.set(si.id, { buy_price: si.buy_price, sell_price: si.sell_price })
	})

	const maxPasses = 20
	let pass = 0
	let anyChanged = true

	while (anyChanged && pass < maxPasses) {
		pass++
		anyChanged = false
		const seenErrorsThisPass = new Set()

		for (const shopItem of needRecalc) {
			const guideItem = (guideItems || []).find((g) => g.id === shopItem.item_id)
			if (!guideItem) {
				if (!seenErrorsThisPass.has(shopItem.item_id)) {
					errors.push({ item_id: shopItem.item_id, error: 'Item not found in guide' })
					seenErrorsThisPass.add(shopItem.item_id)
				}
				continue
			}

			const cur = pricesByShopItemId.get(shopItem.id) || {}
			const mergedItem = { ...shopItem, buy_price: cur.buy_price, sell_price: cur.sell_price }
			const byItemIdWithCurrent = {}
			shopItems.forEach((s) => {
				const p = pricesByShopItemId.get(s.id)
				byItemIdWithCurrent[s.item_id] = p ? { ...s, ...p } : s
			})

			const isFromRecipe =
				shopItem.pricing_type === 'from_recipe' ||
				shopItem.buy_pricing_type === 'from_recipe' ||
				shopItem.sell_pricing_type === 'from_recipe'
			const updates = {}

			if (isFromRecipe) {
				const buyResult = computeRecipePriceForShop(
					mergedItem,
					guideItem,
					byItemIdWithCurrent,
					byMaterialId,
					version,
					'buy'
				)
				const sellResult = computeRecipePriceForShop(
					mergedItem,
					guideItem,
					byItemIdWithCurrent,
					byMaterialId,
					version,
					'sell'
				)
				if (buyResult.error && !seenErrorsThisPass.has(shopItem.item_id)) {
					errors.push({ item_id: shopItem.item_id, name: guideItem.name, error: buyResult.error })
					seenErrorsThisPass.add(shopItem.item_id)
				}
				if (sellResult.error && !seenErrorsThisPass.has(shopItem.item_id)) {
					errors.push({ item_id: shopItem.item_id, name: guideItem.name, error: sellResult.error })
					seenErrorsThisPass.add(shopItem.item_id)
				}
				let newBuy = cur.buy_price
				let newSell = cur.sell_price
				if (buyResult.price != null) newBuy = roundPrice(buyResult.price)
				if (sellResult.price != null) newSell = roundPrice(sellResult.price)
				const buyChanged = buyResult.price != null && cur.buy_price !== newBuy
				const sellChanged = sellResult.price != null && cur.sell_price !== newSell
				if (buyChanged || sellChanged) {
					if (buyResult.price != null) updates.buy_price = newBuy
					if (sellResult.price != null) updates.sell_price = newSell
					pricesByShopItemId.set(shopItem.id, {
						buy_price: updates.buy_price !== undefined ? updates.buy_price : cur.buy_price,
						sell_price: updates.sell_price !== undefined ? updates.sell_price : cur.sell_price
					})
					anyChanged = true
				}
			}

			if (Object.keys(updates).length > 0) {
				try {
					await updateShopItemFn(shopItem.id, updates)
					updated.push({ id: shopItem.id, item_id: shopItem.item_id, ...updates })
				} catch (err) {
					errors.push({
						item_id: shopItem.item_id,
						name: guideItem.name,
						error: err.message || 'Failed to update'
					})
				}
			}
		}
	}

	return { updated, errors }
}

export { versionToKey }
