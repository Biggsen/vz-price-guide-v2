<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useFirestore, useDocument } from 'vuefire'
import { doc, updateDoc } from 'firebase/firestore'
import { categories, versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { calculateRecipePrice, getEffectivePrice } from '../utils/pricing.js'
import BackButton from '../components/BackButton.vue'

const db = useFirestore()
const router = useRouter()
const route = useRoute()
const { user, canEditItems } = useAdmin()
const docRef = doc(db, 'items', route.params.id)

// Store the home page query parameters to restore them after editing
const homeQuery = ref({})

// Capture the referring page's query parameters
onMounted(() => {
	// If there's a redirect query parameter, use it; otherwise use the document referrer
	const redirectQuery = route.query.redirect
	if (redirectQuery) {
		try {
			const url = new URL(redirectQuery, window.location.origin)
			homeQuery.value = Object.fromEntries(url.searchParams.entries())
		} catch (e) {
			// If parsing fails, keep empty query
			homeQuery.value = {}
		}
	} else {
		// Try to extract query parameters from the referrer
		try {
			const referrer = document.referrer
			if (referrer && referrer.includes(window.location.origin)) {
				const url = new URL(referrer)
				homeQuery.value = Object.fromEntries(url.searchParams.entries())
			}
		} catch (e) {
			// If parsing fails, keep empty query
			homeQuery.value = {}
		}
	}
})

const itemSource = useDocument(docRef)

const editItem = ref({
	name: '',
	material_id: '',
	image: '',
	url: '',
	price: 1, // Legacy field for backward compatibility
	stack: 64,
	category: '',
	subcategory: '',
	version: '', // Available from version
	version_removed: '', // Removed in version
	pricing_type: 'static', // 'static' or 'dynamic'
	prices_by_version: {} // Version-specific pricing
})

// Reactive state for pricing management
const recalculationStatus = ref({})
const showPricingTypeConfirmation = ref(false)
const pendingPricingType = ref('')

// Initialize pricing data when item loads
watch(itemSource, (itemSource) => {
	if (itemSource) {
		editItem.value = {
			...itemSource,
			pricing_type: itemSource.pricing_type || 'static',
			prices_by_version: itemSource.prices_by_version || {},
			version_removed: itemSource.version_removed || ''
		}

		// Normalize existing version keys to use underscores consistently
		const normalizedPrices = {}
		if (editItem.value.prices_by_version) {
			Object.entries(editItem.value.prices_by_version).forEach(([key, value]) => {
				const normalizedKey = key.replace('.', '_')
				normalizedPrices[normalizedKey] = value
			})
		}
		editItem.value.prices_by_version = normalizedPrices

		// Initialize pricing for current version if not exists
		const currentVersionKey = editItem.value.version.replace('.', '_')
		if (!editItem.value.prices_by_version[currentVersionKey] && editItem.value.price) {
			editItem.value.prices_by_version[currentVersionKey] = editItem.value.price
		}

		// If item has no recipes, force static pricing
		if (
			!editItem.value.recipes_by_version ||
			Object.keys(editItem.value.recipes_by_version).length === 0
		) {
			editItem.value.pricing_type = 'static'
		}
	}
})

// Computed properties for pricing management
const availableVersions = computed(() => {
	const startIndex = versions.indexOf(editItem.value.version)
	const endIndex = editItem.value.version_removed
		? versions.indexOf(editItem.value.version_removed)
		: versions.length
	return versions.slice(startIndex, endIndex)
})

const hasRecipes = computed(() => {
	// Check if item has any recipes in any version
	return (
		editItem.value.recipes_by_version &&
		Object.keys(editItem.value.recipes_by_version).length > 0
	)
})

const versionPrices = computed(() => {
	return availableVersions.value.map((version) => {
		const versionKey = version.replace('.', '_')
		const price = editItem.value.prices_by_version[versionKey]
		const hasExplicitPrice = price !== undefined
		const effectivePrice = hasExplicitPrice ? price : getInheritedPrice(versionKey)

		return {
			version,
			versionKey,
			price: effectivePrice,
			hasExplicitPrice,
			isInherited: !hasExplicitPrice && effectivePrice !== null
		}
	})
})

const groupedVersionPrices = computed(() => {
	const groups = []
	let currentGroup = null

	for (const versionPrice of versionPrices.value) {
		const priceKey = versionPrice.hasExplicitPrice
			? `explicit_${versionPrice.price}`
			: `inherited_${versionPrice.price}_${getInheritanceSource(versionPrice.versionKey)}`

		if (!currentGroup || currentGroup.priceKey !== priceKey) {
			currentGroup = {
				priceKey,
				price: versionPrice.price,
				hasExplicitPrice: versionPrice.hasExplicitPrice,
				inheritanceSource: versionPrice.hasExplicitPrice
					? null
					: getInheritanceSource(versionPrice.versionKey),
				versions: []
			}
			groups.push(currentGroup)
		}

		currentGroup.versions.push(versionPrice)
	}

	return groups
})

const explicitPriceVersions = computed(() => {
	return versionPrices.value.filter((v) => v.hasExplicitPrice)
})

const inheritedPriceVersions = computed(() => {
	return versionPrices.value.filter((v) => !v.hasExplicitPrice)
})

// Helper functions
function getInheritedPrice(versionKey) {
	// Find the nearest earlier version with a price
	const currentVersionIndex = versions.findIndex((v) => v.replace('.', '_') === versionKey)
	for (let i = currentVersionIndex - 1; i >= 0; i--) {
		const checkVersionKey = versions[i].replace('.', '_')
		if (editItem.value.prices_by_version[checkVersionKey] !== undefined) {
			return editItem.value.prices_by_version[checkVersionKey]
		}
	}
	return editItem.value.price || 0
}

function getInheritanceSource(versionKey) {
	const currentVersionIndex = versions.findIndex((v) => v.replace('.', '_') === versionKey)
	for (let i = currentVersionIndex - 1; i >= 0; i--) {
		const checkVersionKey = versions[i].replace('.', '_')
		if (editItem.value.prices_by_version[checkVersionKey] !== undefined) {
			return versions[i]
		}
	}
	return 'base price'
}

function addVersionPrice(versionKey) {
	const inheritedPrice = getInheritedPrice(versionKey)
	editItem.value.prices_by_version[versionKey] = inheritedPrice
}

function removeVersionPrice(versionKey) {
	delete editItem.value.prices_by_version[versionKey]
}

function confirmPricingTypeChange(newType) {
	pendingPricingType.value = newType
	showPricingTypeConfirmation.value = true
}

function applyPricingTypeChange() {
	editItem.value.pricing_type = pendingPricingType.value
	showPricingTypeConfirmation.value = false

	// If switching to dynamic, mark all versions for recalculation
	if (pendingPricingType.value === 'dynamic') {
		availableVersions.value.forEach((version) => {
			const versionKey = version.replace('.', '_')
			recalculationStatus.value[versionKey] = 'needs_recalculation'
		})
	}
}

function cancelPricingTypeChange() {
	showPricingTypeConfirmation.value = false
	pendingPricingType.value = ''
}

async function recalculatePrice(versionKey) {
	recalculationStatus.value[versionKey] = 'calculating'

	try {
		// This would need to be implemented with access to all items
		// For now, just simulate the recalculation
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// In a real implementation, this would call calculateRecipePrice
		// const result = calculateRecipePrice(editItem.value, allItems, versionKey)
		// if (result.price !== null) {
		//   editItem.value.prices_by_version[versionKey] = result.price
		//   recalculationStatus.value[versionKey] = 'success'
		// } else {
		//   recalculationStatus.value[versionKey] = 'error'
		// }

		recalculationStatus.value[versionKey] = 'success'
	} catch (error) {
		recalculationStatus.value[versionKey] = 'error'
	}
}

async function recalculateAllPrices() {
	for (const version of availableVersions.value) {
		const versionKey = version.replace('.', '_')
		await recalculatePrice(versionKey)
	}
}

function getRecalculationStatusText(versionKey) {
	const status = recalculationStatus.value[versionKey]
	switch (status) {
		case 'calculating':
			return 'Calculating...'
		case 'success':
			return 'Up to date'
		case 'error':
			return 'Error in calculation'
		case 'needs_recalculation':
			return 'Needs recalculation'
		default:
			return 'Cached'
	}
}

function getStatusIndicatorClass(versionKey) {
	const status = recalculationStatus.value[versionKey]
	switch (status) {
		case 'calculating':
			return 'bg-yellow-500'
		case 'success':
			return 'bg-green-500'
		case 'error':
			return 'bg-red-500'
		case 'needs_recalculation':
			return 'bg-orange-500'
		default:
			return 'bg-gray-400'
	}
}

async function updateItem() {
	await updateDoc(docRef, {
		...editItem.value
	})
		.then(() => {
			// Navigate back to home with preserved query parameters
			router.push({ path: '/', query: homeQuery.value })
		})
		.catch((error) => {
			console.log(error)
		})
}
</script>

<template>
	<div v-if="canEditItems" class="p-4 pt-8">
		<BackButton />
		<h2 class="text-xl font-bold mb-6">Edit item</h2>
		<form @submit.prevent="updateItem">
			<div class="flex gap-4">
				<div class="flex-1">
					<label for="name">Name</label>
					<input type="text" id="name" v-model="editItem.name" required />
				</div>
				<div class="flex-1">
					<label for="materialId">Material ID</label>
					<input type="text" id="materialId" v-model="editItem.material_id" required />
				</div>
			</div>
			<label for="image">Image</label>
			<input type="text" id="image" v-model="editItem.image" />
			<label for="url">Url</label>
			<input type="text" id="url" v-model="editItem.url" />

			<!-- Enhanced Version Management -->
			<div class="flex gap-4">
				<div class="flex-1">
					<label for="version">Available From</label>
					<select
						id="version"
						v-model="editItem.version"
						required
						class="block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;">
						<option value="">Select a version</option>
						<option v-for="version in versions" :key="version" :value="version">
							{{ version }}
						</option>
					</select>
				</div>
				<div class="flex-1">
					<label for="version_removed">Removed In (Optional)</label>
					<select
						id="version_removed"
						v-model="editItem.version_removed"
						class="block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;">
						<option value="">Still available</option>
						<option
							v-for="version in versions.slice(
								versions.indexOf(editItem.version) + 1
							)"
							:key="version"
							:value="version">
							{{ version }}
						</option>
					</select>
				</div>
			</div>

			<!-- Pricing Type Selection -->
			<div v-if="hasRecipes" class="mb-6">
				<label class="block text-base font-medium leading-6 text-gray-900 mb-3">
					Pricing Type
				</label>
				<div class="flex gap-6">
					<label class="flex items-center cursor-pointer">
						<input
							type="radio"
							value="static"
							:checked="editItem.pricing_type === 'static'"
							@change="
								editItem.pricing_type === 'static'
									? null
									: confirmPricingTypeChange('static')
							"
							class="mr-2" />
						<span>Static - Fixed prices set manually</span>
					</label>
					<label class="flex items-center cursor-pointer">
						<input
							type="radio"
							value="dynamic"
							:checked="editItem.pricing_type === 'dynamic'"
							@change="
								editItem.pricing_type === 'dynamic'
									? null
									: confirmPricingTypeChange('dynamic')
							"
							class="mr-2" />
						<span>Dynamic - Calculated from recipes</span>
					</label>
				</div>
			</div>

			<!-- Version-Aware Pricing Section -->
			<div class="mb-6">
				<div class="flex items-center justify-between mb-4">
					<label class="block text-base font-medium leading-6 text-gray-900">
						Pricing by Version
					</label>
					<button
						v-if="editItem.pricing_type === 'dynamic'"
						type="button"
						@click="recalculateAllPrices"
						class="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white">
						Recalculate All
					</button>
				</div>

				<!-- No Recipes Notice -->
				<div v-if="!hasRecipes" class="flex items-center gap-2 mb-4">
					<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd" />
					</svg>
					<span class="text-sm text-gray-600">
						This item has no recipes and uses static pricing only.
					</span>
				</div>

				<!-- Explicit Price Versions -->
				<div v-if="explicitPriceVersions.length > 0" class="mb-4">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Version-Specific Prices</h3>
					<div class="bg-blue-50 rounded-lg p-3 space-y-2">
						<div
							v-for="versionPrice in explicitPriceVersions"
							:key="versionPrice.versionKey"
							class="flex items-center gap-4 p-2 bg-white rounded border-l-4 border-blue-400">
							<div class="w-12 text-sm font-medium text-blue-700">
								{{ versionPrice.version }}
							</div>
							<div class="flex-1">
								<div
									v-if="editItem.pricing_type === 'static'"
									class="flex items-center gap-2">
									<input
										type="number"
										step="0.1"
										min="0"
										v-model="
											editItem.prices_by_version[versionPrice.versionKey]
										"
										class="w-20 px-2 py-1 border rounded text-sm" />
								</div>
								<div v-else class="flex items-center gap-2">
									<span class="w-20 text-sm font-mono">
										{{ versionPrice.price }}
									</span>
									<span class="text-xs text-gray-500">
										{{ getRecalculationStatusText(versionPrice.versionKey) }}
									</span>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<div
									v-if="editItem.pricing_type === 'dynamic'"
									class="flex items-center gap-1">
									<span
										:class="getStatusIndicatorClass(versionPrice.versionKey)"
										class="w-2 h-2 rounded-full"></span>
									<button
										type="button"
										@click="recalculatePrice(versionPrice.versionKey)"
										:disabled="
											recalculationStatus[versionPrice.versionKey] ===
											'calculating'
										"
										class="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-white disabled:opacity-50">
										{{
											recalculationStatus[versionPrice.versionKey] ===
											'calculating'
												? 'Calculating...'
												: 'Recalculate'
										}}
									</button>
								</div>
								<div v-if="editItem.pricing_type === 'static'">
									<button
										type="button"
										@click="removeVersionPrice(versionPrice.versionKey)"
										class="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white">
										Remove
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Inherited Price Versions -->
				<div v-if="inheritedPriceVersions.length > 0">
					<h3 class="text-sm font-medium text-gray-700 mb-2">Inherited Pricing</h3>
					<div class="bg-gray-50 rounded-lg p-3">
						<div
							v-for="group in groupedVersionPrices.filter((g) => !g.hasExplicitPrice)"
							:key="group.priceKey"
							class="flex items-center gap-4 p-2 bg-white rounded mb-2 last:mb-0">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-medium">{{ group.price }}</span>
									<span class="text-xs text-gray-500">
										(inherited from {{ group.inheritanceSource }})
									</span>
								</div>
								<div class="flex flex-wrap gap-1 mt-1">
									<span
										v-for="version in group.versions"
										:key="version.versionKey"
										class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
										{{ version.version }}
									</span>
								</div>
							</div>
							<div
								v-if="editItem.pricing_type === 'static'"
								class="flex items-center gap-1">
								<div class="relative">
									<select
										@change="
											(e) => {
												if (e.target.value) {
													addVersionPrice(e.target.value)
													e.target.value = ''
												}
											}
										"
										class="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white appearance-none cursor-pointer">
										<option value="">Override Version</option>
										<option
											v-for="version in group.versions"
											:key="version.versionKey"
											:value="version.versionKey">
											{{ version.version }}
										</option>
									</select>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- No Pricing Notice -->
				<div
					v-if="versionPrices.length === 0"
					class="bg-gray-100 rounded-lg p-4 text-center">
					<p class="text-gray-500 text-sm">No versions configured for this item.</p>
				</div>
			</div>

			<div class="flex gap-4">
				<div class="flex-1">
					<label for="stack">Stack</label>
					<input type="number" id="stack" v-model="editItem.stack" required />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="flex-1">
					<label for="category">Category</label>
					<select
						id="category"
						v-model="editItem.category"
						class="block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;">
						<option v-for="cat in categories" :key="cat" :value="cat">
							{{ cat }}
						</option>
					</select>
				</div>
				<div class="flex-1">
					<label for="subcategory">Subcategory</label>
					<input type="text" id="subcategory" v-model="editItem.subcategory" />
				</div>
			</div>

			<button type="submit">Update item</button>
		</form>

		<!-- Pricing Type Confirmation Modal -->
		<div
			v-if="showPricingTypeConfirmation"
			class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div class="bg-white p-6 rounded-lg max-w-md mx-4">
				<h3 class="text-lg font-bold mb-4">Confirm Pricing Type Change</h3>
				<p class="text-gray-600 mb-6">
					<span v-if="pendingPricingType === 'dynamic'">
						Switching to dynamic pricing will calculate prices based on recipes. Current
						fixed prices will be replaced with calculated values.
					</span>
					<span v-else>
						Switching to static pricing will convert all calculated prices to fixed
						values that can be manually edited.
					</span>
				</p>
				<div class="flex gap-3 justify-end">
					<button
						type="button"
						@click="cancelPricingTypeChange"
						class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
						Cancel
					</button>
					<button
						type="button"
						@click="applyPricingTypeChange"
						class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
						Confirm
					</button>
				</div>
			</div>
		</div>
	</div>
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to edit items.</p>
			<RouterLink to="/" class="text-blue-600 hover:underline">Return to Home</RouterLink>
		</div>
	</div>
	<div v-else class="p-4 pt-8">
		<RouterLink to="/login">Login to view this page</RouterLink>
	</div>
</template>

<style lang="scss" scoped>
label {
	@apply block text-base font-medium leading-6 text-gray-900;
}
input[type='text'],
input[type='number'],
textarea {
	@apply block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;
}
button {
	@apply rounded-md bg-gray-asparagus px-3 py-2 mb-6 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600;
}
</style>
