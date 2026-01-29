<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { CheckCircleIcon, XCircleIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/solid'
import BaseButton from '@/components/BaseButton.vue'
import { enabledCategories } from '@/constants.js'
import {
	verifyDonationSession,
	getExportIntent,
	clearExportIntent,
	hasSessionBeenDownloaded,
	markSessionAsDownloaded
} from '@/utils/donations.js'
import {
	getEffectivePrice,
	buyUnitPriceRaw,
	sellUnitPriceRaw,
	buyStackPriceRaw,
	sellStackPriceRaw
} from '@/utils/pricing.js'
import { trackModalInteraction } from '@/utils/analytics.js'

const route = useRoute()
const router = useRouter()
const db = useFirestore()

// State
const isLoading = ref(true)
const isVerified = ref(false)
const isDownloading = ref(false)
const hasDownloaded = ref(false)
const alreadyDownloaded = ref(false)
const errorMessage = ref('')
const donationAmount = ref(0)
const exportConfig = ref(null)

// Load items from Firestore
const itemsQuery = query(
	collection(db, 'items'),
	where('category', 'in', enabledCategories),
	orderBy('category', 'asc'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)
const allItems = useCollection(itemsQuery)

// Helper function to check version
function isVersionLessOrEqual(itemVersion, targetVersion) {
	if (!itemVersion || !targetVersion) return false
	const [itemMajor, itemMinor] = itemVersion.split('.').map(Number)
	const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)
	if (itemMajor < targetMajor) return true
	if (itemMajor > targetMajor) return false
	return itemMinor <= targetMinor
}

function shouldShowItemForVersion(item, selectedVersion) {
	if (!item.version || !isVersionLessOrEqual(item.version, selectedVersion)) {
		return false
	}
	if (item.version_removed && isVersionLessOrEqual(item.version_removed, selectedVersion)) {
		return false
	}
	return true
}

// Filter items based on export config
function filterItems(items, config) {
	let filtered = items

	// Filter by version
	filtered = filtered.filter((item) => shouldShowItemForVersion(item, config.version))

	// Filter by categories if specified
	if (config.categories && config.categories.length > 0) {
		filtered = filtered.filter((item) => config.categories.includes(item.category))
	}

	// Filter out items with 0 base price
	const versionKey = config.version.replace('.', '_')
	filtered = filtered.filter((item) => {
		const basePrice = getEffectivePrice(item, versionKey)
		return basePrice > 0
	})

	return filtered
}

// Sort items based on config
function sortItems(items, config) {
	if (config.sortField === 'default') {
		return items // Keep original order
	}

	return [...items].sort((a, b) => {
		let valueA, valueB

		if (config.sortField === 'name') {
			valueA = a.name?.toLowerCase() || ''
			valueB = b.name?.toLowerCase() || ''
			const comparison = valueA.localeCompare(valueB)
			return config.sortDirection === 'asc' ? comparison : -comparison
		}

		if (config.sortField === 'buy') {
			const versionKey = config.version.replace('.', '_')
			valueA = getEffectivePrice(a, versionKey)
			valueB = getEffectivePrice(b, versionKey)
			const comparison = valueA - valueB
			return config.sortDirection === 'asc' ? comparison : -comparison
		}

		return 0
	})
}

// Generate export data
function generateExportData(items, config) {
	const data = {}
	const versionKey = config.version.replace('.', '_')
	const priceMultiplier = 1 // Default multiplier
	const sellMargin = 0.3 // Default margin

	items.forEach((item) => {
		const basePrice = getEffectivePrice(item, versionKey)
		const stackSize = item.stack || 64
		const itemData = {}

		// Add metadata if requested
		if (config.includeMetadata) {
			itemData.name = item.name
			itemData.category = item.category
			itemData.stack = stackSize
		}

		// Add price fields
		if (config.priceFields?.includes('unit_buy')) {
			itemData.unit_buy = buyUnitPriceRaw(basePrice, priceMultiplier, config.roundToWhole)
		}
		if (config.priceFields?.includes('unit_sell')) {
			itemData.unit_sell = sellUnitPriceRaw(
				basePrice,
				priceMultiplier,
				sellMargin,
				config.roundToWhole
			)
		}
		if (config.priceFields?.includes('stack_buy')) {
			itemData.stack_buy = buyStackPriceRaw(
				basePrice,
				stackSize,
				priceMultiplier,
				config.roundToWhole
			)
		}
		if (config.priceFields?.includes('stack_sell')) {
			itemData.stack_sell = sellStackPriceRaw(
				basePrice,
				stackSize,
				priceMultiplier,
				sellMargin,
				config.roundToWhole
			)
		}

		data[item.material_id] = itemData
	})

	// Add export metadata
	data._export_metadata = {
		source: "Verzion's Economy Price Guide",
		url: 'https://minecraft-economy-price-guide.net',
		version: config.version,
		export_date: new Date().toISOString(),
		item_count: items.length,
		donated: true
	}

	return data
}

// Generate YAML string
function generateYAML(data) {
	let yaml = ''
	for (const [key, value] of Object.entries(data)) {
		if (key === '_export_metadata') continue
		yaml += `${key}:\n`
		for (const [field, val] of Object.entries(value)) {
			yaml += `  ${field}: ${val}\n`
		}
		yaml += '\n'
	}
	return yaml
}

// Download file
function downloadFile(content, extension, mimeType, config) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
	const versionKey = config.version.replace('.', '_')
	const filename = `prices_${versionKey}_${timestamp}.${extension}`

	const blob = new Blob([content], { type: mimeType })
	const url = URL.createObjectURL(blob)

	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

// Trigger export download
async function triggerDownload() {
	if (!exportConfig.value || !allItems.value) return

	isDownloading.value = true

	try {
		// Filter and sort items
		const filtered = filterItems(allItems.value, exportConfig.value)
		const sorted = sortItems(filtered, exportConfig.value)

		// Generate export data
		const data = generateExportData(sorted, exportConfig.value)

		// Download based on format
		if (exportConfig.value.format === 'json') {
			const dataStr = JSON.stringify(data, null, 2)
			downloadFile(dataStr, 'json', 'application/json', exportConfig.value)
		} else {
			const yamlStr = generateYAML(data)
			downloadFile(yamlStr, 'yml', 'text/yaml', exportConfig.value)
		}

		// Mark as downloaded (idempotency)
		const sessionId = route.query.session_id
		if (sessionId) {
			markSessionAsDownloaded(sessionId)
		}

		hasDownloaded.value = true

		trackModalInteraction('export', 'donation_export_completed', {
			donation_amount: donationAmount.value,
			export_format: exportConfig.value.format,
			export_item_count: sorted.length
		})
	} catch (error) {
		console.error('Download error:', error)
		errorMessage.value = 'Failed to generate export file. Please try again.'
	} finally {
		isDownloading.value = false
	}
}

// Main verification flow
async function verifyAndDownload() {
	const sessionId = route.query.session_id

	if (!sessionId) {
		errorMessage.value = 'Missing session ID. Please try exporting again.'
		isLoading.value = false
		return
	}

	// Check idempotency - already downloaded?
	if (hasSessionBeenDownloaded(sessionId)) {
		alreadyDownloaded.value = true
		isVerified.value = true
		isLoading.value = false
		// Still try to get export config for manual download
		exportConfig.value = getExportIntent()
		return
	}

	try {
		// Verify the payment
		const result = await verifyDonationSession(sessionId)

		if (!result.verified) {
			errorMessage.value = result.reason || 'Payment not verified. Please try again.'
			isLoading.value = false
			return
		}

		isVerified.value = true
		donationAmount.value = (result.amount || 0) / 100 // Convert cents to dollars

		// Get export config from sessionStorage (primary) or Stripe metadata (fallback)
		let config = getExportIntent()

		if (!config && result.metadata) {
			// Fallback: reconstruct minimal config from Stripe metadata
			config = {
				format: result.metadata.exportFormat || 'json',
				version: result.metadata.exportVersion || '1.21',
				priceFields: ['unit_buy', 'unit_sell', 'stack_buy', 'stack_sell'],
				sortField: 'default',
				sortDirection: 'asc',
				roundToWhole: false,
				includeMetadata: false,
				categories: null // All categories
			}
		}

		if (!config) {
			errorMessage.value =
				'Export configuration not found. The session may have expired. Please try exporting again.'
			isLoading.value = false
			return
		}

		exportConfig.value = config
		isLoading.value = false

		// Clear the export intent
		clearExportIntent()

		// Wait for items to load, then auto-download
		if (allItems.value && allItems.value.length > 0) {
			await triggerDownload()
		}
	} catch (error) {
		console.error('Verification error:', error)
		errorMessage.value = error.message || 'Failed to verify payment. Please contact support.'
		isLoading.value = false
	}
}

function goToHome() {
	router.push('/')
}

function goToExport() {
	router.push('/?openExport=true')
}

onMounted(() => {
	verifyAndDownload()
})
</script>

<template>
	<div class="p-4 py-8 max-w-xl">
		<!-- Loading State -->
		<div v-if="isLoading" class="text-center">
			<div
				class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-norway mb-4">
				<svg
					class="animate-spin h-6 w-6 text-gray-asparagus"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24">
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Verifying Payment</h1>
			<p class="text-gray-600">Please wait while we confirm your donation...</p>
		</div>

		<!-- Success State -->
		<div v-else-if="isVerified && !errorMessage" class="max-w-xl">
			<div class="mb-4 flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900">Thank You!</h1>
				<CheckCircleIcon class="w-8 h-8 text-semantic-success" />
			</div>

			<p class="text-gray-600 mb-2">
				Your ${{ donationAmount.toFixed(2) }} donation helps keep the price guide running.
				You're basically a Minecraft economy MVP now.
			</p>

			<!-- Already downloaded message -->
			<div
				v-if="alreadyDownloaded"
				class="mb-6 p-4 bg-semantic-info-light border border-horizon rounded-lg">
				<p class="text-sm text-gray-700">
					Your export file was already downloaded. If you need it again, click the button
					below.
				</p>
			</div>

			<!-- Download status -->
			<div v-else-if="hasDownloaded" class="mb-6 p-4 bg-semantic-success-light rounded-lg">
				<p class="text-sm text-semantic-success flex items-center gap-2">
					<CheckCircleIcon class="w-5 h-5" />
					Your export file has been downloaded!
				</p>
			</div>

			<!-- Action Buttons -->
			<div class="flex flex-col items-start gap-3 mb-4">
				<BaseButton
					v-if="exportConfig && !hasDownloaded"
					@click="triggerDownload"
					:loading="isDownloading"
					variant="primary">
					<template #left-icon>
						<ArrowDownTrayIcon />
					</template>
					Download Export
				</BaseButton>

				<BaseButton
					v-else-if="alreadyDownloaded && exportConfig"
					@click="triggerDownload"
					:loading="isDownloading"
					variant="secondary">
					<template #left-icon>
						<ArrowDownTrayIcon />
					</template>
					Download Again
				</BaseButton>

				<button
					@click="goToHome"
					class="text-sm text-gray-700 hover:text-gray-900 underline">
					Return to Price Guide
				</button>
			</div>
		</div>

		<!-- Error State -->
		<div v-else class="max-w-xl">
			<div class="mb-4 flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900">Something Went Wrong</h1>
				<XCircleIcon class="w-8 h-8 text-semantic-danger" />
			</div>
			<p class="text-gray-600 mb-6">{{ errorMessage }}</p>

			<!-- Action Buttons -->
			<div class="flex flex-col items-start gap-3 mb-4">
				<BaseButton @click="goToExport" variant="primary">Try Export Again</BaseButton>
				<button
					@click="goToHome"
					class="text-sm text-gray-700 hover:text-gray-900 underline">
					Return to Price Guide
				</button>
			</div>
		</div>
	</div>
</template>
