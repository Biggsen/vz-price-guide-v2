<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useCurrentUser } from 'vuefire'

import HeaderBanner from './components/HeaderBanner.vue'

const user = useCurrentUser()
</script>

<template>
	<header>
		<HeaderBanner />
		<!-- <div class="wrapper">
			<nav>
				<RouterLink to="/">Home</RouterLink>
				<RouterLink to="/about">About</RouterLink>
				<RouterLink v-if="user?.email" to="/newitem">New item</RouterLink>
			</nav>
		</div> -->
	</header>

	<RouterView />
</template>
