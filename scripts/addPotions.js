// scripts/addPotions.js
// Node.js script to add all potions to Firestore in bulk
// Usage: node scripts/addPotions.js
// Requires: npm install firebase-admin

const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin
const serviceAccount = require(path.resolve(__dirname, '../service-account.json'))
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// DRY RUN mode: set to true to only log what would be added, false to actually add to Firestore
const DRY_RUN = false

// Helper function to extract base material_id (remove _1, _2, _extended)
function getBaseMaterialId(materialId) {
	return materialId
		.replace(/_1$/, '')
		.replace(/_2$/, '')
		.replace(/_extended$/, '')
}

// All potions with their names, material_ids, and prices
const POTIONS = [
	{ name: 'arrow of fire resistance', material_id: 'arrow_of_fire_resistance_1', price: 7 },
	{
		name: 'arrow of fire resistance (extended)',
		material_id: 'arrow_of_fire_resistance_extended',
		price: 7
	},
	{ name: 'arrow of swiftness', material_id: 'arrow_of_swiftness_1', price: 6 },
	{ name: 'arrow of swiftness II', material_id: 'arrow_of_swiftness_2', price: 7 },
	{
		name: 'arrow of swiftness (extended)',
		material_id: 'arrow_of_swiftness_extended',
		price: 7
	},
	{ name: 'arrow of slowness', material_id: 'arrow_of_slowness_1', price: 6 },
	{
		name: 'arrow of slowness (extended)',
		material_id: 'arrow_of_slowness_extended',
		price: 7
	},
	{ name: 'arrow of slowness IV', material_id: 'arrow_of_slowness_2', price: 7 },
	{ name: 'arrow of strength', material_id: 'arrow_of_strength_1', price: 6 },
	{ name: 'arrow of strength II', material_id: 'arrow_of_strength_2', price: 7 },
	{
		name: 'arrow of strength (extended)',
		material_id: 'arrow_of_strength_extended',
		price: 7
	},
	{ name: 'arrow of leaping', material_id: 'arrow_of_leaping_1', price: 6 },
	{ name: 'arrow of leaping II', material_id: 'arrow_of_leaping_2', price: 7 },
	{
		name: 'arrow of leaping (extended)',
		material_id: 'arrow_of_leaping_extended',
		price: 7
	},
	{ name: 'arrow of healing', material_id: 'arrow_of_healing_1', price: 8 },
	{ name: 'arrow of healing II', material_id: 'arrow_of_healing_2', price: 8 },
	{ name: 'arrow of harming', material_id: 'arrow_of_harming_1', price: 9 },
	{ name: 'arrow of harming II', material_id: 'arrow_of_harming_2', price: 9 },
	{ name: 'arrow of poison', material_id: 'arrow_of_poison_1', price: 6 },
	{ name: 'arrow of poison II', material_id: 'arrow_of_poison_2', price: 6 },
	{
		name: 'arrow of poison (extended)',
		material_id: 'arrow_of_poison_extended',
		price: 6
	},
	{ name: 'arrow of regeneration', material_id: 'arrow_of_regeneration_1', price: 9 },
	{ name: 'arrow of regeneration II', material_id: 'arrow_of_regeneration_2', price: 9 },
	{
		name: 'arrow of regeneration (extended)',
		material_id: 'arrow_of_regeneration_extended',
		price: 9
	},
	{ name: 'arrow of water breathing', material_id: 'arrow_of_water_breathing_1', price: 6 },
	{
		name: 'arrow of water breathing (extended)',
		material_id: 'arrow_of_water_breathing_extended',
		price: 6
	},
	{ name: 'arrow of night vision', material_id: 'arrow_of_night_vision_1', price: 8 },
	{
		name: 'arrow of night vision (extended)',
		material_id: 'arrow_of_night_vision_extended',
		price: 8
	},
	{ name: 'arrow of invisibility', material_id: 'arrow_of_invisibility_1', price: 9 },
	{
		name: 'arrow of invisibility (extended)',
		material_id: 'arrow_of_invisibility_extended',
		price: 9
	},
	{ name: 'arrow of slow falling', material_id: 'arrow_of_slow_falling_1', price: 7 },
	{
		name: 'arrow of slow falling (extended)',
		material_id: 'arrow_of_slow_falling_extended',
		price: 7
	},
	{
		name: 'arrow of the turtle master',
		material_id: 'arrow_of_the_turtle_master_1',
		price: 7
	},
	{
		name: 'arrow of the turtle master II',
		material_id: 'arrow_of_the_turtle_master_2',
		price: 7
	},
	{
		name: 'arrow of the turtle master (extended)',
		material_id: 'arrow_of_the_turtle_master_extended',
		price: 7
	},
	{ name: 'arrow of weakness', material_id: 'arrow_of_weakness_1', price: 6 },
	{
		name: 'arrow of weakness (extended)',
		material_id: 'arrow_of_weakness_extended',
		price: 6
	},
	{ name: 'arrow of wind charging', material_id: 'arrow_of_wind_charging_1', price: 9 },
	{ name: 'arrow of weaving', material_id: 'arrow_of_weaving_1', price: 6 },
	{ name: 'arrow of oozing', material_id: 'arrow_of_oozing_1', price: 10 },
	{ name: 'arrow of infestation', material_id: 'arrow_of_infestation_1', price: 6 }
]

// Function to generate all potion items
function generatePotions() {
	return POTIONS.map((potion) => {
		const baseMaterialId = getBaseMaterialId(potion.material_id)
		const image = `/images/items/${baseMaterialId}.png`
		const url = `https://minecraft.wiki/w/${baseMaterialId}`

		return {
			name: potion.name,
			material_id: potion.material_id,
			image,
			url,
			stack: 1,
			category: 'brewing',
			version: '1.16',
			version_removed: null,
			price: potion.price,
			prices_by_version: {
				'1_16': potion.price
			}
		}
	})
}

// Check if potion already exists in database
async function potionExists(materialId) {
	const snapshot = await db.collection('items').where('material_id', '==', materialId).get()
	return !snapshot.empty
}

async function main() {
	console.log('Starting bulk addition of potions...')
	console.log(`DRY RUN mode: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`)
	console.log('')

	const potions = generatePotions()
	console.log(`Generated ${potions.length} potions`)
	console.log('')

	let added = 0,
		skipped = 0,
		failed = 0

	for (const potion of potions) {
		try {
			// Check if potion already exists
			const exists = await potionExists(potion.material_id)
			if (exists) {
				console.log(`⏭️  Skipped ${potion.name} - already exists`)
				skipped++
				continue
			}

			if (DRY_RUN) {
				console.log(
					`[DRY RUN] Would add: ${potion.name} (${potion.material_id}) - Price: $${potion.price}`
				)
			} else {
				await db.collection('items').add(potion)
				console.log(
					`✅ Added: ${potion.name} (${potion.material_id}) - Price: $${potion.price}`
				)
			}
			added++
		} catch (e) {
			failed++
			console.error(`❌ Failed to add ${potion.name}:`, e.message)
		}
	}

	console.log('')
	console.log('='.repeat(60))
	console.log('BULK ADDITION SUMMARY')
	console.log('='.repeat(60))
	console.log(`Total potions processed: ${potions.length}`)
	console.log(`Potions ${DRY_RUN ? 'would be added' : 'added'}: ${added}`)
	console.log(`Potions skipped (already exist): ${skipped}`)
	console.log(`Potions failed: ${failed}`)

	if (DRY_RUN) {
		console.log('')
		console.log('🔍 This was a DRY RUN - no changes were made.')
		console.log('💡 Set DRY_RUN = false to apply changes.')
	} else {
		console.log('')
		console.log('✨ Bulk addition complete!')
	}
}

// Handle errors and cleanup
main()
	.catch(console.error)
	.finally(() => {
		process.exit()
	})
