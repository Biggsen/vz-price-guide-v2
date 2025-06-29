<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useFirestore, useDocument } from 'vuefire'
import { doc, updateDoc } from 'firebase/firestore'
import { enabledCategories, versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'

const db = useFirestore()
const router = useRouter()
const route = useRoute()
const { user, canEditItems } = useAdmin()
const docRef = doc(db, 'items', route.params.id)

// Store the home page query parameters to restore them after editing
const homeQuery = ref({})

// Capture the referring page's query parameters
onMounted(() => {
	// If there's a redirect query parameter, use it; otherwise use the document referrer
	const redirectQuery = route.query.redirect
	if (redirectQuery) {
		try {
			const url = new URL(redirectQuery, window.location.origin)
			homeQuery.value = Object.fromEntries(url.searchParams.entries())
		} catch (e) {
			// If parsing fails, keep empty query
			homeQuery.value = {}
		}
	} else {
		// Try to extract query parameters from the referrer
		try {
			const referrer = document.referrer
			if (referrer && referrer.includes(window.location.origin)) {
				const url = new URL(referrer)
				homeQuery.value = Object.fromEntries(url.searchParams.entries())
			}
		} catch (e) {
			// If parsing fails, keep empty query
			homeQuery.value = {}
		}
	}
})

const itemSource = useDocument(docRef)

const editItem = ref({
	name: '',
	material_id: '',
	image: '',
	url: '',
	price: 1,
	stack: 64,
	category: '',
	subcategory: '',
	version: ''
})

watch(itemSource, (itemSource) => {
	editItem.value = {
		...itemSource
	}
})

async function updateItem() {
	await updateDoc(docRef, {
		...editItem.value
	})
		.then(() => {
			// Navigate back to home with preserved query parameters
			router.push({ path: '/', query: homeQuery.value })
		})
		.catch((error) => {
			console.log(error)
		})
}
</script>

<template>
	<div v-if="canEditItems" class="p-4 pt-8">
		<h2 class="text-xl font-bold mb-6">Edit item</h2>
		<form @submit.prevent="updateItem">
			<label for="name">Name</label>
			<input type="text" id="name" v-model="editItem.name" required />
			<label for="materialId">Material ID</label>
			<input type="text" id="materialId" v-model="editItem.material_id" required />
			<label for="image">Image</label>
			<input type="text" id="image" v-model="editItem.image" />
			<label for="url">Url</label>
			<input type="text" id="url" v-model="editItem.url" />
			<div class="flex gap-4">
				<div class="flex-1">
					<label for="price">Price</label>
					<input
						type="number"
						id="price"
						v-model="editItem.price"
						step="0.1"
						min="0"
						required />
				</div>
				<div class="flex-1">
					<label for="stack">Stack</label>
					<input type="number" id="stack" v-model="editItem.stack" required />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="flex-1">
					<label for="category">Category</label>
					<select
						id="category"
						v-model="editItem.category"
						class="block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;">
						<option v-for="cat in enabledCategories" :key="cat" :value="cat">
							{{ cat }}
						</option>
					</select>
				</div>
				<div class="flex-1">
					<label for="subcategory">Subcategory</label>
					<input type="text" id="subcategory" v-model="editItem.subcategory" />
				</div>
			</div>
			<label for="version">Version</label>
			<select
				id="version"
				v-model="editItem.version"
				required
				class="block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;">
				<option value="">Select a version</option>
				<option v-for="version in versions" :key="version" :value="version">
					{{ version }}
				</option>
			</select>
			<button type="submit">Update item</button>
		</form>
	</div>
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to edit items.</p>
			<RouterLink to="/" class="text-blue-600 hover:underline">Return to Home</RouterLink>
		</div>
	</div>
	<div v-else class="p-4 pt-8">
		<RouterLink to="/login">Login to view this page</RouterLink>
	</div>
</template>

<style lang="scss" scoped>
label {
	@apply block text-base font-medium leading-6 text-gray-900;
}
input[type='text'],
input[type='number'],
textarea {
	@apply block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;
}
button {
	@apply rounded-md bg-gray-asparagus px-3 py-2 mb-6 text-sm font-semibold text-white shadow-sm hover:bg-laurel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600;
}
</style>
