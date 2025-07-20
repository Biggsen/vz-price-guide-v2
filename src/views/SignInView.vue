<script setup>
import { ref, computed } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { signInWithEmailAndPassword, signOut } from '@firebase/auth'

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
		await signInWithEmailAndPassword(auth, userInput.value.email, userInput.value.password)
		// Signed in successfully - redirect to home
		router.push('/')
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
		<div v-if="!currentUser?.email">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
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
							class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus"
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
								class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 pr-10 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus"
								placeholder="Enter your password"
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

						<!-- Password Reset Link -->
						<!-- <div class="text-left">
							<RouterLink
								to="/reset-password"
								class="text-sm text-semantic-info hover:text-opacity-80">
								<span class="underline">Forgot your password?</span>
							</RouterLink>
						</div> -->
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

					<!-- Sign Up Link -->
					<!-- <div class="text-left pt-4">
						<p class="text-sm text-gray-500">
							Don't have an account?
							<RouterLink
								to="/signup"
								class="text-semantic-info hover:text-opacity-80">
								<span class="underline">Sign up</span>
							</RouterLink>
						</p>
					</div> -->
				</form>
			</div>

			<!-- Additional Info -->
			<div class="border-t border-gray-200 pt-6">
				<p class="text-sm text-gray-500">
					By signing in, you agree to our
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
