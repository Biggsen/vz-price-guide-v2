<script setup>
import { collection, orderBy, query } from 'firebase/firestore'
import { useCollection } from 'vuefire'
import { RouterLink } from 'vue-router'
import { EnvelopeIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { db } from '../firebase'
import { formatCampaignDate } from '../utils/newsletter.js'

const newslettersQuery = query(collection(db, 'newsletters'), orderBy('updatedAt', 'desc'))
const campaigns = useCollection(newslettersQuery)

function statusLabel(status) {
	if (status === 'sent') return 'Sent'
	if (status === 'sending') return 'Sending'
	if (status === 'failed') return 'Failed'
	return 'Draft'
}

function statusClass(status) {
	if (status === 'sent') return 'bg-green-100 text-green-800'
	if (status === 'sending') return 'bg-yellow-100 text-yellow-800'
	if (status === 'failed') return 'bg-red-100 text-red-800'
	return 'bg-gray-100 text-gray-800'
}
</script>

<template>
	<div class="p-4 pt-8 max-w-5xl" data-cy="newsletter-list">
		<div class="flex items-start justify-between gap-4 mb-8">
			<div class="flex items-center">
				<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
					<EnvelopeIcon class="w-6 h-6 text-indigo-600" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Newsletter</h1>
					<p class="text-gray-600">
						Draft and send emails to opted-in, verified subscribers.
					</p>
				</div>
			</div>
			<RouterLink
				to="/admin/newsletter/new"
				data-cy="newsletter-new"
				class="inline-flex items-center rounded-md bg-gray-asparagus px-4 py-2 text-sm font-semibold text-white hover:bg-highland">
				<PlusIcon class="w-5 h-5 mr-1" />
				New campaign
			</RouterLink>
		</div>

		<p v-if="campaigns.length === 0" class="text-gray-600">No campaigns yet.</p>

		<div class="space-y-3">
			<RouterLink
				v-for="campaign in campaigns"
				:key="campaign.id"
				:to="`/admin/newsletter/${campaign.id}`"
				class="block bg-white rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="text-lg font-semibold text-gray-900">
							{{ campaign.subject || 'Untitled draft' }}
						</h2>
						<p class="text-sm text-gray-500 mt-1">
							{{ formatCampaignDate(campaign.updatedAt) }}
						</p>
					</div>
					<span
						class="text-xs font-semibold px-2 py-1 rounded"
						:class="statusClass(campaign.status)">
						{{ statusLabel(campaign.status) }}
					</span>
				</div>
				<div
					v-if="campaign.status === 'sent' || campaign.status === 'failed'"
					class="mt-3 flex flex-wrap gap-4 text-sm text-gray-600"
					data-cy="newsletter-list-stats">
					<span>Sent {{ campaign.sentCount || 0 }}</span>
					<span>Opened {{ campaign.stats?.uniqueOpened || 0 }}</span>
					<span>Clicked {{ campaign.stats?.uniqueClicked || 0 }}</span>
					<span>Unsubscribed {{ campaign.stats?.unsubscribed || 0 }}</span>
				</div>
			</RouterLink>
		</div>
	</div>
</template>
