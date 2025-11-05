<script setup>
import { ref, computed, watch } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useRouter } from 'vue-router'
import {
	useServers,
	createServer,
	updateServer,
	deleteServer,
	getMinecraftVersions
} from '../utils/serverProfile.js'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import { XCircleIcon } from '@heroicons/vue/20/solid'

const user = useCurrentUser()
const router = useRouter()

// Reactive state
const showCreateForm = ref(false)
const showEditForm = ref(false)
const editingServer = ref(null)
const loading = ref(false)
const error = ref(null)

// Modal-specific error states
const createFormError = ref(null)
const editFormError = ref(null)

// Field-specific validation errors
const nameValidationError = ref(null)
const versionValidationError = ref(null)

// Delete confirmation modal state
const showDeleteModal = ref(false)
const serverToDelete = ref(null)

// Form data
const serverForm = ref({
	name: '',
	minecraft_version: '1.21',
	description: ''
})

// Get available Minecraft versions
const minecraftVersions = getMinecraftVersions()

// Get user's servers
const { servers } = useServers(computed(() => user.value?.uid))

// Computed properties
const hasServers = computed(() => servers.value && servers.value.length > 0)

// Watch for user changes - redirect if not logged in
watch(
	user,
	(newUser) => {
		if (newUser === null) {
			router.push('/signin')
		}
	},
	{ immediate: true }
)

// Form handlers
function showCreateServerForm() {
	showCreateForm.value = true
	editingServer.value = null
	resetForm()
}

function showEditServerForm(server) {
	editingServer.value = server
	showEditForm.value = true
	serverForm.value = {
		name: server.name,
		minecraft_version: server.minecraft_version,
		description: server.description || ''
	}
}

function resetForm() {
	serverForm.value = {
		name: '',
		minecraft_version: '1.21',
		description: ''
	}
}

function cancelForm() {
	showCreateForm.value = false
	showEditForm.value = false
	editingServer.value = null
	resetForm()
	error.value = null
	createFormError.value = null
	editFormError.value = null
	nameValidationError.value = null
	versionValidationError.value = null
	showDeleteModal.value = false
	serverToDelete.value = null
}

// CRUD operations
async function handleSubmit() {
	if (!user.value?.uid) return

	// Form validation
	if (!serverForm.value.name.trim()) {
		nameValidationError.value = 'Server name is required'
		return
	}

	if (!serverForm.value.minecraft_version) {
		versionValidationError.value = 'Minecraft version is required'
		return
	}

	loading.value = true
	createFormError.value = null
	editFormError.value = null
	nameValidationError.value = null
	versionValidationError.value = null

	try {
		if (editingServer.value) {
			// Update existing server
			await updateServer(editingServer.value.id, serverForm.value)
		} else {
			// Create new server
			await createServer(user.value.uid, serverForm.value)
		}

		// Reset form and close
		cancelForm()
	} catch (err) {
		console.error('Error saving server:', err)
		if (showEditForm.value) {
			editFormError.value = err.message || 'Failed to save server. Please try again.'
		} else {
			createFormError.value = err.message || 'Failed to save server. Please try again.'
		}
	} finally {
		loading.value = false
	}
}

function confirmDeleteServer(server) {
	serverToDelete.value = { id: server.id, name: server.name }
	showDeleteModal.value = true
}

async function executeDelete() {
	if (!serverToDelete.value) return

	loading.value = true
	error.value = null

	try {
		await deleteServer(serverToDelete.value.id)
	} catch (err) {
		console.error('Error deleting server:', err)
		error.value = err.message || 'Failed to delete server. Please try again.'
	} finally {
		loading.value = false
		showDeleteModal.value = false
		serverToDelete.value = null
	}
}

</script>

<template>
	<div class="p-4 pt-8">
		<!-- Back Button -->
		<div class="mb-4">
			<BaseButton
				@click="$router.push('/shop-manager')"
				variant="tertiary">
				<template #left-icon>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
					</svg>
				</template>
				Back to Shop Manager
			</BaseButton>
		</div>

		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div>
					<!-- Dashboard Header -->
					<div>
						<h1 class="text-3xl font-bold text-gray-900 mb-2">Servers</h1>
						<p class="text-gray-600">
							Manage your Minecraft servers for shop tracking and price comparison.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Error message -->
		<div v-if="error" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
			{{ error }}
		</div>

		<!-- Loading state -->
		<div
			v-if="loading"
			class="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
			Processing...
		</div>

		<!-- Add Server Button -->
		<div class="mb-6">
			<BaseButton
				@click="showCreateServerForm"
				variant="primary">
				<template #left-icon>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4" />
					</svg>
				</template>
				Add New Server
			</BaseButton>
		</div>

		<!-- Your Servers Section -->
		<div class="mb-8">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Your Servers
			</h2>
		</div>

		<!-- Create/Edit Server Modal -->
		<BaseModal
			:isOpen="showCreateForm"
			title="Add New Server"
			maxWidth="max-w-md"
			@close="showCreateForm = false; createFormError = null; nameValidationError = null; versionValidationError = null">

			<form @submit.prevent="handleSubmit" class="space-y-4">
				<!-- Server name -->
				<div>
					<label for="server-name" class="block text-sm font-medium text-gray-700 mb-1">
						Server Name *
					</label>
					<input
						id="server-name"
						v-model="serverForm.name"
						type="text"
						required
						placeholder="e.g., Hypixel Skyblock"
						@input="nameValidationError = null; createFormError = null"
						:class="[
							'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
							nameValidationError 
								? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />
					
					<!-- Name validation error -->
					<div v-if="nameValidationError" class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ nameValidationError }}
					</div>
				</div>

				<!-- Minecraft version -->
				<div>
					<label
						for="minecraft-version"
						class="block text-sm font-medium text-gray-700 mb-1">
						Minecraft Version *
					</label>
					<select
						id="minecraft-version"
						v-model="serverForm.minecraft_version"
						required
						@change="versionValidationError = null; createFormError = null"
						:class="[
							'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 font-sans',
							versionValidationError 
								? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]">
						<option
							v-for="version in minecraftVersions"
							:key="version.value"
							:value="version.value">
							{{ version.label }}
						</option>
					</select>
					
					<!-- Version validation error -->
					<div v-if="versionValidationError" class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ versionValidationError }}
					</div>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
						Description
					</label>
					<textarea
						id="description"
						v-model="serverForm.description"
						rows="3"
						placeholder="Optional description for this server..."
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="showCreateForm = false; createFormError = null; nameValidationError = null; versionValidationError = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="handleSubmit"
							:disabled="loading"
							variant="primary">
							{{ loading ? (editingServer ? 'Updating...' : 'Creating...') : (editingServer ? 'Update Server' : 'Create Server') }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Edit Server Modal -->
		<BaseModal
			:isOpen="showEditForm"
			title="Edit Server"
			maxWidth="max-w-md"
			@close="showEditForm = false; editFormError = null; nameValidationError = null; versionValidationError = null">

			<form @submit.prevent="handleSubmit" class="space-y-4">
				<!-- Server name -->
				<div>
					<label for="edit-server-name" class="block text-sm font-medium text-gray-700 mb-1">
						Server Name *
					</label>
					<input
						id="edit-server-name"
						v-model="serverForm.name"
						type="text"
						required
						placeholder="e.g., Hypixel Skyblock"
						@input="nameValidationError = null; editFormError = null"
						:class="[
							'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
							nameValidationError 
								? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />
					
					<!-- Name validation error -->
					<div v-if="nameValidationError" class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ nameValidationError }}
					</div>
				</div>

				<!-- Minecraft version -->
				<div>
					<label
						for="edit-minecraft-version"
						class="block text-sm font-medium text-gray-700 mb-1">
						Minecraft Version *
					</label>
					<select
						id="edit-minecraft-version"
						v-model="serverForm.minecraft_version"
						required
						@change="versionValidationError = null; editFormError = null"
						:class="[
							'block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 focus:ring-2 font-sans',
							versionValidationError 
								? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]">
						<option
							v-for="version in minecraftVersions"
							:key="version.value"
							:value="version.value">
							{{ version.label }}
						</option>
					</select>
					
					<!-- Version validation error -->
					<div v-if="versionValidationError" class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ versionValidationError }}
					</div>
				</div>

				<!-- Description -->
				<div>
					<label for="edit-description" class="block text-sm font-medium text-gray-700 mb-1">
						Description
					</label>
					<textarea
						id="edit-description"
						v-model="serverForm.description"
						rows="3"
						placeholder="Optional description for this server..."
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="showEditForm = false; editFormError = null; nameValidationError = null; versionValidationError = null"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="handleSubmit"
							:disabled="loading"
							variant="primary">
							{{ loading ? 'Updating...' : 'Update Server' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<!-- Delete Confirmation Modal -->
		<!-- prettier-ignore -->
		<BaseModal
			:isOpen="showDeleteModal"
			title="Delete Server"
			size="small"
			@close="showDeleteModal = false; serverToDelete = null">
			<div class="space-y-4">
				<div>
					<h3 class="font-normal text-gray-900">
						Are you sure you want to delete <span class="font-semibold">{{ serverToDelete?.name }}</span>?
					</h3>
					<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end p-4">
					<div class="flex space-x-3">
						<!-- prettier-ignore -->
						<button
							type="button"
							@click="showDeleteModal = false; serverToDelete = null"
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

		<!-- Servers list -->
		<div v-if="hasServers" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<div
				v-for="server in servers"
				:key="server.id"
				class="bg-sea-mist rounded-lg shadow-md border-2 border-amulet h-full overflow-hidden flex flex-col">
				<!-- Card Header -->
				<div
					class="bg-amulet py-2 px-3 pl-4 border-x-2 border-t-2 border-white rounded-t-lg">
					<div class="flex items-center justify-between">
						<h3
							class="text-xl font-semibold text-heavy-metal hover:text-gray-asparagus cursor-pointer flex-1">
							{{ server.name }}
						</h3>
						<!-- Action Buttons -->
						<div class="flex gap-2 ml-3">
							<button
								@click="showEditServerForm(server)"
								class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
								<svg
									class="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
								</svg>
							</button>
							<button
								@click="confirmDeleteServer(server)"
								class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
								<svg
									class="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>
				</div>
				<!-- Card Body -->
				<div
					class="bg-norway p-4 border-x-2 border-b-2 border-white rounded-b-lg flex-1 flex flex-col">
					<div class="flex-1">
						<p class="text-heavy-metal mb-3">
							{{ server.description || 'Minecraft server for shop tracking and price comparison.' }}
						</p>
						<div class="text-sm text-heavy-metal">
							<span class="font-medium">Version:</span>
							{{
								minecraftVersions.find((v) => v.value === server.minecraft_version)
									?.label || server.minecraft_version
							}}
							<span class="mx-2"></span>
							<span class="font-medium">Created:</span>
							{{ new Date(server.created_at).toLocaleDateString() }}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Empty state -->
		<div v-else-if="!loading" class="text-center py-8">
			<div class="text-gray-400 text-6xl mb-4">🏗️</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No servers yet</h3>
			<p class="text-gray-600 mb-4">
				Create your first server to start tracking shops and comparing prices.
			</p>
			<BaseButton
				@click="showCreateServerForm"
				variant="primary">
				<template #left-icon>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4" />
					</svg>
				</template>
				Add Your First Server
			</BaseButton>
		</div>
	</div>
</template>
