<script setup>
import { onMounted, ref, watch } from 'vue'
import { getMarketingOptInStats, getMarketingOptInMonthlyStats } from '../utils/stats.js'

const activeTab = ref('overview')
const loading = ref(true)
const monthlyLoading = ref(false)
const monthlyLoaded = ref(false)
const stats = ref({
	optedIn: 0,
	optedOut: 0,
	noPreference: 0,
	totalUsers: 0,
	optInRate: '0.0%',
	optedInViaSignup: 0,
	optedInViaSettings: 0,
	optedInVerified: 0
})
const monthlyStats = ref({
	year: 2026,
	months: [],
	yearTotals: {
		optedIn: 0,
		viaSignup: 0,
		viaSettings: 0,
		optedOut: 0
	}
})

const fetchStats = async () => {
	try {
		loading.value = true
		stats.value = await getMarketingOptInStats()
	} catch (error) {
		console.error('Error fetching marketing opt-in stats:', error)
	} finally {
		loading.value = false
	}
}

const fetchMonthlyStats = async () => {
	if (monthlyLoaded.value) return

	try {
		monthlyLoading.value = true
		monthlyStats.value = await getMarketingOptInMonthlyStats(2026)
		monthlyLoaded.value = true
	} catch (error) {
		console.error('Error fetching marketing opt-in monthly stats:', error)
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
		<h1 class="text-xl font-bold text-gray-900">Marketing Opt-In</h1>
		<p class="text-sm text-gray-600 mt-1 mb-4">
			How many people have signed up for news emails.
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
				Totals reflect each user’s current preference. Missing opt-in data counts as no
				preference.
			</p>

			<div v-if="loading" class="py-8 text-sm text-gray-500">Loading statistics…</div>

			<div
				v-else
				class="border border-gray-200 rounded-lg bg-white divide-y divide-gray-200 text-sm">
				<section class="px-4 py-3">
					<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
						Overview
					</h2>
					<dl class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
						<div>
							<dt class="text-gray-600">Opted in</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ stats.optedIn }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Opted out</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ stats.optedOut }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">No preference</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ stats.noPreference }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Total users</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ stats.totalUsers }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Opt-in rate</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ stats.optInRate }}
							</dd>
						</div>
					</dl>
				</section>

				<section class="px-4 py-3">
					<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
						Opted in by method
					</h2>
					<dl class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
						<div>
							<dt class="text-gray-600">Via signup</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ stats.optedInViaSignup }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Via settings</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ stats.optedInViaSettings }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Verified emails</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ stats.optedInVerified }}
							</dd>
						</div>
					</dl>
				</section>
			</div>
		</div>

		<div v-else>
			<p class="text-sm text-gray-600 mb-4">
				Month-by-month counts for 2026 use each user’s last preference change, not a full
				history. A later toggle moves that person into a later month.
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
					<dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
						<div>
							<dt class="text-gray-600">Opted in</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.optedIn }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Via signup</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.viaSignup }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Via settings</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.viaSettings }}
							</dd>
						</div>
						<div>
							<dt class="text-gray-600">Opted out</dt>
							<dd class="text-lg font-semibold text-gray-900 tabular-nums">
								{{ monthlyStats.yearTotals.optedOut }}
							</dd>
						</div>
					</dl>
				</section>

				<section class="px-4 py-3 overflow-x-auto">
					<h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
						Preference changes by month
					</h2>
					<table class="w-full min-w-[32rem]">
						<thead>
							<tr class="text-left text-gray-600">
								<th class="font-medium pb-1 pr-4">Month</th>
								<th class="font-medium pb-1 pr-4 w-20 text-right">Opted in</th>
								<th class="font-medium pb-1 pr-4 w-24 text-right">Via signup</th>
								<th class="font-medium pb-1 pr-4 w-24 text-right">Via settings</th>
								<th class="font-medium pb-1 w-20 text-right">Opted out</th>
							</tr>
						</thead>
						<tbody class="text-gray-900">
							<tr
								v-for="row in monthlyStats.months"
								:key="`opt-in-${row.month}`"
								class="border-t border-gray-100">
								<td class="py-1.5 pr-4">{{ row.label }}</td>
								<td class="py-1.5 pr-4 text-right tabular-nums font-medium">
									{{ row.optedIn }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
									{{ row.viaSignup }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums text-gray-600">
									{{ row.viaSettings }}
								</td>
								<td class="py-1.5 text-right tabular-nums text-gray-600">
									{{ row.optedOut }}
								</td>
							</tr>
							<tr class="border-t border-gray-200 font-semibold">
								<td class="py-1.5 pr-4">2026 total</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.optedIn }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.viaSignup }}
								</td>
								<td class="py-1.5 pr-4 text-right tabular-nums">
									{{ monthlyStats.yearTotals.viaSettings }}
								</td>
								<td class="py-1.5 text-right tabular-nums">
									{{ monthlyStats.yearTotals.optedOut }}
								</td>
							</tr>
						</tbody>
					</table>
				</section>
			</div>
		</div>
	</div>
</template>
