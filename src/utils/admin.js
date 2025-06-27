import { computed, ref, watch } from 'vue'
import { useCurrentUser } from 'vuefire'

// Composable for admin functionality using custom claims
export function useAdmin() {
	const user = useCurrentUser()
	const adminStatus = ref(false)
	const adminStatusLoaded = ref(false)

	// Watch for user changes and check admin status
	watch(
		user,
		async (newUser) => {
			if (newUser) {
				try {
					const idTokenResult = await newUser.getIdTokenResult()
					adminStatus.value = idTokenResult.claims.admin === true
					adminStatusLoaded.value = true
				} catch (error) {
					console.error('Error checking admin status:', error)
					adminStatus.value = false
					adminStatusLoaded.value = true
				}
			} else {
				adminStatus.value = false
				adminStatusLoaded.value = true
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

	return {
		user,
		isAdmin,
		adminStatusLoaded,
		canEditItems,
		canAddItems,
		canBulkUpdate,
		canViewMissingItems,
		canAccessAdmin
	}
}
