/**
 * Recipe parsing and validation utilities
 * Converts JSON recipes to internal format with validation
 */

/**
 * Parse items JSON to create ID-to-material mapping
 * @param {Array} itemsJson - Array of items from items_1_16.json
 * @returns {Object} Map of id -> material_id
 */
export function createIdToMaterialMap(itemsJson) {
	const idMap = {}

	if (!Array.isArray(itemsJson)) {
		console.error('Items JSON must be an array')
		return idMap
	}

	itemsJson.forEach((item) => {
		if (item.id && item.name) {
			idMap[item.id] = item.name // name field contains material_id
		}
	})

	return idMap
}

/**
 * Parse a single recipe from JSON format to internal format
 * @param {Object} recipeJson - Single recipe object from recipes JSON
 * @param {Object} idToMaterialMap - Map of item IDs to material IDs
 * @returns {Object} Parsed recipe with validation info
 */
export function parseRecipe(recipeJson, idToMaterialMap) {
	const result = {
		isValid: true,
		warnings: [],
		errors: [],
		outputItem: null,
		ingredients: [],
		rawRecipe: recipeJson
	}

	try {
		// Validate and extract output item
		if (!recipeJson.result || !recipeJson.result.id) {
			result.errors.push('Recipe missing result item')
			result.isValid = false
			return result
		}

		const outputId = recipeJson.result.id
		const outputMaterialId = idToMaterialMap[outputId]

		if (!outputMaterialId) {
			result.errors.push(`Output item ID ${outputId} not found in items database`)
			result.isValid = false
			return result
		}

		result.outputItem = {
			id: outputId,
			material_id: outputMaterialId,
			count: recipeJson.result.count || 1
		}

		// Parse ingredients based on recipe type
		if (recipeJson.inShape) {
			// Shaped recipe - parse 2D array
			result.ingredients = parseShapedIngredients(recipeJson.inShape, idToMaterialMap, result)
		} else if (recipeJson.ingredients) {
			// Shapeless recipe - parse array
			result.ingredients = parseShapelessIngredients(
				recipeJson.ingredients,
				idToMaterialMap,
				result
			)
		} else {
			result.errors.push('Recipe has no ingredients (missing inShape or ingredients)')
			result.isValid = false
		}

		// Final validation
		if (result.ingredients.length === 0) {
			result.errors.push('Recipe has no valid ingredients')
			result.isValid = false
		}
	} catch (error) {
		result.errors.push(`Parse error: ${error.message}`)
		result.isValid = false
	}

	return result
}

/**
 * Parse shaped recipe ingredients from inShape array
 * @param {Array} inShape - 2D array representing crafting grid
 * @param {Object} idToMaterialMap - Map of item IDs to material IDs
 * @param {Object} result - Result object to add warnings/errors to
 * @returns {Array} Array of ingredients with material_id and quantity
 */
function parseShapedIngredients(inShape, idToMaterialMap, result) {
	const ingredientCounts = {}

	if (!Array.isArray(inShape)) {
		result.errors.push('inShape must be an array')
		return []
	}

	// Flatten the 2D array and count ingredients
	inShape.forEach((row, rowIndex) => {
		if (!Array.isArray(row)) {
			result.warnings.push(`Row ${rowIndex} in inShape is not an array`)
			return
		}

		row.forEach((itemId, colIndex) => {
			// Skip null/empty cells
			if (itemId === null || itemId === undefined || itemId === '') {
				return
			}

			const materialId = idToMaterialMap[itemId]
			if (!materialId) {
				result.warnings.push(`Ingredient ID ${itemId} not found in items database`)
				return
			}

			// Count occurrences of this material
			ingredientCounts[materialId] = (ingredientCounts[materialId] || 0) + 1
		})
	})

	// Convert counts to ingredient objects
	return Object.entries(ingredientCounts).map(([materialId, quantity]) => ({
		material_id: materialId,
		quantity
	}))
}

/**
 * Parse shapeless recipe ingredients from ingredients array
 * @param {Array} ingredients - Array of item IDs
 * @param {Object} idToMaterialMap - Map of item IDs to material IDs
 * @param {Object} result - Result object to add warnings/errors to
 * @returns {Array} Array of ingredients with material_id and quantity
 */
function parseShapelessIngredients(ingredients, idToMaterialMap, result) {
	const ingredientCounts = {}

	if (!Array.isArray(ingredients)) {
		result.errors.push('ingredients must be an array')
		return []
	}

	ingredients.forEach((itemId, index) => {
		// Skip null/empty items
		if (itemId === null || itemId === undefined || itemId === '') {
			return
		}

		const materialId = idToMaterialMap[itemId]
		if (!materialId) {
			result.warnings.push(
				`Ingredient ID ${itemId} at index ${index} not found in items database`
			)
			return
		}

		// Count occurrences of this material
		ingredientCounts[materialId] = (ingredientCounts[materialId] || 0) + 1
	})

	// Convert counts to ingredient objects
	return Object.entries(ingredientCounts).map(([materialId, quantity]) => ({
		material_id: materialId,
		quantity
	}))
}

/**
 * Process all recipes from JSON file
 * @param {Object} recipesJson - Full recipes JSON object
 * @param {Object} idToMaterialMap - Map of item IDs to material IDs
 * @returns {Array} Array of parsed recipes with validation info
 */
export function processAllRecipes(recipesJson, idToMaterialMap) {
	const results = []

	if (!recipesJson || typeof recipesJson !== 'object') {
		console.error('Recipes JSON must be an object')
		return results
	}

	// recipesJson is keyed by output item ID, with arrays of recipe variants
	Object.entries(recipesJson).forEach(([outputId, recipeArray]) => {
		if (!Array.isArray(recipeArray)) {
			console.warn(`Recipes for item ${outputId} is not an array`)
			return
		}

		recipeArray.forEach((recipe, index) => {
			const parsed = parseRecipe(recipe, idToMaterialMap)
			parsed.outputId = outputId
			parsed.variantIndex = index
			results.push(parsed)
		})
	})

	return results
}

/**
 * Validate ingredients exist in items database
 * @param {Array} ingredients - Array of ingredient objects
 * @param {Array} dbItems - Array of items from database
 * @returns {Object} Validation result with missing items
 */
export function validateIngredientsInDatabase(ingredients, dbItems) {
	const dbMaterialIds = new Set(dbItems.map((item) => item.material_id))
	const missingIngredients = []
	const validIngredients = []

	ingredients.forEach((ingredient) => {
		if (dbMaterialIds.has(ingredient.material_id)) {
			validIngredients.push(ingredient)
		} else {
			missingIngredients.push(ingredient)
		}
	})

	return {
		allValid: missingIngredients.length === 0,
		validIngredients,
		missingIngredients,
		suggestions: generateMaterialSuggestions(missingIngredients, dbItems)
	}
}

/**
 * Generate suggestions for missing materials
 * @param {Array} missingIngredients - Array of missing ingredient objects
 * @param {Array} dbItems - Array of items from database
 * @returns {Array} Array of suggestion objects
 */
function generateMaterialSuggestions(missingIngredients, dbItems) {
	const suggestions = []

	missingIngredients.forEach((ingredient) => {
		const materialId = ingredient.material_id

		// Simple fuzzy matching - find similar material names
		const similarItems = dbItems.filter((item) => {
			const itemName = item.material_id.toLowerCase()
			const searchName = materialId.toLowerCase()

			// Check if names contain similar words
			return (
				itemName.includes(searchName) ||
				searchName.includes(itemName) ||
				levenshteinDistance(itemName, searchName) <= 2
			)
		})

		suggestions.push({
			missing: materialId,
			quantity: ingredient.quantity,
			similar: similarItems.slice(0, 5) // Top 5 suggestions
		})
	})

	return suggestions
}

/**
 * Simple Levenshtein distance calculation for fuzzy matching
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance between strings
 */
function levenshteinDistance(str1, str2) {
	const matrix = []

	for (let i = 0; i <= str2.length; i++) {
		matrix[i] = [i]
	}

	for (let j = 0; j <= str1.length; j++) {
		matrix[0][j] = j
	}

	for (let i = 1; i <= str2.length; i++) {
		for (let j = 1; j <= str1.length; j++) {
			if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1]
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				)
			}
		}
	}

	return matrix[str2.length][str1.length]
}

/**
 * Convert parsed recipe to internal format for storage
 * @param {Object} parsedRecipe - Recipe from parseRecipe()
 * @returns {Object} Internal recipe format
 */
export function toInternalFormat(parsedRecipe) {
	if (!parsedRecipe.isValid || !parsedRecipe.outputItem) {
		return null
	}

	return {
		material_id: parsedRecipe.outputItem.material_id,
		output_count: parsedRecipe.outputItem.count,
		ingredients: parsedRecipe.ingredients,
		recipe_type: parsedRecipe.rawRecipe.inShape ? 'shaped' : 'shapeless',
		created_at: new Date().toISOString(),
		version: '1.16' // TODO: Make this dynamic
	}
}
