<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs } from 'firebase/firestore'
import { versions } from '../../constants.js'
import { useAdmin } from '../../utils/admin.js'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()

// State management
const loading = ref(true)
const dbItems = ref([])
const selectedVersion = ref('1.16')

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
		.map((item) => {
			const recipe = item.recipes_by_version[versionKey]
			// Handle both old format (array) and new format (object)
			const ingredients = Array.isArray(recipe) ? recipe : recipe.ingredients
			const outputCount = Array.isArray(recipe) ? 1 : recipe.output_count

			return {
				id: item.id, // Include item ID for editing
				material_id: item.material_id,
				name: item.name || '',
				ingredients: ingredients,
				output_count: outputCount,
				isValid: true, // Assume imported recipes are valid
				pricing_type: item.pricing_type || 'static'
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
		<h2 class="text-xl font-bold mb-6">Manage Recipes</h2>

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
							}
						"
						class="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 border border-gray-300">
						Reset
					</button>
				</div>
				<label class="inline-flex items-center mt-2">
					<input type="checkbox" v-model="showOnlyInvalid" class="mr-2 align-middle" />
					Show only invalid recipes
				</label>
			</div>

			<!-- Recipes table -->
			<div class="overflow-x-auto">
				<table class="table-auto w-full">
					<thead>
						<tr>
							<th @click="setSort('material_id')" class="cursor-pointer select-none">
								Item
								<span v-if="sortKey === 'material_id'">
									{{ sortAsc ? '▲' : '▼' }}
								</span>
							</th>
							<th @click="setSort('output_count')" class="cursor-pointer select-none">
								Output
								<span v-if="sortKey === 'output_count'">
									{{ sortAsc ? '▲' : '▼' }}
								</span>
							</th>
							<th @click="setSort('pricing_type')" class="cursor-pointer select-none">
								Price Type
								<span v-if="sortKey === 'pricing_type'">
									{{ sortAsc ? '▲' : '▼' }}
								</span>
							</th>
							<th @click="setSort('ingredients')" class="cursor-pointer select-none">
								Ingredients
								<span v-if="sortKey === 'ingredients'">
									{{ sortAsc ? '▲' : '▼' }}
								</span>
							</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="recipe in filteredExistingRecipes" :key="recipe.id">
							<td class="font-medium">
								<span
									v-html="
										highlightMatch(recipe.name || recipe.material_id)
									"></span>
								<span
									class="block text-xs text-gray-500 -mt-1"
									v-html="highlightMatch(recipe.material_id)"></span>
							</td>
							<td class="text-sm">
								{{ getOutputDisplay(recipe) }}
							</td>
							<td class="text-sm">
								{{ recipe.pricing_type }}
							</td>
							<td class="text-sm">
								<span
									v-for="(ing, idx) in getIngredientDisplay(recipe.ingredients)"
									:key="idx"
									class="block"
									v-html="highlightMatch(ing)"></span>
							</td>
							<td>
								<span :class="recipe.isValid ? 'text-green-600' : 'text-red-600'">
									{{ recipe.isValid ? 'Valid' : 'Invalid' }}
								</span>
							</td>
							<td>
								<div class="flex gap-2">
									<RouterLink
										:to="{
											path: `/edit-recipe/${recipe.id}`,
											query: { version: selectedVersion }
										}"
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
					No recipes found. Import some recipes first.
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
