<script setup>
import { computed } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { enabledCategories } from '../constants.js'

const props = defineProps({
	visibleCategories: {
		type: Array,
		required: true
	},
	searchQuery: {
		type: String,
		default: ''
	},
	totalItemCount: {
		type: Number,
		required: true
	},
	totalCategoryCounts: {
		type: Object,
		required: true
	},
	allCategoriesWithSearch: {
		type: Object,
		required: true
	},
	showCategoryFilters: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['toggle-category', 'clear-all', 'toggle-visibility'])

const shouldShowCategoryFilters = computed(() => {
	return props.showCategoryFilters || window.innerWidth >= 640
})

function getCategoryCount(cat) {
	if (props.searchQuery && props.searchQuery.trim()) {
		return props.allCategoriesWithSearch[cat]?.length || 0
	}
	return props.totalCategoryCounts[cat] || 0
}

function isCategoryDisabled(cat) {
	return getCategoryCount(cat) === 0
}

function getCategoryButtonClasses(cat) {
	const baseClasses = 'rounded-xl px-2.5 py-1 transition text-xs sm:text-sm'
	const isActive = props.visibleCategories.includes(cat)
	const isDisabled = isCategoryDisabled(cat)

	return [
		baseClasses,
		isActive ? 'bg-gray-asparagus text-white' : 'bg-norway text-heavy-metal',
		isDisabled ? 'cursor-not-allowed opacity-40' : ''
	]
}

function getAllCategoriesButtonClasses() {
	const baseClasses = 'rounded-xl px-2.5 py-1 transition text-xs sm:text-sm font-medium'
	return [
		baseClasses,
		props.visibleCategories.length === 0
			? 'bg-gray-asparagus text-white'
			: 'bg-norway text-heavy-metal hover:bg-amulet'
	]
}
</script>

<template>
	<div>
		<!-- Hide Category Filters Toggle (Mobile Only) -->
		<div class="sm:hidden mb-4">
			<button
				@click="emit('toggle-visibility')"
				class="text-gray-asparagus hover:text-heavy-metal underline text-sm flex items-center gap-1">
				<EyeSlashIcon v-if="showCategoryFilters" class="w-4 h-4" />
				<EyeIcon v-else class="w-4 h-4" />
				{{ showCategoryFilters ? 'Hide category filters' : 'Show category filters' }}
			</button>
		</div>

		<div v-show="shouldShowCategoryFilters" class="flex flex-wrap gap-2 mb-4 justify-start">
			<!-- All Categories Button -->
			<button
				@click="emit('clear-all')"
				:class="getAllCategoriesButtonClasses()">
				All categories ({{ totalItemCount }})
			</button>

			<!-- Individual Category Buttons -->
			<button
				v-for="cat in enabledCategories"
				:key="cat"
				@click="emit('toggle-category', cat)"
				:class="getCategoryButtonClasses(cat)"
				:disabled="isCategoryDisabled(cat)">
				{{ cat.charAt(0).toUpperCase() + cat.slice(1) }} ({{ getCategoryCount(cat) }})
			</button>
		</div>
	</div>
</template>

