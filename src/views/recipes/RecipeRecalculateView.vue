<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { versions } from '../../constants.js'
import { useAdmin } from '../../utils/admin.js'
import { recalculateDynamicPrices } from '../../utils/pricing.js'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()

// State management
const loading = ref(true)
const dbItems = ref([])
const selectedVersion = ref('1.16')

// Price recalculation state
const priceRecalculation = ref({
	isRunning: false,
	results: null,
	error: null
})

// Add local state for sorting the recalculation results table
const priceResultsSortKey = ref('item')
const priceResultsSortAsc = ref(true)

const sortedPriceResults = computed(() => {
	if (!priceRecalculation.value.results || !priceRecalculation.value.results.success) return []
	const arr = [...priceRecalculation.value.results.success]
	const key = priceResultsSortKey.value
	const asc = priceResultsSortAsc.value
	arr.sort((a, b) => {
		let aVal, bVal
		switch (key) {
			case 'item':
				aVal = (a.name || a.material_id || '').toLowerCase()
				bVal = (b.name || b.material_id || '').toLowerCase()
				break
			case 'oldPrice':
				aVal = a.oldPrice || 0
				bVal = b.oldPrice || 0
				break
			case 'newPrice':
				aVal = a.newPrice || 0
				bVal = b.newPrice || 0
				break
			case 'status':
				aVal = a.changed ? 1 : 0
				bVal = b.changed ? 1 : 0
				break
			default:
				aVal = ''
				bVal = ''
		}
		if (aVal < bVal) return asc ? -1 : 1
		if (aVal > bVal) return asc ? 1 : -1
		return 0
	})
	return arr
})

function setPriceResultsSort(key) {
	if (priceResultsSortKey.value === key) {
		priceResultsSortAsc.value = !priceResultsSortAsc.value
	} else {
		priceResultsSortKey.value = key
		priceResultsSortAsc.value = true
	}
}

function getSortIcon(field) {
	if (priceResultsSortKey.value !== field) return null
	return priceResultsSortAsc.value ? 'up' : 'down'
}

// Load database items
async function loadDbItems() {
	const snapshot = await getDocs(collection(db, 'items'))
	dbItems.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

// Initialize on mount
onMounted(async () => {
	await loadDbItems()
	loading.value = false
})

// Price recalculation functions
async function runPriceRecalculation() {
	priceRecalculation.value.isRunning = true
	priceRecalculation.value.results = null
	priceRecalculation.value.error = null

	try {
		const versionKey = selectedVersion.value.replace('.', '_')
		const results = recalculateDynamicPrices(dbItems.value, versionKey)

		// Save calculated prices to database
		const savePromises = results.success
			.filter((item) => item.changed)
			.map(async (item) => {
				const dbItem = dbItems.value.find((i) => i.material_id === item.material_id)
				if (dbItem) {
					const itemRef = doc(db, 'items', dbItem.id)
					await updateDoc(itemRef, {
						[`prices_by_version.${versionKey}`]: item.newPrice
					})
				}
			})

		await Promise.all(savePromises)

		// Refresh database items to show updated prices
		await loadDbItems()

		priceRecalculation.value.results = results
	} catch (error) {
		console.error('Price recalculation failed:', error)
		priceRecalculation.value.error = error.message
	} finally {
		priceRecalculation.value.isRunning = false
	}
}

function clearPriceRecalculationResults() {
	priceRecalculation.value.results = null
	priceRecalculation.value.error = null
}
</script>

<template>
	<div v-if="canBulkUpdate" class="p-4 pt-8">
		<!-- Back Button -->
		<div class="mb-4">
			<RouterLink
				to="/admin"
				class="inline-flex items-center rounded-md bg-white text-gray-700 border-2 border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition">
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
				Back to Price Guide
			</RouterLink>
		</div>

		<h1 class="text-3xl font-bold text-gray-900 mb-6">Recalculate Dynamic Prices</h1>

		<div v-if="loading">Loading...</div>
		<div v-else>
			<!-- Version selector -->
			<div class="mb-6">
				<div class="flex gap-4 items-center">
					<label class="font-semibold">Version:</label>
					<select
						v-model="selectedVersion"
						class="border-2 border-gray-asparagus rounded px-3 py-1">
						<option v-for="version in versions" :key="version" :value="version">
							{{ version }}
						</option>
					</select>
				</div>
			</div>

			<div class="mb-6">
				<p class="text-gray-600 mb-4">
					This will recalculate prices for all items with
					<code>pricing_type: "dynamic"</code>
					based on their recipe ingredients. Calculated prices will be saved to the
					<code>prices_by_version</code>
					field.
				</p>

				<div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
					<h4 class="font-semibold text-yellow-800 mb-2">Important:</h4>
					<ul class="text-sm text-yellow-700 space-y-1">
						<li>• Only items with recipes will have prices calculated</li>
						<li>
							• Ingredients must have existing prices (static or previously
							calculated)
						</li>
						<li>• Circular recipe dependencies will be detected and skipped</li>
						<li>
							• Results are saved to
							<code>
								prices_by_version["{{ selectedVersion.replace('.', '_') }}"]
							</code>
						</li>
					</ul>
				</div>

				<button
					@click="runPriceRecalculation"
					:disabled="priceRecalculation.isRunning"
					class="inline-flex items-center px-4 py-2 bg-semantic-success text-white text-sm font-medium rounded-md hover:bg-semantic-success/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-semantic-success disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
					{{
						priceRecalculation.isRunning
							? 'Recalculating...'
							: 'Run Price Recalculation'
					}}
				</button>

				<button
					v-if="priceRecalculation.results"
					@click="clearPriceRecalculationResults"
					class="ml-4 inline-flex items-center px-4 py-2 bg-semantic-danger text-white text-sm font-medium rounded-md hover:bg-semantic-danger/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-semantic-danger transition-colors duration-200">
					Clear Results
				</button>
			</div>

			<!-- Loading indicator -->
			<div v-if="priceRecalculation.isRunning" class="mb-6">
				<div class="flex items-center gap-2">
					<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
					<span>Recalculating prices...</span>
				</div>
			</div>

			<!-- Error display -->
			<div v-if="priceRecalculation.error" class="mb-6">
				<div class="bg-red-50 border border-red-200 rounded p-4">
					<h4 class="font-semibold text-red-800 mb-2">Error:</h4>
					<p class="text-red-700">{{ priceRecalculation.error }}</p>
				</div>
			</div>

			<!-- Results display -->
			<div v-if="priceRecalculation.results" class="mb-6">
				<div class="bg-green-50 border border-green-200 rounded p-4 mb-4">
					<h4 class="font-semibold text-green-800 mb-2">Recalculation Complete!</h4>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<span class="font-medium">Total:</span>
							{{ priceRecalculation.results.summary.total }}
						</div>
						<div>
							<span class="font-medium">Calculated:</span>
							{{ priceRecalculation.results.summary.calculated }}
						</div>
						<div>
							<span class="font-medium">Failed:</span>
							{{ priceRecalculation.results.summary.failed }}
						</div>
						<div>
							<span class="font-medium">Unchanged:</span>
							{{ priceRecalculation.results.summary.unchanged }}
						</div>
					</div>
				</div>

				<!-- Successful calculations -->
				<div v-if="priceRecalculation.results.success.length > 0" class="mb-4">
					<h4 class="font-semibold mb-2">Successfully Calculated:</h4>
					<div class="bg-white rounded-lg shadow-md overflow-hidden">
						<div class="overflow-x-auto">
							<table
								class="min-w-full divide-y divide-gray-200 border border-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th
											@click="setPriceResultsSort('item')"
											class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
											<div class="flex items-center gap-1">
												Item
												<ArrowUpIcon
													v-if="getSortIcon('item') === 'up'"
													class="w-4 h-4 text-gray-700" />
												<ArrowDownIcon
													v-else-if="getSortIcon('item') === 'down'"
													class="w-4 h-4 text-gray-700" />
											</div>
										</th>
										<th
											@click="setPriceResultsSort('oldPrice')"
											class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
											<div class="flex items-center gap-1">
												Old Price
												<ArrowUpIcon
													v-if="getSortIcon('oldPrice') === 'up'"
													class="w-4 h-4 text-gray-700" />
												<ArrowDownIcon
													v-else-if="getSortIcon('oldPrice') === 'down'"
													class="w-4 h-4 text-gray-700" />
											</div>
										</th>
										<th
											@click="setPriceResultsSort('newPrice')"
											class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
											<div class="flex items-center gap-1">
												New Price
												<ArrowUpIcon
													v-if="getSortIcon('newPrice') === 'up'"
													class="w-4 h-4 text-gray-700" />
												<ArrowDownIcon
													v-else-if="getSortIcon('newPrice') === 'down'"
													class="w-4 h-4 text-gray-700" />
											</div>
										</th>
										<th
											@click="setPriceResultsSort('status')"
											class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
											<div class="flex items-center gap-1">
												Status
												<ArrowUpIcon
													v-if="getSortIcon('status') === 'up'"
													class="w-4 h-4 text-gray-700" />
												<ArrowDownIcon
													v-else-if="getSortIcon('status') === 'down'"
													class="w-4 h-4 text-gray-700" />
											</div>
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									<tr v-for="item in sortedPriceResults" :key="item.material_id">
										<td class="px-4 py-3 border-r border-gray-200">
											<div class="font-medium text-gray-900">
												{{ item.name || item.material_id }}
											</div>
										</td>
										<td
											class="px-4 py-3 border-r border-gray-200 text-gray-900">
											{{ item.oldPrice || 0 }}
										</td>
										<td
											class="px-4 py-3 border-r border-gray-200 text-gray-900">
											{{ item.newPrice }}
										</td>
										<td class="px-4 py-3">
											<span
												v-if="item.changed"
												class="text-semantic-success font-medium">
												Updated
											</span>
											<span v-else class="text-gray-500">No change</span>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<!-- Failed calculations -->
				<div v-if="priceRecalculation.results.failed.length > 0" class="mb-4">
					<h4 class="font-semibold mb-2 text-red-600">Failed Calculations:</h4>
					<div class="bg-white rounded-lg shadow-md overflow-hidden">
						<div class="overflow-x-auto">
							<table
								class="min-w-full divide-y divide-gray-200 border border-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th
											class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
											Item
										</th>
										<th
											class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Error
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									<tr
										v-for="item in priceRecalculation.results.failed"
										:key="item.material_id">
										<td class="px-4 py-3 border-r border-gray-200">
											<div class="font-medium text-gray-900">
												{{ item.name || item.material_id }}
											</div>
										</td>
										<td class="px-4 py-3 text-semantic-danger">
											{{ item.error }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to manage recipes.</p>
			<RouterLink to="/" class="text-blue-600 hover:underline">Return to Home</RouterLink>
		</div>
	</div>
</template>
