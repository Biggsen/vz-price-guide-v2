<template>
	<div class="p-4 py-8 max-w-2xl">
		<h1 class="text-3xl font-bold mb-6">Suggestions</h1>
		<p class="mb-6 text-gray-700">
			Hey {{ userName }}. Glad you're here. Would you mind helping out? If you have any ideas
			or feedback to make this site better, I'd love to hear from you.
			<span class="block mt-2">- verzion</span>
		</p>
		<NotificationBanner
			v-if="!isVerified"
			type="warning"
			title="Email Verification Required"
			message="You must verify your email before you can submit suggestions."
			class="mb-6" />
		<form
			@submit.prevent="submitSuggestion"
			class="space-y-6 mb-8"
			:class="{ 'opacity-50 pointer-events-none': !isVerified }">
			<div>
				<label for="title" class="block text-base font-medium leading-6 text-gray-900">
					Title *
				</label>
				<input
					id="title"
					v-model="form.title"
					required
					maxlength="80"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus"
					placeholder="Suggestion title"
					:disabled="!isVerified" />
			</div>
			<div>
				<label for="body" class="block text-base font-medium leading-6 text-gray-900">
					Details *
				</label>
				<textarea
					id="body"
					v-model="form.body"
					required
					maxlength="500"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus min-h-[140px]"
					placeholder="Describe your suggestion..."
					:disabled="!isVerified"></textarea>
				<div class="text-sm text-gray-500 mt-1">{{ form.body.length }}/500 characters</div>
			</div>
			<div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
			<BaseButton type="submit" variant="primary" :disabled="loading || !isVerified">
				Submit Suggestion
			</BaseButton>
		</form>
		<div v-if="isVerified">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Your Suggestions
			</h2>
			<div v-if="suggestions.length === 0" class="text-gray-500">No suggestions yet.</div>
			<div v-else class="space-y-6">
				<BaseCard
					v-for="s in suggestions"
					:key="s.id"
					variant="secondary"
					:class="[
						'transition-opacity duration-300',
						deletingSuggestionId === s.id ? 'opacity-0' : 'opacity-100'
					]">
					<template #header>
						<h3 class="text-xl font-semibold text-heavy-metal">
							{{ s.title }}
						</h3>
					</template>
					<template #actions>
						<button
							v-if="s.status === 'open'"
							@click="startEdit(s)"
							class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
							title="Edit suggestion">
							<PencilIcon class="w-4 h-4" />
						</button>
						<button
							@click="confirmDeleteSuggestion(s)"
							class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
							title="Delete suggestion">
							<TrashIcon class="w-4 h-4" />
						</button>
					</template>
					<template #body>
						<div class="flex flex-col gap-3 flex-1 w-full">
							<p class="whitespace-pre-line">
								{{ s.body }}
							</p>
							<div class="text-sm text-heavy-metal space-y-1">
								<div>
									<span class="font-medium">Submitted:</span>
									{{
										s.createdAt?.toDate
											? s.createdAt.toDate().toLocaleDateString()
											: ''
									}}
								</div>
								<div class="flex items-center">
									<span class="font-medium mr-1">Status:</span>
									<span v-if="s.status === 'open'" class="inline-flex items-center">
										<InboxIcon class="w-4 h-4 mr-1 align-middle -mt-0.5" />
										{{ statusLabel(s.status) }}
									</span>
									<span
										v-else-if="s.status === 'in progress'"
										class="inline-flex items-center">
										<EyeIcon class="w-4 h-4 mr-1 align-middle -mt-0.5" />
										{{ statusLabel(s.status) }}
									</span>
									<span
										v-else-if="s.status === 'closed'"
										class="inline-flex items-center">
										<CheckCircleIcon class="w-4 h-4 mr-1 align-middle -mt-0.5" />
										{{ statusLabel(s.status) }}
									</span>
									<span
										v-else-if="s.status === 'rejected'"
										class="inline-flex items-center">
										<ClockIcon class="w-4 h-4 mr-1 align-middle -mt-0.5" />
										{{ statusLabel(s.status) }}
									</span>
									<span v-else>{{ statusLabel(s.status) }}</span>
								</div>
							</div>

							<!-- Messages Section -->
							<div
								v-if="messagesData[s.id] && messagesData[s.id].length > 0"
								class="pt-4">
								<div class="flex items-center justify-between mb-3">
									<h4 class="text-sm font-medium text-heavy-metal">Discussion</h4>
								</div>

								<!-- Messages List -->
								<SuggestionMessageList
									:messages="messagesData[s.id]"
									:suggestion-id="s.id"
									@suggestion-message-updated="handleMessageUpdated(s.id)"
									@suggestion-message-deleted="handleMessageDeleted(s.id)" />

								<!-- Reply Button (only show if admin has commented) -->
								<div v-if="isVerified" class="mt-3 text-right">
									<BaseButton
										@click="toggleMessageForm(s.id)"
										variant="secondary"
										class="text-sm">
										{{ showMessageForm[s.id] ? 'Cancel' : 'Reply' }}
									</BaseButton>
								</div>

								<!-- Message Form -->
								<SuggestionMessageForm
									v-if="showMessageForm[s.id]"
									:suggestion-id="s.id"
									@suggestion-message-added="handleMessageAdded(s.id)"
									@cancel="showMessageForm[s.id] = false" />
							</div>
						</div>
					</template>
				</BaseCard>
			</div>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	<!-- prettier-ignore -->
	<BaseModal
		:isOpen="showDeleteModal"
		title="Delete Suggestion"
		size="small"
		@close="showDeleteModal = false; suggestionToDelete = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to delete
					<span class="font-semibold">{{ suggestionToDelete?.title }}</span>
					?
				</h3>
				<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<BaseButton
						@click="showDeleteModal = false; suggestionToDelete = null"
						variant="secondary">
						Cancel
					</BaseButton>
					<BaseButton
						@click="executeDelete"
						:disabled="loading"
						variant="primary"
						class="bg-semantic-danger hover:bg-opacity-90">
						{{ loading ? 'Deleting...' : 'Delete' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>

	<!-- Edit Suggestion Modal -->
	<BaseModal
		:isOpen="editingId !== null"
		title="Edit Suggestion"
		size="normal"
		:closeOnBackdrop="false"
		@close="cancelEdit">
		<div class="space-y-4">
			<div>
				<label for="edit-title" class="block text-base font-medium leading-6 text-gray-900">
					Title *
				</label>
				<input
					id="edit-title"
					v-model="editForm.title"
					required
					maxlength="80"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus"
					placeholder="Suggestion title" />
			</div>
			<div>
				<label for="edit-body" class="block text-base font-medium leading-6 text-gray-900">
					Details *
				</label>
				<textarea
					id="edit-body"
					v-model="editForm.body"
					required
					maxlength="500"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus min-h-[140px]"
					placeholder="Describe your suggestion..."></textarea>
				<div class="text-sm text-gray-500 mt-1">
					{{ editForm.body.length }}/500 characters
				</div>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<BaseButton @click="cancelEdit" variant="secondary">Cancel</BaseButton>
					<BaseButton @click="saveEdit(editingId)" :disabled="loading" variant="primary">
						{{ loading ? 'Saving...' : 'Save Changes' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import {
	collection,
	addDoc,
	query,
	where,
	orderBy,
	serverTimestamp,
	doc as firestoreDoc,
	updateDoc,
	onSnapshot
} from 'firebase/firestore'
import { useFirebaseAuth, useFirestore, useCollection } from 'vuefire'
import { useUserProfile } from '../utils/userProfile.js'
import { InboxIcon } from '@heroicons/vue/20/solid'
import { EyeIcon } from '@heroicons/vue/24/outline'
import { TrashIcon, PencilIcon, CheckCircleIcon, ClockIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BaseModal from '@/components/BaseModal.vue'
import SuggestionMessageForm from '@/components/SuggestionMessageForm.vue'
import SuggestionMessageList from '@/components/SuggestionMessageList.vue'
import NotificationBanner from '@/components/NotificationBanner.vue'
import { getSuggestionMessagesQuery } from '@/utils/suggestionMessages.js'

const auth = useFirebaseAuth()
const db = useFirestore()
const form = ref({ title: '', body: '' })
const error = ref('')
const loading = ref(false)
const userId = computed(() => auth.currentUser?.uid)
const { userProfile } = useUserProfile(userId.value)
const userName = computed(
	() =>
		userProfile.value?.display_name ||
		auth.currentUser?.displayName ||
		auth.currentUser?.email?.split('@')[0] ||
		'there'
)
const showDeleteModal = ref(false)
const suggestionToDelete = ref(null)
const deletingSuggestionId = ref(null)
const editingId = ref(null)
const editForm = ref({ title: '', body: '' })
const showMessageForm = ref({})
const messagesData = ref({})
const messageUnsubscribers = ref({})
const isVerified = computed(() => auth.currentUser?.emailVerified)

// Load messages for a specific suggestion with real-time updates
function loadMessages(suggestionId) {
	try {
		const messagesQuery = getSuggestionMessagesQuery(suggestionId)

		// Set up real-time listener
		const unsubscribe = onSnapshot(
			messagesQuery,
			(snapshot) => {
				const messages = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data()
				}))
				messagesData.value[suggestionId] = messages
			},
			(error) => {
				console.error('Error loading messages:', error)
				messagesData.value[suggestionId] = []
			}
		)

		// Store unsubscribe function for cleanup
		messageUnsubscribers.value[suggestionId] = unsubscribe
	} catch (error) {
		console.error('Error setting up message listener:', error)
		messagesData.value[suggestionId] = []
	}
}

// Reactive suggestions query
const suggestionsQuery = computed(() => {
	if (!auth.currentUser) {
		// Return a query that will return no results instead of null for SSR compatibility
		return query(collection(db, 'suggestions'), where('userId', '==', 'no-user'))
	}
	return query(
		collection(db, 'suggestions'),
		where('userId', '==', auth.currentUser.uid),
		orderBy('createdAt', 'desc')
	)
})

// Use reactive collection
const { data: rawSuggestions } = useCollection(suggestionsQuery)

// Watch rawSuggestions directly to ensure we load messages when data first becomes available
watch(
	rawSuggestions,
	(newRawSuggestions) => {
		if (newRawSuggestions && newRawSuggestions.length > 0) {
			// Load messages for all suggestions that don't have listeners yet
			newRawSuggestions.forEach((suggestion) => {
				if (!suggestion.deleted && !messageUnsubscribers.value[suggestion.id]) {
					loadMessages(suggestion.id)
				}
			})
		}
	},
	{ immediate: true }
)

// Filter out deleted suggestions
const suggestions = computed(() => {
	if (!rawSuggestions.value) return []
	return rawSuggestions.value.filter((s) => !s.deleted)
})

// Load messages when suggestions change
watch(
	suggestions,
	(newSuggestions, oldSuggestions) => {
		// Clean up listeners for suggestions that are no longer visible
		if (oldSuggestions) {
			const oldIds = oldSuggestions.map((s) => s.id)
			const newIds = newSuggestions.map((s) => s.id)
			const removedIds = oldIds.filter((id) => !newIds.includes(id))

			removedIds.forEach((id) => {
				if (messageUnsubscribers.value[id]) {
					messageUnsubscribers.value[id]()
					delete messageUnsubscribers.value[id]
					delete messagesData.value[id]
				}
			})
		}

		// Set up listeners for new suggestions
		if (newSuggestions.length > 0) {
			newSuggestions.forEach((suggestion) => {
				if (!messageUnsubscribers.value[suggestion.id]) {
					loadMessages(suggestion.id)
				}
			})
		}
	},
	{ immediate: true }
)

async function submitSuggestion() {
	error.value = ''
	if (!isVerified.value) {
		error.value = 'You must verify your email before submitting suggestions.'
		return
	}
	if (!form.value.title.trim() || !form.value.body.trim()) {
		error.value = 'Title and details are required.'
		return
	}
	if (form.value.title.length > 80 || form.value.body.length > 500) {
		error.value = 'Title or details too long.'
		return
	}
	loading.value = true
	try {
		await addDoc(collection(db, 'suggestions'), {
			userId: auth.currentUser.uid,
			userDisplayName: auth.currentUser.displayName || auth.currentUser.email || 'User',
			createdAt: serverTimestamp(),
			status: 'open',
			title: form.value.title.trim(),
			body: form.value.body.trim()
		})
		form.value.title = ''
		form.value.body = ''
		// No need to manually fetch - useCollection will update automatically
	} catch (e) {
		error.value = 'Failed to submit suggestion.'
	}
	loading.value = false
}

function confirmDeleteSuggestion(suggestion) {
	suggestionToDelete.value = suggestion
	showDeleteModal.value = true
}

async function executeDelete() {
	if (!suggestionToDelete.value) return

	loading.value = true
	const suggestionIdToDelete = suggestionToDelete.value.id

	try {
		// Start fade-out animation
		deletingSuggestionId.value = suggestionIdToDelete

		// Wait for animation to complete (300ms)
		await new Promise((resolve) => setTimeout(resolve, 300))

		// Actually delete the suggestion
		await updateDoc(firestoreDoc(db, 'suggestions', suggestionIdToDelete), { deleted: true })
		showDeleteModal.value = false
		suggestionToDelete.value = null
		deletingSuggestionId.value = null
		// No need to manually fetch - useCollection will update automatically
	} catch (error) {
		console.error('Error deleting suggestion:', error)
		// Reset animation state on error
		deletingSuggestionId.value = null
	} finally {
		loading.value = false
	}
}

// Removed deleteSuggestion function as it's not used in the template

function startEdit(s) {
	editingId.value = s.id
	editForm.value = { title: s.title, body: s.body }
}

function cancelEdit() {
	editingId.value = null
	editForm.value = { title: '', body: '' }
}

async function saveEdit(suggestionId) {
	if (!editForm.value.title.trim() || !editForm.value.body.trim()) return
	loading.value = true
	try {
		await updateDoc(firestoreDoc(db, 'suggestions', suggestionId), {
			title: editForm.value.title.trim(),
			body: editForm.value.body.trim()
		})
		editingId.value = null
		editForm.value = { title: '', body: '' }
		// No need to manually fetch - useCollection will update automatically
	} catch (error) {
		console.error('Error updating suggestion:', error)
	} finally {
		loading.value = false
	}
}

function statusLabel(status) {
	console.log('statusLabel called with:', status)
	if (status === 'open') return 'Open'
	if (status === 'in progress') return 'Looking into it'
	if (status === 'closed') return 'Done'
	if (status === 'rejected') return 'Not Right Now'
	return status
}

// Message handling functions
function toggleMessageForm(suggestionId) {
	showMessageForm.value[suggestionId] = !showMessageForm.value[suggestionId]
}

function handleMessageAdded(suggestionId) {
	showMessageForm.value[suggestionId] = false
	// No need to reload - real-time listener will update automatically
}

function handleMessageUpdated(suggestionId) {
	// No need to reload - real-time listener will update automatically
}

function handleMessageDeleted(suggestionId) {
	// No need to reload - real-time listener will update automatically
}

// Cleanup listeners when component unmounts
onUnmounted(() => {
	Object.values(messageUnsubscribers.value).forEach((unsubscribe) => {
		if (typeof unsubscribe === 'function') {
			unsubscribe()
		}
	})
})
</script>
