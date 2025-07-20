<script setup>
import { ref, computed } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { useRouter } from 'vue-router'
import { createUserWithEmailAndPassword, sendEmailVerification } from '@firebase/auth'

const userInput = ref({
	email: '',
	password: '',
	confirmPassword: ''
})

const auth = useFirebaseAuth()
const currentUser = useCurrentUser()
const router = useRouter()

// State management
const isLoading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const termsAccepted = ref(false)

// Password strength validation
const passwordStrength = computed(() => {
	const password = userInput.value.password
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

// Computed properties
const isFormValid = computed(() => {
	const emailValid =
		userInput.value.email.trim() !== '' &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInput.value.email)
	const passwordValid = userInput.value.password.length >= 8 && passwordStrength.value.score >= 3
	const passwordsMatch = userInput.value.password === userInput.value.confirmPassword
	const confirmPasswordFilled = userInput.value.confirmPassword.length > 0

	return (
		emailValid &&
		passwordValid &&
		passwordsMatch &&
		confirmPasswordFilled &&
		termsAccepted.value
	)
})

const buttonText = computed(() => {
	return isLoading.value ? 'Creating Account...' : 'Create Account'
})

async function signUpToFirebase() {
	if (!isFormValid.value) return

	isLoading.value = true
	errorMessage.value = ''

	try {
		// Create user account
		const userCredential = await createUserWithEmailAndPassword(
			auth,
			userInput.value.email,
			userInput.value.password
		)

		// Send email verification
		await sendEmailVerification(userCredential.user)

		// Redirect to email verification page
		router.push('/verify-email')
	} catch (error) {
		console.error('Sign up error:', error.code, error.message)

		// User-friendly error messages
		switch (error.code) {
			case 'auth/invalid-email':
				errorMessage.value = 'Please enter a valid email address.'
				break
			case 'auth/email-already-in-use':
				errorMessage.value = 'An account with this email address already exists.'
				break
			case 'auth/weak-password':
				errorMessage.value = 'Password is too weak. Please choose a stronger password.'
				break
			case 'auth/operation-not-allowed':
				errorMessage.value =
					'Email/password accounts are not enabled. Please contact support.'
				break
			case 'auth/too-many-requests':
				errorMessage.value = 'Too many failed attempts. Please try again later.'
				break
			default:
				errorMessage.value =
					'An error occurred while creating your account. Please try again.'
		}
	} finally {
		isLoading.value = false
	}
}

function togglePasswordVisibility() {
	showPassword.value = !showPassword.value
}

function toggleConfirmPasswordVisibility() {
	showConfirmPassword.value = !showConfirmPassword.value
}

function clearError() {
	errorMessage.value = ''
}
</script>

<template>
	<div class="p-4 py-8 max-w-4xl">
		<!-- Sign Up Form -->
		<div v-if="!currentUser?.email || !currentUser?.emailVerified">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
			</div>

			<!-- Error Message -->
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

			<!-- Form Section -->
			<div class="mb-8">
				<h3
					class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
					Account Information
				</h3>

				<form @submit.prevent="signUpToFirebase" class="space-y-6">
					<!-- Email Field -->
					<div>
						<label
							for="email"
							class="block text-base font-medium leading-6 text-gray-900">
							Email Address
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							v-model="userInput.email"
							@input="clearError"
							class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
							placeholder="Enter your email address"
							:disabled="isLoading" />
					</div>

					<!-- Password Field -->
					<div>
						<label
							for="password"
							class="block text-base font-medium leading-6 text-gray-900">
							Password
						</label>
						<div class="relative mt-2 mb-2 w-full sm:w-80">
							<input
								id="password"
								name="password"
								:type="showPassword ? 'text' : 'password'"
								autocomplete="new-password"
								required
								v-model="userInput.password"
								@input="clearError"
								class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
								placeholder="Create a password"
								:disabled="isLoading" />
							<button
								type="button"
								@click="togglePasswordVisibility"
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
								:disabled="isLoading">
								<svg
									v-if="showPassword"
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
						<div v-if="userInput.password" class="mt-2">
							<div class="flex items-center space-x-2">
								<div class="flex space-x-1">
									<div
										v-for="i in 4"
										:key="i"
										class="h-2 w-8 rounded"
										:class="{
											'bg-red-500': passwordStrength.score >= i,
											'bg-gray-200': passwordStrength.score < i
										}"></div>
								</div>
								<span :class="passwordStrength.color" class="text-sm font-medium">
									{{ passwordStrength.label }}
								</span>
							</div>
							<div class="mt-1 text-xs text-gray-500">
								Password must be at least 8 characters with uppercase, lowercase,
								and number
							</div>
						</div>
					</div>

					<!-- Confirm Password Field -->
					<div>
						<label
							for="confirmPassword"
							class="block text-base font-medium leading-6 text-gray-900">
							Confirm Password
						</label>
						<div class="relative mt-2 mb-2 w-full sm:w-80">
							<input
								id="confirmPassword"
								name="confirmPassword"
								:type="showConfirmPassword ? 'text' : 'password'"
								autocomplete="new-password"
								required
								v-model="userInput.confirmPassword"
								@input="clearError"
								class="block w-full sm:w-80 rounded border-2 px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
								:class="{
									'border-gray-asparagus':
										userInput.confirmPassword === userInput.password ||
										userInput.confirmPassword === '',
									'border-red-500':
										userInput.confirmPassword !== '' &&
										userInput.confirmPassword !== userInput.password
								}"
								placeholder="Confirm your password"
								:disabled="isLoading" />
							<button
								type="button"
								@click="toggleConfirmPasswordVisibility"
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
								:disabled="isLoading">
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
						<div v-if="userInput.confirmPassword" class="mt-1">
							<span
								class="text-xs"
								:class="
									userInput.confirmPassword === userInput.password
										? 'text-green-600'
										: 'text-red-600'
								">
								{{
									userInput.confirmPassword === userInput.password
										? '✓ Passwords match'
										: '✗ Passwords do not match'
								}}
							</span>
						</div>
					</div>

					<!-- Terms Acceptance -->
					<div>
						<div class="flex items-start space-x-3">
							<input
								id="terms"
								type="checkbox"
								v-model="termsAccepted"
								required
								class="mt-1 h-4 w-4 rounded border-gray-300 text-gray-asparagus focus:ring-gray-asparagus"
								:disabled="isLoading" />
							<label for="terms" class="text-sm text-gray-700">
								I agree to the
								<RouterLink
									to="/terms-of-use"
									class="text-semantic-info hover:text-opacity-80 underline">
									Terms of Use
								</RouterLink>
								and
								<RouterLink
									to="/privacy-policy"
									class="text-semantic-info hover:text-opacity-80 underline">
									Privacy Policy
								</RouterLink>
							</label>
						</div>
					</div>

					<!-- Submit Button -->
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

					<!-- Sign In Link -->
					<div class="text-left pt-4">
						<p class="text-sm text-gray-500">
							Already have an account?
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
			<div class="border-t border-gray-200 pt-6">
				<p class="text-sm text-gray-500">
					By creating an account, you agree to our
					<RouterLink to="/terms-of-use" class="text-gray-700 hover:text-gray-900">
						<span class="underline">Terms of Use</span>
					</RouterLink>
					and
					<RouterLink to="/privacy-policy" class="text-gray-700 hover:text-gray-900">
						<span class="underline">Privacy Policy</span>
					</RouterLink>
				</p>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
