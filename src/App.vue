<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useCurrentUser, useFirebaseAuth } from 'vuefire'
import { signOut } from '@firebase/auth'

import HeaderBanner from './components/HeaderBanner.vue'
import Footer from './components/Footer.vue'

const user = useCurrentUser()
const auth = useFirebaseAuth()

function signOutOfFirebase() {
	signOut(auth)
}
</script>

<template>
	<header>
		<HeaderBanner />
		<nav class="bg-gray-800 text-white px-4 py-2 flex gap-4 items-center">
			<RouterLink class="hover:underline" to="/">Home</RouterLink>
			<RouterLink class="hover:underline" to="/updates">Updates</RouterLink>
			<RouterLink v-if="user?.email" class="hover:underline" to="/about">About</RouterLink>
			<RouterLink v-if="user?.email" class="hover:underline" to="/missing-items">
				Missing Items
			</RouterLink>
			<RouterLink v-if="user?.email" class="hover:underline" to="/add">Add Item</RouterLink>
			<RouterLink v-if="user?.email" class="hover:underline" to="/bulk-update">
				Bulk Update
			</RouterLink>
			<RouterLink v-if="!user?.email" class="hover:underline ml-auto" to="/login">
				Login
			</RouterLink>
			<button v-else class="hover:underline ml-auto" @click="signOutOfFirebase">
				Logout
			</button>
		</nav>
	</header>

	<RouterView />
	<Footer />
</template>
