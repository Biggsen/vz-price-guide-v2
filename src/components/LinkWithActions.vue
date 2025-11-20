<script setup>
import { RouterLink } from 'vue-router'
import { BuildingStorefrontIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

defineOptions({
	name: 'LinkWithActions'
})

const props = defineProps({
	to: {
		type: [String, Object],
		required: true
	},
	label: {
		type: String,
		required: true
	},
	loading: {
		type: Boolean,
		default: false
	}
})

defineEmits(['edit', 'delete'])
</script>

<template>
	<li class="flex items-center gap-3 justify-between text-heavy-metal">
		<RouterLink
			:to="props.to"
			class="inline-flex items-center gap-2 text-base font-semibold text-gray-600 hover:text-heavy-metal transition">
			<BuildingStorefrontIcon class="w-4 h-4 text-gray-500" />
			{{ props.label }}
		</RouterLink>
		<div class="flex items-center gap-1">
			<button
				type="button"
				:disabled="props.loading"
				class="px-1 py-0.5 text-gray-400 hover:text-gray-700 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed"
				@click.stop="$emit('edit')">
				<PencilIcon class="w-4 h-4" />
				<span class="sr-only">Edit</span>
			</button>
			<button
				type="button"
				:disabled="props.loading"
				class="px-1 py-0.5 text-gray-400 hover:text-gray-700 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed"
				@click.stop="$emit('delete')">
				<TrashIcon class="w-4 h-4" />
				<span class="sr-only">Delete</span>
			</button>
		</div>
	</li>
</template>

