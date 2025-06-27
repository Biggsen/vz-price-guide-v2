<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useCurrentUser } from 'vuefire'

import HeaderBanner from './components/HeaderBanner.vue'
import AuthNav from './components/AuthNav.vue'
import Footer from './components/Footer.vue'

const user = useCurrentUser()
</script>

<template>
	<header>
		<HeaderBanner />
		<nav class="bg-gray-800 text-white px-4 py-2 flex gap-4 items-center">
			<RouterLink class="hover:underline" to="/">Home</RouterLink>
			<RouterLink class="hover:underline" to="/updates">Updates</RouterLink>
			<RouterLink v-if="!user?.email" class="hover:underline ml-auto" to="/login">
				Login
			</RouterLink>
		</nav>
		<AuthNav />
	</header>

	<RouterView />
	<Footer />
</template>
