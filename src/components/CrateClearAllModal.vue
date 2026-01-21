<script setup>
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

defineProps({
	isOpen: {
		type: Boolean,
		required: true
	},
	rewardCount: {
		type: Number,
		default: 0
	},
	loading: {
		type: Boolean,
		default: false
	},
	clearAllRewards: {
		type: Function,
		required: true
	}
})

defineEmits(['close'])
</script>

<template>
	<BaseModal
		:isOpen="isOpen"
		title="Clear All Items"
		size="small"
		:closeOnBackdrop="false"
		@close="$emit('close')">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to clear
					<span class="font-semibold">ALL</span>
					items from this crate?
				</h3>
				<p class="text-sm text-gray-600 mt-2">
					This action cannot be undone and will permanently delete all
					{{ rewardCount }} rewards.
				</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<button
						type="button"
						@click="$emit('close')"
						class="btn-secondary--outline"
						data-cy="cancel-clear-all-button">
						Cancel
					</button>
					<BaseButton
						@click="clearAllRewards"
						:disabled="loading"
						variant="primary"
						class="bg-semantic-danger hover:bg-opacity-90"
						data-cy="confirm-clear-all-button">
						{{ loading ? 'Clearing...' : 'Clear All' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>
