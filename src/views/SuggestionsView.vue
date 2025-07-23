<template>
	<div class="p-4 py-8 max-w-2xl">
		<h1 class="text-2xl font-bold mb-6">Your Suggestions</h1>
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
			<button
				type="submit"
				:disabled="loading || !isVerified"
				class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80">
				Submit Suggestion
			</button>
		</form>
		<div v-if="isVerified">
			<h2 class="text-lg font-semibold mb-4">Previous Suggestions</h2>
			<div v-if="suggestions.length === 0" class="text-gray-500">No suggestions yet.</div>
			<ul v-else class="space-y-4">
				<li
					v-for="s in suggestions"
					:key="s.id"
					class="border border-gray-200 bg-gray-50 rounded p-4 relative">
					<template v-if="editingId === s.id">
						<form @submit.prevent="saveEdit(s)">
							<input
								v-model="editForm.title"
								maxlength="80"
								class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-bold"
								required />
							<textarea
								v-model="editForm.body"
								maxlength="1000"
								class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus min-h-[140px]"
								required></textarea>
							<div class="flex gap-2 mb-2">
								<button
									type="submit"
									class="px-3 py-1 bg-semantic-success text-white rounded hover:bg-opacity-80 text-sm">
									Save
								</button>
								<button
									type="button"
									@click="cancelEdit"
									class="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm">
									Cancel
								</button>
							</div>
						</form>
					</template>
					<template v-else>
						<div class="font-bold text-gray-900 mb-2">{{ s.title }}</div>
						<div class="text-gray-700 mb-2 whitespace-pre-line">{{ s.body }}</div>
						<button
							v-if="editingId !== s.id && s.status === 'open'"
							class="bg-semantic-info text-white rounded px-3 py-1 text-sm shadow-sm focus:outline-none inline-flex items-center mb-2 hover:bg-opacity-80"
							@click="startEdit(s)">
							<PencilSquareIcon class="w-4 h-4 mr-1" />
							Edit
						</button>
						<hr class="border-t border-gray-200 my-2" />
						<div class="text-sm text-gray-600 mb-2">
							Submitted:
							{{
								s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : ''
							}}
						</div>
						<div class="text-sm text-gray-600 mb-2 flex items-center gap-1">
							Status:
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
							<span v-else>{{ statusLabel(s.status) }}</span>
						</div>
						<div class="flex items-center justify-between mt-4">
							<div>
								<template v-if="deleteConfirmId === s.id">
									<span class="text-sm mr-2">Are you sure?</span>
									<button
										@click="softDeleteSuggestion(s.id)"
										class="px-3 py-1 text-sm bg-semantic-danger text-white rounded hover:bg-opacity-80 transition-colors mr-2">
										Yes
									</button>
									<button
										@click="deleteConfirmId = null"
										class="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors">
										No
									</button>
								</template>
								<template v-else>
									<button
										@click="deleteConfirmId = s.id"
										class="bg-semantic-warning text-white rounded px-3 py-1 text-sm shadow-sm focus:outline-none inline-flex items-center hover:bg-opacity-80">
										<TrashIcon class="w-4 h-4 mr-1" />
										Delete
									</button>
								</template>
							</div>
						</div>
					</template>
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
	getFirestore,
	collection,
	addDoc,
	query,
	where,
	orderBy,
	getDocs,
	serverTimestamp,
	deleteDoc,
	doc as firestoreDoc,
	updateDoc
} from 'firebase/firestore'
import { useFirebaseAuth } from 'vuefire'
import { useUserProfile } from '../utils/userProfile.js'
import { InboxIcon } from '@heroicons/vue/20/solid'
import { EyeIcon } from '@heroicons/vue/24/outline'
import { TrashIcon, PencilSquareIcon } from '@heroicons/vue/20/solid'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const auth = useFirebaseAuth()
const db = getFirestore()
const form = ref({ title: '', body: '' })
const error = ref('')
const loading = ref(false)
const suggestions = ref([])
const userId = computed(() => auth.currentUser?.uid)
const { userProfile } = useUserProfile(userId.value)
const userName = computed(
	() =>
		userProfile.value?.display_name ||
		auth.currentUser?.displayName ||
		auth.currentUser?.email?.split('@')[0] ||
		'there'
)
const deleteConfirmId = ref(null)
const editingId = ref(null)
const editForm = ref({ title: '', body: '' })
const isVerified = computed(() => auth.currentUser?.emailVerified)

async function fetchSuggestions() {
	if (!auth.currentUser) return
	const q = query(
		collection(db, 'suggestions'),
		where('userId', '==', auth.currentUser.uid),
		orderBy('createdAt', 'desc')
	)
	const snap = await getDocs(q)
	const withProfiles = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
	suggestions.value = withProfiles.filter((s) => !s.deleted)
}

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
		await fetchSuggestions()
	} catch (e) {
		error.value = 'Failed to submit suggestion.'
	}
	loading.value = false
}

async function softDeleteSuggestion(id) {
	await updateDoc(firestoreDoc(db, 'suggestions', id), { deleted: true })
	deleteConfirmId.value = null
	await fetchSuggestions()
}

async function deleteSuggestion(id) {
	if (!confirm('Are you sure you want to delete this suggestion?')) return
	await deleteDoc(firestoreDoc(db, 'suggestions', id))
	await fetchSuggestions()
}

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
	await fetchSuggestions()
}

function statusLabel(status) {
	if (status === 'open') return 'Open'
	if (status === 'in progress') return 'Looking into it'
	if (status === 'closed') return 'Done'
	if (status === 'rejected') return 'Not Right Now'
	return status
}

onMounted(() => {
	fetchSuggestions()
})
</script>
