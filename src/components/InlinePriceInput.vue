<script setup>
import { ref, watch, nextTick, computed, onUnmounted } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
	value: {
		type: [Number, String],
		default: null
	},
	isEditing: {
		type: Boolean,
		default: false
	},
	isSaving: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['update:isEditing', 'save', 'cancel'])

const inputRef = ref(null)
const editingValue = ref('')
const showSavingSpinner = ref(false)
let savingTimeout = null

watch(() => props.isSaving, (newVal) => {
	// Clear any existing timeout
	if (savingTimeout) {
		clearTimeout(savingTimeout)
		savingTimeout = null
	}

	if (newVal) {
		// Wait 500ms before showing spinner
		savingTimeout = setTimeout(() => {
			// Only show if still saving after delay
			if (props.isSaving) {
				showSavingSpinner.value = true
			}
		}, 500)
	} else {
		// Immediately hide spinner when not saving
		showSavingSpinner.value = false
	}
})

onUnmounted(() => {
	if (savingTimeout) {
		clearTimeout(savingTimeout)
	}
})

watch(() => props.isEditing, (newVal) => {
	if (newVal) {
		editingValue.value = props.value !== null && props.value !== undefined ? parseFloat(props.value).toFixed(2) : '0.00'
		nextTick(() => {
			if (inputRef.value) {
				inputRef.value.focus()
				inputRef.value.select()
			}
		})
	} else {
		editingValue.value = ''
	}
})

function handleClick() {
	if (!props.isEditing) {
		emit('update:isEditing', true)
	}
}

function handleBlur() {
	const newPrice = parseFloat(editingValue.value)
	if (isNaN(newPrice) || newPrice < 0) {
		emit('cancel')
		return
	}
	emit('save', newPrice)
	emit('update:isEditing', false)
}

function handleEnter() {
	handleBlur()
}

function handleEscape() {
	emit('cancel')
	emit('update:isEditing', false)
}

const displayValue = computed(() => {
	if (props.value === null || props.value === undefined) return '0.00'
	return parseFloat(props.value).toFixed(2)
})
</script>

<template>
	<div
		v-if="!isEditing"
		@click="handleClick"
		:class="[
			'cursor-pointer rounded px-2 py-1 -mx-2 -my-1 flex items-center justify-end gap-1',
			showSavingSpinner && 'opacity-60'
		]">
		<ArrowPathIcon v-if="showSavingSpinner" class="w-4 h-4 text-gray-500 animate-spin" />
		<span>{{ displayValue }}</span>
	</div>
	<input
		v-else
		ref="inputRef"
		v-model="editingValue"
		type="number"
		step="0.01"
		min="0"
		@blur="handleBlur"
		@keyup.enter="handleEnter"
		@keydown.escape="handleEscape"
		class="w-full text-right text-sm text-heavy-metal focus:outline-none bg-norway [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
		autofocus />
</template>

