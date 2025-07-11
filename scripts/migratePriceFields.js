const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin
const serviceAccount = require(path.resolve('./service-account.json'))
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// DRY RUN mode: set to true to only log what would be updated, false to actually migrate
const DRY_RUN = true

// Migration settings
const MIGRATION_SETTINGS = {
	// Default version to use when migrating legacy prices (ground zero)
	DEFAULT_VERSION: '1_16',

	// Batch size for processing items
	BATCH_SIZE: 100,

	// Price rounding (round up to whole numbers per project preference)
	ROUND_UP_PRICES: true,

	// Preserve legacy price field during migration (recommended for rollback)
	PRESERVE_LEGACY_FIELD: true,

	// Skip items with existing prices_by_version data
	SKIP_EXISTING_PRICES_BY_VERSION: true
}

// Utility functions
function roundUpPrice(price) {
	if (MIGRATION_SETTINGS.ROUND_UP_PRICES) {
		return Math.ceil(price)
	}
	return price
}

function createVersionedPrice(price, version = MIGRATION_SETTINGS.DEFAULT_VERSION) {
	return {
		[version]: roundUpPrice(price)
	}
}

function validateMigrationData(item, newPricesByVersion) {
	// Basic validation - allow zero prices for creative items
	if (item.price === undefined || item.price === null || item.price < 0) {
		return { valid: false, reason: 'Invalid legacy price (must be >= 0)' }
	}

	if (!newPricesByVersion || typeof newPricesByVersion !== 'object') {
		return { valid: false, reason: 'Invalid prices_by_version structure' }
	}

	// Check for data consistency - allow zero prices
	const versionPrice = newPricesByVersion[MIGRATION_SETTINGS.DEFAULT_VERSION]
	if (
		versionPrice === undefined ||
		versionPrice === null ||
		typeof versionPrice !== 'number' ||
		versionPrice < 0
	) {
		return { valid: false, reason: 'Invalid version price value (must be >= 0)' }
	}

	return { valid: true }
}

async function migratePriceFields() {
	console.log('🚀 Starting Price Field Migration...')
	console.log('='.repeat(60))
	console.log(`DRY RUN mode: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`)
	console.log(`Default version: ${MIGRATION_SETTINGS.DEFAULT_VERSION}`)
	console.log(`Batch size: ${MIGRATION_SETTINGS.BATCH_SIZE}`)
	console.log(`Round up prices: ${MIGRATION_SETTINGS.ROUND_UP_PRICES}`)
	console.log(`Preserve legacy field: ${MIGRATION_SETTINGS.PRESERVE_LEGACY_FIELD}`)
	console.log('')

	// Initialize counters
	const stats = {
		totalItems: 0,
		skippedItems: 0,
		migratedItems: 0,
		errorItems: 0,
		warnings: []
	}

	// Get all items
	console.log('📦 Fetching items for migration...')
	const itemsSnapshot = await db.collection('items').get()
	const allItems = itemsSnapshot.docs

	console.log(`Found ${allItems.length} items`)
	console.log('')

	// Process items in batches
	const batches = []
	for (let i = 0; i < allItems.length; i += MIGRATION_SETTINGS.BATCH_SIZE) {
		batches.push(allItems.slice(i, i + MIGRATION_SETTINGS.BATCH_SIZE))
	}

	console.log(`Processing ${batches.length} batches...`)
	console.log('')

	for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
		const batch = batches[batchIndex]
		console.log(
			`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`
		)

		for (const doc of batch) {
			const item = doc.data()
			stats.totalItems++

			try {
				// Check if item needs migration
				const hasPrice = item.price !== undefined && item.price !== null
				const hasPricesByVersion =
					item.prices_by_version && typeof item.prices_by_version === 'object'

				// Skip if no legacy price
				if (!hasPrice) {
					stats.skippedItems++
					continue
				}

				// Skip if already has prices_by_version and setting is enabled
				if (hasPricesByVersion && MIGRATION_SETTINGS.SKIP_EXISTING_PRICES_BY_VERSION) {
					stats.skippedItems++
					stats.warnings.push({
						id: doc.id,
						name: item.name,
						warning: 'Has both price and prices_by_version - skipped'
					})
					continue
				}

				// Create new prices_by_version structure
				const newPricesByVersion = hasPricesByVersion
					? { ...item.prices_by_version, ...createVersionedPrice(item.price) }
					: createVersionedPrice(item.price)

				// Validate migration data
				const validation = validateMigrationData(item, newPricesByVersion)
				if (!validation.valid) {
					stats.errorItems++
					stats.warnings.push({
						id: doc.id,
						name: item.name,
						warning: `Validation failed: ${validation.reason}`
					})
					continue
				}

				// Prepare update data
				const updateData = {
					prices_by_version: newPricesByVersion,
					pricing_type: 'static' // Default to static pricing
				}

				// Remove legacy price field if not preserving
				if (!MIGRATION_SETTINGS.PRESERVE_LEGACY_FIELD) {
					updateData.price = admin.firestore.FieldValue.delete()
				}

				// Perform migration
				if (!DRY_RUN) {
					await db.collection('items').doc(doc.id).update(updateData)
				}

				stats.migratedItems++
				console.log(
					`   ✅ ${DRY_RUN ? '[DRY RUN] Would migrate' : 'Migrated'} "${item.name}" (${
						item.material_id
					})`
				)
				console.log(
					`      Legacy price: ${item.price} → Versioned price: ${
						newPricesByVersion[MIGRATION_SETTINGS.DEFAULT_VERSION]
					}`
				)
			} catch (error) {
				stats.errorItems++
				stats.warnings.push({
					id: doc.id,
					name: item.name,
					warning: `Migration error: ${error.message}`
				})
				console.error(`   ❌ Failed to migrate "${item.name}": ${error.message}`)
			}
		}

		console.log(`   Batch ${batchIndex + 1} completed\n`)
	}

	// Generate migration report
	console.log('📊 MIGRATION REPORT')
	console.log('='.repeat(60))
	console.log(`Total items processed: ${stats.totalItems}`)
	console.log(`Items migrated: ${stats.migratedItems}`)
	console.log(`Items skipped: ${stats.skippedItems}`)
	console.log(`Items with errors: ${stats.errorItems}`)
	console.log(`Warnings: ${stats.warnings.length}`)
	console.log('')

	// Success rate
	const successRate =
		stats.totalItems > 0 ? ((stats.migratedItems / stats.totalItems) * 100).toFixed(1) : 0
	console.log(`Migration success rate: ${successRate}%`)
	console.log('')

	// Show warnings if any
	if (stats.warnings.length > 0) {
		console.log('⚠️  WARNINGS AND ERRORS')
		console.log('-'.repeat(40))
		stats.warnings.slice(0, 20).forEach((warning, index) => {
			console.log(`${index + 1}. "${warning.name}" (${warning.id})`)
			console.log(`   ${warning.warning}`)
		})
		if (stats.warnings.length > 20) {
			console.log(`... and ${stats.warnings.length - 20} more warnings`)
		}
		console.log('')
	}

	// Migration recommendations
	console.log('🎯 NEXT STEPS')
	console.log('-'.repeat(40))

	if (DRY_RUN) {
		console.log('1. Review the migration results above')
		console.log('2. Address any warnings or errors')
		console.log('3. Set DRY_RUN = false to perform actual migration')
		console.log('4. Run audit script to verify migration')
	} else {
		console.log('1. Run audit script to verify migration')
		console.log('2. Test application functionality thoroughly')
		console.log('3. Consider running legacy price field cleanup')
	}

	console.log('')
	console.log('🏁 Migration completed successfully!')

	return stats
}

// Rollback function (for emergencies)
async function rollbackMigration() {
	console.log('🔄 Rolling back price field migration...')
	console.log('⚠️  This will restore legacy price fields and remove prices_by_version')
	console.log('')

	// Implementation would go here - for now, just log
	console.log('❌ Rollback not implemented yet - manual intervention required')
	console.log('💡 Rollback would require:')
	console.log('   1. Restore legacy price fields from backup')
	console.log('   2. Remove prices_by_version fields')
	console.log('   3. Verify application functionality')
}

// Command line interface
const command = process.argv[2]

if (command === 'rollback') {
	rollbackMigration()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error('❌ Rollback failed:', error)
			process.exit(1)
		})
} else {
	// Run migration
	migratePriceFields()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error('❌ Migration failed:', error)
			process.exit(1)
		})
}
