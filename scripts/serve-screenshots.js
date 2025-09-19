#!/usr/bin/env node

// scripts/serve-screenshots.js
// Simple HTTP server to serve visual screenshots for the gallery
// Usage: node scripts/serve-screenshots.js

const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3001
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'visual-screenshots')

// Enable CORS for development
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*')
	res.header('Access-Control-Allow-Methods', 'GET')
	res.header('Access-Control-Allow-Headers', 'Content-Type')
	next()
})

// Serve static files from visual-screenshots directory
app.use('/visual-screenshots', express.static(SCREENSHOTS_DIR))

// API endpoint to get list of screenshots
app.get('/api/screenshots', (req, res) => {
	try {
		const screenshots = []

		// Walk through all directories and collect screenshots
		function walkDir(dir, category = '') {
			const files = fs.readdirSync(dir)

			files.forEach((file) => {
				const filePath = path.join(dir, file)
				const stat = fs.statSync(filePath)

				if (stat.isDirectory()) {
					// Recursively walk subdirectories
					walkDir(filePath, file)
				} else if (file.endsWith('.png')) {
					// Extract info from filename
					const name = file.replace('.png', '').replace(/-/g, ' ')
					const relativePath = path
						.relative(SCREENSHOTS_DIR, filePath)
						.replace(/\\/g, '/')

					screenshots.push({
						id: file.replace('.png', ''),
						name: name.charAt(0).toUpperCase() + name.slice(1),
						category: category || 'misc',
						path: `/visual-screenshots/${relativePath}`,
						description: `Screenshot of ${name.replace(/-/g, ' ')}`,
						viewport: extractViewport(name),
						filename: file
					})
				}
			})
		}

		// Extract viewport info from filename
		function extractViewport(filename) {
			if (filename.includes('mobile')) return '375x667'
			if (filename.includes('tablet')) return '768x1024'
			if (filename.includes('large-desktop')) return '1440x900'
			return '1280x720'
		}

		walkDir(SCREENSHOTS_DIR)

		res.json(screenshots)
	} catch (error) {
		console.error('Error reading screenshots:', error)
		res.status(500).json({ error: 'Failed to read screenshots' })
	}
})

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'ok', screenshotsDir: SCREENSHOTS_DIR })
})

// Start server
app.listen(PORT, () => {
	console.log(`📸 Screenshot server running on http://localhost:${PORT}`)
	console.log(`📁 Serving screenshots from: ${SCREENSHOTS_DIR}`)
	console.log(`🔗 API endpoint: http://localhost:${PORT}/api/screenshots`)
})

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n👋 Shutting down screenshot server...')
	process.exit(0)
})
