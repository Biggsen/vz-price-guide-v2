// scripts/cleanOrphanedShopData.js
// Cleans up orphaned shop data from Firestore
// Usage:
//   - Dry run (preview only): Set DRY_RUN = true below, then run: node scripts/cleanOrphanedShopData.js
//   - Actually delete: Set DRY_RUN = false below, then run: node scripts/cleanOrphanedShopData.js
//
// SAFETY MEASURES:
// - Set DRY_RUN to true to preview changes without deleting
// - Shows detailed report before any deletions

const admin = require('firebase-admin')
const path = require('path')

// Set to true for dry run (preview only), false to actually delete orphaned data
const DRY_RUN = false

function usingEmulators() {
	const flag = (process.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase()
	return (
		!!process.env.FIRESTORE_EMULATOR_HOST ||
		!!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
		flag === '1' ||
		flag === 'true'
	)
}

function isDryRun() {
	return DRY_RUN
}

function initializeAdminApp() {
	if (usingEmulators()) {
		const projectId =
			process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-vz-price-guide'
		admin.initializeApp({ projectId })
		return
	}

	try {
		const serviceAccountPath = path.resolve(__dirname, '../service-account.json')
		const serviceAccount = require(serviceAccountPath)
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
			projectId: serviceAccount.project_id
		})
	} catch (error) {
		const projectId =
			process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-vz-price-guide'
		admin.initializeApp({ projectId })
	}
}

async function cleanOrphanedShopData() {
	console.log('🧹 Cleaning Orphaned Shop Data...')
	console.log('='.repeat(60))
	console.log('')
	console.log(`Mode: ${isDryRun() ? '🔍 DRY RUN (preview only)' : '⚠️  LIVE (will delete)'}`)
	console.log(`Using emulators: ${usingEmulators()}`)
	console.log('')

	const db = admin.firestore()
	const stats = {
		orphanedShopItems: [],
		orphanedShops: [],
		checkedShopItems: 0,
		checkedShops: 0,
		validShopIds: new Set(),
		validItemIds: new Set(),
		validServerIds: new Set(),
		validUserIds: new Set()
	}

	// Step 1: Load all valid reference IDs
	console.log('📋 Step 1: Loading valid reference IDs...')

	const shopsSnapshot = await db.collection('shops').get()
	shopsSnapshot.docs.forEach((doc) => {
		stats.validShopIds.add(doc.id)
		const data = doc.data()
		if (data.server_id) {
			stats.validServerIds.add(data.server_id)
		}
		if (data.owner_id) {
			stats.validUserIds.add(data.owner_id)
		}
	})
	console.log(`  ✓ Found ${stats.validShopIds.size} shops`)
	console.log(`  ✓ Found ${stats.validServerIds.size} unique server references`)
	console.log(`  ✓ Found ${stats.validUserIds.size} unique user references`)

	const itemsSnapshot = await db.collection('items').get()
	itemsSnapshot.docs.forEach((doc) => {
		stats.validItemIds.add(doc.id)
	})
	console.log(`  ✓ Found ${stats.validItemIds.size} items`)
	console.log('')

	// Step 2: Check servers collection for valid server IDs
	console.log('📋 Step 2: Validating server references...')
	const serversSnapshot = await db.collection('servers').get()
	const actualServerIds = new Set()
	serversSnapshot.docs.forEach((doc) => {
		actualServerIds.add(doc.id)
		if (doc.data().owner_id) {
			stats.validUserIds.add(doc.data().owner_id)
		}
	})

	// Find shops referencing non-existent servers
	for (const shopId of stats.validShopIds) {
		const shopDoc = await db.collection('shops').doc(shopId).get()
		if (shopDoc.exists) {
			const shopData = shopDoc.data()
			if (shopData.server_id && !actualServerIds.has(shopData.server_id)) {
				stats.orphanedShops.push({
					id: shopId,
					name: shopData.name || 'Unknown',
					issue: `Invalid server_id: ${shopData.server_id}`,
					type: 'invalid_server_id'
				})
			}
		}
	}
	console.log(`  ✓ Found ${actualServerIds.size} actual servers`)
	console.log(
		`  ⚠️  Found ${
			stats.orphanedShops.filter((s) => s.type === 'invalid_server_id').length
		} shops with invalid server_id`
	)
	console.log('')

	// Step 3: Check users collection for valid user IDs
	console.log('📋 Step 3: Validating user references...')
	const usersSnapshot = await db.collection('users').get()
	const actualUserIds = new Set()
	usersSnapshot.docs.forEach((doc) => {
		actualUserIds.add(doc.id)
	})

	// Find shops referencing non-existent users
	for (const shopId of stats.validShopIds) {
		const shopDoc = await db.collection('shops').doc(shopId).get()
		if (shopDoc.exists) {
			const shopData = shopDoc.data()
			if (shopData.owner_id && !actualUserIds.has(shopData.owner_id)) {
				stats.orphanedShops.push({
					id: shopId,
					name: shopData.name || 'Unknown',
					issue: `Invalid owner_id: ${shopData.owner_id}`,
					type: 'invalid_owner_id'
				})
			}
		}
	}
	console.log(`  ✓ Found ${actualUserIds.size} actual users`)
	console.log(
		`  ⚠️  Found ${
			stats.orphanedShops.filter((s) => s.type === 'invalid_owner_id').length
		} shops with invalid owner_id`
	)
	console.log('')

	// Step 4: Check shop_items for orphaned references
	console.log('📋 Step 4: Checking shop_items for orphaned references...')
	const shopItemsSnapshot = await db.collection('shop_items').get()

	for (const doc of shopItemsSnapshot.docs) {
		stats.checkedShopItems++
		const shopItem = doc.data()
		const issues = []

		// Check shop_id reference
		if (!shopItem.shop_id) {
			issues.push('Missing shop_id field')
		} else if (!stats.validShopIds.has(shopItem.shop_id)) {
			issues.push(`Invalid shop_id: ${shopItem.shop_id}`)
		}

		// Check item_id reference
		if (!shopItem.item_id) {
			issues.push('Missing item_id field')
		} else if (!stats.validItemIds.has(shopItem.item_id)) {
			issues.push(`Invalid item_id: ${shopItem.item_id}`)
		}

		if (issues.length > 0) {
			stats.orphanedShopItems.push({
				id: doc.id,
				shop_id: shopItem.shop_id || 'MISSING',
				item_id: shopItem.item_id || 'MISSING',
				issues: issues
			})
		}
	}
	console.log(`  ✓ Checked ${stats.checkedShopItems} shop_items`)
	console.log(`  ⚠️  Found ${stats.orphanedShopItems.length} orphaned shop_items`)
	console.log('')

	// Step 5: Check shops for orphaned references
	console.log('📋 Step 5: Checking shops for orphaned references...')
	for (const doc of shopsSnapshot.docs) {
		stats.checkedShops++
		const shop = doc.data()
		const issues = []

		// Check server_id reference
		if (!shop.server_id) {
			issues.push('Missing server_id field')
		} else if (!actualServerIds.has(shop.server_id)) {
			issues.push(`Invalid server_id: ${shop.server_id}`)
		}

		// Check owner_id reference
		if (!shop.owner_id) {
			issues.push('Missing owner_id field')
		} else if (!actualUserIds.has(shop.owner_id)) {
			issues.push(`Invalid owner_id: ${shop.owner_id}`)
		}

		if (issues.length > 0) {
			// Avoid duplicates (already added in steps 2-3)
			const existing = stats.orphanedShops.find((s) => s.id === doc.id)
			if (!existing) {
				stats.orphanedShops.push({
					id: doc.id,
					name: shop.name || 'Unknown',
					issue: issues.join(', '),
					type: 'multiple_issues'
				})
			}
		}
	}
	console.log(`  ✓ Checked ${stats.checkedShops} shops`)
	console.log(`  ⚠️  Found ${stats.orphanedShops.length} orphaned shops`)
	console.log('')

	// Step 6: Generate report
	console.log('📊 ORPHANED DATA REPORT')
	console.log('='.repeat(60))
	console.log('')

	if (stats.orphanedShopItems.length > 0) {
		console.log(`❌ ORPHANED SHOP ITEMS (${stats.orphanedShopItems.length})`)
		console.log('-'.repeat(40))
		stats.orphanedShopItems.slice(0, 20).forEach((item, index) => {
			console.log(`${index + 1}. ID: ${item.id}`)
			console.log(`   shop_id: ${item.shop_id}`)
			console.log(`   item_id: ${item.item_id}`)
			console.log(`   Issues: ${item.issues.join(', ')}`)
			console.log('')
		})
		if (stats.orphanedShopItems.length > 20) {
			console.log(`... and ${stats.orphanedShopItems.length - 20} more`)
			console.log('')
		}
	} else {
		console.log('✅ No orphaned shop_items found')
		console.log('')
	}

	if (stats.orphanedShops.length > 0) {
		console.log(`❌ ORPHANED SHOPS (${stats.orphanedShops.length})`)
		console.log('-'.repeat(40))
		stats.orphanedShops.slice(0, 20).forEach((shop, index) => {
			console.log(`${index + 1}. "${shop.name}" (ID: ${shop.id})`)
			console.log(`   Issue: ${shop.issue}`)
			console.log('')
		})
		if (stats.orphanedShops.length > 20) {
			console.log(`... and ${stats.orphanedShops.length - 20} more`)
			console.log('')
		}
	} else {
		console.log('✅ No orphaned shops found')
		console.log('')
	}

	// Step 7: Delete orphaned data (if not dry run)
	const totalOrphaned = stats.orphanedShopItems.length + stats.orphanedShops.length

	if (totalOrphaned === 0) {
		console.log('🎉 No orphaned data found! Database is clean.')
		return
	}

	if (isDryRun()) {
		console.log('🔍 DRY RUN: No data was deleted')
		console.log(`   Would delete ${stats.orphanedShopItems.length} shop_items`)
		console.log(`   Would delete ${stats.orphanedShops.length} shops`)
		console.log('')
		console.log('   Set DRY_RUN = false in the script to actually delete these records')
		return
	}

	console.log('🗑️  DELETING ORPHANED DATA...')
	console.log('-'.repeat(40))

	// Delete orphaned shop_items first (they reference shops)
	let deletedShopItems = 0
	for (const item of stats.orphanedShopItems) {
		try {
			await db.collection('shop_items').doc(item.id).delete()
			deletedShopItems++
			if (deletedShopItems % 10 === 0) {
				console.log(
					`  Deleted ${deletedShopItems}/${stats.orphanedShopItems.length} shop_items...`
				)
			}
		} catch (error) {
			console.error(`  ❌ Error deleting shop_item ${item.id}:`, error.message)
		}
	}
	console.log(`  ✓ Deleted ${deletedShopItems} orphaned shop_items`)

	// Delete orphaned shops
	let deletedShops = 0
	for (const shop of stats.orphanedShops) {
		try {
			await db.collection('shops').doc(shop.id).delete()
			deletedShops++
			if (deletedShops % 10 === 0) {
				console.log(`  Deleted ${deletedShops}/${stats.orphanedShops.length} shops...`)
			}
		} catch (error) {
			console.error(`  ❌ Error deleting shop ${shop.id}:`, error.message)
		}
	}
	console.log(`  ✓ Deleted ${deletedShops} orphaned shops`)
	console.log('')

	console.log('✅ Cleanup completed!')
	console.log(`   Deleted ${deletedShopItems} shop_items`)
	console.log(`   Deleted ${deletedShops} shops`)
}

// Initialize and run
initializeAdminApp()

cleanOrphanedShopData()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error('❌ Cleanup failed:', error)
		process.exit(1)
	})
