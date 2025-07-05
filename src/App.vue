<script setup>
import { ref, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useCurrentUser } from 'vuefire'

import HeaderBanner from './components/HeaderBanner.vue'
import AuthNav from './components/AuthNav.vue'
import Footer from './components/Footer.vue'
import { userProfileExists } from './utils/userProfile.js'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const user = useCurrentUser()

// User profile state
const userProfile = ref(null)

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
		<nav class="bg-gray-800 text-white px-4 py-2 flex gap-4 items-center">
			<RouterLink class="hover:underline" to="/">Home</RouterLink>
			<RouterLink class="hover:underline" to="/updates">Updates</RouterLink>

			<!-- Login button (when not logged in) -->
			<RouterLink v-if="!user?.email" class="hover:underline ml-auto" to="/login">
				Login
			</RouterLink>

			<!-- User profile display (when logged in) -->
			<RouterLink
				v-if="user?.email"
				class="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded transition-colors ml-auto"
				to="/profile">
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
		<AuthNav />
	</header>

	<RouterView />
	<Footer />
</template>
