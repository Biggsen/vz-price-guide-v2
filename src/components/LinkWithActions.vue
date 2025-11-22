<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { BuildingStorefrontIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
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
	<li class="flex items-center gap-3 justify-between text-heavy-metal">
		<RouterLink
			:to="props.to"
			class="inline-flex items-center gap-2 text-base font-semibold text-gray-600 hover:text-heavy-metal transition">
			<template v-if="props.shopName">
				<img
					v-if="computedAvatarUrl"
					:src="computedAvatarUrl"
					:alt="props.shopName"
					class="w-5 h-5 rounded"
					@error="$event.target.style.display = 'none'" />
				<span>{{ props.shopName }}</span>
				<span v-if="showShopName"> - {{ props.label }}</span>
			</template>
			<template v-else>
				<img
					v-if="computedAvatarUrl"
					:src="computedAvatarUrl"
					:alt="props.label"
					class="w-5 h-5 rounded"
					@error="$event.target.style.display = 'none'" />
				<BuildingStorefrontIcon v-else class="w-4 h-4 text-gray-500" />
				{{ props.label }}
			</template>
		</RouterLink>
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

