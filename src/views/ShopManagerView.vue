<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseCard from '../components/BaseCard.vue'
import BaseModal from '../components/BaseModal.vue'
import {
	GlobeAltIcon,
	BuildingStorefrontIcon,
	CurrencyDollarIcon,
	CubeIcon,
	PencilSquareIcon,
	TrashIcon,
	XCircleIcon,
	PlusIcon
} from '@heroicons/vue/24/outline'
import { useAdmin } from '../utils/admin.js'
import { useShops } from '../utils/shopProfile.js'
import {
	useServers,
	createServer,
	updateServer,
	deleteServer,
	getMinecraftVersions
} from '../utils/serverProfile.js'

const { user, userProfile } = useAdmin()

// Get user's shops and servers
const { shops } = useShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))

const showCreateForm = ref(false)
const showEditForm = ref(false)
const showDeleteModal = ref(false)
const editingServer = ref(null)
const serverToDelete = ref(null)
const loading = ref(false)
const error = ref(null)
const createFormError = ref(null)
const editFormError = ref(null)
const nameValidationError = ref(null)
const versionValidationError = ref(null)

const minecraftVersions = getMinecraftVersions()
const defaultVersion = minecraftVersions[0]?.value || '1.21'

const serverForm = ref({
	name: '',
	minecraft_version: defaultVersion,
	description: ''
})

// Find all shops owned by the user (marked with is_own_shop flag)
const ownShops = computed(() => {
	if (!shops.value) return []
	return shops.value.filter((shop) => shop.is_own_shop === true)
})

function resetServerForm() {
	serverForm.value = {
		name: '',
		minecraft_version: defaultVersion,
		description: ''
	}
}

function showCreateServerForm() {
	showCreateForm.value = true
	editingServer.value = null
	resetServerForm()
	createFormError.value = null
	nameValidationError.value = null
	versionValidationError.value = null
	error.value = null
}

function showEditServerForm(server) {
	editingServer.value = server
	showEditForm.value = true
	serverForm.value = {
		name: server.name,
		minecraft_version: server.minecraft_version,
		description: server.description || ''
	}
	editFormError.value = null
	nameValidationError.value = null
	versionValidationError.value = null
	error.value = null
}

function closeServerModals() {
	showCreateForm.value = false
	showEditForm.value = false
	showDeleteModal.value = false
	editingServer.value = null
	serverToDelete.value = null
	createFormError.value = null
	editFormError.value = null
	nameValidationError.value = null
	versionValidationError.value = null
	error.value = null
	resetServerForm()
}

async function handleServerSubmit() {
	if (!user.value?.uid) return

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
			await updateServer(editingServer.value.id, serverForm.value)
		} else {
			await createServer(user.value.uid, serverForm.value)
		}
		closeServerModals()
	} catch (err) {
		console.error('Error saving server:', err)
		if (editingServer.value) {
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
	error.value = null
}

async function executeDeleteServer() {
	if (!serverToDelete.value) return

	loading.value = true
	error.value = null

	try {
		await deleteServer(serverToDelete.value.id)
		closeServerModals()
	} catch (err) {
		console.error('Error deleting server:', err)
		error.value = err.message || 'Failed to delete server. Please try again.'
	} finally {
		loading.value = false
	}
}

function getServerForShop(shop) {
	if (!shop || !servers.value) return null
	return servers.value.find((server) => server.id === shop.server_id) || null
}

</script>

<template>
	<div class="p-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
				<div>
						<h1 class="text-3xl font-bold text-gray-900 mb-2">Player Shop Manager</h1>
					<p class="text-gray-600">
						Manage your player shops and track pricing data.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-3 md:gap-4">
					<BaseButton @click="showCreateServerForm" variant="primary">
						<template #left-icon>
							<PlusIcon />
						</template>
						Add Server
					</BaseButton>
					<RouterLink to="/shops">
						<BaseButton variant="secondary">
							<template #left-icon>
								<BuildingStorefrontIcon />
							</template>
							Manage Shops
						</BaseButton>
					</RouterLink>
					<RouterLink to="/market-overview">
						<BaseButton variant="secondary">
							<template #left-icon>
								<CurrencyDollarIcon />
							</template>
							View Market
						</BaseButton>
					</RouterLink>
				</div>
			</div>
		</div>

		<!-- Your Shops Section -->
		<div v-if="ownShops.length" class="mb-8">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				My Shops
			</h2>
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<BaseCard
					v-for="shop in ownShops"
					:key="shop.id"
					variant="secondary">
					<template #header>
						<h3
							class="text-xl font-semibold text-heavy-metal hover:text-gray-asparagus cursor-pointer inline-flex items-center gap-2">
							<BuildingStorefrontIcon class="w-5 h-5" />
							{{ shop.name }}
						</h3>
					</template>
					<template #actions>
						<RouterLink
							:to="{ name: 'shop', params: { shopId: shop.id } }"
							class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
							<CubeIcon class="w-4 h-4" />
						</RouterLink>
					</template>
					<template #body>
						<div class="flex flex-col gap-4 w-full">
							<p v-if="shop.description">
								{{ shop.description }}
							</p>
							<div class="text-sm text-heavy-metal">
								<span class="font-medium">Server:</span>
								{{ getServerForShop(shop)?.name || 'Unknown Server' }}
								<span class="mx-2"></span>
								<span class="font-medium">Version:</span>
								{{ getServerForShop(shop)?.minecraft_version || 'Unknown' }}
								<span v-if="shop.location" class="mx-2"></span>
								<span v-if="shop.location" class="font-medium">Location:</span>
								<span v-if="shop.location">📍 {{ shop.location }}</span>
							</div>
							<RouterLink :to="{ name: 'shop', params: { shopId: shop.id } }" class="mt-auto w-fit">
								<BaseButton variant="primary">
									<template #left-icon>
										<CubeIcon class="w-4 h-4" />
									</template>
									Manage Items
								</BaseButton>
							</RouterLink>
						</div>
					</template>
				</BaseCard>
		</div>
		</div>

		<!-- Other Section -->
		<div class="mb-8">
			<h2 class="text-2xl font-semibold text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Servers and Shops
			</h2>
		</div>

		<!-- Support Cards -->
		<div class="space-y-6">
			<div
				v-if="error"
				class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
				{{ error }}
			</div>
			<div
				v-if="loading"
				class="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
				Processing...
			</div>
			<div
				v-if="servers?.length"
				class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<BaseCard
					v-for="server in servers"
					:key="server.id"
					variant="tertiary"
					class="h-full">
					<template #header>
						<h3 class="text-lg font-semibold text-heavy-metal flex items-center gap-2">
							<GlobeAltIcon class="w-5 h-5" />
							{{ server.name }}
						</h3>
					</template>
					<template #actions>
						<div class="flex items-center gap-2 ml-3">
							<button
								type="button"
								@click="showEditServerForm(server)"
								:disabled="loading"
								class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed">
								<PencilSquareIcon class="w-4 h-4" />
							</button>
							<button
								type="button"
								@click="confirmDeleteServer(server)"
								:disabled="loading"
								class="p-1 bg-semantic-danger text-white hover:bg-opacity-80 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed">
								<TrashIcon class="w-4 h-4" />
							</button>
						</div>
					</template>
					<template #body>
						<div class="flex flex-col gap-4">
							<div class="text-xs uppercase tracking-wide text-gray-500">
								Version {{ server.minecraft_version || 'n/a' }}
							</div>
							<div
								v-if="(shops || []).some((s) => s.server_id === server.id)"
								class="space-y-4">
								<div>
									<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-asparagus/40 pb-1 w-full">
										My Shops
									</h4>
									<ul class="mt-1 space-y-1 text-sm text-gray-600">
										<li
											v-for="shop in (shops || [])
												.filter((s) => s.server_id === server.id && s.is_own_shop)"
											:key="shop.id"
											class="flex items-center gap-3">
											<RouterLink
												:to="{ name: 'shop', params: { shopId: shop.id } }"
												class="text-base font-semibold text-heavy-metal hover:text-gray-asparagus transition">
												{{ shop.name }}
											</RouterLink>
										</li>
										<li
											v-if="!(shops || []).some((s) => s.server_id === server.id && s.is_own_shop)"
											class="text-sm italic text-gray-500">
											No personal shops yet.
										</li>
									</ul>
								</div>
								<div>
									<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-asparagus/40 pb-1 w-full">
										Competitors
									</h4>
									<ul class="mt-1 space-y-1 text-sm text-gray-600">
										<li
											v-for="shop in (shops || [])
												.filter((s) => s.server_id === server.id && !s.is_own_shop)"
											:key="shop.id"
											class="flex items-center gap-3">
											<RouterLink
												:to="{ name: 'shop', params: { shopId: shop.id } }"
												class="text-base font-semibold text-heavy-metal hover:text-gray-asparagus transition">
												{{ shop.name }}
											</RouterLink>
										</li>
										<li
											v-if="!(shops || []).some((s) => s.server_id === server.id && !s.is_own_shop)"
											class="text-sm italic text-gray-500">
											No competitor shops tracked.
										</li>
									</ul>
								</div>
							</div>
							<p
								v-else
								class="text-sm italic text-gray-500">
								No shops yet for this server.
							</p>
						</div>
					</template>
				</BaseCard>
			</div>

			<div
				v-else
				class="rounded-xl border border-dashed border-gray-asparagus/50 bg-saltpan px-6 py-10 text-center text-sm text-gray-600">
				<p>No servers yet. Use the Add Server button above to add your first server.</p>
			</div>
		</div>

		<BaseModal
			:isOpen="showCreateForm"
			title="Add New Server"
			maxWidth="max-w-md"
			@close="closeServerModals">
			<form @submit.prevent="handleServerSubmit" class="space-y-4">
				<div>
					<label for="create-server-name" class="block text-sm font-medium text-gray-700 mb-1">
						Server Name *
					</label>
					<input
						id="create-server-name"
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
					<div
						v-if="nameValidationError"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ nameValidationError }}
					</div>
				</div>

				<div>
					<label for="create-minecraft-version" class="block text-sm font-medium text-gray-700 mb-1">
						Minecraft Version *
					</label>
					<select
						id="create-minecraft-version"
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
					<div
						v-if="versionValidationError"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ versionValidationError }}
					</div>
				</div>

				<div>
					<label for="create-description" class="block text-sm font-medium text-gray-700 mb-1">
						Description
					</label>
					<textarea
						id="create-description"
						v-model="serverForm.description"
						rows="3"
						placeholder="Optional description for this server..."
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"></textarea>
				</div>

				<div
					v-if="createFormError"
					class="text-sm text-red-600 font-semibold flex items-center gap-1 bg-red-100 border border-red-300 px-3 py-2 rounded">
					<XCircleIcon class="w-4 h-4" />
					{{ createFormError }}
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="closeServerModals"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="handleServerSubmit"
							:disabled="loading"
							variant="primary">
							{{ loading ? 'Creating...' : 'Create Server' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<BaseModal
			:isOpen="showEditForm"
			title="Edit Server"
			maxWidth="max-w-md"
			@close="closeServerModals">
			<form @submit.prevent="handleServerSubmit" class="space-y-4">
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
					<div
						v-if="nameValidationError"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ nameValidationError }}
					</div>
				</div>

				<div>
					<label for="edit-minecraft-version" class="block text-sm font-medium text-gray-700 mb-1">
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
					<div
						v-if="versionValidationError"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ versionValidationError }}
					</div>
				</div>

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

				<div
					v-if="editFormError"
					class="text-sm text-red-600 font-semibold flex items-center gap-1 bg-red-100 border border-red-300 px-3 py-2 rounded">
					<XCircleIcon class="w-4 h-4" />
					{{ editFormError }}
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="closeServerModals"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="handleServerSubmit"
							:disabled="loading"
							variant="primary">
							{{ loading ? 'Updating...' : 'Update Server' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<BaseModal
			:isOpen="showDeleteModal"
			title="Delete Server"
			size="small"
			@close="closeServerModals">
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
						<button
							type="button"
							@click="closeServerModals"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="executeDeleteServer"
							:disabled="loading"
							variant="primary"
							class="bg-semantic-danger hover:bg-opacity-90">
							{{ loading ? 'Deleting...' : 'Delete' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>
	</div>
</template>
