<script setup>
import { versions } from '../constants.js'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { XCircleIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
	isOpen: {
		type: Boolean,
		required: true
	},
	crateForm: {
		type: Object,
		required: true
	},
	enabledVersions: {
		type: Array,
		required: true
	},
	editNameValidationError: {
		type: String,
		default: null
	},
	isCheckingEditName: {
		type: Boolean,
		default: false
	},
	loading: {
		type: Boolean,
		default: false
	},
	checkEditCrateNameAvailability: {
		type: Function,
		required: true
	},
	updateCrateRewardData: {
		type: Function,
		required: true
	}
})

const emit = defineEmits(['close', 'update:crateForm'])

function handleClose() {
	emit('close')
}

function updateCrateForm(field, value) {
	emit('update:crateForm', { ...props.crateForm, [field]: value })
}
</script>

<template>
	<BaseModal :isOpen="isOpen" title="Edit Crate" maxWidth="max-w-md" :closeOnBackdrop="false" @close="handleClose">
		<form @submit.prevent="updateCrateRewardData" class="space-y-4">
			<div>
				<label
					for="edit-crate-name"
					class="block text-sm font-medium text-gray-700 mb-1">
					Name *
				</label>
				<div class="relative">
					<input
						id="edit-crate-name"
						:value="crateForm.name"
						@input="updateCrateForm('name', $event.target.value)"
						@blur="checkEditCrateNameAvailability(crateForm.name)"
						type="text"
						required
						data-cy="crate-name-input"
						:class="[
							'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans pr-10',
							editNameValidationError
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />

					<!-- Loading spinner -->
					<div
						v-if="isCheckingEditName"
						class="absolute right-3 top-1/2 transform -translate-y-1/2">
						<div
							class="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
					</div>
				</div>

				<!-- Name validation error -->
				<div
					v-if="editNameValidationError"
					class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
					<XCircleIcon class="w-4 h-4" />
					{{ editNameValidationError }}
				</div>
			</div>

			<div>
				<label
					for="edit-crate-description"
					class="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					id="edit-crate-description"
					:value="crateForm.description"
					@input="updateCrateForm('description', $event.target.value)"
					rows="3"
					data-cy="crate-description-input"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
			</div>

			<div>
				<label
					for="edit-crate-version"
					class="block text-sm font-medium text-gray-700 mb-1">
					Minecraft Version
				</label>
				<select
					id="edit-crate-version"
					:value="crateForm.minecraft_version"
					@change="updateCrateForm('minecraft_version', $event.target.value)"
					data-cy="crate-version-select"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans">
					<option
						v-for="version in versions"
						:key="version"
						:value="version"
						:disabled="!enabledVersions.includes(version)">
						{{ version }}{{ !enabledVersions.includes(version) ? ' (Coming soon)' : '' }}
					</option>
				</select>
			</div>
		</form>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<button type="button" @click="handleClose" class="btn-secondary--outline">
						Cancel
					</button>
					<BaseButton
						@click="updateCrateRewardData"
						:disabled="loading"
						variant="primary"
						data-cy="crate-update-button">
						{{ loading ? 'Updating...' : 'Update' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>
