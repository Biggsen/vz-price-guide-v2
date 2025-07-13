const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin
const serviceAccount = require(path.resolve('./service-account.json'))
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// DRY RUN mode: set to true to only log what would be updated, false to actually fix the data
const DRY_RUN = true

async function auditVersionKeys() {
	console.log('🔍 Auditing version keys in prices_by_version fields...')
	console.log(`DRY RUN mode: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`)
	console.log('')

	const itemsSnapshot = await db.collection('items').get()
	let totalItems = 0,
		itemsWithPricesByVersion = 0,
		itemsWithDotVersions = 0,
		fixedItems = 0,
		errorItems = 0

	const problematicItems = []

	console.log(`Found ${itemsSnapshot.docs.length} items to audit`)
	console.log('')

	for (const doc of itemsSnapshot.docs) {
		const item = doc.data()
		totalItems++

		// Check if item has prices_by_version
		if (!item.prices_by_version || typeof item.prices_by_version !== 'object') {
			continue
		}

		itemsWithPricesByVersion++
		const versionKeys = Object.keys(item.prices_by_version)

		// Check for version keys with dots
		const dotVersions = versionKeys.filter((key) => key.includes('.'))
		const underscoreVersions = versionKeys.filter((key) => key.includes('_'))

		if (dotVersions.length > 0) {
			itemsWithDotVersions++

			console.log(`🚨 Found item with dot version keys: "${item.name || doc.id}"`)
			console.log(`   Material ID: ${item.material_id || 'N/A'}`)
			console.log(`   Version keys: ${versionKeys.join(', ')}`)
			console.log(`   Dot versions: ${dotVersions.join(', ')}`)
			console.log(`   Underscore versions: ${underscoreVersions.join(', ')}`)

			// Check for potential duplicates (e.g., both "1.16" and "1_16")
			const duplicates = []
			dotVersions.forEach((dotVersion) => {
				const underscoreEquivalent = dotVersion.replace('.', '_')
				if (underscoreVersions.includes(underscoreEquivalent)) {
					duplicates.push({ dot: dotVersion, underscore: underscoreEquivalent })
				}
			})

			if (duplicates.length > 0) {
				console.log(
					`   ⚠️  DUPLICATES FOUND: ${duplicates
						.map((d) => `${d.dot} & ${d.underscore}`)
						.join(', ')}`
				)
			}

			problematicItems.push({
				id: doc.id,
				name: item.name,
				material_id: item.material_id,
				dotVersions,
				underscoreVersions,
				duplicates,
				prices_by_version: item.prices_by_version
			})

			// Fix the data if not in dry run mode
			if (!DRY_RUN) {
				try {
					const normalizedPrices = {}
					const dotVersionsData = {}
					const underscoreVersionsData = {}

					// Separate dot and underscore versions first
					Object.entries(item.prices_by_version).forEach(([key, value]) => {
						if (key.includes('.')) {
							dotVersionsData[key.replace('.', '_')] = { originalKey: key, value }
						} else if (key.includes('_')) {
							underscoreVersionsData[key] = { originalKey: key, value }
						} else {
							// Handle other formats (shouldn't happen, but just in case)
							normalizedPrices[key] = value
						}
					})

					// First, add all underscore versions
					Object.entries(underscoreVersionsData).forEach(([normalizedKey, data]) => {
						normalizedPrices[normalizedKey] = data.value
					})

					// Then, prefer dot versions if they exist (overwrite underscore versions)
					Object.entries(dotVersionsData).forEach(([normalizedKey, data]) => {
						if (normalizedPrices[normalizedKey] !== undefined) {
							console.log(
								`   🔄 Preferring dot version "${data.originalKey}" over underscore version for key "${normalizedKey}"`
							)
						}
						normalizedPrices[normalizedKey] = data.value
					})

					await db.collection('items').doc(doc.id).update({
						prices_by_version: normalizedPrices
					})

					console.log(`   ✅ Fixed version keys for "${item.name || doc.id}"`)
					fixedItems++
				} catch (error) {
					console.error(`   ❌ Failed to fix "${item.name || doc.id}":`, error.message)
					errorItems++
				}
			} else {
				console.log(
					`   [DRY RUN] Would normalize version keys for "${item.name || doc.id}"`
				)
			}

			console.log('')
		}
	}

	// Summary
	console.log('')
	console.log('='.repeat(60))
	console.log('📊 AUDIT SUMMARY')
	console.log('='.repeat(60))
	console.log(`Total items audited: ${totalItems}`)
	console.log(`Items with prices_by_version: ${itemsWithPricesByVersion}`)
	console.log(`Items with dot version keys: ${itemsWithDotVersions}`)

	if (!DRY_RUN) {
		console.log(`Items fixed: ${fixedItems}`)
		console.log(`Items with errors: ${errorItems}`)
	}

	console.log('')

	if (itemsWithDotVersions > 0) {
		console.log('⚠️  PROBLEMATIC ITEMS FOUND!')
		console.log('')
		console.log('📋 Detailed breakdown:')

		problematicItems.forEach((item, index) => {
			console.log(`${index + 1}. "${item.name || item.id}" (${item.material_id})`)
			console.log(`   Dot versions: ${item.dotVersions.join(', ')}`)
			if (item.underscoreVersions.length > 0) {
				console.log(`   Underscore versions: ${item.underscoreVersions.join(', ')}`)
			}
			if (item.duplicates.length > 0) {
				console.log(
					`   Duplicates: ${item.duplicates
						.map((d) => `${d.dot}/${d.underscore}`)
						.join(', ')}`
				)
			}
		})

		console.log('')
		console.log(`🔧 To fix these issues, set DRY_RUN = false and run the script again.`)
	} else {
		console.log(
			'✅ No version key inconsistencies found! All prices_by_version fields use underscore format.'
		)
	}

	console.log('')
}

// Run the audit
auditVersionKeys()
	.then(() => {
		console.log('🏁 Audit completed successfully!')
		process.exit(0)
	})
	.catch((error) => {
		console.error('❌ Audit failed:', error)
		process.exit(1)
	})
