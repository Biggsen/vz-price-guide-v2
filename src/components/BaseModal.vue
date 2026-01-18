<script setup>
import { watch, computed } from 'vue'
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
	size: {
		type: String,
		default: 'normal',
		validator: (value) => ['small', 'normal', 'large'].includes(value)
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

// Computed properties for size-based styling
const sizeClasses = computed(() => {
	switch (props.size) {
		case 'small':
			return {
				maxWidth: 'max-w-sm',
				headerPadding: 'p-4',
				contentPadding: 'p-4 pt-0',
				footerPadding: '',
				titleSize: 'text-lg',
				contentSize: 'text-base',
				headerBorder: '',
				footerBorder: '',
				footerBackground: '',
				footerFlex: ''
			}
		case 'large':
			return {
				maxWidth: 'max-w-4xl',
				headerPadding: 'p-6',
				contentPadding: 'p-6',
				footerPadding: 'p-6',
				titleSize: 'text-xl',
				contentSize: 'text-base',
				headerBorder: 'border-b border-gray-200',
				footerBorder: 'border-t border-gray-200',
				footerBackground: 'bg-gray-50',
				footerFlex: 'flex-shrink-0'
			}
		default: // normal
			return {
				maxWidth: props.maxWidth,
				headerPadding: 'p-4 sm:p-6',
				contentPadding: 'p-4 sm:p-6',
				footerPadding: 'p-4 sm:p-6',
				titleSize: 'text-xl',
				contentSize: 'text-base',
				headerBorder: 'border-b border-gray-200',
				footerBorder: 'border-t border-gray-200',
				footerBackground: 'bg-gray-50',
				footerFlex: 'flex-shrink-0'
			}
	}
})

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

function closeModal(reason) {
	emit('close', reason)
}

function handleBackdropClick() {
	if (props.closeOnBackdrop) {
		closeModal('backdrop')
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
				sizeClasses.maxWidth
			]"
			v-bind="$attrs"
			@click.stop>
			<!-- Header -->
			<div
				:class="[
					'flex items-center justify-between flex-shrink-0',
					sizeClasses.headerPadding,
					sizeClasses.headerBorder
				]">
				<h2 :class="['font-semibold text-gray-900', sizeClasses.titleSize]">{{ title }}</h2>
				<button
					v-if="showCloseButton"
					@click="closeModal('x_button')"
					class="text-gray-400 hover:text-gray-600 transition-colors">
					<XMarkIcon class="w-6 h-6" />
				</button>
			</div>

			<!-- Content slot -->
			<div :class="[sizeClasses.contentPadding, 'space-y-6 overflow-y-auto flex-1']">
				<div :class="sizeClasses.contentSize">
					<slot />
				</div>
			</div>

			<!-- Footer slot (optional) -->
			<div
				v-if="$slots.footer"
				:class="[
					sizeClasses.footerPadding,
					sizeClasses.footerBorder,
					sizeClasses.footerBackground,
					sizeClasses.footerFlex
				]">
				<slot name="footer" />
			</div>
		</div>
	</div>
</template>
