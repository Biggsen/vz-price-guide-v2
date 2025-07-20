<script setup>
import { ref, computed } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { useRouter } from 'vue-router'
import { sendEmailVerification } from '@firebase/auth'

const auth = useFirebaseAuth()
const currentUser = useCurrentUser()
const router = useRouter()

// State management
const isLoading = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')

// Computed properties
const buttonText = computed(() => {
	return isLoading.value ? 'Sending...' : 'Resend Verification Email'
})

async function resendVerificationEmail() {
	if (!currentUser.value) return

	isLoading.value = true
	resendError.value = ''
	resendSuccess.value = false

	try {
		await sendEmailVerification(currentUser.value)
		resendSuccess.value = true
	} catch (error) {
		console.error('Resend verification error:', error)
		resendError.value = 'Failed to send verification email. Please try again.'
	} finally {
		isLoading.value = false
	}
}

function goToSignIn() {
	router.push('/signin')
}
</script>

<template>
	<div class="p-4 py-8 max-w-4xl">
		<div class="max-w-md mx-auto">
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
							d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
				</div>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Check Your Email</h1>
				<p class="text-gray-600">
					We've sent a verification email to
					<span class="font-medium text-gray-900">{{ currentUser?.email }}</span>
				</p>
			</div>

			<!-- Main Content -->
			<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
				<div class="text-center">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">
						Verify Your Email Address
					</h2>
					<p class="text-gray-600 mb-6">
						Click the verification link in your email to complete your account setup. If
						you don't see the email, check your spam folder.
					</p>

					<!-- Success Message -->
					<div
						v-if="resendSuccess"
						class="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg
									class="h-5 w-5 text-green-400"
									viewBox="0 0 20 20"
									fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd" />
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm font-medium text-green-800">
									Verification email sent successfully!
								</p>
							</div>
						</div>
					</div>

					<!-- Error Message -->
					<div
						v-if="resendError"
						class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
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
								<p class="text-sm font-medium text-red-800">{{ resendError }}</p>
							</div>
						</div>
					</div>

					<!-- Resend Button -->
					<button
						@click="resendVerificationEmail"
						:disabled="isLoading"
						class="w-full rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 mb-4">
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

					<!-- Sign In Link -->
					<div class="text-center">
						<p class="text-sm text-gray-500">
							Already verified your email?
							<button
								@click="goToSignIn"
								class="text-semantic-info hover:text-opacity-80 underline">
								Sign in to your account
							</button>
						</p>
					</div>
				</div>
			</div>

			<!-- Additional Info -->
			<div class="text-center">
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
