<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { BuildingStorefrontIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { MapPinIcon } from '@heroicons/vue/24/solid'
import { generateMinecraftAvatar } from '../utils/userProfile.js'

defineOptions({
	name: 'PlayerShopsGroup'
})

const props = defineProps({
	playerName: {
		type: String,
		required: true
	},
	shops: {
		type: Array,
		required: true
	},
	avatarUrl: {
		type: String,
		default: null
	},
	loading: {
		type: Boolean,
		default: false
	}
})

defineEmits(['edit', 'delete'])

const computedAvatarUrl = computed(() => {
	if (props.avatarUrl) {
		return props.avatarUrl
	}
	return generateMinecraftAvatar(props.playerName)
})
</script>

<template>
	<li class="flex items-start gap-3 text-heavy-metal">
		<div class="flex-1 min-w-0">
			<div class="flex items-start gap-2 min-w-0">
				<img
					v-if="computedAvatarUrl"
					:src="computedAvatarUrl"
					:alt="playerName"
					class="w-5 h-5 rounded flex-shrink-0 mt-0.5"
					@error="$event.target.style.display = 'none'" />
				<div class="flex flex-col min-w-0 flex-1">
					<span class="break-words min-w-0 text-base font-semibold text-gray-600">{{ playerName }}</span>
					<ul class="mt-1 space-y-1 ml-0">
						<li
							v-for="shop in shops"
							:key="shop.id"
							class="flex items-start justify-between gap-2">
							<div class="flex-1 min-w-0">
								<RouterLink
									:to="{ name: 'shop', params: { shopId: shop.id } }"
									class="flex items-center gap-1 text-sm font-normal text-gray-500 hover:text-heavy-metal transition">
									<BuildingStorefrontIcon class="w-4 h-4 flex-shrink-0" />
									<span class="break-words min-w-0">{{ shop.name }}</span>
								</RouterLink>
								<div v-if="shop.location" class="flex items-center gap-1 mt-0.5 ml-5 text-sm text-gray-500">
									<MapPinIcon class="w-4 h-4 flex-shrink-0" />
									<span class="break-words min-w-0">{{ shop.location }}</span>
								</div>
							</div>
							<div class="flex items-center gap-1">
								<button
									type="button"
									:disabled="loading"
									class="px-1 py-0.5 text-gray-400 hover:text-gray-700 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed"
									@click.stop="$emit('edit', shop)">
									<PencilIcon class="w-4 h-4" />
									<span class="sr-only">Edit</span>
								</button>
								<button
									type="button"
									:disabled="loading"
									class="px-1 py-0.5 text-gray-400 hover:text-gray-700 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed"
									@click.stop="$emit('delete', shop)">
									<TrashIcon class="w-4 h-4" />
									<span class="sr-only">Delete</span>
								</button>
							</div>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</li>
</template>

