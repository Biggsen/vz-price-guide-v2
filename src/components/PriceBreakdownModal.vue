<script setup>
import BaseModal from './BaseModal.vue'
import { getImageUrl } from '../utils/image.js'
import { FireIcon, Squares2X2Icon } from '@heroicons/vue/16/solid'

defineProps({
	isOpen: {
		type: Boolean,
		default: false
	},
	breakdown: {
		type: Object,
		default: null
	}
})

const emit = defineEmits(['close'])

function formatAmount(value) {
	const num = Number(value)
	if (!Number.isFinite(num)) return '—'
	return parseFloat(num.toFixed(4)).toString()
}
</script>

<template>
	<BaseModal
		:isOpen="isOpen"
		:title="breakdown ? `${breakdown.kindLabel} · ${breakdown.itemName}` : 'Price breakdown'"
		size="small"
		@close="emit('close', $event)">
		<div v-if="breakdown" class="space-y-3">
			<h3 class="text-sm font-semibold text-gray-800">Price Breakdown</h3>
			<div class="flex items-center gap-2 text-sm text-gray-600">
				<img
					v-if="breakdown.image"
					:src="getImageUrl(breakdown.image, { width: 16 })"
					:alt="breakdown.itemName"
					class="shrink-0"
					style="image-rendering: pixelated; width: 16px; height: 16px"
					width="16"
					height="16" />
				<code class="text-xs bg-gray-100 px-1 rounded">{{ breakdown.materialId }}</code>
			</div>
			<ul class="space-y-2 text-sm">
				<li
					v-for="(step, index) in breakdown.steps"
					:key="index"
					:class="[
						'flex justify-between gap-3 border-b border-gray-100 pb-2 last:border-0',
						step.emphasis ? 'font-semibold text-gray-900' : 'text-gray-700'
					]">
					<div class="flex items-start gap-2 min-w-0">
						<img
							v-if="step.image"
							:src="getImageUrl(step.image, { width: 16 })"
							:alt="step.label"
							class="mt-0.5 shrink-0"
							style="image-rendering: pixelated; width: 16px; height: 16px"
							width="16"
							height="16" />
						<div class="min-w-0">
							<div class="flex items-center gap-1.5 flex-wrap">
								<span>{{ step.label }}</span>
								<span
									v-if="step.process === 'smelting' && step.fee"
									class="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-800 bg-orange-100 px-1 py-0.5 rounded"
									title="Includes smelting cost">
									<FireIcon class="w-3 h-3" />
									smelt +{{ formatAmount(step.fee) }}
								</span>
								<span
									v-else-if="step.process === 'crafting' && step.fee"
									class="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded"
									title="Includes crafting cost">
									<Squares2X2Icon class="w-3 h-3" />
									craft +{{ formatAmount(step.fee) }}
								</span>
							</div>
							<div v-if="step.detail" class="text-xs text-gray-500 mt-0.5">
								{{ step.detail }}
							</div>
						</div>
					</div>
					<div v-if="step.value != null" class="shrink-0 tabular-nums">
						{{ formatAmount(step.value) }}
					</div>
				</li>
			</ul>
			<p class="text-base font-semibold text-gray-900 pt-1">
				Total: {{ formatAmount(breakdown.total) }}
			</p>
		</div>
		<p v-else class="text-sm text-gray-600">No breakdown available.</p>
	</BaseModal>
</template>
