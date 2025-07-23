<template>
	<div class="p-4 py-8 max-w-xl">
		<!-- Error Message -->
		<div class="mb-8">
			<div class="flex items-center gap-4 mb-4">
				<h1 class="text-3xl font-bold text-gray-900">Restricted Access</h1>
				<LockClosedIcon class="w-10 h-10 text-semantic-danger" />
			</div>
			<p class="text-lg text-gray-600 mb-2">You do not have permission to view this page.</p>
		</div>
		<!-- Action Buttons -->
		<div class="flex gap-4">
			<RouterLink
				to="/"
				class="inline-flex items-center justify-center rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
				<HomeIcon class="w-5 h-5 mr-2" />
				Homepage
			</RouterLink>
		</div>
	</div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { LockClosedIcon, HomeIcon, ArrowLeftIcon } from '@heroicons/vue/24/solid'
</script>
