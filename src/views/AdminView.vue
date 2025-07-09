<script setup>
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'
import {
	ShieldCheckIcon,
	ExclamationTriangleIcon,
	PlusIcon,
	ArrowPathIcon,
	BookOpenIcon
} from '@heroicons/vue/24/outline'

const { user, isAdmin, canViewMissingItems, canAddItems, canBulkUpdate } = useAdmin()
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

			<!-- Recipes -->
			<RouterLink
				to="/recipes"
				class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300">
				<div class="flex items-center mb-4">
					<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
						<BookOpenIcon class="w-6 h-6 text-blue-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900 ml-3">Recipes</h3>
				</div>
				<p class="text-gray-600 text-sm">
					Manage crafting recipes and configure dynamic pricing calculations for items.
				</p>
			</RouterLink>
		</div>
	</div>
</template>
