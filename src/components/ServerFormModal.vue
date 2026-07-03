<script setup>
import { computed, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { XCircleIcon } from '@heroicons/vue/24/solid'
import { useAdmin } from '../utils/admin.js'
import {
	getMinecraftVersions,
	getMinecraftPatches,
	getMajorMinorVersion,
	isGamedropVersion
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

const { canEditItems } = useAdmin()

const minecraftVersions = computed(() =>
	getMinecraftVersions({ includePrivate: canEditItems.value === true })
)

// Local state for version selection
const selectedMajorMinor = ref('')
const selectedPatch = ref('')

// Hydrate UI from formData only — do not rewrite formData (preserves patch on edit)
watch(
	[() => props.isOpen, () => props.editingServer],
	() => {
		if (props.isOpen) {
			const fullVersion = props.formData.minecraft_version || ''
			if (fullVersion) {
				const catalogVersion = getMajorMinorVersion(fullVersion)
				selectedMajorMinor.value = catalogVersion || ''

				if (isGamedropVersion(catalogVersion)) {
					selectedPatch.value = ''
				} else {
					const parts = fullVersion.split('.')
					selectedPatch.value = parts.length >= 3 ? parts[2] : '0'
				}
			} else {
				selectedMajorMinor.value = ''
				selectedPatch.value = ''
			}
		}
	},
	{ immediate: true }
)

function updateFormDataVersion() {
	if (!selectedMajorMinor.value) {
		emit('update:formData', { ...props.formData, minecraft_version: '' })
		return
	}

	// Gamedrop catalog versions are stored as-is (e.g. 26.2), no patch segment
	if (isGamedropVersion(selectedMajorMinor.value) || selectedPatch.value === '') {
		emit('update:formData', {
			...props.formData,
			minecraft_version: selectedMajorMinor.value
		})
		return
	}

	emit('update:formData', {
		...props.formData,
		minecraft_version: `${selectedMajorMinor.value}.${selectedPatch.value}`
	})
}

// User changed catalog version — default patch for classic lines, then sync formData
function handleCatalogVersionChange() {
	if (selectedMajorMinor.value && !isGamedropVersion(selectedMajorMinor.value)) {
		selectedPatch.value = '0'
	} else {
		selectedPatch.value = ''
	}
	handleInput('version')
	updateFormDataVersion()
}

// User changed patch — sync formData only
function handlePatchChange() {
	handleInput('version')
	updateFormDataVersion()
}

// Available patches for classic versions only (empty for gamedrops)
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
		data-cy="server-form-modal"
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
					:data-cy="`${inputPrefix}-server-name-input`"
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
							:data-cy="`${inputPrefix}-minecraft-version-select`"
							@change="handleCatalogVersionChange"
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
							@change="handlePatchChange"
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
				<p class="block text-sm font-medium text-gray-700 mb-2">
					Do you own or manage this server?
				</p>
				<div class="space-y-2">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							v-model="localFormData.user_manages_server"
							:value="false"
							type="radio"
							class="rounded-full border-gray-300 text-gray-asparagus focus:ring-gray-asparagus" />
						<span class="text-sm text-gray-900">No – I play on this server</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							v-model="localFormData.user_manages_server"
							:value="true"
							type="radio"
							class="rounded-full border-gray-300 text-gray-asparagus focus:ring-gray-asparagus" />
						<span class="text-sm text-gray-900">
							Yes – I manage this server (required for Admin Shop)
						</span>
					</label>
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
					<button
						type="button"
						@click="$emit('close')"
						class="btn-secondary--outline"
						data-cy="server-form-modal-close">
						Cancel
					</button>
					<BaseButton
						@click="handleSubmit"
						:disabled="loading"
						variant="primary"
						:data-cy="`${inputPrefix}-server-submit-button`">
						{{ submitButtonText }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>
