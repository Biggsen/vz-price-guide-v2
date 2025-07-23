<template>
	<div class="p-4 py-8 max-w-4xl mx-auto">
		<h1 class="text-2xl font-bold mb-6">All Suggestions</h1>
		<div v-if="loading" class="text-gray-500">Loading...</div>
		<div v-else>
			<table class="min-w-full border rounded bg-white">
				<thead>
					<tr class="bg-gray-100">
						<th class="p-2 text-left">Title</th>
						<th class="p-2 text-left">User</th>
						<th class="p-2 text-left">Status</th>
						<th class="p-2 text-left">Created</th>
						<th class="p-2 text-left">Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="s in suggestions" :key="s.id" class="border-t">
						<td class="p-2 font-semibold">{{ s.title }}</td>
						<td class="p-2">{{ s.userDisplayName }}</td>
						<td class="p-2">
							<select
								v-model="s.status"
								@change="updateStatus(s)"
								class="border rounded px-2 py-1">
								<option value="open">Open</option>
								<option value="in progress">In Progress</option>
								<option value="closed">Closed</option>
								<option value="rejected">Rejected</option>
							</select>
						</td>
						<td class="p-2 text-xs text-gray-500">
							{{ s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : '' }}
						</td>
						<td class="p-2">
							<!-- Future: link to detail view -->
						</td>
					</tr>
				</tbody>
			</table>
			<div v-if="suggestions.length === 0" class="text-gray-500 mt-6">
				No suggestions found.
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
	getFirestore,
	collection,
	getDocs,
	updateDoc,
	doc,
	orderBy,
	query
} from 'firebase/firestore'

const db = getFirestore()
const suggestions = ref([])
const loading = ref(true)

async function fetchSuggestions() {
	loading.value = true
	const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'))
	const snap = await getDocs(q)
	suggestions.value = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
	loading.value = false
}

async function updateStatus(suggestion) {
	await updateDoc(doc(db, 'suggestions', suggestion.id), { status: suggestion.status })
}

onMounted(() => {
	fetchSuggestions()
})
</script>
