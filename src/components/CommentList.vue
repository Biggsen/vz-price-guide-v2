<template>
	<div v-if="comments.length > 0" class="mt-4 space-y-3">
		<div
			v-for="comment in comments"
			:key="comment.id"
			:class="[
				'bg-saltpan rounded p-3 transition-opacity duration-300',
				deletingCommentId === comment.id ? 'opacity-0' : 'opacity-100'
			]">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-2">
						<img
							v-if="comment.minecraftUsername"
							:src="`https://mc-heads.net/avatar/${comment.minecraftUsername}/24`"
							:alt="comment.minecraftUsername"
							class="w-6 h-6 rounded" />
						<div>
							<div class="font-medium text-gray-900 text-sm">
								{{ comment.userDisplayName }}
							</div>
							<div class="text-xs text-gray-500">
								{{ formatCommentTime(comment.createdAt) }}
								<span v-if="comment.editedAt">(edited)</span>
							</div>
						</div>
					</div>
					<div class="text-gray-700 text-sm whitespace-pre-line">
						{{ comment.body }}
					</div>
				</div>
				<div v-if="canEditComment(comment)" class="flex gap-1 ml-2">
					<button
						@click="startEditComment(comment)"
						class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
						title="Edit comment">
						<PencilIcon class="w-4 h-4" />
					</button>
					<button
						@click="confirmDeleteComment(comment)"
						class="p-1 text-gray-400 hover:text-red-600 transition-colors"
						title="Delete comment">
						<TrashIcon class="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	<BaseModal
		:isOpen="deleteConfirmId !== null"
		title="Delete Comment"
		size="small"
		@close="deleteConfirmId = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to delete this comment?
				</h3>
				<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<BaseButton @click="deleteConfirmId = null" variant="secondary">
						Cancel
					</BaseButton>
					<BaseButton
						@click="executeDeleteComment"
						:disabled="loading"
						variant="primary"
						class="bg-semantic-danger hover:bg-opacity-90">
						{{ loading ? 'Deleting...' : 'Delete' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>

	<!-- Edit Comment Modal -->
	<BaseModal
		:isOpen="editingCommentId !== null"
		title="Edit Reply"
		size="medium"
		@close="cancelEditComment">
		<div class="space-y-4">
			<div>
				<label
					for="edit-comment"
					class="block text-base font-medium leading-6 text-gray-900">
					Reply *
				</label>
				<textarea
					id="edit-comment"
					v-model="editCommentText"
					placeholder="Edit your reply..."
					maxlength="500"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus resize-none"
					rows="8"
					required></textarea>
				<div class="text-sm text-gray-500 mt-1">
					{{ editCommentText.length }}/500 characters
				</div>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<BaseButton @click="cancelEditComment" variant="secondary">Cancel</BaseButton>
					<BaseButton
						@click="saveEditComment"
						:disabled="loading || !editCommentText.trim()"
						variant="primary">
						{{ loading ? 'Saving...' : 'Save Changes' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { updateComment, deleteComment, formatCommentTime } from '@/utils/comments.js'
import { useFirebaseAuth } from 'vuefire'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
	comments: {
		type: Array,
		required: true
	},
	suggestionId: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['comment-updated', 'comment-deleted'])

const auth = useFirebaseAuth()
const editingCommentId = ref(null)
const editCommentText = ref('')
const loading = ref(false)
const deleteConfirmId = ref(null)
const deletingCommentId = ref(null)

const currentUserId = computed(() => auth.currentUser?.uid)

function canEditComment(comment) {
	return currentUserId.value === comment.userId
}

function startEditComment(comment) {
	editingCommentId.value = comment.id
	editCommentText.value = comment.body
}

function cancelEditComment() {
	editingCommentId.value = null
	editCommentText.value = ''
}

async function saveEditComment() {
	if (!editCommentText.value.trim() || loading.value) return

	loading.value = true

	try {
		await updateComment(props.suggestionId, editingCommentId.value, {
			body: editCommentText.value.trim()
		})

		editingCommentId.value = null
		editCommentText.value = ''
		emit('comment-updated')
	} catch (error) {
		console.error('Error updating comment:', error)
		// You might want to show an error message to the user
	} finally {
		loading.value = false
	}
}

function confirmDeleteComment(comment) {
	deleteConfirmId.value = comment.id
}

async function executeDeleteComment() {
	if (!deleteConfirmId.value || loading.value) return

	loading.value = true
	const commentIdToDelete = deleteConfirmId.value

	try {
		// Start fade-out animation
		deletingCommentId.value = commentIdToDelete

		// Wait for animation to complete (300ms)
		await new Promise((resolve) => setTimeout(resolve, 300))

		// Actually delete the comment
		await deleteComment(props.suggestionId, commentIdToDelete)
		deleteConfirmId.value = null
		deletingCommentId.value = null
		emit('comment-deleted')
	} catch (error) {
		console.error('Error deleting comment:', error)
		// Reset animation state on error
		deletingCommentId.value = null
	} finally {
		loading.value = false
	}
}

// Expose the delete function for the parent component
defineExpose({
	executeDeleteComment
})
</script>
