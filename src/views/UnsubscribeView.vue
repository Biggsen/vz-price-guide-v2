<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { requestUnsubscribe } from '../utils/newsletter.js'

const PREVIEW_STATUSES = ['unsubscribed', 'already', 'invalid']

const route = useRoute()
const status = ref('loading')

function previewStatus() {
	const preview = route.query.preview
	if (preview === undefined) return null
	if (preview === '' || preview === '1' || preview === 'true') return 'unsubscribed'
	if (PREVIEW_STATUSES.includes(String(preview))) return String(preview)
	return 'unsubscribed'
}

onMounted(async () => {
	const preview = previewStatus()
	if (preview) {
		status.value = preview
		return
	}

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
	<div
		class="min-h-screen px-6 pt-16 pb-16 bg-white"
		data-cy="unsubscribe-page">
		<div class="max-w-md w-full mx-auto text-center">
			<img src="/cube.png" alt="" class="w-10 h-10 mx-auto mb-4" width="40" height="40" />
			<p class="text-sm text-gray-500 mb-6">verzion's economy price guide</p>
			<h1 class="text-2xl font-bold text-gray-900 mb-3">Email preferences</h1>
			<p v-if="status === 'loading'" class="text-gray-600">Updating your preference…</p>
			<p
				v-else-if="status === 'unsubscribed'"
				class="text-gray-700"
				data-cy="unsubscribe-success">
				You have been unsubscribed from occasional updates. You can turn them back on any
				time in your account settings.
			</p>
			<p v-else-if="status === 'already'" class="text-gray-700" data-cy="unsubscribe-already">
				You were already unsubscribed from occasional updates.
			</p>
			<p v-else class="text-gray-700" data-cy="unsubscribe-invalid">
				This unsubscribe link is invalid or has expired.
			</p>
			<p class="mt-8 text-sm">
				<RouterLink to="/account" class="underline text-gray-600 hover:text-gray-900">
					Account settings
				</RouterLink>
			</p>
		</div>
	</div>
</template>
