<script setup>
import { onMounted, ref } from 'vue'
import { useCurrentUser } from 'vuefire'
import { getShopManagerStats } from '../utils/stats.js'

const user = useCurrentUser()
const loading = ref(true)
const stats = ref({
	totalServers: 0,
	totalShops: 0,
	totalShopItems: 0,
	totalUsers: 0,
	activeUsersCount: 0,
	managedServersCount: 0,
	serversWithAdminShop: 0,
	managedServersWithoutAdminShop: 0,
	avgServersPerUser: '0.00',
	maxServersPerUser: 0,
	avgShopsPerUser: '0.00',
	maxShopsPerUser: 0,
	avgPlayerShopsPerServer: '0.00',
	maxPlayerShopsPerServer: 0,
	recentServers: 0,
	serversWithoutShops: 0,
	itemsAdded7d: 0,
	itemsUpdated7d: 0,
	itemsActive7d: 0,
	shopTypeStats: []
})

const fetchStats = async () => {
	try {
		loading.value = true
		const excludeUserId = user.value?.uid || null
		const data = await getShopManagerStats(excludeUserId)
		stats.value = data
	} catch (error) {
		console.error('Error fetching stats:', error)
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	fetchStats()
})
</script>

<template>
	<div class="p-4 pt-6 max-w-4xl">
		<h1 class="text-xl font-bold text-gray-900">Shop Manager Statistics</h1>
		<p class="text-sm text-gray-600 mt-1 mb-4">
			Usage statistics for the Shop Manager feature. Totals include admin and player shops.
		</p>

		<div v-if="loading" class="py-8 text-sm text-gray-500">Loading statistics…</div>

		<div v-else class="border border-gray-200 rounded-lg bg-white divide-y divide-gray-200 text-sm">
			<section class="px-4 py-3">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
					Overview
				</h2>
				<dl class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
					<div>
						<dt class="text-gray-600">Servers</dt>
						<dd class="text-lg font-semibold text-gray-900 tabular-nums">
							{{ stats.totalServers }}
						</dd>
					</div>
					<div>
						<dt class="text-gray-600">Shops</dt>
						<dd class="text-lg font-semibold text-gray-900 tabular-nums">
							{{ stats.totalShops }}
						</dd>
					</div>
					<div>
						<dt class="text-gray-600">Shop items</dt>
						<dd class="text-lg font-semibold text-gray-900 tabular-nums">
							{{ stats.totalShopItems }}
						</dd>
					</div>
					<div>
						<dt class="text-gray-600">Active users</dt>
						<dd class="text-lg font-semibold text-gray-900 tabular-nums">
							{{ stats.activeUsersCount }}
						</dd>
					</div>
					<div>
						<dt class="text-gray-600">Managed servers</dt>
						<dd class="text-lg font-semibold text-gray-900 tabular-nums">
							{{ stats.managedServersCount }}
						</dd>
					</div>
					<div>
						<dt class="text-gray-600">Servers with admin shop</dt>
						<dd class="text-lg font-semibold text-gray-900 tabular-nums">
							{{ stats.serversWithAdminShop }}
						</dd>
					</div>
				</dl>
			</section>

			<section class="px-4 py-3 overflow-x-auto">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
					Item activity (last 7 days)
				</h2>
				<table class="w-full min-w-[36rem]">
					<thead>
						<tr class="text-left text-gray-600">
							<th class="font-medium pb-1 pr-4">Type</th>
							<th class="font-medium pb-1 pr-4 w-20 text-right">Added</th>
							<th class="font-medium pb-1 pr-4 w-20 text-right">Updated</th>
							<th class="font-medium pb-1 w-20 text-right">Total</th>
						</tr>
					</thead>
					<tbody class="text-gray-900">
						<tr
							v-for="row in stats.shopTypeStats"
							:key="`activity-${row.key}`"
							:class="[
								'border-t border-gray-100',
								row.isTotal ? 'font-semibold' : '',
								row.isSubtotal ? 'text-gray-700' : ''
							]">
							<td class="py-1.5 pr-4">
								<span :class="row.isSubtotal || row.isTotal ? 'pl-2' : ''">
									{{ row.label }}
								</span>
							</td>
							<td class="py-1.5 pr-4 text-right tabular-nums">
								{{ row.itemsAdded7d }}
							</td>
							<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
								{{ row.itemsUpdated7d }}
							</td>
							<td class="py-1.5 text-right tabular-nums text-gray-600">
								{{ row.itemsActive7d }}
							</td>
						</tr>
					</tbody>
				</table>
				<p class="text-xs text-gray-500 mt-2">
					Added uses <code class="text-gray-600">created_at</code> when available; older
					items without it are estimated from first activity.
				</p>
			</section>

			<section class="px-4 py-3 overflow-x-auto">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
					Shops by type
				</h2>
				<table class="w-full min-w-[40rem]">
					<thead>
						<tr class="text-left text-gray-600">
							<th class="font-medium pb-1 pr-4">Type</th>
							<th class="font-medium pb-1 pr-4 w-16 text-right">Shops</th>
							<th class="font-medium pb-1 pr-4 w-16 text-right">Items</th>
							<th class="font-medium pb-1 pr-4 w-20 text-right">Avg items</th>
							<th class="font-medium pb-1 pr-4 w-16 text-right">Max</th>
							<th class="font-medium pb-1 pr-4 w-16 text-right">Empty</th>
							<th class="font-medium pb-1 pr-4 w-20 text-right">New shops</th>
						</tr>
					</thead>
					<tbody class="text-gray-900">
						<tr
							v-for="row in stats.shopTypeStats"
							:key="row.key"
							:class="[
								'border-t border-gray-100',
								row.isTotal ? 'font-semibold' : '',
								row.isSubtotal ? 'text-gray-700' : ''
							]">
							<td class="py-1.5 pr-4">
								<span :class="row.isSubtotal || row.isTotal ? 'pl-2' : ''">
									{{ row.label }}
								</span>
							</td>
							<td class="py-1.5 pr-4 text-right tabular-nums">{{ row.shops }}</td>
							<td class="py-1.5 pr-4 text-right tabular-nums">{{ row.items }}</td>
							<td class="py-1.5 pr-4 text-right tabular-nums">
								{{ row.avgItemsPerShop }}
							</td>
							<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
								{{ row.maxItemsPerShop }}
							</td>
							<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
								{{ row.shopsWithoutItems }}
							</td>
							<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
								{{ row.recentShops }}
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section class="px-4 py-3">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
					Usage
				</h2>
				<table class="w-full">
					<thead>
						<tr class="text-left text-gray-600">
							<th class="font-medium pb-1 pr-4">Metric</th>
							<th class="font-medium pb-1 pr-4 w-20 text-right">Avg</th>
							<th class="font-medium pb-1 w-20 text-right">Max</th>
						</tr>
					</thead>
					<tbody class="text-gray-900">
						<tr class="border-t border-gray-100">
							<td class="py-1.5 pr-4">Servers per user</td>
							<td class="py-1.5 pr-4 text-right tabular-nums font-medium">
								{{ stats.avgServersPerUser }}
							</td>
							<td class="py-1.5 text-right tabular-nums text-gray-600">
								{{ stats.maxServersPerUser }}
							</td>
						</tr>
						<tr class="border-t border-gray-100">
							<td class="py-1.5 pr-4">Player shops per user</td>
							<td class="py-1.5 pr-4 text-right tabular-nums font-medium">
								{{ stats.avgShopsPerUser }}
							</td>
							<td class="py-1.5 text-right tabular-nums text-gray-600">
								{{ stats.maxShopsPerUser }}
							</td>
						</tr>
						<tr class="border-t border-gray-100">
							<td class="py-1.5 pr-4">Player shops per server</td>
							<td class="py-1.5 pr-4 text-right tabular-nums font-medium">
								{{ stats.avgPlayerShopsPerServer }}
							</td>
							<td class="py-1.5 text-right tabular-nums text-gray-600">
								{{ stats.maxPlayerShopsPerServer }}
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section class="px-4 py-3">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
					Gaps
				</h2>
				<dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2">
					<div class="flex justify-between sm:block">
						<dt class="text-gray-600">Servers without any shop</dt>
						<dd class="font-semibold text-gray-900 tabular-nums sm:mt-0.5">
							{{ stats.serversWithoutShops }}
						</dd>
					</div>
					<div class="flex justify-between sm:block">
						<dt class="text-gray-600">Managed servers without admin shop</dt>
						<dd class="font-semibold text-gray-900 tabular-nums sm:mt-0.5">
							{{ stats.managedServersWithoutAdminShop }}
						</dd>
					</div>
					<div class="flex justify-between sm:block">
						<dt class="text-gray-600">New servers (7 days)</dt>
						<dd class="font-semibold text-gray-900 tabular-nums sm:mt-0.5">
							{{ stats.recentServers }}
						</dd>
					</div>
				</dl>
			</section>
		</div>
	</div>
</template>
