// scripts/findServersWithoutShops.js
// Finds servers that don't have any associated shops (report only)
// Usage: node scripts/findServersWithoutShops.js

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

async function findServersWithoutShops() {
	console.log('🔍 Finding Servers Without Shops...')
	console.log('='.repeat(60))
	console.log(`Using emulators: ${usingEmulators()}`)
	console.log('')

	const db = admin.firestore()

	// Step 1: Get all servers
	console.log('📋 Step 1: Loading all servers...')
	const serversSnapshot = await db.collection('servers').get()
	const allServers = new Map()
	
	serversSnapshot.docs.forEach((doc) => {
		const data = doc.data()
		allServers.set(doc.id, {
			id: doc.id,
			name: data.name || 'Unknown',
			owner_id: data.owner_id || null,
			created_at: data.created_at || null
		})
	})
	console.log(`  ✓ Found ${allServers.size} total servers`)
	console.log('')

	// Step 2: Get all shops and group by server_id
	console.log('📋 Step 2: Loading all shops...')
	const shopsSnapshot = await db.collection('shops').get()
	const serversWithShops = new Set()
	
	shopsSnapshot.docs.forEach((doc) => {
		const data = doc.data()
		if (data.server_id) {
			serversWithShops.add(data.server_id)
		}
	})
	console.log(`  ✓ Found ${shopsSnapshot.size} total shops`)
	console.log(`  ✓ Found ${serversWithShops.size} servers with at least one shop`)
	console.log('')

	// Step 3: Find servers without shops
	console.log('📋 Step 3: Identifying servers without shops...')
	const serversWithoutShops = []
	
	allServers.forEach((server) => {
		if (!serversWithShops.has(server.id)) {
			serversWithoutShops.push(server)
		}
	})
	console.log(`  ⚠️  Found ${serversWithoutShops.length} servers without shops`)
	console.log('')

	// Step 4: Generate report
	console.log('📊 SERVERS WITHOUT SHOPS REPORT')
	console.log('='.repeat(60))
	console.log('')

	if (serversWithoutShops.length > 0) {
		console.log(`❌ SERVERS WITHOUT SHOPS (${serversWithoutShops.length})`)
		console.log('-'.repeat(60))
		
		// Sort by creation date if available
		serversWithoutShops.sort((a, b) => {
			if (!a.created_at && !b.created_at) return 0
			if (!a.created_at) return 1
			if (!b.created_at) return -1
			return new Date(a.created_at) - new Date(b.created_at)
		})

		serversWithoutShops.forEach((server, index) => {
			console.log(`${index + 1}. "${server.name}" (ID: ${server.id})`)
			if (server.owner_id) {
				console.log(`   Owner: ${server.owner_id}`)
			}
			if (server.created_at) {
				console.log(`   Created: ${server.created_at}`)
			}
			console.log('')
		})
	} else {
		console.log('✅ All servers have at least one shop')
		console.log('')
	}
}

// Initialize and run
initializeAdminApp()

findServersWithoutShops()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error('❌ Script failed:', error)
		process.exit(1)
	})

