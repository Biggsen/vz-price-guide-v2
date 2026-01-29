<script setup>
import { computed } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
	summary: {
		type: String,
		required: true
	},
	open: {
		type: Boolean,
		default: false
	},
	size: {
		type: String,
		default: 'default',
		validator: (value) => ['default', 'large'].includes(value)
	}
})

const summaryClasses = computed(() => {
	const base =
		'inline-flex items-center cursor-pointer font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded list-none [&::-webkit-details-marker]:hidden'

	if (props.size === 'large') {
		return `${base} gap-2 text-lg text-gray-900 hover:text-gray-700`
	}

	return `${base} gap-1 text-sm text-gray-700 hover:text-gray-900`
})

const iconSizeClass = computed(() => {
	return props.size === 'large' ? 'w-5 h-5' : 'w-4 h-4'
})
</script>

<template>
	<details class="group" :open="open">
		<summary :class="summaryClasses">
			<span v-if="$slots.icon" :class="[iconSizeClass, 'flex-shrink-0']">
				<slot name="icon" />
			</span>
			<span>{{ summary }}</span>
			<ChevronDownIcon
				:class="[
					iconSizeClass,
					'-rotate-90 transition-transform duration-200 group-open:rotate-0'
				]" />
		</summary>
		<div class="mt-3">
			<slot />
		</div>
	</details>
</template>
