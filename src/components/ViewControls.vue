<script setup>
defineProps({
	viewMode: {
		type: String,
		required: true
	},
	layout: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['update:viewMode', 'update:layout'])

function getButtonClasses(isActive) {
	return [
		'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition',
		isActive
			? 'bg-gray-asparagus text-white'
			: 'bg-norway text-heavy-metal hover:bg-gray-100'
	]
}
</script>

<template>
	<div class="mb-4">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-8">
			<!-- View Mode -->
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-heavy-metal">View as:</span>
				<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
					<button
						@click="emit('update:viewMode', 'categories')"
						:class="[
							...getButtonClasses(viewMode === 'categories'),
							'border-r border-gray-asparagus last:border-r-0'
						]">
						Categories
					</button>
					<button
						@click="emit('update:viewMode', 'list')"
						:class="getButtonClasses(viewMode === 'list')">
						List
					</button>
				</div>
			</div>

			<!-- Layout -->
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-heavy-metal">Layout:</span>
				<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
					<button
						@click="emit('update:layout', 'comfortable')"
						:class="[
							...getButtonClasses(layout === 'comfortable'),
							'border-r border-gray-asparagus last:border-r-0'
						]">
						Comfortable
					</button>
					<button
						@click="emit('update:layout', 'condensed')"
						:class="getButtonClasses(layout === 'condensed')">
						Compact
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

