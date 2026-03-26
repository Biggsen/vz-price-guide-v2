import yaml from 'js-yaml'
import { getRecipeForItem } from './serverShopRecipes.js'

/**
 * Normalize EconomyShopGUI material (e.g. CALCITE, ANDESITE_SLAB) to lowercase with underscores
 * to match guide item material_id / name.
 * @param {string} material
 * @returns {string}
 */
export function normalizeMaterialId(material) {
	if (!material || typeof material !== 'string') return ''
	return material.trim().toLowerCase().replace(/\s+/g, '_')
}

/**
 * Parse EconomyShopGUI shops YAML (e.g. Blocks.yml).
 * Expects structure: pages.page*.items.* with { material, buy, sell }.
 * @param {string} yamlText
 * @returns {{ material: string, buy: number, sell: number }[]}
 */
export function parseEconomyShopGuiYaml(yamlText) {
	const data = yaml.load(yamlText)
	if (!data || typeof data !== 'object' || !data.pages) return []

	const entries = []
	const seen = new Set()

	for (const pageKey of Object.keys(data.pages)) {
		const page = data.pages[pageKey]
		if (!page?.items || typeof page.items !== 'object') continue
		for (const slotKey of Object.keys(page.items)) {
			const item = page.items[slotKey]
			if (!item || typeof item.material !== 'string') continue
			const material = normalizeMaterialId(item.material)
			if (!material) continue
			const buy = typeof item.buy === 'number' ? item.buy : parseFloat(item.buy)
			const sell = typeof item.sell === 'number' ? item.sell : parseFloat(item.sell)
			// EconomyShopGUI uses -1 for "disabled" buy/sell; we store null for missing prices
			const buyNorm = isNaN(buy) ? null : buy < 0 ? null : buy
			const sellNorm = isNaN(sell) ? null : sell < 0 ? null : sell
			const key = `${material}:${buyNorm}:${sellNorm}`
			if (seen.has(key)) continue
			seen.add(key)
			entries.push({ material, buy: buyNorm, sell: sellNorm })
		}
	}
	return entries
}

/**
 * Map parsed EconomyShopGUI entries to guide items and classify for import.
 * @param {{ material: string, buy: number|null, sell: number|null }[]} entries
 * @param {Array<{ id: string, material_id?: string, name?: string, recipes_by_version?: Object }>} guideItems
 * @param {Set<string>|string[]} existingItemIds - item_ids already in the shop (skip)
 * @param {string} [serverVersionKey] - version key like "1_20"
 * @returns {{ toAdd: Array<{ item_id: string, buy_price: number|null, sell_price: number|null, pricing_type: 'manual' | 'base' }>, unmapped: string[], skipped: number }}
 */
export function mapToGuideItems(entries, guideItems, existingItemIds, serverVersionKey) {
	const existing = new Set(existingItemIds || [])
	const byMaterial = {}
	;(guideItems || []).forEach((item) => {
		const raw = (item.material_id || item.name || '').toString().trim()
		const mid = raw.toLowerCase().replace(/\s+/g, '_')
		if (mid && !byMaterial[mid]) byMaterial[mid] = item
	})

	const toAdd = []
	const unmapped = []
	let skipped = 0

	function hasRecipeForVersion(guideItem) {
		const recipes = guideItem?.recipes_by_version
		if (!recipes || typeof recipes !== 'object') return false
		if (!serverVersionKey) return Object.keys(recipes).length > 0
		return getRecipeForItem(guideItem, serverVersionKey) !== null
	}

	for (const { material, buy, sell } of entries) {
		const guide = byMaterial[material]
		if (!guide) {
			if (!unmapped.includes(material)) unmapped.push(material)
			continue
		}
		if (existing.has(guide.id)) {
			skipped += 1
			continue
		}
		toAdd.push({
			item_id: guide.id,
			buy_price: buy,
			sell_price: sell,
			pricing_type: hasRecipeForVersion(guide) ? 'manual' : 'base'
		})
		existing.add(guide.id)
	}

	return { toAdd, unmapped, skipped }
}
