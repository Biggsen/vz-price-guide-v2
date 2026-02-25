import { ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { enabledCategories, baseEnabledVersions } from '../constants.js'

const HOMEPAGE_SEARCH_KEY = 'homepageSearchQuery'
const HOMEPAGE_CATEGORIES_KEY = 'homepageVisibleCategories'

export function useFilters(enabledVersions) {
	const route = useRoute()
	const router = useRouter()

	// State
	const searchQuery = ref('')
	const visibleCategories = shallowRef([])
	const selectedVersion = ref(baseEnabledVersions[baseEnabledVersions.length - 1])

	function persistSearch() {
		try {
			const q = searchQuery.value || ''
			if (q) {
				localStorage.setItem(HOMEPAGE_SEARCH_KEY, q)
			} else {
				localStorage.removeItem(HOMEPAGE_SEARCH_KEY)
			}
		} catch (e) {
			// ignore
		}
	}

	function persistCategories() {
		try {
			const cats = visibleCategories.value
			if (cats.length > 0) {
				localStorage.setItem(HOMEPAGE_CATEGORIES_KEY, JSON.stringify(cats))
			} else {
				localStorage.removeItem(HOMEPAGE_CATEGORIES_KEY)
			}
		} catch (e) {
			// ignore
		}
	}

	function clearPersistedFilters() {
		try {
			localStorage.removeItem(HOMEPAGE_SEARCH_KEY)
			localStorage.removeItem(HOMEPAGE_CATEGORIES_KEY)
		} catch (e) {
			// ignore
		}
	}

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
		clearPersistedFilters()
	}

	function updateSearchQuery(query) {
		searchQuery.value = query
	}

	// Initialize from URL query parameters (URL > persisted > defaults)
	function initializeFromQuery() {
		const catParam = route.query.cat
		const versionParam = route.query.version

		if (catParam !== undefined) {
			if (catParam === '') {
				visibleCategories.value = []
			} else {
				const selectedCategories = catParam
					.split(',')
					.map((c) => c.trim())
					.filter((c) => enabledCategories.includes(c))
				visibleCategories.value = selectedCategories
			}
		} else {
			try {
				const saved = localStorage.getItem(HOMEPAGE_CATEGORIES_KEY)
				if (saved) {
					const parsed = JSON.parse(saved)
					if (Array.isArray(parsed)) {
						visibleCategories.value = parsed.filter((c) => enabledCategories.includes(c))
					}
				}
			} catch (e) {
				// ignore
			}
		}

		if (route.query.q !== undefined) {
			searchQuery.value = route.query.q || ''
		} else {
			try {
				const saved = localStorage.getItem(HOMEPAGE_SEARCH_KEY)
				if (saved !== null) {
					searchQuery.value = saved
				}
			} catch (e) {
				// ignore
			}
		}

		if (versionParam && enabledVersions.value.includes(versionParam)) {
			selectedVersion.value = versionParam
		} else {
			const savedVersion = localStorage.getItem('selectedVersion')
			if (savedVersion && enabledVersions.value.includes(savedVersion)) {
				selectedVersion.value = savedVersion
			}
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

	// Persist search with debounce (avoid hammering localStorage on every keystroke)
	let searchDebounceTimer = null
	watch(searchQuery, () => {
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
		searchDebounceTimer = setTimeout(() => {
			persistSearch()
			searchDebounceTimer = null
		}, 300)
	})

	// Persist categories immediately on toggle
	watch(
		visibleCategories,
		() => {
			persistCategories()
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

