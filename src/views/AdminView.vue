<script setup>
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'
import { useStats } from '../utils/stats.js'
import {
	ShieldCheckIcon,
	ExclamationTriangleIcon,
	PlusIcon,
	ArrowPathIcon,
	ChartBarIcon,
	UsersIcon,
	ServerIcon,
	ShoppingBagIcon,
	ClockIcon
} from '@heroicons/vue/24/outline'

const { user, isAdmin, canViewMissingItems, canAddItems, canBulkUpdate } = useAdmin()
const { stats, loading, error, refresh } = useStats()
</script>

<template>
	<div class="p-4 pt-8">
		<div class="mb-8">
			<div class="flex items-center mb-4">
				<div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
					<ShieldCheckIcon class="w-6 h-6 text-red-600" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
					<p class="text-gray-600">
						Manage items, monitor data, and maintain the price guide.
					</p>
				</div>
			</div>
		</div>

		<!-- Statistics Dashboard -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold text-gray-900">System Statistics</h2>
				<button
					@click="refresh"
					:disabled="loading"
					class="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50">
					<ArrowPathIcon :class="['w-4 h-4', { 'animate-spin': loading }]" />
					{{ loading ? 'Loading...' : 'Refresh' }}
				</button>
			</div>

			<div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
				<p class="text-red-700 text-sm">Error loading statistics: {{ error.message }}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<!-- Items Count -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex items-center">
						<div
							class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
							<ChartBarIcon class="w-6 h-6 text-blue-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-600">Total Items</p>
							<p class="text-2xl font-bold text-gray-900">
								{{ stats.itemsCount.toLocaleString() }}
							</p>
						</div>
					</div>
				</div>

				<!-- Recipes Count -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex items-center">
						<div
							class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
							<PlusIcon class="w-6 h-6 text-green-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-600">Items with Recipes</p>
							<p class="text-2xl font-bold text-gray-900">
								{{ stats.recipesCount.toLocaleString() }}
							</p>
						</div>
					</div>
				</div>

				<!-- Users Count -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex items-center">
						<div
							class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
							<UsersIcon class="w-6 h-6 text-purple-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-600">Registered Users</p>
							<p class="text-2xl font-bold text-gray-900">
								{{ stats.usersCount.toLocaleString() }}
							</p>
						</div>
					</div>
				</div>

				<!-- Recent Activity -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex items-center">
						<div
							class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
							<ClockIcon class="w-6 h-6 text-yellow-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-600">Recent Activity</p>
							<p class="text-2xl font-bold text-gray-900">
								{{ stats.recentActivityCount.toLocaleString() }}
							</p>
							<p class="text-xs text-gray-500">Last 7 days</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Shop Manager Stats -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<!-- Servers Count -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex items-center">
						<div
							class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
							<ServerIcon class="w-6 h-6 text-indigo-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-600">Minecraft Servers</p>
							<p class="text-2xl font-bold text-gray-900">
								{{ stats.serversCount.toLocaleString() }}
							</p>
						</div>
					</div>
				</div>

				<!-- Shops Count -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex items-center">
						<div
							class="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
							<ShoppingBagIcon class="w-6 h-6 text-pink-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-600">Total Shops</p>
							<p class="text-2xl font-bold text-gray-900">
								{{ stats.shopsCount.toLocaleString() }}
							</p>
						</div>
					</div>
				</div>

				<!-- Shop Items Count -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex items-center">
						<div
							class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
							<ChartBarIcon class="w-6 h-6 text-orange-600" />
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-600">Shop Items</p>
							<p class="text-2xl font-bold text-gray-900">
								{{ stats.shopItemsCount.toLocaleString() }}
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Detailed Stats -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Items by Category -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Items by Category</h3>
					<div class="space-y-3">
						<div
							v-for="(count, category) in stats.itemsByCategory"
							:key="category"
							class="flex justify-between items-center">
							<span class="text-sm font-medium text-gray-700 capitalize">
								{{ category }}
							</span>
							<span class="text-sm text-gray-500">{{ count.toLocaleString() }}</span>
						</div>
						<div
							v-if="Object.keys(stats.itemsByCategory).length === 0"
							class="text-sm text-gray-500">
							No category data available
						</div>
					</div>
				</div>

				<!-- Items by Version -->
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">Items by Version</h3>
					<div class="space-y-3">
						<div
							v-for="(count, version) in stats.itemsByVersion"
							:key="version"
							class="flex justify-between items-center">
							<span class="text-sm font-medium text-gray-700">
								Minecraft {{ version }}
							</span>
							<span class="text-sm text-gray-500">{{ count.toLocaleString() }}</span>
						</div>
						<div
							v-if="Object.keys(stats.itemsByVersion).length === 0"
							class="text-sm text-gray-500">
							No version data available
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Admin Actions -->
		<div class="mb-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Admin Actions</h2>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Missing Items -->
			<RouterLink
				v-if="canViewMissingItems"
				to="/missing-items"
				class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300">
				<div class="flex items-center mb-4">
					<div
						class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
						<ExclamationTriangleIcon class="w-6 h-6 text-yellow-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900 ml-3">Missing Items</h3>
				</div>
				<p class="text-gray-600 text-sm">
					Find and add items that are missing from the database based on Minecraft version
					data.
				</p>
			</RouterLink>

			<!-- Add Item -->
			<RouterLink
				v-if="canAddItems"
				to="/add"
				class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-green-300">
				<div class="flex items-center mb-4">
					<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
						<PlusIcon class="w-6 h-6 text-green-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900 ml-3">Add Item</h3>
				</div>
				<p class="text-gray-600 text-sm">
					Manually add new items to the price guide database with pricing and category
					information.
				</p>
			</RouterLink>

			<!-- Bulk Update -->
			<RouterLink
				v-if="canBulkUpdate"
				to="/bulk-update"
				class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-purple-300">
				<div class="flex items-center mb-4">
					<div
						class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
						<ArrowPathIcon class="w-6 h-6 text-purple-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900 ml-3">Bulk Update</h3>
				</div>
				<p class="text-gray-600 text-sm">
					Update multiple items at once with batch operations for efficient database
					management.
				</p>
			</RouterLink>
		</div>
	</div>
</template>
