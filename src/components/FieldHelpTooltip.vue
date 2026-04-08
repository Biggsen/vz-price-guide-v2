<script setup>
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/solid'

defineProps({
	content: {
		type: String,
		default: ''
	},
	buttonLabel: {
		type: String,
		default: 'More information'
	}
})
</script>

<template>
	<span class="relative inline-flex shrink-0 align-middle group/field-help">
		<button
			type="button"
			class="rounded p-0.5 text-semantic-info hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-asparagus focus-visible:ring-offset-1"
			:aria-label="buttonLabel"
			data-cy="field-help-tooltip-trigger">
			<QuestionMarkCircleIcon class="h-5 w-5" aria-hidden="true" />
		</button>
		<span
			role="tooltip"
			class="pointer-events-none invisible absolute left-full top-1/2 z-20 ml-2 max-h-[70vh] w-max max-w-[min(20rem,calc(100vw-2rem))] -translate-y-1/2 overflow-y-auto rounded border border-gray-200 bg-white p-3 text-left text-xs leading-snug text-gray-700 shadow-lg opacity-0 transition-opacity delay-75 group-hover/field-help:visible group-hover/field-help:opacity-100 group-focus-within/field-help:visible group-focus-within/field-help:opacity-100">
			<slot>
				<span v-if="content" class="whitespace-pre-line">{{ content }}</span>
			</slot>
		</span>
	</span>
</template>
