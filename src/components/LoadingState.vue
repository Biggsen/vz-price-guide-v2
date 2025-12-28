<script setup>
defineProps({
	isLoading: {
		type: Boolean,
		required: true
	},
	hasItems: {
		type: Boolean,
		default: false
	}
})
</script>

<template>
	<div v-if="isLoading" class="text-center py-12">
		<div class="text-gray-asparagus text-lg mb-2">Loading price guide...</div>
		<div class="text-sm text-gray-500">Please wait while we fetch the latest prices</div>
	</div>

	<div v-else-if="!hasItems" class="text-center py-12">
		<div class="text-gray-asparagus text-lg mb-2">No items found</div>
		<div class="text-sm text-gray-500">
			Try adjusting your search terms or category filters
		</div>
	</div>
</template>

