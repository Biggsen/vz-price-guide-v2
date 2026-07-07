<script setup>
import { onMounted, ref, watch } from 'vue'
import { useCurrentUser } from 'vuefire'
import { getShopManagerStats, getShopManagerMonthlyStats } from '../utils/stats.js'

const user = useCurrentUser()
const activeTab = ref('overview')
const loading = ref(true)
const monthlyLoading = ref(false)
const monthlyLoaded = ref(false)
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
const monthlyStats = ref({
	year: 2026,
	excludedUserIds: [],
	months: [],
	yearTotals: {
		newServers: 0,
		newManagedServers: 0,
		newShops: 0,
		newAdminShops: 0,
		newOwnPlayerShops: 0,
		newOtherPlayerShops: 0,
		itemsAdded: 0,
		itemsUpdated: 0
	},
	endOfYearServers: 0,
	endOfYearShops: 0,
	endOfYearAdminShops: 0
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

const fetchMonthlyStats = async () => {
	if (monthlyLoaded.value) return

	try {
		monthlyLoading.value = true
		monthlyStats.value = await getShopManagerMonthlyStats(2026)
		monthlyLoaded.value = true
	} catch (error) {
		console.error('Error fetching monthly stats:', error)
	} finally {
		monthlyLoading.value = false
	}
}

watch(activeTab, (tab) => {
	if (tab === 'monthly') {
		fetchMonthlyStats()
	}
})

onMounted(() => {
	fetchStats()
})
</script>

<template>
	<div class="p-4 pt-6 max-w-5xl">
		<h1 class="text-xl font-bold text-gray-900">Shop Manager Statistics</h1>
		<p class="text-sm text-gray-600 mt-1 mb-4">
			Usage statistics for the Shop Manager feature.
		</p>

		<div class="flex mb-4 border-b border-gray-200">
			<button
				type="button"
				@click="activeTab = 'overview'"
				:class="[
					'px-4 py-2 text-sm font-medium transition-colors',
					activeTab === 'overview'
						? 'border-b-2 border-gray-asparagus text-gray-900'
						: 'text-gray-600 hover:text-gray-800'
				]">
				Overview
			</button>
			<button
				type="button"
				@click="activeTab = 'monthly'"
				:class="[
					'px-4 py-2 text-sm font-medium transition-colors',
					activeTab === 'monthly'
						? 'border-b-2 border-gray-asparagus text-gray-900'
						: 'text-gray-600 hover:text-gray-800'
				]">
				Monthly (2026)
			</button>
		</div>

		<div v-if="activeTab === 'overview'">
			<p class="text-sm text-gray-600 mb-4">
				Totals include admin and player shops. Your own account is excluded when logged in.
			</p>

			<div v-if="loading" class="py-8 text-sm text-gray-500">Loading statistics…</div>

			<div
				v-else
				class="border border-gray-200 rounded-lg bg-white divide-y divide-gray-200 text-sm">
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
						Added uses created_at when available; older items without it are estimated
						from first activity.
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

		<div v-else>
			<p class="text-sm text-gray-600 mb-4">
				Month-by-month growth for 2026. Admin test data is excluded from these figures.
			</p>

			<div v-if="monthlyLoading" class="py-8 text-sm text-gray-500">
				Loading monthly statistics…
			</div>

			<div
				v-else
				class="border border-gray-200 rounded-lg bg-white divide-y divide-gray-200 text-sm">
				<section class="px-4 py-3">
					<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
						2026 summary
					</h2>
					<dl class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-6 gap-y-3">
						<div>
							<dt class="text-gray-600">New servers</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.newServers }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">New managed</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.newManagedServers }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">New shops</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.newShops }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">New admin shops</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.newAdminShops }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Items added</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.itemsAdded }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Items updated</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.itemsUpdated }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Total servers</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.endOfYearServers }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Total shops</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.endOfYearShops }}
							</dd>
						</div>
					</dl>
				</section>

				<section class="px-4 py-3 overflow-x-auto">
					<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
						Servers by month
					</h2>
					<table class="w-full min-w-[32rem]">
						<thead>
							<tr class="text-left text-gray-600">
								<th class="font-medium pb-1 pr-4">Month</th>
								<th class="font-medium pb-1 pr-4 w-20 text-right">New</th>
								<th class="font-medium pb-1 pr-4 w-24 text-right">New managed</th>
								<th class="font-medium pb-1 w-20 text-right">Total</th>
							</tr>
						</thead>
						<tbody class="text-gray-900">
							<tr
								v-for="row in monthlyStats.months"
								:key="`servers-${row.month}`"
								class="border-t border-gray-100">
								<td class="py-1.5 pr-4">{{ row.label }}</td>
								<td class="py-1.5 pr-4 text-right tabular-nums font-medium">
									{{ row.newServers }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
									{{ row.newManagedServers }}
								</td>
								<td class="py-1.5 text-right tabular-nums text-gray-600">
									{{ row.cumulativeServers }}
								</td>
							</tr>
							<tr class="border-t border-gray-200 font-semibold">
								<td class="py-1.5 pr-4">2026 total</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.newServers }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.newManagedServers }}
								</td>
								<td class="py-1.5 text-right tabular-nums">
									{{ monthlyStats.endOfYearServers }}
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="px-4 py-3 overflow-x-auto">
					<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
						Shops by month
					</h2>
					<table class="w-full min-w-[44rem]">
						<thead>
							<tr class="text-left text-gray-600">
								<th class="font-medium pb-1 pr-4">Month</th>
								<th class="font-medium pb-1 pr-4 w-16 text-right">New</th>
								<th class="font-medium pb-1 pr-4 w-16 text-right">Admin</th>
								<th class="font-medium pb-1 pr-4 w-16 text-right">Own</th>
								<th class="font-medium pb-1 pr-4 w-16 text-right">Other</th>
								<th class="font-medium pb-1 pr-4 w-20 text-right">Items added</th>
								<th class="font-medium pb-1 pr-4 w-20 text-right">Items updated</th>
								<th class="font-medium pb-1 w-16 text-right">Total</th>
							</tr>
						</thead>
						<tbody class="text-gray-900">
							<tr
								v-for="row in monthlyStats.months"
								:key="`shops-${row.month}`"
								class="border-t border-gray-100">
								<td class="py-1.5 pr-4">{{ row.label }}</td>
								<td class="py-1.5 pr-4 text-right tabular-nums font-medium">
									{{ row.newShops }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
									{{ row.newAdminShops }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
									{{ row.newOwnPlayerShops }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
									{{ row.newOtherPlayerShops }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
									{{ row.itemsAdded }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
									{{ row.itemsUpdated }}
								</td>
								<td class="py-1.5 text-right tabular-nums text-gray-600">
									{{ row.cumulativeShops }}
								</td>
							</tr>
							<tr class="border-t border-gray-200 font-semibold">
								<td class="py-1.5 pr-4">2026 total</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.newShops }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.newAdminShops }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.newOwnPlayerShops }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.newOtherPlayerShops }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.itemsAdded }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.itemsUpdated }}
								</td>
								<td class="py-1.5 text-right tabular-nums">
									{{ monthlyStats.endOfYearShops }}
								</td>
							</tr>
						</tbody>
					</table>
					<p class="text-xs text-gray-500 mt-2">
						Cumulative totals include all servers and shops created on or before the end
						of each month.
					</p>
				</section>
			</div>
		</div>
	</div>
</template>
