<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, where } from 'firebase/firestore'

import HeaderIntro from '../components/HeaderIntro.vue'
import ItemTable from '../components/ItemTable.vue'

const db = useFirestore()

const qDrops = query(
	collection(db, 'items'),
	where('category', '==', 'drops'),
	orderBy('name', 'asc')
)
const qEarth = query(
	collection(db, 'items'),
	where('category', '==', 'earth'),
	orderBy('name', 'asc')
)
const qFood = query(
	collection(db, 'items'),
	where('category', '==', 'food'),
	orderBy('name', 'asc')
)
const qStone = query(
	collection(db, 'items'),
	where('category', '==', 'stone'),
	orderBy('name', 'asc')
)
const qSand = query(
	collection(db, 'items'),
	where('category', '==', 'sand'),
	orderBy('name', 'asc')
)
const qWood = query(
	collection(db, 'items'),
	where('category', '==', 'wood'),
	orderBy('name', 'asc')
)
const qUtility = query(
	collection(db, 'items'),
	where('category', '==', 'utility'),
	orderBy('name', 'asc')
)
const qOres = query(
	collection(db, 'items'),
	where('category', '==', 'ores'),
	orderBy('name', 'asc')
)

const dropsCollection = useCollection(qDrops)
const earthCollection = useCollection(qEarth)
const foodCollection = useCollection(qFood)
const stoneCollection = useCollection(qStone)
const sandCollection = useCollection(qSand)
const woodCollection = useCollection(qWood)
const utilityCollection = useCollection(qUtility)
const oresCollection = useCollection(qOres)
</script>

<template>
	<main>
		<HeaderIntro />
		<ItemTable :collection="oresCollection" />
		<ItemTable :collection="stoneCollection" />
		<ItemTable :collection="earthCollection" />
		<ItemTable :collection="sandCollection" />
		<ItemTable :collection="woodCollection" />
		<ItemTable :collection="dropsCollection" />
		<ItemTable :collection="foodCollection" />
		<ItemTable :collection="utilityCollection" />
	</main>
</template>
