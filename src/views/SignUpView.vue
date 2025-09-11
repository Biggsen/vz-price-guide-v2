<script setup>
import { ref, computed } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { useRouter } from 'vue-router'
import { createUserWithEmailAndPassword, sendEmailVerification } from '@firebase/auth'
import { ExclamationCircleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/solid'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'

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
const passwordValid = computed(() => {
	const pw = userInput.value.password
	return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)
})

const isFormValid = computed(() => {
	const emailValid =
		userInput.value.email.trim() !== '' &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInput.value.email)
	const passwordsMatch = userInput.value.password === userInput.value.confirmPassword
	const confirmPasswordFilled = userInput.value.confirmPassword.length > 0

	return (
		emailValid &&
		passwordValid.value &&
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
							data-cy="signup-email"
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
								minlength="8"
								data-cy="signup-password"
								class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
								placeholder="Create a password"
								:disabled="isLoading" />
							<button
								type="button"
								@click="togglePasswordVisibility"
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
								:disabled="isLoading">
								<EyeSlashIcon v-if="showPassword" class="h-5 w-5 text-gray-400" />
								<EyeIcon v-else class="h-5 w-5 text-gray-400" />
								<span class="sr-only">
									{{ showPassword ? 'Hide password' : 'Show password' }}
								</span>
							</button>
						</div>

						<!-- Password Strength Indicator -->
						<div class="mt-1 text-xs text-gray-500">
							Password must be at least 8 characters with uppercase, lowercase, and
							number
						</div>
						<div
							v-if="userInput.password && !passwordValid"
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
								data-cy="signup-confirm-password"
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
								<EyeSlashIcon
									v-if="showConfirmPassword"
									class="h-5 w-5 text-gray-400" />
								<EyeIcon v-else class="h-5 w-5 text-gray-400" />
								<span class="sr-only">
									{{ showConfirmPassword ? 'Hide password' : 'Show password' }}
								</span>
							</button>
						</div>

						<!-- Password Match Indicator -->
						<div v-if="userInput.confirmPassword" class="mt-1">
							<span
								class="text-sm font-semibold flex items-center gap-1"
								:class="
									userInput.confirmPassword === userInput.password
										? 'text-green-600'
										: 'text-red-600'
								">
								<template v-if="userInput.confirmPassword === userInput.password">
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

					<!-- Terms Acceptance -->
					<div>
						<div class="flex items-start space-x-3">
							<label class="flex items-center cursor-pointer">
								<input
									id="terms"
									type="checkbox"
									v-model="termsAccepted"
									required
									data-cy="signup-terms"
									class="checkbox-input mr-2"
									:disabled="isLoading" />
								<span class="text-sm text-gray-700">
									I agree to the
									<RouterLink
										to="/terms-of-use"
										class="text-gray-700 hover:text-opacity-80 underline">
										<span>Terms of Use</span>
									</RouterLink>
									and
									<RouterLink
										to="/privacy-policy"
										class="text-gray-700hover:text-opacity-80 underline">
										<span>Privacy Policy</span>
									</RouterLink>
								</span>
							</label>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="pt-2">
						<button type="submit" data-cy="signup-submit" class="btn-primary">
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
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
// Additional custom styles if needed
</style>
