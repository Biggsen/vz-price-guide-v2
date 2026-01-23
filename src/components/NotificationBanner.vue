<script setup>
import {
	CheckCircleIcon,
	ExclamationTriangleIcon,
	InformationCircleIcon,
	XCircleIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
	type: {
		type: String,
		required: true,
		validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
	},
	title: {
		type: String,
		required: true
	},
	message: {
		type: String,
		required: true
	},
	icon: {
		type: [Object, Function],
		default: null
	},
	size: {
		type: String,
		default: 'default',
		validator: (value) => ['default', 'compact'].includes(value)
	}
})

const typeConfig = {
	success: {
		borderColor: 'border-l-semantic-success',
		backgroundColor: 'bg-semantic-success-light',
		icon: CheckCircleIcon
	},
	error: {
		borderColor: 'border-l-semantic-danger',
		backgroundColor: 'bg-semantic-danger-light',
		icon: XCircleIcon
	},
	warning: {
		borderColor: 'border-l-semantic-warning',
		backgroundColor: 'bg-semantic-warning-light',
		icon: ExclamationTriangleIcon
	},
	info: {
		borderColor: 'border-l-semantic-info',
		backgroundColor: 'bg-semantic-info-light',
		icon: InformationCircleIcon
	}
}

const config = typeConfig[props.type]
const IconComponent = props.icon || config.icon
</script>

<template>
	<div :class="['border-l-4', config.borderColor]">
		<div class="border-l-2 border-l-white">
			<div :class="[size === 'compact' ? 'p-2' : 'p-3', config.backgroundColor]">
				<div :class="['flex', size === 'compact' ? 'items-center' : 'items-start']">
					<IconComponent
						:class="[
							'text-heavy-metal mr-2 flex-shrink-0',
							size === 'compact' ? 'w-5 h-5' : 'w-6 h-6'
						]" />
					<div>
						<div v-if="size === 'default'" class="text-heavy-metal font-medium">
							{{ title }}
						</div>
						<div :class="['text-heavy-metal text-sm', size === 'default' ? 'mt-1' : '']">
							{{ message }}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
