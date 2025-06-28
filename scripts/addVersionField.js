// scripts/addVersionField.js
// Node.js script to add version field to all existing items
// Usage: node scripts/addVersionField.js
// Requires: npm install firebase-admin

const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin
const serviceAccount = require(path.resolve(__dirname, '../service-account.json'))
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// DRY RUN mode: set to true to only log what would be updated, false to actually update Firestore
const DRY_RUN = false

// Version to add to all existing items
const VERSION_TO_ADD = '1.16'

async function main() {
	console.log(`Starting migration to add version: "${VERSION_TO_ADD}" to all items...`)
	console.log(`DRY RUN mode: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`)
	console.log('')

	const itemsSnapshot = await db.collection('items').get()
	let updated = 0,
		skipped = 0,
		failed = 0

	console.log(`Found ${itemsSnapshot.docs.length} items to process`)
	console.log('')

	for (const doc of itemsSnapshot.docs) {
		const item = doc.data()

		// Skip if item already has a version field
		if (item.version) {
			console.log(`⏭️  Skipped ${item.name || doc.id} - already has version: ${item.version}`)
			skipped++
			continue
		}

		try {
			if (DRY_RUN) {
				console.log(
					`[DRY RUN] Would add version: "${VERSION_TO_ADD}" to ${item.name || doc.id}`
				)
			} else {
				await db.collection('items').doc(doc.id).update({
					version: VERSION_TO_ADD
				})
				console.log(`✅ Updated ${item.name || doc.id} with version: "${VERSION_TO_ADD}"`)
			}
			updated++
		} catch (e) {
			failed++
			console.error(`❌ Failed to update ${item.name || doc.id}:`, e.message)
		}
	}

	console.log('')
	console.log('='.repeat(50))
	console.log('MIGRATION SUMMARY')
	console.log('='.repeat(50))
	console.log(`Total items processed: ${itemsSnapshot.docs.length}`)
	console.log(`Items ${DRY_RUN ? 'would be updated' : 'updated'}: ${updated}`)
	console.log(`Items skipped (already had version): ${skipped}`)
	console.log(`Items failed: ${failed}`)

	if (DRY_RUN) {
		console.log('')
		console.log('🔍 This was a DRY RUN - no changes were made.')
		console.log('💡 Set DRY_RUN = false to apply changes.')
	} else {
		console.log('')
		console.log('✨ Migration complete!')
	}
}

main().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
