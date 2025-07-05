<script setup>
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'

const { user, userProfile } = useAdmin()
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

				<!-- Coming Soon: Price Comparison -->
				<div class="bg-gray-50 rounded-lg shadow-md p-6 border border-gray-200 opacity-60">
					<div class="flex items-center mb-4">
						<div
							class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
							<svg
								class="w-6 h-6 text-gray-400"
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
						<div class="ml-3">
							<h3 class="text-lg font-semibold text-gray-500">Price Comparison</h3>
							<span class="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
								Coming Soon
							</span>
						</div>
					</div>
					<p class="text-gray-500 text-sm">
						Compare prices across shops and analyze market trends for better pricing
						decisions.
					</p>
				</div>
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
