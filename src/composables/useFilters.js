import { ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { enabledCategories, baseEnabledVersions } from '../constants.js'

export function useFilters(enabledVersions) {
	const route = useRoute()
	const router = useRouter()

	// State
	const searchQuery = ref('')
	const visibleCategories = shallowRef([])
	const selectedVersion = ref(baseEnabledVersions[baseEnabledVersions.length - 1])

	// Methods
	function toggleCategory(cat) {
		const idx = visibleCategories.value.indexOf(cat)
		if (idx !== -1) {
			// Remove category - create new array without the item
			visibleCategories.value = visibleCategories.value.filter((c) => c !== cat)
		} else {
			// Add category - create new array with the item
			visibleCategories.value = [...visibleCategories.value, cat]
		}
	}

	function clearAllCategories() {
		visibleCategories.value = []
	}

	function resetFilters() {
		visibleCategories.value = []
		searchQuery.value = ''
	}

	function updateSearchQuery(query) {
		searchQuery.value = query
	}

	// Initialize from URL query parameters
	function initializeFromQuery() {
		const catParam = route.query.cat
		const versionParam = route.query.version

		if (catParam !== undefined) {
			if (catParam === '') {
				// Empty cat param means no categories selected (show all)
				visibleCategories.value = []
			} else {
				const selectedCategories = catParam
					.split(',')
					.map((c) => c.trim())
					.filter((c) => enabledCategories.includes(c))
				// Set to selected categories (non-empty array means specific categories)
				visibleCategories.value = selectedCategories
			}
		}

		if (versionParam && enabledVersions.value.includes(versionParam)) {
			selectedVersion.value = versionParam
		}
	}

	// Update URL query parameters
	function updateQuery() {
		const query = {}

		// Add cat param only when specific categories are selected (non-empty array)
		// Empty array means "all categories" so no cat param needed
		if (visibleCategories.value.length > 0) {
			query.cat = visibleCategories.value.join(',')
		}

		// Only add version param if not the default version (latest enabled)
		if (selectedVersion.value !== enabledVersions.value[enabledVersions.value.length - 1]) {
			query.version = selectedVersion.value
		}

		// Update URL without triggering navigation
		router.replace({ query })
	}

	// Watch for changes and update URL
	watch(
		[visibleCategories, selectedVersion],
		() => {
			updateQuery()
		},
		{ deep: true }
	)

	return {
		// State
		searchQuery,
		visibleCategories,
		selectedVersion,

		// Methods
		toggleCategory,
		clearAllCategories,
		resetFilters,
		updateSearchQuery,
		initializeFromQuery
	}
}

