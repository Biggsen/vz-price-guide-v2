// scripts/seed-emulator.js
// Seeds the Firebase emulators (Firestore/Auth) with realistic test data
// Usage:
//   - Emulators already running:   node scripts/seed-emulator.js
//   - One-shot with emulators:     firebase emulators:exec --only firestore,auth "node scripts/seed-emulator.js"
//
// SAFETY MEASURES:
// - This script will REFUSE to run against production databases
// - Set DRY_RUN=true to test without making changes
// - Requires explicit confirmation for any non-emulator operations
//
// Notes:
// - When running under emulators, Admin SDK connects automatically if the
//   emulator env vars are present. We still support service-account.json for
//   consistency with other scripts in this repo.

const path = require('path')
const readline = require('readline')
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

function isProductionProject(projectId) {
	// List of known production project IDs - add more as needed
	const productionProjects = ['vz-price-guide', 'vz-price-guide-prod']
	return productionProjects.includes(projectId)
}

function isDryRun() {
	return process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1'
}

async function confirmProductionOperation(projectId) {
	if (isDryRun()) {
		console.log('🔍 DRY_RUN mode: Would have asked for confirmation to run against production')
		return true
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	return new Promise((resolve) => {
		console.log('')
		console.log(
			'⚠️  WARNING: You are about to run the seed script against a PRODUCTION database!'
		)
		console.log(`   Project ID: ${projectId}`)
		console.log('   This could corrupt or overwrite production data!')
		console.log('')
		console.log('   If you meant to seed the emulator, make sure:')
		console.log('   1. Firebase emulators are running: firebase emulators:start')
		console.log('   2. Environment variables are set correctly')
		console.log('   3. You are in the correct directory')
		console.log('')
		rl.question('Type "YES I UNDERSTAND THE RISK" to continue: ', (answer) => {
			rl.close()
			resolve(answer === 'YES I UNDERSTAND THE RISK')
		})
	})
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

// Get the actual project ID we're connecting to
const projectId = admin.app().options.projectId || process.env.GCLOUD_PROJECT

// Debug: show where we're seeding
console.log('[seed] Project ID:', projectId)
console.log('[seed] FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST || '(not set)')
console.log(
	'[seed] FIREBASE_AUTH_EMULATOR_HOST:',
	process.env.FIREBASE_AUTH_EMULATOR_HOST || '(not set)'
)
console.log('[seed] Using emulators:', usingEmulators())
console.log('[seed] DRY_RUN mode:', isDryRun())

// SAFETY CHECK: Prevent accidental production seeding
async function safetyCheck() {
	const isEmulator = usingEmulators()
	const isProd = isProductionProject(projectId)

	if (!isEmulator && isProd) {
		console.log('')
		console.log('🚨 SAFETY CHECK FAILED!')
		console.log('   This script is designed for emulator seeding only.')
		console.log('   You are about to run against a PRODUCTION database!')
		console.log('')

		const confirmed = await confirmProductionOperation(projectId)
		if (!confirmed) {
			console.log('❌ Operation cancelled by user.')
			process.exit(1)
		}
		console.log('✅ User confirmed production operation.')
	} else if (isEmulator) {
		console.log('✅ Safety check passed: Running against emulators')
	} else {
		console.log('✅ Safety check passed: Not a known production project')
	}
}

// Centralized helper to create/update a document
async function upsertDoc(collectionName, docId, data) {
	if (isDryRun()) {
		console.log(`[DRY_RUN] Would upsert ${collectionName}/${docId}`)
		return
	}
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
		},
		{
			id: 'air',
			material_id: 'air',
			name: 'air',
			image: '/images/items/air.png',
			url: 'https://minecraft.fandom.com/wiki/Air',
			stack: 64,
			category: '',
			subcategory: '',
			version: '1.19',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_19': 0.0
			},
			recipes_by_version: {}
		},
		{
			id: 'zombie_spawn_egg',
			material_id: 'zombie_spawn_egg',
			name: 'zombie spawn egg',
			image: '/images/items/zombie_spawn_egg.png',
			url: 'https://minecraft.fandom.com/wiki/Zombie_Spawn_Egg',
			stack: 64,
			category: 'spawn',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 25.0
			},
			recipes_by_version: {}
		},
		{
			id: 'heart_of_the_sea',
			material_id: 'heart_of_the_sea',
			name: 'heart of the sea',
			image: '/images/items/heart_of_the_sea.png',
			url: 'https://minecraft.fandom.com/wiki/Heart_of_the_Sea',
			stack: 64,
			category: '',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 50.0
			},
			recipes_by_version: {}
		},
		{
			id: 'trial_key',
			material_id: 'trial_key',
			name: 'trial key',
			image: '/images/items/trial_key.png',
			url: 'https://minecraft.fandom.com/wiki/Trial_Key',
			stack: 1,
			category: '',
			subcategory: '',
			version: '1.21',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_21': 75.0
			},
			recipes_by_version: {}
		},
		{
			id: 'brush',
			material_id: 'brush',
			name: 'brush',
			image: '/images/items/brush.png',
			url: 'https://minecraft.fandom.com/wiki/Brush',
			stack: 1,
			category: 'tools',
			subcategory: 'archaeology',
			version: '1.20',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_20': 25.0
			},
			recipes_by_version: {
				'1_20': {
					ingredients: [
						{ material_id: 'stick', quantity: 1 },
						{ material_id: 'copper_ingot', quantity: 1 },
						{ material_id: 'feather', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_chestplate',
			material_id: 'diamond_chestplate',
			name: 'diamond chestplate',
			image: '/images/items/diamond_chestplate.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Chestplate',
			stack: 1,
			category: 'armor',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 800.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'diamond', quantity: 8 }],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_ingot',
			material_id: 'iron_ingot',
			name: 'iron ingot',
			image: '/images/items/iron_ingot.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Ingot',
			stack: 64,
			category: 'ores',
			subcategory: 'iron',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 8.0
			},
			recipes_by_version: {}
		},
		{
			id: 'iron_block',
			material_id: 'iron_block',
			name: 'iron block',
			image: '/images/items/iron_block.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Block',
			stack: 64,
			category: 'ores',
			subcategory: 'iron',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 72.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'iron_ingot', quantity: 9 }],
					output_count: 1
				}
			}
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
		},
		{
			id: 'shop-item-4',
			shop_id: 'test-shop-1',
			item_id: 'diamond_chestplate',
			buy_price: 850.0,
			sell_price: 750.0,
			previous_buy_price: 800.0,
			previous_sell_price: 700.0,
			previous_price_date: new Date(Date.now() - 259200000).toISOString(),
			stock_quantity: 3,
			stock_full: false,
			notes: 'Premium armor - limited stock',
			last_updated: nowIso()
		},
		{
			id: 'shop-item-5',
			shop_id: 'test-shop-1',
			item_id: 'iron_ingot',
			buy_price: 9.0,
			sell_price: 7.5,
			previous_buy_price: 8.5,
			previous_sell_price: 7.0,
			previous_price_date: new Date(Date.now() - 172800000).toISOString(),
			stock_quantity: 200,
			stock_full: false,
			notes: 'Good supply of iron ingots',
			last_updated: nowIso()
		},
		{
			id: 'shop-item-6',
			shop_id: 'test-shop-2',
			item_id: 'iron_block',
			buy_price: 80.0,
			sell_price: 70.0,
			previous_buy_price: 75.0,
			previous_sell_price: 65.0,
			previous_price_date: new Date(Date.now() - 345600000).toISOString(),
			stock_quantity: 25,
			stock_full: false,
			notes: 'Iron blocks for building',
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
		},
		{
			id: 'test-suggestion-2',
			userId: 'test-admin-1',
			userDisplayName: 'Test Admin 1',
			createdAt: nowIso(),
			status: 'in-progress',
			title: 'Improve recipe calculation',
			body: 'The recipe calculation could be more accurate for complex items.'
		},
		{
			id: 'test-suggestion-3',
			userId: 'test-user-1',
			userDisplayName: 'Test Player 1',
			createdAt: nowIso(),
			status: 'closed',
			title: 'Add enchantment support',
			body: 'It would be great to track prices for enchanted items separately.'
		}
	],
	recipes: [
		{
			id: 'test-recipe-1',
			item_id: 'oak_planks',
			version: '1_16',
			ingredients: [{ material_id: 'oak_log', quantity: 1 }],
			output_count: 4,
			created_at: nowIso(),
			updated_at: nowIso()
		},
		{
			id: 'test-recipe-2',
			item_id: 'iron_block',
			version: '1_16',
			ingredients: [{ material_id: 'iron_ingot', quantity: 9 }],
			output_count: 1,
			created_at: nowIso(),
			updated_at: nowIso()
		}
	]
}

async function seedEmulator() {
	console.log('🌱 Seeding Firebase emulators with test data...')

	// Run safety check first
	await safetyCheck()

	try {
		// Auth users
		console.log('🔐 Seeding Auth users...')
		for (const user of TEST_DATA.users) {
			if (isDryRun()) {
				console.log(`  [DRY_RUN] Would create/update auth user: ${user.email}`)
				continue
			}

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

		// Recipes
		console.log('📋 Seeding recipes...')
		for (const r of TEST_DATA.recipes) {
			await upsertDoc('recipes', r.id, r)
			console.log(`  ✓ ${r.item_id} recipe`)
		}

		console.log('🎉 Seeding complete!')
	} catch (error) {
		console.error('❌ Seeding failed:', error)
		process.exit(1)
	}
}

seedEmulator().then(() => process.exit(0))
