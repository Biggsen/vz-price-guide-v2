// scripts/convertGifToWebp.js
// Converts animated GIF files to WebP format in public/images/for_converting
// Usage: node scripts/convertGifToWebp.js

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const INPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'for_converting')
const DRY_RUN = false

function getGifFiles(dirPath) {
	if (!fs.existsSync(dirPath)) {
		console.error(`Directory does not exist: ${dirPath}`)
		return []
	}

	const files = fs.readdirSync(dirPath)
	return files
		.filter((file) => {
			const ext = path.extname(file).toLowerCase()
			return ext === '.gif'
		})
		.map((file) => path.join(dirPath, file))
}

async function convertGifToWebp(filePath) {
	try {
		const imageBuffer = fs.readFileSync(filePath)
		const webpPath = filePath.replace(/\.gif$/i, '.webp')

		console.log(`Converting ${path.basename(filePath)} to WebP...`)

		const webpBuffer = await sharp(imageBuffer, { animated: true })
			.webp()
			.toBuffer()

		if (DRY_RUN) {
			console.log(`[DRY RUN] Would convert ${path.basename(filePath)} to ${path.basename(webpPath)}`)
			return true
		}

		// Write the WebP file
		fs.writeFileSync(webpPath, webpBuffer)
		
		// Delete the original GIF file
		fs.unlinkSync(filePath)
		
		console.log(`Converted: ${path.basename(filePath)} -> ${path.basename(webpPath)}`)
		return true
	} catch (error) {
		console.error(`Error converting ${path.basename(filePath)}:`, error.message)
		return false
	}
}

async function main() {
	console.log(`Converting GIF files in: ${INPUT_DIR}\n`)

	const gifFiles = getGifFiles(INPUT_DIR)

	if (gifFiles.length === 0) {
		console.log('No GIF files found in the directory.')
		return
	}

	console.log(`Found ${gifFiles.length} GIF file(s) to convert...\n`)

	let success = 0
	let failed = 0

	for (const filePath of gifFiles) {
		const result = await convertGifToWebp(filePath)
		if (result) {
			success++
		} else {
			failed++
		}
	}

	console.log(`\nComplete!`)
	console.log(`  Success: ${success}`)
	console.log(`  Failed:  ${failed}`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})

