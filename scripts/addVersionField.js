// scripts/addVersionField.js
// Node.js script to add version and version_removed fields to all existing items
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
	console.log(
		`Starting migration to add version: "${VERSION_TO_ADD}" and version_removed: null to all items...`
	)
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

		// Determine what fields need to be added
		const updates = {}
		const fieldsToAdd = []

		if (!item.version) {
			updates.version = VERSION_TO_ADD
			fieldsToAdd.push(`version: "${VERSION_TO_ADD}"`)
		}

		if (!item.hasOwnProperty('version_removed')) {
			updates.version_removed = null
			fieldsToAdd.push('version_removed: null')
		}

		// Skip if item already has both fields
		if (Object.keys(updates).length === 0) {
			console.log(`⏭️  Skipped ${item.name || doc.id} - already has both fields`)
			skipped++
			continue
		}

		try {
			if (DRY_RUN) {
				console.log(
					`[DRY RUN] Would add ${fieldsToAdd.join(', ')} to ${item.name || doc.id}`
				)
			} else {
				await db.collection('items').doc(doc.id).update(updates)
				console.log(`✅ Updated ${item.name || doc.id} with ${fieldsToAdd.join(', ')}`)
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
	console.log(`Items skipped (already had both fields): ${skipped}`)
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
