// scripts/downloadArmorImages.js
// Downloads armor images from Minecraft Wiki, resizes them to 64x64, and saves them
// Usage: node scripts/downloadArmorImages.js

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const sharp = require('sharp')

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'for_processing', 'armor')
const DRY_RUN = false

function capitalizeMaterialId(materialId) {
	return materialId
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join('_')
}

function ensureDirectoryExists(dirPath) {
	fs.mkdirSync(dirPath, { recursive: true })
}

async function downloadImageFromUrl(imageUrl, outputPath) {
	const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000 })
	return Buffer.from(response.data)
}

async function resizeImage(imageBuffer, width, height) {
	return await sharp(imageBuffer)
		.resize(width, height, {
			kernel: sharp.kernel.nearest,
			fit: 'fill'
		})
		.png()
		.toBuffer()
}

async function getArmorImageUrl(materialId, page) {
	const capitalizedId = capitalizeMaterialId(materialId)
	const url = `https://minecraft.wiki/w/${capitalizedId}`

	try {
		await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

		// Find the div with class "invslot" and get the img src from within it
		const imageUrl = await page.evaluate(() => {
			const invslotDiv = document.querySelector('.invslot')
			if (!invslotDiv) return null
			const img = invslotDiv.querySelector('img')
			return img ? img.src : null
		})

		return imageUrl
	} catch (error) {
		throw error
	}
}

async function downloadArmorImage(materialId, page) {
	try {
		console.log(`Fetching image URL for ${materialId}...`)
		const imageUrl = await getArmorImageUrl(materialId, page)

		if (!imageUrl) {
			console.error(`No image found for ${materialId}`)
			return null
		}

		const filename = `${materialId.toLowerCase()}.png`
		const outputPath = path.join(OUTPUT_DIR, filename)

		if (DRY_RUN) {
			console.log(`[DRY RUN] Would download ${imageUrl} -> ${outputPath}`)
			return filename
		}

		console.log(`Downloading ${imageUrl}...`)
		const imageBuffer = await downloadImageFromUrl(imageUrl, outputPath)
		
		console.log(`Resizing to 64x64...`)
		const resizedBuffer = await resizeImage(imageBuffer, 64, 64)
		
		fs.writeFileSync(outputPath, resizedBuffer)
		console.log(`Downloaded and resized: ${filename}`)
		return filename
	} catch (error) {
		console.error(`Error processing ${materialId}:`, error.message)
		return null
	}
}

async function main() {
	ensureDirectoryExists(OUTPUT_DIR)

	const materialIds = [
		'chainmail_boots',
		'chainmail_chestplate',
		'chainmail_helmet',
		'chainmail_leggings',
		'copper_boots',
		'copper_chestplate',
		'copper_helmet',
		'copper_leggings',
		'diamond_boots',
		'diamond_chestplate',
		'diamond_helmet',
		'diamond_leggings',
		'golden_boots',
		'golden_chestplate',
		'golden_helmet',
		'golden_leggings',
		'iron_boots',
		'iron_chestplate',
		'iron_helmet',
		'iron_leggings',
		'leather_boots',
		'leather_cap',
		'leather_pants',
		'leather_tunic',
		'netherite_chestplate'
	]

	console.log(`Processing ${materialIds.length} items...\n`)

	const browser = await puppeteer.launch({ headless: true })
	const page = await browser.newPage()

	let success = 0
	let failed = 0

	for (const materialId of materialIds) {
		const result = await downloadArmorImage(materialId, page)
		if (result) {
			success++
		} else {
			failed++
		}
	}

	await browser.close()

	console.log(`\nComplete!`)
	console.log(`  Success: ${success}`)
	console.log(`  Failed:  ${failed}`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})

