<script setup>
import { ref, computed, watch } from 'vue'
import { useFirebaseAuth } from 'vuefire'
import { signOut } from '@firebase/auth'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeftStartOnRectangleIcon } from '@heroicons/vue/24/outline'
import { useAdmin } from '../utils/admin.js'
import {
	useUserProfile,
	createUserProfile,
	updateUserProfile,
	isMinecraftUsernameTaken
} from '../utils/userProfile.js'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/vue/24/solid'

const { user, isAdmin } = useAdmin()
const auth = useFirebaseAuth()
const router = useRouter()
const route = useRoute()

// Use the existing composable for user profile
const { userProfile } = useUserProfile(user.value?.uid)

// User profile state
const editingProfile = ref(false)
const successMessage = ref('')
const minecraftUsernameError = ref('')

// Check for success message from query parameter
if (route.query.message === 'password-updated') {
	successMessage.value = 'Password updated successfully.'
	// Clear the query parameter
	router.replace({ path: '/account', query: {} })
}
// Reload user if just verified email
if (route.query.message === 'email-verified' && auth.currentUser) {
	auth.currentUser.reload().then(() => {
		successMessage.value = 'Email verified successfully.'
		// Clear the query parameter
		router.replace({ path: '/account', query: {} })
	})
}

// Profile form data
const profileForm = ref({
	minecraft_username: '',
	display_name: '',
	bio: '' // Optional bio field
})

// Checkbox state for using minecraft username as display name
const useMinecraftUsername = ref(false)

// State for showing create profile form
const showCreateProfileForm = ref(false)

// Derived state helpers
const isVerified = computed(() => !!user.value?.emailVerified)
const showProfileForm = computed(() => editingProfile.value || showCreateProfileForm.value)
const profileFormMode = computed(() =>
	editingProfile.value ? 'edit' : showCreateProfileForm.value ? 'create' : null
)

// Computed property for profile exists
const profileExists = computed(() => {
	return userProfile.value != null
})

// Watch for user changes to update the composable
watch(
	user,
	(newUser) => {
		// The useUserProfile composable will automatically handle the profile loading
		// when the userId changes
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
				display_name: newProfile.display_name || '',
				bio: newProfile.bio || ''
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

// Build trimmed payload from form
function buildProfilePayload() {
	const username = profileForm.value.minecraft_username.trim()
	const displayName =
		profileForm.value.display_name.trim() || profileForm.value.minecraft_username.trim()
	const bio = profileForm.value.bio.trim() || ''
	return { username, displayName, bio }
}

// Create or update profile with shared validation
async function saveProfile() {
	if (!user.value?.uid || !profileForm.value.minecraft_username.trim()) return

	minecraftUsernameError.value = ''
	const { username, displayName, bio } = buildProfilePayload()

	const taken = await isMinecraftUsernameTaken(
		username,
		profileExists.value ? user.value.uid : null
	)
	if (taken) {
		minecraftUsernameError.value = 'That Minecraft username is already in use.'
		return
	}

	try {
		if (profileExists.value) {
			await updateUserProfile(user.value.uid, {
				display_name: displayName,
				bio,
				minecraft_username: username
			})
			editingProfile.value = false
		} else {
			await createUserProfile(user.value.uid, {
				minecraft_username: username,
				display_name: displayName,
				bio
			})
			editingProfile.value = false
			showCreateProfileForm.value = false
		}
		// The composable will automatically update userProfile.value
	} catch (error) {
		console.error('Error saving profile:', error)
		alert('Failed to save profile. Please try again.')
	}
}

// Cancel editing profile
function cancelEditProfile() {
	editingProfile.value = false
	if (userProfile.value) {
		profileForm.value.display_name = userProfile.value.display_name || ''
		useMinecraftUsername.value =
			userProfile.value.display_name === userProfile.value.minecraft_username
	}
}

// Unified cancel for both create and edit modes
function cancelProfileForm() {
	if (profileExists.value) {
		// cancel edit
		cancelEditProfile()
	} else {
		// cancel create
		showCreateProfileForm.value = false
		minecraftUsernameError.value = ''
	}
}

// Removed separate Minecraft edit canceler; unified in save/cancel handlers

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
	<div class="p-4 py-8 max-w-4xl">
		<div v-if="user?.email">
			<h1 class="text-3xl font-bold mb-6">Account</h1>

			<!-- Success Message (verified only) -->
			<div
				v-if="isVerified && successMessage"
				class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<CheckCircleIcon class="h-5 w-5 text-green-400" />
					</div>
					<div class="ml-3">
						<p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
					</div>
					<div class="ml-auto pl-3">
						<button
							@click="successMessage = ''"
							class="text-green-400 hover:text-green-600">
							<XMarkIcon class="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>

			<!-- Account Information (single source with conditional bits) -->
			<div class="mb-8">
				<h2
					class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
					Account Information
				</h2>
				<div class="space-y-3">
					<div>
						<label class="block text-base font-medium leading-6 text-gray-900">
							Email
							<span
								v-if="!isVerified"
								data-cy="email-unverified"
								class="text-yellow-700">
								(unverified)
							</span>
						</label>
						<p class="text-gray-900">{{ user.email }}</p>
						<button
							v-if="!isVerified"
							@click="auth.currentUser?.sendEmailVerification()"
							class="mt-2 rounded-md bg-gray-asparagus px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
							Resend Verification Email
						</button>
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
							{{ new Date(user.metadata.lastSignInTime).toLocaleDateString() }}
						</p>
					</div>
				</div>
			</div>

			<!-- Profile Section -->
			<div class="mb-8">
				<h2
					class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
					Profile
				</h2>

				<!-- Unverified users cannot manage profile yet -->
				<div v-if="!isVerified" class="text-gray-700 text-base">
					You can create your profile after verifying your email address.
				</div>

				<!-- Loading while fetching profile (verified only) -->
				<div v-else-if="userProfile === undefined && user?.uid" class="text-center py-8">
					<p class="text-gray-600">Loading profile...</p>
				</div>

				<!-- Unified Profile Form (create or edit) -->
				<form v-else-if="showProfileForm" @submit.prevent="saveProfile" class="space-y-4">
					<div>
						<label
							for="profile_minecraft_username"
							class="block text-base font-medium leading-6 text-gray-900">
							Minecraft Username *
						</label>
						<input
							type="text"
							id="profile_minecraft_username"
							v-model="profileForm.minecraft_username"
							required
							placeholder="Your Minecraft username"
							class="block w-full md:w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus" />
						<p v-if="minecraftUsernameError" class="text-red-500 text-sm mt-1">
							{{ minecraftUsernameError }}
						</p>
					</div>
					<div>
						<label
							for="profile_display_name"
							class="block text-base font-medium leading-6 text-gray-900">
							Display Name *
						</label>
						<input
							type="text"
							id="profile_display_name"
							v-model="profileForm.display_name"
							required
							:disabled="useMinecraftUsername"
							placeholder="How others will see your name"
							class="block w-full md:w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus disabled:bg-gray-100 disabled:text-gray-500" />
					</div>
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="profile_use_minecraft_username"
							v-model="useMinecraftUsername"
							class="checkbox-input" />
						<label
							for="profile_use_minecraft_username"
							class="text-base font-medium leading-6 text-gray-900">
							Use Minecraft Username as Display Name
						</label>
					</div>
					<div>
						<label
							for="profile_bio"
							class="block text-base font-medium leading-6 text-gray-900">
							Bio (optional)
						</label>
						<textarea
							id="profile_bio"
							v-model="profileForm.bio"
							placeholder="Tell us a little about yourself..."
							class="block w-full md:w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus min-h-[120px]" />
					</div>
					<div class="flex space-x-3">
						<button
							type="submit"
							class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
							{{ profileFormMode === 'edit' ? 'Save Changes' : 'Create Profile' }}
						</button>
						<button
							type="button"
							@click="cancelProfileForm"
							class="rounded-md bg-gray-200 text-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-300 transition">
							Cancel
						</button>
					</div>
				</form>

				<!-- Existing profile display (verified) -->
				<div v-else-if="profileExists" class="space-y-3">
					<div class="flex items-center space-x-4">
						<img
							v-if="userProfile?.minecraft_avatar_url"
							:src="userProfile.minecraft_avatar_url"
							:alt="userProfile.minecraft_username"
							class="w-10 h-10 rounded"
							@error="$event.target.style.display = 'none'" />
						<div>
							<label class="block text-base font-medium leading-6 text-gray-900">
								Minecraft Username
							</label>
							<p class="text-gray-900 font-mono">
								{{ userProfile?.minecraft_username || 'Not set' }}
							</p>
						</div>
					</div>
					<div>
						<label class="block text-base font-medium leading-6 text-gray-900">
							Display Name
						</label>
						<p class="text-gray-900">
							{{ userProfile?.display_name || 'Not set' }}
						</p>
					</div>
					<div class="mt-2 mb-8">
						<label class="block text-base font-medium leading-6 text-gray-900">
							Bio
						</label>
						<p class="text-gray-700 whitespace-pre-line">
							{{ userProfile?.bio ? userProfile.bio : 'No bio' }}
						</p>
					</div>
					<button
						@click="editingProfile = true"
						:disabled="editingProfile"
						class="rounded-md bg-semantic-info px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 mt-4">
						Edit Profile
					</button>
				</div>

				<!-- No profile yet (verified) -->
				<div v-else>
					<p class="text-gray-700 text-base mb-4">You have not created a profile yet.</p>
					<button
						@click="showCreateProfileForm = true"
						class="rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
						Create Profile
					</button>
				</div>
			</div>

			<!-- Account Actions (single source; show change password only when verified) -->
			<div class="mb-8">
				<h2
					class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
					Account Actions
				</h2>
				<div class="flex space-x-3">
					<RouterLink
						v-if="isVerified"
						to="/change-password"
						class="rounded-md bg-semantic-info px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
						Change Password
					</RouterLink>
					<button
						data-cy="sign-out-button"
						@click="signOutOfFirebase"
						class="rounded-md bg-semantic-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center">
						<ArrowLeftStartOnRectangleIcon class="w-4 h-4 inline mr-1" />
						Sign Out
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
