<script setup>
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'

const { user, isAdmin, canViewMissingItems, canAddItems, canBulkUpdate } = useAdmin()
</script>

<template>
	<div class="container mx-auto px-4 py-8">
		<div class="max-w-6xl mx-auto">
			<div class="mb-8">
				<div class="flex items-center mb-4">
					<div
						class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
						<svg
							class="w-6 h-6 text-red-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
						</svg>
					</div>
					<div>
						<h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
						<p class="text-gray-600">
							Manage items, monitor data, and maintain the price guide.
						</p>
					</div>
				</div>
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
							<svg
								class="w-6 h-6 text-yellow-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</div>
						<h3 class="text-lg font-semibold text-gray-900 ml-3">Missing Items</h3>
					</div>
					<p class="text-gray-600 text-sm">
						Find and add items that are missing from the database based on Minecraft
						version data.
					</p>
				</RouterLink>

				<!-- Add Item -->
				<RouterLink
					v-if="canAddItems"
					to="/add"
					class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-green-300">
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
									d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
							</svg>
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
							<svg
								class="w-6 h-6 text-purple-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</div>
						<h3 class="text-lg font-semibold text-gray-900 ml-3">Bulk Update</h3>
					</div>
					<p class="text-gray-600 text-sm">
						Update multiple items at once with batch operations for efficient database
						management.
					</p>
				</RouterLink>
			</div>

			<!-- Admin Stats Section -->
			<div class="mt-12 bg-gray-50 rounded-lg p-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Admin Overview</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">Admin</div>
						<div class="text-sm text-gray-600">Current Role</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-600">{{ user?.email }}</div>
						<div class="text-sm text-gray-600">Logged in as</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-purple-600">Full Access</div>
						<div class="text-sm text-gray-600">Permission Level</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
