<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { BuildingStorefrontIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { MapPinIcon } from '@heroicons/vue/24/solid'
import { generateMinecraftAvatar } from '../utils/userProfile.js'

defineOptions({
	name: 'LinkWithActions'
})

const props = defineProps({
	to: {
		type: [String, Object],
		required: true
	},
	label: {
		type: String,
		required: true
	},
	loading: {
		type: Boolean,
		default: false
	},
	shopName: {
		type: String,
		default: null
	},
	avatarUrl: {
		type: String,
		default: null
	},
	location: {
		type: String,
		default: null
	}
})

defineEmits(['edit', 'delete'])

const computedAvatarUrl = computed(() => {
	if (props.avatarUrl) {
		return props.avatarUrl
	}
	if (props.shopName) {
		return generateMinecraftAvatar(props.shopName)
	}
	return null
})

const showShopName = computed(() => {
	return props.shopName && props.label !== props.shopName
})
</script>

<template>
	<li class="flex items-start sm:items-center gap-3 justify-between text-heavy-metal">
		<div class="flex-1 min-w-0">
			<template v-if="props.shopName">
				<div class="flex items-start gap-2 min-w-0">
					<img
						v-if="computedAvatarUrl"
						:src="computedAvatarUrl"
						:alt="props.shopName"
						class="w-5 h-5 rounded flex-shrink-0 mt-0.5"
						@error="$event.target.style.display = 'none'" />
					<div class="flex flex-col min-w-0">
						<RouterLink
							v-if="!showShopName"
							:to="props.to"
							class="break-words min-w-0 text-base font-semibold text-gray-600 hover:text-heavy-metal transition">
							{{ props.shopName }}
						</RouterLink>
						<template v-else>
							<span class="break-words min-w-0 text-base font-semibold text-gray-600">{{ props.shopName }}</span>
							<RouterLink
								:to="props.to"
								class="flex items-center gap-1 mt-0.5 text-sm font-normal text-gray-500 hover:text-heavy-metal transition">
								<BuildingStorefrontIcon class="w-4 h-4 flex-shrink-0" />
								<span class="break-words min-w-0">{{ props.label }}</span>
							</RouterLink>
						</template>
					</div>
				</div>
			</template>
			<template v-else>
				<RouterLink
					:to="props.to"
					class="flex items-start gap-2 text-base font-semibold text-gray-600 hover:text-heavy-metal transition min-w-0">
					<img
						v-if="computedAvatarUrl"
						:src="computedAvatarUrl"
						:alt="props.label"
						class="w-5 h-5 rounded flex-shrink-0"
						@error="$event.target.style.display = 'none'" />
					<BuildingStorefrontIcon v-else class="w-4 h-4 text-gray-500 flex-shrink-0" />
					<span class="break-words min-w-0">{{ props.label }}</span>
				</RouterLink>
			</template>
			<div v-if="props.location" class="flex items-center gap-1 mt-1 ml-7 text-sm text-gray-500">
				<MapPinIcon class="w-4 h-4 flex-shrink-0" />
				<span class="break-words min-w-0">{{ props.location }}</span>
			</div>
		</div>
		<div class="flex items-center gap-1">
			<button
				type="button"
				:disabled="props.loading"
				class="px-1 py-0.5 text-gray-400 hover:text-gray-700 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed"
				@click.stop="$emit('edit')">
				<PencilIcon class="w-4 h-4" />
				<span class="sr-only">Edit</span>
			</button>
			<button
				type="button"
				:disabled="props.loading"
				class="px-1 py-0.5 text-gray-400 hover:text-gray-700 transition-colors rounded disabled:opacity-60 disabled:cursor-not-allowed"
				@click.stop="$emit('delete')">
				<TrashIcon class="w-4 h-4" />
				<span class="sr-only">Delete</span>
			</button>
		</div>
	</li>
</template>

