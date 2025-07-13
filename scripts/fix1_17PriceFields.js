const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin
const serviceAccount = require(path.resolve('./service-account.json'))
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// DRY RUN mode: set to true to only log what would be updated, false to actually update Firestore
const DRY_RUN = false
const BATCH_SIZE = 100

async function fix1_17PriceFields() {
	console.log('🔧 Fixing 1.17 items with prices_by_version.1_16...')
	console.log(`DRY RUN mode: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`)
	console.log('')

	const itemsSnapshot = await db.collection('items').get()
	const allItems = itemsSnapshot.docs
	let totalItems = 0,
		affectedItems = 0,
		updatedItems = 0,
		skippedItems = 0,
		errorItems = 0

	// Process items in batches
	const batches = []
	for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
		batches.push(allItems.slice(i, i + BATCH_SIZE))
	}

	for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
		const batch = batches[batchIndex]
		console.log(
			`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`
		)

		for (const doc of batch) {
			const item = doc.data()
			totalItems++

			try {
				// Only process items with version '1.17' and prices_by_version with '1_16' key
				if (
					item.version === '1.17' &&
					item.prices_by_version &&
					typeof item.prices_by_version === 'object' &&
					Object.keys(item.prices_by_version).length === 1 &&
					item.prices_by_version['1_16'] !== undefined &&
					item.prices_by_version['1_17'] === undefined
				) {
					affectedItems++
					const newPricesByVersion = { ...item.prices_by_version }
					newPricesByVersion['1_17'] = newPricesByVersion['1_16']
					delete newPricesByVersion['1_16']

					if (DRY_RUN) {
						console.log(
							`[DRY RUN] Would update "${item.name}" (${item.material_id}) - prices_by_version: 1_16 -> 1_17`
						)
					} else {
						await db.collection('items').doc(doc.id).update({
							prices_by_version: newPricesByVersion
						})
						console.log(
							`✅ Updated "${item.name}" (${item.material_id}) - prices_by_version: 1_16 -> 1_17`
						)
						updatedItems++
					}
				} else {
					skippedItems++
				}
			} catch (error) {
				errorItems++
				console.error(`❌ Error processing "${item.name}" (${doc.id}): ${error.message}`)
			}
		}
	}

	// Report
	console.log('')
	console.log('='.repeat(50))
	console.log('FIX 1.17 PRICE FIELDS SUMMARY')
	console.log('='.repeat(50))
	console.log(`Total items processed: ${totalItems}`)
	console.log(`Affected items: ${affectedItems}`)
	if (!DRY_RUN) {
		console.log(`Items updated: ${updatedItems}`)
	}
	console.log(`Items skipped: ${skippedItems}`)
	console.log(`Items with errors: ${errorItems}`)
	if (DRY_RUN) {
		console.log('\n🔍 This was a DRY RUN - no changes were made.')
		console.log('💡 Set DRY_RUN = false to apply changes.')
	} else {
		console.log('\n✨ Fix complete!')
	}
}

fix1_17PriceFields().catch((err) => {
	console.error('Fix failed:', err)
	process.exit(1)
})
