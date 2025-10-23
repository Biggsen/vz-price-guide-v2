<template>
	<div class="mt-4 p-3 bg-saltpan rounded">
		<form @submit.prevent="submitMessage" class="space-y-3">
			<textarea
				v-model="messageText"
				placeholder="Add a message..."
				maxlength="500"
				class="w-full rounded border-2 border-gray-asparagus px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus resize-none"
				rows="6"
				required></textarea>
			<div class="flex items-center justify-between">
				<div class="text-sm text-gray-500">{{ messageText.length }}/500 characters</div>
				<div class="flex gap-2">
					<BaseButton
						type="button"
						@click="cancelMessage"
						variant="secondary"
						:disabled="loading">
						Cancel
					</BaseButton>
					<BaseButton
						type="submit"
						variant="primary"
						:disabled="loading || !messageText.trim()">
						{{ loading ? 'Posting...' : 'Post Message' }}
					</BaseButton>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { addSuggestionMessage } from '@/utils/suggestionMessages.js'
import { useFirebaseAuth } from 'vuefire'
import { useUserProfile } from '@/utils/userProfile.js'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps({
	suggestionId: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['suggestion-message-added', 'cancel'])

const auth = useFirebaseAuth()
const messageText = ref('')
const loading = ref(false)

const userId = computed(() => auth.currentUser?.uid)
const { userProfile } = useUserProfile(userId.value)

async function submitMessage() {
	if (!messageText.value.trim() || loading.value) return

	loading.value = true

	try {
		const messageData = {
			userId: auth.currentUser.uid,
			userDisplayName:
				userProfile.value?.display_name ||
				auth.currentUser.displayName ||
				auth.currentUser?.email?.split('@')[0] ||
				'Anonymous',
			minecraftUsername: userProfile.value?.minecraft_username || null,
			body: messageText.value.trim(),
			authorRole: 'user'
		}

		await addSuggestionMessage(props.suggestionId, messageData)
		messageText.value = ''
		emit('suggestion-message-added')
	} catch (error) {
		console.error('Error adding message:', error)
		// You might want to show an error message to the user
	} finally {
		loading.value = false
	}
}

function cancelMessage() {
	messageText.value = ''
	emit('cancel')
}
</script>
