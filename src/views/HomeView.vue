<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { collection } from 'firebase/firestore'

const db = useFirestore()

const itemCollection = useCollection(collection(db, 'items'))
console.log(itemCollection)
</script>

<template>
	<main>
		<ul>
			<li v-for="item in itemCollection" :key="item.id">{{ item.name }}</li>
		</ul>
	</main>
</template>
