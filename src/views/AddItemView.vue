<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, addDoc, getDocs, query } from 'firebase/firestore'
import { categories, versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { useCollection } from 'vuefire'
import { calculateRecipePrice, getEffectivePrice } from '../utils/pricing.js'
import { orderBy } from 'firebase/firestore'

const db = useFirestore()
const { user, canAddItems } = useAdmin()

const newItemInitial = ref({
	name: '',
	material_id: '',
	image: '',
	url: '',
	price: 1,
	stack: 64,
	category: '',
	subcategory: '',
	version: ''
})

const newItem = ref({
	name: '',
	material_id: '',
	image: '',
	url: '',
	price: 1,
	stack: 64,
	category: '',
	subcategory: '',
	version: '',
	version_removed: '',
	pricing_type: 'static',
	prices_by_version: {},
	recipes_by_version: {}
})

const recalculationStatus = ref({})
const pendingPricingTypeChange = ref(null)
const originalPricingType = ref('static')

// Fetch all items for recipe calculations
const allItemsQuery = query(
	collection(db, 'items'),
	orderBy('category', 'asc'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)
const allItemsCollection = useCollection(allItemsQuery)

// Computed properties for pricing management (copied from EditItemView.vue)
const availableVersions = computed(() => {
	const startIndex = versions.indexOf(newItem.value.version)
	const endIndex = newItem.value.version_removed
		? versions.indexOf(newItem.value.version_removed)
		: versions.length
	return versions.slice(startIndex, endIndex)
})

const hasRecipes = computed(() => {
	return (
		newItem.value.recipes_by_version && Object.keys(newItem.value.recipes_by_version).length > 0
	)
})

const versionPrices = computed(() => {
	return availableVersions.value.map((version) => {
		const versionKey = version.replace('.', '_')
		const price = newItem.value.prices_by_version[versionKey]
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

function getInheritedPrice(versionKey) {
	const currentVersionIndex = versions.findIndex((v) => v.replace('.', '_') === versionKey)
	for (let i = currentVersionIndex - 1; i >= 0; i--) {
		const checkVersionKey = versions[i].replace('.', '_')
		if (newItem.value.prices_by_version[checkVersionKey] !== undefined) {
			return newItem.value.prices_by_version[checkVersionKey]
		}
	}
	return newItem.value.price || 0
}

function addVersionPrice(versionKey) {
	const inheritedPrice = getInheritedPrice(versionKey)
	newItem.value.prices_by_version[versionKey] = inheritedPrice
}

function removeVersionPrice(versionKey) {
	delete newItem.value.prices_by_version[versionKey]
}

function onPricingTypeChange(newType) {
	if (newType !== originalPricingType.value) {
		pendingPricingTypeChange.value = newType
		newItem.value.pricing_type = newType
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
		const item = newItem.value
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
		if (result.price !== null) {
			const newPrice = Math.ceil(result.price)
			newItem.value.prices_by_version[versionKey] = newPrice
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

function isBaseVersion(versionKey) {
	return versionKey === newItem.value.version.replace('.', '_')
}

async function addItem() {
	if (
		pendingPricingTypeChange.value &&
		pendingPricingTypeChange.value !== originalPricingType.value
	) {
		const confirmed = confirm(
			`Are you sure you want to change the pricing type from "${originalPricingType.value}" to "${pendingPricingTypeChange.value}"? This will affect how prices are calculated for this item.`
		)
		if (!confirmed) {
			newItem.value.pricing_type = originalPricingType.value
			pendingPricingTypeChange.value = null
			if (originalPricingType.value === 'static') {
				recalculationStatus.value = {}
			}
			return
		}
	}
	const newDoc = await addDoc(collection(db, 'items'), {
		...newItem.value
	})
	if (newDoc.id) {
		newItem.value = { ...newItemInitial.value }
	}
}

// Add helper to get inherited price and source version
function getInheritedPriceAndSource(versionKey) {
	const currentVersionIndex = versions.findIndex((v) => v.replace('.', '_') === versionKey)
	for (let i = currentVersionIndex - 1; i >= 0; i--) {
		const checkVersionKey = versions[i].replace('.', '_')
		if (newItem.value.prices_by_version[checkVersionKey] !== undefined) {
			return {
				price: newItem.value.prices_by_version[checkVersionKey],
				source: versions[i]
			}
		}
	}
	return { price: newItem.value.price || 0, source: 'base version' }
}
</script>

<template>
	<div v-if="canAddItems" class="p-4 pt-8">
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

		<h1 class="text-3xl font-bold text-gray-900 mb-6">Add Item</h1>
		<form @submit.prevent="addItem">
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
							v-model="newItem.name"
							required
							class="input-text" />
					</div>
					<div class="flex-1">
						<label for="materialId" class="label">Material ID</label>
						<input
							type="text"
							id="materialId"
							v-model="newItem.material_id"
							required
							class="input-text" />
					</div>
				</div>
				<label for="image" class="label">Image</label>
				<input type="text" id="image" v-model="newItem.image" class="input-text" />
				<label for="url" class="label">Url</label>
				<input type="text" id="url" v-model="newItem.url" class="input-text" />
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
							v-model="newItem.version"
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
							v-model="newItem.version_removed"
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-6 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
							<option value="">Still available</option>
							<option
								v-for="version in versions.slice(
									versions.indexOf(newItem.version) + 1
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
							v-model="newItem.stack"
							required
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-6 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
							<option :value="1">1</option>
							<option :value="16">16</option>
							<option :value="64">64</option>
						</select>
					</div>
				</div>
				<div class="flex gap-4 mt-4">
					<div class="flex-1">
						<label for="category" class="label">Category</label>
						<select
							id="category"
							v-model="newItem.category"
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
							v-model="newItem.subcategory"
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
								v-model="newItem.pricing_type"
								@change="onPricingTypeChange('static')"
								class="mr-2 radio-input" />
							<span>Static - Fixed prices set manually</span>
						</label>
						<label class="flex items-center cursor-pointer">
							<input
								type="radio"
								value="dynamic"
								v-model="newItem.pricing_type"
								@change="onPricingTypeChange('dynamic')"
								class="mr-2 radio-input" />
							<span>Dynamic - Calculated from recipes</span>
						</label>
					</div>
				</div>
				<!-- Static pricing notice for items with no recipes -->
				<div
					v-if="!hasRecipes && newItem.pricing_type === 'static'"
					class="flex items-center gap-2 mb-4">
					<span class="text-sm text-gray-600">
						This item has no recipes and uses static pricing only.
					</span>
				</div>
				<!-- Pricing Table for Static Pricing -->
				<div v-if="newItem.pricing_type === 'static'" class="mb-6">
					<h3 class="text-base font-medium text-gray-900 mb-2">Pricing by Version</h3>
					<div v-if="!newItem.version">
						<p class="text-gray-500 text-sm">Select 'Available from' version</p>
					</div>
					<table v-else class="text-md">
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
								v-for="(versionPrice, idx) in versionPrices"
								:key="versionPrice.versionKey">
								<td class="px-3 py-2">{{ versionPrice.version }}</td>
								<td class="px-3 py-2">
									<input
										v-if="isBaseVersion(versionPrice.versionKey)"
										type="number"
										step="0.1"
										min="0"
										v-model="newItem.prices_by_version[versionPrice.versionKey]"
										class="price-input"
										required />
									<input
										v-else-if="versionPrice.hasExplicitPrice"
										type="number"
										step="0.1"
										min="0"
										v-model="newItem.prices_by_version[versionPrice.versionKey]"
										class="price-input" />
									<span v-else class="text-gray-700">
										{{
											getInheritedPriceAndSource(versionPrice.versionKey)
												.price === '' ||
											newItem.prices_by_version[
												versionPrices[0].versionKey
											] === undefined ||
											newItem.prices_by_version[
												versionPrices[0].versionKey
											] === ''
												? ''
												: getInheritedPriceAndSource(
														versionPrice.versionKey
												  ).price
										}}
									</span>
								</td>
								<td class="px-3 py-2">
									<span v-if="isBaseVersion(versionPrice.versionKey)">
										Base (required)
									</span>
									<span v-else>
										Inherited
										<span class="text-xs text-gray-500">
											(from
											{{
												getInheritedPriceAndSource(versionPrice.versionKey)
													.source
											}})
										</span>
									</span>
								</td>
								<td class="px-3 py-2">
									<button
										v-if="
											!isBaseVersion(versionPrice.versionKey) &&
											!versionPrice.hasExplicitPrice
										"
										type="button"
										class="px-3 py-1 text-sm bg-semantic-warning text-white rounded hover:bg-yellow-700 transition-colors"
										@click="addVersionPrice(versionPrice.versionKey)">
										Override
									</button>
									<button
										v-else-if="
											!isBaseVersion(versionPrice.versionKey) &&
											versionPrice.hasExplicitPrice
										"
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
				<div v-if="newItem.pricing_type === 'dynamic'" class="mb-6">
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
					<div class="mt-4">
						<button
							type="button"
							@click="recalculateAllPrices"
							class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
							Recalculate
						</button>
					</div>
				</div>
				<div
					v-if="versionPrices.length === 0"
					class="bg-gray-100 rounded-lg p-4 text-center">
					<p class="text-gray-500 text-sm">No versions configured for this item.</p>
				</div>
			</fieldset>

			<button
				type="submit"
				class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
				Add new item
			</button>
		</form>
	</div>
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to add items.</p>
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
