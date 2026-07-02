import { buildStandardPriceGuideItemPayload } from './exportData.js'

/**
 * Build a VZ Price Guide–style export object from server shop rows (material_id keys).
 * Same per-item shape as the homepage standard export with metadata: name, category, stack,
 * unit_buy, unit_sell, stack_buy, stack_sell (price keys only when set on the shop row).
 * Rows with no buy/sell prices still include name, category, and stack.
 * Omits _export_metadata.
 *
 * @param {Array<{ item_id: string, buy_price: number|null, sell_price: number|null }>} shopItems
 * @param {Array<{ id: string, material_id?: string, name?: string, category?: string, stack?: number }>} guideItems
 * @returns {Record<string, Record<string, unknown>>}
 */
export function buildVzPriceGuideShopExportData(shopItems, guideItems) {
	const guideById = {}
	for (const g of guideItems || []) {
		if (g?.id) guideById[g.id] = g
	}

	const data = {}

	for (const si of shopItems || []) {
		const guide = guideById[si.item_id]
		const materialId = guide?.material_id
		if (!materialId) continue

		const entry = buildStandardPriceGuideItemPayload(guide, {
			unitBuy: si.buy_price,
			unitSell: si.sell_price,
			includeMetadata: true
		})

		data[materialId] = entry
	}

	return data
}
