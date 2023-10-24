<script setup>
const props = defineProps({
	collection: {
		type: Object
	},
	categories: {
		type: Array
	}
})

const category = props.collection[0].category

const currentCatIndex = props.categories.indexOf(category)
let prevCat = ''
let nextCat = ''
if (currentCatIndex !== 0) {
	prevCat = props.categories[currentCatIndex - 1]
}
if (currentCatIndex !== props.categories.length - 1) {
	nextCat = props.categories[currentCatIndex + 1]
}
</script>

<template>
	<nav v-if="prevCat !== ''" :id="category">
		<a :href="`#${prevCat}`">↑ {{ prevCat }}</a>
		<a href="#top">↑ Back to top</a>
		<a v-if="nextCat !== ''" :href="`#${nextCat}`">{{ nextCat }} ↓</a>
	</nav>
	<table class="table-auto">
		<caption :id="category == 'ores' ? 'ores' : ''">
			{{
				collection[0].category
			}}
		</caption>
		<thead>
			<tr>
				<th rowspan="2" class="hidden">Material ID</th>
				<th rowspan="2">Item/Block Name</th>
				<th rowspan="2"></th>
				<th colspan="2">Unit Price</th>
				<th colspan="2">Stack Price</th>
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
					<img :src="item.image" alt="" class="max-w-[50px]" />
				</td>
				<td class="text-center">{{ item.price }}</td>

				<td class="text-center">{{ +parseFloat(item.price * 0.3).toFixed(2) }}</td>

				<td class="text-center">{{ item.price * item.stack }}</td>
				<td class="text-center">
					{{ +parseFloat(item.price * 0.3 * item.stack).toFixed(2) }}
				</td>
			</tr>
		</tbody>
	</table>
</template>

<style lang="scss" scoped>
nav {
	@apply bg-norway border-x-2 border-white border-b-4 py-2 px-4 flex justify-between;
	a {
		@apply text-heavy-metal text-base font-bold capitalize underline;
	}
}

caption {
	@apply bg-gray-asparagus text-white text-xl capitalize font-bold py-5 border-2 border-white border-b-0;
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
	@apply border-2 border-white px-3 py-1;
}
</style>