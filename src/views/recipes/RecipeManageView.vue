<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs } from 'firebase/firestore'
import { versions } from '../../constants.js'
import { useAdmin } from '../../utils/admin.js'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()

// State management
const loading = ref(true)
const dbItems = ref([])
const selectedVersion = ref('all') // Changed from '1.16' to 'all'

// Management section state
const existingRecipes = ref([])
const searchQuery = ref('')
const showOnlyInvalid = ref(false)
const showOnlyCircular = ref(false)
const sortKey = ref('material_id')
const sortAsc = ref(true)

// Load database items
async function loadDbItems() {
	const snapshot = await getDocs(collection(db, 'items'))
	dbItems.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

// Get the version of the recipe that would actually be used for price calculation
// (considering version inheritance)
function getActiveRecipeVersion(item, targetVersionKey) {
	if (!item.recipes_by_version) return null

	// Check if recipe exists for exact version
	if (item.recipes_by_version[targetVersionKey]) {
		return targetVersionKey.replace('_', '.')
	}

	// Find the version that would be used (same logic as calculateRecipePrice)
	const availableVersions = Object.keys(item.recipes_by_version)
	const sortedVersions = availableVersions.sort((a, b) => {
		const aVersion = a.replace('_', '.')
		const bVersion = b.replace('_', '.')
		const [aMajor, aMinor] = aVersion.split('.').map(Number)
		const [bMajor, bMinor] = bVersion.split('.').map(Number)
		if (aMajor !== bMajor) return bMajor - aMajor
		return bMinor - aMinor
	})

	const targetVersion = targetVersionKey.replace('_', '.')
	const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)

	for (const availableVersion of sortedVersions) {
		const availableVersionFormatted = availableVersion.replace('_', '.')
		const [avMajor, avMinor] = availableVersionFormatted.split('.').map(Number)
		if (avMajor < targetMajor || (avMajor === targetMajor && avMinor <= targetMinor)) {
			return availableVersionFormatted
		}
	}

	return null
}

// Check if a recipe has a circular dependency
function checkCircularDependency(recipe, item, dbItems, versionKey) {
	if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return false

	const outputMaterialId = item.material_id
	const outputCount = recipe.output_count || 1

	// Check each ingredient to see if it has a recipe that uses this recipe's output
	for (const ingredient of recipe.ingredients) {
		const ingredientItem = dbItems.find((i) => i.material_id === ingredient.material_id)
		if (!ingredientItem || !ingredientItem.recipes_by_version) continue

		// Get recipe for this ingredient (check target version or earlier)
		let ingredientRecipe = ingredientItem.recipes_by_version[versionKey]
		if (!ingredientRecipe && ingredientItem.recipes_by_version) {
			const availableVersions = Object.keys(ingredientItem.recipes_by_version)
			const sortedVersions = availableVersions.sort((a, b) => {
				const aVersion = a.replace('_', '.')
				const bVersion = b.replace('_', '.')
				const [aMajor, aMinor] = aVersion.split('.').map(Number)
				const [bMajor, bMinor] = bVersion.split('.').map(Number)
				if (aMajor !== bMajor) return bMajor - aMajor
				return bMinor - aMinor
			})
			const targetVersion = versionKey.replace('_', '.')
			const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)
			for (const availableVersion of sortedVersions) {
				const availableVersionFormatted = availableVersion.replace('_', '.')
				const [avMajor, avMinor] = availableVersionFormatted.split('.').map(Number)
				if (avMajor < targetMajor || (avMajor === targetMajor && avMinor <= targetMinor)) {
					ingredientRecipe = ingredientItem.recipes_by_version[availableVersion]
					break
				}
			}
		}

		if (ingredientRecipe) {
			// Check if this ingredient's recipe uses the output item as an ingredient
			const ingredientRecipeIngredients = Array.isArray(ingredientRecipe)
				? ingredientRecipe
				: ingredientRecipe.ingredients || []

			const createsCircularDependency = ingredientRecipeIngredients.some(
				(ing) => ing.material_id === outputMaterialId
			)

			if (createsCircularDependency) {
				// Determine if this recipe is decompression (1 → many) or compression (many → 1)
				const isDecompression = outputCount > 1 && recipe.ingredients.length === 1
				const isCompression = outputCount === 1 && ingredient.quantity > 1

				// Return true if it's a circular dependency (both types are circular, but we want to show both)
				return true
			}
		}
	}

	return false
}

// Load existing recipes
async function loadExistingRecipes() {
	if (selectedVersion.value === 'all') {
		// Load recipes from all versions
		existingRecipes.value = dbItems.value
			.filter(
				(item) => item.recipes_by_version && Object.keys(item.recipes_by_version).length > 0
			)
			.flatMap((item) => {
				return Object.entries(item.recipes_by_version).map(([versionKey, recipe]) => {
					// Handle both old format (array) and new format (object)
					const ingredients = Array.isArray(recipe) ? recipe : recipe.ingredients
					const outputCount = Array.isArray(recipe) ? 1 : recipe.output_count

					// Check for self-referencing recipes
					const selfReferencing = ingredients.some(
						(ingredient) => ingredient.material_id === item.material_id
					)

					// Check for circular dependencies
					const recipeObj = Array.isArray(recipe)
						? { ingredients: recipe, output_count: 1 }
						: recipe
					const hasCircularDependency = checkCircularDependency(
						recipeObj,
						item,
						dbItems.value,
						versionKey
					)

					// Check if this recipe is active (used for price calculation)
					const isActive = item.pricing_type === 'dynamic'
					const activeRecipeVersion = getActiveRecipeVersion(item, versionKey)
					const isInherited = activeRecipeVersion !== null && activeRecipeVersion !== versionKey.replace('_', '.')

					return {
						id: item.id, // Include item ID for editing
						material_id: item.material_id,
						name: item.name || '',
						ingredients: ingredients,
						output_count: outputCount,
						isValid: !selfReferencing, // Mark as invalid if self-referencing
						pricing_type: item.pricing_type || 'static',
						selfReferencing: selfReferencing, // Add flag for UI display
						hasCircularDependency: hasCircularDependency, // Add flag for circular dependency
						isActive: isActive, // Recipe is being used for price calculation
						activeRecipeVersion: activeRecipeVersion, // Version of recipe actually used
						isInherited: isInherited, // Recipe is inherited from different version
						version: versionKey.replace('_', '.') // Add version for display
					}
				})
			})
	} else {
		// Load recipes from specific version
		const versionKey = selectedVersion.value.replace('.', '_')
		existingRecipes.value = dbItems.value
			.filter((item) => item.recipes_by_version && item.recipes_by_version[versionKey])
			.map((item) => {
				const recipe = item.recipes_by_version[versionKey]
				// Handle both old format (array) and new format (object)
				const ingredients = Array.isArray(recipe) ? recipe : recipe.ingredients
				const outputCount = Array.isArray(recipe) ? 1 : recipe.output_count

				// Check for self-referencing recipes
				const selfReferencing = ingredients.some(
					(ingredient) => ingredient.material_id === item.material_id
				)

				// Check for circular dependencies
				const recipeObj = Array.isArray(recipe)
					? { ingredients: recipe, output_count: 1 }
					: recipe
				const hasCircularDependency = checkCircularDependency(
					recipeObj,
					item,
					dbItems.value,
					versionKey
				)

				// Check if this recipe is active (used for price calculation)
				const isActive = item.pricing_type === 'dynamic'
				const activeRecipeVersion = getActiveRecipeVersion(item, versionKey)
				const isInherited = activeRecipeVersion !== null && activeRecipeVersion !== selectedVersion.value

				return {
					id: item.id, // Include item ID for editing
					material_id: item.material_id,
					name: item.name || '',
					ingredients: ingredients,
					output_count: outputCount,
					isValid: !selfReferencing, // Mark as invalid if self-referencing
					pricing_type: item.pricing_type || 'static',
					selfReferencing: selfReferencing, // Add flag for UI display
					hasCircularDependency: hasCircularDependency, // Add flag for circular dependency
					isActive: isActive, // Recipe is being used for price calculation
					activeRecipeVersion: activeRecipeVersion, // Version of recipe actually used
					isInherited: isInherited, // Recipe is inherited from different version
					version: selectedVersion.value // Add version for display
				}
			})
	}
}

// Initialize on mount
onMounted(async () => {
	await loadDbItems()
	await loadExistingRecipes()
	loading.value = false
})

// Watch for version changes to reload existing recipes
watch(selectedVersion, async () => {
	await loadExistingRecipes()
})

// Management functionality
const filteredExistingRecipes = computed(() => {
	const query = searchQuery.value.trim().toLowerCase()
	let recipes = existingRecipes.value

	if (query) {
		if (query.includes(',')) {
			// Comma-separated: OR logic
			const searchTerms = query
				.split(',')
				.map((term) => term.trim())
				.filter((term) => term.length > 0)

			if (searchTerms.length > 0) {
				recipes = recipes.filter((recipe) =>
					searchTerms.some(
						(term) =>
							recipe.material_id.toLowerCase().includes(term) ||
							recipe.ingredients.some((ing) =>
								ing.material_id.toLowerCase().includes(term)
							)
					)
				)
			}
		} else {
			// No comma: exact phrase match, treat spaces as underscores
			const normalizedQuery = query.replace(/\s+/g, '_')
			recipes = recipes.filter(
				(recipe) =>
					recipe.material_id.toLowerCase().includes(normalizedQuery) ||
					recipe.ingredients.some((ing) =>
						ing.material_id.toLowerCase().includes(normalizedQuery)
					)
			)
		}
	}

	if (showOnlyInvalid.value) {
		recipes = recipes.filter((recipe) => !recipe.isValid)
	}

	if (showOnlyCircular.value) {
		recipes = recipes.filter((recipe) => recipe.hasCircularDependency)
	}

	// Only sort if a sortKey is selected (not null/empty)
	if (sortKey.value) {
		recipes = [...recipes].sort((a, b) => {
			let aVal, bVal
			if (sortKey.value === 'ingredients') {
				aVal = a.ingredients
					.map((ing) => ing.material_id)
					.join(',')
					.toLowerCase()
				bVal = b.ingredients
					.map((ing) => ing.material_id)
					.join(',')
					.toLowerCase()
			} else if (sortKey.value === 'status') {
				// Sort by status: Valid > Invalid, and Circular > Non-circular within each group
				// Format: "valid-circular", "valid-noncircular", "invalid-circular", "invalid-noncircular"
				const aValid = a.isValid ? 'valid' : 'invalid'
				const aCircular = a.hasCircularDependency ? 'circular' : 'noncircular'
				const bValid = b.isValid ? 'valid' : 'invalid'
				const bCircular = b.hasCircularDependency ? 'circular' : 'noncircular'
				aVal = `${aValid}-${aCircular}`
				bVal = `${bValid}-${bCircular}`
			} else {
				aVal = a[sortKey.value]?.toString().toLowerCase() || ''
				bVal = b[sortKey.value]?.toString().toLowerCase() || ''
			}
			if (aVal < bVal) return sortAsc.value ? -1 : 1
			if (aVal > bVal) return sortAsc.value ? 1 : -1
			return 0
		})
	}

	return recipes
})

function setSort(key) {
	if (sortKey.value === key) {
		sortAsc.value = !sortAsc.value
	} else {
		sortKey.value = key
		sortAsc.value = true
	}
}

function getSortIcon(field) {
	if (sortKey.value !== field) return null
	return sortAsc.value ? 'up' : 'down'
}

// Update getIngredientDisplay to return an array of strings
function getIngredientDisplay(ingredients) {
	return ingredients.map((ing) => `${ing.quantity}x ${ing.material_id}`)
}

function getOutputDisplay(recipe) {
	const outputCount = recipe.output_count || 1
	return `${outputCount}x`
}

// Add a method to highlight search matches
function highlightMatch(text) {
	const query = searchQuery.value.trim()
	if (!query) return text
	// Escape regex special characters in query
	const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const regex = new RegExp(safeQuery, 'gi')
	return text.replace(regex, (match) => `<mark class='bg-yellow-200'>${match}</mark>`)
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

		<h1 class="text-3xl font-bold text-gray-900 mb-6">Manage Recipes</h1>

		<div v-if="loading">Loading...</div>
		<div v-else>
			<!-- Search and filters -->
			<div class="mb-4 flex flex-col items-start">
				<div class="flex gap-2 w-full max-w-md mb-2">
					<input
						type="text"
						v-model="searchQuery"
						placeholder="Search recipes by item name or ingredient..."
						class="border-2 border-gray-asparagus rounded px-3 py-1 flex-1" />
					<button
						type="button"
						@click="
							() => {
								searchQuery = ''
								showOnlyInvalid = false
								showOnlyCircular = false
							}
						"
						class="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 border border-gray-300">
						Reset
					</button>
				</div>
			</div>

			<!-- Version filter -->
			<div class="mb-6">
				<div class="flex flex-wrap gap-2">
					<button
						@click="selectedVersion = 'all'"
						:class="[
							'px-3 py-1 rounded-full text-sm font-medium transition-colors',
							selectedVersion === 'all'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						]">
						All recipes
					</button>
					<button
						v-for="version in versions"
						:key="version"
						@click="selectedVersion = version"
						:class="[
							'px-3 py-1 rounded-full text-sm font-medium transition-colors',
							selectedVersion === version
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						]">
						{{ version }}
					</button>
				</div>
				<div class="flex flex-col gap-2 mt-3">
					<label class="inline-flex items-center">
						<input type="checkbox" v-model="showOnlyInvalid" class="mr-2 checkbox-input" />
						Show only invalid recipes
					</label>
					<label class="inline-flex items-center">
						<input type="checkbox" v-model="showOnlyCircular" class="mr-2 checkbox-input" />
						Show only circular dependency recipes
					</label>
				</div>
			</div>

			<!-- Recipe count -->
			<div class="mb-4 text-sm text-gray-600">
				Showing
				<span class="font-semibold text-gray-900">{{ filteredExistingRecipes.length }}</span>
				of
				<span class="font-semibold text-gray-900">{{ existingRecipes.length }}</span>
				recipes
				<span v-if="filteredExistingRecipes.length !== existingRecipes.length">
					(matching filters)
				</span>
			</div>

			<!-- Recipes table -->
			<div class="bg-white rounded-lg shadow-md overflow-hidden">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 border border-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									@click="setSort('material_id')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
									<div class="flex items-center gap-1">
										Item
										<ArrowUpIcon
											v-if="getSortIcon('material_id') === 'up'"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="getSortIcon('material_id') === 'down'"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th
									v-if="selectedVersion === 'all'"
									@click="setSort('version')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
									<div class="flex items-center gap-1">
										Version
										<ArrowUpIcon
											v-if="getSortIcon('version') === 'up'"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="getSortIcon('version') === 'down'"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th
									@click="setSort('output_count')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
									<div class="flex items-center gap-1">
										Out
										<ArrowUpIcon
											v-if="getSortIcon('output_count') === 'up'"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="getSortIcon('output_count') === 'down'"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th
									@click="setSort('ingredients')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
									<div class="flex items-center gap-1">
										Ingredients
										<ArrowUpIcon
											v-if="getSortIcon('ingredients') === 'up'"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="getSortIcon('ingredients') === 'down'"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th
									@click="setSort('status')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
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
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							<tr
								v-for="recipe in filteredExistingRecipes"
								:key="`${recipe.id}-${recipe.version}`">
								<td class="px-4 py-3 border-r border-gray-200">
									<div class="font-medium text-gray-900">
										<span
											v-html="
												highlightMatch(recipe.name || recipe.material_id)
											"></span>
									</div>
									<div class="text-xs text-gray-500">
										<span v-html="highlightMatch(recipe.material_id)"></span>
									</div>
								</td>
								<td
									v-if="selectedVersion === 'all'"
									class="px-4 py-3 border-r border-gray-200 text-gray-900">
									{{ recipe.version }}
								</td>
								<td class="px-4 py-3 border-r border-gray-200 text-gray-900">
									{{ getOutputDisplay(recipe) }}
								</td>
								<td class="px-4 py-3 border-r border-gray-200 text-gray-900">
									<div
										v-for="(ing, idx) in getIngredientDisplay(
											recipe.ingredients
										)"
										:key="idx"
										class="text-sm break-all"
										v-html="highlightMatch(ing)"></div>
								</td>
								<td class="px-4 py-3 border-r border-gray-200">
									<div class="flex flex-col gap-1">
										<span
											:class="recipe.isValid ? 'text-green-600' : 'text-red-600'"
											:title="recipe.selfReferencing ? 'self-referencing' : ''">
											{{ recipe.isValid ? 'Valid' : 'Invalid' }}
										</span>
										<span
											v-if="recipe.hasCircularDependency"
											class="text-xs text-orange-600"
											title="This recipe has a circular dependency with another recipe">
											Circular
										</span>
										<span
											v-if="recipe.isActive"
											class="text-xs font-semibold text-blue-600"
											title="This recipe is actively being used for price calculation">
											Active
										</span>
										<span
											v-else-if="recipe.pricing_type === 'static'"
											class="text-xs text-gray-500"
											title="Item uses static pricing, recipe not used for calculation">
											Not used
										</span>
										<span
											v-if="recipe.isInherited"
											class="text-xs text-purple-600"
											:title="`Recipe inherited from version ${recipe.activeRecipeVersion}`">
											From {{ recipe.activeRecipeVersion }}
										</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="flex gap-2">
										<RouterLink
											:to="{
												path: `/edit-recipe/${recipe.id}`,
												query: { version: recipe.version }
											}"
											class="rounded bg-semantic-info px-3 py-1 text-sm text-white hover:bg-opacity-80 transition-colors"
											data-cy="edit-recipe-link">
											Edit
										</RouterLink>
										<button
											class="rounded bg-semantic-danger px-3 py-1 text-sm text-white hover:bg-opacity-80 transition-colors">
											Delete
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div v-if="filteredExistingRecipes.length === 0" class="text-center py-8 text-gray-500">
				No recipes found. Import some recipes first.
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

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>

<!-- Table is now styled using Tailwind classes from the styleguide -->
