// scripts/updateEnchantedBookPrices.js
// Node.js script to update enchanted book prices from a data table
// Usage: node scripts/updateEnchantedBookPrices.js
// Requires: npm install firebase-admin

const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin
const serviceAccount = require(path.resolve(__dirname, '../service-account.json'))
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// DRY RUN mode: set to true to only log what would be updated, false to actually update
const DRY_RUN = false

// PRICING DATA - From your CSV file
const PRICING_DATA = {
	// Special/Universal Enchantments
	mending_1: 1400,
	curse_of_vanishing_1: 100,
	curse_of_binding_1: 150,

	// Weapon Enchantments
	sharpness_1: 240,
	sharpness_2: 480,
	sharpness_3: 720,
	sharpness_4: 960,
	sharpness_5: 1200,
	smite_1: 140,
	smite_2: 280,
	smite_3: 420,
	smite_4: 560,
	smite_5: 700,
	bane_of_arthropods_1: 80,
	bane_of_arthropods_2: 160,
	bane_of_arthropods_3: 240,
	bane_of_arthropods_4: 320,
	bane_of_arthropods_5: 400,
	looting_1: 334,
	looting_2: 667,
	looting_3: 1000,
	fire_aspect_1: 250,
	fire_aspect_2: 500,
	knockback_1: 200,
	knockback_2: 400,
	sweeping_1: 300,
	sweeping_2: 600,
	sweeping_3: 900,

	// Armor Enchantments
	protection_1: 275,
	protection_2: 550,
	protection_3: 825,
	protection_4: 1100,
	fire_protection_1: 150,
	fire_protection_2: 300,
	fire_protection_3: 450,
	fire_protection_4: 600,
	blast_protection_1: 125,
	blast_protection_2: 250,
	blast_protection_3: 375,
	blast_protection_4: 500,
	projectile_protection_1: 125,
	projectile_protection_2: 250,
	projectile_protection_3: 375,
	projectile_protection_4: 500,
	thorns_1: 234,
	thorns_2: 467,
	thorns_3: 700,
	respiration_1: 267,
	respiration_2: 534,
	respiration_3: 800,
	aqua_affinity_1: 400,
	depth_strider_1: 284,
	depth_strider_2: 567,
	depth_strider_3: 850,
	frost_walker_1: 450,
	frost_walker_2: 900,
	feather_falling_1: 200,
	feather_falling_2: 400,
	feather_falling_3: 600,
	feather_falling_4: 800,

	// Tool Enchantments
	efficiency_1: 200,
	efficiency_2: 400,
	efficiency_3: 600,
	efficiency_4: 800,
	efficiency_5: 1000,
	silk_touch_1: 1300,
	fortune_1: 400,
	fortune_2: 800,
	fortune_3: 1200,
	unbreaking_1: 250,
	unbreaking_2: 500,
	unbreaking_3: 750,

	// Ranged Weapon Enchantments
	power_1: 220,
	power_2: 440,
	power_3: 660,
	power_4: 880,
	power_5: 1100,
	punch_1: 200,
	punch_2: 400,
	flame_1: 500,
	infinity_1: 1200,
	piercing_1: 150,
	piercing_2: 300,
	piercing_3: 450,
	piercing_4: 600,
	multishot_1: 700,
	quick_charge_1: 200,
	quick_charge_2: 400,
	quick_charge_3: 600,
	loyalty_1: 200,
	loyalty_2: 400,
	loyalty_3: 600,
	riptide_1: 200,
	riptide_2: 400,
	riptide_3: 600,
	channeling_1: 800,
	impaling_1: 140,
	impaling_2: 280,
	impaling_3: 420,
	impaling_4: 560,
	impaling_5: 700,

	// Fishing Enchantments
	luck_of_the_sea_1: 167,
	luck_of_the_sea_2: 334,
	luck_of_the_sea_3: 500,
	lure_1: 167,
	lure_2: 334,
	lure_3: 500,

	// Special Movement Enchantments
	soul_speed_1: 367,
	soul_speed_2: 734,
	soul_speed_3: 1100
}

// Get material_id key from enchantment name and level
function getMaterialIdKey(materialId) {
	// Extract enchantment and level from material_id like "enchanted_book_sharpness_3"
	const match = materialId.match(/enchanted_book_(.+)_(\d+)/)
	if (match) {
		const [, enchantment, level] = match
		return `${enchantment}_${level}`
	}
	return null
}

// Get all enchanted books from database
async function getEnchantedBooks() {
	const snapshot = await db.collection('items').where('category', '==', 'enchantments').get()

	return snapshot.docs.map((doc) => ({
		id: doc.id,
		...doc.data()
	}))
}

// Update a single enchanted book price
async function updateBookPrice(bookId, newPrice, bookName) {
	if (DRY_RUN) {
		console.log(`[DRY RUN] Would update "${bookName}" to price $${newPrice}`)
		return true
	}

	try {
		await db.collection('items').doc(bookId).update({
			price: newPrice
		})
		console.log(`✅ Updated "${bookName}" to price $${newPrice}`)
		return true
	} catch (error) {
		console.error(`❌ Failed to update "${bookName}":`, error.message)
		return false
	}
}

async function main() {
	console.log('Starting enchanted book price updates...')
	console.log(`DRY RUN mode: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`)
	console.log('')

	const pricingData = PRICING_DATA
	console.log(
		`Loaded pricing data for ${Object.keys(pricingData).length} enchantment combinations`
	)
	console.log('')

	// Get all enchanted books from database
	const enchantedBooks = await getEnchantedBooks()
	console.log(`Found ${enchantedBooks.length} enchanted books in database`)
	console.log('')

	let updated = 0,
		skipped = 0,
		failed = 0

	for (const book of enchantedBooks) {
		const materialIdKey = getMaterialIdKey(book.material_id)

		if (!materialIdKey) {
			console.log(
				`⚠️  Skipped "${book.name}" - couldn't parse material_id: ${book.material_id}`
			)
			skipped++
			continue
		}

		const newPrice = pricingData[materialIdKey]

		if (newPrice === undefined) {
			console.log(`⚠️  Skipped "${book.name}" - no pricing data for: ${materialIdKey}`)
			skipped++
			continue
		}

		// Check if price actually needs updating
		if (book.price === newPrice) {
			console.log(`⏭️  Skipped "${book.name}" - price already correct ($${newPrice})`)
			skipped++
			continue
		}

		const success = await updateBookPrice(book.id, newPrice, book.name)
		if (success) {
			updated++
		} else {
			failed++
		}
	}

	console.log('')
	console.log('='.repeat(60))
	console.log('PRICE UPDATE SUMMARY')
	console.log('='.repeat(60))
	console.log(`Total enchanted books processed: ${enchantedBooks.length}`)
	console.log(`Books ${DRY_RUN ? 'would be updated' : 'updated'}: ${updated}`)
	console.log(`Books skipped: ${skipped}`)
	console.log(`Books failed: ${failed}`)

	if (DRY_RUN) {
		console.log('')
		console.log('🔍 This was a DRY RUN - no changes were made.')
		console.log('💡 Set DRY_RUN = false to apply changes.')
	} else {
		console.log('')
		console.log('✨ Price updates complete!')
	}
}

// Handle errors and cleanup
main()
	.catch(console.error)
	.finally(() => {
		process.exit()
	})
