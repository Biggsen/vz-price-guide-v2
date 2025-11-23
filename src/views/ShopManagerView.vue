<script setup>
import { computed, ref, watch, TransitionGroup, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseCard from '../components/BaseCard.vue'
import BaseModal from '../components/BaseModal.vue'
import LinkWithActions from '../components/LinkWithActions.vue'
import PlayerShopsGroup from '../components/PlayerShopsGroup.vue'
import ServerFormModal from '../components/ServerFormModal.vue'
import {
	GlobeAltIcon,
	BuildingStorefrontIcon,
	CurrencyDollarIcon,
	PencilIcon,
	TrashIcon,
	PlusIcon
} from '@heroicons/vue/24/outline'
import { XCircleIcon } from '@heroicons/vue/24/solid'
import { useAdmin } from '../utils/admin.js'
import { useShops, createShop, updateShop, deleteShop } from '../utils/shopProfile.js'
import {
	useServers,
	createServer,
	updateServer,
	deleteServer,
	getMinecraftVersions
} from '../utils/serverProfile.js'
import { useUserProfile } from '../utils/userProfile.js'

const { user, userProfile } = useAdmin()

// Get user's shops and servers
const { shops } = useShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))


const hasServers = computed(() => servers.value && servers.value.length > 0)

const showServerForm = ref(false)
const showDeleteModal = ref(false)
const editingServer = ref(null)
const serverToDelete = ref(null)
const loading = ref(false)
const error = ref(null)
const formError = ref(null)
const nameValidationError = ref(null)
const versionValidationError = ref(null)

const minecraftVersions = getMinecraftVersions()
const defaultVersion = minecraftVersions[0]?.value || '1.21'

const serverForm = ref({
	name: '',
	minecraft_version: defaultVersion,
	description: ''
})

const showShopForm = ref(false)
const showShopDeleteModal = ref(false)
const editingShop = ref(null)
const shopToDelete = ref(null)
const shopLoading = ref(false)
const shopError = ref(null)
const shopCreateError = ref(null)
const shopEditError = ref(null)
const shopNameValidationError = ref(null)
const shopServerValidationError = ref(null)
const shopPlayerValidationError = ref(null)

const presetServerId = ref(null)
const presetShopType = ref(null)
const usePlayerAsShopName = ref(false)

// Refs for form inputs to enable auto-focus
const shopPlayerInput = ref(null)
const shopNameInput = ref(null)

const shopForm = ref({
	name: '',
	player: '',
	server_id: '',
	location: '',
	description: '',
	is_own_shop: false,
	owner_funds: null
})

// Watch player name to auto-fill shop name when checkbox is checked
watch(() => shopForm.value.player, (newPlayer) => {
	if (usePlayerAsShopName.value && newPlayer) {
		shopForm.value.name = newPlayer
	}
})

// Watch checkbox to sync shop name field
watch(usePlayerAsShopName, (checked) => {
	if (checked && shopForm.value.player) {
		shopForm.value.name = shopForm.value.player
	} else if (!checked) {
		shopForm.value.name = ''
	}
})

// Group shops by server ID for easy access
const shopsByServer = computed(() => {
	if (!shops.value || !servers.value) return {}
	
	const grouped = {}
	
	// Initialize groups for each server
	servers.value.forEach((server) => {
		grouped[server.id] = {
			own: [],
			player: [],
			all: []
		}
	})
	
	// Group shops by server
	shops.value.forEach((shop) => {
		if (shop.server_id && grouped[shop.server_id]) {
			grouped[shop.server_id].all.push(shop)
			if (shop.is_own_shop) {
				grouped[shop.server_id].own.push(shop)
			} else {
				grouped[shop.server_id].player.push(shop)
			}
		}
	})
	
	return grouped
})

// Group shops by player name for each server
const shopsByPlayer = computed(() => {
	if (!shops.value || !servers.value) return {}
	
	const grouped = {}
	
	servers.value.forEach((server) => {
		grouped[server.id] = {
			own: {},
			player: {}
		}
	})
	
	shops.value.forEach((shop) => {
		if (!shop.server_id || !grouped[shop.server_id]) return
		
		const playerName = shop.is_own_shop
			? shop.player || userProfile.value?.minecraft_username || userProfile.value?.display_name || user.value?.email?.split('@')[0] || 'Unknown'
			: shop.player || shop.name || 'Unknown'
		
		const targetGroup = shop.is_own_shop ? grouped[shop.server_id].own : grouped[shop.server_id].player
		
		if (!targetGroup[playerName]) {
			targetGroup[playerName] = []
		}
		targetGroup[playerName].push(shop)
	})
	
	return grouped
})

function resetServerForm() {
	serverForm.value = {
		name: '',
		minecraft_version: defaultVersion,
		description: ''
	}
}

function showCreateServerForm() {
	showServerForm.value = true
	editingServer.value = null
	resetServerForm()
	formError.value = null
	nameValidationError.value = null
	versionValidationError.value = null
	error.value = null
}

function showEditServerForm(server) {
	editingServer.value = server
	showServerForm.value = true
	serverForm.value = {
		name: server.name,
		minecraft_version: server.minecraft_version,
		description: server.description || ''
	}
	formError.value = null
	nameValidationError.value = null
	versionValidationError.value = null
	error.value = null
}

function closeServerModals() {
	showServerForm.value = false
	showDeleteModal.value = false
	editingServer.value = null
	serverToDelete.value = null
	formError.value = null
	nameValidationError.value = null
	versionValidationError.value = null
	error.value = null
	resetServerForm()
}

function clearServerErrors(types) {
	if (types.includes('name')) {
		nameValidationError.value = null
	}
	if (types.includes('version')) {
		versionValidationError.value = null
	}
	if (types.includes('form')) {
		formError.value = null
	}
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
	formError.value = null
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
		formError.value = err.message || 'Failed to save server. Please try again.'
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

function resetShopForm() {
	shopForm.value = {
		name: '',
		player: '',
		server_id: '',
		location: '',
		description: '',
		is_own_shop: false,
		owner_funds: null
	}
	usePlayerAsShopName.value = false
}

function showCreateShopForm(serverId = '', isOwnShop = null) {
	showShopForm.value = true
	editingShop.value = null
	resetShopForm()
	presetServerId.value = serverId || null
	presetShopType.value = typeof isOwnShop === 'boolean' ? isOwnShop : null
	if (serverId) shopForm.value.server_id = serverId
	if (typeof isOwnShop === 'boolean') shopForm.value.is_own_shop = isOwnShop
	shopCreateError.value = null
	shopEditError.value = null
	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopError.value = null
	
	// Focus the first input after modal opens
	nextTick(() => {
		if (!shopForm.value.is_own_shop && shopPlayerInput.value) {
			shopPlayerInput.value.focus()
		} else if (shopForm.value.is_own_shop && shopNameInput.value) {
			shopNameInput.value.focus()
		}
	})
}

function showEditShopForm(shop) {
	editingShop.value = shop
	showShopForm.value = true
	presetServerId.value = null
	presetShopType.value = null
	shopForm.value = {
		name: shop.name,
		player: shop.player || '',
		server_id: shop.server_id,
		location: shop.location || '',
		description: shop.description || '',
		is_own_shop: Boolean(shop.is_own_shop),
		owner_funds:
			shop.owner_funds === null || shop.owner_funds === undefined ? null : shop.owner_funds
	}
	usePlayerAsShopName.value = (shop.player || '') === shop.name
	shopCreateError.value = null
	shopEditError.value = null
	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopError.value = null
}

function closeShopModals() {
	showShopForm.value = false
	showShopDeleteModal.value = false
	editingShop.value = null
	shopToDelete.value = null
	presetServerId.value = null
	presetShopType.value = null
	shopLoading.value = false
	shopCreateError.value = null
	shopEditError.value = null
	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopError.value = null
	resetShopForm()
}

async function handleShopSubmit() {
	if (!user.value?.uid) return

	if (!shopForm.value.name.trim()) {
		shopNameValidationError.value = 'Shop name is required'
		return
	}

	if (!shopForm.value.is_own_shop && !shopForm.value.player.trim()) {
		shopPlayerValidationError.value = 'Player name is required'
		return
	}

	if (!editingShop.value && !shopForm.value.server_id) {
		shopServerValidationError.value = 'Server selection is required'
		return
	}

	shopLoading.value = true
	shopCreateError.value = null
	shopEditError.value = null
	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null

	try {
		// For own shops, use the user's Minecraft username from their profile
		const shopData = { ...shopForm.value }
		if (shopData.is_own_shop) {
			// Fallback chain: minecraft_username -> display_name -> email -> empty
			shopData.player = userProfile.value?.minecraft_username 
				|| userProfile.value?.display_name 
				|| user.value?.email?.split('@')[0] 
				|| ''
		}

		if (editingShop.value) {
			await updateShop(editingShop.value.id, shopData)
		} else {
			await createShop(user.value.uid, shopData)
		}
		closeShopModals()
	} catch (err) {
		console.error('Error saving shop:', err)
		if (editingShop.value) {
			shopEditError.value = err.message || 'Failed to save shop. Please try again.'
		} else {
			shopCreateError.value = err.message || 'Failed to save shop. Please try again.'
		}
	} finally {
		shopLoading.value = false
	}
}

function requestDeleteShop(shop) {
	shopToDelete.value = { id: shop.id, name: shop.name }
	showShopDeleteModal.value = true
	shopError.value = null
}

async function executeDeleteShop() {
	if (!shopToDelete.value) return

	shopLoading.value = true
	shopError.value = null

	try {
		await deleteShop(shopToDelete.value.id)
		closeShopModals()
	} catch (err) {
		console.error('Error deleting shop:', err)
		shopError.value = err.message || 'Failed to delete shop. Please try again.'
	} finally {
		shopLoading.value = false
	}
}

function handleShopFundsInput(event) {
	const value = event.target.value
	if (value === '' || value === null) {
		shopForm.value.owner_funds = null
	} else {
		const numValue = parseFloat(value)
		shopForm.value.owner_funds = Number.isNaN(numValue) ? null : numValue
	}
}

function getServerForShop(shop) {
	if (!shop || !servers.value) return null
	return servers.value.find((server) => server.id === shop.server_id) || null
}

const serverDeleteShopCount = computed(() => {
	if (!serverToDelete.value) return 0
	return shopsByServer.value[serverToDelete.value.id]?.all.length || 0
})

const serverDeleteHasShops = computed(() => serverDeleteShopCount.value > 0)

</script>

<template>
	<div class="p-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Player Shop Manager</h1>
				<p class="text-gray-600">
					Manage your shops and other player shops across all your servers.
				</p>
			</div>
			<div class="mt-4">
				<BaseButton @click="showCreateServerForm" variant="primary">
					<template #left-icon>
						<PlusIcon />
					</template>
					Add Server
				</BaseButton>
			</div>
		</div>

		<!-- My Shops section removed per request -->

		<!-- Other Section -->
		<div class="mb-8">
			<h2 class="text-2xl font-semibold text-gray-700 border-b-2 border-gray-asparagus pb-2">
				My Servers and Shops
			</h2>
		</div>

		<!-- Support Cards -->
		<div class="space-y-6">
			<div
				v-if="error"
				class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
				{{ error }}
			</div>
			<TransitionGroup
				v-if="servers?.length"
				name="fade"
				tag="div"
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
								<PencilIcon class="w-4 h-4" />
							</button>
							<button
								type="button"
								@click="confirmDeleteServer(server)"
								:disabled="loading"
								class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed">
								<TrashIcon class="w-4 h-4" />
							</button>
						</div>
					</template>
					<template #body>
						<div class="flex flex-col gap-4">
							<div class="text-xs uppercase tracking-wide text-gray-500">
								Version {{ server.minecraft_version || 'n/a' }}
							</div>
							<p
								v-if="server.description"
								class="text-sm text-gray-600">
								{{ server.description }}
							</p>
							<div
								v-if="shopsByServer[server.id]?.all.length"
								class="mb-2">
								<RouterLink :to="`/market-overview?serverId=${server.id}`">
									<BaseButton variant="secondary">
										<template #left-icon>
											<CurrencyDollarIcon class="w-4 h-4" />
										</template>
										Market Overview
									</BaseButton>
								</RouterLink>
							</div>
							<div class="space-y-4">
								<div class="flex gap-2">
									<BaseButton
										variant="secondary"
										:disabled="shopLoading"
										@click="showCreateShopForm(server.id, true)">
										<template #left-icon>
											<PlusIcon class="w-4 h-4" />
										</template>
										Add My Shop
									</BaseButton>
									<BaseButton
										variant="secondary"
										:disabled="shopLoading"
										@click="showCreateShopForm(server.id, false)">
										<template #left-icon>
											<PlusIcon class="w-4 h-4" />
										</template>
										Add Player Shop
									</BaseButton>
								</div>
								<div>
									<h4 class="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-asparagus/40 pb-1 w-full">
										My Shops
									</h4>
									<ul class="mt-1 space-y-1 text-sm text-gray-600">
										<PlayerShopsGroup
											v-for="(playerShops, playerName) in shopsByPlayer[server.id]?.own || {}"
											:key="playerName"
											:player-name="playerName"
											:shops="playerShops"
											:avatar-url="userProfile?.minecraft_avatar_url || null"
											:loading="shopLoading"
											@edit="showEditShopForm"
											@delete="requestDeleteShop" />
										<li
											v-if="!shopsByServer[server.id]?.own.length"
											class="text-sm italic text-gray-500">
											No personal shops yet.
										</li>
									</ul>
								</div>
								<div>
									<h4 class="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-asparagus/40 pb-1 w-full">
										Player Shops
									</h4>
									<ul class="mt-1 space-y-1 text-sm text-gray-600">
										<PlayerShopsGroup
											v-for="(playerShops, playerName) in shopsByPlayer[server.id]?.player || {}"
											:key="playerName"
											:player-name="playerName"
											:shops="playerShops"
											:loading="shopLoading"
											@edit="showEditShopForm"
											@delete="requestDeleteShop" />
										<li
											v-if="!shopsByServer[server.id]?.player.length"
											class="text-sm italic text-gray-500">
											No player shops tracked.
										</li>
									</ul>
								</div>
							</div>
						</div>
					</template>
				</BaseCard>
			</TransitionGroup>

			<div v-else>
				<p class="text-lg font-medium mb-2">No servers yet.</p>
				<p class="text-sm text-gray-600">Click "Add Server" to get started with your servers.</p>
			</div>
		</div>

		<BaseModal
			:isOpen="showShopForm"
			:title="editingShop ? 'Edit Shop' : 'Add New Shop'"
			maxWidth="max-w-2xl"
			@close="closeShopModals">
			<form @submit.prevent="handleShopSubmit" class="space-y-4">
				<div v-if="!shopForm.is_own_shop">
					<label for="shop-player" class="block text-sm font-medium text-gray-700 mb-1">
						Player (Minecraft Username) *
					</label>
					<input
						id="shop-player"
						ref="shopPlayerInput"
						v-model="shopForm.player"
						type="text"
						placeholder="Enter Minecraft username"
						@input="shopPlayerValidationError = null; shopCreateError = null; shopEditError = null"
						:class="[
							'block w-full rounded border-2 px-3 py-1.5 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
							shopPlayerValidationError
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />
					<div
						v-if="shopPlayerValidationError"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ shopPlayerValidationError }}
					</div>
				</div>

				<div>
					<label for="shop-name" class="block text-sm font-medium text-gray-700 mb-1">
						Shop Name *
					</label>
					<div class="mt-2">
						<label v-if="!shopForm.is_own_shop" class="flex items-center mb-2 cursor-pointer">
							<input
								v-model="usePlayerAsShopName"
								type="checkbox"
								class="mr-2 checkbox-input" />
							<span class="text-sm text-gray-700">Use Player as Shop Name</span>
						</label>
						<input
							id="shop-name"
							ref="shopNameInput"
							v-model="shopForm.name"
							type="text"
							required
							:disabled="usePlayerAsShopName && !shopForm.is_own_shop"
							placeholder="e.g., verzion's shop"
							@input="shopNameValidationError = null; shopCreateError = null; shopEditError = null"
							:class="[
								'block w-full rounded border-2 px-3 py-1.5 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans disabled:bg-gray-100 disabled:cursor-not-allowed',
								shopNameValidationError
									? 'border-red-500 focus:ring-red-500 focus:border-red-500'
									: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
							]" />
					</div>
					<div
						v-if="shopNameValidationError"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ shopNameValidationError }}
					</div>
				</div>

				<div v-if="!presetServerId && !editingShop">
					<label for="shop-server" class="block text-sm font-medium text-gray-700 mb-1">
						Server *
					</label>
					<select
						id="shop-server"
						v-model="shopForm.server_id"
						required
						@change="shopServerValidationError = null; shopCreateError = null; shopEditError = null"
						:class="[
							'block w-full rounded border-2 px-3 py-1.5 mt-2 mb-2 text-gray-900 focus:ring-2 font-sans',
							shopServerValidationError
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]">
						<option value="">Select a server</option>
						<option v-for="server in servers" :key="server.id" :value="server.id">
							{{ server.name }}
						</option>
					</select>
					<div
						v-if="shopServerValidationError"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						{{ shopServerValidationError }}
					</div>
				</div>

				<div>
					<label for="shop-location" class="block text-sm font-medium text-gray-700 mb-1">
						Location
					</label>
					<input
						id="shop-location"
						v-model="shopForm.location"
						type="text"
						placeholder="e.g., /warp shops, coordinates, etc."
						class="mt-2 mb-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus" />
				</div>

				<div>
					<label for="shop-description" class="block text-sm font-medium text-gray-700 mb-1">
						Description
					</label>
					<textarea
						id="shop-description"
						v-model="shopForm.description"
						rows="3"
						placeholder="Optional description for this shop..."
						class="mt-2 mb-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus"></textarea>
				</div>


				<div
					v-if="shopCreateError && !editingShop"
					class="text-sm text-red-600 font-semibold flex items-center gap-1 bg-red-100 border border-red-300 px-3 py-2 rounded">
					<XCircleIcon class="w-4 h-4" />
					{{ shopCreateError }}
				</div>
				<div
					v-if="shopEditError && editingShop"
					class="text-sm text-red-600 font-semibold flex items-center gap-1 bg-red-100 border border-red-300 px-3 py-2 rounded">
					<XCircleIcon class="w-4 h-4" />
					{{ shopEditError }}
				</div>
			</form>

			<template #footer>
				<div class="flex items-center justify-end">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="closeShopModals"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="handleShopSubmit"
							:disabled="shopLoading"
							variant="primary">
							{{ shopLoading ? (editingShop ? 'Updating...' : 'Creating...') : editingShop ? 'Update Shop' : 'Create Shop' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<BaseModal
			:isOpen="showShopDeleteModal"
			title="Delete Shop"
			size="small"
			@close="closeShopModals">
			<div class="space-y-4">
				<div>
					<h3 class="font-normal text-gray-900">
						Are you sure you want to delete
						<span class="font-semibold">{{ shopToDelete?.name }}</span>?
					</h3>
					<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
				</div>
			</div>

			<template #footer>
				<div class="flex items-center justify-end p-4">
					<div class="flex space-x-3">
						<button
							type="button"
							@click="closeShopModals"
							class="btn-secondary--outline">
							Cancel
						</button>
						<BaseButton
							@click="executeDeleteShop"
							:disabled="shopLoading"
							variant="primary"
							class="bg-semantic-danger hover:bg-opacity-90">
							{{ shopLoading ? 'Deleting...' : 'Delete' }}
						</BaseButton>
					</div>
				</div>
			</template>
		</BaseModal>

		<ServerFormModal
			:isOpen="showServerForm"
			:editingServer="editingServer"
			:formData="serverForm"
			:loading="loading"
			:formError="formError"
			:nameValidationError="nameValidationError"
			:versionValidationError="versionValidationError"
			@update:formData="serverForm = $event"
			@submit="handleServerSubmit"
			@close="closeServerModals"
			@clear-errors="clearServerErrors" />

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
					<p
						v-if="serverDeleteHasShops"
						class="text-sm text-gray-600 mt-2 font-medium">
							This server has {{ serverDeleteShopCount }}
							{{ serverDeleteShopCount === 1 ? 'shop' : 'shops' }}. Deleting the server will also permanently delete those shops.
						</p>
					<p v-else class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
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

<style scoped>
.radio-input {
	@apply w-5 h-5;
	accent-color: theme('colors.gray-asparagus');
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
	transform: scale(0.98);
}

.fade-move {
	transition: transform 0.2s ease;
}
</style>
