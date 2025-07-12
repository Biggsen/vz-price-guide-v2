<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore'
import { versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import {
	createIdToMaterialMap,
	processAllRecipes,
	validateIngredientsInDatabase,
	toInternalFormat
} from '../utils/recipes.js'
import { recalculateDynamicPrices, getEffectivePrice } from '../utils/pricing.js'
import { ArrowPathIcon, DocumentArrowDownIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()

// State management
const loading = ref(true)
const dbItems = ref([])
const selectedVersion = ref('1.16')
const currentMode = ref('import') // 'import', 'manage', or 'pricing'

// Import section state
const importProgress = ref({ current: 0, total: 0, completed: 0, overwritten: 0, skipped: 0 })
const currentRecipe = ref(null)
const allRecipes = ref([])
const filteredRecipes = ref([]) // New: filtered recipes based on ingredient selection
const selectedIngredient = ref('') // New: selected ingredient for filtering
const availableIngredients = ref([]) // New: list of available ingredients
const idToMaterialMap = ref({})
const importResults = ref([])
const allRecipesAlreadyExist = ref(false)
const allFilteredRecipesAlreadyExist = ref(false)

// Management section state
const existingRecipes = ref([])
const searchQuery = ref('')
const showOnlyInvalid = ref(false)
const sortKey = ref('material_id')
const sortAsc = ref(true)

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

// Load database items
async function loadDbItems() {
	const snapshot = await getDocs(collection(db, 'items'))
	dbItems.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

// Load existing recipes
async function loadExistingRecipes() {
	const versionKey = selectedVersion.value.replace('.', '_')
	existingRecipes.value = dbItems.value
		.filter((item) => item.recipes_by_version && item.recipes_by_version[versionKey])
		.map((item) => {
			const recipe = item.recipes_by_version[versionKey]
			// Handle both old format (array) and new format (object)
			const ingredients = Array.isArray(recipe) ? recipe : recipe.ingredients
			const outputCount = Array.isArray(recipe) ? 1 : recipe.output_count

			return {
				id: item.id, // Include item ID for editing
				material_id: item.material_id,
				ingredients: ingredients,
				output_count: outputCount,
				isValid: true // Assume imported recipes are valid
			}
		})
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

// New: Filter recipes by ingredient
function filterRecipesByIngredient() {
	if (!selectedIngredient.value) {
		filteredRecipes.value = [...allRecipes.value]
	} else {
		filteredRecipes.value = allRecipes.value.filter((recipe) =>
			recipe.ingredients.some(
				(ingredient) => ingredient.material_id === selectedIngredient.value
			)
		)
	}

	// Check if all filtered recipes already exist
	allFilteredRecipesAlreadyExist.value =
		filteredRecipes.value.length > 0 &&
		filteredRecipes.value.every((recipe) => checkRecipeExists(recipe))

	// Reset import progress for filtered recipes
	importProgress.value = {
		current: 0,
		total: filteredRecipes.value.length,
		completed: 0,
		overwritten: 0,
		skipped: 0
	}
}

// Modified: Extract unique ingredients from all recipes
function extractAvailableIngredients() {
	const ingredientSet = new Set()

	allRecipes.value.forEach((recipe) => {
		recipe.ingredients.forEach((ingredient) => {
			ingredientSet.add(ingredient.material_id)
		})
	})

	// Only include ingredients where at least one recipe for that ingredient is not yet imported
	const filtered = Array.from(ingredientSet).filter((ingredientId) => {
		const recipesForIngredient = allRecipes.value.filter((recipe) =>
			recipe.ingredients.some((ing) => ing.material_id === ingredientId)
		)
		return recipesForIngredient.some((recipe) => !checkRecipeExists(recipe))
	})

	availableIngredients.value = filtered.sort()
}

// Modified: Start import with filtering
async function startImport() {
	try {
		// Reset ingredient filter to default
		selectedIngredient.value = ''
		// Load JSON files
		const recipesResponse = await fetch('/resource/recipes_1_16.json')
		const recipesJson = await recipesResponse.json()

		const itemsResponse = await fetch('/resource/items_1_16.json')
		const itemsJson = await itemsResponse.json()

		// Process the data
		idToMaterialMap.value = createIdToMaterialMap(itemsJson)
		allRecipes.value = processAllRecipes(recipesJson, idToMaterialMap.value)

		// Extract available ingredients for filtering
		extractAvailableIngredients()

		// Initially show all recipes
		filteredRecipes.value = [...allRecipes.value]

		// Pre-check: are all recipes already imported?
		const allExist = allRecipes.value.every((recipe) => checkRecipeExists(recipe))
		allRecipesAlreadyExist.value = allExist

		// Set up import progress
		importProgress.value = {
			current: 0,
			total: filteredRecipes.value.length,
			completed: 0,
			overwritten: 0,
			skipped: 0
		}
	} catch (error) {
		console.error('Failed to load recipe files:', error)
		alert('Failed to load recipe files. Please check the console for details.')
	}
}

// Check if recipe already exists for this item
function checkRecipeExists(recipe) {
	if (!recipe || !recipe.outputItem) return false

	const materialId = recipe.outputItem.material_id
	return existingRecipes.value.some((existing) => existing.material_id === materialId)
}

// Modified: Work with filtered recipes
function showNextRecipe() {
	if (importProgress.value.current < filteredRecipes.value.length) {
		currentRecipe.value = filteredRecipes.value[importProgress.value.current]

		// Check if recipe already exists
		currentRecipe.value.alreadyExists = checkRecipeExists(currentRecipe.value)

		// Validate ingredients
		if (currentRecipe.value.ingredients.length > 0) {
			const validation = validateIngredientsInDatabase(
				currentRecipe.value.ingredients,
				dbItems.value
			)
			currentRecipe.value.validation = validation
		}
	} else {
		currentRecipe.value = null
	}
}

async function importCurrentRecipe() {
	if (!currentRecipe.value || !currentRecipe.value.isValid) return

	try {
		const internalRecipe = toInternalFormat(currentRecipe.value)
		if (internalRecipe) {
			// Save to Firestore - store recipe in the item document
			const itemQuery = dbItems.value.find(
				(item) => item.material_id === internalRecipe.material_id
			)
			if (itemQuery) {
				const itemRef = doc(db, 'items', itemQuery.id)
				const versionKey = selectedVersion.value.replace('.', '_')
				await updateDoc(itemRef, {
					[`recipes_by_version.${versionKey}`]: {
						ingredients: internalRecipe.ingredients,
						output_count: internalRecipe.output_count
					},
					pricing_type: 'dynamic'
				})

				if (currentRecipe.value.alreadyExists) {
					importProgress.value.overwritten++
					importResults.value.push({
						recipe: currentRecipe.value,
						status: 'overwritten',
						timestamp: new Date().toISOString()
					})
				} else {
					importProgress.value.completed++
					importResults.value.push({
						recipe: currentRecipe.value,
						status: 'imported',
						timestamp: new Date().toISOString()
					})
				}

				// Refresh database items and existing recipes to show the newly imported recipe
				await loadDbItems()
				await loadExistingRecipes()
			}
		}
	} catch (error) {
		console.error('Failed to import recipe:', error)
	}

	// Move to next recipe
	importProgress.value.current++
	showNextRecipe()
}

function skipCurrentRecipe() {
	importProgress.value.skipped++
	importResults.value.push({
		recipe: currentRecipe.value,
		status: 'skipped',
		timestamp: new Date().toISOString()
	})

	// Move to next recipe
	importProgress.value.current++
	showNextRecipe()
}

// Management functionality
const filteredExistingRecipes = computed(() => {
	const query = searchQuery.value.trim().toLowerCase()
	let recipes = existingRecipes.value.filter(
		(recipe) =>
			recipe.material_id.toLowerCase().includes(query) ||
			recipe.ingredients.some((ing) => ing.material_id.toLowerCase().includes(query))
	)

	if (showOnlyInvalid.value) {
		recipes = recipes.filter((recipe) => !recipe.isValid)
	}

	// Sort recipes
	if (sortKey.value) {
		recipes = [...recipes].sort((a, b) => {
			let aVal = a[sortKey.value]?.toString().toLowerCase() || ''
			let bVal = b[sortKey.value]?.toString().toLowerCase() || ''
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

function getValidationClass(recipe) {
	if (!recipe.isValid) return 'border-red-500 bg-red-50'
	if (recipe.alreadyExists) return 'border-orange-500 bg-orange-50'
	if (recipe.warnings && recipe.warnings.length > 0) return 'border-yellow-500 bg-yellow-50'
	return 'border-green-500 bg-green-50'
}

function getIngredientDisplay(ingredients) {
	return ingredients.map((ing) => `${ing.quantity}x ${ing.material_id}`).join(', ')
}

function getOutputDisplay(recipe) {
	const outputCount = recipe.output_count || 1
	return outputCount > 1 ? `${outputCount}x ${recipe.material_id}` : recipe.material_id
}

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

const showCompletedIngredients = ref(false)
const completedIngredients = computed(() => {
	if (!allRecipes.value || allRecipes.value.length === 0) return []
	const ingredientSet = new Set()
	allRecipes.value.forEach((recipe) => {
		recipe.ingredients.forEach((ingredient) => {
			ingredientSet.add(ingredient.material_id)
		})
	})
	return Array.from(ingredientSet)
		.filter((ingredientId) => {
			const recipesForIngredient = allRecipes.value.filter((recipe) =>
				recipe.ingredients.some((ing) => ing.material_id === ingredientId)
			)
			return recipesForIngredient.every((recipe) => checkRecipeExists(recipe))
		})
		.sort()
})

// Add a computed property for the number of recipes left to import
const recipesLeftToImport = computed(
	() => filteredRecipes.value.filter((r) => !checkRecipeExists(r)).length
)
</script>

<template>
	<div v-if="canBulkUpdate" class="p-4 pt-8">
		<h2 class="text-xl font-bold mb-6">Recipe Management</h2>

		<div v-if="loading">Loading...</div>
		<div v-else>
			<!-- Mode selector -->
			<div class="mb-6">
				<div class="flex gap-4 mb-4">
					<button
						@click="currentMode = 'import'"
						:class="currentMode === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-200'"
						class="px-4 py-2 rounded">
						Import Recipes
					</button>
					<button
						@click="currentMode = 'manage'"
						:class="currentMode === 'manage' ? 'bg-blue-600 text-white' : 'bg-gray-200'"
						class="px-4 py-2 rounded">
						Manage Recipes
					</button>
					<button
						@click="currentMode = 'pricing'"
						:class="
							currentMode === 'pricing' ? 'bg-blue-600 text-white' : 'bg-gray-200'
						"
						class="px-4 py-2 rounded">
						Recalculate Prices
					</button>
				</div>

				<!-- Version selector -->
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

			<!-- Import Mode -->
			<div v-if="currentMode === 'import'">
				<h3 class="text-lg font-semibold mb-4">Import Recipes from JSON</h3>

				<!-- Show message if all recipes already exist -->
				<div
					v-if="allRecipesAlreadyExist && allRecipes.length > 0"
					class="mb-6 bg-green-50 border border-green-200 rounded p-4 text-green-800 text-center">
					<strong>All recipes for this version are already imported.</strong>
					<p class="mt-2">No new recipes to import for version {{ selectedVersion }}.</p>
				</div>

				<!-- Start import button -->
				<div
					v-if="!currentRecipe && allRecipes.length === 0 && !allRecipesAlreadyExist"
					class="mb-4">
					<button
						@click="startImport"
						class="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
						<DocumentArrowDownIcon class="w-5 h-5" />
						Load Recipes
					</button>
					<p class="text-gray-600 mt-2">
						This will load recipes from /resource/recipes_1_16.json and allow you to
						filter and import them.
					</p>
				</div>

				<!-- Reload recipes button -->
				<div v-if="allRecipes.length > 0 && !currentRecipe" class="mb-4">
					<button
						@click="startImport"
						class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
						<ArrowPathIcon class="w-5 h-5" />
						Reload Recipes
					</button>
					<p class="text-gray-600 mt-2">
						Reload recipes from /resource/recipes_1_16.json to refresh the data.
					</p>
				</div>

				<!-- Ingredient Filter Section -->
				<div v-if="allRecipes.length > 0 && !currentRecipe" class="mb-6">
					<h4 class="text-md font-semibold mb-3">Filter Recipes by Ingredient</h4>

					<div class="flex flex-wrap gap-4 items-center mb-4">
						<div class="flex-1 min-w-64">
							<select
								v-model="selectedIngredient"
								@change="filterRecipesByIngredient"
								class="w-full border-2 border-gray-300 rounded px-3 py-2">
								<option value="">All recipes ({{ recipesLeftToImport }})</option>
								<option
									v-for="ingredient in availableIngredients"
									:key="ingredient"
									:value="ingredient">
									{{ ingredient }}
								</option>
							</select>
						</div>

						<div class="flex gap-2">
							<button
								@click="showNextRecipe"
								:disabled="
									filteredRecipes.length === 0 || allFilteredRecipesAlreadyExist
								"
								class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
								Start Import
							</button>

							<!-- prettier-ignore -->
							<button
								v-if="selectedIngredient"
								@click="selectedIngredient = ''; filterRecipesByIngredient()"
								class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
								Clear Filter
							</button>
						</div>
					</div>

					<!-- Show completed ingredients toggle -->
					<div class="mb-2">
						<a
							href="#"
							@click.prevent="showCompletedIngredients = !showCompletedIngredients"
							class="text-blue-600 hover:underline text-sm">
							{{ showCompletedIngredients ? 'Hide' : 'Show' }} completed ingredients
							({{ completedIngredients?.length || 0 }})
						</a>
					</div>
					<ul
						v-if="showCompletedIngredients"
						class="mb-4 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 max-h-40 overflow-y-auto">
						<li v-for="ingredient in completedIngredients" :key="ingredient">
							{{ ingredient }}
						</li>
					</ul>

					<div
						v-if="selectedIngredient"
						class="bg-blue-50 p-3 rounded border border-blue-200">
						<p class="text-sm text-blue-800">
							<strong>{{ filteredRecipes.length }}</strong>
							recipes contain
							<strong>{{ selectedIngredient }}</strong>
							(out of {{ allRecipes.length }} total recipes)
						</p>
					</div>

					<!-- Show message if all filtered recipes already exist for this ingredient -->
					<div
						v-if="allFilteredRecipesAlreadyExist && selectedIngredient"
						class="mt-4 bg-green-50 border border-green-200 rounded p-3 text-green-800 text-center">
						<strong>All recipes for this ingredient are already imported.</strong>
						<p class="mt-1">
							No new recipes to import for ingredient {{ selectedIngredient }} in
							version {{ selectedVersion }}.
						</p>
					</div>
				</div>

				<!-- Progress indicator -->
				<div
					v-if="
						importProgress.total > 0 &&
						(importProgress.current > 0 ||
							importProgress.completed > 0 ||
							importProgress.overwritten > 0 ||
							importProgress.skipped > 0)
					"
					class="mb-4">
					<div class="flex justify-between text-sm text-gray-600 mb-2">
						<span>
							Progress: {{ importProgress.current }} / {{ importProgress.total }}
						</span>
						<span>
							Completed: {{ importProgress.completed }} | Overwritten:
							{{ importProgress.overwritten }} | Skipped: {{ importProgress.skipped }}
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div
							class="bg-blue-600 h-2 rounded-full transition-all duration-300"
							:style="{
								width: `${(importProgress.current / importProgress.total) * 100}%`
							}"></div>
					</div>
				</div>

				<!-- Import completed -->
				<div
					v-if="
						importProgress.total > 0 &&
						!currentRecipe &&
						(importProgress.completed > 0 ||
							importProgress.overwritten > 0 ||
							importProgress.skipped > 0)
					"
					class="text-center p-6 bg-green-50 rounded">
					<h3 class="text-lg font-semibold text-green-600 mb-2">Import Complete!</h3>
					<p>
						Completed: {{ importProgress.completed }} | Overwritten:
						{{ importProgress.overwritten }} | Skipped: {{ importProgress.skipped }}
					</p>
				</div>

				<!-- Current recipe preview -->
				<div v-if="currentRecipe" class="mb-6">
					<div class="border rounded-lg p-4" :class="getValidationClass(currentRecipe)">
						<div class="flex justify-between items-start mb-4">
							<div>
								<h4 class="font-semibold text-lg">
									{{ currentRecipe.outputItem?.material_id || 'Unknown Item' }}
								</h4>
								<p class="text-sm text-gray-600">
									Produces: {{ currentRecipe.outputItem?.count || 1 }}x
									{{ currentRecipe.outputItem?.material_id }}
								</p>
								<p class="text-xs text-blue-600 font-medium">
									Recipe yields {{ currentRecipe.outputItem?.count || 1 }} items
								</p>
							</div>
							<div class="text-right">
								<span
									class="text-sm font-medium"
									:class="
										currentRecipe.alreadyExists
											? 'text-orange-600'
											: currentRecipe.isValid
											? 'text-green-600'
											: 'text-red-600'
									">
									{{
										currentRecipe.alreadyExists
											? 'Already Exists'
											: currentRecipe.isValid
											? 'Valid'
											: 'Invalid'
									}}
								</span>
							</div>
						</div>

						<!-- Ingredients -->
						<div class="mb-4">
							<h5 class="font-medium mb-2">Ingredients:</h5>
							<div class="grid grid-cols-2 gap-2">
								<div
									v-for="ingredient in currentRecipe.ingredients"
									:key="ingredient.material_id"
									class="flex items-center gap-2 p-2 bg-white rounded border">
									<span class="font-medium">{{ ingredient.quantity }}x</span>
									<span>{{ ingredient.material_id }}</span>
									<span
										v-if="
											currentRecipe.validation?.missingIngredients.find(
												(m) => m.material_id === ingredient.material_id
											)
										"
										class="text-red-500 text-sm">
										⚠️ Missing
									</span>
								</div>
							</div>
						</div>

						<!-- Recipe already exists warning -->
						<div v-if="currentRecipe.alreadyExists" class="mb-4">
							<div
								class="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded">
								<strong class="font-bold">⚠️ Recipe Already Exists!</strong>
								<span class="block sm:inline">
									This item already has a recipe for version
									{{ selectedVersion }}. Importing will overwrite the existing
									recipe.
								</span>
							</div>
						</div>

						<!-- Warnings and errors -->
						<div v-if="currentRecipe.warnings?.length > 0" class="mb-2">
							<h5 class="font-medium text-yellow-600">Warnings:</h5>
							<ul class="text-sm text-yellow-600 ml-4">
								<li v-for="warning in currentRecipe.warnings" :key="warning">
									• {{ warning }}
								</li>
							</ul>
						</div>

						<div v-if="currentRecipe.errors?.length > 0" class="mb-4">
							<h5 class="font-medium text-red-600">Errors:</h5>
							<ul class="text-sm text-red-600 ml-4">
								<li v-for="error in currentRecipe.errors" :key="error">
									• {{ error }}
								</li>
							</ul>
						</div>

						<!-- Missing ingredients suggestions -->
						<div v-if="currentRecipe.validation?.suggestions?.length > 0" class="mb-4">
							<h5 class="font-medium text-orange-600">
								Suggestions for missing ingredients:
							</h5>
							<div
								v-for="suggestion in currentRecipe.validation.suggestions"
								:key="suggestion.missing"
								class="text-sm">
								<span class="font-medium">{{ suggestion.missing }}</span>
								:
								<span
									v-for="similar in suggestion.similar"
									:key="similar.material_id"
									class="text-blue-600 mr-2">
									{{ similar.material_id }}
								</span>
							</div>
						</div>

						<!-- Action buttons -->
						<div class="flex gap-4">
							<button
								@click="importCurrentRecipe"
								:disabled="!currentRecipe.isValid"
								:class="
									currentRecipe.alreadyExists
										? 'bg-orange-600 hover:bg-orange-700'
										: 'bg-green-600 hover:bg-green-700'
								"
								class="px-4 py-2 text-white rounded disabled:opacity-50">
								{{
									currentRecipe.alreadyExists
										? 'Overwrite existing recipe'
										: 'Apply recipe to item'
								}}
							</button>
							<button
								@click="skipCurrentRecipe"
								class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
								Skip Recipe
							</button>
						</div>
					</div>
				</div>
				<!-- prettier-ignore -->
				<div v-if="currentRecipe && selectedIngredient" class="mb-4">
					<!-- prettier-ignore -->
					<button @click="selectedIngredient = ''; currentRecipe = null; filterRecipesByIngredient()" class="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
						Choose a different ingredient
					</button>
				</div>
			</div>

			<!-- Manage Mode -->
			<div v-if="currentMode === 'manage'">
				<h3 class="text-lg font-semibold mb-4">Manage Existing Recipes</h3>

				<!-- Search and filters -->
				<div class="mb-4">
					<input
						type="text"
						v-model="searchQuery"
						placeholder="Search recipes by item name or ingredient..."
						class="border-2 border-gray-asparagus rounded px-3 py-1 w-full max-w-md mb-2" />

					<label class="inline-flex items-center">
						<input
							type="checkbox"
							v-model="showOnlyInvalid"
							class="mr-2 align-middle" />
						Show only invalid recipes
					</label>
				</div>

				<!-- Recipes table -->
				<div class="overflow-x-auto">
					<table class="table-auto w-full">
						<thead>
							<tr>
								<th
									@click="setSort('material_id')"
									class="cursor-pointer select-none">
									Item
									<span v-if="sortKey === 'material_id'">
										{{ sortAsc ? '▲' : '▼' }}
									</span>
								</th>
								<th>Output</th>
								<th>Ingredients</th>
								<th>Status</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="recipe in filteredExistingRecipes" :key="recipe.id">
								<td class="font-medium">{{ recipe.material_id }}</td>
								<td class="text-sm">
									{{ getOutputDisplay(recipe) }}
								</td>
								<td class="text-sm">
									{{ getIngredientDisplay(recipe.ingredients) }}
								</td>
								<td>
									<span
										:class="recipe.isValid ? 'text-green-600' : 'text-red-600'">
										{{ recipe.isValid ? 'Valid' : 'Invalid' }}
									</span>
								</td>
								<td>
									<div class="flex gap-2">
										<RouterLink
											:to="`/edit-recipe/${recipe.id}`"
											class="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
											Edit
										</RouterLink>
										<button
											class="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
											Delete
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>

					<div
						v-if="filteredExistingRecipes.length === 0"
						class="text-center py-8 text-gray-500">
						No recipes found.
						{{ currentMode === 'manage' ? 'Import some recipes first.' : '' }}
					</div>
				</div>
			</div>

			<!-- Pricing Mode -->
			<div v-if="currentMode === 'pricing'">
				<h3 class="text-lg font-semibold mb-4">Recalculate Dynamic Prices</h3>

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
						class="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
						{{
							priceRecalculation.isRunning
								? 'Recalculating...'
								: 'Run Price Recalculation'
						}}
					</button>

					<button
						v-if="priceRecalculation.results"
						@click="clearPriceRecalculationResults"
						class="ml-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
						Clear Results
					</button>
				</div>

				<!-- Loading indicator -->
				<div v-if="priceRecalculation.isRunning" class="mb-6">
					<div class="flex items-center gap-2">
						<div
							class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
						<div class="overflow-x-auto">
							<table class="table-auto w-full bg-white rounded border">
								<thead>
									<tr class="bg-gray-50">
										<th
											class="text-left p-2 cursor-pointer select-none"
											@click="setPriceResultsSort('item')">
											Item
											<span v-if="priceResultsSortKey === 'item'">
												{{ priceResultsSortAsc ? '▲' : '▼' }}
											</span>
										</th>
										<th
											class="text-left p-2 cursor-pointer select-none"
											@click="setPriceResultsSort('oldPrice')">
											Old Price
											<span v-if="priceResultsSortKey === 'oldPrice'">
												{{ priceResultsSortAsc ? '▲' : '▼' }}
											</span>
										</th>
										<th
											class="text-left p-2 cursor-pointer select-none"
											@click="setPriceResultsSort('newPrice')">
											New Price
											<span v-if="priceResultsSortKey === 'newPrice'">
												{{ priceResultsSortAsc ? '▲' : '▼' }}
											</span>
										</th>
										<th
											class="text-left p-2 cursor-pointer select-none"
											@click="setPriceResultsSort('status')">
											Status
											<span v-if="priceResultsSortKey === 'status'">
												{{ priceResultsSortAsc ? '▲' : '▼' }}
											</span>
										</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="item in sortedPriceResults" :key="item.material_id">
										<td class="p-2 font-medium">
											{{ item.name || item.material_id }}
										</td>
										<td class="p-2">{{ item.oldPrice || 0 }}</td>
										<td class="p-2">{{ item.newPrice }}</td>
										<td class="p-2">
											<span v-if="item.changed" class="text-green-600">
												Updated
											</span>
											<span v-else class="text-gray-600">No change</span>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<!-- Failed calculations -->
					<div v-if="priceRecalculation.results.failed.length > 0" class="mb-4">
						<h4 class="font-semibold mb-2 text-red-600">Failed Calculations:</h4>
						<div class="overflow-x-auto">
							<table class="table-auto w-full bg-white rounded border">
								<thead>
									<tr class="bg-gray-50">
										<th class="text-left p-2">Item</th>
										<th class="text-left p-2">Error</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="item in priceRecalculation.results.failed"
										:key="item.material_id">
										<td class="p-2 font-medium">
											{{ item.name || item.material_id }}
										</td>
										<td class="p-2 text-red-600 text-sm">{{ item.error }}</td>
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

	<div v-else class="p-4 pt-8">
		<RouterLink to="/login">Login to view this page</RouterLink>
	</div>
</template>

<style scoped>
table {
	border-collapse: collapse;
}
th,
td {
	border: 1px solid #ccc;
	padding: 0.5rem;
}
th {
	background-color: #f9f9f9;
	font-weight: bold;
}
</style>
