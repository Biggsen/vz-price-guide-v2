<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useCollection } from 'vuefire'
import { collection, query, orderBy, getFirestore, doc, getDoc } from 'firebase/firestore'
import { useAdmin } from '../utils/admin.js'
import { updateShopManagerAccess } from '../utils/accessManagement.js'
import BaseButton from '../components/BaseButton.vue'
import BaseCard from '../components/BaseCard.vue'
import { getAuth } from 'firebase/auth'

const { isAdmin, user: currentUser } = useAdmin()
const db = getFirestore()
const auth = getAuth()

// Get all users
const usersQuery = query(collection(db, 'users'), orderBy('created_at', 'desc'))
const users = useCollection(usersQuery)

// Track which users have shop manager access (stored in Firestore)
const userAccessMap = ref({})
const updatingUsers = ref(new Set())
const error = ref(null)
const successMessage = ref(null)

// Check if a user is admin (we'll need to check their token)
async function checkUserAdminStatus(userId) {
	try {
		// We can't directly check other users' claims from frontend
		// For now, we'll assume admins are set via custom claims
		// This would require a Cloud Function to get all user claims
		// For simplicity, we'll just check if the user has shopManager in Firestore
		return false // Placeholder - would need backend function
	} catch (err) {
		console.error('Error checking admin status:', err)
		return false
	}
}

// Get shop manager status from Firestore (we'll store it there for display)
function hasShopManagerAccess(userId) {
	// Check Firestore first
	if (userAccessMap.value[userId] !== undefined) {
		return userAccessMap.value[userId].shopManager === true
	}
	return false
}

// Get admin status (we'll need to check this differently)
function isUserAdmin(userId) {
	// For now, we can't easily check other users' admin status from frontend
	// This would require a Cloud Function
	// We'll show it as unknown/not admin for now
	return false
}

async function toggleShopManagerAccess(userId, currentStatus) {
	if (!isAdmin.value) return

	updatingUsers.value.add(userId)
	error.value = null
	successMessage.value = null

	try {
		const newStatus = !currentStatus

		// Update custom claims via Cloud Function (also updates Firestore)
		await updateShopManagerAccess(userId, newStatus)

		// Update local state
		userAccessMap.value[userId] = {
			...userAccessMap.value[userId],
			shopManager: newStatus
		}

		successMessage.value = `Shop manager access ${newStatus ? 'granted' : 'revoked'} successfully.`
		setTimeout(() => {
			successMessage.value = null
		}, 3000)
	} catch (err) {
		console.error('Error updating shop manager access:', err)
		error.value = err.message || 'Failed to update access. Please try again.'
	} finally {
		updatingUsers.value.delete(userId)
	}
}

function getUserDisplayName(user) {
	return user.display_name || user.minecraft_username || user.email?.split('@')[0] || 'Unknown'
}

// Load shop manager status from Firestore
function loadUserAccess() {
	if (!users.value) return

	for (const user of users.value) {
		const userId = user.id || user.__id__
		if (!userId) continue

		// Check the user object directly first (from the collection)
		if (user.shopManager !== undefined) {
			userAccessMap.value[userId] = {
				...userAccessMap.value[userId],
				shopManager: user.shopManager === true
			}
		} else {
			// Fallback: check Firestore document
			const userRef = doc(db, 'users', userId)
			getDoc(userRef)
				.then((userDoc) => {
					if (userDoc.exists()) {
						const data = userDoc.data()
						userAccessMap.value[userId] = {
							...userAccessMap.value[userId],
							shopManager: data.shopManager === true,
							admin: data.admin === true
						}
					}
				})
				.catch((err) => {
					console.error(`Error loading access for user ${userId}:`, err)
				})
		}
	}
}

// Watch for changes to users collection
watch(users, () => {
	loadUserAccess()
}, { immediate: true })

onMounted(() => {
	loadUserAccess()
})
</script>

<template>
	<div class="p-4 pt-8">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Access Management</h1>
			<p class="text-gray-600">
				Manage shop manager access for users. Admins automatically have access.
			</p>
		</div>

		<div v-if="error" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
			{{ error }}
		</div>

		<div v-if="successMessage" class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
			{{ successMessage }}
		</div>

		<BaseCard variant="tertiary" class="w-1/3">
			<template #header>
				<h2 class="text-xl font-semibold text-gray-900">Users</h2>
			</template>
			<template #body>
				<div class="space-y-4">
					<div
						v-for="user in users"
						:key="user.id || user.__id__"
						class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
						<div class="flex items-center gap-4">
							<img
								v-if="user.minecraft_avatar_url"
								:src="user.minecraft_avatar_url"
								:alt="getUserDisplayName(user)"
								class="w-10 h-10 rounded"
								@error="$event.target.style.display = 'none'" />
							<div
								v-else
								class="w-10 h-10 bg-gray-300 rounded flex items-center justify-center text-sm font-bold">
								{{ getUserDisplayName(user).charAt(0).toUpperCase() }}
							</div>
							<div>
								<div class="font-medium text-gray-900">
									{{ getUserDisplayName(user) }}
								</div>
								<div v-if="user.minecraft_username" class="text-sm text-gray-500">
									@{{ user.minecraft_username }}
								</div>
							</div>
							<div class="flex gap-2">
								<span
									v-if="isUserAdmin(user.id || user.__id__)"
									class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
									Admin
								</span>
								<span
									v-if="hasShopManagerAccess(user.id || user.__id__)"
									class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
									Shop Manager
								</span>
							</div>
						</div>
						<div>
							<BaseButton
								v-if="!isUserAdmin(user.id || user.__id__)"
								@click="toggleShopManagerAccess(user.id || user.__id__, hasShopManagerAccess(user.id || user.__id__))"
								:disabled="updatingUsers.has(user.id || user.__id__)"
								:variant="hasShopManagerAccess(user.id || user.__id__) ? 'secondary' : 'primary'">
								{{ updatingUsers.has(user.id || user.__id__)
									? 'Updating...'
									: hasShopManagerAccess(user.id || user.__id__)
										? 'Revoke Access'
										: 'Grant Access' }}
							</BaseButton>
							<span v-else class="text-sm text-gray-500 italic">
								Admin (automatic access)
							</span>
						</div>
					</div>
					<div v-if="!users || users.length === 0" class="text-center text-gray-500 py-8">
						No users found.
					</div>
				</div>
			</template>
		</BaseCard>
	</div>
</template>

