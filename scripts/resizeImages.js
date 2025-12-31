// scripts/resizeImages.js
// Resizes all images in public/images/for_resizing and replaces them with resized versions
// Usage: node scripts/resizeImages.js

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const INPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'for_resizing')
const TARGET_WIDTH = 64
const TARGET_HEIGHT = 64
const DRY_RUN = false

const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

function generateNewFilename(originalPath) {
	const dir = path.dirname(originalPath)
	const basename = path.basename(originalPath, path.extname(originalPath))
	
	// Remove "Invicon_" prefix if present and convert to lowercase
	let newBasename = basename
	if (newBasename.startsWith('Invicon_')) {
		newBasename = newBasename.substring(8) // Remove "Invicon_" (8 characters)
	}
	newBasename = newBasename.toLowerCase()
	
	return path.join(dir, `${newBasename}.png`)
}

function getImageFiles(dirPath) {
	if (!fs.existsSync(dirPath)) {
		console.error(`Directory does not exist: ${dirPath}`)
		return []
	}

	const files = fs.readdirSync(dirPath)
	return files
		.filter((file) => {
			const ext = path.extname(file).toLowerCase()
			return SUPPORTED_EXTENSIONS.includes(ext)
		})
		.map((file) => path.join(dirPath, file))
}

async function resizeImageFile(filePath) {
	try {
		const imageBuffer = fs.readFileSync(filePath)
		const newFilePath = generateNewFilename(filePath)

		console.log(`Resizing ${path.basename(filePath)}...`)

		const resizedBuffer = await sharp(imageBuffer)
			.resize(TARGET_WIDTH, TARGET_HEIGHT, {
				kernel: sharp.kernel.nearest,
				fit: 'fill'
			})
			.png()
			.toBuffer()

		if (DRY_RUN) {
			if (filePath === newFilePath) {
				console.log(`[DRY RUN] Would resize and replace ${path.basename(filePath)}`)
			} else {
				console.log(`[DRY RUN] Would resize ${path.basename(filePath)} and rename to ${path.basename(newFilePath)}`)
			}
			return true
		}

		// Write the resized image to the new filename
		fs.writeFileSync(newFilePath, resizedBuffer)
		
		// If the filename changed, delete the original
		if (filePath !== newFilePath) {
			fs.unlinkSync(filePath)
			console.log(`Resized, renamed to ${path.basename(newFilePath)}`)
		} else {
			console.log(`Resized and replaced: ${path.basename(filePath)}`)
		}
		
		return true
	} catch (error) {
		console.error(`Error resizing ${path.basename(filePath)}:`, error.message)
		return false
	}
}

async function main() {
	console.log(`Resizing images in: ${INPUT_DIR}\n`)

	const imageFiles = getImageFiles(INPUT_DIR)

	if (imageFiles.length === 0) {
		console.log('No image files found in the directory.')
		return
	}

	console.log(`Found ${imageFiles.length} image(s) to resize...\n`)

	let success = 0
	let failed = 0

	for (const filePath of imageFiles) {
		const result = await resizeImageFile(filePath)
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

