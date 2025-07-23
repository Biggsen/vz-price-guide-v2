<template>
	<div class="p-4 py-8 max-w-2xl mx-auto">
		<h1 class="text-2xl font-bold mb-6">Your Suggestions</h1>
		<p class="mb-6 text-gray-700">
			Hey {{ userName }}. Glad you're here. Would you mind helping out? If you have any ideas
			or feedback to make this site better, I'd love to hear from you.
			<span class="block mt-2">- verzion</span>
		</p>
		<form @submit.prevent="submitSuggestion" class="space-y-6 mb-8">
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
					placeholder="Suggestion title" />
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
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus min-h-[100px]"
					placeholder="Describe your suggestion..."></textarea>
			</div>
			<div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
			<button
				type="submit"
				:disabled="loading"
				class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80">
				Submit Suggestion
			</button>
		</form>
		<div>
			<h2 class="text-lg font-semibold mb-4">Previous Suggestions</h2>
			<div v-if="suggestions.length === 0" class="text-gray-500">No suggestions yet.</div>
			<ul v-else class="space-y-4">
				<li v-for="s in suggestions" :key="s.id" class="border rounded p-4 bg-gray-50">
					<div class="font-bold text-gray-900">{{ s.title }}</div>
					<div class="text-gray-700 mb-2 whitespace-pre-line">{{ s.body }}</div>
					<div class="text-xs text-gray-500">
						Status:
						<span class="font-semibold">{{ s.status }}</span>
						&bull;
						{{ s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : '' }}
					</div>
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
	serverTimestamp
} from 'firebase/firestore'
import { useFirebaseAuth } from 'vuefire'
import { useUserProfile } from '../utils/userProfile.js'

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

async function fetchSuggestions() {
	if (!auth.currentUser) return
	const q = query(
		collection(db, 'suggestions'),
		where('userId', '==', auth.currentUser.uid),
		orderBy('createdAt', 'desc')
	)
	const snap = await getDocs(q)
	suggestions.value = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

async function submitSuggestion() {
	error.value = ''
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

onMounted(() => {
	fetchSuggestions()
})
</script>
