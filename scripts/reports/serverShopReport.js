// scripts/serverShopReport.js
// Generates a report showing servers grouped by user, with shops listed for each server
// Usage: node scripts/serverShopReport.js

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

async function generateServerShopReport() {
	console.log('📊 Server and Shop Report by User...')
	console.log('='.repeat(80))
	console.log(`Using emulators: ${usingEmulators()}`)
	console.log('')

	const db = admin.firestore()

	// Step 1: Get all servers
	console.log('📋 Loading servers...')
	const serversSnapshot = await db.collection('servers').get()
	const serversByUser = new Map()
	
	serversSnapshot.docs.forEach((doc) => {
		const data = doc.data()
		const ownerId = data.owner_id || 'UNKNOWN_OWNER'
		
		if (!serversByUser.has(ownerId)) {
			serversByUser.set(ownerId, [])
		}
		
		serversByUser.get(ownerId).push({
			id: doc.id,
			name: data.name || 'Unnamed Server',
			created_at: data.created_at || null
		})
	})
	console.log(`  ✓ Found ${serversSnapshot.size} servers across ${serversByUser.size} users`)
	console.log('')

	// Step 2: Get all shops grouped by server_id
	console.log('📋 Loading shops...')
	const shopsSnapshot = await db.collection('shops').get()
	const shopsByServer = new Map()
	
	shopsSnapshot.docs.forEach((doc) => {
		const data = doc.data()
		const serverId = data.server_id
		
		if (!serverId) {
			// Shop without server_id - shouldn't happen but handle it
			if (!shopsByServer.has('NO_SERVER_ID')) {
				shopsByServer.set('NO_SERVER_ID', [])
			}
			shopsByServer.get('NO_SERVER_ID').push({
				id: doc.id,
				name: data.name || 'Unnamed Shop',
				owner_id: data.owner_id || null,
				archived: data.archived || false
			})
			return
		}
		
		if (!shopsByServer.has(serverId)) {
			shopsByServer.set(serverId, [])
		}
		
		shopsByServer.get(serverId).push({
			id: doc.id,
			name: data.name || 'Unnamed Shop',
			owner_id: data.owner_id || null,
			archived: data.archived || false
		})
	})
	console.log(`  ✓ Found ${shopsSnapshot.size} total shops`)
	console.log('')

	// Step 3: Generate report
	console.log('📊 SERVER AND SHOP REPORT BY USER')
	console.log('='.repeat(80))
	console.log('')

	// Sort users by number of servers (descending)
	const sortedUsers = Array.from(serversByUser.entries()).sort((a, b) => {
		return b[1].length - a[1].length
	})

	let totalServers = 0
	let totalShops = 0

	sortedUsers.forEach(([userId, servers]) => {
		console.log(`👤 USER: ${userId}`)
		console.log('-'.repeat(80))
		
		// Sort servers by creation date if available
		const sortedServers = servers.sort((a, b) => {
			if (!a.created_at && !b.created_at) return 0
			if (!a.created_at) return 1
			if (!b.created_at) return -1
			return new Date(a.created_at) - new Date(b.created_at)
		})

		sortedServers.forEach((server, serverIndex) => {
			const shops = shopsByServer.get(server.id) || []
			const activeShops = shops.filter(s => !s.archived)
			const archivedShops = shops.filter(s => s.archived)
			
			console.log(`  📦 Server ${serverIndex + 1}: "${server.name}" (${server.id})`)
			if (server.created_at) {
				console.log(`      Created: ${server.created_at}`)
			}
			console.log(`      Shops: ${shops.length} total (${activeShops.length} active, ${archivedShops.length} archived)`)
			
			if (shops.length > 0) {
				activeShops.forEach((shop, shopIndex) => {
					const ownerNote = shop.owner_id !== userId ? ` [owner: ${shop.owner_id}]` : ''
					console.log(`        ${shopIndex + 1}. "${shop.name}" (${shop.id})${ownerNote}`)
				})
				if (archivedShops.length > 0) {
					console.log(`        [${archivedShops.length} archived shop(s) hidden]`)
				}
			} else {
				console.log(`        (No shops)`)
			}
			console.log('')
			
			totalServers++
			totalShops += shops.length
		})
		
		console.log('')
	})

	// Handle shops without server_id if any
	if (shopsByServer.has('NO_SERVER_ID')) {
		const orphanedShops = shopsByServer.get('NO_SERVER_ID')
		console.log('⚠️  SHOPS WITHOUT SERVER_ID')
		console.log('-'.repeat(80))
		orphanedShops.forEach((shop, index) => {
			console.log(`  ${index + 1}. "${shop.name}" (${shop.id})`)
			if (shop.owner_id) {
				console.log(`     Owner: ${shop.owner_id}`)
			}
		})
		console.log('')
		totalShops += orphanedShops.length
	}

	// Summary
	console.log('📈 SUMMARY')
	console.log('='.repeat(80))
	console.log(`Total Users: ${serversByUser.size}`)
	console.log(`Total Servers: ${totalServers}`)
	console.log(`Total Shops: ${totalShops}`)
	console.log('')
}

// Initialize and run
initializeAdminApp()

generateServerShopReport()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error('❌ Script failed:', error)
		process.exit(1)
	})

