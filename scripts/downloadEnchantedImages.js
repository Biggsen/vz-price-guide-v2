// scripts/downloadEnchantedImages.js
// Downloads enchanted item images from Minecraft Wiki
// Usage: node scripts/downloadEnchantedImages.js

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'for_processing')
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
	fs.writeFileSync(outputPath, response.data)
}

async function getEnchantedImageUrl(materialId, page) {
	const capitalizedId = capitalizeMaterialId(materialId)
	const url = `https://minecraft.wiki/w/${capitalizedId}#/media/File:Enchanted_${capitalizedId}.gif`

	try {
		await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
		
		// Wait a bit for the hash navigation to trigger the MediaViewer
		await new Promise(resolve => setTimeout(resolve, 3000))

		// Try to wait for the mw-mmv-image div to appear
		try {
			await page.waitForSelector('.mw-mmv-image', { timeout: 15000 })
		} catch (selectorError) {
			// If the modal didn't open, try clicking on the image link if it exists
			const imageLink = await page.evaluate(() => {
				// Look for a link to the enchanted image file
				const links = Array.from(document.querySelectorAll('a'))
				const enchantedLink = links.find(link => 
					link.href && link.href.includes('Enchanted_') && link.href.includes('.gif')
				)
				return enchantedLink ? enchantedLink.href : null
			})
			
			if (imageLink) {
				await page.goto(imageLink, { waitUntil: 'networkidle2', timeout: 30000 })
				await new Promise(resolve => setTimeout(resolve, 2000))
				await page.waitForSelector('.mw-mmv-image', { timeout: 15000 })
			} else {
				throw new Error('Could not find image link or modal')
			}
		}

		// Get the img src from within the div
		const imageUrl = await page.evaluate(() => {
			const div = document.querySelector('.mw-mmv-image')
			if (!div) return null
			const img = div.querySelector('img')
			return img ? img.src : null
		})

		return imageUrl
	} catch (error) {
		throw error
	}
}

async function downloadEnchantedImage(materialId, page) {
	try {
		console.log(`Fetching image URL for ${materialId}...`)
		const imageUrl = await getEnchantedImageUrl(materialId, page)

		if (!imageUrl) {
			console.error(`No image found for ${materialId}`)
			return null
		}

		const filename = `${materialId.toLowerCase()}_enchanted.gif`
		const outputPath = path.join(OUTPUT_DIR, filename)

		if (DRY_RUN) {
			console.log(`[DRY RUN] Would download ${imageUrl} -> ${outputPath}`)
			return filename
		}

		console.log(`Downloading ${imageUrl}...`)
		await downloadImageFromUrl(imageUrl, outputPath)
		console.log(`Downloaded: ${filename}`)
		return filename
	} catch (error) {
		console.error(`Error processing ${materialId}:`, error.message)
		return null
	}
}

async function main() {
	ensureDirectoryExists(OUTPUT_DIR)

	const materialIds = [
		'diamond_sword',
		'golden_sword',
		'iron_sword',
		'netherite_sword',
		'stone_sword',
		'wooden_sword'
	]

	console.log(`Processing ${materialIds.length} items...\n`)

	const browser = await puppeteer.launch({ headless: true })
	const page = await browser.newPage()

	let success = 0
	let failed = 0

	for (const materialId of materialIds) {
		const result = await downloadEnchantedImage(materialId, page)
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

