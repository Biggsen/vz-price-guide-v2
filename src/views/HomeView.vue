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
		<table class="table-auto">
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
				<tr v-for="item in itemCollection" :key="item.id">
					<td class="hidden">{{ item.material_id }}</td>
					<th width="50%" class="text-left">
						<a
							:href="item.url"
							target="_blank"
							class="font-normal hover:text-gray-asparagus"
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
	</main>
</template>

<style lang="scss" scoped>
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
