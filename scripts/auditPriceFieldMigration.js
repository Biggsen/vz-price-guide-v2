const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin
const serviceAccount = require(path.resolve('./service-account.json'))
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Price calculation utilities (simplified versions)
function getEffectivePrice(item, version = '1_16') {
	// Check for version-specific price
	if (item.prices_by_version && item.prices_by_version[version]) {
		const versionPrice = item.prices_by_version[version]
		// Handle simple numeric values
		if (typeof versionPrice === 'number') {
			return versionPrice
		}
		// Handle legacy object structure (backward compatibility)
		if (versionPrice.type === 'static') {
			return versionPrice.value || 0
		}
		// For dynamic prices, we'll return the calculated value if available
		return versionPrice.calculated_value || 0
	}

	// Fallback to legacy price field
	return item.price || 0
}

function hasInconsistentPricing(item, version = '1_21') {
	const effectivePrice = getEffectivePrice(item, version)
	const legacyPrice = item.price || 0

	// If there's no prices_by_version, no inconsistency
	if (!item.prices_by_version || !item.prices_by_version[version]) {
		return false
	}

	// Check if legacy price differs from effective price
	return Math.abs(legacyPrice - effectivePrice) > 0.01
}

async function auditPriceFieldMigration() {
	console.log('🔍 Auditing Price Field Migration Readiness...')
	console.log('='.repeat(60))
	console.log('')

	// Initialize counters
	const stats = {
		totalItems: 0,
		priceFieldOnly: 0,
		pricesByVersionOnly: 0,
		bothFields: 0,
		neitherField: 0,
		zeroPriceItems: 0,
		inconsistentPricing: 0,
		staticPrices: 0,
		dynamicPrices: 0,
		calculatedDynamicPrices: 0,
		errors: []
	}

	const problematicItems = []
	const inconsistentItems = []
	const zeroPriceItems = []

	// Audit items collection
	console.log('📦 Auditing Items Collection...')
	const itemsSnapshot = await db.collection('items').get()
	console.log(`Found ${itemsSnapshot.docs.length} items`)
	console.log('')

	for (const doc of itemsSnapshot.docs) {
		const item = doc.data()
		stats.totalItems++

		try {
			// Check field presence
			const hasPrice = item.price !== undefined && item.price !== null
			const hasPricesByVersion =
				item.prices_by_version && typeof item.prices_by_version === 'object'

			if (hasPrice && hasPricesByVersion) {
				stats.bothFields++

				// Check for inconsistencies
				if (hasInconsistentPricing(item)) {
					stats.inconsistentPricing++
					inconsistentItems.push({
						id: doc.id,
						name: item.name,
						material_id: item.material_id,
						legacyPrice: item.price,
						effectivePrice: getEffectivePrice(item),
						prices_by_version: item.prices_by_version
					})
				}
			} else if (hasPrice) {
				stats.priceFieldOnly++
			} else if (hasPricesByVersion) {
				stats.pricesByVersionOnly++
			} else {
				stats.neitherField++
				problematicItems.push({
					id: doc.id,
					name: item.name,
					material_id: item.material_id,
					issue: 'No pricing data'
				})
			}

			// Check for zero prices
			const effectivePrice = getEffectivePrice(item)
			if (effectivePrice === 0) {
				stats.zeroPriceItems++
				zeroPriceItems.push({
					id: doc.id,
					name: item.name,
					material_id: item.material_id,
					legacyPrice: item.price || 0,
					effectivePrice: effectivePrice
				})
			}

			// Analyze pricing types
			if (hasPricesByVersion) {
				Object.values(item.prices_by_version).forEach((priceData) => {
					if (typeof priceData === 'object') {
						if (priceData.type === 'static') {
							stats.staticPrices++
						} else if (priceData.type === 'dynamic') {
							stats.dynamicPrices++
							if (priceData.calculated_value !== undefined) {
								stats.calculatedDynamicPrices++
							}
						}
					}
				})
			}
		} catch (error) {
			stats.errors.push({
				id: doc.id,
				name: item.name,
				error: error.message
			})
		}
	}

	// Audit shop items collection
	console.log('🏪 Auditing Shop Items Collection...')
	const shopItemsSnapshot = await db.collection('shop_items').get()
	const shopItemsStats = {
		totalShopItems: shopItemsSnapshot.docs.length,
		shopItemsWithPrices: 0,
		shopItemsReferencingItems: 0
	}

	for (const doc of shopItemsSnapshot.docs) {
		const shopItem = doc.data()

		if (shopItem.price !== undefined && shopItem.price !== null) {
			shopItemsStats.shopItemsWithPrices++
		}

		if (shopItem.item_id || shopItem.material_id) {
			shopItemsStats.shopItemsReferencingItems++
		}
	}

	console.log(`Found ${shopItemsStats.totalShopItems} shop items`)
	console.log('')

	// Generate comprehensive report
	console.log('📊 MIGRATION READINESS REPORT')
	console.log('='.repeat(60))
	console.log('')

	// Items overview
	console.log('🏷️  ITEMS PRICING ANALYSIS')
	console.log('-'.repeat(40))
	console.log(`Total items: ${stats.totalItems}`)
	console.log(
		`Items with price field only: ${stats.priceFieldOnly} (${(
			(stats.priceFieldOnly / stats.totalItems) *
			100
		).toFixed(1)}%)`
	)
	console.log(
		`Items with prices_by_version only: ${stats.pricesByVersionOnly} (${(
			(stats.pricesByVersionOnly / stats.totalItems) *
			100
		).toFixed(1)}%)`
	)
	console.log(
		`Items with both fields: ${stats.bothFields} (${(
			(stats.bothFields / stats.totalItems) *
			100
		).toFixed(1)}%)`
	)
	console.log(
		`Items with neither field: ${stats.neitherField} (${(
			(stats.neitherField / stats.totalItems) *
			100
		).toFixed(1)}%)`
	)
	console.log('')

	// Data quality issues
	console.log('⚠️  DATA QUALITY ISSUES')
	console.log('-'.repeat(40))
	console.log(
		`Items with zero prices: ${stats.zeroPriceItems} (${(
			(stats.zeroPriceItems / stats.totalItems) *
			100
		).toFixed(1)}%)`
	)
	console.log(
		`Items with inconsistent pricing: ${stats.inconsistentPricing} (${(
			(stats.inconsistentPricing / stats.totalItems) *
			100
		).toFixed(1)}%)`
	)
	console.log(`Items with no pricing data: ${stats.neitherField}`)
	console.log(`Processing errors: ${stats.errors.length}`)
	console.log('')

	// Pricing types analysis
	console.log('🏁 PRICING TYPES ANALYSIS')
	console.log('-'.repeat(40))
	console.log(`Static prices: ${stats.staticPrices}`)
	console.log(`Dynamic prices: ${stats.dynamicPrices}`)
	console.log(`Calculated dynamic prices: ${stats.calculatedDynamicPrices}`)
	console.log(
		`Dynamic prices needing calculation: ${stats.dynamicPrices - stats.calculatedDynamicPrices}`
	)
	console.log('')

	// Shop items analysis
	console.log('🏪 SHOP ITEMS ANALYSIS')
	console.log('-'.repeat(40))
	console.log(`Total shop items: ${shopItemsStats.totalShopItems}`)
	console.log(`Shop items with prices: ${shopItemsStats.shopItemsWithPrices}`)
	console.log(`Shop items referencing items: ${shopItemsStats.shopItemsReferencingItems}`)
	console.log('')

	// Migration impact assessment
	console.log('🎯 MIGRATION IMPACT ASSESSMENT')
	console.log('-'.repeat(40))
	const itemsRequiringMigration = stats.priceFieldOnly + stats.bothFields
	const safeToMigrate = stats.neitherField === 0 && stats.errors.length === 0

	console.log(`Items requiring migration: ${itemsRequiringMigration}`)
	console.log(
		`Migration complexity: ${stats.inconsistentPricing > 0 ? 'HIGH' : 'LOW'} (${
			stats.inconsistentPricing
		} inconsistencies)`
	)
	console.log(`Safe to migrate: ${safeToMigrate ? 'YES' : 'NO'}`)
	console.log('')

	// Detailed issues report
	if (stats.neitherField > 0) {
		console.log('❌ ITEMS WITH NO PRICING DATA')
		console.log('-'.repeat(40))
		problematicItems.slice(0, 10).forEach((item, index) => {
			console.log(`${index + 1}. "${item.name}" (${item.material_id}) - ${item.issue}`)
		})
		if (problematicItems.length > 10) {
			console.log(`... and ${problematicItems.length - 10} more items`)
		}
		console.log('')
	}

	if (stats.inconsistentPricing > 0) {
		console.log('⚠️  PRICING INCONSISTENCIES (Legacy vs Effective)')
		console.log('-'.repeat(40))
		inconsistentItems.slice(0, 10).forEach((item, index) => {
			console.log(`${index + 1}. "${item.name}" (${item.material_id})`)
			console.log(`   Legacy price: ${item.legacyPrice}`)
			console.log(`   Effective price: ${item.effectivePrice}`)
		})
		if (inconsistentItems.length > 10) {
			console.log(`... and ${inconsistentItems.length - 10} more items`)
		}
		console.log('')
	}

	if (stats.zeroPriceItems > 10) {
		console.log('💰 ZERO-PRICE ITEMS (First 10)')
		console.log('-'.repeat(40))
		zeroPriceItems.slice(0, 10).forEach((item, index) => {
			console.log(
				`${index + 1}. "${item.name}" (${item.material_id}) - Legacy: ${
					item.legacyPrice
				}, Effective: ${item.effectivePrice}`
			)
		})
		console.log('')
	}

	if (stats.errors.length > 0) {
		console.log('❌ PROCESSING ERRORS')
		console.log('-'.repeat(40))
		stats.errors.forEach((error, index) => {
			console.log(`${index + 1}. "${error.name}" (${error.id}) - ${error.error}`)
		})
		console.log('')
	}

	// Migration recommendations
	console.log('🚀 MIGRATION RECOMMENDATIONS')
	console.log('-'.repeat(40))

	if (stats.neitherField > 0) {
		console.log('1. ❌ CRITICAL: Fix items with no pricing data first')
	}

	if (stats.inconsistentPricing > 0) {
		console.log('2. ⚠️  HIGH: Resolve pricing inconsistencies')
	}

	if (stats.dynamicPrices - stats.calculatedDynamicPrices > 0) {
		console.log('3. 📊 MEDIUM: Calculate missing dynamic prices')
	}

	if (stats.priceFieldOnly > 0) {
		console.log('4. 🔄 LOW: Migrate legacy price fields to prices_by_version')
	}

	if (safeToMigrate) {
		console.log('✅ System is ready for migration!')
	} else {
		console.log('⚠️  Address critical issues before migration')
	}

	console.log('')
	console.log('🏁 Audit completed successfully!')

	return stats
}

// Run the audit
auditPriceFieldMigration()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error('❌ Audit failed:', error)
		process.exit(1)
	})
