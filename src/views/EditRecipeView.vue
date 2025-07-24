<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore'
import { versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { validateIngredientsInDatabase } from '../utils/recipes.js'
import { calculateRecipePrice, getEffectivePrice, customRoundPrice } from '../utils/pricing.js'
import BackButton from '../components/BackButton.vue'
import { TrashIcon, PlusIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()
const router = useRouter()
const route = useRoute()
const { user, canBulkUpdate } = useAdmin()

// State management
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const success = ref(false)

// Recipe data
const item = ref(null)
const selectedVersion = ref('1.16')
const recipe = ref({
	ingredients: [],
	output_count: 1
})

// Ingredient management
const newIngredient = ref({
	material_id: '',
	quantity: 1
})

// Available items for ingredient selection
const availableItems = ref([])
const ingredientSearchQuery = ref('')
const showIngredientDropdown = ref(false)

// Price calculation preview
const pricePreview = ref(null)
const priceCalculationStatus = ref('idle') // 'idle', 'calculating', 'success', 'error'

// Load item and recipe data
async function loadItem() {
	try {
		const itemId = route.params.id
		const itemRef = doc(db, 'items', itemId)
		const itemSnap = await getDoc(itemRef)

		if (!itemSnap.exists()) {
			error.value = 'Item not found'
			return
		}

		item.value = { id: itemSnap.id, ...itemSnap.data() }

		// Load recipe for selected version
		loadRecipeForVersion()

		// Load available items for ingredient selection
		await loadAvailableItems()
	} catch (err) {
		console.error('Error loading item:', err)
		error.value = 'Failed to load item data'
	} finally {
		loading.value = false
	}
}

// Load recipe for the selected version
function loadRecipeForVersion() {
	const versionKey = selectedVersion.value.replace('.', '_')
	const versionRecipe = item.value.recipes_by_version?.[versionKey]

	if (versionRecipe) {
		// Handle both old format (array) and new format (object)
		recipe.value = {
			ingredients: Array.isArray(versionRecipe)
				? versionRecipe
				: versionRecipe.ingredients || [],
			output_count: Array.isArray(versionRecipe) ? 1 : versionRecipe.output_count || 1
		}
	} else {
		// No recipe for this version, start with empty recipe
		recipe.value = {
			ingredients: [],
			output_count: 1
		}
	}
	// Trigger validation and price preview after loading recipe
	validateRecipe()
}

// Load available items for ingredient selection
async function loadAvailableItems() {
	try {
		// Load all items from the database for ingredient selection
		const snapshot = await getDocs(collection(db, 'items'))
		availableItems.value = snapshot.docs
			.map((doc) => ({
				id: doc.id,
				...doc.data()
			}))
			.sort((a, b) => a.material_id.localeCompare(b.material_id))
	} catch (err) {
		console.error('Error loading available items:', err)
	}
	// Trigger validation and price preview after loading items
	validateRecipe()
}

// Filter available items based on search query
const filteredAvailableItems = computed(() => {
	if (!ingredientSearchQuery.value) return []

	const query = ingredientSearchQuery.value.toLowerCase()
	return availableItems.value
		.filter(
			(item) =>
				item.material_id.toLowerCase().includes(query) ||
				item.name.toLowerCase().includes(query)
		)
		.slice(0, 10) // Limit to 10 results
})

// Handle ingredient selection from dropdown
function selectIngredient(materialId) {
	newIngredient.value.material_id = materialId
	ingredientSearchQuery.value = materialId
	showIngredientDropdown.value = false
}

// Add ingredient to recipe
function addIngredient() {
	if (!newIngredient.value.material_id || newIngredient.value.quantity <= 0) {
		return
	}

	// Check if ingredient already exists
	const existingIndex = recipe.value.ingredients.findIndex(
		(ing) => ing.material_id === newIngredient.value.material_id
	)

	if (existingIndex >= 0) {
		// Update existing ingredient quantity
		recipe.value.ingredients[existingIndex].quantity += newIngredient.value.quantity
	} else {
		// Add new ingredient
		recipe.value.ingredients.push({
			material_id: newIngredient.value.material_id,
			quantity: newIngredient.value.quantity
		})
	}

	// Reset form
	newIngredient.value = {
		material_id: '',
		quantity: 1
	}
	showIngredientDropdown.value = false
	ingredientSearchQuery.value = ''

	// Validate recipe after adding ingredient
	validateRecipe()
}

// Remove ingredient from recipe
function removeIngredient(index) {
	recipe.value.ingredients.splice(index, 1)
	validateRecipe()
}

// Update ingredient quantity
function updateIngredientQuantity(index, quantity) {
	if (quantity <= 0) {
		removeIngredient(index)
	} else {
		recipe.value.ingredients[index].quantity = quantity
	}
	validateRecipe()
}

// Validate recipe ingredients
function validateRecipe() {
	if (recipe.value.ingredients.length === 0) {
		pricePreview.value = null
		priceCalculationStatus.value = 'idle'
		return
	}

	// Check for self-referencing recipes
	const selfReferencing = recipe.value.ingredients.some(
		(ingredient) => ingredient.material_id === item.value.material_id
	)
	if (selfReferencing) {
		priceCalculationStatus.value = 'error'
		pricePreview.value = {
			error: `Recipe references itself as an ingredient (${item.value.material_id}). This creates a circular dependency and makes the recipe impossible to craft.`
		}
		return
	}

	// Validate ingredients exist in database (use all items, not just current)
	const validation = validateIngredientsInDatabase(recipe.value.ingredients, availableItems.value)

	if (validation.missingIngredients.length > 0) {
		priceCalculationStatus.value = 'error'
		pricePreview.value = {
			error: `Missing ingredients: ${validation.missingIngredients
				.map((ing) => ing.material_id)
				.join(', ')}`
		}
		return
	}

	// Calculate price preview
	calculatePricePreview()
}

// Calculate price preview for the recipe
async function calculatePricePreview() {
	priceCalculationStatus.value = 'calculating'

	try {
		// Create a temporary item with this recipe for calculation
		const tempItem = {
			...item.value,
			recipes_by_version: {
				[selectedVersion.value.replace('.', '_')]: recipe.value
			}
		}

		const result = calculateRecipePrice(
			tempItem,
			availableItems.value,
			selectedVersion.value.replace('.', '_')
		)

		function formatNum(n) {
			return typeof n === 'number' ? n.toFixed(2).replace(/\.00$/, '') : n
		}

		// Format calculation chain numbers
		const formattedChain = result.chain.map((step) =>
			step.replace(/([0-9]+\.[0-9]+)/g, (m) => formatNum(Number(m)))
		)

		if (result.price !== null) {
			let displayPrice
			if (result.price < 5) {
				displayPrice = Number(result.price.toFixed(1))
			} else {
				displayPrice = Math.round(result.price)
			}
			pricePreview.value = {
				calculatedPrice: displayPrice,
				calculationChain: formattedChain
			}
			priceCalculationStatus.value = 'success'
		} else {
			pricePreview.value = {
				error: result.error,
				calculationChain: formattedChain
			}
			priceCalculationStatus.value = 'error'
		}
	} catch (err) {
		console.error('Error calculating price preview:', err)
		pricePreview.value = {
			error: 'Failed to calculate price preview'
		}
		priceCalculationStatus.value = 'error'
	}
}

// Save recipe
async function saveRecipe() {
	if (!canBulkUpdate.value) {
		error.value = 'You do not have permission to edit recipes'
		return
	}

	saving.value = true
	error.value = null

	try {
		const versionKey = selectedVersion.value.replace('.', '_')
		const itemRef = doc(db, 'items', item.value.id)

		// Prepare recipe data
		const recipeData = {
			ingredients: recipe.value.ingredients,
			output_count: recipe.value.output_count
		}

		// Update the item with the new recipe
		await updateDoc(itemRef, {
			[`recipes_by_version.${versionKey}`]: recipeData,
			pricing_type: 'dynamic' // Set to dynamic since we're adding a recipe
		})

		success.value = true

		// Redirect back to recipe management after a short delay
		setTimeout(() => {
			router.push('/recipes/manage')
		}, 1500)
	} catch (err) {
		console.error('Error saving recipe:', err)
		error.value = 'Failed to save recipe'
	} finally {
		saving.value = false
	}
}

// Delete recipe
async function deleteRecipe() {
	if (!canBulkUpdate.value) {
		error.value = 'You do not have permission to delete recipes'
		return
	}

	if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
		return
	}

	saving.value = true
	error.value = null

	try {
		const versionKey = selectedVersion.value.replace('.', '_')
		const itemRef = doc(db, 'items', item.value.id)

		// Remove the recipe for this version
		const updateData = {}
		updateData[`recipes_by_version.${versionKey}`] = null

		// If no recipes remain, set pricing type to static
		const remainingRecipes = { ...item.value.recipes_by_version }
		delete remainingRecipes[versionKey]

		if (Object.keys(remainingRecipes).length === 0) {
			updateData.pricing_type = 'static'
		}

		await updateDoc(itemRef, updateData)

		success.value = true

		// Redirect back to recipe management after a short delay
		setTimeout(() => {
			router.push('/recipes/manage')
		}, 1500)
	} catch (err) {
		console.error('Error deleting recipe:', err)
		error.value = 'Failed to delete recipe'
	} finally {
		saving.value = false
	}
}

// Watch for version changes
watch(selectedVersion, () => {
	loadRecipeForVersion()
})

// Add a watcher for recipe.output_count to update price preview on change
watch(
	() => recipe.value.output_count,
	() => {
		validateRecipe()
	}
)

// Initialize on mount
onMounted(() => {
	// If a version is provided in the query, use it
	if (route.query.version) {
		selectedVersion.value = route.query.version
	}
	loadItem()
})
</script>

<template>
	<div v-if="canBulkUpdate" class="p-4 pt-8">
		<BackButton @click="router.push('/recipes/manage')" />

		<div v-if="loading" class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-gray-600">Loading recipe...</p>
		</div>

		<div v-else-if="error" class="text-center py-8">
			<div class="bg-red-50 border border-red-200 rounded p-4">
				<h3 class="text-lg font-semibold text-red-800 mb-2">Error</h3>
				<p class="text-red-700">{{ error }}</p>
				<RouterLink to="/recipes" class="text-blue-600 hover:underline mt-4 inline-block">
					Return to Recipe Management
				</RouterLink>
			</div>
		</div>

		<div v-else-if="success" class="text-center py-8">
			<div class="bg-green-50 border border-green-200 rounded p-4">
				<h3 class="text-lg font-semibold text-green-800 mb-2">Success!</h3>
				<p class="text-green-700">Recipe has been saved successfully.</p>
				<p class="text-sm text-green-600 mt-2">Redirecting to Recipe Management...</p>
			</div>
		</div>

		<div v-else>
			<div class="mb-6">
				<h1 class="text-3xl font-bold text-gray-900">Edit Recipe</h1>
				<p class="text-gray-600 mt-2">
					Editing recipe for
					<strong>{{ item?.name }}</strong>
					({{ item?.material_id }})
				</p>
			</div>

			<!-- Version selector -->
			<div class="mb-6">
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Minecraft Version:
				</label>
				<select
					v-model="selectedVersion"
					class="border-2 border-gray-asparagus rounded px-3 py-1 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
					<option v-for="version in versions" :key="version" :value="version">
						{{ version }}
					</option>
				</select>
			</div>

			<!-- Recipe form -->
			<div>
				<!-- Output count -->
				<div class="mb-6">
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Output Count (how many items this recipe produces):
					</label>
					<input
						type="number"
						v-model.number="recipe.output_count"
						min="1"
						max="64"
						class="border-2 border-gray-asparagus rounded px-3 py-1 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus w-24" />
				</div>

				<!-- Ingredients section -->
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-4">Ingredients</h3>

					<!-- Add ingredient form -->
					<div class="mb-4 p-4 bg-gray-50 rounded-lg">
						<div class="flex gap-4 items-end">
							<div class="flex-1">
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Material ID:
								</label>
								<div class="relative">
									<input
										type="text"
										v-model="ingredientSearchQuery"
										@focus="showIngredientDropdown = true"
										@blur="
											setTimeout(() => (showIngredientDropdown = false), 200)
										"
										placeholder="Enter material ID (e.g., iron_ingot)"
										class="border-2 border-gray-asparagus rounded px-3 py-1 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus w-full" />

									<!-- Dropdown for available items -->
									<div
										v-if="
											showIngredientDropdown &&
											filteredAvailableItems.length > 0
										"
										class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
										<div
											v-for="item in filteredAvailableItems"
											:key="item.material_id"
											@click="selectIngredient(item.material_id)"
											class="px-3 py-2 hover:bg-gray-100 cursor-pointer">
											<div class="font-medium">{{ item.material_id }}</div>
											<div class="text-sm text-gray-600">{{ item.name }}</div>
										</div>
									</div>
								</div>
							</div>

							<div class="w-24">
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Quantity:
								</label>
								<input
									type="number"
									v-model.number="newIngredient.quantity"
									min="1"
									max="64"
									class="border-2 border-gray-asparagus rounded px-3 py-1 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus w-full" />
							</div>

							<button
								@click="addIngredient"
								:disabled="
									!newIngredient.material_id || newIngredient.quantity <= 0
								"
								class="inline-flex items-center px-4 py-2 bg-semantic-success text-white text-sm font-medium rounded-md hover:bg-semantic-success/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-semantic-success disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 gap-2">
								<PlusIcon class="w-4 h-4" />
								Add
							</button>
						</div>
					</div>

					<!-- Current ingredients list -->
					<div v-if="recipe.ingredients.length > 0" class="space-y-2">
						<div
							v-for="(ingredient, index) in recipe.ingredients"
							:key="index"
							class="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg">
							<div class="flex-1">
								<span class="font-medium">{{ ingredient.material_id }}</span>
							</div>
							<div class="flex items-center gap-2">
								<input
									type="number"
									:value="ingredient.quantity"
									@input="
										updateIngredientQuantity(
											index,
											parseInt($event.target.value) || 0
										)
									"
									min="1"
									max="64"
									class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-center focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus" />
								<span class="text-gray-600">x</span>
							</div>
							<button
								@click="removeIngredient(index)"
								class="text-red-600 hover:text-red-800 p-1">
								<TrashIcon class="w-4 h-4" />
							</button>
						</div>
					</div>

					<div v-else class="text-center py-8 text-gray-500">
						<p>No ingredients added yet.</p>
						<p class="text-sm">Add ingredients above to create the recipe.</p>
					</div>
				</div>

				<!-- Price preview -->
				<div
					v-if="recipe.ingredients.length > 0"
					class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<h4 class="font-semibold text-blue-800 mb-2">Price Preview</h4>

					<div
						v-if="priceCalculationStatus === 'calculating'"
						class="flex items-center gap-2">
						<div
							class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
						<span class="text-blue-700">Calculating price...</span>
					</div>

					<div v-else-if="priceCalculationStatus === 'success'" class="text-blue-700">
						<p>
							<strong>Calculated Price:</strong>
							{{ pricePreview.calculatedPrice }} coins
						</p>
						<p v-if="pricePreview.calculationChain.length > 0" class="text-sm mt-1">
							<strong>Calculation Chain:</strong>
							{{ pricePreview.calculationChain.join(' → ') }}
						</p>
					</div>

					<div v-else-if="priceCalculationStatus === 'error'" class="text-red-700">
						<p>
							<strong>Error:</strong>
							{{ pricePreview.error }}
						</p>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="flex gap-4 pt-4 border-t border-gray-200">
					<button
						@click="saveRecipe"
						:disabled="saving || recipe.ingredients.length === 0"
						class="inline-flex items-center px-4 py-2 bg-semantic-success text-white text-sm font-medium rounded-md hover:bg-semantic-success/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-semantic-success disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
						{{ saving ? 'Saving...' : 'Save Recipe' }}
					</button>

					<button
						v-if="item?.recipes_by_version?.[selectedVersion.replace('.', '_')]"
						@click="deleteRecipe"
						:disabled="saving"
						class="inline-flex items-center px-4 py-2 bg-semantic-danger text-white text-sm font-medium rounded-md hover:bg-semantic-danger/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-semantic-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
						{{ saving ? 'Deleting...' : 'Delete Recipe' }}
					</button>

					<RouterLink
						to="/recipes/manage"
						class="inline-flex items-center px-4 py-2 bg-white text-gray-700 border-2 border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-200">
						Cancel
					</RouterLink>
				</div>
			</div>
		</div>
	</div>

	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to edit recipes.</p>
			<RouterLink to="/" class="text-blue-600 hover:underline">Return to Home</RouterLink>
		</div>
	</div>
</template>
