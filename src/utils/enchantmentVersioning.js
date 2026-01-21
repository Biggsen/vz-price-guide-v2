function parseVersionKey(versionKey) {
	if (!versionKey) return null
	const match = versionKey.match(/^(\d+)_(\d+)$/)
	if (!match) return null
	return { major: Number(match[1]), minor: Number(match[2]) }
}

function compareVersionKeys(a, b) {
	const pa = parseVersionKey(a)
	const pb = parseVersionKey(b)
	if (!pa || !pb) return 0
	if (pa.major !== pb.major) return pa.major - pb.major
	return pa.minor - pb.minor
}

export function normalizeMinecraftVersionKey(version) {
	if (!version) return null
	return version.toString().trim().replace('.', '_')
}

const ENCHANTMENT_DEF_MODULES = import.meta.glob('../../resource/enchantments_*.json', { eager: true })

function getResourceEnchantmentVersionKeys() {
	return Object.keys(ENCHANTMENT_DEF_MODULES)
		.map((filePath) => {
			const match = filePath.match(/enchantments_(\d+_\d+)\.json$/)
			return match ? match[1] : null
		})
		.filter(Boolean)
		.sort(compareVersionKeys)
}

export function getNearestPreviousEnchantmentVersionKey(versionKey) {
	const keys = getResourceEnchantmentVersionKeys()
	if (!keys.length) return null
	if (!versionKey) return keys[keys.length - 1]

	const sorted = [...keys].sort(compareVersionKeys)
	const candidates = sorted.filter((k) => compareVersionKeys(k, versionKey) <= 0)
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

