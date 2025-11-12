<script setup>
import { computed, useSlots } from 'vue'

defineOptions({
	name: 'BaseCard'
})

const props = defineProps({
	variant: {
		type: String,
		default: 'primary',
		validator: (value) => ['primary', 'secondary', 'tertiary'].includes(value)
	}
})

const slots = useSlots()

const hasSlot = (name) => Boolean(slots[name])

const propsMediaExists = computed(() => props.variant === 'primary' && hasSlot('media'))

const variantStyles = computed(() => {
	switch (props.variant) {
		case 'secondary': {
			const hasMedia = hasSlot('media')
			return {
				container:
					'bg-sea-mist rounded-lg shadow-md border-2 border-amulet h-full overflow-hidden flex flex-col',
				inner: 'flex flex-col h-full',
				mediaWrapper: hasMedia
					? 'border-t-2 border-x-2 border-white rounded-t-lg overflow-hidden'
					: '',
				headerContainer: hasMedia
					? 'bg-amulet py-2 px-3 pl-4 border-x-2 border-white flex items-center'
					: 'bg-amulet py-2 px-3 pl-4 border-x-2 border-t-2 border-white rounded-t-lg flex items-center',
				header: 'text-xl font-semibold text-heavy-metal flex-1',
				actions: 'flex items-center gap-2 ml-3',
				body: 'bg-norway p-4 border-x-2 border-b-2 border-white rounded-b-lg flex-1 flex flex-col text-heavy-metal',
				footer: 'mt-4 flex-shrink-0'
			}
		}
		case 'tertiary': {
			const hasMedia = hasSlot('media')
			return {
				container:
					'bg-saltpan rounded-lg shadow-md border-2 border-highland h-full overflow-hidden flex flex-col',
				inner: 'flex flex-col h-full',
				mediaWrapper: hasMedia
					? 'border-t-2 border-x-2 border-white rounded-t-lg overflow-hidden'
					: '',
				headerContainer: hasMedia
					? 'bg-saltpan px-4 pt-2 flex items-center'
					: 'bg-saltpan px-4 pt-2 border-x-2 border-t-2 border-white rounded-t-lg flex items-center',
				header: 'text-xl font-semibold text-heavy-metal',
				actions: '',
				body: hasMedia
					? 'px-4 pb-4 pt-2 border-x-2 border-b-2 border-white rounded-b-lg text-heavy-metal flex-1 flex flex-col'
					: 'px-4 pb-4 pt-2 border-x-2 border-b-2 border-white rounded-b-lg text-heavy-metal flex-1',
				footer: 'mt-4'
			}
		}
		case 'primary':
		default:
			return {
				container:
					'bg-norway rounded-lg shadow-md border-2 border-gray-asparagus overflow-hidden flex flex-col',
				inner: 'flex flex-col h-full',
				mediaWrapper: propsMediaExists.value
					? 'border-t-2 border-x-2 border-white rounded-t-lg overflow-hidden'
					: '',
				headerContainer: propsMediaExists.value
					? 'bg-gray-asparagus px-4 py-2 w-full border-x-2 border-white flex items-center'
					: 'bg-gray-asparagus px-4 py-2 w-full border-2 border-white rounded-t-lg flex items-center',
				header: 'text-xl font-semibold text-white flex-1',
				actions: '',
				body: propsMediaExists.value
					? 'p-4 border-2 border-white rounded-b-lg text-heavy-metal flex-1 flex flex-col items-start'
					: 'p-4 border-x-2 border-b-2 border-white rounded-b-lg text-heavy-metal flex-1 flex flex-col items-start',
				footer: 'mt-4'
			}
	}
})
</script>

<template>
	<div :class="variantStyles.container">
		<div :class="variantStyles.inner">
			<div v-if="hasSlot('media')" :class="variantStyles.mediaWrapper">
				<slot name="media" />
			</div>

			<div
				v-if="hasSlot('header') || hasSlot('actions')"
				:class="variantStyles.headerContainer">
				<div :class="variantStyles.header">
					<slot name="header" />
				</div>
				<div v-if="hasSlot('actions')" :class="variantStyles.actions">
					<slot name="actions" />
				</div>
			</div>

			<div :class="variantStyles.body">
				<slot name="body">
					<slot />
				</slot>
				<div v-if="hasSlot('footer')" :class="variantStyles.footer">
					<slot name="footer" />
				</div>
			</div>
		</div>
	</div>
</template>
