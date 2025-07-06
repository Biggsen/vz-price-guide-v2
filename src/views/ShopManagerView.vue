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
	<div class="container mx-auto px-4 py-8">
		<div class="max-w-6xl mx-auto">
			<div class="mb-8">
				<div class="flex items-center mb-4">
					<div
						class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
						<svg
							class="w-6 h-6 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
						</svg>
					</div>
					<div>
						<h1 class="text-3xl font-bold text-gray-900">Shop Manager</h1>
						<p class="text-gray-600">
							Manage your Minecraft economy servers and track pricing data.
						</p>
					</div>
				</div>
			</div>

			<!-- Quick Shop Link for Own Shop -->
			<div v-if="ownShop" class="mb-8">
				<div
					class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<div class="flex items-center mb-3">
								<div
									class="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-4">
									<svg
										class="w-6 h-6 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
								</div>
								<div>
									<h3 class="text-xl font-bold">Quick Shop Access</h3>
									<p class="text-blue-100 text-sm">
										Manage your shop items instantly
									</p>
								</div>
							</div>
							<div class="text-white text-opacity-90">
								<div class="flex items-center mb-2">
									<svg
										class="w-4 h-4 mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
									</svg>
									<span class="font-semibold">{{ ownShop.name }}</span>
								</div>
								<div class="flex items-center mb-2">
									<svg
										class="w-4 h-4 mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
									</svg>
									<span>{{ ownShopServer?.name || 'Server' }}</span>
								</div>
								<div v-if="ownShop.location" class="flex items-center">
									<svg
										class="w-4 h-4 mr-2"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									<span>{{ ownShop.location }}</span>
								</div>
							</div>
						</div>
						<div class="ml-6">
							<RouterLink
								:to="`/shop-items?shop=${ownShop.id}`"
								class="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-md">
								<svg
									class="w-5 h-5 mr-2"
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

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- My Servers -->
				<RouterLink
					to="/servers"
					class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300">
					<div class="flex items-center mb-4">
						<div
							class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
							<svg
								class="w-6 h-6 text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
							</svg>
						</div>
						<h3 class="text-lg font-semibold text-gray-900 ml-3">My Servers</h3>
					</div>
					<p class="text-gray-600 text-sm">
						Configure and manage your Minecraft servers with custom pricing settings and
						economy multipliers.
					</p>
				</RouterLink>

				<!-- My Shops -->
				<RouterLink
					to="/shops"
					class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300">
					<div class="flex items-center mb-4">
						<div
							class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
							<svg
								class="w-6 h-6 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
							</svg>
						</div>
						<h3 class="text-lg font-semibold text-gray-900 ml-3">My Shops</h3>
					</div>
					<p class="text-gray-600 text-sm">
						Manage your own shops and track competitor shops for price comparison and
						market analysis.
					</p>
				</RouterLink>

				<!-- Shop Items Management -->
				<RouterLink
					to="/shop-items"
					class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-purple-300">
					<div class="flex items-center mb-4">
						<div
							class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
							<svg
								class="w-6 h-6 text-purple-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
							</svg>
						</div>
						<h3 class="text-lg font-semibold text-gray-900 ml-3">Shop Items</h3>
					</div>
					<p class="text-gray-600 text-sm">
						Manage your shop inventory with buy/sell prices, stock tracking, and price
						history.
					</p>
				</RouterLink>

				<!-- Market Overview -->
				<RouterLink
					to="/market-overview"
					class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-orange-300">
					<div class="flex items-center mb-4">
						<div
							class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
							<svg
								class="w-6 h-6 text-orange-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<h3 class="text-lg font-semibold text-gray-900 ml-3">Market Overview</h3>
					</div>
					<p class="text-gray-600 text-sm">
						View comprehensive market analysis with price comparisons, trading
						opportunities, and competitor insights across all your servers.
					</p>
				</RouterLink>
			</div>

			<!-- User Profile Section -->
			<div class="mt-12 bg-gray-50 rounded-lg p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Your Profile</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{{ user?.email }}</div>
						<div class="text-sm text-gray-600">Account Email</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-600">Shop Manager</div>
						<div class="text-sm text-gray-600">Role</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-purple-600">Active</div>
						<div class="text-sm text-gray-600">Status</div>
					</div>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="mt-8 bg-white rounded-lg shadow-md p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
				<div class="flex flex-wrap gap-3">
					<!-- Quick Shop Access Button (if user has own shop) -->
					<RouterLink
						v-if="ownShop"
						:to="`/shop-items?shop=${ownShop.id}`"
						class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md">
						<svg
							class="w-4 h-4 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						{{ ownShop.name }} Items
					</RouterLink>

					<RouterLink
						to="/profile"
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
						<svg
							class="w-4 h-4 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
						Edit Profile
					</RouterLink>
					<RouterLink
						to="/market-overview"
						class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
						<svg
							class="w-4 h-4 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						Market Overview
					</RouterLink>
					<RouterLink
						to="/"
						class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
						<svg
							class="w-4 h-4 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
						</svg>
						View Price Guide
					</RouterLink>
				</div>
			</div>
		</div>
	</div>
</template>
