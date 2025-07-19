<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useFirebaseAuth } from 'vuefire'
import { signOut } from '@firebase/auth'
import { useRouter } from 'vue-router'
import { useAdmin } from '../utils/admin.js'
import {
	useUserProfile,
	createUserProfile,
	updateUserProfile,
	userProfileExists
} from '../utils/userProfile.js'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const { user, isAdmin } = useAdmin()
const auth = useFirebaseAuth()
const router = useRouter()

// User profile state
const userProfile = ref(null)
const checkingProfile = ref(true)
const editingSiteProfile = ref(false)
const editingMinecraftProfile = ref(false)

// Profile form data
const profileForm = ref({
	minecraft_username: '',
	display_name: ''
})

// Checkbox state for using minecraft username as display name
const useMinecraftUsername = ref(false)

// Computed property for profile exists
const profileExists = computed(() => {
	return userProfile.value != null
})

// Function to load profile data directly
async function loadUserProfile(userId) {
	try {
		const exists = await userProfileExists(userId)
		if (exists) {
			// Load profile data directly from Firestore
			const db = getFirestore()
			const docRef = doc(db, 'users', userId)
			const docSnap = await getDoc(docRef)

			if (docSnap.exists()) {
				const profileData = docSnap.data()
				userProfile.value = { ...profileData }

				// Update form with profile data
				profileForm.value = {
					minecraft_username: profileData.minecraft_username || '',
					display_name: profileData.display_name || ''
				}
			}
		}
	} catch (error) {
		console.error('Error loading profile:', error)
	}
}

// Watch for user changes and load profile
watch(
	user,
	async (newUser) => {
		if (newUser?.uid) {
			checkingProfile.value = true
			await loadUserProfile(newUser.uid)
			checkingProfile.value = false
		} else {
			// Reset when user logs out
			userProfile.value = null
			checkingProfile.value = false
		}
	},
	{ immediate: true }
)

// Watch for userProfile changes to update form
watch(
	userProfile,
	(newProfile) => {
		if (newProfile) {
			profileForm.value = {
				minecraft_username: newProfile.minecraft_username || '',
				display_name: newProfile.display_name || ''
			}
			// Update checkbox state
			useMinecraftUsername.value = newProfile.display_name === newProfile.minecraft_username
		}
	},
	{ immediate: true }
)

// Watch for checkbox changes to sync display name
watch(useMinecraftUsername, (newValue) => {
	if (newValue && profileForm.value.minecraft_username) {
		profileForm.value.display_name = profileForm.value.minecraft_username
	}
})

// Watch for minecraft username changes to update display name if checkbox is checked
watch(
	() => profileForm.value.minecraft_username,
	(newUsername) => {
		if (useMinecraftUsername.value && newUsername) {
			profileForm.value.display_name = newUsername
		}
	}
)

// Create user profile
async function createProfile() {
	if (!user.value?.uid || !profileForm.value.minecraft_username.trim()) return

	try {
		const newProfile = await createUserProfile(user.value.uid, {
			minecraft_username: profileForm.value.minecraft_username.trim(),
			display_name:
				profileForm.value.display_name.trim() || profileForm.value.minecraft_username.trim()
		})

		// Update local state
		editingSiteProfile.value = false
		editingMinecraftProfile.value = false

		// Update local profile data immediately
		userProfile.value = { ...newProfile }
	} catch (error) {
		console.error('Error creating profile:', error)
		alert('Failed to create profile. Please try again.')
	}
}

// Update site profile
async function updateSiteProfile() {
	if (!user.value?.uid) return

	try {
		const updatedProfile = await updateUserProfile(user.value.uid, {
			display_name:
				profileForm.value.display_name.trim() || profileForm.value.minecraft_username.trim()
		})

		editingSiteProfile.value = false

		// Update local profile data immediately
		userProfile.value = { ...userProfile.value, ...updatedProfile }
	} catch (error) {
		console.error('Error updating site profile:', error)
		alert('Failed to update site profile. Please try again.')
	}
}

// Update minecraft profile
async function updateMinecraftProfile() {
	if (!user.value?.uid || !profileForm.value.minecraft_username.trim()) return

	try {
		const updatedProfile = await updateUserProfile(user.value.uid, {
			minecraft_username: profileForm.value.minecraft_username.trim()
		})

		editingMinecraftProfile.value = false

		// Update local profile data immediately
		userProfile.value = { ...userProfile.value, ...updatedProfile }
	} catch (error) {
		console.error('Error updating minecraft profile:', error)
		alert('Failed to update minecraft profile. Please try again.')
	}
}

// Cancel editing site profile
function cancelEditSiteProfile() {
	editingSiteProfile.value = false
	if (userProfile.value) {
		profileForm.value.display_name = userProfile.value.display_name || ''
		useMinecraftUsername.value =
			userProfile.value.display_name === userProfile.value.minecraft_username
	}
}

// Cancel editing minecraft profile
function cancelEditMinecraftProfile() {
	editingMinecraftProfile.value = false
	if (userProfile.value) {
		profileForm.value.minecraft_username = userProfile.value.minecraft_username || ''
	}
}

function signOutOfFirebase() {
	signOut(auth)
		.then(() => {
			router.push('/')
		})
		.catch((error) => {
			console.error('Logout error:', error)
		})
}
</script>

<template>
	<main class="p-4 pt-8">
		<div class="max-w-4xl">
			<div v-if="user?.email">
				<h1 class="text-3xl font-bold mb-6">Profile</h1>

				<!-- Loading state -->
				<div v-if="checkingProfile" class="text-center py-8">
					<p class="text-gray-600">Loading profile...</p>
				</div>

				<!-- Profile setup (first time) -->
				<div v-else-if="!profileExists" class="mb-8">
					<h2
						class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
						Create Your Profile
					</h2>

					<form @submit.prevent="createProfile" class="space-y-6">
						<div>
							<div class="space-y-3">
								<div>
									<label
										for="display_name"
										class="block text-base font-medium leading-6 text-gray-900">
										Display Name (optional)
									</label>
									<input
										type="text"
										id="display_name"
										v-model="profileForm.display_name"
										:disabled="useMinecraftUsername"
										placeholder="How others will see your name on the site"
										class="block w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus disabled:bg-gray-100 disabled:text-gray-500" />
								</div>

								<div class="flex items-center space-x-2">
									<input
										type="checkbox"
										id="use_minecraft_username_initial"
										v-model="useMinecraftUsername"
										class="checkbox-input" />
									<label
										for="use_minecraft_username_initial"
										class="text-base font-medium leading-6 text-gray-900">
										Use Minecraft Username
									</label>
								</div>
							</div>
						</div>

						<div>
							<div>
								<label
									for="minecraft_username"
									class="block text-base font-medium leading-6 text-gray-900">
									Minecraft Username *
								</label>
								<input
									type="text"
									id="minecraft_username"
									v-model="profileForm.minecraft_username"
									required
									placeholder="Your Minecraft username"
									class="block w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus" />
							</div>
						</div>

						<button
							type="submit"
							class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
							Create Profile
						</button>
					</form>
				</div>

				<!-- Existing profile -->
				<div v-else class="space-y-12">
					<!-- Site Profile Section -->
					<div class="mb-8">
						<h2
							class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
							Site Profile
						</h2>

						<!-- Display Mode -->
						<div v-if="!editingSiteProfile" class="space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<label
										class="block text-base font-medium leading-6 text-gray-900">
										Display Name
									</label>
									<p class="text-gray-900">
										{{ userProfile?.display_name || 'Not set' }}
									</p>
								</div>
								<button
									@click="editingSiteProfile = true"
									class="px-3 py-1 text-sm bg-semantic-info text-white rounded hover:bg-opacity-80 transition-colors">
									Edit
								</button>
							</div>
						</div>

						<!-- Edit Mode -->
						<div v-else>
							<form @submit.prevent="updateSiteProfile" class="space-y-4">
								<div>
									<label
										for="edit_display_name"
										class="block text-base font-medium leading-6 text-gray-900">
										Display Name
									</label>
									<input
										type="text"
										id="edit_display_name"
										v-model="profileForm.display_name"
										:disabled="useMinecraftUsername"
										placeholder="How others will see your name"
										class="block w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus disabled:bg-gray-100 disabled:text-gray-500" />
								</div>

								<div class="flex items-center space-x-2">
									<input
										type="checkbox"
										id="use_minecraft_username"
										v-model="useMinecraftUsername"
										class="checkbox-input" />
									<label
										for="use_minecraft_username"
										class="text-base font-medium leading-6 text-gray-900">
										Use Minecraft Username
									</label>
								</div>

								<div class="flex space-x-3">
									<button
										type="submit"
										class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
										Save Changes
									</button>
									<button
										type="button"
										@click="cancelEditSiteProfile"
										class="rounded-md bg-gray-200 text-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-300 transition">
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>

					<!-- Minecraft Profile Section -->
					<div class="mb-8">
						<h2
							class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
							Minecraft Profile
						</h2>

						<!-- Display Mode -->
						<div v-if="!editingMinecraftProfile">
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-4">
									<img
										v-if="userProfile?.minecraft_avatar_url"
										:src="userProfile.minecraft_avatar_url"
										:alt="userProfile.minecraft_username"
										class="w-16 h-16 rounded"
										@error="$event.target.style.display = 'none'" />
									<div>
										<label
											class="block text-base font-medium leading-6 text-gray-900">
											Minecraft Username
										</label>
										<p class="text-gray-900 font-mono">
											{{ userProfile?.minecraft_username || 'Not set' }}
										</p>
									</div>
								</div>
								<button
									@click="editingMinecraftProfile = true"
									class="px-3 py-1 text-sm bg-semantic-info text-white rounded hover:bg-opacity-80 transition-colors">
									Edit
								</button>
							</div>
						</div>

						<!-- Edit Mode -->
						<div v-else>
							<form @submit.prevent="updateMinecraftProfile" class="space-y-4">
								<div>
									<label
										for="edit_minecraft_username"
										class="block text-base font-medium leading-6 text-gray-900">
										Minecraft Username *
									</label>
									<input
										type="text"
										id="edit_minecraft_username"
										v-model="profileForm.minecraft_username"
										required
										placeholder="Your Minecraft username"
										class="block w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus" />
								</div>

								<div class="flex space-x-3">
									<button
										type="submit"
										class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
										Save Changes
									</button>
									<button
										type="button"
										@click="cancelEditMinecraftProfile"
										class="rounded-md bg-gray-200 text-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-300 transition">
										Cancel
									</button>
								</div>
							</form>
						</div>
					</div>

					<!-- Account Information -->
					<div class="mb-8">
						<h2
							class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
							Account Information
						</h2>
						<div class="space-y-3">
							<div>
								<label class="block text-base font-medium leading-6 text-gray-900">
									Email
								</label>
								<p class="text-gray-900">{{ user.email }}</p>
							</div>
							<div>
								<label class="block text-base font-medium leading-6 text-gray-900">
									Account Type
								</label>
								<p v-if="isAdmin" class="text-green-600 text-sm font-bold">
									✓ ADMIN ACCESS
								</p>
								<p v-else class="text-gray-500 text-sm">Regular User</p>
							</div>
							<div>
								<label class="block text-base font-medium leading-6 text-gray-900">
									Account Created
								</label>
								<p class="text-gray-500 text-sm">
									{{ new Date(user.metadata.creationTime).toLocaleDateString() }}
								</p>
							</div>
							<div>
								<label class="block text-base font-medium leading-6 text-gray-900">
									Last Sign In
								</label>
								<p class="text-gray-500 text-sm">
									{{
										new Date(user.metadata.lastSignInTime).toLocaleDateString()
									}}
								</p>
							</div>
						</div>
					</div>

					<!-- Account Actions -->
					<div class="mb-8">
						<h2
							class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
							Account Actions
						</h2>
						<button
							@click="signOutOfFirebase"
							class="rounded-md bg-semantic-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
							Sign Out
						</button>
					</div>
				</div>
			</div>
		</div>
	</main>
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
