<script setup>
import { useCurrentUser, useFirestore } from 'vuefire'
import { useRoute, RouterLink } from 'vue-router'
import { doc, deleteDoc } from 'firebase/firestore'
const user = useCurrentUser()
const db = useFirestore()
const route = useRoute()

const props = defineProps({
	collection: {
		type: Object
	},
	category: {
		type: String
	},
	categories: {
		type: Array
	},
	economyConfig: {
		type: Object
	}
})

let prevCat = ''
let nextCat = ''
const currentCatIndex = props.categories.indexOf(props.category)
if (currentCatIndex !== 0) {
	prevCat = props.categories[currentCatIndex - 1]
}
if (currentCatIndex !== props.categories.length - 1) {
	nextCat = props.categories[currentCatIndex + 1]
}

const priceMultiplier = props.economyConfig.priceMultiplier
const sellMargin = props.economyConfig.sellMargin

// Smart number formatting utility
function formatNumber(num) {
	// Handle undefined, null, or non-numeric values
	if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) {
		return '0'
	}
	
	if (num < 1000) {
		return num.toString()
	}
	
	if (num < 1000000) {
		const thousands = num / 1000
		if (thousands === Math.floor(thousands)) {
			return thousands + 'k'
		}
		return (Math.round(thousands * 10) / 10) + 'k'
	}
	
	if (num < 1000000000) {
		const millions = num / 1000000
		if (millions === Math.floor(millions)) {
			return millions + 'M'
		}
		return (Math.round(millions * 10) / 10) + 'M'
	}
	
	const billions = num / 1000000000
	if (billions === Math.floor(billions)) {
		return billions + 'B'
	}
	return (Math.round(billions * 10) / 10) + 'B'
}

// Format currency with proper decimal handling
function formatCurrency(num) {
	// Handle undefined, null, or non-numeric values
	if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) {
		return '0'
	}
	
	if (num < 1) {
		return parseFloat(num.toFixed(2)).toString()
	}
	
	return formatNumber(Math.round(num))
}

function buyUnitPrice(price) {
	const buyPrice = price * priceMultiplier
	return formatCurrency(buyPrice)
}

function sellUnitPrice(price) {
	const sellPrice = price * sellMargin
	return formatCurrency(sellPrice)
}

function buyStackPrice(price, stack) {
	const buyPrice = price * stack * priceMultiplier
	return formatCurrency(buyPrice)
}

function sellStackPrice(price, stack) {
	const sellPrice = price * stack * sellMargin
	return formatCurrency(sellPrice)
}

// Create the redirect URL with current query parameters
function getEditLinkQuery(itemId) {
	// Use the current route's query object directly to avoid double-encoding
	const queryString = new URLSearchParams(route.query).toString()
	const redirectPath = route.path + (queryString ? `?${queryString}` : '')
	return {
		redirect: redirectPath
	}
}

async function deleteItem(itemId) {
	if (confirm('Are you sure you want to delete this item?')) {
		await deleteDoc(doc(db, 'items', itemId))
	}
}
</script>

<template>
	<table v-if="collection.length > 0" class="w-full table-auto">
		<caption :id="category == 'ores' ? 'ores' : ''">
			{{ category }} ({{ collection.length }})
		</caption>
		<thead>
			<tr>
				<th rowspan="2" class="hidden">Material ID</th>
				<th rowspan="2">Item/Block Name</th>
				<th rowspan="2"></th>
				<th colspan="2">Unit Price</th>
				<th colspan="2">Stack Price</th>
				<th rowspan="2" v-if="user?.email">Actions</th>
			</tr>
			<tr>
				<th>Buy</th>
				<th>Sell</th>
				<th>Buy</th>
				<th>Sell</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="item in collection" :key="item.id">
				<td class="hidden">{{ item.material_id }}</td>
				<th width="50%" class="text-left">
					<a
						:href="item.url && item.url.trim() !== '' ? item.url : `https://minecraft.fandom.com/wiki/${item.material_id}`"
						target="_blank"
						class="font-normal hover:text-gray-asparagus hover:underline"
					>{{ item.name }}</a>
				</th>
				<td width="5%">
					<img :src="item.image" alt="" class="max-w-[30px] lg:max-w-[50px]" />
				</td>
				<td class="text-center">{{ buyUnitPrice(item.price) }}</td>

				<td class="text-center">{{ sellUnitPrice(item.price) }}</td>

				<td class="text-center">
					{{ buyStackPrice(item.price, item.stack) }}
				</td>
				<td class="text-center">
					{{ sellStackPrice(item.price, item.stack) }}
				</td>
				<td v-if="user?.email">
					<RouterLink
						:to="{ path: `/edit/${item.id}`, query: getEditLinkQuery(item.id) }"
						class="text-gray-asparagus underline hover:text-heavy-metal px-1 py-0"
						>Edit</RouterLink
					>
					<span class="mx-1">|</span>
					<a
						href="#"
						@click.prevent="deleteItem(item.id)"
						class="text-red-600 underline hover:text-red-800 px-1 py-0"
						>Delete</a
					>
				</td>
			</tr>
		</tbody>
	</table>
</template>

<style lang="scss" scoped>
nav {
	@apply bg-norway border-x-2 border-white border-b-4 py-1 sm:py-2 px-3 sm:px-4 flex justify-between;
	a {
		@apply text-heavy-metal text-sm sm:text-base font-bold capitalize underline;
	}
}

caption {
	@apply bg-gray-asparagus text-white text-base sm:text-xl capitalize font-bold py-2 sm:py-5 border-2 border-white border-b-0;
}

thead th {
	@apply bg-gray-asparagus text-norway;
}

tbody {
	th,
	td {
		@apply bg-norway;
	}
}

th,
td {
	@apply text-sm sm:text-base border-2 border-white px-1 sm:px-3 py-0.5 sm:py-1;
}
</style>
