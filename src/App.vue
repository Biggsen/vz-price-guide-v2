<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useCurrentUser } from 'vuefire'

import HeaderBanner from './components/HeaderBanner.vue'
import HeaderIntro from './components/HeaderIntro.vue'

const user = useCurrentUser()
</script>

<template>
	<header>
		<HeaderBanner />
		<HeaderIntro />
		<div class="wrapper">
			<nav>
				<RouterLink to="/">Home</RouterLink>
				<RouterLink to="/about">About</RouterLink>
				<RouterLink v-if="user?.email" to="/newitem">New item</RouterLink>
			</nav>
		</div>
	</header>

	<RouterView />
</template>
