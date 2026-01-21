<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
	isOpen: {
		type: Boolean,
		required: true
	},
	itemToDelete: {
		type: Object,
		default: null
	},
	loading: {
		type: Boolean,
		default: false
	},
	executeDelete: {
		type: Function,
		required: true
	}
})

const emit = defineEmits(['close'])

const modalTitle = computed(() =>
	props.itemToDelete?.type === 'crate' ? 'Delete Crate Reward' : 'Delete Item'
)
</script>

<template>
	<BaseModal
		:isOpen="isOpen"
		:title="modalTitle"
		size="small"
		:closeOnBackdrop="false"
		@close="$emit('close')">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to delete
					<span class="font-semibold">{{ itemToDelete?.name }}</span>?
				</h3>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<button type="button" @click="$emit('close')" class="btn-secondary--outline" data-cy="cancel-delete-item-button">
						Cancel
					</button>
					<BaseButton
						@click="executeDelete"
						:disabled="loading"
						variant="primary"
						class="bg-semantic-danger hover:bg-opacity-90"
						data-cy="confirm-delete-item-button">
						{{ loading ? 'Deleting...' : 'Delete' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>
