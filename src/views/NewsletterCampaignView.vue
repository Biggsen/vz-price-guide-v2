<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { EnvelopeIcon } from '@heroicons/vue/24/outline'
import NotificationBanner from '../components/NotificationBanner.vue'
import BaseButton from '../components/BaseButton.vue'
import NewsletterMarkdownEditor from '../components/NewsletterMarkdownEditor.vue'
import { useAdmin } from '../utils/admin.js'
import { markdownToPreviewHtml } from '../utils/newsletterMarkdown.js'
import {
	clicksByUrlRows,
	callableErrorMessage,
	countNewsletterRecipients,
	createNewsletterDraft,
	formatCampaignDate,
	getNewsletter,
	sendNewsletter,
	sendNewsletterTest,
	updateNewsletterDraft
} from '../utils/newsletter.js'

const route = useRoute()
const router = useRouter()
const { user } = useAdmin()

const newsletterId = computed(() => {
	const id = route.params.id
	return id && id !== 'new' ? String(id) : null
})

const subject = ref('')
const bodyMarkdown = ref('')
const status = ref('draft')
const stats = ref(null)
const sentCount = ref(0)
const recipientCount = ref(0)
const eligibleCount = ref(null)
const sentAt = ref(null)
const loading = ref(true)
const skipNextLoad = ref(false)
const saving = ref(false)
const testing = ref(false)
const sending = ref(false)
const showSendConfirm = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const isReadOnly = computed(() => ['sent', 'sending'].includes(status.value))
const previewHtml = computed(() => markdownToPreviewHtml(bodyMarkdown.value))
const clickRows = computed(() => clicksByUrlRows(stats.value?.clicksByUrl))

async function loadCampaign() {
	if (!newsletterId.value) {
		loading.value = false
		return
	}
	loading.value = true
	try {
		const campaign = await getNewsletter(newsletterId.value)
		if (!campaign) {
			errorMessage.value = 'Campaign not found.'
			return
		}
		subject.value = campaign.subject || ''
		bodyMarkdown.value = campaign.bodyMarkdown || ''
		status.value = campaign.status || 'draft'
		stats.value = campaign.stats || null
		sentCount.value = campaign.sentCount || 0
		recipientCount.value = campaign.recipientCount || 0
		sentAt.value = campaign.sentAt || null
	} catch (error) {
		console.error(error)
		errorMessage.value = 'Could not load this campaign.'
	} finally {
		loading.value = false
	}
}

async function loadRecipientCount() {
	try {
		eligibleCount.value = await countNewsletterRecipients()
	} catch (error) {
		console.error(error)
		eligibleCount.value = null
	}
}

async function saveDraft() {
	if (isReadOnly.value) return
	errorMessage.value = ''
	saving.value = true
	try {
		if (!newsletterId.value) {
			const id = await createNewsletterDraft({
				subject: subject.value,
				bodyMarkdown: bodyMarkdown.value,
				createdBy: user.value.uid
			})
			successMessage.value = 'Draft saved.'
			skipNextLoad.value = true
			loading.value = false
			await router.replace(`/admin/newsletter/${id}`)
			return id
		}
		await updateNewsletterDraft(newsletterId.value, {
			subject: subject.value,
			bodyMarkdown: bodyMarkdown.value
		})
		successMessage.value = 'Draft saved.'
		return newsletterId.value
	} catch (error) {
		console.error(error)
		errorMessage.value = 'Could not save the draft.'
	} finally {
		saving.value = false
	}
}

async function ensureSaved() {
	if (!newsletterId.value) {
		return saveDraft()
	}
	if (!isReadOnly.value) {
		await updateNewsletterDraft(newsletterId.value, {
			subject: subject.value,
			bodyMarkdown: bodyMarkdown.value
		})
	}
	return newsletterId.value
}

async function handleTestSend() {
	errorMessage.value = ''
	testing.value = true
	try {
		const id = await ensureSaved()
		if (!id) return
		const result = await sendNewsletterTest(id)
		successMessage.value = `Test email sent to ${result.to}.`
	} catch (error) {
		console.error(error)
		errorMessage.value = callableErrorMessage(error)
	} finally {
		testing.value = false
	}
}

async function handleSend() {
	errorMessage.value = ''
	sending.value = true
	try {
		const id = await ensureSaved()
		if (!id) return
		await sendNewsletter(id)
		showSendConfirm.value = false
		successMessage.value = 'Campaign sent.'
		await loadCampaign()
	} catch (error) {
		console.error(error)
		errorMessage.value = callableErrorMessage(error)
		await loadCampaign()
	} finally {
		sending.value = false
	}
}

watch(newsletterId, () => {
	if (skipNextLoad.value) {
		skipNextLoad.value = false
		loading.value = false
		return
	}
	loadCampaign()
})

onMounted(() => {
	loadCampaign()
	loadRecipientCount()
})
</script>

<template>
	<div class="p-4 pt-8 max-w-5xl" data-cy="newsletter-compose">
		<div class="flex items-center mb-6">
			<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
				<EnvelopeIcon class="w-6 h-6 text-indigo-600" />
			</div>
			<div>
				<h1 class="text-3xl font-bold text-gray-900">
					{{ isReadOnly ? 'Campaign' : newsletterId ? 'Edit campaign' : 'New campaign' }}
				</h1>
				<p class="text-gray-600">
					<RouterLink to="/admin/newsletter" class="underline">All campaigns</RouterLink>
					<span v-if="eligibleCount !== null">
						· {{ eligibleCount }} eligible subscribers
					</span>
				</p>
			</div>
		</div>

		<NotificationBanner
			v-if="errorMessage"
			type="error"
			title="Something went wrong"
			:message="errorMessage"
			class="mb-4" />
		<NotificationBanner
			v-if="successMessage"
			type="success"
			title="Saved"
			:message="successMessage"
			class="mb-4" />

		<div v-if="loading" class="text-gray-600">Loading…</div>

		<div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="newsletter-subject">
					Subject
				</label>
				<input
					id="newsletter-subject"
					v-model="subject"
					type="text"
					:disabled="isReadOnly"
					data-cy="newsletter-subject"
					class="block w-full rounded border-2 border-gray-asparagus px-3 py-2 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus disabled:bg-gray-50" />

				<label class="block text-sm font-medium text-gray-700 mt-4 mb-1">Body</label>
				<NewsletterMarkdownEditor v-model="bodyMarkdown" :disabled="isReadOnly" />

				<div v-if="!isReadOnly" class="flex flex-wrap gap-3 mt-4">
					<BaseButton :loading="saving" @click="saveDraft">Save draft</BaseButton>
					<BaseButton variant="secondary" :loading="testing" @click="handleTestSend">
						Send test to me
					</BaseButton>
					<BaseButton
						variant="tertiary"
						data-cy="newsletter-send"
						@click="showSendConfirm = true">
						Send to subscribers
					</BaseButton>
				</div>
			</div>

			<div>
				<h2 class="text-lg font-semibold text-gray-900 mb-2">Preview</h2>
				<div
					class="bg-white border border-gray-200 rounded-lg p-4 prose max-w-none"
					data-cy="newsletter-preview"
					v-html="previewHtml"></div>

				<div
					v-if="status === 'sent' || status === 'failed'"
					class="mt-6 bg-white border border-gray-200 rounded-lg p-4"
					data-cy="newsletter-stats">
					<h2 class="text-lg font-semibold text-gray-900 mb-2">Stats</h2>
					<p v-if="sentAt" class="text-sm text-gray-500 mb-3">
						Sent {{ formatCampaignDate(sentAt) }} to {{ sentCount || recipientCount }} people.
					</p>
					<ul class="grid grid-cols-2 gap-3 text-sm text-gray-700">
						<li>Delivered: {{ stats?.delivered || 0 }}</li>
						<li>Opened: {{ stats?.uniqueOpened || 0 }}</li>
						<li>Clicked: {{ stats?.uniqueClicked || 0 }}</li>
						<li>Bounced: {{ stats?.bounced || 0 }}</li>
						<li>Unsubscribed: {{ stats?.unsubscribed || 0 }}</li>
						<li>Complained: {{ stats?.complained || 0 }}</li>
					</ul>
					<p class="text-xs text-gray-500 mt-3">
						Open counts are approximate. Some mail apps prefetch images, so this can
						over-count.
					</p>
					<div v-if="clickRows.length" class="mt-4">
						<h3 class="text-sm font-semibold text-gray-900 mb-2">Clicks by URL</h3>
						<table class="w-full text-sm">
							<thead>
								<tr class="text-left text-gray-500">
									<th class="pb-1">Link</th>
									<th class="pb-1 w-20">Clicks</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="row in clickRows" :key="row.url" class="border-t">
									<td class="py-1 break-all">
										<a
											:href="row.url"
											class="underline text-indigo-700"
											target="_blank"
											rel="noopener noreferrer">
											{{ row.url }}
										</a>
									</td>
									<td>{{ row.count }}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>

		<div
			v-if="showSendConfirm"
			class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
			data-cy="newsletter-send-confirm">
			<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
				<h2 class="text-lg font-semibold text-gray-900">Send this campaign?</h2>
				<p class="text-sm text-gray-600 mt-2">
					This will email
					<strong>{{ eligibleCount ?? 'all eligible' }}</strong>
					opted-in, verified subscribers. You cannot edit it after sending.
				</p>
				<div class="flex justify-end gap-3 mt-6">
					<BaseButton variant="tertiary" @click="showSendConfirm = false">Cancel</BaseButton>
					<BaseButton :loading="sending" @click="handleSend">Send now</BaseButton>
				</div>
			</div>
		</div>
	</div>
</template>
