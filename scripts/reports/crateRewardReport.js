// scripts/crateRewardReport.js
// Generates a report showing crate rewards grouped by user
// Usage: node scripts/crateRewardReport.js

const admin = require('firebase-admin')
const path = require('path')

function usingEmulators() {
	const flag = (process.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase()
	return (
		!!process.env.FIRESTORE_EMULATOR_HOST ||
		!!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
		flag === '1' ||
		flag === 'true'
	)
}

function initializeAdminApp() {
	if (usingEmulators()) {
		const projectId =
			process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-vz-price-guide'
		admin.initializeApp({ projectId })
		return
	}

	try {
		const serviceAccountPath = path.resolve(__dirname, '../../service-account.json')
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

async function generateCrateRewardReport() {
	console.log('📊 Crate Reward Report by User...')
	console.log('='.repeat(80))
	console.log(`Using emulators: ${usingEmulators()}`)
	console.log('')

	const db = admin.firestore()

	// Step 1: Get all crate rewards
	console.log('📋 Loading crate rewards...')
	const cratesSnapshot = await db.collection('crate_rewards').get()
	const cratesByUser = new Map()
	
	cratesSnapshot.docs.forEach((doc) => {
		const data = doc.data()
		const userId = data.user_id || 'UNKNOWN_USER'
		
		if (!cratesByUser.has(userId)) {
			cratesByUser.set(userId, [])
		}
		
		cratesByUser.get(userId).push({
			id: doc.id,
			name: data.name || '',
			description: data.description || '',
			minecraft_version: data.minecraft_version || null,
			created_at: data.created_at || null,
			updated_at: data.updated_at || null
		})
	})
	console.log(`  ✓ Found ${cratesSnapshot.size} crate rewards across ${cratesByUser.size} users`)
	console.log('')

	// Step 2: Get crate reward items count for each crate
	console.log('📋 Loading crate reward items...')
	const itemsSnapshot = await db.collection('crate_reward_items').get()
	const itemsByCrate = new Map()
	
	itemsSnapshot.docs.forEach((doc) => {
		const data = doc.data()
		const crateId = data.crate_reward_id
		
		if (!crateId) return
		
		if (!itemsByCrate.has(crateId)) {
			itemsByCrate.set(crateId, 0)
		}
		itemsByCrate.set(crateId, itemsByCrate.get(crateId) + 1)
	})
	console.log(`  ✓ Found ${itemsSnapshot.size} crate reward items`)
	console.log('')

	// Step 3: Generate report
	console.log('📊 CRATE REWARD REPORT BY USER')
	console.log('='.repeat(80))
	console.log('')

	// Sort users by number of crates (descending)
	const sortedUsers = Array.from(cratesByUser.entries()).sort((a, b) => {
		return b[1].length - a[1].length
	})

	let totalCrates = 0
	let totalItems = 0
	let cratesWithEmptyNames = []

	sortedUsers.forEach(([userId, crates]) => {
		console.log(`👤 USER: ${userId}`)
		console.log('-'.repeat(80))
		
		// Sort crates by creation date if available
		const sortedCrates = crates.sort((a, b) => {
			if (!a.created_at && !b.created_at) return 0
			if (!a.created_at) return 1
			if (!b.created_at) return -1
			return new Date(a.created_at) - new Date(b.created_at)
		})

		let userItemCount = 0
		sortedCrates.forEach((crate, crateIndex) => {
			const itemCount = itemsByCrate.get(crate.id) || 0
			const hasEmptyName = !crate.name || crate.name.trim() === ''
			
			if (hasEmptyName) {
				cratesWithEmptyNames.push({
					userId,
					crateId: crate.id,
					created_at: crate.created_at
				})
			}
			
			const nameDisplay = hasEmptyName ? '(EMPTY NAME)' : `"${crate.name}"`
			const warning = hasEmptyName ? ' ⚠️' : ''
			
			console.log(`  📦 Crate ${crateIndex + 1}: ${nameDisplay}${warning} (${crate.id})`)
			console.log(`      Items: ${itemCount}`)
			if (crate.minecraft_version) {
				console.log(`      Version: ${crate.minecraft_version}`)
			}
			if (crate.description) {
				const descPreview = crate.description.length > 50 
					? crate.description.substring(0, 50) + '...' 
					: crate.description
				console.log(`      Description: ${descPreview}`)
			}
			if (crate.created_at) {
				console.log(`      Created: ${crate.created_at}`)
			}
			if (crate.updated_at && crate.updated_at !== crate.created_at) {
				console.log(`      Updated: ${crate.updated_at}`)
			}
			console.log('')
			
			totalCrates++
			totalItems += itemCount
			userItemCount += itemCount
		})
		
		console.log(`  Total: ${sortedCrates.length} crate(s), ${userItemCount} item(s)`)
		console.log('')
	})

	// Summary
	console.log('📈 SUMMARY')
	console.log('='.repeat(80))
	console.log(`Total Users: ${cratesByUser.size}`)
	console.log(`Total Crate Rewards: ${totalCrates}`)
	console.log(`Total Crate Reward Items: ${totalItems}`)
	console.log('')

	// Highlight problematic crates
	if (cratesWithEmptyNames.length > 0) {
		console.log('⚠️  CRATES WITH EMPTY NAMES')
		console.log('='.repeat(80))
		cratesWithEmptyNames.forEach((crate, index) => {
			console.log(`${index + 1}. User: ${crate.userId}`)
			console.log(`   Crate ID: ${crate.crateId}`)
			if (crate.created_at) {
				console.log(`   Created: ${crate.created_at}`)
			}
			console.log('')
		})
	} else {
		console.log('✅ No crates with empty names found')
		console.log('')
	}
}

// Initialize and run
initializeAdminApp()

generateCrateRewardReport()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error('❌ Script failed:', error)
		process.exit(1)
	})

