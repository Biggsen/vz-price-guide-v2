<template>
	<div class="p-4 py-8 max-w-2xl">
		<h1 class="text-3xl font-bold mb-6">Your Suggestions</h1>
		<p class="mb-6 text-gray-700">
			Hey {{ userName }}. Glad you're here. Would you mind helping out? If you have any ideas
			or feedback to make this site better, I'd love to hear from you.
			<span class="block mt-2">- verzion</span>
		</p>
		<div
			v-if="!isVerified"
			class="mb-6 flex items-center gap-3 bg-yellow-100 border-2 border-yellow-400 text-yellow-800 rounded p-4 text-base font-medium">
			<ExclamationTriangleIcon class="w-6 h-6 flex-shrink-0 text-yellow-500" />
			<span>You must verify your email before you can submit suggestions.</span>
		</div>
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
					maxlength="1000"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus min-h-[140px]"
					placeholder="Describe your suggestion..."
					:disabled="!isVerified"></textarea>
			</div>
			<div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
			<BaseButton type="submit" variant="primary" :disabled="loading || !isVerified">
				Submit Suggestion
			</BaseButton>
		</form>
		<div v-if="isVerified">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Previous Suggestions
			</h2>
			<div v-if="suggestions.length === 0" class="text-gray-500">No suggestions yet.</div>
			<div v-else class="space-y-6">
				<div
					v-for="s in suggestions"
					:key="s.id"
					class="bg-sea-mist rounded-lg shadow-md border-2 border-amulet h-full overflow-hidden flex flex-col">
					<template v-if="editingId === s.id">
						<!-- Card Header -->
						<div
							class="bg-amulet py-2 px-3 pl-4 border-x-2 border-t-2 border-white rounded-t-lg">
							<div class="flex items-center justify-between">
								<input
									v-model="editForm.title"
									maxlength="80"
									class="text-gray-900 bg-white border-2 border-gray-asparagus rounded px-3 py-1 flex-1 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus"
									placeholder="Edit Suggestion"
									required />
							</div>
						</div>
						<!-- Card Body -->
						<div
							class="bg-norway p-4 border-x-2 border-b-2 border-white rounded-b-lg flex-1 flex flex-col">
							<form @submit.prevent="saveEdit(s)" class="flex-1 flex flex-col">
								<textarea
									v-model="editForm.body"
									maxlength="1000"
									class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus min-h-[140px] flex-1"
									required></textarea>
								<div class="flex gap-2 mt-2">
									<BaseButton type="submit" variant="primary">Save</BaseButton>
									<BaseButton
										type="button"
										@click="cancelEdit"
										variant="secondary">
										Cancel
									</BaseButton>
								</div>
							</form>
						</div>
					</template>
					<template v-else>
						<!-- Card Header -->
						<div
							class="bg-amulet py-2 px-3 pl-4 border-x-2 border-t-2 border-white rounded-t-lg">
							<div class="flex items-center justify-between">
								<input
									v-if="editingId === s.id"
									v-model="editForm.title"
									maxlength="80"
									class="text-xl font-semibold text-heavy-metal bg-transparent border-none outline-none flex-1 placeholder:text-heavy-metal/70"
									placeholder="Edit Suggestion"
									required />
								<h3
									v-else
									class="text-xl font-semibold text-heavy-metal hover:text-gray-asparagus cursor-pointer flex-1">
									{{ s.title }}
								</h3>
								<!-- Action Buttons -->
								<div class="flex gap-2 ml-3">
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
								</div>
							</div>
						</div>
						<!-- Card Body -->
						<div
							class="bg-norway p-4 border-x-2 border-b-2 border-white rounded-b-lg flex-1 flex flex-col">
							<div class="flex-1">
								<p class="text-heavy-metal mb-3 whitespace-pre-line">
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
									<div>
										<span class="font-medium">Status:</span>
										<span
											v-if="s.status === 'open'"
											class="inline-flex items-center">
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
											<CheckIcon class="w-4 h-4 mr-1 align-middle -mt-0.5" />
											{{ statusLabel(s.status) }}
										</span>
										<span v-else>{{ statusLabel(s.status) }}</span>
									</div>
								</div>
							</div>
						</div>
					</template>
				</div>
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
</template>

<script setup>
import { ref, computed } from 'vue'
import {
	collection,
	addDoc,
	query,
	where,
	orderBy,
	serverTimestamp,
	doc as firestoreDoc,
	updateDoc
} from 'firebase/firestore'
import { useFirebaseAuth, useFirestore, useCollection } from 'vuefire'
import { useUserProfile } from '../utils/userProfile.js'
import { InboxIcon } from '@heroicons/vue/20/solid'
import { EyeIcon } from '@heroicons/vue/24/outline'
import { TrashIcon, PencilIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'

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
const editingId = ref(null)
const editForm = ref({ title: '', body: '' })
const isVerified = computed(() => auth.currentUser?.emailVerified)

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

// Filter out deleted suggestions
const suggestions = computed(() => {
	if (!rawSuggestions.value) return []
	return rawSuggestions.value.filter((s) => !s.deleted)
})

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
	if (form.value.title.length > 80 || form.value.body.length > 1000) {
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
	await updateDoc(firestoreDoc(db, 'suggestions', suggestionToDelete.value.id), { deleted: true })
	showDeleteModal.value = false
	suggestionToDelete.value = null
	// No need to manually fetch - useCollection will update automatically
}

// Removed deleteSuggestion function as it's not used in the template

function startEdit(s) {
	editingId.value = s.id
	editForm.value = { title: s.title, body: s.body }
}

function cancelEdit() {
	editingId.value = null
}

async function saveEdit(s) {
	if (!editForm.value.title.trim() || !editForm.value.body.trim()) return
	await updateDoc(firestoreDoc(db, 'suggestions', s.id), {
		title: editForm.value.title.trim(),
		body: editForm.value.body.trim()
	})
	editingId.value = null
	// No need to manually fetch - useCollection will update automatically
}

function statusLabel(status) {
	if (status === 'open') return 'Open'
	if (status === 'in progress') return 'Looking into it'
	if (status === 'closed') return 'Done'
	if (status === 'rejected') return 'Not Right Now'
	return status
}

// No need for onMounted since useCollection handles reactivity automatically
</script>
