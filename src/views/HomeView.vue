<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy } from 'firebase/firestore'

import HeaderIntro from '../components/HeaderIntro.vue'

const db = useFirestore()

const q = query(collection(db, 'items'), orderBy('name'))

const itemCollection = useCollection(q)
console.log(itemCollection)
</script>

<template>
	<main>
		<HeaderIntro />
		<p class="text-xl font-bold">{{ itemCollection.length }} items</p>
		<ul>
			<li v-for="item in itemCollection" :key="item.id">{{ item.name }}</li>
		</ul>
	</main>
</template>
