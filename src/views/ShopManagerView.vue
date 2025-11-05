<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'
import { useShops } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'

const { user, userProfile } = useAdmin()

// Get user's shops and servers
const { shops } = useShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))

// Find the user's own shop (marked with is_own_shop flag)
const ownShop = computed(() => {
	if (!shops.value) return null
	return shops.value.find((shop) => shop.is_own_shop === true)
})

// Get the server info for the own shop
const ownShopServer = computed(() => {
	if (!ownShop.value || !servers.value) return null
	return servers.value.find((server) => server.id === ownShop.value.server_id)
})
</script>

<template>
	<div class="p-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div>
					<!-- Dashboard Header -->
					<div>
						<h1 class="text-3xl font-bold text-gray-900 mb-2">Shop Manager</h1>
						<p class="text-gray-600">
							Manage your player shops and track pricing data.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Your Shops Section -->
		<div v-if="ownShop" class="mb-8">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Your Shops
			</h2>
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div
					class="bg-sea-mist rounded-lg shadow-md border-2 border-amulet h-full overflow-hidden flex flex-col">
				<!-- Card Header -->
				<div
					class="bg-amulet py-2 px-3 pl-4 border-x-2 border-t-2 border-white rounded-t-lg">
					<div class="flex items-center justify-between">
						<h3
							class="text-xl font-semibold text-heavy-metal hover:text-gray-asparagus cursor-pointer flex-1">
							{{ ownShop.name }}
						</h3>
						<!-- Action Buttons -->
						<div class="flex gap-2 ml-3">
							<RouterLink
								:to="`/shop-items?shop=${ownShop.id}`"
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
										d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
								</svg>
							</RouterLink>
						</div>
					</div>
				</div>
				<!-- Card Body -->
				<div
					class="bg-norway p-4 border-x-2 border-b-2 border-white rounded-b-lg flex-1 flex flex-col">
					<div class="flex-1">
						<p class="text-heavy-metal mb-3">
							{{ ownShop.description || 'Your main economy shop for managing item prices and inventory.' }}
						</p>
						<div class="text-sm text-heavy-metal">
							<span class="font-medium">Server:</span>
							{{ ownShopServer?.name || 'Unknown Server' }}
							<span class="mx-2"></span>
							<span class="font-medium">Version:</span>
							{{ ownShopServer?.minecraft_version || 'Unknown' }}
							<span v-if="ownShop.location" class="mx-2"></span>
							<span v-if="ownShop.location" class="font-medium">Location:</span>
							<span v-if="ownShop.location">📍 {{ ownShop.location }}</span>
						</div>
					</div>
					<div class="mt-4 flex-shrink-0">
						<RouterLink
							:to="`/shop-items?shop=${ownShop.id}`"
							class="inline-flex items-center px-4 py-2 bg-gray-asparagus text-white font-medium rounded hover:bg-opacity-80 transition-colors">
							<svg
								class="w-4 h-4 mr-2"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
							</svg>
							Manage Items
						</RouterLink>
					</div>
				</div>
			</div>
		</div>
		</div>

		<!-- Other Section -->
		<div class="mb-8">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Other Section
			</h2>
		</div>

		<!-- Navigation Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- My Servers -->
			<RouterLink
				to="/servers"
				class="bg-norway rounded-lg shadow-md border-2 border-gray-asparagus overflow-hidden hover:shadow-lg transition-shadow">
				<h3
					class="text-xl font-semibold text-white bg-gray-asparagus px-4 py-2 w-full border-x-2 border-t-2 border-white rounded-t-lg">
					My Servers
				</h3>
				<div class="p-4 border-2 border-white rounded-b-lg">
					<p class="text-heavy-metal mb-4">
						Configure and manage your Minecraft servers with custom pricing settings and
						economy multipliers.
					</p>
					<button class="bg-gray-asparagus text-white px-4 py-2 rounded hover:bg-opacity-80 transition-colors">
						Manage Servers
					</button>
				</div>
			</RouterLink>

			<!-- My Shops -->
			<RouterLink
				to="/shops"
				class="bg-norway rounded-lg shadow-md border-2 border-gray-asparagus overflow-hidden hover:shadow-lg transition-shadow">
				<h3
					class="text-xl font-semibold text-white bg-gray-asparagus px-4 py-2 w-full border-x-2 border-t-2 border-white rounded-t-lg">
					My Shops
				</h3>
				<div class="p-4 border-2 border-white rounded-b-lg">
					<p class="text-heavy-metal mb-4">
						Set up and manage your economy shops with detailed item pricing, inventory
						tracking, and location information.
					</p>
					<button class="bg-gray-asparagus text-white px-4 py-2 rounded hover:bg-opacity-80 transition-colors">
						Manage Shops
					</button>
				</div>
			</RouterLink>

			<!-- Shop Items -->
			<RouterLink
				to="/shop-items"
				class="bg-norway rounded-lg shadow-md border-2 border-gray-asparagus overflow-hidden hover:shadow-lg transition-shadow">
				<h3
					class="text-xl font-semibold text-white bg-gray-asparagus px-4 py-2 w-full border-x-2 border-t-2 border-white rounded-t-lg">
					Shop Items
				</h3>
				<div class="p-4 border-2 border-white rounded-b-lg">
					<p class="text-heavy-metal mb-4">
						Add, edit, and manage the items sold in your shops with real-time pricing
						updates and inventory management.
					</p>
					<button class="bg-gray-asparagus text-white px-4 py-2 rounded hover:bg-opacity-80 transition-colors">
						Manage Items
					</button>
				</div>
			</RouterLink>

			<!-- Market Overview -->
			<RouterLink
				to="/market-overview"
				class="bg-norway rounded-lg shadow-md border-2 border-gray-asparagus overflow-hidden hover:shadow-lg transition-shadow">
				<h3
					class="text-xl font-semibold text-white bg-gray-asparagus px-4 py-2 w-full border-x-2 border-t-2 border-white rounded-t-lg">
					Market Overview
				</h3>
				<div class="p-4 border-2 border-white rounded-b-lg">
					<p class="text-heavy-metal mb-4">
						View comprehensive market analysis with price comparisons, trading
						opportunities, and competitor insights across all your servers.
					</p>
					<button class="bg-gray-asparagus text-white px-4 py-2 rounded hover:bg-opacity-80 transition-colors">
						View Market
					</button>
				</div>
			</RouterLink>
		</div>
	</div>
</template>
