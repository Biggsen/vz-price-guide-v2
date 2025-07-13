<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { versions } from '../../constants.js'
import { useAdmin } from '../../utils/admin.js'
import {
	createIdToMaterialMap,
	processAllRecipes,
	validateIngredientsInDatabase,
	toInternalFormat
} from '../../utils/recipes.js'
import { ArrowPathIcon, DocumentArrowDownIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()

// State management
const loading = ref(true)
const dbItems = ref([])
const selectedVersion = ref('1.16')

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

	const filtered = Array.from(ingredientSet).filter((ingredientId) => {
		const recipesForIngredient = allRecipes.value.filter((recipe) =>
			recipe.ingredients.some((ing) => ing.material_id === ingredientId)
		)
		// Only include if at least one output item using this ingredient does NOT already have any recipe in a previous version
		const hasMissing = recipesForIngredient.some((recipe) => {
			const materialId = recipe.outputItem?.material_id
			const targetVersionKey = selectedVersion.value.replace('.', '_')
			const item = dbItems.value.find((item) => item.material_id === materialId)
			if (!item || !item.recipes_by_version) return true
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
					return false // recipe exists for this output item in a previous version
				}
			}
			return true // no recipe exists for this output item in any previous version
		})
		if (ingredientId === 'acacia_log') {
			console.debug(
				'[Ingredient Filter] acacia_log: hasMissing =',
				hasMissing,
				recipesForIngredient
			)
		}
		return hasMissing
	})

	if (filtered.includes('acacia_log')) {
		console.debug('[Ingredient Filter] acacia_log is included in dropdown')
	} else {
		console.debug('[Ingredient Filter] acacia_log is NOT included in dropdown')
	}

	availableIngredients.value = filtered.sort()
}

// Modified: Start import with filtering
async function startImport() {
	try {
		// Reset ingredient filter to default
		selectedIngredient.value = ''
		// Dynamically build file paths based on selectedVersion
		const versionUnderscore = selectedVersion.value.replace('.', '_')
		const recipesResponse = await fetch(`/resource/recipes_${versionUnderscore}.json`)
		const recipesJson = await recipesResponse.json()

		const itemsResponse = await fetch(`/resource/items_${versionUnderscore}.json`)
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
		console.log('allRecipesAlreadyExist:', allRecipesAlreadyExist.value)
		if (!allExist) {
			const notImported = allRecipes.value.filter((r) => !checkRecipeExists(r))
			console.log(
				'Recipes not considered imported:',
				notImported.map((r) => ({
					material_id: r.outputItem?.material_id,
					outputItem: r.outputItem,
					ingredients: r.ingredients
				}))
			)
		}

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

// Check if recipe already exists for this item (with version inheritance and content comparison)
function checkRecipeExists(recipe) {
	if (!recipe || !recipe.outputItem) return false

	const materialId = recipe.outputItem.material_id
	const targetVersionKey = selectedVersion.value.replace('.', '_')

	// Find the item in the database
	const item = dbItems.value.find((item) => item.material_id === materialId)
	if (!item || !item.recipes_by_version) return false

	// First check if recipe exists for the exact target version
	if (item.recipes_by_version[targetVersionKey]) {
		return true
	}

	// If not found, check earlier versions in descending order
	const availableVersions = Object.keys(item.recipes_by_version)
	const sortedVersions = availableVersions.sort((a, b) => {
		// Convert version keys like "1_16" to comparable format
		const aVersion = a.replace('_', '.')
		const bVersion = b.replace('_', '.')
		const [aMajor, aMinor] = aVersion.split('.').map(Number)
		const [bMajor, bMinor] = bVersion.split('.').map(Number)

		// Sort in descending order (newest first)
		if (aMajor !== bMajor) return bMajor - aMajor
		return bMinor - aMinor
	})

	// Find the latest version that's not newer than the target version
	const targetVersion = targetVersionKey.replace('_', '.')
	const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)

	for (const availableVersion of sortedVersions) {
		const availableVersionFormatted = availableVersion.replace('_', '.')
		const [avMajor, avMinor] = availableVersionFormatted.split('.').map(Number)

		// Use this version if it's not newer than target
		if (avMajor < targetMajor || (avMajor === targetMajor && avMinor <= targetMinor)) {
			return true // Any recipe exists for this output item in this or earlier version
		}
	}

	return false
}

// Modified: Work with filtered recipes
function showNextRecipe() {
	if (importProgress.value.current < filteredRecipes.value.length) {
		currentRecipe.value = filteredRecipes.value[importProgress.value.current]

		// Check if recipe already exists (in any previous version)
		const materialId = currentRecipe.value.outputItem?.material_id
		const targetVersionKey = selectedVersion.value.replace('.', '_')
		const item = dbItems.value.find((item) => item.material_id === materialId)
		let exists = false
		if (item && item.recipes_by_version) {
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
					exists = true
					break
				}
			}
		}
		currentRecipe.value.alreadyExists = exists

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

				// Refresh database items to show the newly imported recipe
				await loadDbItems()
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

function getValidationClass(recipe) {
	if (!recipe.isValid) return 'border-red-500 bg-red-50'
	if (recipe.alreadyExists) return 'border-orange-500 bg-orange-50'
	if (recipe.warnings && recipe.warnings.length > 0) return 'border-yellow-500 bg-yellow-50'
	return 'border-green-500 bg-green-50'
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

// Add a computed property to check if a different recipe exists in a previous version
const previousRecipeInfo = computed(() => {
	if (!currentRecipe.value || !currentRecipe.value.outputItem) return null
	const materialId = currentRecipe.value.outputItem.material_id
	const targetVersionKey = selectedVersion.value.replace('.', '_')
	const item = dbItems.value.find((item) => item.material_id === materialId)
	if (!item || !item.recipes_by_version) return null
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
			const existingRecipe = item.recipes_by_version[availableVersion]
			return {
				version: availableVersionFormatted,
				identical: false, // Simplified: always treat as different recipe
				existingRecipe
			}
		}
	}
	return null
})

watch(selectedVersion, () => {
	currentRecipe.value = null
	filteredRecipes.value = []
	availableIngredients.value = []
	selectedIngredient.value = ''
	importProgress.value = { current: 0, total: 0, completed: 0, overwritten: 0, skipped: 0 }
	allRecipesAlreadyExist.value = false
	allFilteredRecipesAlreadyExist.value = false
	allRecipes.value = []
})
</script>

<template>
	<div v-if="canBulkUpdate" class="p-4 pt-8">
		<h2 class="text-xl font-bold mb-6">Import Recipes</h2>

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
			</div>

			<!-- Reload recipes button -->
			<div
				v-if="allRecipes.length > 0 && !currentRecipe && !allRecipesAlreadyExist"
				class="mb-4">
				<button
					@click="startImport"
					class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
					<ArrowPathIcon class="w-5 h-5" />
					Reload Recipes
				</button>
			</div>

			<!-- Ingredient Filter Section -->
			<div
				v-if="allRecipes.length > 0 && !currentRecipe && !allRecipesAlreadyExist"
				class="mb-6">
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
						{{ showCompletedIngredients ? 'Hide' : 'Show' }} completed ingredients ({{
							completedIngredients?.length || 0
						}})
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
						No new recipes to import for ingredient {{ selectedIngredient }} in version
						{{ selectedVersion }}.
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
					<span>Progress: {{ importProgress.current }} / {{ importProgress.total }}</span>
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
								<template v-if="previousRecipeInfo && previousRecipeInfo.identical">
									This item already has an identical recipe in version
									{{ previousRecipeInfo.version }} (inherited for
									{{ selectedVersion }}). Importing will overwrite the inherited
									recipe.
								</template>
								<template
									v-else-if="previousRecipeInfo && !previousRecipeInfo.identical">
									This item already has a different recipe in version
									{{ previousRecipeInfo.version }} (inherited for
									{{ selectedVersion }}). Importing will overwrite the previous
									recipe with the new one shown above.
								</template>
								<template v-else>
									This item already has a recipe for version
									{{ selectedVersion }}. Importing will overwrite the existing
									recipe.
								</template>
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
