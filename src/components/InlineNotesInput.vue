<script setup>
import { ref, watch, nextTick, computed, onUnmounted } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
	value: {
		type: String,
		default: ''
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
	}
})

const emit = defineEmits(['update:isEditing', 'save', 'cancel'])

const inputRef = ref(null)
const editingValue = ref('')
const showSavingSpinner = ref(false)
const isHandlingEnter = ref(false)
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
		editingValue.value = props.value || ''
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
	// Don't save on blur if we just handled Enter (to avoid double-saving)
	if (isHandlingEnter.value) {
		return
	}
	
	// Don't exit edit mode on blur if we're currently saving
	// The parent component will handle exiting edit mode after save completes
	if (props.isSaving) {
		return
	}
	
	// Get value from input directly to ensure we have the latest value
	const inputValue = inputRef.value ? inputRef.value.value : editingValue.value
	const newNotes = String(inputValue || '').trim()
	
	// Always emit the value, even if empty string
	emit('save', newNotes)
	// Don't exit edit mode here - let the save handler do it after save completes
}

function handleEnter(event) {
	// On Enter, save and exit edit mode
	event.preventDefault()
	event.stopPropagation()
	
	// Don't save if we're currently saving
	if (props.isSaving) {
		return
	}
	
	// Set flag to prevent blur handler from also saving
	isHandlingEnter.value = true
	
	// Read value directly from input element - it should be current
	// The input element's value property is always up-to-date
	const inputElement = inputRef.value
	if (!inputElement) {
		isHandlingEnter.value = false
		return
	}
	
	const inputValue = inputElement.value || ''
	const newNotes = String(inputValue).trim()
	
	// Always emit the value, even if empty string
	emit('save', newNotes)
	
	// Reset flag after a short delay to allow blur to be ignored
	setTimeout(() => {
		isHandlingEnter.value = false
	}, 100)
	
	// Don't exit edit mode here - let the save handler do it after save completes
}

function handleEscape() {
	emit('cancel')
	emit('update:isEditing', false)
}

const displayValue = computed(() => {
	if (!props.value || props.value.trim() === '') return '—'
	return props.value
})
</script>

<template>
	<div
		v-if="!isEditing"
		@click="handleClick"
		:class="[
			'cursor-pointer rounded px-2 py-1 -mx-2 -my-1 flex items-center gap-1',
			showSavingSpinner && 'opacity-60'
		]">
		<ArrowPathIcon v-if="showSavingSpinner" class="w-4 h-4 text-gray-500 animate-spin flex-shrink-0" />
		<span class="text-gray-700">{{ displayValue }}</span>
	</div>
	<input
		v-else
		ref="inputRef"
		v-model="editingValue"
		type="text"
		@blur="handleBlur"
		@keydown.enter="handleEnter"
		@keydown.escape="handleEscape"
		:class="[
			'w-full text-heavy-metal focus:outline-none bg-transparent',
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

