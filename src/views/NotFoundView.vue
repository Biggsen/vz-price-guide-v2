<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, CubeTransparentIcon } from '@heroicons/vue/24/outline'
import { HomeIcon } from '@heroicons/vue/24/solid'
import BaseButton from '@/components/BaseButton.vue'

const router = useRouter()
</script>

<template>
	<div class="p-4 py-8 max-w-4xl">
		<!-- Error Message -->
		<div class="mb-8">
			<div class="flex items-center gap-4 mb-4">
				<h1 class="text-3xl font-bold text-gray-900">Page Not Found</h1>
				<CubeTransparentIcon class="w-10 h-10 text-gray-400" />
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
			<BaseButton @click="() => router.push('/')" variant="primary">
				<template #left-icon>
					<HomeIcon />
				</template>
				Homepage
			</BaseButton>

			<BaseButton @click="router.go(-1)" variant="tertiary">
				<template #left-icon>
					<ArrowLeftIcon />
				</template>
				Back
			</BaseButton>
		</div>
	</div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
