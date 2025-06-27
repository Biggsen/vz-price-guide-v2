<script setup>
import { useFirebaseAuth } from 'vuefire'
import { signOut } from '@firebase/auth'
import { useRouter } from 'vue-router'
import { useAdmin } from '../utils/admin.js'

const { user, isAdmin } = useAdmin()
const auth = useFirebaseAuth()
const router = useRouter()

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
	<div v-if="user?.email" class="p-4 pt-8 max-w-2xl mx-auto">
		<h1 class="text-3xl font-bold mb-6">Profile</h1>

		<div class="bg-gray-100 border border-gray-300 p-6 mb-6">
			<h2 class="text-xl font-semibold mb-4">Account Information</h2>
			<div class="space-y-3">
				<div>
					<label class="block text-sm font-medium text-gray-700">Email</label>
					<p class="text-gray-900">{{ user.email }}</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Account Type</label>
					<p v-if="isAdmin" class="text-green-600 text-sm font-bold">✓ ADMIN ACCESS</p>
					<p v-else class="text-gray-500 text-sm">Regular User</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Account Created</label>
					<p class="text-gray-500 text-sm">
						{{ new Date(user.metadata.creationTime).toLocaleDateString() }}
					</p>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Last Sign In</label>
					<p class="text-gray-500 text-sm">
						{{ new Date(user.metadata.lastSignInTime).toLocaleDateString() }}
					</p>
				</div>
			</div>
		</div>

		<div class="bg-gray-100 border border-gray-300 p-6">
			<h2 class="text-xl font-semibold mb-4">Account Actions</h2>
			<button
				@click="signOutOfFirebase"
				class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">
				Sign Out
			</button>
		</div>
	</div>

	<div v-else class="p-4 pt-8 max-w-2xl mx-auto">
		<h1 class="text-3xl font-bold mb-6">Profile</h1>
		<p class="text-gray-600">You need to be logged in to view your profile.</p>
		<router-link to="/login" class="text-blue-600 hover:underline">Login here</router-link>
	</div>
</template>
