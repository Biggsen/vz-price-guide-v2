import yaml from 'js-yaml'

/**
 * True when parsed YAML looks like a VZ Price Guide export: top-level material keys
 * with unit_buy / unit_sell (and optional stack_*).
 * @param {unknown} data
 * @returns {boolean}
 */
export function isVzPriceGuideExportShape(data) {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return false
	for (const v of Object.values(data)) {
		if (
			v &&
			typeof v === 'object' &&
			!Array.isArray(v) &&
			('unit_buy' in v || 'unit_sell' in v)
		) {
			return true
		}
	}
	return false
}

/**
 * @param {unknown} raw
 * @returns {number|null}
 */
function normalizePriceField(raw) {
	if (raw == null || raw === '') return null
	const n = typeof raw === 'number' ? raw : parseFloat(raw)
	if (isNaN(n) || n <= 0) return null
	return n
}

/**
 * Parse VZ Price Guide YAML export (material_id keys with unit_buy, unit_sell, stack_*, etc.).
 * Uses per-unit buy/sell for shop prices. Values <= 0 or missing become null (disabled).
 * @param {string} yamlText
 * @returns {{ material: string, buy: number|null, sell: number|null }[]}
 */
export function parseVzPriceGuideYaml(yamlText) {
	const data = yaml.load(yamlText)
	if (!data || typeof data !== 'object' || Array.isArray(data)) return []

	const entries = []
	const seen = new Set()

	for (const [key, value] of Object.entries(data)) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) continue
		if (!('unit_buy' in value) && !('unit_sell' in value)) continue

		const material = String(key)
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '_')
		if (!material) continue

		const buy = normalizePriceField(value.unit_buy)
		const sell = normalizePriceField(value.unit_sell)
		const dedupeKey = `${material}:${buy}:${sell}`
		if (seen.has(dedupeKey)) continue
		seen.add(dedupeKey)
		entries.push({ material, buy, sell })
	}

	return entries
}
