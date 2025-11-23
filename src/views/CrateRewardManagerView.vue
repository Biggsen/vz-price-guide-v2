<script setup>
import { ref, computed, watch } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { query, collection, orderBy, where, getDocs } from 'firebase/firestore'
import {
	useCrateRewards,
	createCrateReward,
	updateCrateReward,
	deleteCrateReward,
	importCrateRewardsFromYaml,
	validateYamlForMultipleItems,
	getUniqueCrateName
} from '../utils/crateRewards.js'
import { versions, baseEnabledVersions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import BaseButton from '../components/BaseButton.vue'
import BaseCard from '../components/BaseCard.vue'
import BaseModal from '../components/BaseModal.vue'
import NotificationBanner from '../components/NotificationBanner.vue'
import {
	PlusIcon,
	TrashIcon,
	ArrowUpTrayIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
	TrophyIcon
} from '@heroicons/vue/24/outline'
import { XCircleIcon } from '@heroicons/vue/20/solid'

const user = useCurrentUser()
const router = useRouter()
const db = useFirestore()
const { isAdmin } = useAdmin()

// Computed property for enabled versions based on user type
const enabledVersions = computed(() => {
	try {
		// Admin users can access all versions (but only if admin status is fully loaded)
		if (user.value?.email && isAdmin.value === true) {
			return [...(versions || ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21'])]
		}
		// Regular users only get base enabled versions
		return [...baseEnabledVersions]
	} catch (error) {
		// Fallback to base enabled versions if anything goes wrong
		console.warn('Error in enabledVersions computed:', error)
		return [...baseEnabledVersions]
	}
})

// Reactive state
const showCreateForm = ref(false)
const showImportModal = ref(false)
const loading = ref(false)
const error = ref(null)

// Modal-specific error states
const createFormError = ref(null)
const importModalError = ref(null)

// Form validation states
const nameValidationError = ref(null)
const isCheckingName = ref(false)

// Delete confirmation modal state
const showDeleteModal = ref(false)
const crateToDelete = ref(null)

// Info modal state
const showInfoModal = ref(false)

// Duplicate crate warning modal state
const showDuplicateWarning = ref(false)
const duplicateWarningData = ref(null)

// Limit reached modal state
const showLimitReachedModal = ref(false)

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

// Helper function to chunk array into groups of maxSize
const chunkArray = (array, maxSize) => {
	const chunks = []
	for (let i = 0; i < array.length; i += maxSize) {
		chunks.push(array.slice(i, i + maxSize))
	}
	return chunks
}

// Get all crate reward items to calculate counts
// Handle the 30-item limit for IN queries by chunking when necessary
const allCrateRewardItems = ref([])
const allCrateRewardItemsLoading = ref(false)

const fetchCrateRewardItems = async () => {
	if (!crateRewards.value || crateRewards.value.length === 0) {
		allCrateRewardItems.value = []
		return
	}

	const crateIds = crateRewards.value.map((crate) => crate.id)

	allCrateRewardItemsLoading.value = true

	try {
		if (crateIds.length <= 30) {
			// Use single query for 30 or fewer crates
			const q = query(
				collection(db, 'crate_reward_items'),
				where('crate_reward_id', 'in', crateIds)
			)
			const snapshot = await getDocs(q)
			allCrateRewardItems.value = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			}))
		} else {
			// Split into chunks of 30 and combine results
			const chunks = chunkArray(crateIds, 30)
			const allItems = []
			const seenIds = new Set()

			// Fetch each chunk
			for (const chunk of chunks) {
				const q = query(
					collection(db, 'crate_reward_items'),
					where('crate_reward_id', 'in', chunk)
				)
				const snapshot = await getDocs(q)
				snapshot.docs.forEach((doc) => {
					if (!seenIds.has(doc.id)) {
						seenIds.add(doc.id)
						allItems.push({
							id: doc.id,
							...doc.data()
						})
					}
				})
			}

			allCrateRewardItems.value = allItems
		}
	} catch (err) {
		console.error('Error fetching crate reward items:', err)
		allCrateRewardItems.value = []
	} finally {
		allCrateRewardItemsLoading.value = false
	}
}

// Watch for changes to crateRewards and refetch
watch(crateRewards, fetchCrateRewardItems, { immediate: true })

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
async function checkCrateNameAvailability(name) {
	if (!name.trim()) {
		nameValidationError.value = null
		return
	}

	isCheckingName.value = true
	nameValidationError.value = null

	try {
		const { isDuplicate } = await getUniqueCrateName(user.value.uid, name.trim())
		if (isDuplicate) {
			nameValidationError.value = 'A crate with this name already exists'
		}
	} catch (err) {
		console.error('Error checking crate name:', err)
		// Don't show error to user for validation failures
	} finally {
		isCheckingName.value = false
	}
}

async function createNewCrateReward() {
	if (!crateForm.value.name.trim()) {
		nameValidationError.value = 'Crate name is required'
		return
	}

	// Check for duplicate name before creating (in case user didn't blur the field)
	if (!nameValidationError.value) {
		await checkCrateNameAvailability(crateForm.value.name)
	}

	// Check for duplicate name before creating
	if (nameValidationError.value) {
		return
	}

	loading.value = true
	createFormError.value = null

	try {
		const newCrate = await createCrateReward(user.value.uid, crateForm.value, isAdmin.value)
		router.push(`/crate-rewards/${newCrate.id}`)
		showCreateForm.value = false
		crateForm.value = {
			name: '',
			description: '',
			minecraft_version: '1.20'
		}
		nameValidationError.value = null
	} catch (err) {
		createFormError.value = 'Failed to create crate reward: ' + err.message
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
	// Check if user has reached the crate limit (admins have unlimited)
	if (!isAdmin.value && crateRewards.value.length >= 2) {
		showLimitReachedModal.value = true
		return
	}

	// Clear the form to ensure it's always empty when creating new
	crateForm.value = {
		name: '',
		description: '',
		minecraft_version: '1.20'
	}
	createFormError.value = null
	nameValidationError.value = null
	showCreateForm.value = true
}

function startImportYaml() {
	// Check if user has reached the crate limit (admins have unlimited)
	if (!isAdmin.value && crateRewards.value.length >= 2) {
		showLimitReachedModal.value = true
		return
	}

	showImportModal.value = true
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

		// Validate for multiple item rewards and get prizes to skip
		const validation = validateYamlForMultipleItems(fileContent)
		if (!validation.success) {
			importModalError.value = `Import failed: ${validation.errors.join(', ')}`
			return
		}

		// Extract crate name from filename (remove extension)
		const fileName = importFile.value.name.replace(/\.(yml|yaml)$/i, '')

		// Import the crate rewards - this creates a new crate, skipping problematic prizes
		const result = await importCrateRewardsFromYaml(
			null, // No existing crate ID, will create new one
			fileContent,
			allItems.value,
			fileName,
			user.value.uid,
			validation.prizesToSkip, // prizesToSkip
			isAdmin.value // isAdmin
		)

		// Combine validation warnings with import warnings
		result.warnings = [...(validation.warnings || []), ...(result.warnings || [])]

		// Check if duplicate was detected and show warning
		if (result.duplicateDetected) {
			duplicateWarningData.value = {
				originalName: result.originalName,
				uniqueName: result.uniqueName,
				importFile: importFile.value // Store the file for re-import
			}
			showDuplicateWarning.value = true
		} else {
			importResult.value = result

			if (result.success && result.importedCount > 0) {
				// Clear the file input
				importFile.value = null
				const fileInput = document.getElementById('yaml-file-input')
				if (fileInput) fileInput.value = ''
			}
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

// Duplicate warning dialog functions
async function confirmDuplicateImport() {
	if (duplicateWarningData.value) {
		// Re-import with the unique name
		try {
			isImporting.value = true

			// Read file content again
			const fileContent = await readFileContent(duplicateWarningData.value.importFile)

			// Validate for multiple item rewards and get prizes to skip
			const validation = validateYamlForMultipleItems(fileContent)
			if (!validation.success) {
				importModalError.value = `Import failed: ${validation.errors.join(', ')}`
				return
			}

			// Import with the unique name
			const result = await importCrateRewardsFromYaml(
				null, // No existing crate ID, will create new one
				fileContent,
				allItems.value,
				duplicateWarningData.value.uniqueName, // Use the unique name
				user.value.uid,
				validation.prizesToSkip
			)

			// Combine validation warnings with import warnings
			result.warnings = [...(validation.warnings || []), ...(result.warnings || [])]
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

	// Close the warning dialog
	showDuplicateWarning.value = false
	duplicateWarningData.value = null
}

function cancelDuplicateImport() {
	// Close the warning dialog without importing
	showDuplicateWarning.value = false
	duplicateWarningData.value = null

	// Clear the file input
	importFile.value = null
	const fileInput = document.getElementById('yaml-file-input')
	if (fileInput) fileInput.value = ''
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
							Create and manage crate rewards for CrazyCrates plugin
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
							<BaseButton
								@click="startCreateCrate"
								variant="primary"
								data-cy="create-crate-button">
								<template #left-icon>
									<PlusIcon class="w-4 h-4" />
								</template>
								New Crate
							</BaseButton>
							<BaseButton @click="startImportYaml" variant="secondary">
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
				My Crates
			</h2>

			<div v-if="crateRewardsPending" class="text-gray-600">Loading crate rewards...</div>
			<div v-else-if="!hasCrateRewards" class="text-gray-600" data-cy="empty-crates-message">
				No crate rewards found. Create your first one to get started.
			</div>
			<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<BaseCard
					v-for="crate in crateRewards"
					:key="crate.id"
					variant="secondary">
					<template #header>
						<h3
							@click="router.push(`/crate-rewards/${crate.id}`)"
							class="text-xl font-semibold text-heavy-metal hover:text-gray-asparagus cursor-pointer"
							data-cy="crate-name">
							{{ crate.name }}
						</h3>
					</template>
					<template #actions>
						<button
							@click.stop="confirmDeleteCrateFromCard(crate)"
							class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
							title="Delete crate"
							data-cy="delete-crate-button">
							<TrashIcon class="w-4 h-4" />
						</button>
					</template>
					<template #body>
						<div class="flex flex-col gap-3 flex-1 w-full">
							<p v-if="crate.description">
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
							<BaseButton
								@click="router.push(`/crate-rewards/${crate.id}`)"
								variant="primary"
								data-cy="manage-crate-button"
								class="self-start mt-auto">
								Manage
							</BaseButton>
						</div>
					</template>
				</BaseCard>
			</div>
		</div>

		<!-- Create Crate Reward Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showCreateForm"
			title="Create New Crate"
			maxWidth="max-w-md"
			@close="showCreateForm = false; createFormError = null; nameValidationError = null">

			<form @submit.prevent="createNewCrateReward" class="space-y-4">
				<div>
					<label for="crate-name" class="block text-sm font-medium text-gray-700 mb-1">
						Name *
					</label>
					<div class="relative">
						<input
							id="crate-name"
							v-model="crateForm.name"
							type="text"
							required
							data-cy="crate-name-input"
							:class="[
								'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans pr-10',
								nameValidationError 
									? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
									: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
							]"
							@blur="checkCrateNameAvailability(crateForm.name)"
							@input="nameValidationError = null; createFormError = null" />
						
						<!-- Loading spinner -->
						<div v-if="isCheckingName" class="absolute right-3 top-1/2 transform -translate-y-1/2">
							<div class="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
						</div>
					</div>
					
					<!-- Name validation error -->
					<div v-if="nameValidationError" class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1" data-cy="crate-name-error">
						<XCircleIcon class="w-4 h-4" />
						{{ nameValidationError }}
					</div>
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
						data-cy="crate-description-input"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
				</div>

				<div>
					<label for="crate-version" class="block text-sm font-medium text-gray-700 mb-1">
						Minecraft Version
					</label>
					<select
						id="crate-version"
						v-model="crateForm.minecraft_version"
						data-cy="crate-version-select"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans">
						<option v-for="version in versions" :key="version" :value="version" :disabled="!enabledVersions.includes(version)">
							{{ version }}{{ !enabledVersions.includes(version) ? ' (Coming soon)' : '' }}
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
							@click="showCreateForm = false; createFormError = null; nameValidationError = null"
							class="btn-secondary--outline"
							data-cy="cancel-crate-button">
							Cancel
						</button>
						<BaseButton
							@click="createNewCrateReward"
							:disabled="loading"
							variant="primary"
							data-cy="crate-submit-button">
							{{ loading ? 'Creating...' : 'Create' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Import YAML Modal -->
		<BaseModal
			:isOpen="showImportModal"
			title="Import Crate"
			maxWidth="max-w-md"
			@close="closeImportModal">
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
						Upload a complete CrazyCrates YAML file with
						<code>Crate: { Prizes: {} }</code>
						format. A new crate will be created with the filename as the crate name.
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
							class="btn-secondary--outline"
							data-cy="cancel-delete-button">
							Cancel
						</button>
						<BaseButton
							@click="executeDelete"
							:disabled="loading"
							variant="primary"
							class="bg-semantic-danger hover:bg-opacity-90"
							data-cy="confirm-delete-button">
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
						The Crate Rewards Tool lets you quickly create and balance crate prizes for
						the CrazyCrates plugin using an easy, visual interface. You can import
						existing crates or build new ones from scratch — set prize quantities,
						weights (drop chances), values, and enchantments — then export them directly
						in CrazyCrates YAML format for fast use on your server. You can also
						simulate rewards to preview what players might get.
					</p>
					<p class="text-gray-700 mb-4">
						This tool focuses on simplicity and speed, not full configuration coverage.
					</p>
				</div>

				<div>
					<h3 class="text-lg font-semibold text-gray-900 mb-3">
						Import & Export Details
					</h3>
					<p class="text-gray-700 mb-3">
						CrazyCrates offers extensive configuration options — this tool focuses on
						the Prizes section. It now handles most common prize fields, allowing you to
						safely import, adjust, and export both simple and highly configured prizes.
					</p>
					<p class="text-gray-700 mb-3">
						Custom prizes with detailed settings (like
						<!-- prettier-ignore -->
						<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">DisplayLore</span>
						,
						<!-- prettier-ignore -->
						<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">DisplayPattern</span>
						, trims, or model data) should import faithfully and be exported as-is. You
						can still edit key balancing factors — such as quantity, weight, value, and
						enchantments — directly in the tool.
					</p>
					<p class="text-gray-700 mb-3">
						Note: Prizes with multiple items are not supported for import.
					</p>
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
						, or
						<!-- prettier-ignore -->
						<span class="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">PhysicalKey</span>
						.
					</p>
					<p class="text-gray-700 mb-3">
						After exporting, you should review the YAML to ensure everything is intact
						and accurate. While imports and exports aim to be faithful, the process
						isn’t guaranteed to be fully robust — always double-check that your prizes
						appear as expected before using them in-game.
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

		<!-- Duplicate Crate Name Warning Modal -->
		<BaseModal
			:isOpen="showDuplicateWarning"
			title="Duplicate Crate Name Detected"
			maxWidth="max-w-md"
			@close="cancelDuplicateImport">
			<div class="space-y-4">
				<div class="flex items-start">
					<ExclamationTriangleIcon
						class="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
					<div>
						<p class="text-gray-900 font-medium mb-2">
							A crate with the name "{{ duplicateWarningData?.originalName }}" already
							exists.
						</p>
						<p class="text-gray-700 mb-3">Would you like to create another one?</p>
					</div>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end space-x-3">
					<BaseButton @click="cancelDuplicateImport" variant="tertiary">
						Cancel
					</BaseButton>
					<BaseButton @click="confirmDuplicateImport" variant="primary">
						Yes, that's fine
					</BaseButton>
				</div>
			</template>
		</BaseModal>

		<!-- Limit Reached Modal -->
		<BaseModal
			:isOpen="showLimitReachedModal"
			title="Crate limit of 2 reached"
			maxWidth="max-w-lg"
			@close="showLimitReachedModal = false">
			<div class="space-y-4">
				<div class="flex items-start">
					<ExclamationTriangleIcon
						class="h-6 w-6 text-heavy-metal mr-3 flex-shrink-0 mt-0.5" />
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
							Limited crates until tool is shiny good!
							<TrophyIcon class="h-5 w-5 text-heavy-metal" />
						</h3>
						<div class="text-gray-600 space-y-3">
							<p>
								I know you'd love to create more crates, and I totally get it! While
								this tool is still in its early stages, I'm keeping it to 2 crates
								per user to make sure everything works smoothly.
							</p>
							<p>
								The sooner I feel this tool is ready for prime time, the sooner I'll
								increase the limit. You can help me get there faster by:
							</p>
							<ul class="list-disc list-inside space-y-1 ml-2">
								<li>
									Giving me
									<router-link
										to="/suggestions"
										class="inline-block text-heavy-metal hover:text-gray-asparagus underline">
										suggestions
									</router-link>
									for improvements
								</li>
								<li>
									Joining the
									<a
										href="https://discord.gg/bz6ckxGZKw"
										target="_blank"
										class="inline-block text-heavy-metal hover:text-gray-asparagus underline">
										Discord
									</a>
									to chat about any issues
								</li>
								<li>Letting me know what's working and what isn't</li>
							</ul>
							<p class="text-sm text-gray-500">
								Thanks for being patient while I polish this up! 🙏
							</p>
						</div>
					</div>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end">
					<BaseButton @click="showLimitReachedModal = false" variant="primary">
						Got it
					</BaseButton>
				</div>
			</template>
		</BaseModal>
	</div>
</template>
