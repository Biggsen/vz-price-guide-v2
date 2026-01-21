import { ref, computed, nextTick } from 'vue'

export function useCategorizedItemSearch({ items, onSelect }) {
	const searchQuery = ref('')
	const highlightedIndex = ref(-1)
	const dropdownContainer = ref(null)

	const filteredItems = computed(() => {
		const base = items?.value || []
		const query = searchQuery.value.toLowerCase().trim()
		if (!query) return base

		return base.filter(
			(item) =>
				item.name?.toLowerCase().includes(query) ||
				item.material_id?.toLowerCase().includes(query) ||
				item.category?.toLowerCase().includes(query)
		)
	})

	// Group items by category for better organization
	const itemsByCategory = computed(() => {
		const grouped = {}

		filteredItems.value.forEach((item) => {
			const category = item.category || 'Uncategorized'
			if (!grouped[category]) {
				grouped[category] = []
			}
			grouped[category].push(item)
		})

		return grouped
	})

	// Flattened items list for keyboard navigation
	const flattenedItems = computed(() => {
		const flattened = []
		const grouped = itemsByCategory.value

		// Flatten items in the same order they appear visually (by category)
		Object.keys(grouped).forEach((category) => {
			grouped[category].forEach((item) => {
				flattened.push(item)
			})
		})

		return flattened
	})

	// Get visual index of an item in the dropdown (accounting for category grouping)
	function getItemVisualIndex(targetCategory, targetCategoryIndex) {
		let visualIndex = 0
		const grouped = itemsByCategory.value

		for (const [category, categoryItems] of Object.entries(grouped)) {
			if (category === targetCategory) {
				return visualIndex + targetCategoryIndex
			}
			visualIndex += categoryItems.length
		}

		return -1
	}

	function handleSearchInput() {
		highlightedIndex.value = -1
	}

	// Keyboard navigation handlers
	function handleKeyDown(event) {
		if (!flattenedItems.value.length) return

		const oldIndex = highlightedIndex.value

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault()
				if (highlightedIndex.value < 0) {
					highlightedIndex.value = 0
				} else {
					highlightedIndex.value = Math.min(highlightedIndex.value + 1, flattenedItems.value.length - 1)
				}
				break
			case 'ArrowUp':
				event.preventDefault()
				if (highlightedIndex.value < 0) {
					highlightedIndex.value = flattenedItems.value.length - 1
				} else {
					highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
				}
				break
			case 'Enter':
				event.preventDefault()
				if (highlightedIndex.value >= 0 && highlightedIndex.value < flattenedItems.value.length) {
					onSelect?.(flattenedItems.value[highlightedIndex.value])
				}
				break
			case 'Escape':
				event.preventDefault()
				searchQuery.value = ''
				highlightedIndex.value = -1
				break
		}

		// Auto-scroll the dropdown if needed
		if (highlightedIndex.value !== oldIndex && dropdownContainer.value) {
			nextTick(() => {
				const container = dropdownContainer.value
				const highlightedElement = container?.querySelector('.bg-norway')
				if (highlightedElement) {
					highlightedElement.scrollIntoView({ block: 'nearest' })
				}
			})
		}
	}

	return {
		searchQuery,
		highlightedIndex,
		dropdownContainer,
		filteredItems,
		itemsByCategory,
		flattenedItems,
		handleKeyDown,
		handleSearchInput,
		getItemVisualIndex
	}
}

