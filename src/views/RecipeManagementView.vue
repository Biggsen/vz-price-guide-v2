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

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()

// State management
const loading = ref(true)
const dbItems = ref([])
const selectedVersion = ref('1.16')
const currentMode = ref('import') // 'import' or 'manage'

// Import section state
const importProgress = ref({ current: 0, total: 0, completed: 0, skipped: 0 })
const currentRecipe = ref(null)
const allRecipes = ref([])
const filteredRecipes = ref([]) // New: filtered recipes based on ingredient selection
const selectedIngredient = ref('') // New: selected ingredient for filtering
const availableIngredients = ref([]) // New: list of available ingredients
const idToMaterialMap = ref({})
const importResults = ref([])

// Management section state
const existingRecipes = ref([])
const searchQuery = ref('')
const showOnlyInvalid = ref(false)
const sortKey = ref('material_id')
const sortAsc = ref(true)

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
		.map((item) => ({
			material_id: item.material_id,
			ingredients: item.recipes_by_version[versionKey],
			isValid: true, // Assume imported recipes are valid
			type: 'crafting'
		}))
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

	// Reset import progress for filtered recipes
	importProgress.value = {
		current: 0,
		total: filteredRecipes.value.length,
		completed: 0,
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

	availableIngredients.value = Array.from(ingredientSet).sort()
}

// Modified: Start import with filtering
async function startImport() {
	try {
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

		// Set up import progress
		importProgress.value = {
			current: 0,
			total: filteredRecipes.value.length,
			completed: 0,
			skipped: 0
		}
	} catch (error) {
		console.error('Failed to load recipe files:', error)
		alert('Failed to load recipe files. Please check the console for details.')
	}
}

// Modified: Work with filtered recipes
function showNextRecipe() {
	if (importProgress.value.current < filteredRecipes.value.length) {
		currentRecipe.value = filteredRecipes.value[importProgress.value.current]

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
					[`recipes_by_version.${versionKey}`]: internalRecipe.ingredients,
					pricing_type: 'dynamic'
				})

				importProgress.value.completed++
				importResults.value.push({
					recipe: currentRecipe.value,
					status: 'imported',
					timestamp: new Date().toISOString()
				})

				// Refresh existing recipes to show the newly imported recipe
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
	if (recipe.warnings && recipe.warnings.length > 0) return 'border-yellow-500 bg-yellow-50'
	return 'border-green-500 bg-green-50'
}

function getIngredientDisplay(ingredients) {
	return ingredients.map((ing) => `${ing.quantity}x ${ing.material_id}`).join(', ')
}
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

				<!-- Start import button -->
				<div v-if="!currentRecipe && allRecipes.length === 0" class="mb-4">
					<button
						@click="startImport"
						class="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">
						Load Recipes
					</button>
					<p class="text-gray-600 mt-2">
						This will load recipes from /resource/recipes_1_16.json and allow you to
						filter and import them.
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
								<option value="">All recipes ({{ allRecipes.length }})</option>
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
								:disabled="filteredRecipes.length === 0"
								class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
								Start Import ({{ filteredRecipes.length }} recipes)
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
				</div>

				<!-- Progress indicator -->
				<div v-if="importProgress.total > 0" class="mb-4">
					<div class="flex justify-between text-sm text-gray-600 mb-2">
						<span>
							Progress: {{ importProgress.current }} / {{ importProgress.total }}
						</span>
						<span>
							Completed: {{ importProgress.completed }} | Skipped:
							{{ importProgress.skipped }}
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
							</div>
							<div class="text-right">
								<span
									class="text-sm font-medium"
									:class="
										currentRecipe.isValid ? 'text-green-600' : 'text-red-600'
									">
									{{ currentRecipe.isValid ? 'Valid' : 'Invalid' }}
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
								class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
								Apply recipe to item
							</button>
							<button
								@click="skipCurrentRecipe"
								class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
								Skip Recipe
							</button>
						</div>
					</div>
				</div>

				<!-- Import completed -->
				<div
					v-if="importProgress.total > 0 && !currentRecipe"
					class="text-center p-6 bg-green-50 rounded">
					<h3 class="text-lg font-semibold text-green-600 mb-2">Import Complete!</h3>
					<p>
						Completed: {{ importProgress.completed }} | Skipped:
						{{ importProgress.skipped }}
					</p>
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
								<th>Ingredients</th>
								<th>Type</th>
								<th>Status</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="recipe in filteredExistingRecipes" :key="recipe.id">
								<td class="font-medium">{{ recipe.material_id }}</td>
								<td class="text-sm">
									{{ getIngredientDisplay(recipe.ingredients) }}
								</td>
								<td>{{ recipe.recipe_type }}</td>
								<td>
									<span
										:class="recipe.isValid ? 'text-green-600' : 'text-red-600'">
										{{ recipe.isValid ? 'Valid' : 'Invalid' }}
									</span>
								</td>
								<td>
									<div class="flex gap-2">
										<button
											class="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
											Edit
										</button>
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
