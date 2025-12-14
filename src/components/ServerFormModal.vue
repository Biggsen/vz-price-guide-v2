<script setup>
import { computed, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { XCircleIcon } from '@heroicons/vue/24/solid'
import {
	getMinecraftVersions,
	getMinecraftPatches,
	getMajorMinorVersion
} from '../utils/serverProfile.js'

const props = defineProps({
	isOpen: {
		type: Boolean,
		default: false
	},
	editingServer: {
		type: Object,
		default: null
	},
	formData: {
		type: Object,
		required: true
	},
	loading: {
		type: Boolean,
		default: false
	},
	formError: {
		type: String,
		default: null
	},
	nameValidationError: {
		type: String,
		default: null
	},
	versionValidationError: {
		type: String,
		default: null
	}
})

const emit = defineEmits(['update:formData', 'submit', 'close', 'clear-errors'])

const minecraftVersions = getMinecraftVersions()

// Local state for version selection
const selectedMajorMinor = ref('')
const selectedPatch = ref('')

// Initialize version state from formData when modal opens or editingServer changes
watch(
	[() => props.isOpen, () => props.editingServer],
	() => {
		if (props.isOpen) {
			const fullVersion = props.formData.minecraft_version || ''
			if (fullVersion) {
				// Extract major.minor and patch from full version
				const majorMinor = getMajorMinorVersion(fullVersion)
				selectedMajorMinor.value = majorMinor || ''

				// Extract patch number if present, otherwise default to 0
				const parts = fullVersion.split('.')
				if (parts.length >= 3) {
					selectedPatch.value = parts[2]
				} else {
					// Default to patch 0 if no patch specified
					selectedPatch.value = '0'
				}
			} else {
				selectedMajorMinor.value = ''
				selectedPatch.value = ''
			}
		}
	},
	{ immediate: true }
)

// Watch for major.minor changes and set default patch to 0
watch(selectedMajorMinor, () => {
	if (selectedMajorMinor.value) {
		// Auto-select patch 0 as default
		selectedPatch.value = '0'
	} else {
		selectedPatch.value = ''
	}
	updateFormDataVersion()
})

// Watch for patch changes and update form data
watch(selectedPatch, () => {
	updateFormDataVersion()
})

// Update formData.minecraft_version when version selection changes
function updateFormDataVersion() {
	if (!selectedMajorMinor.value) {
		emit('update:formData', { ...props.formData, minecraft_version: '' })
		return
	}

	// Always include patch (defaults to 0)
	if (selectedPatch.value) {
		emit('update:formData', {
			...props.formData,
			minecraft_version: `${selectedMajorMinor.value}.${selectedPatch.value}`
		})
	} else {
		// Fallback to just major.minor if no patch selected (shouldn't happen with default 0)
		emit('update:formData', {
			...props.formData,
			minecraft_version: selectedMajorMinor.value
		})
	}
}

// Available patches for selected major.minor version
const availablePatches = computed(() => {
	if (!selectedMajorMinor.value) return []
	return getMinecraftPatches(selectedMajorMinor.value)
})

const isEditing = computed(() => !!props.editingServer)
const title = computed(() => (isEditing.value ? 'Edit Server' : 'Add New Server'))
const submitButtonText = computed(() => {
	if (props.loading) {
		return isEditing.value ? 'Updating...' : 'Creating...'
	}
	return isEditing.value ? 'Update Server' : 'Create Server'
})

const inputPrefix = computed(() => (isEditing.value ? 'edit' : 'create'))

const localFormData = computed({
	get: () => props.formData,
	set: (value) => emit('update:formData', value)
})

function handleInput(field) {
	if (field === 'name') {
		emit('clear-errors', ['name', 'form'])
	} else if (field === 'version') {
		emit('clear-errors', ['version', 'form'])
	}
}

function handleSubmit() {
	emit('submit')
}
</script>

<template>
	<BaseModal
		:isOpen="isOpen"
		:title="title"
		maxWidth="max-w-md"
		:closeOnBackdrop="false"
		@close="$emit('close')">
		<form @submit.prevent="handleSubmit" class="space-y-4">
			<div>
				<label
					:for="`${inputPrefix}-server-name`"
					class="block text-sm font-medium text-gray-700 mb-1">
					Server Name *
				</label>
				<input
					:id="`${inputPrefix}-server-name`"
					v-model="localFormData.name"
					type="text"
					required
					placeholder="e.g., Hypixel Skyblock"
					@input="handleInput('name')"
					:class="[
						'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
						nameValidationError
							? 'border-red-500 focus:ring-red-500 focus:border-red-500'
							: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
					]" />
				<div
					v-if="nameValidationError"
					class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
					<XCircleIcon class="w-4 h-4" />
					{{ nameValidationError }}
				</div>
			</div>

			<div>
				<div class="flex gap-2">
					<div class="w-1/2">
						<label
							:for="`${inputPrefix}-minecraft-version`"
							class="block text-sm font-medium text-gray-700 mb-1">
							Minecraft Version *
						</label>
						<select
							:id="`${inputPrefix}-minecraft-version`"
							v-model="selectedMajorMinor"
							required
							@change="handleInput('version')"
							:class="[
								'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 font-sans',
								versionValidationError
									? 'border-red-500 focus:ring-red-500 focus:border-red-500'
									: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
							]">
							<option value="">Select version...</option>
							<option
								v-for="version in minecraftVersions"
								:key="version.value"
								:value="version.value">
								{{ version.label }}
							</option>
						</select>
					</div>
					<div v-if="selectedMajorMinor && availablePatches.length > 0" class="w-1/2">
						<label
							:for="`${inputPrefix}-minecraft-patch`"
							class="block text-sm font-medium text-gray-700 mb-1">
							Patch version
						</label>
						<select
							:id="`${inputPrefix}-minecraft-patch`"
							v-model="selectedPatch"
							@change="handleInput('version')"
							class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans">
							<option
								v-for="patch in availablePatches"
								:key="patch.value"
								:value="patch.value">
								{{ patch.label }}
							</option>
						</select>
					</div>
				</div>
				<div
					v-if="versionValidationError"
					class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
					<XCircleIcon class="w-4 h-4" />
					{{ versionValidationError }}
				</div>
			</div>

			<div>
				<label
					:for="`${inputPrefix}-description`"
					class="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					:id="`${inputPrefix}-description`"
					v-model="localFormData.description"
					rows="3"
					placeholder="Optional description for this server..."
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
			</div>

			<div
				v-if="formError"
				class="text-sm text-red-600 font-semibold flex items-center gap-1 bg-red-100 border border-red-300 px-3 py-2 rounded">
				<XCircleIcon class="w-4 h-4" />
				{{ formError }}
			</div>
		</form>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<button type="button" @click="$emit('close')" class="btn-secondary--outline">
						Cancel
					</button>
					<BaseButton @click="handleSubmit" :disabled="loading" variant="primary">
						{{ submitButtonText }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>
