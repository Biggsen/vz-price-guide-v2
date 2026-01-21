<script setup>
import { getImageUrl, getItemImageUrl } from '@/utils/image.js'
import { getEnchantmentIds } from '@/utils/enchantments.js'
import { stripColorCodes } from '@/utils/minecraftText.js'
import {
	PlusIcon,
	MinusIcon,
	PencilIcon,
	TrashIcon,
	QuestionMarkCircleIcon
} from '@heroicons/vue/24/outline'

defineProps({
	rewardDoc: {
		type: Object,
		required: true
	},
	canEdit: {
		type: Boolean,
		required: true
	},
	isMultiItem: {
		type: Boolean,
		required: true
	},
	showYamlPreview: {
		type: Boolean,
		default: false
	},
	getDisplayItemImageFromDoc: {
		type: Function,
		required: true
	},
	getValueDisplay: {
		type: Function,
		required: true
	},
	getRewardDocChance: {
		type: Function,
		required: true
	},
	getItemById: {
		type: Function,
		required: true
	},
	formatEnchantmentName: {
		type: Function,
		required: true
	},
	getYamlPreview: {
		type: Function,
		required: true
	},
	toggleReviewPanel: {
		type: Function,
		required: true
	},
	isReviewPanelExpanded: {
		type: Function,
		required: true
	},
	editingWeightId: {
		type: String,
		default: null
	},
	editingWeightValue: {
		type: String,
		default: ''
	},
	setWeightInputRef: {
		type: Function,
		required: true
	},
	startEditWeight: {
		type: Function,
		required: true
	},
	saveWeight: {
		type: Function,
		required: true
	},
	cancelEditWeight: {
		type: Function,
		required: true
	},
	increaseRewardWeight: {
		type: Function,
		required: true
	},
	decreaseRewardWeight: {
		type: Function,
		required: true
	}
})

const emit = defineEmits(['edit', 'delete', 'update:editingWeightValue'])

function updateEditingWeightValue(event) {
	emit('update:editingWeightValue', event.target.value)
}
</script>

<template>
	<div class="pr-6 max-[640px]:pr-3 bg-norway" data-cy="item-row">
		<!-- Multi-item indicator badge -->
		<div v-if="isMultiItem" class="px-4 py-1 bg-blue-100 border-b border-white">
			<span class="text-xs font-medium text-blue-800">
				⚠️ Multi-item reward (imported from YAML, read-only)
			</span>
		</div>
		<div class="flex items-stretch justify-between">
			<div class="flex-1">
				<div class="flex items-stretch gap-4 max-[640px]:gap-2">
					<div
						class="w-16 max-[640px]:w-12 bg-highland border-r-2 border-white flex items-center justify-center">
						<img
							v-if="getDisplayItemImageFromDoc(rewardDoc)"
							:src="getItemImageUrl(
								getDisplayItemImageFromDoc(rewardDoc),
								getEnchantmentIds(rewardDoc.display_enchantments)
							)"
							:alt="rewardDoc.display_name"
							@error="
								$event.target.src = getImageUrl(getDisplayItemImageFromDoc(rewardDoc))
							"
							loading="lazy"
							decoding="async"
							fetchpriority="low"
							class="max-w-10 max-h-10 max-[640px]:max-w-8 max-[640px]:max-h-8" />
						<QuestionMarkCircleIcon
							v-else
							class="w-8 h-8 max-[640px]:w-6 max-[640px]:h-6 text-white" />
					</div>
					<div
						class="flex-1 flex items-center justify-between max-[640px]:gap-4 max-[450px]:gap-0 max-[450px]:flex-col max-[450px]:items-start">
						<div
							class="pt-2 pb-3 max-[640px]:pt-1 max-[640px]:pb-2 max-[450px]:pb-1 max-[450px]:w-full">
							<h4 class="text-sm sm:text-base font-semibold text-gray-900">
								{{ stripColorCodes(rewardDoc.display_name || 'Unknown Reward') }}
							</h4>
							<div class="text-sm text-heavy-metal">
								<span class="font-medium">Value:</span>
								{{ getValueDisplay(rewardDoc) }}
							</div>
							<!-- Items list (only for multi-item rewards) -->
							<div
								v-if="isMultiItem && rewardDoc.items && rewardDoc.items.length > 0"
								class="mt-2">
								<div class="text-sm text-heavy-metal font-medium mb-1">
									Contains {{ rewardDoc.items.length }} items:
								</div>
								<div class="space-y-1">
									<div
										v-for="(item, idx) in rewardDoc.items"
										:key="idx"
										class="text-sm text-heavy-metal flex items-center gap-2">
										<span>
											• {{ item.quantity }}x
											{{ getItemById(item.item_id)?.name || 'Unknown' }}
										</span>
									</div>
								</div>
							</div>

							<!-- Commands Display -->
							<div
								v-if="rewardDoc.commands && rewardDoc.commands.length > 0"
								class="text-sm text-heavy-metal">
								<span class="font-medium">Commands:</span>
								<div class="mt-1 space-y-1">
									<div
										v-for="(command, index) in rewardDoc.commands"
										:key="index"
										class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
										{{ command }}
									</div>
								</div>
							</div>

							<!-- Enchantments Display -->
							<div
								v-if="
									rewardDoc.display_enchantments &&
									getEnchantmentIds(rewardDoc.display_enchantments).length > 0
								"
								class="mt-1">
								<div class="flex flex-wrap gap-1">
									<span
										v-for="enchantmentId in getEnchantmentIds(rewardDoc.display_enchantments)"
										:key="enchantmentId"
										class="px-2 py-1 border border-gray-asparagus text-heavy-metal text-[10px] font-medium rounded uppercase">
										{{ formatEnchantmentName(enchantmentId) }}
									</span>
								</div>
							</div>

							<!-- YAML Preview (Debug) -->
							<div v-if="showYamlPreview" class="mt-2">
								<button
									@click="toggleReviewPanel(rewardDoc.id)"
									class="flex items-center gap-2 text-sm text-heavy-metal hover:text-gray-800 transition-colors">
									<svg
										:class="[
											'w-4 h-4 transition-transform',
											isReviewPanelExpanded(rewardDoc.id) ? 'rotate-90' : ''
										]"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7" />
									</svg>
									{{ isReviewPanelExpanded(rewardDoc.id) ? 'Hide' : 'Show' }} YAML Preview
								</button>

								<pre
									v-if="isReviewPanelExpanded(rewardDoc.id)"
									class="mt-3 text-xs bg-white p-3 rounded border overflow-x-auto"><code>{{ getYamlPreview(rewardDoc) }}</code></pre>
							</div>
						</div>

						<!-- Weight and Chance Boxes -->
						<div class="flex gap-2 max-[450px]:mt-2 max-[450px]:mb-2">
							<div class="bg-blue-50 border-2 border-gray-asparagus rounded flex items-stretch">
								<button
									@click="decreaseRewardWeight(rewardDoc)"
									class="flex items-center justify-center px-1 py-1 bg-sea-mist hover:bg-saltpan transition-colors rounded-l border-r-2 border-gray-asparagus min-w-[2rem]"
									title="Decrease weight by 10">
									<MinusIcon class="w-4 h-4 text-heavy-metal" />
								</button>
								<div
									v-if="editingWeightId !== rewardDoc.id"
									@click="startEditWeight(rewardDoc)"
									class="flex items-center justify-center px-1 py-1 text-center cursor-pointer bg-norway hover:bg-saltpan transition-colors min-w-[2.5rem] border-r-2 border-gray-asparagus">
									<span
										class="text-sm sm:text-base font-bold text-heavy-metal"
										data-cy="item-weight-display">
										{{ rewardDoc.weight }}
									</span>
								</div>
								<input
									v-else
									:ref="(el) => setWeightInputRef(rewardDoc.id, el)"
									:value="editingWeightValue"
									type="number"
									min="1"
									@input="updateEditingWeightValue"
									@blur="saveWeight(rewardDoc)"
									@keyup.enter="saveWeight(rewardDoc)"
									@keydown.escape="cancelEditWeight"
									class="px-1 py-1 text-center text-sm sm:text-base font-semibold text-heavy-metal focus:outline-none focus:ring-2 focus:ring-blue-500 w-10 border-r-2 border-gray-asparagus bg-norway [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
									autofocus />
								<button
									@click="increaseRewardWeight(rewardDoc)"
									class="flex items-center justify-center px-1 py-1 bg-sea-mist hover:bg-saltpan transition-colors rounded-r min-w-[2rem]"
									title="Increase weight by 10">
									<PlusIcon class="w-4 h-4 text-heavy-metal" />
								</button>
							</div>
							<div class="bg-transparent px-2 py-1 inline-block min-w-[60px] text-center">
								<span class="text-sm sm:text-base font-semibold text-heavy-metal">
									{{ getRewardDocChance(rewardDoc).toFixed(1) }}%
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div
				class="flex items-center max-[450px]:items-start max-[450px]:pt-2 gap-2 ml-8 max-[640px]:ml-2">
				<button
					v-if="canEdit"
					@click="emit('edit', rewardDoc)"
					class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
					title="Edit reward"
					data-cy="edit-item-button">
					<PencilIcon class="w-4 h-4" />
				</button>
				<button
					v-else
					disabled
					class="p-1 bg-gray-300 text-gray-500 cursor-not-allowed rounded"
					title="Cannot edit multi-item rewards (imported from YAML)">
					<PencilIcon class="w-4 h-4" />
				</button>
				<button
					@click="emit('delete', rewardDoc)"
					class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded"
					title="Delete reward"
					data-cy="delete-item-button">
					<TrashIcon class="w-4 h-4" />
				</button>
			</div>
		</div>
	</div>
</template>

