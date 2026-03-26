import yaml from 'js-yaml'
import { bukkitEnchantmentToVanillaKey } from './bukkitToVanillaEnchantment.js'
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
 * Parse `enchantments` from an EconomyShopGUI item (strings like "DIG_SPEED:5", objects, or maps).
 * @param {unknown} raw
 * @returns {Array<{ kind: 'normal', name: string, level: number } | { kind: 'custom', raw: string }>}
 */
function flattenEnchantmentsFromYaml(raw) {
	const out = []
	if (raw == null) return out

	if (Array.isArray(raw)) {
		for (const el of raw) {
			if (typeof el === 'string') {
				const p = parseEnchantmentColonString(el)
				if (p) out.push(p)
			} else if (el && typeof el === 'object' && !Array.isArray(el)) {
				for (const [k, v] of Object.entries(el)) {
					const level = typeof v === 'number' ? v : parseFloat(v)
					out.push({
						kind: 'normal',
						name: k,
						level: Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
					})
				}
			}
		}
		return out
	}

	if (typeof raw === 'object') {
		for (const [k, v] of Object.entries(raw)) {
			const level = typeof v === 'number' ? v : parseFloat(v)
			out.push({
				kind: 'normal',
				name: k,
				level: Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1
			})
		}
	}
	return out
}

/**
 * @param {string} s
 * @returns {{ kind: 'normal', name: string, level: number } | { kind: 'custom', raw: string } | null}
 */
function parseEnchantmentColonString(s) {
	const str = String(s).trim()
	const parts = str.split(':').map((p) => p.trim()).filter(Boolean)
	if (parts.length < 2) return null
	if (parts.length === 2) {
		const level = parseInt(parts[1], 10)
		return {
			kind: 'normal',
			name: parts[0],
			level: Number.isFinite(level) ? Math.max(1, level) : 1
		}
	}
	if (parts.length === 3 && parts[0].toLowerCase() === 'minecraft') {
		const level = parseInt(parts[2], 10)
		return {
			kind: 'normal',
			name: parts[1],
			level: Number.isFinite(level) ? Math.max(1, level) : 1
		}
	}
	// plugin:enchant:level — not mapped to guide item ids
	return { kind: 'custom', raw: str }
}

/**
 * Build guide `material_id` lookup key for one YAML shop row (handles enchanted books).
 * @param {{ material: string, enchantments?: unknown }} item
 * @returns {string}
 */
export function buildImportMaterialLookupKey(item) {
	const base = normalizeMaterialId(item.material)
	if (base !== 'enchanted_book') return base

	const flat = flattenEnchantmentsFromYaml(item.enchantments)
	if (flat.length === 0) {
		return 'enchanted_book (missing enchantment data in YAML)'
	}

	const first = flat[0]
	if (first.kind === 'custom') {
		return `enchanted_book (custom enchant: ${first.raw})`
	}

	const vanilla = bukkitEnchantmentToVanillaKey(first.name)
	if (!vanilla) {
		return 'enchanted_book (missing enchantment data in YAML)'
	}

	const level = Math.max(1, Math.floor(Number(first.level) || 1))
	return `enchanted_book_${vanilla}_${level}`
}

/**
 * Parse EconomyShopGUI shops YAML (e.g. Blocks.yml).
 * Expects structure: pages.page*.items.* with { material, buy, sell }.
 * Enchanted books: uses `enchantments` to build guide material_id (e.g. enchanted_book_aqua_affinity_1).
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
			const material = buildImportMaterialLookupKey(item)
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
 * Guide items with no usable category must not be imported (shop UI groups by category).
 * @param {string|null|undefined} category
 * @returns {boolean}
 */
export function isImportableGuideCategory(category) {
	if (category == null) return false
	const s = String(category).trim()
	if (!s) return false
	if (s.toLowerCase() === 'uncategorized') return false
	return true
}

/**
 * Map parsed EconomyShopGUI entries to guide items and classify for import.
 * @param {{ material: string, buy: number|null, sell: number|null }[]} entries
 * @param {Array<{ id: string, material_id?: string, name?: string, category?: string, recipes_by_version?: Object }>} guideItems
 * @param {Set<string>|string[]} existingItemIds - item_ids already in the shop (skip)
 * @param {string} [serverVersionKey] - version key like "1_20"
 * @returns {{ toAdd: Array<{ item_id: string, buy_price: number|null, sell_price: number|null, pricing_type: 'manual' | 'base' }>, unmapped: string[], unmappedMissingCategory: string[], skipped: number }}
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
	const unmappedMissingCategory = []
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
		if (!isImportableGuideCategory(guide.category)) {
			if (!unmappedMissingCategory.includes(material)) unmappedMissingCategory.push(material)
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

	return { toAdd, unmapped, unmappedMissingCategory, skipped }
}
