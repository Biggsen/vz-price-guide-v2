import { compareVersions, versionToKey } from '../constants/minecraftVersions.js'

export function normalizeMinecraftVersionKey(version) {
	return versionToKey(version)
}

const ENCHANTMENT_DEF_MODULES = import.meta.glob('../../resource/enchantments_*.json', { eager: true })

function getResourceEnchantmentVersionKeys() {
	return Object.keys(ENCHANTMENT_DEF_MODULES)
		.map((filePath) => {
			const match = filePath.match(/enchantments_(\d+_\d+)\.json$/)
			return match ? match[1] : null
		})
		.filter(Boolean)
		.sort((a, b) => compareVersions(a, b))
}

export function getNearestPreviousEnchantmentVersionKey(versionKey) {
	const keys = getResourceEnchantmentVersionKeys()
	if (!keys.length) return null
	if (!versionKey) return keys[keys.length - 1]

	const sorted = [...keys].sort((a, b) => compareVersions(a, b))
	const candidates = sorted.filter((k) => compareVersions(k, versionKey) <= 0)
	if (candidates.length) return candidates[candidates.length - 1]
	return sorted[0]
}

export function getEnchantmentDefsForVersion(versionOrVersionKey) {
	const versionKey = normalizeMinecraftVersionKey(versionOrVersionKey)
	const resolvedKey = getNearestPreviousEnchantmentVersionKey(versionKey)
	if (!resolvedKey) return { versionKey: null, defs: [] }

	const filePath = Object.keys(ENCHANTMENT_DEF_MODULES).find((p) =>
		p.endsWith(`enchantments_${resolvedKey}.json`)
	)

	const defs = filePath ? ENCHANTMENT_DEF_MODULES[filePath]?.default || [] : []
	return { versionKey: resolvedKey, defs: Array.isArray(defs) ? defs : [] }
}

export function parseEnchantedBookMaterialId(materialId) {
	if (!materialId || !materialId.startsWith('enchanted_book_')) return null
	const enchantmentPart = materialId.replace('enchanted_book_', '')
	const match = enchantmentPart.match(/^(.+)_(\d+)$/)
	if (!match) return null
	return { name: match[1], level: Number(match[2]) }
}

export function extractEnchantmentsFromMaterialId(materialId) {
	if (!materialId || !materialId.startsWith('enchanted_book_')) return []

	const parsed = parseEnchantedBookMaterialId(materialId)
	if (parsed) {
		return [{ id: parsed.name, level: parsed.level }]
	}

	// Some sources may omit the level suffix. Assume level 1.
	const enchantmentPart = materialId.replace('enchanted_book_', '')
	if (enchantmentPart) {
		return [{ id: enchantmentPart, level: 1 }]
	}

	return []
}

function inferDbEnchantmentName(resourceName, availableNamesSet) {
	if (!resourceName) return null

	if (availableNamesSet.has(resourceName)) return resourceName

	// Prismarine uses binding_curse / vanishing_curse, while our DB uses curse_of_binding / curse_of_vanishing
	if (resourceName.endsWith('_curse')) {
		const base = resourceName.replace(/_curse$/, '')
		const alias = `curse_of_${base}`
		if (availableNamesSet.has(alias)) return alias
	}

	// Prismarine uses sweeping_edge, while our DB uses sweeping
	if (resourceName === 'sweeping_edge' && availableNamesSet.has('sweeping')) return 'sweeping'

	return null
}

export function buildAllowedEnchantmentMaxLevels(defs, availableEnchantmentItems = []) {
	const availableNames = new Set(
		availableEnchantmentItems
			.map((item) => parseEnchantedBookMaterialId(item?.material_id)?.name)
			.filter(Boolean)
	)

	const map = new Map()
	for (const def of defs || []) {
		const dbName = inferDbEnchantmentName(def?.name, availableNames)
		if (!dbName) continue
		const maxLevel = Number(def?.maxLevel)
		if (!Number.isFinite(maxLevel) || maxLevel < 1) continue
		map.set(dbName, maxLevel)
	}

	return map
}

export function isEnchantmentItemAllowedForVersion(enchantmentItem, allowedMaxLevels) {
	const parsed = parseEnchantedBookMaterialId(enchantmentItem?.material_id)
	if (!parsed) return false
	const maxLevel = allowedMaxLevels?.get(parsed.name)
	if (!maxLevel) return false
	return parsed.level >= 1 && parsed.level <= maxLevel
}

export function sortEnchantmentMaterialIdsForExport(materialIds = []) {
	const parsed = materialIds
		.map((materialId) => {
			const p = parseEnchantedBookMaterialId(materialId)
			return {
				materialId,
				name: p?.name || '',
				level: p?.level || 0
			}
		})
		.sort((a, b) => {
			if (a.name !== b.name) return a.name.localeCompare(b.name)
			return a.level - b.level
		})

	return parsed.map((p) => p.materialId)
}

