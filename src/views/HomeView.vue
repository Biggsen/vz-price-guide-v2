<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, where } from 'firebase/firestore'

import HeaderIntro from '../components/HeaderIntro.vue'
import ItemTable from '../components/ItemTable.vue'

const db = useFirestore()

const qOres = query(
	collection(db, 'items'),
	where('category', '==', 'ores'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)

const qStone = query(
	collection(db, 'items'),
	where('category', '==', 'stone'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)

const qEarth = query(
	collection(db, 'items'),
	where('category', '==', 'earth'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)

const qSand = query(
	collection(db, 'items'),
	where('category', '==', 'sand'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)

const qWood = query(
	collection(db, 'items'),
	where('category', '==', 'wood'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)

const qDrops = query(
	collection(db, 'items'),
	where('category', '==', 'drops'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)

const qFood = query(
	collection(db, 'items'),
	where('category', '==', 'food'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)

const qUtility = query(
	collection(db, 'items'),
	where('category', '==', 'utility'),
	orderBy('subcategory', 'asc'),
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

const economyConfig = {
	priceMultiplier: 1,
	sellMargin: 0.3
}
</script>

<template>
	<main>
		<HeaderIntro />
		<nav id="top" class="bg-norway border-2 border-white p-3 sm:px-10 text-sm sm:text-base">
			<ul class="flex sm:justify-between flex-wrap">
				<li v-for="(cat, index) in categories" :key="index" class="mr-3 last:mr-0">
					<a :href="`#${cat}`" class="capitalize underline hover:text-gray-asparagus">{{
						cat
					}}</a>
				</li>
			</ul>
		</nav>
		<ItemTable
			:collection="oresCollection"
			category="ores"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
		<ItemTable
			:collection="stoneCollection"
			category="stone"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
		<ItemTable
			:collection="earthCollection"
			category="earth"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
		<ItemTable
			:collection="sandCollection"
			category="sand"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
		<ItemTable
			:collection="woodCollection"
			category="wood"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
		<ItemTable
			:collection="dropsCollection"
			category="drops"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
		<ItemTable
			:collection="foodCollection"
			category="food"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
		<ItemTable
			:collection="utilityCollection"
			category="utility"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
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
