<script setup>
import { RouterLink } from 'vue-router'
import { HomeIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { CubeTransparentIcon } from '@heroicons/vue/24/outline'
</script>

<template>
	<div class="p-4 py-8 max-w-4xl">
		<!-- Error Message -->
		<div class="mb-8">
			<div class="flex items-center gap-4 mb-4">
				<h1 class="text-3xl font-bold text-gray-900">Page Not Found</h1>
				<CubeTransparentIcon class="w-16 h-16 text-gray-400" />
			</div>
			<p class="text-lg text-gray-600 mb-2">
				Oops! It looks like this page got lost in the Nether.
			</p>
			<p class="text-gray-500">
				The page you're looking for doesn't exist or has been moved.
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-4">
			<RouterLink
				to="/"
				class="inline-flex items-center justify-center rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
				<HomeIcon class="w-5 h-5 mr-2" />
				Homepage
			</RouterLink>

			<button
				@click="$router.go(-1)"
				class="inline-flex items-center justify-center rounded-md bg-gray-200 text-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-300 transition">
				<ArrowLeftIcon class="w-5 h-5 mr-2" />
				Back
			</button>
		</div>
	</div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
