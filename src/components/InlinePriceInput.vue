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
	},
	layout: {
		type: String,
		default: 'comfortable',
		validator: (value) => ['comfortable', 'condensed'].includes(value)
	},
	strikethrough: {
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
	if (props.value === null || props.value === undefined || props.value === '') return '—'
	const numValue = parseFloat(props.value)
	if (isNaN(numValue) || numValue === 0) return '—'
	return numValue.toFixed(2)
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
		<span :class="{ 'line-through': strikethrough }">{{ displayValue }}</span>
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
		:class="[
			'w-full text-right text-heavy-metal focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
			layout === 'condensed' ? 'text-sm' : 'text-base',
			'editing-input'
		]"
		autofocus />
</template>

<style>
/* Global style to target parent td when input is editing */
td:has(.editing-input) {
	background-color: #E3C578 !important;
}
</style>

