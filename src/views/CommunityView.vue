<script setup>
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'
import { LightBulbIcon, UsersIcon } from '@heroicons/vue/24/outline'

const { user, isAdmin } = useAdmin()
</script>

<template>
	<div class="p-4 pt-8">
		<div class="mb-8">
			<div class="flex items-center mb-4">
				<div
					class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
					<UsersIcon class="w-6 h-6 text-green-600" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Community Dashboard</h1>
					<p class="text-gray-600">
						Manage user suggestions and community feedback for the Minecraft economy
						guide.
					</p>
				</div>
			</div>
		</div>

		<!-- Community Management -->
		<div class="mb-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Community Management</h2>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
			<!-- Suggestions -->
			<RouterLink
				to="/admin/suggestions"
				class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-yellow-300">
				<div class="flex items-center mb-4">
					<div
						class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
						<LightBulbIcon class="w-6 h-6 text-yellow-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900 ml-3">Suggestions</h3>
				</div>
				<p class="text-gray-600 text-sm">
					Review and manage user suggestions for improving the price guide and site
					functionality.
				</p>
			</RouterLink>
		</div>
	</div>
</template>
