<script setup>
import { ref, computed, watch } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useRouter } from 'vue-router'
import { useShops, createShop, updateShop, deleteShop } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import {
	ArrowLeftIcon,
	PlusIcon,
	PencilSquareIcon,
	TrashIcon,
	MapPinIcon,
	BanknotesIcon,
	CalendarDaysIcon,
	Squares2X2Icon,
	ShoppingBagIcon
} from '@heroicons/vue/20/solid'

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
	is_own_shop: false,
	owner_funds: null
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
			router.push('/signin')
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
		is_own_shop: shop.is_own_shop,
		owner_funds: shop.owner_funds || null
	}
}

function resetForm() {
	shopForm.value = {
		name: '',
		server_id: '',
		location: '',
		description: '',
		is_own_shop: false,
		owner_funds: null
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

const showDeleteModal = ref(false)
const shopPendingDelete = ref(null)

function requestDeleteShop(shop) {
	shopPendingDelete.value = shop
	showDeleteModal.value = true
}

async function confirmDeleteShop() {
	if (!shopPendingDelete.value) return

	loading.value = true
	error.value = null

	try {
		await deleteShop(shopPendingDelete.value.id)
		showDeleteModal.value = false
		shopPendingDelete.value = null
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

// Handle owner funds input
function handleFundsInput(event) {
	const value = event.target.value
	if (value === '' || value === null) {
		shopForm.value.owner_funds = null
	} else {
		const numValue = parseFloat(value)
		shopForm.value.owner_funds = isNaN(numValue) ? null : numValue
	}
}
</script>

<template>
	<div class="p-4 pt-8 space-y-8">
		<!-- Back Button -->
		<div>
			<BaseButton variant="tertiary" @click="router.push('/shop-manager')">
				<template #left-icon>
					<ArrowLeftIcon />
				</template>
				Back to Shop Manager
			</BaseButton>
		</div>

		<div>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Shops</h1>
			<p class="text-gray-600">
				Manage your shops and competitor shops for price tracking and comparison.
			</p>
		</div>

		<!-- Create button -->
		<div class="flex justify-start">
			<BaseButton
				type="button"
				variant="primary"
				:disabled="!hasServers"
				@click="showCreateShopForm()">
				<template #left-icon>
					<PlusIcon />
				</template>
				Add Shop
			</BaseButton>
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

		<!-- Create/Edit shop modal -->
		<BaseModal
			:isOpen="showCreateForm"
			:title="editingShop ? 'Edit Shop' : 'Add New Shop'"
			maxWidth="max-w-2xl"
			@close="cancelForm">
			<form @submit.prevent="handleSubmit" class="space-y-4">
				<!-- Shop name -->
				<div>
					<label for="shop-name" class="block text-sm font-medium text-gray-700">
						Shop Name *
					</label>
					<input
						id="shop-name"
						v-model="shopForm.name"
						type="text"
						required
						placeholder="e.g., verzion's shop"
						class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus" />
				</div>

				<!-- Server selection -->
				<div>
					<label for="server-id" class="block text-sm font-medium text-gray-700">
						Server *
					</label>
					<select
						id="server-id"
						v-model="shopForm.server_id"
						required
						class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus">
						<option value="">Select a server</option>
						<option v-for="server in servers" :key="server.id" :value="server.id">
							{{ server.name }}
						</option>
					</select>
				</div>

				<!-- Location -->
				<div>
					<label for="location" class="block text-sm font-medium text-gray-700">
						Location
					</label>
					<input
						id="location"
						v-model="shopForm.location"
						type="text"
						placeholder="e.g., /warp shops, coordinates, etc."
						class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus" />
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700">
						Description
					</label>
					<textarea
						id="description"
						v-model="shopForm.description"
						rows="3"
						placeholder="Optional description for this shop..."
						class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus"></textarea>
				</div>

				<!-- Owner Funds -->
				<div>
					<label for="owner-funds" class="block text-sm font-medium text-gray-700">
						Owner Funds
					</label>
					<input
						id="owner-funds"
						:value="shopForm.owner_funds"
						@input="handleFundsInput"
						type="number"
						step="0.01"
						min="0"
						placeholder="0.00"
						class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus" />
					<p class="text-xs text-gray-500 mt-2">
						Available money for buying items from players (affects sell prices)
					</p>
				</div>

				<!-- Shop type -->
				<div>
					<label class="block text-sm font-medium text-gray-700">Shop Type</label>
					<div class="mt-3 flex flex-wrap gap-6">
						<label class="flex items-center gap-2 text-sm text-gray-700">
							<input
								id="competitor-shop"
								v-model="shopForm.is_own_shop"
								:value="false"
								type="radio"
								class="radio-input" />
							<span>Competitor</span>
						</label>
						<label class="flex items-center gap-2 text-sm text-gray-700">
							<input
								id="my-shop"
								v-model="shopForm.is_own_shop"
								:value="true"
								type="radio"
								class="radio-input" />
							<span>My Shop</span>
						</label>
					</div>
				</div>

				<!-- Form actions -->
				<div class="flex justify-end gap-3 pt-2">
					<BaseButton type="button" variant="tertiary" @click="cancelForm">
						Cancel
					</BaseButton>
					<BaseButton
						type="submit"
						:disabled="!isFormValid || loading"
						variant="primary">
						<template #left-icon>
							<component :is="editingShop ? PencilSquareIcon : PlusIcon" />
						</template>
						{{ editingShop ? 'Update Shop' : 'Create Shop' }}
					</BaseButton>
				</div>
			</form>
		</BaseModal>

		<!-- Shops list grouped by server -->
		<div
			v-if="hasServers"
			class="space-y-8">
			<div
				v-for="(serverGroup, serverId) in shopsByServer"
				:key="serverId"
				class="space-y-4">
				<h2
					class="flex items-center gap-2 text-2xl font-semibold text-gray-700 border-b-2 border-gray-asparagus pb-2">
					{{ serverGroup.server.name }}
					<span class="text-sm font-normal text-heavy-metal flex items-center gap-1">
						<Squares2X2Icon class="w-4 h-4" />
						{{ serverGroup.shops.length }} shop{{
							serverGroup.shops.length !== 1 ? 's' : ''
						}}
					</span>
				</h2>

				<div
					v-if="serverGroup.shops.length"
					class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
					<div
						v-for="shop in serverGroup.shops"
						:key="shop.id"
						v-show="!editingShop || editingShop.id !== shop.id"
						class="bg-sea-mist rounded-lg shadow-md border-2 border-amulet overflow-hidden flex flex-col">
						<!-- Card Header -->
						<div class="bg-amulet px-4 py-3 border-x-2 border-t-2 border-white">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-xl font-semibold text-heavy-metal">
										{{ shop.name }}
									</h3>
									<span
										v-if="shop.is_own_shop"
										class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
										My Shop
									</span>
									<span
										v-else
										class="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-heavy-metal">
										Competitor
									</span>
								</div>
								<div class="flex gap-2">
									<button
										type="button"
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
										@click="showEditShopForm(shop)">
										<PencilSquareIcon class="w-4 h-4" />
										<span class="sr-only">Edit</span>
									</button>
									<button
										type="button"
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
										@click="requestDeleteShop(shop)">
										<TrashIcon class="w-4 h-4" />
										<span class="sr-only">Delete</span>
									</button>
								</div>
							</div>
						</div>

						<!-- Card Body -->
						<div class="bg-norway p-4 border-x-2 border-b-2 border-white flex-1 flex flex-col gap-4">
							<p v-if="shop.description" class="text-sm text-heavy-metal">
								{{ shop.description }}
							</p>

							<div class="space-y-2 text-sm text-heavy-metal">
								<div
									v-if="shop.location"
									class="flex items-center gap-2">
									<MapPinIcon class="w-4 h-4" />
									<span>{{ shop.location }}</span>
								</div>
								<div
									v-if="shop.owner_funds !== null && shop.owner_funds !== undefined"
									class="flex items-center gap-2">
									<BanknotesIcon class="w-4 h-4" />
									<span>Available funds: {{ shop.owner_funds.toFixed(2) }}</span>
								</div>
								<div class="flex items-center gap-2 text-xs text-gray-500">
									<CalendarDaysIcon class="w-4 h-4" />
									<span>{{ new Date(shop.created_at).toLocaleDateString() }}</span>
								</div>
							</div>

							<div class="mt-auto flex justify-end">
								<RouterLink
									:to="{ name: 'shop', params: { shopId: shop.id } }"
									class="inline-flex items-center gap-2 rounded-md bg-gray-asparagus px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-highland">
									<ShoppingBagIcon class="w-4 h-4" />
									Manage Items
								</RouterLink>
							</div>
						</div>
					</div>
				</div>

				<div
					v-else
					class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-asparagus/40 bg-norway/70 px-4 py-6 text-center text-heavy-metal">
					<ShoppingBagIcon class="w-8 h-8 text-gray-asparagus" />
					<p class="text-sm">No shops for this server yet.</p>
				</div>
			</div>
		</div>
	</div>

	<BaseModal
		:isOpen="showDeleteModal"
		title="Delete Shop"
		size="small"
		@close="showDeleteModal = false; shopPendingDelete = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to delete
					<span class="font-semibold">{{ shopPendingDelete?.name }}</span>?
				</h3>
				<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<button
						type="button"
						class="btn-secondary--outline"
						@click="showDeleteModal = false; shopPendingDelete = null">
						Cancel
					</button>
					<BaseButton
						type="button"
						variant="primary"
						class="bg-semantic-danger hover:bg-opacity-90"
						:disabled="loading"
						@click="confirmDeleteShop">
						{{ loading ? 'Deleting...' : 'Delete' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>

<style scoped>
.radio-input {
	@apply w-5 h-5;
	accent-color: theme('colors.gray-asparagus');
}
</style>
