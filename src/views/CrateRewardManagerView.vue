<script setup>
import { ref, computed, watch } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { query, collection, orderBy, where } from 'firebase/firestore'
import {
	useCrateRewards,
	createCrateReward,
	updateCrateReward,
	deleteCrateReward,
	importCrateRewardsFromYaml
} from '../utils/crateRewards.js'
import { versions } from '../constants.js'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import {
	PlusIcon,
	TrashIcon,
	ArrowUpTrayIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const user = useCurrentUser()
const router = useRouter()
const db = useFirestore()

// Reactive state
const showCreateForm = ref(false)
const showEditForm = ref(false)
const showImportModal = ref(false)
const loading = ref(false)
const error = ref(null)

// Modal-specific error states
const createFormError = ref(null)
const editFormError = ref(null)
const importModalError = ref(null)

// Delete confirmation modal state
const showDeleteModal = ref(false)
const crateToDelete = ref(null)

// Info modal state
const showInfoModal = ref(false)

// Form data
const crateForm = ref({
	name: '',
	description: '',
	minecraft_version: '1.20'
})

// Import state
const importFile = ref(null)
const importResult = ref(null)
const isImporting = ref(false)

// Get all items for import functionality
const allItemsQuery = query(collection(db, 'items'), orderBy('name', 'asc'))
const { data: allItems } = useCollection(allItemsQuery)

// Get user's crate rewards
const {
	crateRewards,
	pending: crateRewardsPending,
	error: crateRewardsError
} = useCrateRewards(computed(() => user.value?.uid))

// Computed properties
const hasCrateRewards = computed(() => crateRewards.value && crateRewards.value.length > 0)

// Get all crate reward items to calculate counts
const allCrateRewardItemsQuery = computed(() => {
	if (!crateRewards.value || crateRewards.value.length === 0) return null

	const crateIds = crateRewards.value.map((crate) => crate.id)
	return query(collection(db, 'crate_reward_items'), where('crate_reward_id', 'in', crateIds))
})

const { data: allCrateRewardItems } = useCollection(allCrateRewardItemsQuery)

// Get item counts for all crates (NEW: counts items within embedded arrays)
const crateItemCounts = computed(() => {
	if (!allCrateRewardItems.value || !crateRewards.value) return {}

	const counts = {}
	crateRewards.value.forEach((crate) => {
		// For NEW structure: sum up items.length for each document
		// For OLD structure: count documents (backward compatibility)
		const documentsForCrate = allCrateRewardItems.value.filter(
			(doc) => doc.crate_reward_id === crate.id
		)

		counts[crate.id] = documentsForCrate.reduce((total, doc) => {
			// If document has items array, count items in array
			if (doc.items && Array.isArray(doc.items)) {
				return total + doc.items.length
			}
			// Backward compatibility: count document as 1 item
			return total + 1
		}, 0)
	})
	return counts
})

// Get total weight for a specific crate
function getCrateTotalWeight(crateId) {
	if (!allCrateRewardItems.value) return 0
	return allCrateRewardItems.value
		.filter((item) => item.crate_reward_id === crateId)
		.reduce((total, item) => total + (item.weight || 0), 0)
}

// Methods
async function createNewCrateReward() {
	if (!crateForm.value.name.trim()) {
		createFormError.value = 'Crate reward name is required'
		return
	}

	loading.value = true
	createFormError.value = null

	try {
		const newCrate = await createCrateReward(user.value.uid, crateForm.value)
		router.push(`/crate-rewards/${newCrate.id}`)
		showCreateForm.value = false
		crateForm.value = {
			name: '',
			description: '',
			minecraft_version: '1.20'
		}
	} catch (err) {
		createFormError.value = 'Failed to create crate reward: ' + err.message
	} finally {
		loading.value = false
	}
}

async function updateCrateRewardData() {
	if (!crateForm.value.name.trim()) {
		editFormError.value = 'Crate reward name is required'
		return
	}

	// Determine which crate to update
	const crateId = crateForm.value.crateId
	if (!crateId) {
		editFormError.value = 'No crate selected for update'
		return
	}

	loading.value = true
	editFormError.value = null

	try {
		await updateCrateReward(crateId, crateForm.value)
		showEditForm.value = false
		// Clear the crateId from form after successful update
		if (crateForm.value.crateId) {
			delete crateForm.value.crateId
		}
	} catch (err) {
		editFormError.value = 'Failed to update crate reward: ' + err.message
	} finally {
		loading.value = false
	}
}

function confirmDeleteCrateFromCard(crate) {
	crateToDelete.value = { id: crate.id, name: crate.name }
	showDeleteModal.value = true
}

async function executeDelete() {
	if (!crateToDelete.value) return

	loading.value = true
	error.value = null

	try {
		await deleteCrateReward(crateToDelete.value.id)
	} catch (err) {
		error.value = 'Failed to delete crate: ' + err.message
	} finally {
		loading.value = false
		showDeleteModal.value = false
		crateToDelete.value = null
	}
}

function startCreateCrate() {
	// Clear the form to ensure it's always empty when creating new
	crateForm.value = {
		name: '',
		description: '',
		minecraft_version: '1.20'
	}
	createFormError.value = null
	showCreateForm.value = true
}

function startEditCrateFromCard(crate) {
	crateForm.value = {
		crateId: crate.id, // Store the crate ID for updating
		name: crate.name,
		description: crate.description || '',
		minecraft_version: crate.minecraft_version
	}
	editFormError.value = null
	showEditForm.value = true
}

// Import functions
function handleFileSelect(event) {
	const file = event.target.files[0]
	if (
		(file && file.type === 'text/yaml') ||
		file.name.endsWith('.yml') ||
		file.name.endsWith('.yaml')
	) {
		importFile.value = file
		importResult.value = null
	} else {
		error.value = 'Please select a valid YAML file (.yml or .yaml)'
	}
}

async function importYamlFile() {
	if (!importFile.value) {
		importModalError.value = 'No file selected'
		return
	}

	isImporting.value = true
	importModalError.value = null

	try {
		// Read file content
		const fileContent = await readFileContent(importFile.value)

		// Extract crate name from filename (remove extension)
		const fileName = importFile.value.name.replace(/\.(yml|yaml)$/i, '')

		// Import the crate rewards - this creates a new crate
		const result = await importCrateRewardsFromYaml(
			null, // No existing crate ID, will create new one
			fileContent,
			allItems.value,
			fileName,
			user.value.uid
		)

		importResult.value = result

		if (result.success && result.importedCount > 0) {
			// Clear the file input
			importFile.value = null
			const fileInput = document.getElementById('yaml-file-input')
			if (fileInput) fileInput.value = ''
		}
	} catch (err) {
		importModalError.value = 'Failed to import YAML file: ' + err.message
	} finally {
		isImporting.value = false
	}
}

function readFileContent(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = (e) => resolve(e.target.result)
		reader.onerror = (e) => reject(new Error('Failed to read file'))
		reader.readAsText(file)
	})
}

function closeImportModal() {
	showImportModal.value = false
	importFile.value = null
	importResult.value = null
	importModalError.value = null
}
</script>

<template>
	<div class="p-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div>
					<!-- Dashboard Header -->
					<div>
						<h1 class="text-3xl font-bold text-gray-900 mb-2">Crate Rewards Manager</h1>
						<p class="text-gray-600">
							Create and manage crate rewards for Crazy Crates plugin
						</p>
						<div class="mt-2">
							<button
								@click="showInfoModal = true"
								class="text-sm text-heavy-metal hover:text-gray-asparagus underline flex items-center gap-1">
								<svg
									class="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								What This Tool Does (and Doesn't Do)
							</button>
						</div>
						<div class="mt-6 flex gap-2">
							<BaseButton @click="startCreateCrate" variant="primary">
								<template #left-icon>
									<PlusIcon class="w-4 h-4" />
								</template>
								New Crate
							</BaseButton>
							<BaseButton @click="showImportModal = true" variant="secondary">
								<template #left-icon>
									<ArrowUpTrayIcon class="w-4 h-4" />
								</template>
								Import YAML
							</BaseButton>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Error Display -->
		<div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
			<div class="flex items-center">
				<ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
				<span class="text-red-800">{{ error }}</span>
			</div>
		</div>

		<!-- Crate Rewards List -->
		<div class="mb-8">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Your Crate Rewards
			</h2>
			<div v-if="crateRewardsPending" class="text-gray-600">Loading crate rewards...</div>
			<div v-else-if="!hasCrateRewards" class="text-gray-600">
				No crate rewards found. Create your first one to get started.
			</div>
			<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<div
					v-for="crate in crateRewards"
					:key="crate.id"
					class="bg-sea-mist rounded-lg shadow-md border-2 border-amulet h-full overflow-hidden flex flex-col">
					<!-- Card Header -->
					<div
						class="bg-amulet py-2 px-3 pl-4 border-x-2 border-t-2 border-white rounded-t-lg">
						<div class="flex items-center justify-between">
							<h3
								@click="router.push(`/crate-rewards/${crate.id}`)"
								class="text-xl font-semibold text-heavy-metal hover:text-gray-asparagus cursor-pointer flex-1">
								{{ crate.name }}
							</h3>
							<!-- Action Buttons -->
							<div class="flex gap-2 ml-3">
								<button
									@click.stop="confirmDeleteCrateFromCard(crate)"
									class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
									title="Delete crate">
									<TrashIcon class="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>

					<!-- Card Body -->
					<div
						class="bg-norway p-4 border-x-2 border-b-2 border-white rounded-b-lg flex-1 flex flex-col">
						<div class="flex-1">
							<p v-if="crate.description" class="text-heavy-metal mb-3">
								{{ crate.description }}
							</p>
							<div class="text-sm text-heavy-metal">
								<span class="font-medium">Version:</span>
								{{ crate.minecraft_version }}
								<span class="mx-2"></span>
								<span class="font-medium">Items:</span>
								{{ crateItemCounts[crate.id] || 0 }}
								<span class="mx-2"></span>
								<span class="font-medium">Weight:</span>
								{{ getCrateTotalWeight(crate.id) }}
							</div>
						</div>
						<div class="mt-4 flex-shrink-0">
							<BaseButton
								@click="router.push(`/crate-rewards/${crate.id}`)"
								variant="primary">
								Manage
							</BaseButton>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Create Crate Reward Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showCreateForm"
			title="Create New Crate Reward"
			maxWidth="max-w-md"
			@close="showCreateForm = false; createFormError = null">
			<!-- Error Display -->
			<div v-if="createFormError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
				<div class="flex items-center">
					<ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
					<span class="text-red-800">{{ createFormError }}</span>
				</div>
			</div>

			<form @submit.prevent="createNewCrateReward" class="space-y-4">
				<div>
					<label for="crate-name" class="block text-sm font-medium text-gray-700 mb-1">
						Name *
					</label>
					<input
						id="crate-name"
						v-model="crateForm.name"
						type="text"
						required
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans" />
				</div>

				<div>
					<label
						for="crate-description"
						class="block text-sm font-medium text-gray-700 mb-1">
						Description
					</label>
					<textarea
						id="crate-description"
						v-model="crateForm.description"
						rows="3"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
				</div>

				<div>
					<label for="crate-version" class="block text-sm font-medium text-gray-700 mb-1">
						Minecraft Version
					</label>
					<select
						id="crate-version"
						v-model="crateForm.minecraft_version"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans">
						<option v-for="version in versions" :key="version" :value="version">
							{{ version }}
						</option>
					</select>
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<!-- prettier-ignore -->
						<button
							type="button"
							@click="showCreateForm = false; createFormError = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="createNewCrateReward"
							:disabled="loading"
							variant="primary">
							{{ loading ? 'Creating...' : 'Create' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Edit Crate Reward Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showEditForm"
			title="Edit Crate Reward"
			maxWidth="max-w-md"
			@close="showEditForm = false; editFormError = null">
			<!-- Error Display -->
			<div v-if="editFormError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
				<div class="flex items-center">
					<ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
					<span class="text-red-800">{{ editFormError }}</span>
				</div>
			</div>

			<form @submit.prevent="updateCrateRewardData" class="space-y-4">
				<div>
					<label
						for="edit-crate-name"
						class="block text-sm font-medium text-gray-700 mb-1">
						Name *
					</label>
					<input
						id="edit-crate-name"
						v-model="crateForm.name"
						type="text"
						required
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans" />
				</div>

				<div>
					<label
						for="edit-crate-description"
						class="block text-sm font-medium text-gray-700 mb-1">
						Description
					</label>
					<textarea
						id="edit-crate-description"
						v-model="crateForm.description"
						rows="3"
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
						v-model="crateForm.minecraft_version"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans">
						<option v-for="version in versions" :key="version" :value="version">
							{{ version }}
						</option>
					</select>
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<!-- prettier-ignore -->
						<button
							type="button"
							@click="showEditForm = false; editFormError = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="updateCrateRewardData"
							:disabled="loading"
							variant="primary">
							{{ loading ? 'Updating...' : 'Update' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Import YAML Modal -->
		<BaseModal
			:isOpen="showImportModal"
			title="Import Crate Rewards"
			maxWidth="max-w-md"
			@close="closeImportModal">
			<!-- Error Display -->
			<div
				v-if="importModalError"
				class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
				<div class="flex items-center">
					<ExclamationTriangleIcon class="w-5 h-5 text-red-600 mr-2" />
					<span class="text-red-800">{{ importModalError }}</span>
				</div>
			</div>

			<div class="space-y-4">
				<div>
					<label
						for="yaml-file-input"
						class="block text-sm font-medium text-gray-700 mb-1">
						Select YAML File
					</label>
					<input
						id="yaml-file-input"
						type="file"
						accept=".yml,.yaml"
						@change="handleFileSelect"
						class="block w-full pr-3 py-1 mt-2 mb-2 text-gray-900 font-sans" />
					<p class="text-xs text-gray-500 mt-1">
						Upload a complete Crazy Crates YAML file with
						<code>Crate: { Prizes: {} }</code>
						format. A new crate will be created with the filename as the crate name.
						Export the file directly from your server's CrazyCrates plugin folder.
					</p>
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
								<div
									class="text-yellow-700 text-sm space-y-1 max-h-32 overflow-y-auto">
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
								<div
									class="text-red-700 text-sm space-y-1 max-h-32 overflow-y-auto">
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
						<button
							type="button"
							@click="closeImportModal"
							class="btn-secondary--outline">
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

		<!-- Delete Confirmation Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showDeleteModal"
			title="Delete Crate Reward"
			size="small"
			@close="showDeleteModal = false; crateToDelete = null">
			<div class="space-y-4">
				<div>
					<h3 class="font-normal text-gray-900">
						Are you sure you want to delete <span class="font-semibold">{{ crateToDelete?.name }}</span>?
					</h3>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end p-4">
					<div class="flex space-x-3">
						<!-- prettier-ignore -->
						<button
							type="button"
							@click="showDeleteModal = false; crateToDelete = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="executeDelete"
							:disabled="loading"
							variant="primary"
							class="bg-semantic-danger hover:bg-opacity-90">
							{{ loading ? 'Deleting...' : 'Delete' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Info Modal -->
		<BaseModal
			:isOpen="showInfoModal"
			title="What This Tool Does (and Doesn't Do)"
			maxWidth="max-w-2xl"
			@close="showInfoModal = false">
			<div class="space-y-6">
				<div>
					<p class="text-gray-700 mb-4">
						The Crate Rewards Tool lets you quickly create and balance crate rewards for
						the CrazyCrates plugin using an easy, visual interface. You can import
						existing crates or build new ones from scratch — set item quantities,
						weights (drop chances), and enchantments — then export them directly in
						CrazyCrates YAML format for fast use on your server. You can also simulate
						rewards to preview what players might get.
					</p>
					<p class="text-gray-700 mb-4">
						This tool focuses on simplicity and speed, not full configuration coverage.
					</p>
				</div>

				<div>
					<h3 class="text-lg font-semibold text-gray-900 mb-3">What This Tool Exports</h3>
					<p class="text-gray-700 mb-3">
						CrazyCrates has many configuration options — this tool only exports the
						Prizes section of a crate, with a limited set of fields:
					</p>
					<ul class="space-y-2 text-gray-700 text-sm">
						<li class="flex items-start">
							<span class="font-mono bg-gray-100 px-2 py-1 rounded mr-2 text-xs">
								DisplayName
							</span>
							<span>
								– Item name, exported in white ("
								<!-- prettier-ignore -->
								<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">&lt;white&gt;Item Name</span>
								").
							</span>
						</li>
						<li class="flex items-start">
							<span class="font-mono bg-gray-100 px-2 py-1 rounded mr-2 text-xs">
								DisplayItem
							</span>
							<span>
								– Correct item ID (e.g.
								<!-- prettier-ignore -->
								<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">iron_ingot</span>
								).
							</span>
						</li>
						<li class="flex items-start">
							<span class="font-mono bg-gray-100 px-2 py-1 rounded mr-2 text-xs">
								Settings
							</span>
							<span>
								– Default values:
								<!-- prettier-ignore -->
								<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">{ Custom-Model-Data: -1, Model: { Namespace: "", Id: "" } }</span>
								.
							</span>
						</li>
						<li class="flex items-start">
							<span class="font-mono bg-gray-100 px-2 py-1 rounded mr-2 text-xs">
								DisplayAmount
							</span>
							<span>– Quantity you set for the reward item.</span>
						</li>
						<li class="flex items-start">
							<span class="font-mono bg-gray-100 px-2 py-1 rounded mr-2 text-xs">
								Weight
							</span>
							<span>– The weight (chance) you assigned to the reward item.</span>
						</li>
						<li class="flex items-start">
							<span class="font-mono bg-gray-100 px-2 py-1 rounded mr-2 text-xs">
								Items
							</span>
							<span>
								– The reward item(s), amount, and any enchantments (e.g. -
								<!-- prettier-ignore -->
								<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">"item:iron_sword, amount:1, sharpness:5"</span>
								).
							</span>
						</li>
					</ul>
				</div>

				<div>
					<h3 class="text-lg font-semibold text-gray-900 mb-3">Limitations</h3>
					<p class="text-gray-700 mb-3">
						This tool uses flat weights (no tiered system) and does not handle
						crate-level settings like
						<!-- prettier-ignore -->
						<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">Name</span>
						,
						<!-- prettier-ignore -->
						<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">Slot</span>
						,
						<!-- prettier-ignore -->
						<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">CrateType</span>
						, or custom items (e.g. keys).
					</p>
					<p class="text-gray-700 mb-3">
						After exporting, you may still want to edit the YAML manually to fine-tune
						advanced settings such as
						<!-- prettier-ignore -->
						<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">DisplayLore</span>
						or custom models.
					</p>
				</div>

				<div>
					<h3 class="text-lg font-semibold text-gray-900 mb-3">The Goal</h3>
					<p class="text-gray-700">
						Make crate creation fast, visual, and intuitive — so you can focus on
						balance, not syntax.
					</p>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end">
					<BaseButton @click="showInfoModal = false" variant="primary">Got it</BaseButton>
				</div>
			</template>
		</BaseModal>
	</div>
</template>
