<script setup>
import { onMounted, ref } from 'vue'
import { useCurrentUser } from 'vuefire'
import { getShopManagerStats } from '../utils/stats.js'
import {
	ChartBarIcon,
	ServerIcon,
	ShoppingBagIcon,
	CubeIcon,
	UserIcon,
	ArrowTrendingUpIcon,
	ClockIcon
} from '@heroicons/vue/24/outline'

const user = useCurrentUser()
const loading = ref(true)
const stats = ref({
	totalServers: 0,
	totalShops: 0,
	totalShopItems: 0,
	totalUsers: 0,
	usersWithShopManagerAccess: 0,
	activeUsersCount: 0,
	avgServersPerUser: '0.00',
	maxServersPerUser: 0,
	avgShopsPerUser: '0.00',
	maxShopsPerUser: 0,
	avgShopsPerServer: '0.00',
	maxShopsPerServer: 0,
	avgShopItemsPerShop: '0.00',
	maxShopItemsPerShop: 0,
	recentServers: 0,
	recentShops: 0,
	recentShopItems: 0,
	serversWithoutShops: 0,
	shopsWithoutItems: 0
})

const fetchStats = async () => {
	try {
		loading.value = true
		const excludeUserId = user.value?.uid || null
		const data = await getShopManagerStats(excludeUserId)
		stats.value = data
	} catch (error) {
		console.error('Error fetching stats:', error)
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	fetchStats()
})
</script>

<template>
	<div class="p-4 pt-8">
		<div class="mb-8">
			<div class="flex items-center mb-4">
				<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
					<ChartBarIcon class="w-6 h-6 text-indigo-600" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Shop Manager Statistics</h1>
					<p class="text-gray-600">
						Detailed usage statistics and analytics for the Shop Manager feature.
					</p>
				</div>
			</div>
		</div>

		<div v-if="loading" class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
		</div>

		<div v-else>
			<!-- Overview Statistics -->
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<!-- Total Servers -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
								<ServerIcon class="w-6 h-6 text-blue-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Total Servers</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.totalServers }}
								</p>
							</div>
						</div>
					</div>

					<!-- Total Shops -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
								<ShoppingBagIcon class="w-6 h-6 text-green-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Total Shops</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.totalShops }}
								</p>
							</div>
						</div>
					</div>

					<!-- Total Shop Items -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
								<CubeIcon class="w-6 h-6 text-purple-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Total Shop Items</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.totalShopItems }}
								</p>
							</div>
						</div>
					</div>

					<!-- Active Users -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
								<UserIcon class="w-6 h-6 text-orange-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Active Users</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.activeUsersCount }}
								</p>
							</div>
						</div>
						<p class="text-gray-600 text-xs mt-2">
							Users who have created servers or shops
						</p>
					</div>
				</div>
			</div>

			<!-- User Statistics -->
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-6">User Statistics</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<!-- Users with Shop Manager Access -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
								<UserIcon class="w-6 h-6 text-indigo-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Shop Manager Access</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.usersWithShopManagerAccess }}
								</p>
							</div>
						</div>
						<p class="text-gray-600 text-xs mt-2">
							Users with shop manager permissions
						</p>
					</div>

					<!-- Average Servers Per User -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
								<ArrowTrendingUpIcon class="w-6 h-6 text-blue-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Avg Servers/User</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.avgServersPerUser }}
								</p>
							</div>
						</div>
						<p class="text-gray-600 text-xs mt-2">
							Max: {{ stats.maxServersPerUser }} servers
						</p>
					</div>

					<!-- Average Shops Per User -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
								<ArrowTrendingUpIcon class="w-6 h-6 text-green-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Avg Shops/User</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.avgShopsPerUser }}
								</p>
							</div>
						</div>
						<p class="text-gray-600 text-xs mt-2">
							Max: {{ stats.maxShopsPerUser }} shops
						</p>
					</div>
				</div>
			</div>

			<!-- Server & Shop Statistics -->
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-6">Server & Shop Statistics</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<!-- Average Shops Per Server -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
								<ServerIcon class="w-6 h-6 text-blue-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Avg Shops/Server</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.avgShopsPerServer }}
								</p>
							</div>
						</div>
						<p class="text-gray-600 text-xs mt-2">
							Max: {{ stats.maxShopsPerServer }} shops
						</p>
					</div>

					<!-- Average Shop Items Per Shop -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
								<CubeIcon class="w-6 h-6 text-purple-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Avg Items/Shop</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.avgShopItemsPerShop }}
								</p>
							</div>
						</div>
						<p class="text-gray-600 text-xs mt-2">
							Max: {{ stats.maxShopItemsPerShop }} items
						</p>
					</div>

					<!-- Servers Without Shops -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
								<ServerIcon class="w-6 h-6 text-yellow-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Servers Without Shops</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.serversWithoutShops }}
								</p>
							</div>
						</div>
						<p class="text-gray-600 text-xs mt-2">
							Servers that have no shops created
						</p>
					</div>

					<!-- Shops Without Items -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
								<ShoppingBagIcon class="w-6 h-6 text-yellow-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Shops Without Items</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.shopsWithoutItems }}
								</p>
							</div>
						</div>
						<p class="text-gray-600 text-xs mt-2">
							Shops that have no items added
						</p>
					</div>
				</div>
			</div>

			<!-- Recent Activity (Last 7 Days) -->
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-6">Recent Activity (Last 7 Days)</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<!-- Recent Servers -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
								<ClockIcon class="w-6 h-6 text-blue-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">New Servers</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.recentServers }}
								</p>
							</div>
						</div>
					</div>

					<!-- Recent Shops -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
								<ClockIcon class="w-6 h-6 text-green-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">New Shops</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.recentShops }}
								</p>
							</div>
						</div>
					</div>

					<!-- Recent Shop Items -->
					<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
						<div class="flex items-center mb-4">
							<div
								class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
								<ClockIcon class="w-6 h-6 text-purple-600" />
							</div>
							<div class="ml-4">
								<p class="text-sm text-gray-600">Updated Shop Items</p>
								<p class="text-3xl font-bold text-gray-900">
									{{ stats.recentShopItems }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
