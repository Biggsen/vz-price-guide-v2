<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
	variant: {
		type: String,
		default: 'primary',
		validator: (value) => ['primary', 'secondary'].includes(value)
	},
	loading: {
		type: Boolean,
		default: false
	},
	disabled: {
		type: Boolean,
		default: false
	},
	type: {
		type: String,
		default: 'button'
	}
})

const emit = defineEmits(['click'])
const slots = useSlots()

const buttonClasses = computed(() => {
	const baseClasses =
		'inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200'

	// Add left padding if there's a left icon
	const hasLeftIcon = slots['left-icon']
	const paddingClass = hasLeftIcon ? 'pl-3' : ''

	if (props.variant === 'primary') {
		return `${baseClasses} ${paddingClass} bg-gray-asparagus text-white hover:bg-laurel`
	} else if (props.variant === 'secondary') {
		// Use py-1.5 to match btn-secondary exactly
		const secondaryBaseClasses = baseClasses.replace('py-2', 'py-1.5')
		return `${secondaryBaseClasses} ${paddingClass} bg-norway text-heavy-metal border-2 border-gray-asparagus hover:bg-gray-100`
	}

	return `${baseClasses} ${paddingClass}`
})

const isDisabled = computed(() => {
	return props.disabled || props.loading
})

function handleClick(event) {
	if (!isDisabled.value) {
		emit('click', event)
	}
}
</script>

<template>
	<button :type="type" :class="buttonClasses" :disabled="isDisabled" @click="handleClick">
		<!-- Left Icon Slot -->
		<slot name="left-icon" />

		<!-- Loading Spinner -->
		<svg
			v-if="loading"
			class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
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

		<!-- Main Content -->
		<slot />

		<!-- Right Icon Slot -->
		<slot name="right-icon" />
	</button>
</template>
