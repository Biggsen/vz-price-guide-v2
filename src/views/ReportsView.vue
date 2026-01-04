<script setup>
import { RouterLink } from 'vue-router'
import { ChartBarIcon, ShoppingBagIcon } from '@heroicons/vue/24/outline'
</script>

<template>
	<div class="p-4 pt-8">
		<div class="mb-8">
			<div class="flex items-center mb-4">
				<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
					<ChartBarIcon class="w-6 h-6 text-indigo-600" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Reports</h1>
					<p class="text-gray-600">
						View usage statistics and reports on various aspects of the site.
					</p>
				</div>
			</div>
		</div>

		<!-- Available Reports -->
		<div class="mb-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Available Reports</h2>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
			<!-- Shop Manager Stats -->
			<RouterLink
				to="/admin/reports/shop-manager"
				class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-indigo-300">
				<div class="flex items-center mb-4">
					<div
						class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
						<ShoppingBagIcon class="w-6 h-6 text-indigo-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900 ml-3">Shop Manager Stats</h3>
				</div>
				<p class="text-gray-600 text-sm">
					Detailed usage statistics and analytics for the Shop Manager feature, including
					servers, shops, items, and user activity.
				</p>
			</RouterLink>
		</div>
	</div>
</template>
