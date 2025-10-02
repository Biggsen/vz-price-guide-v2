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

// Generate a fixed timestamp for consistent test data
const FIXED_TIMESTAMP = new Date('2025-09-19T10:30:00.000Z').toISOString()

function nowIso() {
	return FIXED_TIMESTAMP
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
				'1_16': 2.0
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
				'1_16': 280.0
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
				'1_16': 2.0
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
				'1_16': 8
			},
			recipes_by_version: {}
		},
		{
			id: 'spruce_log',
			material_id: 'spruce_log',
			name: 'spruce log',
			image: '/images/items/spruce_log.png',
			url: 'https://minecraft.fandom.com/wiki/Spruce_Log',
			stack: 64,
			category: 'wood',
			subcategory: 'spruce',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 8
			},
			recipes_by_version: {}
		},
		{
			id: 'jungle_log',
			material_id: 'jungle_log',
			name: 'jungle log',
			image: '/images/items/jungle_log.png',
			url: 'https://minecraft.fandom.com/wiki/Jungle_Log',
			stack: 64,
			category: 'wood',
			subcategory: 'jungle',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 8
			},
			recipes_by_version: {}
		},
		{
			id: 'dark_oak_log',
			material_id: 'dark_oak_log',
			name: 'dark oak log',
			image: '/images/items/dark_oak_log.png',
			url: 'https://minecraft.fandom.com/wiki/Dark_Oak_Log',
			stack: 64,
			category: 'wood',
			subcategory: 'dark_oak',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 8
			},
			recipes_by_version: {}
		},
		{
			id: 'acacia_log',
			material_id: 'acacia_log',
			name: 'acacia log',
			image: '/images/items/acacia_log.png',
			url: 'https://minecraft.fandom.com/wiki/Acacia_Log',
			stack: 64,
			category: 'wood',
			subcategory: 'acacia',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 8
			},
			recipes_by_version: {}
		},
		{
			id: 'birch_log',
			material_id: 'birch_log',
			name: 'birch log',
			image: '/images/items/birch_log.png',
			url: 'https://minecraft.fandom.com/wiki/Birch_Log',
			stack: 64,
			category: 'wood',
			subcategory: 'birch',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 8
			},
			recipes_by_version: {}
		},
		{
			id: 'cherry_log',
			material_id: 'cherry_log',
			name: 'cherry log',
			image: '/images/items/cherry_log.png',
			url: 'https://minecraft.fandom.com/wiki/Cherry_Log',
			stack: 64,
			category: 'wood',
			subcategory: 'cherry',
			version: '1.20',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_20': 8
			},
			recipes_by_version: {}
		},
		{
			id: 'mangrove_log',
			material_id: 'mangrove_log',
			name: 'mangrove log',
			image: '/images/items/mangrove_log.png',
			url: 'https://minecraft.fandom.com/wiki/Mangrove_Log',
			stack: 64,
			category: 'wood',
			subcategory: 'mangrove',
			version: '1.19',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_19': 10
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
			category: 'ocean',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 500.0
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
			category: 'archaeology',
			subcategory: '',
			version: '1.20',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_20': 9.0
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
				'1_16': 2240.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'diamond', quantity: 8 }],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_helmet',
			material_id: 'diamond_helmet',
			name: 'diamond helmet',
			image: '/images/items/diamond_helmet.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Helmet',
			stack: 1,
			category: 'armor',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 1400.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'diamond', quantity: 5 }],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_leggings',
			material_id: 'diamond_leggings',
			name: 'diamond leggings',
			image: '/images/items/diamond_leggings.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Leggings',
			stack: 1,
			category: 'armor',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 1960.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'diamond', quantity: 7 }],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_boots',
			material_id: 'diamond_boots',
			name: 'diamond boots',
			image: '/images/items/diamond_boots.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Boots',
			stack: 1,
			category: 'armor',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 1120.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'diamond', quantity: 4 }],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_pickaxe',
			material_id: 'diamond_pickaxe',
			name: 'diamond pickaxe',
			image: '/images/items/diamond_pickaxe.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Pickaxe',
			stack: 1,
			category: 'tools',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 842.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'diamond', quantity: 3 },
						{ material_id: 'stick', quantity: 2 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_axe',
			material_id: 'diamond_axe',
			name: 'diamond axe',
			image: '/images/items/diamond_axe.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Axe',
			stack: 1,
			category: 'tools',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 842.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'diamond', quantity: 3 },
						{ material_id: 'stick', quantity: 2 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_sword',
			material_id: 'diamond_sword',
			name: 'diamond sword',
			image: '/images/items/diamond_sword.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Sword',
			stack: 1,
			category: 'weapons',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 561.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'diamond', quantity: 2 },
						{ material_id: 'stick', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_shovel',
			material_id: 'diamond_shovel',
			name: 'diamond shovel',
			image: '/images/items/diamond_shovel.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Shovel',
			stack: 1,
			category: 'tools',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 282.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'diamond', quantity: 1 },
						{ material_id: 'stick', quantity: 2 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'diamond_hoe',
			material_id: 'diamond_hoe',
			name: 'diamond hoe',
			image: '/images/items/diamond_hoe.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Hoe',
			stack: 1,
			category: 'tools',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 562.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'diamond', quantity: 2 },
						{ material_id: 'stick', quantity: 2 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'bow',
			material_id: 'bow',
			name: 'bow',
			image: '/images/items/bow.png',
			url: 'https://minecraft.fandom.com/wiki/Bow',
			stack: 1,
			category: 'weapons',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 9.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'stick', quantity: 3 },
						{ material_id: 'string', quantity: 3 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'string',
			material_id: 'string',
			name: 'string',
			image: '/images/items/string.png',
			url: 'https://minecraft.fandom.com/wiki/String',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 2.0
			},
			recipes_by_version: {}
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
				'1_16': 20.0,
				'1_18': 15.0
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
				'1_16': 135.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'iron_ingot', quantity: 9 }],
					output_count: 1
				}
			}
		},
		{
			id: 'cooked_beef',
			material_id: 'cooked_beef',
			name: 'steak',
			image: '/images/items/cooked_beef.png',
			url: 'https://minecraft.fandom.com/wiki/Steak',
			stack: 64,
			category: 'food',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 8
			},
			recipes_by_version: {}
		},
		{
			id: 'golden_carrot',
			material_id: 'golden_carrot',
			name: 'golden carrot',
			image: '/images/items/golden_carrot.png',
			url: 'https://minecraft.fandom.com/wiki/Golden_Carrot',
			stack: 64,
			category: 'food',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 56.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'gold_nugget', quantity: 8 },
						{ material_id: 'carrot', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'bread',
			material_id: 'bread',
			name: 'bread',
			image: '/images/items/bread.png',
			url: 'https://minecraft.fandom.com/wiki/Bread',
			stack: 64,
			category: 'food',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 6
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'wheat', quantity: 3 }],
					output_count: 1
				}
			}
		},
		{
			id: 'torch',
			material_id: 'torch',
			name: 'torch',
			image: '/images/items/torch.gif',
			url: 'https://minecraft.fandom.com/wiki/Torch',
			stack: 64,
			category: 'light',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 1.5
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'stick', quantity: 1 },
						{ material_id: 'coal', quantity: 1 }
					],
					output_count: 4
				}
			}
		},
		{
			id: 'arrow',
			material_id: 'arrow',
			name: 'arrow',
			image: '/images/items/arrow.png',
			url: 'https://minecraft.fandom.com/wiki/Arrow',
			stack: 64,
			category: 'weapons',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 2.8
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'flint', quantity: 1 },
						{ material_id: 'stick', quantity: 1 },
						{ material_id: 'feather', quantity: 1 }
					],
					output_count: 4
				}
			}
		},
		{
			id: 'coal',
			material_id: 'coal',
			name: 'coal',
			image: '/images/items/coal.png',
			url: 'https://minecraft.fandom.com/wiki/Coal',
			stack: 64,
			category: 'ores',
			subcategory: 'coal',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 8,
				'1_18': 5
			},
			recipes_by_version: {}
		},
		{
			id: 'lapis_lazuli',
			material_id: 'lapis_lazuli',
			name: 'lapis lazuli',
			image: '/images/items/lapis_lazuli.png',
			url: 'https://minecraft.fandom.com/wiki/Lapis_Lazuli',
			stack: 64,
			category: 'ores',
			subcategory: 'lapis',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 5
			},
			recipes_by_version: {}
		},
		{
			id: 'paper',
			material_id: 'paper',
			name: 'paper',
			image: '/images/items/paper.png',
			url: 'https://minecraft.fandom.com/wiki/Paper',
			stack: 64,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 1.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'sugar_cane', quantity: 3 }],
					output_count: 3
				}
			}
		},
		{
			id: 'firework_rocket',
			material_id: 'firework_rocket',
			name: 'firework rocket',
			image: '/images/items/firework_rocket.png',
			url: 'https://minecraft.fandom.com/wiki/Firework_Rocket',
			stack: 64,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 3.7
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'paper', quantity: 1 },
						{ material_id: 'gunpowder', quantity: 1 }
					],
					output_count: 3
				}
			}
		},
		{
			id: 'cooked_cod',
			material_id: 'cooked_cod',
			name: 'cooked cod',
			image: '/images/items/cooked_cod.png',
			url: 'https://minecraft.fandom.com/wiki/Cooked_Cod',
			stack: 64,
			category: 'food',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 4
			},
			recipes_by_version: {}
		},
		{
			id: 'gold_block',
			material_id: 'gold_block',
			name: 'gold block',
			image: '/images/items/gold_block.png',
			url: 'https://minecraft.fandom.com/wiki/Gold_Block',
			stack: 64,
			category: 'ores',
			subcategory: 'gold',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 540.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'gold_ingot', quantity: 9 }],
					output_count: 1
				}
			}
		},
		{
			id: 'emerald',
			material_id: 'emerald',
			name: 'emerald',
			image: '/images/items/emerald.png',
			url: 'https://minecraft.fandom.com/wiki/Emerald',
			stack: 64,
			category: 'ores',
			subcategory: 'emerald',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 100.0
			},
			recipes_by_version: {}
		},
		{
			id: 'redstone',
			material_id: 'redstone',
			name: 'redstone dust',
			image: '/images/items/redstone.png',
			url: 'https://minecraft.fandom.com/wiki/Redstone_Dust',
			stack: 64,
			category: 'ores',
			subcategory: 'redstone',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 3
			},
			recipes_by_version: {}
		},
		{
			id: 'diamond_block',
			material_id: 'diamond_block',
			name: 'diamond block',
			image: '/images/items/diamond_block.png',
			url: 'https://minecraft.fandom.com/wiki/Diamond_Block',
			stack: 64,
			category: 'ores',
			subcategory: 'diamond',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 2520.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'diamond', quantity: 9 }],
					output_count: 1
				}
			}
		},
		{
			id: 'anvil',
			material_id: 'anvil',
			name: 'anvil',
			image: '/images/items/anvil.png',
			url: 'https://minecraft.fandom.com/wiki/Anvil',
			stack: 64,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 620.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'iron_block', quantity: 3 },
						{ material_id: 'iron_ingot', quantity: 4 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'enchanted_book_mending_1',
			material_id: 'enchanted_book_mending_1',
			name: 'enchanted book (mending)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'tools',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 1400.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_unbreaking_3',
			material_id: 'enchanted_book_unbreaking_3',
			name: 'enchanted book (unbreaking iii)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'tools',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 750.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_efficiency_4',
			material_id: 'enchanted_book_efficiency_4',
			name: 'enchanted book (efficiency iv)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'tools',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 800.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_sharpness_5',
			material_id: 'enchanted_book_sharpness_5',
			name: 'enchanted book (sharpness v)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'weapons',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 1200.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_power_3',
			material_id: 'enchanted_book_power_3',
			name: 'enchanted book (power iii)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'weapons',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 660.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_efficiency_5',
			material_id: 'enchanted_book_efficiency_5',
			name: 'enchanted book (efficiency v)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'tools',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 1000.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_fortune_3',
			material_id: 'enchanted_book_fortune_3',
			name: 'enchanted book (fortune iii)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'tools',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 1200.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_silk_touch',
			material_id: 'enchanted_book_silk_touch',
			name: 'enchanted book (silk touch)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'tools',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 1300.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_protection_4',
			material_id: 'enchanted_book_protection_4',
			name: 'enchanted book (protection iv)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'armor',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 1100.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_feather_falling_4',
			material_id: 'enchanted_book_feather_falling_4',
			name: 'enchanted book (feather falling iv)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'armor',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 800.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_aqua_affinity',
			material_id: 'enchanted_book_aqua_affinity',
			name: 'enchanted book (aqua affinity)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'armor',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 400.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_respiration_3',
			material_id: 'enchanted_book_respiration_3',
			name: 'enchanted book (respiration iii)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'armor',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 800.0
			},
			recipes_by_version: {}
		},
		{
			id: 'enchanted_book_depth_strider_3',
			material_id: 'enchanted_book_depth_strider_3',
			name: 'enchanted book (depth strider iii)',
			image: '/images/items/enchanted_book.webp',
			url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
			stack: 64,
			category: 'enchantments',
			subcategory: 'armor',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 850.0
			},
			recipes_by_version: {}
		},
		{
			id: 'shulker_box',
			material_id: 'shulker_box',
			name: 'shulker box',
			image: '/images/items/shulker_box.gif',
			url: 'https://minecraft.fandom.com/wiki/Shulker_Box',
			stack: 64,
			category: 'end',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 516.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'shulker_shell', quantity: 2 },
						{ material_id: 'chest', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'ender_chest',
			material_id: 'ender_chest',
			name: 'ender chest',
			image: '/images/items/ender_chest.gif',
			url: 'https://minecraft.fandom.com/wiki/Ender_Chest',
			stack: 64,
			category: 'end',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 231.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'obsidian', quantity: 8 },
						{ material_id: 'eye_of_ender', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'netherite_scrap',
			material_id: 'netherite_scrap',
			name: 'netherite scrap',
			image: '/images/items/netherite_scrap.png',
			url: 'https://minecraft.fandom.com/wiki/Netherite_Scrap',
			stack: 64,
			category: 'ores',
			subcategory: 'netherite',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 150.0
			},
			recipes_by_version: {}
		},
		{
			id: 'ancient_debris',
			material_id: 'ancient_debris',
			name: 'ancient debris',
			image: '/images/items/ancient_debris.png',
			url: 'https://minecraft.fandom.com/wiki/Ancient_Debris',
			stack: 64,
			category: 'ores',
			subcategory: 'netherite',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 160.0
			},
			recipes_by_version: {}
		},
		{
			id: 'elytra',
			material_id: 'elytra',
			name: 'elytra',
			image: '/images/items/elytra.png',
			url: 'https://minecraft.fandom.com/wiki/Elytra',
			stack: 1,
			category: 'end',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 3500.0
			},
			recipes_by_version: {}
		},
		{
			id: 'beacon',
			material_id: 'beacon',
			name: 'beacon',
			image: '/images/items/beacon.png',
			url: 'https://minecraft.fandom.com/wiki/Beacon',
			stack: 64,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 3085.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'obsidian', quantity: 3 },
						{ material_id: 'nether_star', quantity: 1 },
						{ material_id: 'glass', quantity: 5 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'netherite_upgrade_smithing_template',
			material_id: 'netherite_upgrade_smithing_template',
			name: 'netherite upgrade smithing template',
			image: '/images/items/netherite_upgrade_smithing_template.png',
			url: 'https://minecraft.fandom.com/wiki/Netherite_Upgrade_Smithing_Template',
			stack: 64,
			category: 'nether',
			subcategory: '',
			version: '1.20',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_20': 1500.0
			},
			recipes_by_version: {}
		},
		{
			id: 'stick',
			material_id: 'stick',
			name: 'stick',
			image: '/images/items/stick.png',
			url: 'https://minecraft.fandom.com/wiki/Stick',
			stack: 64,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 1.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'oak_planks', quantity: 2 }],
					output_count: 4
				}
			}
		},
		{
			id: 'copper_ingot',
			material_id: 'copper_ingot',
			name: 'copper ingot',
			image: '/images/items/copper_ingot.png',
			url: 'https://minecraft.fandom.com/wiki/Copper_Ingot',
			stack: 64,
			category: 'ores',
			subcategory: 'copper',
			version: '1.17',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_17': 6.0,
				'1_18': 3.0
			},
			recipes_by_version: {}
		},
		{
			id: 'feather',
			material_id: 'feather',
			name: 'feather',
			image: '/images/items/feather.png',
			url: 'https://minecraft.fandom.com/wiki/Feather',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 5
			},
			recipes_by_version: {}
		},
		{
			id: 'gold_nugget',
			material_id: 'gold_nugget',
			name: 'gold nugget',
			image: '/images/items/gold_nugget.png',
			url: 'https://minecraft.fandom.com/wiki/Gold_Nugget',
			stack: 64,
			category: 'ores',
			subcategory: 'gold',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 7
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'gold_ingot', quantity: 1 }],
					output_count: 9
				}
			}
		},
		{
			id: 'carrot',
			material_id: 'carrot',
			name: 'carrot',
			image: '/images/items/carrot.png',
			url: 'https://minecraft.fandom.com/wiki/Carrot',
			stack: 64,
			category: 'food',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 2.0
			},
			recipes_by_version: {}
		},
		{
			id: 'wheat',
			material_id: 'wheat',
			name: 'wheat',
			image: '/images/items/wheat.png',
			url: 'https://minecraft.fandom.com/wiki/Wheat',
			stack: 64,
			category: 'food',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 2.0
			},
			recipes_by_version: {}
		},
		{
			id: 'flint',
			material_id: 'flint',
			name: 'flint',
			image: '/images/items/flint.png',
			url: 'https://minecraft.fandom.com/wiki/Flint',
			stack: 64,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 5.0
			},
			recipes_by_version: {}
		},
		{
			id: 'sugar_cane',
			material_id: 'sugar_cane',
			name: 'sugar cane',
			image: '/images/items/sugar_cane.png',
			url: 'https://minecraft.fandom.com/wiki/Sugar_Cane',
			stack: 64,
			category: 'plants',
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
			id: 'gunpowder',
			material_id: 'gunpowder',
			name: 'gunpowder',
			image: '/images/items/gunpowder.png',
			url: 'https://minecraft.fandom.com/wiki/Gunpowder',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 10.0
			},
			recipes_by_version: {}
		},
		{
			id: 'gold_ingot',
			material_id: 'gold_ingot',
			name: 'gold ingot',
			image: '/images/items/gold_ingot.png',
			url: 'https://minecraft.fandom.com/wiki/Gold_Ingot',
			stack: 64,
			category: 'ores',
			subcategory: 'gold',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 50.0,
				'1_18': 60.0
			},
			recipes_by_version: {}
		},
		{
			id: 'shulker_shell',
			material_id: 'shulker_shell',
			name: 'shulker shell',
			image: '/images/items/shulker_shell.png',
			url: 'https://minecraft.fandom.com/wiki/Shulker_Shell',
			stack: 64,
			category: 'end',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 250.0
			},
			recipes_by_version: {}
		},
		{
			id: 'chest',
			material_id: 'chest',
			name: 'chest',
			image: '/images/items/chest.png',
			url: 'https://minecraft.fandom.com/wiki/Chest',
			stack: 64,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 16.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'oak_planks', quantity: 8 }],
					output_count: 1
				}
			}
		},
		{
			id: 'obsidian',
			material_id: 'obsidian',
			name: 'obsidian',
			image: '/images/items/obsidian.png',
			url: 'https://minecraft.fandom.com/wiki/Obsidian',
			stack: 64,
			category: 'nether',
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
			id: 'eye_of_ender',
			material_id: 'eye_of_ender',
			name: 'eye of ender',
			image: '/images/items/eye_of_ender.png',
			url: 'https://minecraft.fandom.com/wiki/Eye_of_Ender',
			stack: 64,
			category: 'misc',
			subcategory: 'end',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 31.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'blaze_powder', quantity: 1 },
						{ material_id: 'ender_pearl', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'nether_star',
			material_id: 'nether_star',
			name: 'nether star',
			image: '/images/items/nether_star.png',
			url: 'https://minecraft.fandom.com/wiki/Nether_Star',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 3000.0
			},
			recipes_by_version: {}
		},
		{
			id: 'glass',
			material_id: 'glass',
			name: 'glass',
			image: '/images/items/glass.png',
			url: 'https://minecraft.fandom.com/wiki/Glass',
			stack: 64,
			category: 'dyed',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 2.0
			},
			recipes_by_version: {}
		},
		{
			id: 'blaze_powder',
			material_id: 'blaze_powder',
			name: 'blaze powder',
			image: '/images/items/blaze_powder.png',
			url: 'https://minecraft.fandom.com/wiki/Blaze_Powder',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 15.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'blaze_rod', quantity: 1 }],
					output_count: 2
				}
			}
		},
		{
			id: 'ender_pearl',
			material_id: 'ender_pearl',
			name: 'ender pearl',
			image: '/images/items/ender_pearl.png',
			url: 'https://minecraft.fandom.com/wiki/Ender_Pearl',
			stack: 16,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 16.0
			},
			recipes_by_version: {}
		},
		{
			id: 'blaze_rod',
			material_id: 'blaze_rod',
			name: 'blaze rod',
			image: '/images/items/blaze_rod.png',
			url: 'https://minecraft.fandom.com/wiki/Blaze_Rod',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 30.0
			},
			recipes_by_version: {}
		},
		{
			id: 'rabbit_hide',
			material_id: 'rabbit_hide',
			name: 'rabbit hide',
			image: '/images/items/rabbit_hide.png',
			url: 'https://minecraft.fandom.com/wiki/Rabbit_Hide',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 2.0
			},
			recipes_by_version: {}
		},
		{
			id: 'leather',
			material_id: 'leather',
			name: 'leather',
			image: '/images/items/leather.png',
			url: 'https://minecraft.fandom.com/wiki/Leather',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 8.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'rabbit_hide', quantity: 4 }],
					output_count: 1
				}
			}
		},
		{
			id: 'lantern',
			material_id: 'lantern',
			name: 'lantern',
			image: '/images/items/lantern.gif',
			url: 'https://minecraft.fandom.com/wiki/Lantern',
			stack: 64,
			category: 'light',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 21.0,
				'1_18': 15.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'iron_nugget', quantity: 8 },
						{ material_id: 'torch', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_nugget',
			material_id: 'iron_nugget',
			name: 'iron nugget',
			image: '/images/items/iron_nugget.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Nugget',
			stack: 64,
			category: 'ores',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 2.3,
				'1_18': 1.7
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'iron_ingot', quantity: 1 }],
					output_count: 9
				}
			}
		},
		{
			id: 'slime_ball',
			material_id: 'slime_ball',
			name: 'slime ball',
			image: '/images/items/slime_ball.png',
			url: 'https://minecraft.fandom.com/wiki/Slime_Ball',
			stack: 64,
			category: 'drops',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 10.0
			},
			recipes_by_version: {}
		},
		{
			id: 'lead',
			material_id: 'lead',
			name: 'lead',
			image: '/images/items/lead.png',
			url: 'https://minecraft.fandom.com/wiki/Lead',
			stack: 64,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 9.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'string', quantity: 4 },
						{ material_id: 'slime_ball', quantity: 1 }
					],
					output_count: 2
				}
			}
		},
		{
			id: 'saddle',
			material_id: 'saddle',
			name: 'saddle',
			image: '/images/items/saddle.png',
			url: 'https://minecraft.fandom.com/wiki/Saddle',
			stack: 1,
			category: 'utility',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 200.0
			},
			recipes_by_version: {}
		},
		{
			id: 'iron_axe',
			material_id: 'iron_axe',
			name: 'iron axe',
			image: '/images/items/iron_axe.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Axe',
			stack: 1,
			category: 'tools',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 62.0,
				'1_18': 47.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'iron_ingot', quantity: 3 },
						{ material_id: 'stick', quantity: 2 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_pickaxe',
			material_id: 'iron_pickaxe',
			name: 'iron pickaxe',
			image: '/images/items/iron_pickaxe.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Pickaxe',
			stack: 1,
			category: 'tools',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 62.0,
				'1_18': 47.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'iron_ingot', quantity: 3 },
						{ material_id: 'stick', quantity: 2 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_shovel',
			material_id: 'iron_shovel',
			name: 'iron shovel',
			image: '/images/items/iron_shovel.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Shovel',
			stack: 1,
			category: 'tools',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 22.0,
				'1_18': 17.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'iron_ingot', quantity: 1 },
						{ material_id: 'stick', quantity: 2 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_sword',
			material_id: 'iron_sword',
			name: 'iron sword',
			image: '/images/items/iron_sword.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Sword',
			stack: 1,
			category: 'weapons',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 41.0,
				'1_18': 31.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'iron_ingot', quantity: 2 },
						{ material_id: 'stick', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_hoe',
			material_id: 'iron_hoe',
			name: 'iron hoe',
			image: '/images/items/iron_hoe.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Hoe',
			stack: 1,
			category: 'tools',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 42.0,
				'1_18': 32.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'iron_ingot', quantity: 2 },
						{ material_id: 'stick', quantity: 2 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'white_wool',
			material_id: 'white_wool',
			name: 'white wool',
			image: '/images/items/white_wool.png',
			url: 'https://minecraft.fandom.com/wiki/White_Wool',
			stack: 64,
			category: 'dyed',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'static',
			prices_by_version: {
				'1_16': 4.0
			},
			recipes_by_version: {}
		},
		{
			id: 'white_banner',
			material_id: 'white_banner',
			name: 'white banner',
			image: '/images/items/white_banner.png',
			url: 'https://minecraft.fandom.com/wiki/White_Banner',
			stack: 16,
			category: 'dyed',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 25.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [
						{ material_id: 'white_wool', quantity: 6 },
						{ material_id: 'stick', quantity: 1 }
					],
					output_count: 1
				}
			}
		},
		{
			id: 'name_tag',
			material_id: 'name_tag',
			name: 'name tag',
			image: '/images/items/name_tag.png',
			url: 'https://minecraft.fandom.com/wiki/Name_Tag',
			stack: 64,
			category: 'utility',
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
			id: 'iron_helmet',
			material_id: 'iron_helmet',
			name: 'iron helmet',
			image: '/images/items/iron_helmet.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Helmet',
			stack: 1,
			category: 'armor',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 100.0,
				'1_18': 75.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'iron_ingot', quantity: 5 }],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_chestplate',
			material_id: 'iron_chestplate',
			name: 'iron chestplate',
			image: '/images/items/iron_chestplate.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Chestplate',
			stack: 1,
			category: 'armor',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 160.0,
				'1_18': 120.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'iron_ingot', quantity: 8 }],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_leggings',
			material_id: 'iron_leggings',
			name: 'iron leggings',
			image: '/images/items/iron_leggings.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Leggings',
			stack: 1,
			category: 'armor',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 140.0,
				'1_18': 105.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'iron_ingot', quantity: 7 }],
					output_count: 1
				}
			}
		},
		{
			id: 'iron_boots',
			material_id: 'iron_boots',
			name: 'iron boots',
			image: '/images/items/iron_boots.png',
			url: 'https://minecraft.fandom.com/wiki/Iron_Boots',
			stack: 1,
			category: 'armor',
			subcategory: '',
			version: '1.16',
			version_removed: null,
			pricing_type: 'dynamic',
			prices_by_version: {
				'1_16': 80.0,
				'1_18': 60.0
			},
			recipes_by_version: {
				'1_16': {
					ingredients: [{ material_id: 'iron_ingot', quantity: 4 }],
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
			createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 3)), // 3 days ago
			status: 'open',
			title: 'Add more building blocks',
			body: 'Would be great to have more variety in building blocks for creative builds.'
		},
		{
			id: 'test-suggestion-2',
			userId: 'test-admin-1',
			userDisplayName: 'Test Admin 1',
			createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 2)), // 2 days ago
			status: 'in-progress',
			title: 'Improve recipe calculation',
			body: 'The recipe calculation could be more accurate for complex items.'
		},
		{
			id: 'test-suggestion-3',
			userId: 'test-user-1',
			userDisplayName: 'Test Player 1',
			createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 1)), // 1 day ago
			status: 'closed',
			title: 'Add enchantment support',
			body: 'It would be great to track prices for enchanted items separately. Yes.'
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
