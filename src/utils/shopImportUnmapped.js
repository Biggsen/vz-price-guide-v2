import { collection, query, where, getDocs } from 'firebase/firestore'
import { getMajorMinorVersion } from './serverProfile.js'

/**
 * Compare major.minor strings like "1.20" vs "1.21".
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareMajorMinorVersions(a, b) {
	const pa = String(a ?? '')
		.split('.')
		.map((x) => parseInt(x, 10) || 0)
	const pb = String(b ?? '')
		.split('.')
		.map((x) => parseInt(x, 10) || 0)
	const aM = pa[0] ?? 0
	const aN = pa[1] ?? 0
	const bM = pb[0] ?? 0
	const bN = pb[1] ?? 0
	if (aM !== bM) return aM - bM
	return aN - bN
}

function itemVersionMajorMinor(itemVersion) {
	return getMajorMinorVersion(itemVersion) || String(itemVersion ?? '')
}

/**
 * Classify YAML materials that did not match the version-filtered guide list.
 * @param {import('firebase/firestore').Firestore} db
 * @param {string[]} unmappedMaterialIds - normalized material ids (lowercase underscores)
 * @param {string|null|undefined} serverMajorMinor - e.g. "1.20"
 * @returns {Promise<{ newerThanServer: Array<{ material: string, itemVersion: string }>, notInDatabase: string[], otherUnmatched: string[] }>}
 */
export async function classifyUnmappedImportMaterials(db, unmappedMaterialIds, serverMajorMinor) {
	const newerThanServer = []
	const notInDatabase = []
	const otherUnmatched = []

	const uniq = [...new Set((unmappedMaterialIds || []).filter(Boolean))]
	if (uniq.length === 0) {
		return { newerThanServer, notInDatabase, otherUnmatched }
	}
	if (!serverMajorMinor) {
		return { newerThanServer, notInDatabase: uniq, otherUnmatched }
	}

	const foundByMaterial = new Map()
	const chunkSize = 30

	for (let i = 0; i < uniq.length; i += chunkSize) {
		const chunk = uniq.slice(i, i + chunkSize)
		const q = query(collection(db, 'items'), where('material_id', 'in', chunk))
		const snap = await getDocs(q)
		snap.forEach((docSnap) => {
			const d = docSnap.data()
			const mid = (d.material_id || '').toString().trim().toLowerCase().replace(/\s+/g, '_')
			if (!mid) return
			const v = itemVersionMajorMinor(d.version)
			const prev = foundByMaterial.get(mid)
			if (!prev || compareMajorMinorVersions(v, prev.version) > 0) {
				foundByMaterial.set(mid, { version: v })
			}
		})
	}

	for (const m of uniq) {
		const found = foundByMaterial.get(m)
		if (!found) {
			notInDatabase.push(m)
			continue
		}
		if (compareMajorMinorVersions(found.version, serverMajorMinor) > 0) {
			newerThanServer.push({ material: m, itemVersion: found.version })
		} else {
			otherUnmatched.push(m)
		}
	}

	return { newerThanServer, notInDatabase, otherUnmatched }
}
