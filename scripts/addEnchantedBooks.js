// scripts/addEnchantedBooks.js
// Node.js script to add all enchanted books to Firestore in bulk
// Usage: node scripts/addEnchantedBooks.js
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
const DRY_RUN = true

// Default values for enchanted books
const ENCHANTED_BOOK_DEFAULTS = {
	image: 'https://minecraft.fandom.com/wiki/Enchanted_Book#/media/File:Enchanted_Book_JE1_BE1.png',
	url: 'https://minecraft.fandom.com/wiki/Enchanted_Book',
	stack: 1,
	category: 'utility', // Using 'utility' since 'magic' isn't in your enabled categories
	subcategory: 'Enchanted Books',
	price: 5.0 // Default price, can be adjusted later
}

// All enchantments with their max levels
const ENCHANTMENTS = {
	// Armor Enchantments
	protection: { maxLevel: 4, displayName: 'Protection' },
	fire_protection: { maxLevel: 4, displayName: 'Fire Protection' },
	feather_falling: { maxLevel: 4, displayName: 'Feather Falling' },
	blast_protection: { maxLevel: 4, displayName: 'Blast Protection' },
	projectile_protection: { maxLevel: 4, displayName: 'Projectile Protection' },
	respiration: { maxLevel: 3, displayName: 'Respiration' },
	aqua_affinity: { maxLevel: 1, displayName: 'Aqua Affinity' },
	thorns: { maxLevel: 3, displayName: 'Thorns' },
	depth_strider: { maxLevel: 3, displayName: 'Depth Strider' },
	frost_walker: { maxLevel: 2, displayName: 'Frost Walker' },
	soul_speed: { maxLevel: 3, displayName: 'Soul Speed' },

	// Weapon Enchantments
	sharpness: { maxLevel: 5, displayName: 'Sharpness' },
	smite: { maxLevel: 5, displayName: 'Smite' },
	bane_of_arthropods: { maxLevel: 5, displayName: 'Bane of Arthropods' },
	knockback: { maxLevel: 2, displayName: 'Knockback' },
	fire_aspect: { maxLevel: 2, displayName: 'Fire Aspect' },
	looting: { maxLevel: 3, displayName: 'Looting' },
	sweeping: { maxLevel: 3, displayName: 'Sweeping Edge' },

	// Ranged Weapon Enchantments
	power: { maxLevel: 5, displayName: 'Power' },
	punch: { maxLevel: 2, displayName: 'Punch' },
	flame: { maxLevel: 1, displayName: 'Flame' },
	infinity: { maxLevel: 1, displayName: 'Infinity' },
	impaling: { maxLevel: 5, displayName: 'Impaling' },
	loyalty: { maxLevel: 3, displayName: 'Loyalty' },
	riptide: { maxLevel: 3, displayName: 'Riptide' },
	channeling: { maxLevel: 1, displayName: 'Channeling' },
	multishot: { maxLevel: 1, displayName: 'Multishot' },
	quick_charge: { maxLevel: 3, displayName: 'Quick Charge' },
	piercing: { maxLevel: 4, displayName: 'Piercing' },

	// Tool Enchantments
	efficiency: { maxLevel: 5, displayName: 'Efficiency' },
	silk_touch: { maxLevel: 1, displayName: 'Silk Touch' },
	unbreaking: { maxLevel: 3, displayName: 'Unbreaking' },
	fortune: { maxLevel: 3, displayName: 'Fortune' },
	lure: { maxLevel: 3, displayName: 'Lure' },
	luck_of_the_sea: { maxLevel: 3, displayName: 'Luck of the Sea' },

	// Universal Enchantments
	mending: { maxLevel: 1, displayName: 'Mending' },
	curse_of_vanishing: { maxLevel: 1, displayName: 'Curse of Vanishing' },
	curse_of_binding: { maxLevel: 1, displayName: 'Curse of Binding' }
}

// Function to generate all enchanted books
function generateEnchantedBooks() {
	const books = []

	for (const [enchantmentId, enchantmentData] of Object.entries(ENCHANTMENTS)) {
		for (let level = 1; level <= enchantmentData.maxLevel; level++) {
			const displayName =
				enchantmentData.maxLevel === 1
					? enchantmentData.displayName
					: `${enchantmentData.displayName} ${toRoman(level)}`

			const book = {
				name: `enchanted book (${displayName.toLowerCase()})`,
				material_id: `enchanted_book_${enchantmentId}_${level}`,
				...ENCHANTED_BOOK_DEFAULTS,
				// Adjust price based on level (higher levels cost more)
				price: ENCHANTED_BOOK_DEFAULTS.price + (level - 1) * 2
			}

			books.push(book)
		}
	}

	return books
}

// Convert number to Roman numerals
function toRoman(num) {
	const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
	return romanNumerals[num - 1] || num.toString()
}

// Check if enchanted book already exists in database
async function enchantedBookExists(materialId) {
	const snapshot = await db.collection('items').where('material_id', '==', materialId).get()
	return !snapshot.empty
}

async function main() {
	console.log('Starting bulk addition of enchanted books...')
	console.log(`DRY RUN mode: ${DRY_RUN ? 'ENABLED' : 'DISABLED'}`)
	console.log('')

	const enchantedBooks = generateEnchantedBooks()
	console.log(`Generated ${enchantedBooks.length} enchanted books`)
	console.log('')

	let added = 0,
		skipped = 0,
		failed = 0

	for (const book of enchantedBooks) {
		try {
			// Check if book already exists
			const exists = await enchantedBookExists(book.material_id)
			if (exists) {
				console.log(`⏭️  Skipped ${book.name} - already exists`)
				skipped++
				continue
			}

			if (DRY_RUN) {
				console.log(
					`[DRY RUN] Would add: ${book.name} (${book.material_id}) - Price: $${book.price}`
				)
			} else {
				await db.collection('items').add(book)
				console.log(`✅ Added: ${book.name} (${book.material_id}) - Price: $${book.price}`)
			}
			added++
		} catch (e) {
			failed++
			console.error(`❌ Failed to add ${book.name}:`, e.message)
		}
	}

	console.log('')
	console.log('='.repeat(60))
	console.log('BULK ADDITION SUMMARY')
	console.log('='.repeat(60))
	console.log(`Total enchanted books processed: ${enchantedBooks.length}`)
	console.log(`Books ${DRY_RUN ? 'would be added' : 'added'}: ${added}`)
	console.log(`Books skipped (already exist): ${skipped}`)
	console.log(`Books failed: ${failed}`)

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
