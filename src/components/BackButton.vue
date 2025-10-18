<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// Store the home page query parameters to restore them when going back
const homeQuery = ref({})

// Determine if this is an Edit page (part of homepage journey) or other admin page (main nav)
const isEditPage = route.path.startsWith('/edit/')

// Capture the referring page's query parameters only for Edit pages
onMounted(() => {
	if (isEditPage) {
		// Edit pages should preserve filtering from homepage journey
		const redirectQuery = route.query.redirect
		if (redirectQuery) {
			try {
				const url = new URL(redirectQuery, window.location.origin)
				homeQuery.value = Object.fromEntries(url.searchParams.entries())
			} catch (e) {
				// If parsing fails, keep empty query
				homeQuery.value = {}
			}
		} else {
			// Try to extract query parameters from the referrer
			try {
				const referrer = document.referrer
				if (referrer && referrer.includes(window.location.origin)) {
					const url = new URL(referrer)
					homeQuery.value = Object.fromEntries(url.searchParams.entries())
				}
			} catch (e) {
				// If parsing fails, keep empty query
				homeQuery.value = {}
			}
		}
	}
	// For non-Edit pages (Add, Missing Items, Bulk Update), homeQuery remains empty
})

function goBack() {
	// For Edit pages, go back to bulk update page; otherwise go to home
	if (isEditPage) {
		router.push({ path: '/bulk-update' })
	} else {
		// Navigate back to home with or without query parameters based on context
		router.push({ path: '/', query: homeQuery.value })
	}
}
</script>

<template>
	<div class="mb-4">
		<button
			@click="goBack"
			class="inline-flex items-center rounded-md bg-white text-gray-700 border-2 border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition">
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
			</svg>
			Back
		</button>
	</div>
</template>
