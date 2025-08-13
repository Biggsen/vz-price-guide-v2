// scripts/seed-emulator.js
// Seeds the Firebase emulators (Firestore/Auth) with realistic test data
// Usage:
//   - Emulators already running:   node scripts/seed-emulator.js
//   - One-shot with emulators:     firebase emulators:exec --only firestore,auth "node scripts/seed-emulator.js"
//
// Notes:
// - When running under emulators, Admin SDK connects automatically if the
//   emulator env vars are present. We still support service-account.json for
//   consistency with other scripts in this repo.

const path = require('path')
const admin = require('firebase-admin')

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
	// When targeting emulators, never read service-account.json. It may carry a prod project_id.
	if (usingEmulators()) {
		const projectId =
			process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-vz-price-guide'
		admin.initializeApp({ projectId })
		return
	}

	// Non-emulator path: use service-account if present, otherwise fall back to env/defaults
	try {
		const serviceAccountPath = path.resolve(__dirname, '../service-account.json')
		// eslint-disable-next-line import/no-dynamic-require, global-require
		const serviceAccount = require(serviceAccountPath)
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
			projectId: serviceAccount.project_id
		})
	} catch (error) {
		const projectId =
			process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'vz-price-guide'
		admin.initializeApp({ projectId })
	}
}

initializeAdminApp()

const db = admin.firestore()
const auth = admin.auth()

// Debug: show where we're seeding
console.log('[seed] Project ID:', admin.app().options.projectId || process.env.GCLOUD_PROJECT)
console.log('[seed] FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST || '(not set)')
console.log(
	'[seed] FIREBASE_AUTH_EMULATOR_HOST:',
	process.env.FIREBASE_AUTH_EMULATOR_HOST || '(not set)'
)

// Centralized helper to create/update a document
async function upsertDoc(collectionName, docId, data) {
	await db.collection(collectionName).doc(docId).set(data, { merge: true })
}

function nowIso() {
	return new Date().toISOString()
}

const TEST_DATA = {
	users: [
		{
			id: 'test-user-1',
			email: 'user@example.com',
			password: 'passWORD123',
			minecraft_username: 'TestPlayer1',
			display_name: 'Test Player 1',
			minecraft_avatar_url: 'https://mc-heads.net/avatar/TestPlayer1/64',
			created_at: nowIso(),
			bio: 'Test user for E2E testing'
		},
		{
			id: 'test-admin-1',
			email: 'admin@example.com',
			password: 'passWORD123',
			minecraft_username: 'TestAdmin1',
			display_name: 'Test Admin 1',
			minecraft_avatar_url: 'https://mc-heads.net/avatar/TestAdmin1/64',
			created_at: nowIso(),
			bio: 'Test admin user for E2E testing'
		},
		{
			id: 'test-user-unverified',
			email: 'unverified@example.com',
			password: 'passWORD123'
		},
		{
			id: 'test-user-verified-no-profile',
			email: 'verified-noprofile@example.com',
			password: 'passWORD123'
		}
	],
	servers: [
		{
			id: 'test-server-1',
			name: 'Test Server 1',
			minecraft_version: '1.20',
			owner_id: 'test-admin-1',
			description: 'Test server for E2E testing',
			created_at: nowIso(),
			updated_at: nowIso()
		}
	],
	shops: [
		{
			id: 'test-shop-1',
			name: "TestPlayer1's Shop",
			server_id: 'test-server-1',
			owner_id: 'test-admin-1',
			is_own_shop: true,
			location: 'Spawn',
			description: 'Test shop for E2E testing',
			created_at: nowIso(),
			updated_at: nowIso()
		},
		{
			id: 'test-shop-2',
			name: 'Competitor Shop',
			server_id: 'test-server-1',
			owner_id: 'test-admin-1',
			is_own_shop: false,
			location: 'Market District',
			description: 'Competitor shop for price comparison',
			created_at: nowIso(),
			updated_at: nowIso()
		}
	],
	items: [
		{
			id: 'stone',
			material_id: 'stone',
			name: 'stone',
			image: '/images/items/stone.png',
			url: 'https://minecraft.fandom.com/wiki/Stone',
			price: 1.0,
			stack: 64,
			category: 'stone',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 1.0
			},
			recipes_by_version: {}
		},
		{
			id: 'diamond',
			material_id: 'diamond',
			name: 'diamond',
			image: '/images/items/diamond.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond',
			price: 100.0,
			stack: 64,
			category: 'ores',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 100.0
			},
			recipes_by_version: {}
		},
		{
			id: 'oak_planks',
			material_id: 'oak_planks',
			name: 'oak planks',
			image: '/images/items/oak_planks.png',
			url: 'https://minecraft.fandom.com/wiki/Oak_Planks',
			price: 0.8,
			stack: 64,
			category: 'wood',
			subcategory: 'oak',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 0.8
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'oak_log', quantity: 1 }],
					output_count: 4
				}
			}
		},
		{
			id: 'oak_log',
			material_id: 'oak_log',
			name: 'oak log',
			image: '/images/items/oak_log.png',
			url: 'https://minecraft.fandom.com/wiki/Oak_Log',
			price: 3.0,
			stack: 64,
			category: 'wood',
			subcategory: 'oak',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 3.0
			},
			recipes_by_version: {}
		}
	],
	shop_items: [
		{
			id: 'shop-item-1',
			shop_id: 'test-shop-1',
			item_id: 'stone',
			buy_price: 1.5,
			sell_price: 1.0,
			previous_buy_price: 1.0,
			previous_sell_price: 0.8,
			previous_price_date: new Date(Date.now() - 86400000).toISOString(),
			stock_quantity: 1000,
			stock_full: false,
			notes: 'Good supply, competitive pricing',
			last_updated: nowIso()
		},
		{
			id: 'shop-item-2',
			shop_id: 'test-shop-1',
			item_id: 'diamond',
			buy_price: 110.0,
			sell_price: 95.0,
			previous_buy_price: 105.0,
			previous_sell_price: 90.0,
			previous_price_date: new Date(Date.now() - 172800000).toISOString(),
			stock_quantity: 50,
			stock_full: false,
			notes: 'Limited supply, high demand',
			last_updated: nowIso()
		},
		{
			id: 'shop-item-3',
			shop_id: 'test-shop-2',
			item_id: 'stone',
			buy_price: 1.8,
			sell_price: 1.2,
			previous_buy_price: 1.5,
			previous_sell_price: 1.0,
			previous_price_date: new Date(Date.now() - 43200000).toISOString(),
			stock_quantity: 500,
			stock_full: false,
			notes: 'Competitive with main shop',
			last_updated: nowIso()
		}
	],
	suggestions: [
		{
			id: 'test-suggestion-1',
			userId: 'test-user-1',
			userDisplayName: 'Test Player 1',
			createdAt: nowIso(),
			status: 'open',
			title: 'Add more building blocks',
			body: 'Would be great to have more variety in building blocks for creative builds.'
		}
	]
}

async function seedEmulator() {
	console.log('🌱 Seeding Firebase emulators with test data...')

	try {
		// Auth users
		console.log('🔐 Seeding Auth users...')
		for (const user of TEST_DATA.users) {
			let existing = null
			try {
				existing = await auth.getUser(user.id)
			} catch {}

			// Set emailVerified based on user ID
			const emailVerified = user.id !== 'test-user-unverified'

			if (!existing) {
				await auth.createUser({
					uid: user.id,
					email: user.email,
					emailVerified: emailVerified,
					password: user.password,
					disabled: false
				})
			} else {
				await auth.updateUser(user.id, {
					email: user.email,
					emailVerified: emailVerified,
					password: user.password,
					disabled: false
				})
			}
			if (user.id === 'test-admin-1') {
				await auth.setCustomUserClaims(user.id, { admin: true })
			} else {
				await auth.setCustomUserClaims(user.id, { admin: false })
			}
			console.log(
				`  ✓ Auth user ready: ${user.email}${user.id === 'test-admin-1' ? ' (admin)' : ''}${
					user.id === 'test-user-unverified' ? ' (unverified)' : ''
				}${user.id === 'test-user-verified-no-profile' ? ' (verified, no profile)' : ''}`
			)
		}

		// Users (profiles only — never store auth credentials in Firestore)
		console.log('👥 Seeding users...')
		for (const user of TEST_DATA.users) {
			// Skip creating profile for unverified user and verified user without profile
			if (user.id === 'test-user-unverified' || user.id === 'test-user-verified-no-profile') {
				const reason = user.id === 'test-user-unverified' ? 'unverified' : 'no profile'
				console.log(`  ⏭️  Skipping profile for ${user.email} (${reason})`)
				continue
			}

			const profile = {
				minecraft_username: user.minecraft_username,
				minecraft_avatar_url: user.minecraft_avatar_url,
				display_name: user.display_name,
				created_at: user.created_at,
				bio: user.bio
			}
			await upsertDoc('users', user.id, profile)
			console.log(`  ✓ ${user.display_name}`)
		}

		// Servers
		console.log('🖥️  Seeding servers...')
		for (const server of TEST_DATA.servers) {
			await upsertDoc('servers', server.id, server)
			console.log(`  ✓ ${server.name}`)
		}

		// Shops
		console.log('🏪 Seeding shops...')
		for (const shop of TEST_DATA.shops) {
			await upsertDoc('shops', shop.id, shop)
			console.log(`  ✓ ${shop.name}`)
		}

		// Items
		console.log('📦 Seeding items...')
		for (const item of TEST_DATA.items) {
			await upsertDoc('items', item.id, item)
			console.log(`  ✓ ${item.name}`)
		}

		// Shop Items
		console.log('💰 Seeding shop items...')
		for (const si of TEST_DATA.shop_items) {
			await upsertDoc('shop_items', si.id, si)
			console.log(`  ✓ ${si.item_id} → ${si.shop_id}`)
		}

		// Suggestions
		console.log('💡 Seeding suggestions...')
		for (const s of TEST_DATA.suggestions) {
			await upsertDoc('suggestions', s.id, s)
			console.log(`  ✓ ${s.title}`)
		}

		console.log('🎉 Seeding complete!')
	} catch (error) {
		console.error('❌ Seeding failed:', error)
		process.exit(1)
	}
}

seedEmulator().then(() => process.exit(0))
