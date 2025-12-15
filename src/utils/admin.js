import { computed, ref, watch } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useUserProfile } from './userProfile.js'

// Composable for admin functionality using custom claims
export function useAdmin() {
	const user = useCurrentUser()
	const adminStatus = ref(false)
	const adminStatusLoaded = ref(false)
	const shopManagerStatus = ref(false)
	const shopManagerStatusLoaded = ref(false)

	// Get user profile data
	const { userProfile } = useUserProfile(user.value?.uid)

	// Watch for user changes and check admin status
	watch(
		user,
		async (newUser) => {
			if (newUser) {
				try {
					const idTokenResult = await newUser.getIdTokenResult()
					adminStatus.value = idTokenResult.claims.admin === true
					// Shop manager access: public access for any verified user
					shopManagerStatus.value = newUser.emailVerified === true
					adminStatusLoaded.value = true
					shopManagerStatusLoaded.value = true
				} catch (error) {
					console.error('Error checking admin status:', error)
					adminStatus.value = false
					shopManagerStatus.value = false
					adminStatusLoaded.value = true
					shopManagerStatusLoaded.value = true
				}
			} else {
				adminStatus.value = false
				shopManagerStatus.value = false
				adminStatusLoaded.value = true
				shopManagerStatusLoaded.value = true
			}
		},
		{ immediate: true }
	)

	const isAdmin = computed(() => {
		return adminStatus.value
	})

	const canEditItems = computed(() => {
		return isAdmin.value
	})

	const canAddItems = computed(() => {
		return isAdmin.value
	})

	const canBulkUpdate = computed(() => {
		return isAdmin.value
	})

	const canViewMissingItems = computed(() => {
		return isAdmin.value
	})

	const canAccessAdmin = computed(() => {
		return isAdmin.value
	})

	const canAccessShopManager = computed(() => {
		return shopManagerStatus.value
	})

	// Combined user data
	const fullUserData = computed(() => {
		if (!user.value) return null

		return {
			// Firebase Auth data
			uid: user.value.uid,
			email: user.value.email,
			isAdmin: isAdmin.value,

			// User profile data
			minecraft_username: userProfile.value?.minecraft_username,
			display_name: userProfile.value?.display_name,
			minecraft_avatar_url: userProfile.value?.minecraft_avatar_url,
			profile_created_at: userProfile.value?.created_at,

			// Helper for display name
			displayName:
				userProfile.value?.display_name ||
				userProfile.value?.minecraft_username ||
				user.value.email.split('@')[0]
		}
	})

	return {
		user,
		userProfile,
		fullUserData,
		isAdmin,
		adminStatusLoaded,
		canEditItems,
		canAddItems,
		canBulkUpdate,
		canViewMissingItems,
		canAccessAdmin,
		canAccessShopManager,
		shopManagerStatusLoaded
	}
}
