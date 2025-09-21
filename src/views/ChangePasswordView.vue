<script setup>
import { ref, computed } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from '@firebase/auth'
import { useRouter } from 'vue-router'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/solid'
import BaseButton from '@/components/BaseButton.vue'

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

const passwordValid = computed(() => {
	const pw = form.value.newPassword
	return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)
})

const isFormValid = computed(() => {
	return (
		form.value.currentPassword.length >= 6 &&
		passwordValid.value &&
		form.value.newPassword === form.value.confirmPassword &&
		form.value.confirmPassword.length > 0
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
		// Redirect to account page with success message
		router.push({ path: '/account', query: { message: 'password-updated' } })
	} catch (error) {
		switch (error.code) {
			case 'auth/wrong-password':
				errorMessage.value = 'Current password is incorrect.'
				break
			case 'auth/weak-password':
				errorMessage.value = 'Password is too weak. Please choose a stronger password.'
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
							data-cy="change-password-current"
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
							<span class="sr-only">
								{{ showCurrent ? 'Hide password' : 'Show password' }}
							</span>
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
							data-cy="change-password-new"
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
							<span class="sr-only">
								{{ showNew ? 'Hide password' : 'Show password' }}
							</span>
						</button>
					</div>
					<div class="mt-1 text-xs text-gray-500">
						Password must be at least 8 characters with uppercase, lowercase, and number
					</div>
					<div
						v-if="form.newPassword && !passwordValid"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-5 h-5" />
						Password is invalid
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
							data-cy="change-password-confirm"
							class="block w-full sm:w-80 rounded border-2 px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
							:class="{
								'border-gray-asparagus':
									form.confirmPassword === form.newPassword ||
									form.confirmPassword === '',
								'border-red-500':
									form.confirmPassword !== '' &&
									form.confirmPassword !== form.newPassword
							}"
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
							<span class="sr-only">
								{{ showConfirm ? 'Hide password' : 'Show password' }}
							</span>
						</button>
					</div>
					<div v-if="form.confirmPassword" class="mt-1">
						<span
							class="text-sm font-semibold flex items-center gap-1"
							:class="
								form.confirmPassword === form.newPassword
									? 'text-green-600'
									: 'text-red-600'
							">
							<template v-if="form.confirmPassword === form.newPassword">
								<CheckCircleIcon class="w-5 h-5" />
								Passwords match
							</template>
							<template v-else>
								<XCircleIcon class="w-5 h-5" />
								Passwords do not match
							</template>
						</span>
					</div>
				</div>
				<div class="pt-2 flex gap-3">
					<BaseButton
						type="submit"
						variant="primary"
						:loading="isLoading"
						data-cy="change-password-submit">
						{{ buttonText }}
					</BaseButton>
					<BaseButton
						type="button"
						variant="tertiary"
						@click="router.push('/account')"
						:disabled="isLoading">
						Cancel
					</BaseButton>
				</div>
			</form>
		</div>
	</div>
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
