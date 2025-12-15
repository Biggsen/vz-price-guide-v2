<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFirebaseAuth, useCurrentUser } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { sendEmailVerification } from '@firebase/auth'
import { EnvelopeIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/BaseButton.vue'
import NotificationBanner from '@/components/NotificationBanner.vue'

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
		<NotificationBanner
			v-if="resendSuccess"
			type="success"
			title="Success"
			message="Verification email sent successfully!"
			class="mb-4" />

		<!-- Error Message -->
		<NotificationBanner
			v-if="resendError"
			type="error"
			title="Error"
			:message="resendError"
			class="mb-4" />

		<!-- Resend Button -->
		<BaseButton
			@click="resendVerificationEmail"
			variant="primary"
			:loading="isLoading"
			class="mb-4">
			{{ buttonText }}
		</BaseButton>
	</div>
</template>

<style lang="scss" scoped>
// Additional custom styles if needed
</style>
