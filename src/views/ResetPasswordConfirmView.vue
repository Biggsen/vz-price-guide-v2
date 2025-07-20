<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFirebaseAuth } from 'vuefire'
import { confirmPasswordReset } from '@firebase/auth'

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

// Password strength validation
const passwordStrength = computed(() => {
	const password = form.value.newPassword
	if (!password) return { score: 0, label: '', color: '' }

	let score = 0
	const checks = {
		length: password.length >= 8,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		number: /\d/.test(password)
	}

	score += checks.length ? 1 : 0
	score += checks.uppercase ? 1 : 0
	score += checks.lowercase ? 1 : 0
	score += checks.number ? 1 : 0

	if (score === 0) return { score: 0, label: 'Very Weak', color: 'text-red-500' }
	if (score === 1) return { score: 1, label: 'Weak', color: 'text-orange-500' }
	if (score === 2) return { score: 2, label: 'Fair', color: 'text-yellow-500' }
	if (score === 3) return { score: 3, label: 'Good', color: 'text-blue-500' }
	if (score === 4) return { score: 4, label: 'Strong', color: 'text-green-500' }
})

// Form validation
const isFormValid = computed(() => {
	return (
		form.value.newPassword.length >= 8 &&
		passwordStrength.value.score >= 3 &&
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
	<div class="p-4 py-8 max-w-4xl">
		<div class="max-w-md mx-auto">
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
			<div v-else-if="isSuccess" class="text-center">
				<div
					class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
					<svg
						class="h-6 w-6 text-green-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Password Reset!</h1>
				<p class="text-gray-600 mb-6">
					Your password has been successfully reset. You can now sign in with your new
					password.
				</p>

				<!-- Redirecting Message -->
				<div v-if="isRedirecting" class="mb-6">
					<p class="text-sm text-gray-500">Redirecting you to sign in...</p>
				</div>

				<!-- Action Buttons -->
				<div v-else class="space-y-3">
					<button
						@click="goToSignIn"
						class="w-full rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">
						Sign In with New Password
					</button>
				</div>
			</div>

			<!-- Error State -->
			<div v-else-if="errorMessage && !route.query.oobCode" class="text-center">
				<div
					class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
					<svg
						class="h-6 w-6 text-red-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12" />
					</svg>
				</div>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
				<p class="text-gray-600 mb-6">{{ errorMessage }}</p>

				<!-- Action Buttons -->
				<div class="space-y-3">
					<button
						@click="goToResetPassword"
						class="w-full rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">
						Request New Reset Link
					</button>

					<button
						@click="goToSignIn"
						class="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">
						Go to Sign In
					</button>
				</div>
			</div>

			<!-- Password Reset Form -->
			<div v-else>
				<!-- Header -->
				<div class="text-center mb-8">
					<div
						class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
						<svg
							class="h-6 w-6 text-blue-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
						</svg>
					</div>
					<h1 class="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
					<p class="text-gray-600">
						Enter your new password below to complete the reset process.
					</p>
				</div>

				<!-- Error Message -->
				<div
					v-if="errorMessage"
					class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg
								class="h-5 w-5 text-red-400"
								viewBox="0 0 20 20"
								fill="currentColor">
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

				<!-- Form -->
				<form @submit.prevent="handlePasswordReset" class="space-y-6">
					<!-- New Password Field -->
					<div>
						<label
							for="newPassword"
							class="block text-base font-medium leading-6 text-gray-900">
							New Password
						</label>
						<div class="relative mt-2">
							<input
								id="newPassword"
								name="newPassword"
								:type="showNewPassword ? 'text' : 'password'"
								autocomplete="new-password"
								required
								v-model="form.newPassword"
								@input="clearError"
								class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
								placeholder="Enter your new password"
								:disabled="isProcessing" />
							<button
								type="button"
								@click="toggleNewPasswordVisibility"
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
								:disabled="isProcessing">
								<svg
									v-if="showNewPassword"
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

						<!-- Password Strength Indicator -->
						<div v-if="form.newPassword" class="mt-2">
							<div class="flex items-center space-x-2">
								<div class="flex space-x-1">
									<div
										v-for="i in 4"
										:key="i"
										class="h-1 w-8 rounded"
										:class="{
											'bg-red-500': passwordStrength.score >= i,
											'bg-gray-200': passwordStrength.score < i
										}"></div>
								</div>
								<span :class="passwordStrength.color" class="text-xs font-medium">
									{{ passwordStrength.label }}
								</span>
							</div>
						</div>
					</div>

					<!-- Confirm Password Field -->
					<div>
						<label
							for="confirmPassword"
							class="block text-base font-medium leading-6 text-gray-900">
							Confirm New Password
						</label>
						<div class="relative mt-2">
							<input
								id="confirmPassword"
								name="confirmPassword"
								:type="showConfirmPassword ? 'text' : 'password'"
								autocomplete="new-password"
								required
								v-model="form.confirmPassword"
								@input="clearError"
								class="block w-full rounded border-2 px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
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
								<svg
									v-if="showConfirmPassword"
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

						<!-- Password Match Indicator -->
						<div v-if="form.confirmPassword" class="mt-1">
							<span
								class="text-xs"
								:class="
									form.confirmPassword === form.newPassword
										? 'text-green-600'
										: 'text-red-600'
								">
								{{
									form.confirmPassword === form.newPassword
										? '✓ Passwords match'
										: '✗ Passwords do not match'
								}}
							</span>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="pt-2">
						<button
							type="submit"
							:disabled="!isFormValid || isProcessing"
							class="w-full rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
							<svg
								v-if="isProcessing"
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

					<!-- Back to Sign In Link -->
					<div class="text-center pt-4">
						<p class="text-sm text-gray-500">
							Remember your password?
							<RouterLink
								to="/signin"
								class="text-semantic-info hover:text-opacity-80">
								<span class="underline">Sign in</span>
							</RouterLink>
						</p>
					</div>
				</form>
			</div>

			<!-- Additional Info -->
			<div class="text-center mt-8">
				<p class="text-sm text-gray-500">
					Need help? Contact us at
					<a
						href="mailto:support@minecraft-economy-price-guide.net"
						class="text-semantic-info hover:text-opacity-80 underline">
						support@minecraft-economy-price-guide.net
					</a>
				</p>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
