<script setup>
import { computed, ref, watch, TransitionGroup, nextTick, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseCard from '../components/BaseCard.vue'
import BaseIconButton from '../components/BaseIconButton.vue'
import BaseModal from '../components/BaseModal.vue'
import BaseTable from '../components/BaseTable.vue'
import ShopFormModal from '../components/ShopFormModal.vue'
import LinkWithActions from '../components/LinkWithActions.vue'
import ServerFormModal from '../components/ServerFormModal.vue'
import NotificationBanner from '../components/NotificationBanner.vue'
import {
	GlobeAltIcon,
	CurrencyDollarIcon,
	PencilIcon,
	TrashIcon,
	PlusIcon,
	ClipboardDocumentCheckIcon,
	WalletIcon,
	ChartBarIcon,
	MagnifyingGlassIcon,
	CheckCircleIcon,
	CubeIcon
} from '@heroicons/vue/24/outline'
import { XCircleIcon, MapPinIcon, UserIcon, BuildingStorefrontIcon } from '@heroicons/vue/24/solid'
import { useAdmin } from '../utils/admin.js'
import { useShops, createShop, updateShop, deleteShop } from '../utils/shopProfile.js'
import {
	useServers,
	createServer,
	updateServer,
	deleteServer,
	getMinecraftVersions
} from '../utils/serverProfile.js'
import { useUserProfile, generateMinecraftAvatar } from '../utils/userProfile.js'

const router = useRouter()
const { user, userProfile, canAccessShopManager } = useAdmin()

// Check if user has access to shop manager
const hasAccess = computed(() => canAccessShopManager.value)

// Computed properties for authentication states
const isAuthenticated = computed(() => {
	return user.value?.email && user.value?.emailVerified
})

const isSignedInButNotVerified = computed(() => {
	return user.value?.email && !user.value?.emailVerified
})

// Modal state
const showShopManagerModal = ref(false)

function closeShopManagerModal() {
	showShopManagerModal.value = false
}

function handleShopManagerClick() {
	if (isAuthenticated.value && hasAccess.value) {
		// User is authenticated, verified, and has access - shouldn't reach here
		// as they would see the actual shop manager, not the CTA
		return
	} else {
		// User is not authenticated or not verified, show modal
		showShopManagerModal.value = true
	}
}

// Navigation functions
function goToSignUp() {
	closeShopManagerModal()
	router.push('/signup')
}

function goToSignIn() {
	closeShopManagerModal()
	router.push('/signin')
}

function goToVerifyEmail() {
	closeShopManagerModal()
	router.push('/verify-email')
}

// Get user's shops and servers (only if user has access)
const { shops } = useShops(computed(() => (hasAccess.value ? user.value?.uid : null)))
const { servers } = useServers(computed(() => (hasAccess.value ? user.value?.uid : null)))

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
const shopsHidden = ref({})
const shopTableSort = ref({})

function loadShopsVisibility() {
	try {
		const saved = localStorage.getItem('shopManagerShopsHidden')
		if (saved) {
			shopsHidden.value = JSON.parse(saved)
		}
	} catch (error) {
		console.warn('Error loading shops visibility:', error)
	}
}

function saveShopsVisibility() {
	try {
		localStorage.setItem('shopManagerShopsHidden', JSON.stringify(shopsHidden.value))
	} catch (error) {
		console.warn('Error saving shops visibility:', error)
	}
}

function loadShopTableSort() {
	try {
		const saved = localStorage.getItem('shopManagerTableSort')
		if (saved) {
			shopTableSort.value = JSON.parse(saved)
		}
	} catch (error) {
		console.warn('Error loading shop table sort:', error)
	}
}

function saveShopTableSort() {
	try {
		localStorage.setItem('shopManagerTableSort', JSON.stringify(shopTableSort.value))
	} catch (error) {
		console.warn('Error saving shop table sort:', error)
	}
}

function getShopTableSort(serverId, tableType) {
	const key = `${serverId}_${tableType}`
	return shopTableSort.value[key] || { field: '', direction: 'asc' }
}

function setShopTableSort(serverId, tableType, field, direction) {
	const key = `${serverId}_${tableType}`
	if (!shopTableSort.value[key]) {
		shopTableSort.value[key] = {}
	}
	shopTableSort.value[key] = { field, direction }
	saveShopTableSort()
}

function handleTableSort(serverId, tableType, sortData) {
	setShopTableSort(serverId, tableType, sortData.field, sortData.direction)
}
const shopCreateError = ref(null)
const shopEditError = ref(null)
const shopNameValidationError = ref(null)
const shopServerValidationError = ref(null)
const shopPlayerValidationError = ref(null)

const presetServerId = ref(null)
const presetShopType = ref(null)
const usePlayerAsShopName = ref(false)

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
watch(
	() => shopForm.value.player,
	(newPlayer) => {
		if (usePlayerAsShopName.value && newPlayer) {
			shopForm.value.name = newPlayer
		}
	}
)

// Watch checkbox to sync shop name field
watch(usePlayerAsShopName, (checked) => {
	if (checked && shopForm.value.player) {
		shopForm.value.name = shopForm.value.player
	} else if (!checked) {
		shopForm.value.name = ''
	}
})

// Clear validation errors when form fields change
watch(
	() => shopForm.value.name,
	() => {
		shopNameValidationError.value = null
		shopCreateError.value = null
		shopEditError.value = null
	}
)
watch(
	() => shopForm.value.player,
	() => {
		shopPlayerValidationError.value = null
		shopCreateError.value = null
		shopEditError.value = null
	}
)
watch(
	() => shopForm.value.server_id,
	() => {
		shopServerValidationError.value = null
		shopCreateError.value = null
		shopEditError.value = null
	}
)

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

onMounted(() => {
	loadShopsVisibility()
	loadShopTableSort()
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
			? shop.player ||
			  userProfile.value?.minecraft_username ||
			  userProfile.value?.display_name ||
			  user.value?.email?.split('@')[0] ||
			  'Unknown'
			: shop.player || shop.name || 'Unknown'

		const targetGroup = shop.is_own_shop
			? grouped[shop.server_id].own
			: grouped[shop.server_id].player

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
			shopData.player =
				userProfile.value?.minecraft_username ||
				userProfile.value?.display_name ||
				user.value?.email?.split('@')[0] ||
				''
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

function getShopOwnerName(shop) {
	if (shop.is_own_shop) {
		return (
			shop.player ||
			userProfile.value?.minecraft_username ||
			userProfile.value?.display_name ||
			user.value?.email?.split('@')[0] ||
			'Unknown'
		)
	}
	return shop.player || shop.name || 'Unknown'
}

function getShopOwnerAvatar(shop) {
	if (shop.is_own_shop && userProfile.value?.minecraft_avatar_url) {
		return userProfile.value.minecraft_avatar_url
	}
	return generateMinecraftAvatar(getShopOwnerName(shop))
}

const serverDeleteShopCount = computed(() => {
	if (!serverToDelete.value) return 0
	return shopsByServer.value[serverToDelete.value.id]?.all.length || 0
})

const serverDeleteHasShops = computed(() => serverDeleteShopCount.value > 0)

const shopTableColumns = [
	{ key: 'owner', label: 'Owner', sortable: true },
	{ key: 'shopName', label: 'Shop Name', sortable: true },
	{ key: 'location', label: 'Location', sortable: true },
	{ key: 'actions', label: '', align: 'right', headerAlign: 'right', width: 'w-24' }
]

function getShopTableRows(serverId) {
	if (!shopsByServer.value[serverId]?.own.length) return []
	return shopsByServer.value[serverId].own.map((shop) => ({
		id: shop.id,
		shop: shop,
		owner: getShopOwnerName(shop),
		ownerAvatar: getShopOwnerAvatar(shop),
		shopName: shop.name,
		location: shop.location || null
	}))
}

function getPlayerShopTableRows(serverId) {
	if (!shopsByServer.value[serverId]?.player.length) return []
	return shopsByServer.value[serverId].player.map((shop) => ({
		id: shop.id,
		shop: shop,
		owner: getShopOwnerName(shop),
		ownerAvatar: getShopOwnerAvatar(shop),
		shopName: shop.name,
		location: shop.location || null
	}))
}

function toggleShopsVisibility(serverId) {
	shopsHidden.value[serverId] = !shopsHidden.value[serverId]
	saveShopsVisibility()
}
</script>

<template>
	<!-- Feature Page (shown when user doesn't have access) -->
	<div v-if="!hasAccess" class="p-4 py-8">
		<!-- Main Feature Section -->
		<div class="mb-16 lg:ml-[70px]">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center">
				<!-- Left Column: Text and CTA -->
				<div>
					<h1 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
						Player Shop Manager is here
					</h1>
					<p class="text-lg text-gray-600 mb-8 leading-relaxed">
						Keep track of your own shops and other player shops across one or more Minecraft
						servers. The Player Shop Manager helps you record prices, check competitors,
						and spot outdated listings without relying on spreadsheets or memory.
					</p>
					<p class="text-lg text-gray-600 mb-8 leading-relaxed">
						Set up servers by Minecraft version, add shops, track buy and sell prices, and
						use the Market Overview to compare items across all shops in one place.
					</p>
					<div class="flex flex-col sm:flex-row gap-4">
						<BaseButton
							v-if="!user?.email"
							@click="handleShopManagerClick"
							variant="primary">
							<template #left-icon>
								<BuildingStorefrontIcon />
							</template>
							Try the Shop Manager
						</BaseButton>
						<BaseButton
							v-else-if="!user?.emailVerified"
							@click="handleShopManagerClick"
							variant="primary"
							class="text-base px-6 py-3">
							<template #left-icon>
								<CheckCircleIcon />
							</template>
							Try the Shop Manager
						</BaseButton>
						<BaseButton
							v-else
							@click="goToSignIn"
							variant="primary"
							class="text-base px-6 py-3">
							Request Access
						</BaseButton>
					</div>
				</div>

				<!-- Right Column: Feature Images Grid -->
				<div class="grid grid-cols-2 gap-3 max-w-md">
					<div class="space-y-3">
						<div class="bg-gray-100 rounded-lg aspect-square overflow-hidden border-2 border-amulet">
							<img
								src="/images/promo/shop-manager-1.png"
								alt="Shop Manager feature"
								class="w-full h-full object-cover" />
						</div>
						<div class="bg-gray-100 rounded-lg aspect-square overflow-hidden border-2 border-amulet">
							<img
								src="/images/promo/shop-manager-4.png"
								alt="Shop Manager feature"
								class="w-full h-full object-cover" />
						</div>
					</div>
					<div class="space-y-3 pt-6">
						<div class="bg-gray-100 rounded-lg aspect-square overflow-hidden border-2 border-amulet">
							<img
								src="/images/promo/shop-manager-2.png"
								alt="Shop Manager feature"
								class="w-full h-full object-cover" />
						</div>
						<div class="bg-gray-100 rounded-lg aspect-square overflow-hidden border-2 border-amulet">
							<img
								src="/images/promo/shop-manager-3.png"
								alt="Shop Manager feature"
								class="w-full h-full object-cover" />
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Features Grid -->
		<div class="mb-16">
			<h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">
				Tools to help you manage and compare shops
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<BaseCard variant="tertiary">
					<template #header>
						<div class="flex items-center gap-3">
							<GlobeAltIcon class="w-6 h-6 text-gray-asparagus" />
							<span class="font-semibold">Servers & Shops</span>
						</div>
					</template>
					<template #body>
						<p class="text-gray-600">
							Keep separate shop setups for different Minecraft servers in one place.
							Track your own shops and other player shops without relying on spreadsheets
							or scattered notes.
						</p>
					</template>
				</BaseCard>

				<BaseCard variant="tertiary">
					<template #header>
						<div class="flex items-center gap-3">
							<ChartBarIcon class="w-6 h-6 text-gray-asparagus" />
							<span class="font-semibold">Price Checking</span>
						</div>
					</template>
					<template #body>
						<p class="text-gray-600">
							Compare item prices across all shops on a server. Quickly see how prices
							differ between shops while checking or updating listings.
						</p>
					</template>
				</BaseCard>

				<BaseCard variant="tertiary">
					<template #header>
						<div class="flex items-center gap-3">
							<MagnifyingGlassIcon class="w-6 h-6 text-gray-asparagus" />
							<span class="font-semibold">Server Market Overview</span>
						</div>
					</template>
					<template #body>
						<p class="text-gray-600">
							Browse all items across all shops on a server in one combined view. Use
							search and categories to compare prices without opening each shop
							individually.
						</p>
					</template>
				</BaseCard>

				<BaseCard variant="tertiary">
					<template #header>
						<div class="flex items-center gap-3">
							<ClipboardDocumentCheckIcon class="w-6 h-6 text-gray-asparagus" />
							<span class="font-semibold">Availability Tracking</span>
						</div>
					</template>
					<template #body>
						<p class="text-gray-600">
							Mark items as out of stock and keep track of shop availability while price
							checking. Useful for noting when listings are temporarily unavailable.
						</p>
					</template>
				</BaseCard>

				<BaseCard variant="tertiary">
					<template #header>
						<div class="flex items-center gap-3">
							<CurrencyDollarIcon class="w-6 h-6 text-gray-asparagus" />
							<span class="font-semibold">Inline Price Editing</span>
						</div>
					</template>
					<template #body>
						<p class="text-gray-600">
							Update buy and sell prices directly in the item table using inline editing,
							making quick price checks and adjustments easier.
						</p>
					</template>
				</BaseCard>

				<BaseCard variant="tertiary">
					<template #header>
						<div class="flex items-center gap-3">
							<CubeIcon class="w-6 h-6 text-gray-asparagus" />
							<span class="font-semibold">Minecraft Version Support</span>
						</div>
					</template>
					<template #body>
						<p class="text-gray-600">
							Servers are tagged with a Minecraft version so item lists only show items
							that exist in that version when adding new shop entries.
						</p>
					</template>
				</BaseCard>
			</div>
		</div>

		<!-- Info Alert -->
		<div class="mb-16">
			<NotificationBanner
				type="info"
				title="Designed for manual price tracking and regular shop upkeep."
				message="The Shop Manager does not connect to your Minecraft server or modify in-game shops." />
		</div>
	</div>

	<!-- Actual Shop Manager (shown when user has access) -->
	<div v-else class="p-4 pt-8">
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
			<div v-if="error" class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
				{{ error }}
			</div>
			<TransitionGroup
				v-if="servers?.length"
				name="fade"
				tag="div"
				class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<BaseCard
					v-for="server in servers"
					:key="server.id"
					variant="tertiary"
					class="h-full md:col-span-3 lg:col-span-2">
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
							<p v-if="server.description" class="text-sm text-gray-600">
								{{ server.description }}
							</p>
							<div class="flex gap-2 flex-wrap">
								<RouterLink
									v-if="shopsByServer[server.id]?.all.length"
									:to="`/market-overview?serverId=${server.id}`">
									<BaseButton variant="secondary">
										<template #left-icon>
											<CurrencyDollarIcon class="w-4 h-4" />
										</template>
										Market Overview
									</BaseButton>
								</RouterLink>
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
							<button
								v-if="shopsByServer[server.id]?.all.length"
								type="button"
								@click="toggleShopsVisibility(server.id)"
								class="mt-2 text-sm text-gray-asparagus hover:text-highland underline text-left">
								{{ shopsHidden[server.id] ? 'Show all shops' : 'Hide all shops' }}
							</button>
							<div v-if="!shopsHidden[server.id]" class="space-y-4">
								<div>
									<BaseTable
										v-if="shopsByServer[server.id]?.own.length"
										:columns="shopTableColumns"
										:rows="getShopTableRows(server.id)"
										row-key="id"
										hoverable
										layout="condensed"
										caption="My Shops"
										:initial-sort-field="
											getShopTableSort(server.id, 'myShops').field
										"
										:initial-sort-direction="
											getShopTableSort(server.id, 'myShops').direction
										"
										@sort="
											(sortData) =>
												handleTableSort(server.id, 'myShops', sortData)
										">
										<template #cell-owner="{ row }">
											<div class="flex items-center gap-2">
												<img
													:src="row.ownerAvatar"
													:alt="row.owner"
													class="w-5 h-5 rounded flex-shrink-0"
													@error="$event.target.style.display = 'none'" />
												<RouterLink
													:to="{
														name: 'shop',
														params: { shopId: row.shop.id }
													}"
													class="font-medium text-gray-900 hover:text-heavy-metal transition">
													{{ row.owner }}
												</RouterLink>
											</div>
										</template>
										<template #cell-shopName="{ row }">
											<div class="flex items-center gap-2">
												<BuildingStorefrontIcon
													class="w-4 h-4 text-gray-900 flex-shrink-0" />
												<RouterLink
													:to="{
														name: 'shop',
														params: { shopId: row.shop.id }
													}"
													class="text-gray-900 hover:text-heavy-metal transition">
													{{ row.shopName }}
												</RouterLink>
												<ClipboardDocumentCheckIcon
													v-if="row.shop.fully_cataloged"
													class="w-4 h-4 text-gray-900 flex-shrink-0"
													title="Fully cataloged" />
											</div>
										</template>
										<template #cell-location="{ row }">
											<div
												v-if="row.location"
												class="flex items-center gap-1 text-gray-900">
												<MapPinIcon
													class="w-4 h-4 flex-shrink-0 text-gray-900" />
												<span>{{ row.location }}</span>
											</div>
											<span v-else class="text-gray-900 italic">—</span>
										</template>
										<template #cell-actions="{ row }">
											<div class="flex items-center justify-end gap-2">
												<BaseIconButton
													variant="primary"
													:disabled="shopLoading"
													aria-label="Edit shop"
													@click="showEditShopForm(row.shop)">
													<PencilIcon />
												</BaseIconButton>
												<BaseIconButton
													variant="primary"
													:disabled="shopLoading"
													aria-label="Delete shop"
													@click="requestDeleteShop(row.shop)">
													<TrashIcon />
												</BaseIconButton>
											</div>
										</template>
										<template #empty>No personal shops yet.</template>
									</BaseTable>
									<p v-else class="text-sm italic text-gray-500 mt-2">
										No personal shops yet.
									</p>
								</div>
								<div>
									<BaseTable
										v-if="shopsByServer[server.id]?.player.length"
										:columns="shopTableColumns"
										:rows="getPlayerShopTableRows(server.id)"
										row-key="id"
										hoverable
										layout="condensed"
										caption="Player Shops"
										:initial-sort-field="
											getShopTableSort(server.id, 'playerShops').field
										"
										:initial-sort-direction="
											getShopTableSort(server.id, 'playerShops').direction
										"
										@sort="
											(sortData) =>
												handleTableSort(server.id, 'playerShops', sortData)
										">
										<template #cell-owner="{ row }">
											<div class="flex items-center gap-2">
												<img
													:src="row.ownerAvatar"
													:alt="row.owner"
													class="w-5 h-5 rounded flex-shrink-0"
													@error="$event.target.style.display = 'none'" />
												<RouterLink
													:to="{
														name: 'shop',
														params: { shopId: row.shop.id }
													}"
													class="font-medium text-gray-900 hover:text-heavy-metal transition">
													{{ row.owner }}
												</RouterLink>
											</div>
										</template>
										<template #cell-shopName="{ row }">
											<div class="flex items-center gap-2">
												<BuildingStorefrontIcon
													class="w-4 h-4 text-gray-900 flex-shrink-0" />
												<RouterLink
													:to="{
														name: 'shop',
														params: { shopId: row.shop.id }
													}"
													class="text-gray-900 hover:text-heavy-metal transition">
													{{ row.shopName }}
												</RouterLink>
												<ClipboardDocumentCheckIcon
													v-if="row.shop.fully_cataloged"
													class="w-4 h-4 text-gray-900 flex-shrink-0"
													title="Fully cataloged" />
												<WalletIcon
													v-if="row.shop.owner_funds === 0"
													class="w-4 h-4 text-gray-900 flex-shrink-0"
													title="Shop owner has run out of money" />
											</div>
										</template>
										<template #cell-location="{ row }">
											<div
												v-if="row.location"
												class="flex items-center gap-1 text-gray-900">
												<MapPinIcon
													class="w-4 h-4 flex-shrink-0 text-gray-900" />
												<span>{{ row.location }}</span>
											</div>
											<span v-else class="text-gray-900 italic">—</span>
										</template>
										<template #cell-actions="{ row }">
											<div class="flex items-center justify-end gap-2">
												<BaseIconButton
													variant="primary"
													:disabled="shopLoading"
													aria-label="Edit shop"
													@click="showEditShopForm(row.shop)">
													<PencilIcon />
												</BaseIconButton>
												<BaseIconButton
													variant="primary"
													:disabled="shopLoading"
													aria-label="Delete shop"
													@click="requestDeleteShop(row.shop)">
													<TrashIcon />
												</BaseIconButton>
											</div>
										</template>
										<template #empty>No player shops tracked.</template>
									</BaseTable>
									<p v-else class="text-sm italic text-gray-500 mt-2">
										No player shops tracked.
									</p>
								</div>
							</div>
						</div>
					</template>
				</BaseCard>
			</TransitionGroup>

			<div v-else>
				<p class="text-lg font-medium mb-2">No servers yet.</p>
				<p class="text-sm text-gray-600">
					Click "Add Server" to get started. You can then add shops to the server.
				</p>
			</div>
		</div>

		<ShopFormModal
			:isOpen="showShopForm"
			:editingShop="editingShop"
			v-model:shopForm="shopForm"
			v-model:usePlayerAsShopName="usePlayerAsShopName"
			:loading="shopLoading"
			:errors="{
				name: shopNameValidationError,
				player: shopPlayerValidationError,
				server: shopServerValidationError,
				create: shopCreateError,
				edit: shopEditError
			}"
			:presetServerId="presetServerId"
			:servers="servers"
			:userProfile="userProfile"
			@submit="handleShopSubmit"
			@close="closeShopModals" />

		<BaseModal
			:isOpen="showShopDeleteModal"
			title="Delete Shop"
			size="small"
			@close="closeShopModals">
			<div class="space-y-4">
				<div>
					<h3 class="font-normal text-gray-900">
						Are you sure you want to delete
						<span class="font-semibold">{{ shopToDelete?.name }}</span>
						?
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
						Are you sure you want to delete
						<span class="font-semibold">{{ serverToDelete?.name }}</span>
						?
					</h3>
					<p v-if="serverDeleteHasShops" class="text-sm text-gray-600 mt-2 font-medium">
						This server has {{ serverDeleteShopCount }}
						{{ serverDeleteShopCount === 1 ? 'shop' : 'shops' }}. Deleting the server
						will also permanently delete those shops.
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

	<!-- Shop Manager Modal -->
	<BaseModal
		:isOpen="showShopManagerModal"
		title="Try the Shop Manager"
		@close="closeShopManagerModal">
		<!-- Sign-up content for unauthenticated users -->
		<div v-if="!user?.email" class="text-left pt-2 pb-4 sm:py-4">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Almost there!</h1>
				<p class="mb-6">You'll need an account to use the Shop Manager tool.</p>
				<p class="text-sm text-gray-900 mb-2">With an account, you can:</p>
				<ul class="text-sm text-gray-900 space-y-1 list-disc list-inside">
					<li>track your own shops and other player shops across multiple servers</li>
					<li>set up servers by Minecraft version and organize shops by server</li>
					<li>record buy and sell prices for items in each shop</li>
					<li>use the Market Overview to compare prices across all shops</li>
					<li>mark items as out of stock and track shop availability</li>
				</ul>
			</div>

			<!-- Action buttons -->
			<div>
				<BaseButton @click="goToSignUp" variant="primary">
					<template #left-icon>
						<UserIcon />
					</template>
					Create Account
				</BaseButton>
				<div class="text-left pt-4">
					<p class="text-sm text-gray-500">
						Already have an account?
						<button @click="goToSignIn" class="text-gray-700 hover:text-opacity-80">
							<span class="underline">Sign in</span>
						</button>
					</p>
				</div>
			</div>
		</div>

		<!-- Email verification content for signed-in but unverified users -->
		<div v-else-if="isSignedInButNotVerified" class="text-left pt-2 pb-4 sm:py-4">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">So close!</h1>
				<p class="mb-6">Please verify your email address to use the Shop Manager tool.</p>
				<p class="text-sm text-gray-900 mb-2">Once verified, you can:</p>
				<ul class="text-sm text-gray-900 space-y-1 list-disc list-inside">
					<li>track your own shops and other player shops across multiple servers</li>
					<li>set up servers by Minecraft version and organize shops by server</li>
					<li>record buy and sell prices for items in each shop</li>
					<li>use the Market Overview to compare prices across all shops</li>
					<li>mark items as out of stock and track shop availability</li>
				</ul>
			</div>

			<!-- Action buttons -->
			<div>
				<BaseButton @click="goToVerifyEmail" variant="primary">
					<template #left-icon>
						<CheckCircleIcon />
					</template>
					Resend verification email
				</BaseButton>
				<div class="text-left pt-4">
					<p class="text-sm text-gray-500">
						Need to sign in with a different account?
						<button @click="goToSignIn" class="text-gray-700 hover:text-opacity-80">
							<span class="underline">Sign in</span>
						</button>
					</p>
				</div>
			</div>
		</div>
	</BaseModal>
</template>

<style scoped>
.radio-input {
	@apply w-5 h-5;
	accent-color: theme('colors.gray-asparagus');
}

.fade-enter-active,
.fade-leave-active {
	transition:
		opacity 0.2s ease,
		transform 0.2s ease;
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
