<script setup>
import { useCurrentUser } from 'vuefire'
const user = useCurrentUser()

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

function buyUnitPrice(price) {
	return price * priceMultiplier
}

function sellUnitPrice(price) {
	const sellPrice = price * sellMargin
	if (sellPrice < 1) {
		return +parseFloat(sellPrice).toFixed(2)
	} else {
		return Math.round(sellPrice)
	}
}

function buyStackPrice(price, stack) {
	let buyPrice = price * stack * priceMultiplier
	buyPrice = buyPrice.toString().replace('000', 'k')
	return buyPrice
}

function sellStackPrice(price, stack) {
	const sellPrice = price * stack * sellMargin
	if (sellPrice < 1) {
		return +parseFloat(sellPrice).toFixed(2)
	} else {
		return Math.round(sellPrice)
	}
}
</script>

<template>
	<nav v-if="prevCat !== ''" :id="category">
		<a :href="`#${prevCat}`">↑ {{ prevCat }}</a>
		<a href="#top">↑ Back to top</a>
		<a v-if="nextCat !== ''" :href="`#${nextCat}`">{{ nextCat }} ↓</a>
	</nav>
	<table v-if="collection.length > 0" class="table-auto">
		<caption :id="category == 'ores' ? 'ores' : ''">
			{{
				category
			}}
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
						:href="item.url"
						target="_blank"
						class="font-normal hover:text-gray-asparagus hover:underline"
						>{{ item.name }}</a
					>
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
					<a
						:href="`/edit/${item.id}`"
						class="text-white bg-gray-asparagus px-4 py-2 hover:bg-heavy-metal"
						>Edit</a
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
