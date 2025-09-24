<script setup>
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'
import { PaintBrushIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/vue/24/outline'

const { isAdmin } = useAdmin()
</script>

<template>
	<div class="p-4 pt-8">
		<div class="mb-8">
			<div class="flex items-center mb-4">
				<div class="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
					<PaintBrushIcon class="w-6 h-6 text-pink-600" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Design Dashboard</h1>
					<p class="text-gray-600">
						Design system, styleguide, and visual testing tools for the application.
					</p>
				</div>
			</div>
		</div>

		<!-- Design Tools -->
		<div class="mb-8">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Design Tools</h2>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Styleguide -->
			<RouterLink
				to="/styleguide"
				class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-blue-300">
				<div class="flex items-center mb-4">
					<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
						<DocumentTextIcon class="w-6 h-6 text-blue-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900 ml-3">Styleguide</h3>
				</div>
				<p class="text-gray-600 text-sm">
					View the complete design system, component library, and styling guidelines for
					the application.
				</p>
			</RouterLink>

			<!-- Visual Gallery -->
			<RouterLink
				to="/visual-gallery"
				class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-green-300">
				<div class="flex items-center mb-4">
					<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
						<PhotoIcon class="w-6 h-6 text-green-600" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900 ml-3">Visual Gallery</h3>
				</div>
				<p class="text-gray-600 text-sm">
					Browse and manage visual testing screenshots, compare designs, and track UI
					changes.
				</p>
			</RouterLink>
		</div>
	</div>
</template>
