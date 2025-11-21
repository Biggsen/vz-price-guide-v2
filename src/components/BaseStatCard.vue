<script setup>
import { computed } from 'vue'

defineOptions({
	name: 'BaseStatCard'
})

const props = defineProps({
	variant: {
		type: String,
		default: 'primary',
		validator: (value) => ['primary', 'secondary', 'tertiary', 'inline'].includes(value)
	},
	iconBgColor: {
		type: String,
		default: ''
	}
})

const variantStyles = computed(() => {
	switch (props.variant) {
		case 'inline':
			return {
				container: 'flex items-start gap-2',
				iconWrapper: props.iconBgColor
					? `w-12 h-12 rounded-full flex items-center justify-center ${props.iconBgColor}`
					: 'w-12 h-12 rounded-full flex items-center justify-center bg-sea-mist',
				iconColor: 'text-heavy-metal',
				content: 'flex-1 pt-1',
				subheading: 'text-xs text-gray-600 uppercase',
				number: 'text-2xl font-bold text-heavy-metal -mt-1'
			}
		case 'secondary':
			return {
				container:
					'bg-sea-mist rounded-lg shadow-md border-2 border-amulet p-4 flex items-center gap-4',
				iconWrapper: props.iconBgColor
					? `w-16 h-16 rounded-full flex items-center justify-center ${props.iconBgColor}`
					: 'w-16 h-16 rounded-full flex items-center justify-center bg-amulet',
				iconColor: 'text-heavy-metal',
				content: 'flex-1',
				subheading: 'text-sm text-gray-600 mb-1',
				number: 'text-3xl font-bold text-heavy-metal'
			}
		case 'tertiary':
			return {
				container:
					'bg-saltpan rounded-lg shadow-md border-2 border-highland p-4 flex items-center gap-4',
				iconWrapper: props.iconBgColor
					? `w-16 h-16 rounded-full flex items-center justify-center ${props.iconBgColor}`
					: 'w-16 h-16 rounded-full flex items-center justify-center bg-sea-mist',
				iconColor: 'text-heavy-metal',
				content: 'flex-1',
				subheading: 'text-sm text-gray-600 mb-1',
				number: 'text-3xl font-bold text-heavy-metal'
			}
		case 'primary':
		default:
			return {
				container:
					'bg-norway rounded-lg shadow-md border-2 border-gray-asparagus p-4 flex items-center gap-4',
				iconWrapper: props.iconBgColor
					? `w-16 h-16 rounded-full flex items-center justify-center ${props.iconBgColor}`
					: 'w-16 h-16 rounded-full flex items-center justify-center bg-gray-asparagus',
				iconColor: 'text-white',
				content: 'flex-1',
				subheading: 'text-sm text-gray-600 mb-1',
				number: 'text-3xl font-bold text-heavy-metal'
			}
	}
})
</script>

<template>
	<div :class="variantStyles.container">
		<div :class="variantStyles.iconWrapper">
			<div :class="[variantStyles.iconColor, props.variant === 'inline' ? 'inline-icon' : '']">
				<slot name="icon" />
			</div>
		</div>
		<div :class="variantStyles.content">
			<div :class="variantStyles.subheading">
				<slot name="subheading" />
			</div>
			<div :class="variantStyles.number">
				<slot name="number" />
			</div>
		</div>
	</div>
</template>

<style scoped>
:deep(svg) {
	@apply w-8 h-8;
}

.inline-icon :deep(svg) {
	@apply w-6 h-6;
}
</style>
