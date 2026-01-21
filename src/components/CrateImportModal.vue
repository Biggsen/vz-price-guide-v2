<script setup>
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
	isOpen: {
		type: Boolean,
		required: true
	},
	importFile: {
		type: Object,
		default: null
	},
	importResult: {
		type: Object,
		default: null
	},
	importModalError: {
		type: String,
		default: null
	},
	isImporting: {
		type: Boolean,
		default: false
	},
	handleFileSelect: {
		type: Function,
		required: true
	},
	importYamlFile: {
		type: Function,
		required: true
	}
})

const emit = defineEmits(['close'])
</script>

<template>
	<BaseModal
		:isOpen="isOpen"
		title="Import Crate"
		maxWidth="max-w-md"
		:closeOnBackdrop="false"
		@close="$emit('close')">
		<div class="space-y-4">
			<div>
				<label for="yaml-file-input" class="block text-sm font-medium text-gray-700 mb-1">
					Select YAML File
				</label>
				<input
					id="yaml-file-input"
					type="file"
					accept=".yml,.yaml"
					@change="handleFileSelect"
					class="block w-full pr-3 py-1 mt-2 mb-2 text-gray-900 font-sans" />
				<p class="text-xs text-gray-500 mt-1">
					Upload a complete CrazyCrates YAML file with
					<code>Crate: { Prizes: {} }</code>
					format.
				</p>
			</div>

			<!-- Error Display -->
			<div v-if="importModalError" class="p-3 bg-red-50 border-l-4 border-l-red-500">
				<div class="flex items-start">
					<ExclamationTriangleIcon class="w-6 h-6 text-red-600 mr-2 flex-shrink-0" />
					<div>
						<div class="text-heavy-metal font-medium">Import failed</div>
						<div class="text-heavy-metal text-sm mt-1">
							{{ importModalError.replace('Import failed: ', '') }}
						</div>
					</div>
				</div>
			</div>

			<!-- Import Results -->
			<div v-if="importResult" class="space-y-3">
				<!-- Success Message -->
				<div
					v-if="importResult.success"
					class="p-3 bg-semantic-success-light border-l-4 border-l-semantic-success">
					<div class="flex items-start">
						<CheckCircleIcon class="w-6 h-6 text-heavy-metal mr-2 flex-shrink-0" />
						<div>
							<div class="text-heavy-metal font-medium">
								Import completed successfully!
							</div>
							<div class="text-heavy-metal text-sm mt-1">
								{{ importResult.importedCount }} of
								{{ importResult.totalPrizes }} prizes imported
								<span v-if="importResult.errorCount > 0">
									({{ importResult.errorCount }} failed)
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Warnings -->
				<div
					v-if="importResult.warnings && importResult.warnings.length > 0"
					class="p-3 bg-yellow-50 border-l-4 border-l-yellow-400 rounded">
					<div class="flex items-start">
						<ExclamationTriangleIcon
							class="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
						<div class="flex-1">
							<div class="text-yellow-800 font-medium mb-2">
								Warnings ({{ importResult.warningCount }}):
							</div>
							<div class="text-yellow-700 text-sm space-y-1 max-h-32 overflow-y-auto">
								<div v-for="warning in importResult.warnings" :key="warning">
									• {{ warning }}
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Errors -->
				<div
					v-if="importResult.errors && importResult.errors.length > 0"
					class="p-3 bg-red-50 border-l-4 border-l-red-400 rounded">
					<div class="flex items-start">
						<ExclamationTriangleIcon
							class="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
						<div class="flex-1">
							<div class="text-red-800 font-medium mb-2">
								Errors ({{ importResult.errorCount }}):
							</div>
							<div class="text-red-700 text-sm space-y-1 max-h-32 overflow-y-auto">
								<div v-for="error in importResult.errors" :key="error">
									• {{ error }}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<button type="button" @click="$emit('close')" class="btn-secondary--outline">
						{{ importResult ? 'Close' : 'Cancel' }}
					</button>
					<BaseButton
						v-if="!importResult"
						@click="importYamlFile"
						:disabled="!importFile || isImporting"
						variant="primary">
						{{ isImporting ? 'Importing...' : 'Import' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>
