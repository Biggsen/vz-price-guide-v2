<script setup>
import { getImageUrl, getItemImageUrl } from '../utils/image.js'
import { getEnchantmentIds } from '../utils/enchantments.js'
import { stripColorCodes } from '../utils/minecraftText.js'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
	isOpen: {
		type: Boolean,
		required: true
	},
	rewardDocuments: {
		type: Array,
		default: () => []
	},
	simulationResults: {
		type: Array,
		required: true
	},
	isSimulating: {
		type: Boolean,
		default: false
	},
	getDisplayItemImageFromDoc: {
		type: Function,
		required: true
	},
	getRewardDocChance: {
		type: Function,
		required: true
	},
	isMultiItemReward: {
		type: Function,
		required: true
	},
	formatEnchantmentName: {
		type: Function,
		required: true
	},
	simulateCrateOpen: {
		type: Function,
		required: true
	},
	simulateMultipleOpens: {
		type: Function,
		required: true
	},
	clearSimulationResults: {
		type: Function,
		required: true
	}
})

const emit = defineEmits(['close'])
</script>

<template>
	<BaseModal
		:isOpen="isOpen"
		title="Test Crate Rewards"
		maxWidth="max-w-4xl"
		:closeOnBackdrop="false"
		@close="$emit('close')">
		<div class="space-y-6">
			<!-- Simulation Controls -->
			<div class="flex items-center gap-4 flex-wrap">
				<div class="flex gap-2">
					<BaseButton
						@click="simulateCrateOpen"
						:disabled="!rewardDocuments?.length || isSimulating"
						variant="primary">
						Open 1 Crate
					</BaseButton>
					<BaseButton
						@click="simulateMultipleOpens(10)"
						:disabled="!rewardDocuments?.length || isSimulating"
						variant="primary">
						Open 10 Crates
					</BaseButton>
					<BaseButton
						@click="simulateMultipleOpens(50)"
						:disabled="!rewardDocuments?.length || isSimulating"
						variant="primary">
						Open 50 Crates
					</BaseButton>
				</div>
				<BaseButton
					@click="clearSimulationResults"
					:disabled="!simulationResults.length"
					variant="tertiary"
					class="ml-auto">
					Clear Results
				</BaseButton>
				<div v-if="isSimulating" class="text-sm text-gray-700 font-medium">
					Simulating...
				</div>
			</div>

			<!-- Simulation Results -->
			<div
				v-if="simulationResults.length > 0"
				class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
				<h4 class="text-sm font-medium text-gray-700 mb-3">
					Recent Simulation Results ({{ simulationResults.length }}):
				</h4>
				<div class="max-h-[60vh] overflow-y-auto">
					<div
						class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
						<div
							v-for="result in simulationResults"
							:key="result.id"
							class="p-2 bg-white rounded border">
							<div class="flex items-start gap-2 mb-1">
								<img
									v-if="getDisplayItemImageFromDoc(result.item)"
									:src="getItemImageUrl(
										getDisplayItemImageFromDoc(result.item),
										getEnchantmentIds(result.item.display_enchantments)
									)"
									:alt="result.item.display_name"
									@error="
										$event.target.src = getImageUrl(
											getDisplayItemImageFromDoc(result.item)
										)
									"
									loading="lazy"
									decoding="async"
									fetchpriority="low"
									class="max-w-6 max-h-6 object-contain" />
								<QuestionMarkCircleIcon v-else class="w-6 h-6 text-gray-400" />
								<div class="flex-1 min-w-0">
									<div class="text-xs font-medium text-gray-900 truncate">
										{{
											stripColorCodes(result.item.display_name) ||
											stripColorCodes(result.itemData?.name) ||
											'Unknown'
										}}
									</div>
									<div class="text-xs text-gray-500">
										{{ getRewardDocChance(result.item).toFixed(1) }}% chance
									</div>
									<!-- Multi-item indicator -->
									<div
										v-if="isMultiItemReward(result.item)"
										class="text-xs text-blue-600 font-medium">
										{{ result.item.items.length }} items
									</div>
									<!-- Enchantments Display -->
									<div
										v-if="
											result.item.display_enchantments &&
											getEnchantmentIds(result.item.display_enchantments)
												.length > 0
										"
										class="mt-1">
										<div class="flex flex-wrap gap-x-2 gap-y-1">
											<span
												v-for="enchantmentId in getEnchantmentIds(
													result.item.display_enchantments
												)"
												:key="enchantmentId"
												class="text-heavy-metal text-[10px] font-medium capitalize leading-none">
												{{ formatEnchantmentName(enchantmentId) }}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Empty State -->
			<div v-else class="text-center py-8 text-gray-500">
				<p>
					No simulation results yet. Click a button above to start testing your crate
					rewards!
				</p>
			</div>
		</div>
	</BaseModal>
</template>
