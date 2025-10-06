<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useFirestore, useDocument, useCollection } from 'vuefire'
import { doc, updateDoc, query, collection, orderBy } from 'firebase/firestore'
import { categories, versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { calculateRecipePrice, getEffectivePrice } from '../utils/pricing.js'
import BackButton from '../components/BackButton.vue'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'

const db = useFirestore()
const router = useRouter()
const route = useRoute()
const { user, canEditItems } = useAdmin()
const docRef = doc(db, 'items', route.params.id)

// Fetch all items for recipe calculations
const allItemsQuery = query(
	collection(db, 'items'),
	orderBy('category', 'asc'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)
const allItemsCollection = useCollection(allItemsQuery)

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
const pendingPricingTypeChange = ref(null)
const originalPricingType = ref('static')

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

		// Store original values for comparison
		originalPricingType.value = editItem.value.pricing_type
		pendingPricingTypeChange.value = null
		recalculationStatus.value = {}
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

function onPricingTypeChange(newType) {
	if (newType !== originalPricingType.value) {
		pendingPricingTypeChange.value = newType
		editItem.value.pricing_type = newType

		// If switching to dynamic, mark all versions for recalculation
		if (newType === 'dynamic') {
			availableVersions.value.forEach((version) => {
				const versionKey = version.replace('.', '_')
				recalculationStatus.value[versionKey] = 'needs_recalculation'
			})
		}
	} else {
		pendingPricingTypeChange.value = null
	}
}

async function recalculatePrice(versionKey) {
	recalculationStatus.value[versionKey] = 'calculating'

	try {
		const allItems = allItemsCollection.value || []

		// Find the nearest previous version with a recipe
		let recipeVersionKey = versionKey
		let foundRecipe = false
		const item = editItem.value
		const versionIndex = versions.findIndex((v) => v.replace('.', '_') === versionKey)
		for (let i = versionIndex; i >= 0; i--) {
			const checkVersionKey = versions[i].replace('.', '_')
			if (item.recipes_by_version && item.recipes_by_version[checkVersionKey]) {
				recipeVersionKey = checkVersionKey
				foundRecipe = true
				break
			}
		}

		if (!foundRecipe) {
			recalculationStatus.value[versionKey] = 'error'
			console.error(
				'No recipe found for',
				item.material_id,
				'in',
				versionKey,
				'or any previous version'
			)
			return
		}

		const result = calculateRecipePrice(item, allItems, recipeVersionKey)
		console.log(
			'Recalculation result for',
			versionKey,
			'using recipe from',
			recipeVersionKey,
			result
		)
		if (result.price !== null) {
			const newPrice = Math.ceil(result.price)
			editItem.value.prices_by_version[versionKey] = newPrice
			recalculationStatus.value[versionKey] = 'success'
		} else {
			recalculationStatus.value[versionKey] = 'error'
			console.error('Recipe calculation failed:', result.error)
		}
	} catch (error) {
		recalculationStatus.value[versionKey] = 'error'
		console.error('Error during recalculation:', error)
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
	// Check if there's a pending pricing type change that needs confirmation
	if (
		pendingPricingTypeChange.value &&
		pendingPricingTypeChange.value !== originalPricingType.value
	) {
		const confirmed = confirm(
			`Are you sure you want to change the pricing type from "${originalPricingType.value}" to "${pendingPricingTypeChange.value}"? This will affect how prices are calculated for this item.`
		)
		if (!confirmed) {
			// Revert the pricing type change
			editItem.value.pricing_type = originalPricingType.value
			pendingPricingTypeChange.value = null
			// Clear recalculation status if reverting from dynamic
			if (originalPricingType.value === 'static') {
				recalculationStatus.value = {}
			}
			return
		}
	}

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

function isBaseVersion(versionKey) {
	return versionKey === editItem.value.version.replace('.', '_')
}
</script>

<template>
	<div v-if="canEditItems" class="p-4 pt-8">
		<BackButton />
		<h1 class="text-3xl font-bold text-gray-900 mb-6">Edit item</h1>
		<form @submit.prevent="updateItem">
			<fieldset class="mb-10">
				<legend
					class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
					Basic Information
				</legend>
				<div class="flex gap-4">
					<div class="flex-1">
						<label for="name" class="label">Name</label>
						<input
							type="text"
							id="name"
							v-model="editItem.name"
							required
							class="input-text" />
					</div>
					<div class="flex-1">
						<label for="materialId" class="label">Material ID</label>
						<input
							type="text"
							id="materialId"
							v-model="editItem.material_id"
							required
							class="input-text" />
					</div>
				</div>
				<label for="image" class="label">Image</label>
				<input type="text" id="image" v-model="editItem.image" class="input-text" />
				<label for="url" class="label">Url</label>
				<input type="text" id="url" v-model="editItem.url" class="input-text" />
			</fieldset>

			<fieldset class="mb-10">
				<legend
					class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
					Availability & Classification
				</legend>
				<div class="flex gap-4">
					<div class="w-1/3">
						<label for="version" class="label">Available From</label>
						<select
							id="version"
							v-model="editItem.version"
							required
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-6 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
							<option value="">Select a version</option>
							<option v-for="version in versions" :key="version" :value="version">
								{{ version }}
							</option>
						</select>
					</div>
					<div class="w-1/3">
						<label for="version_removed" class="label">Removed In (Optional)</label>
						<select
							id="version_removed"
							v-model="editItem.version_removed"
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-6 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
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
					<div class="w-1/3">
						<label for="stack" class="label">Stack</label>
						<select
							id="stack"
							v-model="editItem.stack"
							required
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-6 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
							<option :value="1">1</option>
							<option :value="16">16</option>
							<option :value="64">64</option>
						</select>
					</div>
				</div>
				<!-- Category and Subcategory fields remain below -->
				<div class="flex gap-4 mt-4">
					<div class="flex-1">
						<label for="category" class="label">Category</label>
						<select
							id="category"
							v-model="editItem.category"
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-6 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
							<option v-for="cat in categories" :key="cat" :value="cat">
								{{ cat }}
							</option>
						</select>
					</div>
					<div class="flex-1">
						<label for="subcategory" class="label">Subcategory</label>
						<input
							type="text"
							id="subcategory"
							v-model="editItem.subcategory"
							class="input-text" />
					</div>
				</div>
			</fieldset>

			<fieldset class="mb-10">
				<legend
					class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
					Pricing
				</legend>
				<!-- Pricing Type Selection -->
				<div v-if="hasRecipes" class="mb-6">
					<label class="block text-base font-medium leading-6 text-gray-900 mb-3">
						Pricing Type
					</label>
					<div class="flex flex-col gap-2">
						<label class="flex items-center cursor-pointer">
							<input
								type="radio"
								value="static"
								v-model="editItem.pricing_type"
								@change="onPricingTypeChange('static')"
								class="mr-2 radio-input" />
							<span>Static - Fixed prices set manually</span>
						</label>
						<label class="flex items-center cursor-pointer">
							<input
								type="radio"
								value="dynamic"
								v-model="editItem.pricing_type"
								@change="onPricingTypeChange('dynamic')"
								class="mr-2 radio-input" />
							<span>Dynamic - Calculated from recipes</span>
						</label>
					</div>
				</div>
				<!-- Static pricing notice for items with no recipes -->
				<div
					v-if="!hasRecipes && editItem.pricing_type === 'static'"
					class="flex items-center gap-2 mb-4">
					<ExclamationCircleIcon class="w-5 h-5 text-gray-400" />
					<span class="text-sm text-gray-600">
						This item has no recipes and uses static pricing only.
					</span>
				</div>
				<!-- Pricing Table for Static Pricing (already refactored) -->
				<div v-if="editItem.pricing_type === 'static'" class="mb-6">
					<h3 class="text-base font-medium text-gray-900 mb-2">Pricing by Version</h3>
					<table class="text-md">
						<thead>
							<tr>
								<th class="px-3 py-2 text-left">Version</th>
								<th class="px-3 py-2 text-left">Price</th>
								<th class="px-3 py-2 text-left">Status</th>
								<th class="px-3 py-2 text-left">Action</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="versionPrice in versionPrices"
								:key="versionPrice.versionKey">
								<td class="px-3 py-2">{{ versionPrice.version }}</td>
								<td class="px-3 py-2">
									<input
										v-if="versionPrice.hasExplicitPrice"
										type="number"
										step="0.1"
										min="0"
										v-model="
											editItem.prices_by_version[versionPrice.versionKey]
										"
										class="price-input"
										:required="isBaseVersion(versionPrice.versionKey)" />
									<span v-else class="text-gray-700">
										{{ versionPrice.price }}
									</span>
								</td>
								<td class="px-3 py-2">
									<span v-if="versionPrice.hasExplicitPrice">
										<span v-if="isBaseVersion(versionPrice.versionKey)">
											Base (required)
										</span>
										<span v-else>Explicit</span>
									</span>
									<span v-else>
										Inherited
										<span class="text-xs text-gray-500">
											(from
											{{ getInheritanceSource(versionPrice.versionKey) }})
										</span>
									</span>
								</td>
								<td class="px-3 py-2">
									<button
										v-if="!versionPrice.hasExplicitPrice"
										type="button"
										class="px-3 py-1 text-sm bg-semantic-warning text-white rounded hover:bg-yellow-700 transition-colors"
										@click="addVersionPrice(versionPrice.versionKey)">
										Override
									</button>
									<button
										v-else-if="!isBaseVersion(versionPrice.versionKey)"
										type="button"
										class="px-3 py-1 text-sm bg-semantic-danger text-white rounded hover:bg-red-700 transition-colors"
										@click="removeVersionPrice(versionPrice.versionKey)">
										Remove
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<!-- Dynamic pricing table for dynamic pricing type -->
				<div v-if="editItem.pricing_type === 'dynamic'" class="mb-6">
					<h3 class="text-base font-medium text-gray-900 mb-2">
						Calculated Prices by Version
					</h3>
					<table class="text-md">
						<thead>
							<tr>
								<th class="px-3 py-2 text-left">Version</th>
								<th class="px-3 py-2 text-left">Price</th>
								<th class="px-3 py-2 text-left">Status</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="versionPrice in versionPrices"
								:key="versionPrice.versionKey">
								<td class="px-3 py-2">{{ versionPrice.version }}</td>
								<td class="px-3 py-2">
									<span>{{ versionPrice.price }}</span>
								</td>
								<td class="px-3 py-2">
									<span>
										{{ getRecalculationStatusText(versionPrice.versionKey) }}
									</span>
								</td>
							</tr>
						</tbody>
					</table>
					<!-- Recalculate button -->
					<div class="mt-4">
						<button type="button" @click="recalculateAllPrices" class="btn">
							Recalculate
						</button>
					</div>
				</div>
				<!-- Dynamic pricing and inherited pricing UI remain unchanged -->
				<!-- No Pricing Notice -->
				<div
					v-if="versionPrices.length === 0"
					class="bg-gray-100 rounded-lg p-4 text-center">
					<p class="text-gray-500 text-sm">No versions configured for this item.</p>
				</div>
			</fieldset>

			<div class="flex gap-4">
				<button
					type="submit"
					class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
					Update item
				</button>
				<button
					type="button"
					@click="router.push({ path: '/', query: homeQuery })"
					class="rounded-md bg-white text-gray-700 border-2 border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition">
					Cancel
				</button>
			</div>
		</form>
	</div>
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to edit items.</p>
			<RouterLink to="/" class="text-blue-600 hover:underline">Return to Home</RouterLink>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.label {
	@apply block text-base font-medium leading-6 text-gray-900;
}
.input-text {
	@apply block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-6 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus;
}
.input-number {
	@apply block w-full rounded-md border-0 px-2 py-1.5 mt-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;
}
.price-input {
	@apply w-20 px-3 py-1 border-2 border-gray-asparagus rounded text-sm mb-0 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus;
}
.textarea {
	@apply block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;
}
.btn {
	@apply rounded-md bg-gray-asparagus px-3 py-2 mb-6 text-sm font-semibold text-white shadow-sm hover:bg-highland focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600;
}

.radio-input {
	@apply w-5 h-5;
	accent-color: theme('colors.gray-asparagus');
}
</style>
