<script setup>
import { ref, computed } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { signInWithEmailAndPassword, signOut } from '@firebase/auth'
import { userProfileExists } from '../utils/userProfile.js'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/vue/24/solid'

const userInput = ref({
	email: '',
	password: ''
})

const auth = useFirebaseAuth()
const currentUser = useCurrentUser()
const router = useRouter()
const route = useRoute()

// State management
const isLoading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)
const successMessage = ref('')

// Check for success message from query parameter
if (route.query.message === 'email-verified') {
	successMessage.value =
		'Your email has been verified successfully! You can now sign in to your account.'
	// Clear the query parameter
	router.replace({ path: '/signin', query: {} })
} else if (route.query.message === 'password-reset-success') {
	successMessage.value =
		'Your password has been reset successfully! You can now sign in with your new password.'
	// Clear the query parameter
	router.replace({ path: '/signin', query: {} })
}

// Computed properties
const isFormValid = computed(() => {
	return userInput.value.email.trim() !== '' && userInput.value.password.length >= 6
})

const buttonText = computed(() => {
	return isLoading.value ? 'Signing in...' : 'Sign In'
})

async function signInToFirebase() {
	if (!isFormValid.value) return

	isLoading.value = true
	errorMessage.value = ''

	try {
		const userCredential = await signInWithEmailAndPassword(
			auth,
			userInput.value.email,
			userInput.value.password
		)

		// Check if user has a profile
		const hasProfile = await userProfileExists(userCredential.user.uid)

		// Redirect based on profile status
		if (hasProfile) {
			// User has profile - redirect to home
			router.push('/')
		} else {
			// First time user - redirect to account to complete setup
			router.push('/account')
		}
	} catch (error) {
		console.error('Sign in error:', error.code, error.message)

		// User-friendly error messages
		switch (error.code) {
			case 'auth/invalid-email':
				errorMessage.value = 'Please enter a valid email address.'
				break
			case 'auth/user-disabled':
				errorMessage.value = 'This account has been disabled. Please contact support.'
				break
			case 'auth/user-not-found':
				errorMessage.value = 'No account found with this email address.'
				break
			case 'auth/wrong-password':
				errorMessage.value = 'Incorrect password. Please try again.'
				break
			case 'auth/too-many-requests':
				errorMessage.value = 'Too many failed attempts. Please try again later.'
				break
			default:
				errorMessage.value = 'An error occurred while signing in. Please try again.'
		}
	} finally {
		isLoading.value = false
	}
}

async function signOutOfFirebase() {
	try {
		await signOut(auth)
		console.log('Signed out successfully!')
	} catch (error) {
		console.error('Sign out error:', error)
	}
}

function togglePasswordVisibility() {
	showPassword.value = !showPassword.value
}

function clearError() {
	errorMessage.value = ''
}
</script>

<template>
	<div class="p-4 py-8 max-w-4xl">
		<!-- Sign In Form -->
		<div v-if="!currentUser?.email || !currentUser?.emailVerified">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
			</div>

			<!-- Success Message -->
			<div
				v-if="successMessage"
				class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<CheckCircleIcon class="h-5 w-5 text-green-400" />
					</div>
					<div class="ml-3">
						<p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
					</div>
					<div class="ml-auto pl-3">
						<button
							@click="successMessage = ''"
							class="text-green-400 hover:text-green-600">
							<XMarkIcon class="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>

			<!-- Error Message -->
			<div v-if="errorMessage" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<XCircleIcon class="h-5 w-5 text-red-400" />
					</div>
					<div class="ml-3">
						<p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
					</div>
					<div class="ml-auto pl-3">
						<button @click="clearError" class="text-red-400 hover:text-red-600">
							<XMarkIcon class="h-4 w-4" />
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

				<form @submit.prevent="signInToFirebase" class="space-y-6">
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
								autocomplete="current-password"
								required
								v-model="userInput.password"
								@input="clearError"
								class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
								placeholder="Enter your password"
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

						<!-- Password Reset Link -->
						<div class="text-left">
							<RouterLink
								to="/reset-password"
								class="text-sm text-gray-700 hover:text-opacity-80">
								<span class="underline">Forgot your password?</span>
							</RouterLink>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="pt-2">
						<button
							type="submit"
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

					<!-- Sign Up Link -->
					<div class="text-left pt-4">
						<p class="text-sm text-gray-500">
							Don't have an account?
							<RouterLink to="/signup" class="text-gray-700 hover:text-opacity-80">
								<span class="underline">Sign up</span>
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
