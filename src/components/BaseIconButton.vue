<script setup>
import { computed } from 'vue'

const props = defineProps({
	variant: {
		type: String,
		default: 'primary',
		validator: (value) =>
			['primary', 'secondary', 'ghost'].includes(value)
	},
	disabled: {
		type: Boolean,
		default: false
	},
	loading: {
		type: Boolean,
		default: false
	},
	type: {
		type: String,
		default: 'button'
	},
	ariaLabel: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['click'])

const buttonClasses = computed(() => {
	const baseClasses =
		'inline-flex items-center justify-center p-1 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed'

	const variantClasses = {
		primary:
			'bg-gray-asparagus text-white hover:bg-opacity-80 focus-visible:outline-gray-asparagus',
		secondary:
			'bg-norway text-heavy-metal hover:bg-sea-mist focus-visible:outline-gray-asparagus',
		ghost:
			'text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-gray-300'
	}

	return `${baseClasses} ${variantClasses[props.variant]}`
})

const isDisabled = computed(() => props.disabled || props.loading)

function handleClick(event) {
	if (!isDisabled.value) {
		emit('click', event)
	}
}
</script>

<template>
	<button
		:type="type"
		:class="buttonClasses"
		:disabled="isDisabled"
		:aria-label="ariaLabel"
		@click="handleClick">
		<!-- Loading Spinner -->
		<svg
			v-if="loading"
			class="w-4 h-4 animate-spin"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24">
			<circle
				class="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				stroke-width="4"></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>

		<!-- Icon Slot -->
		<slot v-else />
	</button>
</template>

<style scoped>
/* Apply consistent icon sizing to SVG elements in slot */
:deep(svg) {
	@apply w-4 h-4;
}
</style>

