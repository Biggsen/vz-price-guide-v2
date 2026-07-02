/**
 * Resolve duplicate guide rows that share a material_id (version snapshots, partial docs).
 * Prefer the document that has recipe data so pricing and imports stay consistent.
 */

/**
 * @param {string|undefined} material
 * @returns {string}
 */
export function normalizeMaterialIdKey(material) {
	if (!material || typeof material !== 'string') return ''
	return material.trim().toLowerCase().replace(/\s+/g, '_')
}

/**
 * @param {{ recipes_by_version?: Object } | null | undefined} guideItem
 * @returns {number}
 */
export function recipeVersionKeyCount(guideItem) {
	const r = guideItem?.recipes_by_version
	if (!r || typeof r !== 'object') return 0
	return Object.keys(r).length
}

/**
 * @param {object | undefined} existing
 * @param {object} candidate
 * @returns {object}
 */
export function pickBetterGuideForMaterial(existing, candidate) {
	if (!existing) return candidate
	if (!candidate) return existing
	const nCand = recipeVersionKeyCount(candidate)
	const nExist = recipeVersionKeyCount(existing)
	if (nCand > nExist) return candidate
	if (nExist > nCand) return existing
	const vCand = String(candidate.version || '')
	const vExist = String(existing.version || '')
	if (vCand !== vExist) return vCand > vExist ? candidate : existing
	return existing
}

/**
 * @param {Array<{ id?: string, material_id?: string, recipes_by_version?: Object, version?: string }>} availableItems
 * @param {{ id?: string, material_id?: string }} selectedItem
 * @returns {object}
 */
export function canonicalGuideItemForMaterial(availableItems, selectedItem) {
	if (!selectedItem) return selectedItem
	const mid = normalizeMaterialIdKey(selectedItem.material_id || '')
	if (!mid) return selectedItem
	let best = selectedItem
	for (const it of availableItems || []) {
		if (normalizeMaterialIdKey(it.material_id || '') !== mid) continue
		best = pickBetterGuideForMaterial(best, it)
	}
	return best
}

/**
 * material_id (normalized) -> best guide item for recipe lookups and circular checks.
 * @param {Array<{ material_id?: string, recipes_by_version?: Object, version?: string }>} availableItems
 * @returns {Record<string, object>}
 */
export function buildMergedGuideByMaterialId(availableItems) {
	const map = {}
	for (const item of availableItems || []) {
		if (!item.material_id) continue
		const key = normalizeMaterialIdKey(item.material_id)
		map[key] = pickBetterGuideForMaterial(map[key], item)
	}
	return map
}
