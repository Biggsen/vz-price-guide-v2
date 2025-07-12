<script setup>
import { ref, watch, provide } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useCurrentUser } from 'vuefire'

import HeaderBanner from './components/HeaderBanner.vue'
import SubNav from './components/SubNav.vue'
import Footer from './components/Footer.vue'
import { userProfileExists } from './utils/userProfile.js'
import { useAdmin } from './utils/admin.js'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const user = useCurrentUser()
const route = useRoute()
const { isAdmin } = useAdmin()

// User profile state
const userProfile = ref(null)

// Navigation state for subnav
const activeMainNav = ref(null)

// Determine active main nav based on current route
function updateActiveMainNav() {
	const adminRoutes = ['/admin', '/missing-items', '/add', '/bulk-update']
	const shopManagerRoutes = [
		'/shop-manager',
		'/servers',
		'/shops',
		'/shop-items',
		'/market-overview'
	]
	const recipeRoutes = ['/recipes', '/recipes/import', '/recipes/manage', '/recipes/recalculate']

	if (adminRoutes.includes(route.path)) {
		activeMainNav.value = 'admin'
	} else if (shopManagerRoutes.includes(route.path)) {
		activeMainNav.value = 'shop-manager'
	} else if (recipeRoutes.includes(route.path)) {
		activeMainNav.value = 'recipes'
	} else {
		activeMainNav.value = null
	}
}

// Watch route changes to update active main nav
watch(route, updateActiveMainNav, { immediate: true })

// Provide the active main nav to child components
provide('activeMainNav', activeMainNav)

// Functions to set active main nav
function setActiveMainNav(section) {
	activeMainNav.value = section
}

// Load user profile
async function loadUserProfile(userId) {
	if (!userId) return

	try {
		const exists = await userProfileExists(userId)
		if (exists) {
			const db = getFirestore()
			const docRef = doc(db, 'users', userId)
			const docSnap = await getDoc(docRef)

			if (docSnap.exists()) {
				userProfile.value = docSnap.data()
			}
		}
	} catch (error) {
		console.error('Error loading user profile:', error)
	}
}

// Watch for user changes
watch(
	user,
	async (newUser) => {
		if (newUser?.uid) {
			await loadUserProfile(newUser.uid)
		} else {
			userProfile.value = null
		}
	},
	{ immediate: true }
)
</script>

<template>
	<header>
		<HeaderBanner />
		<nav class="bg-gray-800 text-white px-4 py-2 flex gap-2 items-center">
			<RouterLink
				to="/"
				@click="setActiveMainNav(null)"
				:class="[
					'px-3 py-2 rounded transition-colors',
					route.path === '/' || route.path.startsWith('/edit/')
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				Home
			</RouterLink>
			<RouterLink
				to="/updates"
				@click="setActiveMainNav(null)"
				:class="[
					'px-3 py-2 rounded transition-colors',
					route.path === '/updates'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				Updates
			</RouterLink>

			<!-- Admin section (only for admins) -->
			<RouterLink
				v-if="isAdmin"
				to="/admin"
				:class="[
					'px-3 py-2 rounded transition-colors',
					activeMainNav === 'admin'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				Admin
			</RouterLink>

			<!-- Recipes section (only for admins) -->
			<RouterLink
				v-if="isAdmin"
				to="/recipes"
				:class="[
					'px-3 py-2 rounded transition-colors',
					activeMainNav === 'recipes'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				Recipes
			</RouterLink>

			<!-- Shop Manager section (for logged in users) -->
			<RouterLink
				v-if="user?.email"
				to="/shop-manager"
				:class="[
					'px-3 py-2 rounded transition-colors',
					activeMainNav === 'shop-manager'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				Shop Manager
			</RouterLink>

			<!-- Login button (when not logged in) -->
			<RouterLink v-if="!user?.email" class="hover:underline ml-auto" to="/login">
				Login
			</RouterLink>

			<!-- User profile display (when logged in) -->
			<RouterLink
				v-if="user?.email"
				class="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded transition-colors ml-auto"
				to="/profile"
				@click="setActiveMainNav(null)">
				<!-- Display Name or Email -->
				<span class="text-sm font-medium">
					{{ userProfile?.display_name || user.email || 'User' }}
				</span>

				<!-- Profile Avatar -->
				<img
					v-if="userProfile?.minecraft_avatar_url"
					:src="userProfile.minecraft_avatar_url"
					:alt="userProfile.display_name || userProfile.minecraft_username"
					class="w-5 h-5 rounded"
					@error="$event.target.style.display = 'none'" />
				<!-- Fallback if no avatar -->
				<div
					v-else
					class="w-5 h-5 bg-gray-600 rounded flex items-center justify-center text-xs font-bold">
					{{ (userProfile?.display_name || user.email || '?').charAt(0).toUpperCase() }}
				</div>
			</RouterLink>
		</nav>
		<SubNav />
	</header>

	<RouterView />
	<Footer />
</template>
