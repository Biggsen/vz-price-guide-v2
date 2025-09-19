<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { sendEmailVerification } from '@firebase/auth'
import { EnvelopeIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/solid'

const auth = useFirebaseAuth()
const currentUser = useCurrentUser()
const router = useRouter()
const route = useRoute()

// State management
const isLoading = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')

// Check for forceState query parameter for screenshot testing
onMounted(() => {
	const forceState = route.query.forceState
	if (forceState === 'success') {
		resendSuccess.value = true
	} else if (forceState === 'error') {
		resendError.value = 'Failed to send verification email. Please try again.'
	} else if (forceState === 'loading') {
		isLoading.value = true
	}
})

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
		if (error.code === 'auth/too-many-requests') {
			resendError.value =
				'You have requested verification emails too many times. Please wait a while before trying again.'
		} else {
			resendError.value = 'Failed to send verification email. Please try again.'
		}
	} finally {
		isLoading.value = false
	}
}

function goToSignIn() {
	router.push('/signin')
}
</script>

<template>
	<div class="p-4 py-8 max-w-xl">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center gap-4 mb-4">
				<h1 class="text-3xl font-bold text-gray-900">Check Your Email</h1>
				<EnvelopeIcon class="w-8 h-8 text-gray-900" />
			</div>
			<p class="text-lg text-gray-600 mb-2">
				We've sent a verification email to
				<span class="font-medium text-gray-900">{{ currentUser?.email }}</span>
			</p>
		</div>

		<!-- Section Heading (styleguide style) -->
		<div class="mb-8">
			<h3
				class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
				Verify Your Email Address
			</h3>
		</div>

		<!-- Main Content (no panel) -->
		<p class="text-gray-600 mb-6">
			Click the verification link in your email to complete your account setup. If you don't
			see the email, check your spam folder.
		</p>

		<!-- Success Message -->
		<div v-if="resendSuccess" class="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<!-- Use Heroicon for check -->
					<CheckCircleIcon class="h-5 w-5 text-green-400" />
				</div>
				<div class="ml-3">
					<p class="text-sm font-medium text-green-800">
						Verification email sent successfully!
					</p>
				</div>
			</div>
		</div>

		<!-- Error Message -->
		<div v-if="resendError" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<!-- Use Heroicon for error -->
					<XCircleIcon class="h-5 w-5 text-red-400" />
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
			class="inline-flex items-center justify-center rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 mb-4">
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
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
