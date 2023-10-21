<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useCurrentUser } from 'vuefire'

const user = useCurrentUser()
</script>

<template>
	<header>
		<h1 class="text-3xl font-bold underline">verzion's price guide</h1>
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
