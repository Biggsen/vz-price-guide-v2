import { computed } from 'vue'
import { useCurrentUser } from 'vuefire'
import { ADMIN_UIDS } from '../constants.js'

// Composable for admin functionality
export function useAdmin() {
	const user = useCurrentUser()

	const isAdmin = computed(() => {
		return user.value && ADMIN_UIDS.includes(user.value.uid)
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
		canEditItems,
		canAddItems,
		canBulkUpdate,
		canViewMissingItems,
		canAccessAdmin
	}
}
