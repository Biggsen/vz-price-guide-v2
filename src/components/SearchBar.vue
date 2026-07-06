<script setup>
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import BaseButton from './BaseButton.vue'
import { SEARCH_INPUT_TIP } from '../utils/search.js'

defineProps({
	modelValue: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['update:modelValue', 'reset'])
</script>

<template>
	<div class="my-4 flex flex-col lg:flex-row gap-2 items-start">
		<div class="flex flex-row gap-2 w-full lg:flex-1 lg:min-w-0">
			<div class="flex-1 min-w-0 sm:max-w-md">
				<input
					type="text"
					:value="modelValue"
					@input="emit('update:modelValue', ($event.target).value)"
					placeholder="Search for items..."
					class="border-2 border-gray-asparagus rounded px-3 py-2 w-full mb-1 h-10" />
				<p class="text-xs text-gray-500 mb-2 sm:mb-0 hidden sm:block">
					{{ SEARCH_INPUT_TIP }}
				</p>
			</div>
			<div class="flex gap-2 sm:gap-0 sm:ml-2 flex-shrink-0">
				<BaseButton
					@click="emit('reset')"
					variant="tertiary"
					class="flex-1 sm:flex-none sm:whitespace-nowrap sm:mr-2 h-10">
					<ArrowPathIcon class="w-4 h-4 sm:mr-1.5" />
					<span class="hidden sm:inline">Reset</span>
				</BaseButton>
			</div>
		</div>
		<div class="flex gap-2 items-center w-full lg:w-auto lg:ml-auto">
			<slot name="trailing" />
		</div>
	</div>
</template>

