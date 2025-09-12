<script setup>
import { watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
	isOpen: {
		type: Boolean,
		default: false
	},
	title: {
		type: String,
		required: true
	},
	maxWidth: {
		type: String,
		default: 'max-w-2xl'
	},
	showCloseButton: {
		type: Boolean,
		default: true
	},
	closeOnBackdrop: {
		type: Boolean,
		default: true
	}
})

const emit = defineEmits(['close'])

// Lock/unlock body scroll when modal opens/closes
function lockBodyScroll() {
	document.body.style.overflow = 'hidden'
}

function unlockBodyScroll() {
	document.body.style.overflow = ''
}

// Watch for modal open/close state changes
watch(
	() => props.isOpen,
	(isOpen) => {
		if (isOpen) {
			lockBodyScroll()
		} else {
			unlockBodyScroll()
		}
	},
	{ immediate: true }
)

function closeModal() {
	emit('close')
}

function handleBackdropClick() {
	if (props.closeOnBackdrop) {
		closeModal()
	}
}
</script>

<template>
	<!-- Modal backdrop -->
	<div
		v-if="isOpen"
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
		@click="handleBackdropClick">
		<!-- Modal content -->
		<div
			:class="[
				'bg-white rounded-lg shadow-xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden',
				maxWidth
			]"
			@click.stop>
			<!-- Header -->
			<div
				class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
				<h2 class="text-xl font-semibold text-gray-900">{{ title }}</h2>
				<button
					v-if="showCloseButton"
					@click="closeModal"
					class="text-gray-400 hover:text-gray-600 transition-colors">
					<XMarkIcon class="w-6 h-6" />
				</button>
			</div>

			<!-- Content slot -->
			<div class="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
				<slot />
			</div>

			<!-- Footer slot (optional) -->
			<slot name="footer" />
		</div>
	</div>
</template>
