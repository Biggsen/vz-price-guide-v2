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

const user = useCurrentUser()
const router = useRouter()

// Reactive state
const showCreateForm = ref(false)
const editingServer = ref(null)
const loading = ref(false)
const error = ref(null)

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
			router.push('/login')
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
	showCreateForm.value = true
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
	editingServer.value = null
	resetForm()
	error.value = null
}

// CRUD operations
async function handleSubmit() {
	if (!user.value?.uid) return

	loading.value = true
	error.value = null

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
		error.value = err.message || 'Failed to save server. Please try again.'
	} finally {
		loading.value = false
	}
}

async function handleDelete(server) {
	if (
		!confirm(`Are you sure you want to delete "${server.name}"? This action cannot be undone.`)
	) {
		return
	}

	loading.value = true
	error.value = null

	try {
		await deleteServer(server.id)
	} catch (err) {
		console.error('Error deleting server:', err)
		error.value = err.message || 'Failed to delete server. Please try again.'
	} finally {
		loading.value = false
	}
}

// Form validation
const isFormValid = computed(() => {
	return serverForm.value.name.trim() && serverForm.value.minecraft_version
})
</script>

<template>
	<div class="p-4 pt-8">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Servers</h1>
			<p class="text-gray-600">
				Manage your Minecraft servers for shop tracking and price comparison.
			</p>
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

		<!-- Create server button -->
		<div class="mb-6">
			<button
				@click="showCreateServerForm"
				class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium">
				+ Add New Server
			</button>
		</div>

		<!-- Create/Edit server form -->
		<div v-if="showCreateForm" class="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
			<h2 class="text-xl font-semibold mb-4">
				{{ editingServer ? 'Edit Server' : 'Add New Server' }}
			</h2>

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
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option
							v-for="version in minecraftVersions"
							:key="version.value"
							:value="version.value">
							{{ version.label }}
						</option>
					</select>
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
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
				</div>

				<!-- Form actions -->
				<div class="flex gap-2">
					<button
						type="submit"
						:disabled="!isFormValid || loading"
						class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
						{{ editingServer ? 'Update Server' : 'Create Server' }}
					</button>
					<button
						type="button"
						@click="cancelForm"
						class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors">
						Cancel
					</button>
				</div>
			</form>
		</div>

		<!-- Servers list -->
		<div v-if="hasServers" class="space-y-4">
			<div
				v-for="server in servers"
				:key="server.id"
				v-show="!editingServer || editingServer.id !== server.id"
				class="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
				<div class="flex justify-between items-start">
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-gray-900">{{ server.name }}</h3>
						<p class="text-sm text-gray-500 mb-2">
							{{
								minecraftVersions.find((v) => v.value === server.minecraft_version)
									?.label || server.minecraft_version
							}}
						</p>
						<p v-if="server.description" class="text-gray-600 mb-2">
							{{ server.description }}
						</p>
						<p class="text-xs text-gray-400">
							Created: {{ new Date(server.created_at).toLocaleDateString() }}
						</p>
					</div>

					<div class="flex gap-2 ml-4">
						<button
							@click="showEditServerForm(server)"
							class="text-blue-600 hover:text-blue-800 text-sm font-medium">
							Edit
						</button>
						<button
							@click="handleDelete(server)"
							class="text-red-600 hover:text-red-800 text-sm font-medium">
							Delete
						</button>
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
			<button
				@click="showCreateServerForm"
				class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors font-medium">
				Add Your First Server
			</button>
		</div>
	</div>
</template>
