<template>
	<div class="mt-4 p-3 bg-saltpan rounded">
		<form @submit.prevent="submitComment" class="space-y-3">
			<textarea
				v-model="commentText"
				placeholder="Add a reply..."
				maxlength="500"
				class="w-full rounded border-2 border-gray-asparagus px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus resize-none"
				rows="6"
				required></textarea>
			<div class="flex items-center justify-between">
				<div class="text-sm text-gray-500">{{ commentText.length }}/500 characters</div>
				<div class="flex gap-2">
					<BaseButton
						type="button"
						@click="cancelComment"
						variant="secondary"
						:disabled="loading">
						Cancel
					</BaseButton>
					<BaseButton
						type="submit"
						variant="primary"
						:disabled="loading || !commentText.trim()">
						{{ loading ? 'Posting...' : 'Post Reply' }}
					</BaseButton>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { addComment } from '@/utils/comments.js'
import { useFirebaseAuth } from 'vuefire'
import { useUserProfile } from '@/utils/userProfile.js'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps({
	suggestionId: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['comment-added', 'cancel'])

const auth = useFirebaseAuth()
const commentText = ref('')
const loading = ref(false)

const userId = computed(() => auth.currentUser?.uid)
const { userProfile } = useUserProfile(userId.value)

async function submitComment() {
	if (!commentText.value.trim() || loading.value) return

	loading.value = true

	try {
		const commentData = {
			userId: auth.currentUser.uid,
			userDisplayName:
				userProfile.value?.display_name || auth.currentUser.displayName || 'Anonymous',
			minecraftUsername: userProfile.value?.minecraft_username || null,
			body: commentText.value.trim(),
			authorRole: 'user'
		}

		await addComment(props.suggestionId, commentData)
		commentText.value = ''
		emit('comment-added')
	} catch (error) {
		console.error('Error adding comment:', error)
		// You might want to show an error message to the user
	} finally {
		loading.value = false
	}
}

function cancelComment() {
	commentText.value = ''
	emit('cancel')
}
</script>
