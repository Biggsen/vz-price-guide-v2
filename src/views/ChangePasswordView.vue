<script setup>
import { ref, computed } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from '@firebase/auth'
import { useRouter } from 'vue-router'

const auth = useFirebaseAuth()
const currentUser = useCurrentUser()
const router = useRouter()

const form = ref({
	currentPassword: '',
	newPassword: '',
	confirmPassword: ''
})

const isLoading = ref(false)
const errorMessage = ref('')
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const isFormValid = computed(() => {
	return (
		form.value.currentPassword.length >= 6 &&
		form.value.newPassword.length >= 8 &&
		/[A-Z]/.test(form.value.newPassword) &&
		/[a-z]/.test(form.value.newPassword) &&
		/\d/.test(form.value.newPassword) &&
		form.value.newPassword === form.value.confirmPassword
	)
})

const buttonText = computed(() => (isLoading.value ? 'Updating...' : 'Change Password'))

async function handleChangePassword() {
	if (!isFormValid.value || !currentUser.value) return
	isLoading.value = true
	errorMessage.value = ''
	try {
		// Re-authenticate
		const credential = EmailAuthProvider.credential(
			currentUser.value.email,
			form.value.currentPassword
		)
		await reauthenticateWithCredential(currentUser.value, credential)
		// Update password
		await updatePassword(currentUser.value, form.value.newPassword)
		// Redirect to profile page with success message
		router.push({ path: '/profile', query: { message: 'password-updated' } })
	} catch (error) {
		switch (error.code) {
			case 'auth/wrong-password':
				errorMessage.value = 'Current password is incorrect.'
				break
			case 'auth/weak-password':
				errorMessage.value = 'New password is too weak.'
				break
			case 'auth/too-many-requests':
				errorMessage.value = 'Too many attempts. Please try again later.'
				break
			default:
				errorMessage.value = 'Failed to update password. Please try again.'
		}
	} finally {
		isLoading.value = false
	}
}

function clearError() {
	errorMessage.value = ''
}
</script>

<template>
	<div class="p-4 py-8 max-w-4xl">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Change Password</h1>
			<p class="text-gray-600">
				Update your account password. You will need your current password to proceed.
			</p>
		</div>

		<div v-if="errorMessage" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd" />
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
				</div>
				<div class="ml-auto pl-3">
					<button @click="clearError" class="text-red-400 hover:text-red-600">
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<div class="mb-8">
			<h3
				class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
				Change Your Password
			</h3>
			<form @submit.prevent="handleChangePassword" class="space-y-6">
				<div>
					<label
						for="currentPassword"
						class="block text-base font-medium leading-6 text-gray-900">
						Current Password
					</label>
					<div class="relative mt-2 mb-2 w-full sm:w-80">
						<input
							id="currentPassword"
							name="currentPassword"
							:type="showCurrent ? 'text' : 'password'"
							v-model="form.currentPassword"
							@input="clearError"
							required
							class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
							placeholder="Enter your current password"
							:disabled="isLoading" />
						<button
							type="button"
							@click="showCurrent = !showCurrent"
							class="absolute inset-y-0 right-0 pr-3 flex items-center"
							:disabled="isLoading">
							<svg
								v-if="showCurrent"
								class="h-5 w-5 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
							</svg>
							<svg
								v-else
								class="h-5 w-5 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z" />
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
						</button>
					</div>
				</div>
				<div>
					<label
						for="newPassword"
						class="block text-base font-medium leading-6 text-gray-900">
						New Password
					</label>
					<div class="relative mt-2 mb-2 w-full sm:w-80">
						<input
							id="newPassword"
							name="newPassword"
							:type="showNew ? 'text' : 'password'"
							v-model="form.newPassword"
							@input="clearError"
							required
							class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
							placeholder="Enter your new password"
							:disabled="isLoading" />
						<button
							type="button"
							@click="showNew = !showNew"
							class="absolute inset-y-0 right-0 pr-3 flex items-center"
							:disabled="isLoading">
							<svg
								v-if="showNew"
								class="h-5 w-5 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
							</svg>
							<svg
								v-else
								class="h-5 w-5 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z" />
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
						</button>
					</div>
				</div>
				<div>
					<label
						for="confirmPassword"
						class="block text-base font-medium leading-6 text-gray-900">
						Confirm New Password
					</label>
					<div class="relative mt-2 mb-2 w-full sm:w-80">
						<input
							id="confirmPassword"
							name="confirmPassword"
							:type="showConfirm ? 'text' : 'password'"
							v-model="form.confirmPassword"
							@input="clearError"
							required
							class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
							placeholder="Confirm your new password"
							:disabled="isLoading" />
						<button
							type="button"
							@click="showConfirm = !showConfirm"
							class="absolute inset-y-0 right-0 pr-3 flex items-center"
							:disabled="isLoading">
							<svg
								v-if="showConfirm"
								class="h-5 w-5 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
							</svg>
							<svg
								v-else
								class="h-5 w-5 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z" />
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
						</button>
					</div>
				</div>
				<div class="pt-2">
					<button
						type="submit"
						:disabled="!isFormValid || isLoading"
						class="rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
						<svg
							v-if="isLoading"
							class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						{{ buttonText }}
					</button>
				</div>
				<div class="text-left pt-4">
					<p class="text-sm text-gray-500">
						<RouterLink to="/profile" class="text-semantic-info hover:text-opacity-80">
							<span class="underline">Back to Profile</span>
						</RouterLink>
					</p>
				</div>
			</form>
		</div>
		<div class="border-t border-gray-200 pt-6">
			<p class="text-sm text-gray-500">
				Passwords must be at least 8 characters and include an uppercase letter, a lowercase
				letter, and a number.
			</p>
		</div>
	</div>
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
