<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { applyActionCode } from '@firebase/auth'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/solid'

const router = useRouter()
const route = useRoute()
const auth = useFirebaseAuth()
const currentUser = useCurrentUser()

// State management
const isLoading = ref(true)
const isSuccess = ref(false)
const errorMessage = ref('')
const isRedirecting = ref(false)

// Handle email verification
async function handleEmailVerification() {
	const oobCode = route.query.oobCode

	// Check if user is already verified (for test scenarios)
	if (currentUser.value?.emailVerified) {
		isSuccess.value = true
		setTimeout(() => {
			isRedirecting.value = true
			router.push({
				path: '/account',
				query: {
					message: 'email-verified',
					email: currentUser.value?.email || route.query.email
				}
			})
		}, 3000)
		isLoading.value = false
		return
	}

	if (!oobCode) {
		errorMessage.value = 'Invalid verification link. Please try again.'
		isLoading.value = false
		return
	}

	try {
		// Apply the verification code
		await applyActionCode(auth, oobCode)
		isSuccess.value = true

		// Wait a moment to show success message, then redirect
		setTimeout(() => {
			isRedirecting.value = true
			// Redirect to account page with success message
			router.push({
				path: '/account',
				query: {
					message: 'email-verified',
					email: currentUser.value?.email || route.query.email
				}
			})
		}, 3000)
	} catch (error) {
		console.error('Email verification error:', error)

		switch (error.code) {
			case 'auth/invalid-action-code':
				errorMessage.value =
					'This verification link has expired or is invalid. Please request a new verification email.'
				break
			case 'auth/user-disabled':
				errorMessage.value = 'This account has been disabled. Please contact support.'
				break
			case 'auth/user-not-found':
				errorMessage.value = 'No account found with this email address.'
				break
			default:
				errorMessage.value =
					'An error occurred while verifying your email. Please try again.'
		}
	} finally {
		isLoading.value = false
	}
}

// Handle manual navigation
function goToSignIn() {
	router.push('/signin')
}

function goToHome() {
	router.push('/')
}

function requestNewVerification() {
	router.push('/verify-email')
}

onMounted(() => {
	// Check for forceState query parameter for screenshot testing
	const forceState = route.query.forceState
	if (forceState === 'success') {
		isLoading.value = false
		isSuccess.value = true
		// Don't redirect when forcing success state for screenshots
	} else if (forceState === 'error') {
		isLoading.value = false
		errorMessage.value =
			'This verification link has expired or is invalid. Please request a new verification email.'
	} else {
		// Normal flow
		handleEmailVerification()
	}
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
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Verifying Your Email</h1>
			<p class="text-gray-600">Please wait while we verify your email address...</p>
		</div>

		<!-- Success State -->
		<div v-else-if="isSuccess" class="max-w-xl">
			<div class="mb-4 flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900">Email Verified!</h1>
				<CheckCircleIcon class="w-8 h-8 text-semantic-success" />
			</div>
			<p class="text-gray-600 mb-6">Your email address has been successfully verified.</p>
			<!-- Redirecting Message -->
			<div v-if="isRedirecting" class="mb-6">
				<p class="text-sm text-gray-500">Redirecting you to your account...</p>
			</div>
			<!-- Action Buttons -->
			<div v-else class="flex flex-col items-start gap-3 mb-4">
				<button
					@click="() => router.push('/account')"
					class="inline-flex items-center justify-center rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">
					Go to Your Account
				</button>
				<button
					@click="goToHome"
					class="inline-flex items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">
					Go to Homepage
				</button>
			</div>
		</div>
		<!-- Error State -->
		<div v-else class="max-w-xl">
			<div class="mb-4 flex items-center gap-3">
				<h1 class="text-3xl font-bold text-gray-900">Verification Failed</h1>
				<XCircleIcon class="w-8 h-8 text-semantic-danger" />
			</div>
			<p class="text-gray-600 mb-6">{{ errorMessage }}</p>
			<!-- Action Buttons -->
			<div class="flex flex-col items-start gap-3 mb-4">
				<button
					@click="requestNewVerification"
					class="inline-flex items-center justify-center rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">
					Request New Verification Email
				</button>
				<button
					@click="goToSignIn"
					class="inline-flex items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200">
					Go to Sign In
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
