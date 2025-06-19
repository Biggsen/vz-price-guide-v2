<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useFirestore, useCurrentUser } from 'vuefire'
import { collection, doc, addDoc, getDocs, query } from 'firebase/firestore'
import { categories } from '../constants.js'

const db = useFirestore()
const router = useRouter()
const user = useCurrentUser()

const newItemInitial = ref({
	name: '',
	material_id: '',
	image: '',
	url: '',
	price: 1,
	stack: 64,
	category: '',
	subcategory: ''
})

const newItem = ref({
	...newItemInitial.value
})

const importItem = ref({
	source: ''
})

// Add a new document with a generated id.
async function addItem() {
	const newDoc = await addDoc(collection(db, 'items'), {
		...newItem.value
	})

	if (newDoc.id) {
		newItem.value = { ...newItemInitial.value }
		//importItem.value.source = ''
	}
}

// Add a new field to items collection
async function addField() {
	const querySnapshot = await getDocs(query(collection(db, 'items')))
	querySnapshot.forEach(async function (item) {
		const docRef = doc(db, 'items', `${item.id}`)
		console.log(item.data())

		// This creates (or updates) a field
		// await updateDoc(docRef, {
		// 	subcategory: ''
		// })
	})
}

const transformedSource = computed(() => {
	if (importItem.value.source !== '') {
		return JSON.parse(importItem.value.source)
	} else {
		return ''
	}
})

function applyToForm(index) {
	console.log(transformedSource.value[index])
	newItem.value = {
		...transformedSource.value[index]
	}
	//importedItemList.value.splice(index, 1)
}
</script>

<template>
	<div v-if="user?.email" class="p-4 pt-8">
		<div class="mb-10">
			<button @click="addField">Add 'subcategory' field</button>
		</div>
		<div class="mb-10">
			<textarea name="" id="" cols="30" rows="3" v-model="importItem.source"></textarea>
			<ul>
				<li v-for="(item, index) in transformedSource" :key="item.id">
					<button @click="applyToForm(index)">Apply {{ item.name }}</button>
				</li>
			</ul>
		</div>
		<h2 class="text-xl font-bold mb-6">Add item</h2>
		<form @submit.prevent="addItem">
			<label for="name">Name</label>
			<input type="text" id="name" v-model="newItem.name" required />
			<label for="materialId">Material ID</label>
			<input type="text" id="materialId" v-model="newItem.material_id" required />
			<label for="image">Image</label>
			<input type="text" id="image" v-model="newItem.image" />
			<label for="url">Url</label>
			<input type="text" id="url" v-model="newItem.url" />
			<label for="price">Price</label>
			<input type="number" id="price" v-model="newItem.price" step="0.1" min="0" required />
			<label for="stack">Stack</label>
			<input type="number" id="stack" v-model="newItem.stack" required />
			<label for="category">Category</label>
			<select id="category" v-model="newItem.category" required class="block w-full rounded-md border-0 px-2 py-1.5 mt-2 mb-6 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base sm:leading-6;">
				<option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
			</select>
			<label for="subcategory">Subcategory</label>
			<input type="text" id="subcategory" v-model="newItem.subcategory" />
			<button type="submit">Add new item</button>
		</form>
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
