<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFirebaseAuth } from 'vuefire'
import { confirmPasswordReset } from '@firebase/auth'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/solid'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const auth = useFirebaseAuth()

// Form data
const form = ref({
	newPassword: '',
	confirmPassword: ''
})

// State management
const isLoading = ref(true)
const isProcessing = ref(false)
const isSuccess = ref(false)
const errorMessage = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isRedirecting = ref(false)

// Password requirements validation (match SignUpView)
const passwordValid = computed(() => {
	const pw = form.value.newPassword
	return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)
})

// Form validation
const isFormValid = computed(() => {
	return (
		form.value.newPassword.length >= 8 &&
		form.value.newPassword === form.value.confirmPassword &&
		form.value.confirmPassword.length > 0
	)
})

const buttonText = computed(() => {
	return isProcessing.value ? 'Resetting Password...' : 'Reset Password'
})

// Handle password reset
async function handlePasswordReset() {
	if (!isFormValid.value) return

	const oobCode = route.query.oobCode

	if (!oobCode) {
		errorMessage.value = 'Invalid reset link. Please request a new password reset.'
		return
	}

	isProcessing.value = true
	errorMessage.value = ''

	try {
		// Confirm the password reset
		await confirmPasswordReset(auth, oobCode, form.value.newPassword)
		isSuccess.value = true

		// Wait a moment to show success message, then redirect
		setTimeout(() => {
			isRedirecting.value = true
			// Redirect to sign in page with success message
			router.push({
				path: '/signin',
				query: { message: 'password-reset-success' }
			})
		}, 3000)
	} catch (error) {
		console.error('Password reset error:', error)

		switch (error.code) {
			case 'auth/invalid-action-code':
				errorMessage.value =
					'This reset link has expired or is invalid. Please request a new password reset.'
				break
			case 'auth/weak-password':
				errorMessage.value = 'Password is too weak. Please choose a stronger password.'
				break
			case 'auth/too-many-requests':
				errorMessage.value = 'Too many failed attempts. Please try again later.'
				break
			default:
				errorMessage.value =
					'An error occurred while resetting your password. Please try again.'
		}
	} finally {
		isProcessing.value = false
	}
}

// Handle manual navigation
function goToSignIn() {
	router.push('/signin')
}

function goToResetPassword() {
	router.push('/reset-password')
}

function clearError() {
	errorMessage.value = ''
}

function toggleNewPasswordVisibility() {
	showNewPassword.value = !showNewPassword.value
}

function toggleConfirmPasswordVisibility() {
	showConfirmPassword.value = !showConfirmPassword.value
}

// Check if we have a valid oobCode on mount
onMounted(() => {
	const oobCode = route.query.oobCode
	if (!oobCode) {
		errorMessage.value = 'Invalid reset link. Please request a new password reset.'
	}
	isLoading.value = false
})
</script>

<template>
	<div class="p-4 py-8 max-w-xl">
		<!-- Loading State -->
		<div v-if="isLoading" class="text-center">
			<div
				class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
				<svg
					class="animate-spin h-6 w-6 text-blue-600"
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
			</div>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Loading...</h1>
			<p class="text-gray-600">Please wait while we load the password reset form.</p>
		</div>

		<!-- Success State -->
		<div v-else-if="isSuccess" class="max-w-xl">
			<div class="mb-4 flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900">Password Reset!</h1>
				<CheckCircleIcon class="w-8 h-8 text-semantic-success" />
			</div>
			<p class="text-gray-600 mb-6">
				Your password has been successfully reset. You can now sign in with your new
				password.
			</p>

			<!-- Redirecting Message -->
			<div v-if="isRedirecting" class="mb-6">
				<p class="text-sm text-gray-500">Redirecting you to sign in...</p>
			</div>

			<!-- Action Buttons -->
			<div v-else class="flex flex-col items-start gap-3 mb-4">
				<BaseButton @click="goToSignIn" variant="primary">
					Sign In with New Password
				</BaseButton>
			</div>
		</div>

		<!-- Error State -->
		<div v-else-if="errorMessage && !route.query.oobCode" class="max-w-xl">
			<div class="mb-4 flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900">Invalid Reset Link</h1>
				<XCircleIcon class="w-8 h-8 text-semantic-danger" />
			</div>
			<p class="text-gray-600 mb-6">{{ errorMessage }}</p>

			<!-- Action Buttons -->
			<div class="flex flex-col items-start gap-3 mb-4">
				<BaseButton @click="goToResetPassword" variant="primary">
					Request New Reset Link
				</BaseButton>

				<p class="text-sm text-gray-500">
					Remember your password?
					<RouterLink to="/signin" class="text-gray-700 hover:text-opacity-80">
						<span class="underline">Go to Sign In</span>
					</RouterLink>
				</p>
			</div>
		</div>

		<!-- Password Reset Form -->
		<div v-else>
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
			</div>
			<div class="mb-8">
				<form @submit.prevent="handlePasswordReset" class="space-y-6">
					<!-- New Password Field -->
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
								:type="showNewPassword ? 'text' : 'password'"
								autocomplete="new-password"
								required
								v-model="form.newPassword"
								@input="clearError"
								minlength="8"
								class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
								placeholder="Enter your new password"
								:disabled="isProcessing" />
							<button
								type="button"
								@click="toggleNewPasswordVisibility"
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
								:disabled="isProcessing">
								<EyeSlashIcon
									v-if="showNewPassword"
									class="h-5 w-5 text-gray-400" />
								<EyeIcon v-else class="h-5 w-5 text-gray-400" />
								<span class="sr-only">
									{{ showNewPassword ? 'Hide password' : 'Show password' }}
								</span>
							</button>
						</div>
						<div class="mt-1 text-xs text-gray-500">
							Password must be at least 8 characters with uppercase, lowercase, and
							number
						</div>
						<div
							v-if="form.newPassword && !passwordValid"
							class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
							<XCircleIcon class="w-5 h-5" />
							Password is invalid
						</div>
					</div>
					<!-- Confirm Password Field -->
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
								:type="showConfirmPassword ? 'text' : 'password'"
								autocomplete="new-password"
								required
								v-model="form.confirmPassword"
								@input="clearError"
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
								:disabled="isProcessing" />
							<button
								type="button"
								@click="toggleConfirmPasswordVisibility"
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
								:disabled="isProcessing">
								<EyeSlashIcon
									v-if="showConfirmPassword"
									class="h-5 w-5 text-gray-400" />
								<EyeIcon v-else class="h-5 w-5 text-gray-400" />
								<span class="sr-only">
									{{ showConfirmPassword ? 'Hide password' : 'Show password' }}
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
					<!-- Submit Button -->
					<div class="pt-2">
						<BaseButton type="submit" variant="primary" :loading="isProcessing">
							{{ buttonText }}
						</BaseButton>
					</div>
					<!-- Back to Sign In Link -->
					<div class="pt-4">
						<p class="text-sm text-gray-500">
							Remember your password?
							<RouterLink to="/signin" class="text-gray-700 hover:text-opacity-80">
								<span class="underline">Sign in</span>
							</RouterLink>
						</p>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
