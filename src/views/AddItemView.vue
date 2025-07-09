<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, addDoc, getDocs, query } from 'firebase/firestore'
import { categories, versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'

const db = useFirestore()
const { user, canAddItems } = useAdmin()

const newItemInitial = ref({
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

const newItem = ref({
	...newItemInitial.value
})

// Add a new document with a generated id.
async function addItem() {
	const newDoc = await addDoc(collection(db, 'items'), {
		...newItem.value
	})

	if (newDoc.id) {
		newItem.value = { ...newItemInitial.value }
	}
}
</script>

<template>
	<div v-if="canAddItems" class="p-4 pt-8">
		<h2 class="text-xl font-bold mb-6">Add item</h2>
		<form @submit.prevent="addItem">
			<div class="flex gap-4">
				<div class="flex-1">
					<label for="name">Name</label>
					<input type="text" id="name" v-model="newItem.name" required />
				</div>
				<div class="flex-1">
					<label for="materialId">Material ID</label>
					<input type="text" id="materialId" v-model="newItem.material_id" required />
				</div>
			</div>
			<label for="image">Image</label>
			<input type="text" id="image" v-model="newItem.image" />
			<label for="url">Url</label>
			<input type="text" id="url" v-model="newItem.url" />
			<div class="flex gap-4">
				<div class="flex-1">
					<label for="price">Price</label>
					<input
						type="number"
						id="price"
						v-model="newItem.price"
						step="0.1"
						min="0"
						required />
				</div>
				<div class="flex-1">
					<label for="stack">Stack</label>
					<input type="number" id="stack" v-model="newItem.stack" required />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="flex-1">
					<label for="category">Category</label>
					<select
						id="category"
						v-model="newItem.category"
						class="block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;">
						<option v-for="cat in categories" :key="cat" :value="cat">
							{{ cat }}
						</option>
					</select>
				</div>
				<div class="flex-1">
					<label for="subcategory">Subcategory</label>
					<input type="text" id="subcategory" v-model="newItem.subcategory" />
				</div>
			</div>
			<label for="version">Version</label>
			<select
				id="version"
				v-model="newItem.version"
				required
				class="block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;">
				<option value="">Select a version</option>
				<option v-for="version in versions" :key="version" :value="version">
					{{ version }}
				</option>
			</select>
			<button type="submit">Add new item</button>
		</form>
	</div>
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to add items.</p>
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
