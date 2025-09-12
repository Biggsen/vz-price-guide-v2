<script setup>
import { ref, computed } from 'vue'
import { useFirebaseAuth } from 'vuefire'
import { sendPasswordResetEmail } from '@firebase/auth'
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/vue/24/solid'

const userInput = ref({
	email: ''
})

const auth = useFirebaseAuth()

// State management
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Computed properties
const isFormValid = computed(() => {
	return (
		userInput.value.email.trim() !== '' &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInput.value.email)
	)
})

const buttonText = computed(() => {
	return isLoading.value ? 'Sending Reset Email...' : 'Send Reset Email'
})

async function sendResetEmail() {
	if (!isFormValid.value) return

	isLoading.value = true
	errorMessage.value = ''
	successMessage.value = ''

	try {
		await sendPasswordResetEmail(auth, userInput.value.email)
		successMessage.value = 'Password reset email sent! Check your inbox for instructions.'
		userInput.value.email = '' // Clear the form
	} catch (error) {
		console.error('Password reset error:', error.code, error.message)

		// User-friendly error messages
		switch (error.code) {
			case 'auth/invalid-email':
				errorMessage.value = 'Please enter a valid email address.'
				break
			case 'auth/user-not-found':
				errorMessage.value = 'No account found with this email address.'
				break
			case 'auth/too-many-requests':
				errorMessage.value = 'Too many failed attempts. Please try again later.'
				break
			default:
				errorMessage.value =
					'An error occurred while sending the reset email. Please try again.'
		}
	} finally {
		isLoading.value = false
	}
}

function clearError() {
	errorMessage.value = ''
}

function clearSuccess() {
	successMessage.value = ''
}
</script>

<template>
	<div class="p-4 py-8 max-w-4xl">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
			<p class="text-gray-600">
				Enter your email address and we'll send you a link to reset your password.
			</p>
		</div>

		<!-- Success Message -->
		<div v-if="successMessage" class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<CheckCircleIcon class="h-5 w-5 text-green-400" />
				</div>
				<div class="ml-3">
					<p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
				</div>
				<div class="ml-auto pl-3">
					<button @click="clearSuccess" class="text-green-400 hover:text-green-600">
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
				Reset Your Password
			</h3>

			<form @submit.prevent="sendResetEmail" class="space-y-6">
				<!-- Email Field -->
				<div>
					<label for="email" class="block text-base font-medium leading-6 text-gray-900">
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
						data-cy="reset-email"
						class="block w-full sm:w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans"
						placeholder="Enter your email address"
						:disabled="isLoading" />
				</div>

				<!-- Submit Button -->
				<div class="pt-2">
					<button
						type="submit"
						data-cy="reset-submit"
						class="rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">
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

				<!-- Back to Sign In Link -->
				<div class="text-left pt-4">
					<p class="text-sm text-gray-500">
						Remember your password?
						<RouterLink to="/signin" class="text-gray-700 hover:text-opacity-80">
							<span class="underline">Sign in</span>
						</RouterLink>
					</p>
				</div>
			</form>
		</div>

		<!-- Additional Info -->
		<div class="border-t border-gray-200 pt-6">
			<p class="text-sm text-gray-500">
				The reset link will be sent to your email address. Make sure to check your spam
				folder if you don't see it in your inbox.
			</p>
		</div>
	</div>
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
