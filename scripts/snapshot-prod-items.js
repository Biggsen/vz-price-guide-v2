// scripts/snapshot-prod-items.js
// Read-only export of Firestore items collection for local seeding.
// Usage:
//   ALLOW_PROD_READ=true CONFIRM_PROD_READ=YES node scripts/snapshot-prod-items.js
// Optional:
//   SNAPSHOT_LIMIT=500 SNAPSHOT_OUT=seed/items-prod-snapshot.json node scripts/snapshot-prod-items.js

const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')

function readEnv(name, fallback = '') {
	return (process.env[name] || fallback).toString()
}

function boolEnv(name) {
	const value = readEnv(name).toLowerCase()
	return value === '1' || value === 'true' || value === 'yes'
}

function isProdProject(projectId) {
	return ['vz-price-guide', 'vz-price-guide-prod'].includes(projectId)
}

function normalizeItemDoc(doc) {
	const data = doc.data() || {}
	return {
		id: doc.id,
		...data
	}
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

function initializeAdmin() {
	// This script is intentionally for non-emulator snapshots.
	if (process.env.FIRESTORE_EMULATOR_HOST) {
		throw new Error('FIRESTORE_EMULATOR_HOST is set. Unset it before running prod snapshot.')
	}

	const serviceAccountPath = path.resolve(__dirname, '../service-account.json')
	if (!fs.existsSync(serviceAccountPath)) {
		throw new Error('Missing service-account.json at repository root.')
	}

	// eslint-disable-next-line import/no-dynamic-require, global-require
	const serviceAccount = require(serviceAccountPath)
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
		projectId: serviceAccount.project_id
	})
	return serviceAccount.project_id
}

async function main() {
	const allowProdRead = boolEnv('ALLOW_PROD_READ')
	const confirmProdRead = readEnv('CONFIRM_PROD_READ').trim()
	const outPath = path.resolve(
		__dirname,
		'..',
		readEnv('SNAPSHOT_OUT', 'seed/items-prod-snapshot.json')
	)
	const limit = parseLimit()

	const projectId = initializeAdmin()
	const db = admin.firestore()

	console.log(`[snapshot] Project ID: ${projectId}`)
	console.log(`[snapshot] Output: ${outPath}`)
	console.log(`[snapshot] Limit: ${limit === 0 ? 'all' : limit}`)

	if (!isProdProject(projectId)) {
		throw new Error(
			`Project "${projectId}" is not an approved prod project for this snapshot script.`
		)
	}

	if (!allowProdRead || confirmProdRead !== 'YES') {
		throw new Error(
			'Refusing to read prod without explicit confirmation. Set ALLOW_PROD_READ=true and CONFIRM_PROD_READ=YES.'
		)
	}

	const snap = await db.collection('items').get()
	const allItems = snap.docs.map(normalizeItemDoc).sort(compareItems)
	const items = limit > 0 ? allItems.slice(0, limit) : allItems

	const payload = {
		meta: {
			source_project_id: projectId,
			exported_at: new Date().toISOString(),
			total_items_in_source: allItems.length,
			exported_item_count: items.length,
			limit_applied: limit,
			schema_version: 1
		},
		items
	}

	ensureParentDir(outPath)
	fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
	console.log(`[snapshot] Wrote ${items.length} items to ${outPath}`)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('[snapshot] Failed:', error.message)
		process.exit(1)
	})
