<script setup>
import { ref, computed, watch } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useRouter } from 'vue-router'
import { useShops, createShop, updateShop, deleteShop } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'

const user = useCurrentUser()
const router = useRouter()

// Reactive state
const showCreateForm = ref(false)
const editingShop = ref(null)
const loading = ref(false)
const error = ref(null)

// Form data
const shopForm = ref({
	name: '',
	server_id: '',
	location: '',
	description: '',
	is_own_shop: false
})

// Get user's servers for dropdown
const { servers } = useServers(computed(() => user.value?.uid))

// Get user's shops
const { shops } = useShops(computed(() => user.value?.uid))

// Computed properties
const hasShops = computed(() => shops.value && shops.value.length > 0)
const hasServers = computed(() => servers.value && servers.value.length > 0)

// Group shops by server (show all servers, even those without shops)
const shopsByServer = computed(() => {
	if (!servers.value) return {}

	const grouped = {}

	// First, add all servers to the grouped object
	servers.value.forEach((server) => {
		grouped[server.id] = {
			server: server,
			shops: []
		}
	})

	// Then add shops to their respective servers
	if (shops.value) {
		shops.value.forEach((shop) => {
			if (grouped[shop.server_id]) {
				grouped[shop.server_id].shops.push(shop)
			}
		})
	}

	return grouped
})

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
function showCreateShopForm(serverId = null) {
	showCreateForm.value = true
	editingShop.value = null
	resetForm()
	// Pre-select server if provided
	if (serverId) {
		shopForm.value.server_id = serverId
	}
}

function showEditShopForm(shop) {
	editingShop.value = shop
	showCreateForm.value = true
	shopForm.value = {
		name: shop.name,
		server_id: shop.server_id,
		location: shop.location || '',
		description: shop.description || '',
		is_own_shop: shop.is_own_shop
	}
}

function resetForm() {
	shopForm.value = {
		name: '',
		server_id: '',
		location: '',
		description: '',
		is_own_shop: false
	}
}

function cancelForm() {
	showCreateForm.value = false
	editingShop.value = null
	resetForm()
	error.value = null
}

// CRUD operations
async function handleSubmit() {
	if (!user.value?.uid) return

	loading.value = true
	error.value = null

	try {
		if (editingShop.value) {
			// Update existing shop
			await updateShop(editingShop.value.id, shopForm.value)
		} else {
			// Create new shop
			await createShop(user.value.uid, shopForm.value)
		}

		// Reset form and close
		cancelForm()
	} catch (err) {
		console.error('Error saving shop:', err)
		error.value = err.message || 'Failed to save shop. Please try again.'
	} finally {
		loading.value = false
	}
}

async function handleDelete(shop) {
	if (!confirm(`Are you sure you want to delete "${shop.name}"? This action cannot be undone.`)) {
		return
	}

	loading.value = true
	error.value = null

	try {
		await deleteShop(shop.id)
	} catch (err) {
		console.error('Error deleting shop:', err)
		error.value = err.message || 'Failed to delete shop. Please try again.'
	} finally {
		loading.value = false
	}
}

// Form validation
const isFormValid = computed(() => {
	return shopForm.value.name.trim() && shopForm.value.server_id
})

// Helper function to get server name
function getServerName(serverId) {
	const server = servers.value?.find((s) => s.id === serverId)
	return server ? server.name : 'Unknown Server'
}
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Shops</h1>
			<p class="text-gray-600">
				Manage your shops and competitor shops for price tracking and comparison.
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

		<!-- No servers warning -->
		<div
			v-if="!hasServers && !loading"
			class="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
			<p class="font-medium">No servers found</p>
			<p class="text-sm mt-1">
				You need to create a server first before adding shops.
				<router-link to="/servers" class="text-blue-600 hover:text-blue-800 underline">
					Go to Servers
				</router-link>
			</p>
		</div>

		<!-- Create/Edit shop form -->
		<div v-if="showCreateForm" class="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
			<h2 class="text-xl font-semibold mb-4">
				{{ editingShop ? 'Edit Shop' : 'Add New Shop' }}
			</h2>

			<form @submit.prevent="handleSubmit" class="space-y-4">
				<!-- Shop name -->
				<div>
					<label for="shop-name" class="block text-sm font-medium text-gray-700 mb-1">
						Shop Name *
					</label>
					<input
						id="shop-name"
						v-model="shopForm.name"
						type="text"
						required
						placeholder="e.g., verzion's shop"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>

				<!-- Server selection -->
				<div>
					<label for="server-id" class="block text-sm font-medium text-gray-700 mb-1">
						Server *
					</label>
					<select
						id="server-id"
						v-model="shopForm.server_id"
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
						<option value="">Select a server</option>
						<option v-for="server in servers" :key="server.id" :value="server.id">
							{{ server.name }}
						</option>
					</select>
				</div>

				<!-- Location -->
				<div>
					<label for="location" class="block text-sm font-medium text-gray-700 mb-1">
						Location
					</label>
					<input
						id="location"
						v-model="shopForm.location"
						type="text"
						placeholder="e.g., /warp shops, coordinates, etc."
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
						Description
					</label>
					<textarea
						id="description"
						v-model="shopForm.description"
						rows="3"
						placeholder="Optional description for this shop..."
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
				</div>

				<!-- Shop type -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Shop Type</label>
					<div class="flex gap-4">
						<div class="flex items-center">
							<input
								id="competitor-shop"
								v-model="shopForm.is_own_shop"
								:value="false"
								type="radio"
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
							<label for="competitor-shop" class="ml-2 block text-sm text-gray-700">
								Competitor
							</label>
						</div>
						<div class="flex items-center">
							<input
								id="my-shop"
								v-model="shopForm.is_own_shop"
								:value="true"
								type="radio"
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
							<label for="my-shop" class="ml-2 block text-sm text-gray-700">
								My Shop
							</label>
						</div>
					</div>
				</div>

				<!-- Form actions -->
				<div class="flex gap-2">
					<button
						type="submit"
						:disabled="!isFormValid || loading"
						class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
						{{ editingShop ? 'Update Shop' : 'Create Shop' }}
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

		<!-- Shops list grouped by server -->
		<div v-if="hasServers" class="space-y-6">
			<div
				v-for="(serverGroup, serverId) in shopsByServer"
				:key="serverId"
				class="border border-gray-200 rounded-lg overflow-hidden">
				<!-- Server header -->
				<div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
					<div class="flex justify-between items-center">
						<div>
							<h3 class="text-lg font-semibold text-gray-900">
								{{ serverGroup.server.name }}
							</h3>
							<p class="text-sm text-gray-500">
								{{ serverGroup.shops.length }} shop{{
									serverGroup.shops.length !== 1 ? 's' : ''
								}}
							</p>
						</div>
						<button
							@click="showCreateShopForm(serverGroup.server.id)"
							class="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors font-medium">
							+ Add Shop
						</button>
					</div>
				</div>

				<!-- Shops in this server -->
				<div class="divide-y divide-gray-200">
					<div
						v-for="shop in serverGroup.shops"
						:key="shop.id"
						v-show="!editingShop || editingShop.id !== shop.id"
						class="p-4 bg-white hover:bg-gray-50 transition-colors">
						<div class="flex justify-between items-start">
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-2">
									<h4 class="text-lg font-medium text-gray-900">
										{{ shop.name }}
									</h4>
									<span
										v-if="shop.is_own_shop"
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
										My Shop
									</span>
									<span
										v-else
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
										Competitor
									</span>
								</div>
								<p v-if="shop.location" class="text-sm text-gray-600 mb-1">
									📍 {{ shop.location }}
								</p>
								<p v-if="shop.description" class="text-gray-600 mb-2">
									{{ shop.description }}
								</p>
								<p class="text-xs text-gray-400">
									Created: {{ new Date(shop.created_at).toLocaleDateString() }}
								</p>
							</div>

							<div class="flex gap-2 ml-4">
								<router-link
									:to="{ path: '/shop-items', query: { shop: shop.id } }"
									class="text-purple-600 hover:text-purple-800 text-sm font-medium">
									Manage Items
								</router-link>
								<button
									@click="showEditShopForm(shop)"
									class="text-blue-600 hover:text-blue-800 text-sm font-medium">
									Edit
								</button>
								<button
									@click="handleDelete(shop)"
									class="text-red-600 hover:text-red-800 text-sm font-medium">
									Delete
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
