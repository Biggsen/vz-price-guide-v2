#!/usr/bin/env node

// scripts/run-visual-tests.js
// Runs the visual regression test suite and organizes screenshots
// Usage: node scripts/run-visual-tests.js

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configuration
const SCREENSHOTS_DIR = path.join(
	__dirname,
	'..',
	'cypress',
	'screenshots',
	'visual-screenshots.cy.js'
)
const OUTPUT_DIR = path.join(__dirname, '..', 'visual-screenshots')

function log(message) {
	console.log(`[visual-tests] ${message}`)
}

function ensureDirectoryExists(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
		log(`Created directory: ${dir}`)
	}
}

function organizeScreenshots() {
	log('Organizing screenshots...')

	// Create output directory
	ensureDirectoryExists(OUTPUT_DIR)

	// Create subdirectories for different categories
	const categories = {
		'public-pages': 'Public pages (no auth required)',
		'auth-pages': 'Authentication pages',
		'user-pages': 'User account pages (auth required)',
		'admin-pages': 'Admin pages (admin auth required)',
		modals: 'Modal dialogs and overlays',
		responsive: 'Responsive breakpoints',
		errors: 'Error pages and states',
		misc: 'Miscellaneous screenshots'
	}

	Object.keys(categories).forEach((category) => {
		ensureDirectoryExists(path.join(OUTPUT_DIR, category))
	})

	// Copy and organize screenshots
	if (!fs.existsSync(SCREENSHOTS_DIR)) {
		log('⚠️  Screenshots directory not found. Run the visual tests first.')
		return
	}

	const screenshots = fs.readdirSync(SCREENSHOTS_DIR)

	screenshots.forEach((screenshot) => {
		if (!screenshot.endsWith('.png')) return

		let category = 'misc'

		// Categorize screenshots based on filename
		if (
			screenshot.includes('home') ||
			screenshot.includes('updates') ||
			screenshot.includes('privacy-policy') ||
			screenshot.includes('cookie-policy') ||
			screenshot.includes('terms-of-use') ||
			screenshot.includes('404')
		) {
			category = 'public-pages'
		} else if (
			screenshot.includes('signin') ||
			screenshot.includes('signup') ||
			screenshot.includes('reset-password') ||
			screenshot.includes('verify-email') ||
			screenshot.includes('change-password')
		) {
			category = 'auth-pages'
		} else if (
			screenshot.includes('account') ||
			(screenshot.includes('suggestions') && !screenshot.includes('admin'))
		) {
			category = 'user-pages'
		} else if (
			screenshot.includes('admin') ||
			screenshot.includes('shop-manager') ||
			screenshot.includes('add-item') ||
			screenshot.includes('edit-item') ||
			screenshot.includes('edit-recipe') ||
			screenshot.includes('missing-items') ||
			screenshot.includes('bulk-update') ||
			screenshot.includes('servers') ||
			screenshot.includes('shops') ||
			screenshot.includes('shop-items') ||
			screenshot.includes('market-overview') ||
			screenshot.includes('recipes') ||
			screenshot.includes('styleguide') ||
			screenshot.includes('suggestions-admin')
		) {
			category = 'admin-pages'
		} else if (
			screenshot.includes('modal') ||
			screenshot.includes('settings') ||
			screenshot.includes('export')
		) {
			category = 'modals'
		} else if (
			screenshot.includes('mobile') ||
			screenshot.includes('tablet') ||
			screenshot.includes('desktop')
		) {
			category = 'responsive'
		} else if (screenshot.includes('restricted') || screenshot.includes('404')) {
			category = 'errors'
		} else if (screenshot.includes('error')) {
			// Error states of auth pages should stay in auth-pages
			if (
				screenshot.includes('verify-email') ||
				screenshot.includes('reset-password') ||
				screenshot.includes('signin') ||
				screenshot.includes('signup')
			) {
				category = 'auth-pages'
			} else {
				category = 'errors'
			}
		}

		const sourcePath = path.join(SCREENSHOTS_DIR, screenshot)
		const destPath = path.join(OUTPUT_DIR, category, screenshot)

		try {
			fs.copyFileSync(sourcePath, destPath)
			log(`Copied ${screenshot} → ${category}/`)
		} catch (error) {
			log(`Failed to copy ${screenshot}: ${error.message}`)
		}
	})

	// Create README file with organization info
	const readmeContent = `# Visual Screenshots

This directory contains organized screenshots from the visual regression test suite.

## Directory Structure

${Object.entries(categories)
	.map(([dir, desc]) => `- **${dir}/** - ${desc}`)
	.join('\n')}

## How to Use

1. Browse the organized screenshots to review the visual design of all pages and states
2. Compare screenshots across different states (loading, success, error, empty)
3. Review responsive breakpoints to ensure consistent design across devices
4. Check modal and overlay designs for proper styling

## Generating New Screenshots

To regenerate all screenshots:

\`\`\`bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, seed the database
node scripts/seed-emulator.js

# Run the visual tests
npx cypress run --spec "cypress/e2e/visual-regression.cy.js"

# Organize the screenshots
node scripts/run-visual-tests.js
\`\`\`

## Notes

- Screenshots are captured at 1280x720 resolution by default
- All pages are tested in their default state unless otherwise specified
- Error states are simulated by intercepting network requests
- Loading states are simulated by adding loading indicators
- Success states are simulated by adding success messages
`

	fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readmeContent)
	log('Created README.md with organization information')
}

function runVisualTests() {
	log('Starting visual regression tests...')

	return new Promise((resolve, reject) => {
		try {
			// Run the visual screenshot test suite with environment variables
			// Use spawn instead of execSync to properly pass environment variables
			const { spawn } = require('child_process')

			const cypressProcess = spawn(
				'npx',
				['cypress', 'run', '--spec', 'cypress/e2e/visual-screenshots.cy.js'],
				{
					stdio: 'inherit',
					cwd: path.join(__dirname, '..'),
					env: {
						...process.env,
						GCLOUD_PROJECT: process.env.GCLOUD_PROJECT || 'demo-vz-price-guide',
						FIRESTORE_EMULATOR_HOST:
							process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080',
						FIREBASE_AUTH_EMULATOR_HOST:
							process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099',
						VITE_FIREBASE_EMULATORS: process.env.VITE_FIREBASE_EMULATORS || '1'
					},
					shell: true
				}
			)

			// Wait for the process to complete
			cypressProcess.on('close', (code) => {
				if (code !== 0) {
					log(`❌ Visual tests failed with exit code ${code}`)
					reject(new Error(`Cypress failed with exit code ${code}`))
					return
				}

				log('✅ Visual tests completed successfully')

				// Organize the screenshots
				organizeScreenshots()

				log('🎉 Visual testing complete! Screenshots organized in visual-screenshots/')
				resolve()
			})

			cypressProcess.on('error', (error) => {
				log(`❌ Visual tests failed: ${error.message}`)
				reject(error)
			})
		} catch (error) {
			log(`❌ Visual tests failed: ${error.message}`)
			reject(error)
		}
	})
}

// Main execution
if (require.main === module) {
	log('Starting visual testing workflow...')

	// Check if we're in the right directory
	if (!fs.existsSync(path.join(__dirname, '..', 'package.json'))) {
		log('❌ Please run this script from the project root directory')
		process.exit(1)
	}

	// Check if Cypress is installed
	try {
		execSync('npx cypress --version', { stdio: 'pipe' })
	} catch (error) {
		log('❌ Cypress not found. Please install it first: npm install')
		process.exit(1)
	}

	runVisualTests()
		.then(() => {
			log('🎉 Visual testing workflow completed successfully!')
		})
		.catch((error) => {
			log(`❌ Visual testing workflow failed: ${error.message}`)
			process.exit(1)
		})
}

module.exports = { runVisualTests, organizeScreenshots }
