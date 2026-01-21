import { ref, computed } from 'vue'

export function useEnchantmentSearch({ items, getLabel, onSelect, minQueryLength = 1 }) {
	const searchQuery = ref('')
	const highlightedIndex = ref(-1)
	const dropdownContainer = ref(null)

	const filteredItems = computed(() => {
		if (!searchQuery.value || searchQuery.value.length < minQueryLength) return []

		const query = searchQuery.value.toLowerCase().trim()
		if (!query) return []

		return (items?.value || []).filter((item) => {
			const label = getLabel?.(item) || ''
			return label.toLowerCase().includes(query)
		})
	})

	function scrollToHighlighted() {
		if (!dropdownContainer.value || highlightedIndex.value < 0) return

		setTimeout(() => {
			const highlightedElement = dropdownContainer.value.querySelector('.bg-norway')
			if (highlightedElement) {
				highlightedElement.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest'
				})
			}
		}, 0)
	}

	function handleSearchInput() {
		highlightedIndex.value = -1
	}

	function handleKeyDown(event) {
		if (!filteredItems.value.length) return

		const oldIndex = highlightedIndex.value

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault()
				if (highlightedIndex.value < 0) {
					highlightedIndex.value = 0
				} else {
					highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredItems.value.length - 1)
				}
				break
			case 'ArrowUp':
				event.preventDefault()
				if (highlightedIndex.value <= 0) {
					highlightedIndex.value = -1
				} else {
					highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
				}
				break
			case 'Enter':
				event.preventDefault()
				if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredItems.value.length) {
					onSelect?.(filteredItems.value[highlightedIndex.value])
				}
				break
			case 'Escape':
				searchQuery.value = ''
				highlightedIndex.value = -1
				break
		}

		if (oldIndex !== highlightedIndex.value && highlightedIndex.value >= 0) {
			scrollToHighlighted()
		}
	}

	return {
		searchQuery,
		highlightedIndex,
		dropdownContainer,
		filteredItems,
		handleSearchInput,
		handleKeyDown
	}
}

