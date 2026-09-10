// scripts/snapshot-emulator-items.js
// Export emulator items collection for local seeding (same { meta, items } shape as prod snapshot).
// Usage:
//   npm run snapshot:items:emu
// Optional:
//   SNAPSHOT_OUT=seed/items-prod-Full.json SNAPSHOT_LIMIT=0 node scripts/snapshot-emulator-items.js
//
// SAFETY: Refuses to run unless FIRESTORE_EMULATOR_HOST is set. Does not read prod.

const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')

function readEnv(name, fallback = '') {
	return (process.env[name] || fallback).toString()
}

function compareItems(a, b) {
	const aKey = (a.material_id || a.name || a.id || '').toString()
	const bKey = (b.material_id || b.name || b.id || '').toString()
	return aKey.localeCompare(bKey)
}

function ensureParentDir(filePath) {
	const parent = path.dirname(filePath)
	if (!fs.existsSync(parent)) {
		fs.mkdirSync(parent, { recursive: true })
	}
}

function parseLimit() {
	const raw = readEnv('SNAPSHOT_LIMIT', '').trim()
	if (!raw) return 0
	const parsed = Number(raw)
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`Invalid SNAPSHOT_LIMIT: "${raw}". Use 0 or a positive integer.`)
	}
	return Math.floor(parsed)
}

function serializeValue(value) {
	if (value == null) return value
	if (typeof value.toDate === 'function') {
		return value.toDate().toISOString()
	}
	if (Array.isArray(value)) {
		return value.map(serializeValue)
	}
	if (typeof value === 'object') {
		const out = {}
		for (const [key, nested] of Object.entries(value)) {
			out[key] = serializeValue(nested)
		}
		return out
	}
	return value
}

function initializeAdmin() {
	if (!process.env.FIRESTORE_EMULATOR_HOST) {
		throw new Error(
			'FIRESTORE_EMULATOR_HOST is not set. This script only snapshots the emulator. Use snapshot:items:prod for production.'
		)
	}

	const projectId =
		process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-vz-price-guide'
	admin.initializeApp({ projectId })
	return projectId
}

async function main() {
	const outPath = path.resolve(
		__dirname,
		'..',
		readEnv('SNAPSHOT_OUT', 'seed/items-prod-Full.json')
	)
	const limit = parseLimit()
	const projectId = initializeAdmin()
	const db = admin.firestore()

	console.log(`[snapshot-emu] Project ID: ${projectId}`)
	console.log(`[snapshot-emu] FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST}`)
	console.log(`[snapshot-emu] Output: ${outPath}`)
	console.log(`[snapshot-emu] Limit: ${limit === 0 ? 'all' : limit}`)

	const snap = await db.collection('items').get()
	const allItems = snap.docs
		.map((docSnap) => serializeValue({ id: docSnap.id, ...(docSnap.data() || {}) }))
		.sort(compareItems)
	const items = limit > 0 ? allItems.slice(0, limit) : allItems

	const payload = {
		meta: {
			source_project_id: projectId,
			exported_at: new Date().toISOString(),
			total_items_in_source: allItems.length,
			exported_item_count: items.length,
			limit_applied: limit,
			schema_version: 1,
			source: 'emulator'
		},
		items
	}

	ensureParentDir(outPath)
	fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
	console.log(`[snapshot-emu] Wrote ${items.length} items to ${outPath}`)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('[snapshot-emu] Failed:', error.message)
		process.exit(1)
	})
