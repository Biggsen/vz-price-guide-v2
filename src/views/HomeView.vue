<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, where } from 'firebase/firestore'

import HeaderIntro from '../components/HeaderIntro.vue'
import ItemTable from '../components/ItemTable.vue'

const db = useFirestore()

const qOres = query(
	collection(db, 'items'),
	where('category', '==', 'ores'),
	orderBy('name', 'asc')
)

const qStone = query(
	collection(db, 'items'),
	where('category', '==', 'stone'),
	orderBy('name', 'asc')
)

const qEarth = query(
	collection(db, 'items'),
	where('category', '==', 'earth'),
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

const qDrops = query(
	collection(db, 'items'),
	where('category', '==', 'drops'),
	orderBy('name', 'asc')
)

const qFood = query(
	collection(db, 'items'),
	where('category', '==', 'food'),
	orderBy('name', 'asc')
)

const qUtility = query(
	collection(db, 'items'),
	where('category', '==', 'utility'),
	orderBy('name', 'asc')
)

const oresCollection = useCollection(qOres)
const stoneCollection = useCollection(qStone)
const earthCollection = useCollection(qEarth)
const sandCollection = useCollection(qSand)
const woodCollection = useCollection(qWood)
const dropsCollection = useCollection(qDrops)
const foodCollection = useCollection(qFood)
const utilityCollection = useCollection(qUtility)

const categories = ['ores', 'stone', 'earth', 'sand', 'wood', 'drops', 'food', 'utility']
</script>

<template>
	<main id="top">
		<HeaderIntro />
		<nav class="bg-norway border-2 border-white p-3 px-10">
			<ul class="flex justify-between">
				<li v-for="(cat, index) in categories">
					<a :href="`#${cat}`" class="capitalize underline hover:text-gray-asparagus">{{
						cat
					}}</a>
				</li>
			</ul>
		</nav>
		<ItemTable :collection="oresCollection" :categories="categories" />
		<ItemTable :collection="stoneCollection" :categories="categories" />
		<ItemTable :collection="earthCollection" :categories="categories" />
		<ItemTable :collection="sandCollection" :categories="categories" />
		<ItemTable :collection="woodCollection" :categories="categories" />
		<ItemTable :collection="dropsCollection" :categories="categories" />
		<ItemTable :collection="foodCollection" :categories="categories" />
		<ItemTable :collection="utilityCollection" :categories="categories" />
	</main>
	<footer class="bg-heavy-metal p-3 border-2 border-white">
		<a href="#top" class="text-norway underline block mb-4 text-sm">Back to top</a>
		<p class="text-norway text-sm">
			© Copyright 2021 Devillion Ltd<br />
			minecraft-economy-price-guide.net is not affiliated with
			<a href="https://minecraft.net/" class="underline">Mojang</a>.
		</p>
	</footer>
</template>
