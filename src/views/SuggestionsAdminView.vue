<template>
	<div class="p-4 py-8 max-w-4xl">
		<h1 class="text-2xl font-bold mb-6">All Suggestions</h1>
		<div class="mb-6 flex gap-2">
			<button
				@click="tab = 'active'"
				:class="[
					tab === 'active'
						? 'bg-gray-700 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
					'px-4 py-2 rounded font-medium text-sm transition'
				]">
				Active
			</button>
			<button
				@click="tab = 'deleted'"
				:class="[
					tab === 'deleted'
						? 'bg-gray-700 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
					'px-4 py-2 rounded font-medium text-sm transition'
				]">
				Deleted
			</button>
		</div>
		<div v-if="loading" class="text-gray-500">Loading...</div>
		<div v-else>
			<div v-if="filteredSuggestions.length === 0" class="text-gray-500 mt-6">
				No suggestions found.
			</div>
			<div v-else class="space-y-6">
				<div
					v-for="s in filteredSuggestions"
					:key="s.id"
					:class="[
						'rounded-lg p-6 shadow-sm relative',
						s.status === 'open'
							? 'border-semantic-info border-2 bg-semantic-info/10'
							: s.status === 'in progress'
							? 'border-semantic-warning border-2 bg-semantic-warning/10'
							: s.status === 'closed'
							? 'border-semantic-success border-2 bg-semantic-success/10'
							: s.status === 'rejected'
							? 'border-semantic-danger border-2 bg-semantic-danger/10'
							: 'border bg-white',
						tab === 'active' && s.deleted ? 'hidden' : '',
						tab === 'deleted' && !s.deleted ? 'hidden' : ''
					]">
					<template v-if="tab === 'deleted'">
						<div class="absolute top-3 right-3 z-10">
							<span
								class="bg-gray-300 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">
								Deleted
							</span>
						</div>
					</template>
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-3">
							<img
								v-if="s.minecraftUsername"
								:src="`https://mc-heads.net/avatar/${s.minecraftUsername}/32`"
								:alt="s.minecraftUsername"
								class="w-6 h-6 rounded" />
							<div>
								<div class="text-sm text-gray-800 font-semibold">
									{{ s.displayName || s.userDisplayName || s.email }}
								</div>
								<div
									v-if="
										s.minecraftUsername && s.minecraftUsername !== s.displayName
									"
									class="text-xs text-gray-500">
									Minecraft: {{ s.minecraftUsername }}
								</div>
								<div v-if="s.email" class="text-xs text-gray-400">
									{{ s.email }}
								</div>
							</div>
						</div>
						<div class="text-sm text-gray-700 font-semibold">
							{{ formatDate(s.createdAt?.toDate ? s.createdAt.toDate() : null) }}
						</div>
					</div>
					<div
						:class="[
							'font-bold text-lg text-gray-900 mb-1',
							s.deleted ? 'line-through' : ''
						]">
						{{ s.title }}
					</div>
					<div
						:class="[
							'text-gray-700 mb-4 whitespace-pre-line',
							s.deleted ? 'line-through' : ''
						]">
						{{ s.body }}
					</div>
					<div class="flex items-center justify-between mt-4">
						<div class="inline-flex border-2 border-gray-300 rounded overflow-hidden">
							<button
								v-for="(option, idx) in statusOptions"
								:key="option.value"
								@click="setStatus(s, option.value)"
								:class="[
									s.status === option.value
										? 'bg-gray-700 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
									'px-3 py-1 text-sm font-medium transition',
									idx !== statusOptions.length - 1
										? 'border-r border-gray-300'
										: ''
								]">
								{{ option.label }}
							</button>
						</div>
						<div class="flex gap-2 ml-4">
							<button
								v-if="s.deleted"
								@click="confirmRestore(s)"
								class="bg-semantic-success text-white rounded px-3 py-1 text-sm shadow-sm focus:outline-none hover:bg-opacity-80">
								Restore
							</button>
							<button
								@click="confirmPermanentDelete(s)"
								class="bg-semantic-danger text-white rounded px-3 py-1 text-sm shadow-sm focus:outline-none hover:bg-opacity-80">
								{{ s.deleted ? 'Permanently Delete' : 'Delete' }}
							</button>
						</div>
					</div>

					<!-- Messages Section -->
					<div class="mt-4 pt-4 border-t border-gray-200">
						<div class="flex items-center justify-between mb-3">
							<h4 class="text-sm font-medium text-gray-700">Discussion</h4>
						</div>

						<!-- Messages List -->
						<SuggestionMessageList
							v-if="messagesData[s.id] && messagesData[s.id].length > 0"
							:messages="messagesData[s.id]"
							:suggestion-id="s.id"
							@suggestion-message-updated="handleMessageUpdated(s.id)"
							@suggestion-message-deleted="handleMessageDeleted(s.id)" />

						<!-- Reply Button -->
						<div class="mt-3 text-right">
							<button
								@click="toggleMessageForm(s.id)"
								class="text-sm text-gray-600 hover:text-gray-800 underline">
								{{
									showMessageForm[s.id]
										? 'Cancel'
										: messagesData[s.id] && messagesData[s.id].length > 0
										? 'Reply'
										: 'Reply'
								}}
							</button>
						</div>

						<!-- Message Form -->
						<AdminSuggestionMessageForm
							v-if="showMessageForm[s.id]"
							:suggestion-id="s.id"
							@suggestion-message-added="handleMessageAdded(s.id)"
							@cancel="showMessageForm[s.id] = false" />
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Restore Confirmation Modal -->
	<!-- prettier-ignore -->
	<BaseModal
		:isOpen="showRestoreModal"
		title="Restore Suggestion"
		size="small"
		@close="showRestoreModal = false; suggestionToRestore = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to restore
					<span class="font-semibold">{{ suggestionToRestore?.title }}</span>
					?
				</h3>
				<p class="text-sm text-gray-600 mt-2">
					This will make the suggestion active again.
				</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<!-- prettier-ignore -->
					<BaseButton
						@click="showRestoreModal = false; suggestionToRestore = null"
						variant="secondary">
						Cancel
					</BaseButton>
					<BaseButton
						@click="executeRestore"
						:disabled="loading"
						variant="primary"
						class="bg-semantic-success hover:bg-opacity-90">
						{{ loading ? 'Restoring...' : 'Restore' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>

	<!-- Permanently Delete Confirmation Modal -->
	<!-- prettier-ignore -->
	<BaseModal
		:isOpen="showPermanentDeleteModal"
		title="Permanently Delete Suggestion"
		size="small"
		@close="showPermanentDeleteModal = false; suggestionToPermanentlyDelete = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to permanently delete
					<span class="font-semibold">{{ suggestionToPermanentlyDelete?.title }}</span>
					?
				</h3>
				<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<!-- prettier-ignore -->
					<BaseButton
						@click="showPermanentDeleteModal = false; suggestionToPermanentlyDelete = null"
						variant="secondary">
						Cancel
					</BaseButton>
					<BaseButton
						@click="executePermanentDelete"
						:disabled="loading"
						variant="primary"
						class="bg-semantic-danger hover:bg-opacity-90">
						{{ loading ? 'Deleting...' : 'Permanently Delete' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import {
	getFirestore,
	collection,
	getDocs,
	updateDoc,
	doc,
	orderBy,
	query,
	getDoc as getFirestoreDoc,
	deleteDoc,
	serverTimestamp,
	onSnapshot
} from 'firebase/firestore'
import SuggestionMessageForm from '@/components/SuggestionMessageForm.vue'
import AdminSuggestionMessageForm from '@/components/AdminSuggestionMessageForm.vue'
import SuggestionMessageList from '@/components/SuggestionMessageList.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import { getSuggestionMessagesQuery } from '@/utils/suggestionMessages.js'
import { useAdmin } from '@/utils/admin.js'

function formatDate(date) {
	if (!date) return ''
	const d = new Date(date)
	const now = new Date()
	const yesterday = new Date()
	yesterday.setDate(now.getDate() - 1)
	if (d.toDateString() === now.toDateString()) return 'Today'
	if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
	return d.toLocaleDateString()
}

const db = getFirestore()
const suggestions = ref([])
const loading = ref(true)
const tab = ref('active')
const showMessageForm = ref({})
const messagesData = ref({})
const messageUnsubscribers = ref({})
const suggestionsUnsubscribe = ref(null)
const { isAdmin } = useAdmin()

// Modal state
const showRestoreModal = ref(false)
const suggestionToRestore = ref(null)
const showPermanentDeleteModal = ref(false)
const suggestionToPermanentlyDelete = ref(null)

const statusOptions = [
	{ value: 'open', label: 'Open' },
	{ value: 'in progress', label: 'Considering' },
	{ value: 'closed', label: 'Done' },
	{ value: 'rejected', label: 'Not Right Now' }
]
function setStatus(suggestion, value) {
	if (suggestion.status !== value) {
		suggestion.status = value
		updateStatus(suggestion)
	}
}

async function fetchUserProfile(userId, fallbackEmail) {
	if (!userId) return { displayName: fallbackEmail, minecraftUsername: '', email: fallbackEmail }
	try {
		const userDoc = await getFirestoreDoc(doc(db, 'users', userId))
		if (userDoc.exists()) {
			const data = userDoc.data()
			return {
				displayName: data.display_name || data.minecraft_username || fallbackEmail,
				minecraftUsername: data.minecraft_username || '',
				email: data.email || fallbackEmail
			}
		}
	} catch {}
	return { displayName: fallbackEmail, minecraftUsername: '', email: fallbackEmail }
}

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

function setupSuggestionsListener() {
	loading.value = true
	const q = query(collection(db, 'suggestions'))

	suggestionsUnsubscribe.value = onSnapshot(
		q,
		async (snapshot) => {
			const rawSuggestions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

			// Sort by lastActivityAt (fallback to createdAt for older suggestions)
			rawSuggestions.sort((a, b) => {
				const aTime = a.lastActivityAt || a.createdAt
				const bTime = b.lastActivityAt || b.createdAt
				return bTime.toDate() - aTime.toDate()
			})

			// Fetch user profiles for each suggestion
			const withProfiles = await Promise.all(
				rawSuggestions.map(async (s) => {
					const profile = await fetchUserProfile(s.userId, s.userEmail || '')
					return { ...s, ...profile }
				})
			)
			suggestions.value = withProfiles
			loading.value = false
		},
		(error) => {
			console.error('Error loading suggestions:', error)
			loading.value = false
		}
	)
}

async function updateStatus(suggestion) {
	await updateDoc(doc(db, 'suggestions', suggestion.id), {
		status: suggestion.status,
		lastActivityAt: serverTimestamp()
	})
}

function confirmRestore(suggestion) {
	suggestionToRestore.value = suggestion
	showRestoreModal.value = true
}

async function executeRestore() {
	if (!suggestionToRestore.value) return

	loading.value = true
	try {
		await updateDoc(doc(db, 'suggestions', suggestionToRestore.value.id), {
			deleted: null,
			lastActivityAt: serverTimestamp()
		})
		showRestoreModal.value = false
		suggestionToRestore.value = null
	} catch (error) {
		console.error('Error restoring suggestion:', error)
		alert('Failed to restore suggestion. Please try again.')
	} finally {
		loading.value = false
	}
}

function confirmPermanentDelete(suggestion) {
	suggestionToPermanentlyDelete.value = suggestion
	showPermanentDeleteModal.value = true
}

async function executePermanentDelete() {
	if (!suggestionToPermanentlyDelete.value) return

	loading.value = true
	try {
		await deleteDoc(doc(db, 'suggestions', suggestionToPermanentlyDelete.value.id))
		showPermanentDeleteModal.value = false
		suggestionToPermanentlyDelete.value = null
	} catch (error) {
		console.error('Error permanently deleting suggestion:', error)
		alert('Failed to permanently delete suggestion. Please try again.')
	} finally {
		loading.value = false
	}
}

const filteredSuggestions = computed(() => {
	return tab.value === 'active'
		? suggestions.value.filter((s) => !s.deleted)
		: suggestions.value.filter((s) => s.deleted)
})

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

// Cleanup listeners when component unmounts
onUnmounted(() => {
	// Clean up suggestions listener
	if (suggestionsUnsubscribe.value) {
		suggestionsUnsubscribe.value()
	}

	// Clean up message listeners
	Object.values(messageUnsubscribers.value).forEach((unsubscribe) => {
		if (typeof unsubscribe === 'function') {
			unsubscribe()
		}
	})
})

onMounted(() => {
	setupSuggestionsListener()
})
</script>
