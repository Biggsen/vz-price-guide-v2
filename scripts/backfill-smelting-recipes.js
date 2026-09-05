// scripts/backfill-smelting-recipes.js
// Write canonical furnace recipes onto items. Does not change prices or pricing_type.
//
// Emulator:
//   npm run backfill:smelting:emu
//   npm run backfill:smelting:emu:dry
//
// Production (refuses without confirmation; always dry-run first):
//   npm run backfill:smelting:prod:dry
//   npm run backfill:smelting:prod
//
// SAFETY:
// - Emulator path never reads service-account.json
// - Prod path refuses if FIRESTORE_EMULATOR_HOST is set
// - Prod path requires ALLOW_PROD_WRITE=true and CONFIRM_PROD_WRITE=YES
// - DRY_RUN=true logs planned writes without committing

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

function isDryRun() {
	return boolEnv('DRY_RUN')
}

function usingEmulators() {
	const flag = readEnv('VITE_FIREBASE_EMULATORS').toLowerCase()
	return (
		!!process.env.FIRESTORE_EMULATOR_HOST ||
		!!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
		flag === '1' ||
		flag === 'true'
	)
}

function isProductionProject(projectId) {
	return ['vz-price-guide', 'vz-price-guide-prod'].includes(projectId)
}

function loadCatalog() {
	const catalogPath = path.resolve(__dirname, '../resource/smelting_recipes.json')
	if (!fs.existsSync(catalogPath)) {
		throw new Error(`Missing smelting catalog: ${catalogPath}`)
	}
	const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('smelting_recipes.json must be an object keyed by material_id')
	}
	return parsed
}

function normalizeRecipe(recipe) {
	if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
		throw new Error('Invalid recipe object in catalog')
	}
	const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
	if (ingredients.length === 0) {
		throw new Error('Catalog recipe is missing ingredients')
	}
	return {
		process: 'smelting',
		output_count: Number(recipe.output_count) > 0 ? Number(recipe.output_count) : 1,
		ingredients: ingredients.map((ingredient) => ({
			material_id: ingredient.material_id,
			quantity: Number(ingredient.quantity) > 0 ? Number(ingredient.quantity) : 1
		}))
	}
}

function existingProcess(storedRecipe) {
	if (!storedRecipe) return null
	if (Array.isArray(storedRecipe)) return 'crafting'
	if (storedRecipe.process === 'smelting' || storedRecipe.process === 'crafting') {
		return storedRecipe.process
	}
	return 'crafting'
}

function initializeAdmin(targetProd) {
	if (targetProd) {
		if (process.env.FIRESTORE_EMULATOR_HOST) {
			throw new Error(
				'FIRESTORE_EMULATOR_HOST is set. Unset it before running a prod backfill.'
			)
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

	if (!usingEmulators()) {
		throw new Error(
			'Refusing to run without emulators. Use npm run backfill:smelting:emu or set ALLOW_PROD_WRITE=true CONFIRM_PROD_WRITE=YES for production.'
		)
	}

	const projectId =
		process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-vz-price-guide'
	admin.initializeApp({ projectId })
	return projectId
}

function assertProdConfirmation(projectId) {
	const allowProdWrite = boolEnv('ALLOW_PROD_WRITE')
	const confirmProdWrite = readEnv('CONFIRM_PROD_WRITE').trim()

	if (!isProductionProject(projectId)) {
		throw new Error(
			`Project "${projectId}" is not an approved prod project for this backfill script.`
		)
	}

	if (!allowProdWrite || confirmProdWrite !== 'YES') {
		throw new Error(
			'Refusing to write prod without explicit confirmation. Set ALLOW_PROD_WRITE=true and CONFIRM_PROD_WRITE=YES. Prefer DRY_RUN=true first.'
		)
	}
}

async function commitBatches(db, ops) {
	if (isDryRun() || ops.length === 0) return

	const maxOps = 400
	for (let i = 0; i < ops.length; i += maxOps) {
		const slice = ops.slice(i, i + maxOps)
		const batch = db.batch()
		for (const op of slice) {
			batch.update(op.ref, op.data)
		}
		await batch.commit()
	}
}

async function main() {
	const catalog = loadCatalog()
	const dryRun = isDryRun()
	const targetProd = boolEnv('ALLOW_PROD_WRITE')
	const projectId = initializeAdmin(targetProd)
	const db = admin.firestore()

	console.log(`[smelting-backfill] Project ID: ${projectId}`)
	console.log(
		`[smelting-backfill] FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST || '(not set)'}`
	)
	console.log(`[smelting-backfill] Using emulators: ${usingEmulators()}`)
	console.log(`[smelting-backfill] DRY_RUN: ${dryRun}`)
	console.log(`[smelting-backfill] Catalog products: ${Object.keys(catalog).length}`)

	if (targetProd) {
		assertProdConfirmation(projectId)
		console.log('[smelting-backfill] Safety check passed: confirmed prod write')
	} else {
		console.log('[smelting-backfill] Safety check passed: emulator')
	}

	const snapshot = await db.collection('items').get()
	const itemsByMaterial = new Map()
	snapshot.docs.forEach((docSnap) => {
		const data = docSnap.data() || {}
		if (data.material_id) {
			itemsByMaterial.set(data.material_id, { id: docSnap.id, ref: docSnap.ref, data })
		}
	})

	const stats = {
		written: 0,
		updated: 0,
		skippedCrafting: 0,
		missingItems: 0,
		missingIngredients: 0
	}
	const ops = []
	const skipped = []
	const missing = []

	for (const [materialId, recipesByVersion] of Object.entries(catalog)) {
		const item = itemsByMaterial.get(materialId)
		if (!item) {
			stats.missingItems += 1
			missing.push(materialId)
			console.warn(`[smelting-backfill] Missing item: ${materialId}`)
			continue
		}

		for (const [versionKey, rawRecipe] of Object.entries(recipesByVersion)) {
			const recipe = normalizeRecipe(rawRecipe)
			const missingIngredient = recipe.ingredients.find(
				(ingredient) => !itemsByMaterial.has(ingredient.material_id)
			)
			if (missingIngredient) {
				stats.missingIngredients += 1
				console.warn(
					`[smelting-backfill] Skip ${materialId} ${versionKey}: missing ingredient ${missingIngredient.material_id}`
				)
				continue
			}

			const existing = item.data.recipes_by_version?.[versionKey]
			const process = existingProcess(existing)
			if (existing && process !== 'smelting') {
				stats.skippedCrafting += 1
				skipped.push(`${materialId}@${versionKey}`)
				console.log(
					`[smelting-backfill] Skip existing ${process} recipe: ${materialId} ${versionKey}`
				)
				continue
			}

			const action = existing ? 'update' : 'write'
			if (existing) stats.updated += 1
			else stats.written += 1

			console.log(`[smelting-backfill] ${dryRun ? 'DRY_RUN ' : ''}${action} ${materialId} ${versionKey}`)
			ops.push({
				ref: item.ref,
				data: {
					[`recipes_by_version.${versionKey}`]: recipe
				}
			})
		}
	}

	await commitBatches(db, ops)

	console.log('[smelting-backfill] Done')
	console.log(`[smelting-backfill] writes: ${stats.written}`)
	console.log(`[smelting-backfill] updates: ${stats.updated}`)
	console.log(`[smelting-backfill] skipped crafting: ${stats.skippedCrafting}`)
	console.log(`[smelting-backfill] missing items: ${stats.missingItems}`)
	console.log(`[smelting-backfill] missing ingredients: ${stats.missingIngredients}`)
	if (skipped.length) {
		console.log(`[smelting-backfill] skipped: ${skipped.join(', ')}`)
	}
	if (missing.length) {
		console.log(`[smelting-backfill] missing: ${missing.join(', ')}`)
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('[smelting-backfill] Failed:', error.message)
		process.exit(1)
	})
