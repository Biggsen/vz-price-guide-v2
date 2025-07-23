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
									{{ s.displayName }}
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
						<button
							@click="hardDeleteSuggestion(s.id)"
							class="ml-4 bg-semantic-danger text-white rounded px-3 py-1 text-sm shadow-sm focus:outline-none hover:bg-opacity-80">
							Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
	getFirestore,
	collection,
	getDocs,
	updateDoc,
	doc,
	orderBy,
	query,
	getDoc as getFirestoreDoc,
	deleteDoc
} from 'firebase/firestore'

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

async function fetchSuggestions() {
	loading.value = true
	const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'))
	const snap = await getDocs(q)
	const rawSuggestions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
	// Fetch user profiles for each suggestion
	const withProfiles = await Promise.all(
		rawSuggestions.map(async (s) => {
			const profile = await fetchUserProfile(s.userId, s.userEmail || '')
			return { ...s, ...profile }
		})
	)
	suggestions.value = withProfiles
	loading.value = false
}

async function updateStatus(suggestion) {
	await updateDoc(doc(db, 'suggestions', suggestion.id), { status: suggestion.status })
}

async function hardDeleteSuggestion(id) {
	if (
		!confirm(
			'Are you sure you want to permanently delete this suggestion? This cannot be undone.'
		)
	)
		return
	await deleteDoc(doc(db, 'suggestions', id))
	await fetchSuggestions()
}

const filteredSuggestions = computed(() => {
	return tab.value === 'active'
		? suggestions.value.filter((s) => !s.deleted)
		: suggestions.value.filter((s) => s.deleted)
})

onMounted(() => {
	fetchSuggestions()
})
</script>
