import yaml from 'js-yaml'

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
			const key = `${material}:${buy}:${sell}`
			if (seen.has(key)) continue
			seen.add(key)
			entries.push({ material, buy: isNaN(buy) ? null : buy, sell: isNaN(sell) ? null : sell })
		}
	}
	return entries
}

/**
 * Map parsed EconomyShopGUI entries to guide items and classify for import.
 * @param {{ material: string, buy: number|null, sell: number|null }[]} entries
 * @param {Array<{ id: string, material_id?: string, name?: string }>} guideItems
 * @param {Set<string>|string[]} existingItemIds - item_ids already in the shop (skip)
 * @returns {{ toAdd: Array<{ item_id: string, buy_price: number|null, sell_price: number|null }>, unmapped: string[], skipped: number }}
 */
export function mapToGuideItems(entries, guideItems, existingItemIds) {
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
			sell_price: sell
		})
		existing.add(guide.id)
	}

	return { toAdd, unmapped, skipped }
}
