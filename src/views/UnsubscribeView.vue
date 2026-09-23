<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { requestUnsubscribe } from '../utils/newsletter.js'

const route = useRoute()
const status = ref('loading')

onMounted(async () => {
	const token = route.query.token
	if (!token || typeof token !== 'string') {
		status.value = 'invalid'
		return
	}
	try {
		const result = await requestUnsubscribe(token)
		status.value = result.status || 'invalid'
	} catch (error) {
		console.error(error)
		status.value = 'invalid'
	}
})
</script>

<template>
	<div class="p-4 pt-16 max-w-lg mx-auto" data-cy="unsubscribe-page">
		<h1 class="text-2xl font-bold text-gray-900 mb-3">Email preferences</h1>
		<p v-if="status === 'loading'" class="text-gray-600">Updating your preference…</p>
		<p v-else-if="status === 'unsubscribed'" class="text-gray-700" data-cy="unsubscribe-success">
			You have been unsubscribed from occasional updates. You can turn them back on any time in
			your account settings.
		</p>
		<p v-else-if="status === 'already'" class="text-gray-700" data-cy="unsubscribe-already">
			You were already unsubscribed from occasional updates.
		</p>
		<p v-else class="text-gray-700" data-cy="unsubscribe-invalid">
			This unsubscribe link is invalid or has expired.
		</p>
		<p class="mt-6 text-sm">
			<RouterLink to="/account" class="underline text-indigo-700">Account settings</RouterLink>
			·
			<RouterLink to="/" class="underline text-indigo-700">Home</RouterLink>
		</p>
	</div>
</template>
