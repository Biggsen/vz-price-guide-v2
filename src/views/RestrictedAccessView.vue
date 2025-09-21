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
			<BaseButton @click="() => router.push('/')" variant="primary">
				<template #left-icon>
					<HomeIcon />
				</template>
				Homepage
			</BaseButton>
		</div>
	</div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { LockClosedIcon, HomeIcon, ArrowLeftIcon } from '@heroicons/vue/24/solid'
import BaseButton from '@/components/BaseButton.vue'

const router = useRouter()
</script>
