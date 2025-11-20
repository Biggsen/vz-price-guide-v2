/**
 * One-time helper to upload existing public images into the Netlify Blobs store.
 *
 * Usage:
 *   ADMIN_MEDIA_KEY=... MEDIA_UPLOAD_BASE_URL=https://your-site.netlify.app node scripts/migratePublicImagesToBlobs.js
 *
 * Optional env vars:
 *   - MEDIA_UPLOAD_BASE_URL (defaults to http://localhost:8888)  → origin where the Netlify function lives
 *   - MEDIA_SOURCE_DIR (defaults to public/images/items)          → directory to scan for images
 *   - DRY_RUN=true                                               → print planned actions without uploading
 */

const path = require('path')
const fs = require('fs/promises')

const ADMIN_MEDIA_KEY = process.env.ADMIN_MEDIA_KEY
if (!ADMIN_MEDIA_KEY) {
	console.error('Missing ADMIN_MEDIA_KEY environment variable.')
	console.error('Set it to the same value configured in Netlify before running this script.')
	process.exit(1)
}

const DEFAULT_SOURCE_DIR = path.join(process.cwd(), 'public', 'images', 'items')
const SOURCE_DIR = path.resolve(process.env.MEDIA_SOURCE_DIR || DEFAULT_SOURCE_DIR)
const BASE_URL =
	process.env.MEDIA_UPLOAD_BASE_URL || process.env.NETLIFY_SITE_URL || 'http://localhost:8888'
const UPLOAD_URL = new URL('/api/upload-items', BASE_URL).toString()
const DRY_RUN = /^true|1$/i.test(process.env.DRY_RUN || '')

const VALID_EXTENSIONS = new Set(['.png', '.webp', '.gif', '.jpg', '.jpeg'])

function toPosixPath(filePath) {
	return filePath.split(path.sep).join('/')
}

function getContentType(filePath) {
	const ext = path.extname(filePath).toLowerCase()
	switch (ext) {
		case '.png':
			return 'image/png'
		case '.webp':
			return 'image/webp'
		case '.gif':
			return 'image/gif'
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg'
		default:
			return 'application/octet-stream'
	}
}

async function collectFiles(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true })
	const files = []

	for (const entry of entries) {
		const absolute = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			const nested = await collectFiles(absolute)
			files.push(...nested)
			continue
		}

		const ext = path.extname(entry.name).toLowerCase()
		if (!VALID_EXTENSIONS.has(ext)) {
			continue
		}

		const relative = path.relative(SOURCE_DIR, absolute)
		files.push({
			absolute,
			relative: toPosixPath(relative)
		})
	}

	return files
}

async function uploadFile(file) {
	const key = `items/${file.relative}`

	if (DRY_RUN) {
		console.log(`[DRY RUN] Would upload ${file.absolute} → ${key}`)
		return
	}

	const buffer = await fs.readFile(file.absolute)
	const formData = new FormData()
	const blob = new Blob([buffer], { type: getContentType(file.absolute) })

	formData.append('file', blob, path.basename(file.absolute))
	formData.append('path', key)

	const response = await fetch(UPLOAD_URL, {
		method: 'POST',
		headers: {
			'x-admin-media-key': ADMIN_MEDIA_KEY
		},
		body: formData
	})

	if (!response.ok) {
		const message = await response.text().catch(() => response.statusText)
		throw new Error(`Upload failed for ${key}: ${response.status} ${message}`)
	}

	console.log(`Uploaded ${key}`)
}

async function main() {
	console.log('--- Netlify Blobs migration ---')
	console.log(`Source directory: ${SOURCE_DIR}`)
	console.log(`Upload endpoint: ${UPLOAD_URL}`)
	console.log(DRY_RUN ? 'Running in DRY RUN mode (no uploads will occur)' : 'Uploading files...')

	let stats
	try {
		stats = await fs.stat(SOURCE_DIR)
	} catch (error) {
		console.error(`Unable to read source directory: ${SOURCE_DIR}`)
		console.error(error)
		process.exit(1)
	}

	if (!stats.isDirectory()) {
		console.error(`Source path is not a directory: ${SOURCE_DIR}`)
		process.exit(1)
	}

	const files = await collectFiles(SOURCE_DIR)
	if (!files.length) {
		console.log('No matching image files found. Nothing to upload.')
		return
	}

	console.log(`Discovered ${files.length} image(s).`)

	let uploaded = 0
	for (const file of files) {
		try {
			await uploadFile(file)
			uploaded++
		} catch (error) {
			console.error(`Error uploading ${file.relative}:`, error.message)
		}
	}

	console.log('--- Migration complete ---')
	console.log(`Processed ${files.length} file(s).`)
	console.log(
		DRY_RUN
			? 'No uploads performed due to DRY RUN mode.'
			: `Successfully uploaded ${uploaded} file(s).`
	)
}

main().catch((error) => {
	console.error('Migration script failed:', error)
	process.exit(1)
})

