<template>
	<div v-if="messages.length > 0" class="mt-4 space-y-3">
		<div
			v-for="message in messages"
			:key="message.id"
			:class="[
				'bg-saltpan rounded p-3 transition-opacity duration-300',
				deletingMessageId === message.id ? 'opacity-0' : 'opacity-100'
			]">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-2">
						<img
							v-if="message.minecraftUsername"
							:src="`https://mc-heads.net/avatar/${message.minecraftUsername}/24`"
							:alt="message.minecraftUsername"
							class="w-6 h-6 rounded" />
						<div>
							<div class="font-medium text-gray-900 text-sm">
								{{ message.userDisplayName }}
							</div>
							<div class="text-xs text-gray-500">
								{{ formatSuggestionMessageTime(message.createdAt) }}
								<span v-if="message.editedAt">(edited)</span>
							</div>
						</div>
					</div>
					<div
						class="text-gray-700 text-sm whitespace-pre-line"
						v-html="formatMessageBody(message.body)"></div>
				</div>
				<div v-if="canEditMessage(message)" class="flex gap-1 ml-2">
					<button
						@click="startEditMessage(message)"
						class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
						title="Edit message">
						<PencilIcon class="w-4 h-4" />
					</button>
					<button
						@click="confirmDeleteMessage(message)"
						class="p-1 text-gray-400 hover:text-red-600 transition-colors"
						title="Delete message">
						<TrashIcon class="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	<BaseModal
		:isOpen="deleteConfirmId !== null"
		title="Delete Message"
		size="small"
		@close="deleteConfirmId = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to delete this message?
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
						@click="executeDeleteMessage"
						:disabled="loading"
						variant="primary"
						class="bg-semantic-danger hover:bg-opacity-90">
						{{ loading ? 'Deleting...' : 'Delete' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>

	<!-- Edit Message Modal -->
	<BaseModal
		:isOpen="editingMessageId !== null"
		title="Edit Message"
		size="medium"
		:closeOnBackdrop="false"
		@close="cancelEditMessage">
		<div class="space-y-4">
			<div>
				<label
					for="edit-message"
					class="block text-base font-medium leading-6 text-gray-900">
					Message *
				</label>
				<textarea
					id="edit-message"
					v-model="editMessageText"
					placeholder="Edit your message..."
					maxlength="500"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus resize-none"
					rows="4"
					required></textarea>
				<div class="text-sm text-gray-500 mt-1">
					{{ editMessageText.length }}/500 characters
				</div>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<BaseButton @click="cancelEditMessage" variant="secondary">Cancel</BaseButton>
					<BaseButton
						@click="saveEditMessage"
						:disabled="loading || !editMessageText.trim()"
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
import {
	updateSuggestionMessage,
	deleteSuggestionMessage,
	formatSuggestionMessageTime
} from '@/utils/suggestionMessages.js'
import { useFirebaseAuth } from 'vuefire'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
	messages: {
		type: Array,
		required: true
	},
	suggestionId: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['suggestion-message-updated', 'suggestion-message-deleted'])

const auth = useFirebaseAuth()
const editingMessageId = ref(null)
const editMessageText = ref('')
const loading = ref(false)
const deleteConfirmId = ref(null)
const deletingMessageId = ref(null)

const currentUserId = computed(() => auth.currentUser?.uid)

function formatMessageBody(text) {
	// Simple URL regex that matches http/https URLs
	const urlRegex = /(https?:\/\/[^\s]+)/g
	return text.replace(
		urlRegex,
		'<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
	)
}

function canEditMessage(message) {
	return currentUserId.value === message.userId
}

function startEditMessage(message) {
	editingMessageId.value = message.id
	editMessageText.value = message.body
}

function cancelEditMessage() {
	editingMessageId.value = null
	editMessageText.value = ''
}

async function saveEditMessage() {
	if (!editMessageText.value.trim() || loading.value) return

	loading.value = true

	try {
		await updateSuggestionMessage(props.suggestionId, editingMessageId.value, {
			body: editMessageText.value.trim()
		})

		editingMessageId.value = null
		editMessageText.value = ''
		emit('suggestion-message-updated')
	} catch (error) {
		console.error('Error updating message:', error)
		// You might want to show an error message to the user
	} finally {
		loading.value = false
	}
}

function confirmDeleteMessage(message) {
	deleteConfirmId.value = message.id
}

async function executeDeleteMessage() {
	if (!deleteConfirmId.value || loading.value) return

	loading.value = true
	const messageIdToDelete = deleteConfirmId.value

	try {
		// Start fade-out animation
		deletingMessageId.value = messageIdToDelete

		// Wait for animation to complete (300ms)
		await new Promise((resolve) => setTimeout(resolve, 300))

		// Actually delete the message
		await deleteSuggestionMessage(props.suggestionId, messageIdToDelete)
		deleteConfirmId.value = null
		deletingMessageId.value = null
		emit('suggestion-message-deleted')
	} catch (error) {
		console.error('Error deleting message:', error)
		// Reset animation state on error
		deletingMessageId.value = null
	} finally {
		loading.value = false
	}
}

// Expose the delete function for the parent component
defineExpose({
	executeDeleteMessage
})
</script>
