<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
	modelValue: {
		type: Number,
		default: 0
	},
	disabled: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['update:modelValue'])

const presets = [
	{ value: 0, label: 'No thanks' },
	{ value: 10, label: '$10' },
	{ value: 20, label: '$20' },
	{ value: 50, label: '$50' }
]

const isCustomSelected = ref(false)
const customAmount = ref('')
const customError = ref('')

// Track which preset is selected (or null if custom)
const selectedPreset = computed(() => {
	if (isCustomSelected.value) return null
	return presets.find((p) => p.value === props.modelValue)?.value ?? null
})

// Validate custom amount
function validateCustomAmount(value) {
	const num = parseFloat(value)
	if (isNaN(num) || value === '') {
		return 'Enter an amount'
	}
	if (num < 1) {
		return 'Minimum $1'
	}
	if (num > 500) {
		return 'Maximum $500'
	}
	return ''
}

function selectPreset(value) {
	isCustomSelected.value = false
	customAmount.value = ''
	customError.value = ''
	emit('update:modelValue', value)
}

function selectCustom() {
	isCustomSelected.value = true
	// Don't emit until they enter a valid amount
	if (customAmount.value) {
		const error = validateCustomAmount(customAmount.value)
		if (!error) {
			emit('update:modelValue', parseFloat(customAmount.value))
		}
	}
}

function handleCustomInput(event) {
	const value = event.target.value
	// Only allow numbers and decimal point
	customAmount.value = value.replace(/[^0-9.]/g, '')
}

function handleCustomBlur() {
	if (!isCustomSelected.value) return

	const error = validateCustomAmount(customAmount.value)
	customError.value = error

	if (!error) {
		emit('update:modelValue', parseFloat(customAmount.value))
	} else {
		// Reset to $0 if invalid
		emit('update:modelValue', 0)
	}
}

// Sync custom amount when modelValue changes externally
watch(
	() => props.modelValue,
	(newValue) => {
		if (isCustomSelected.value && !presets.some((p) => p.value === newValue)) {
			customAmount.value = newValue > 0 ? String(newValue) : ''
		}
	}
)
</script>

<template>
	<div class="donation-selector">
		<div class="flex items-center gap-1.5 mb-2 text-gray-700">
			<span class="text-lg">☕</span>
			<span class="text-sm font-medium">Love the guide? Buy us a coffee!</span>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Preset buttons -->
			<button
				v-for="preset in presets"
				:key="preset.value"
				type="button"
				:disabled="disabled"
				@click="selectPreset(preset.value)"
				:class="[
					'px-3 py-1.5 text-sm font-medium rounded-full border-2 transition-colors',
					'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-asparagus',
					selectedPreset === preset.value && !isCustomSelected
						? 'bg-gray-asparagus text-white border-gray-asparagus'
						: 'bg-white text-gray-700 border-gray-300 hover:border-gray-asparagus hover:bg-norway',
					disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
				]">
				{{ preset.label }}
			</button>

			<!-- Custom amount -->
			<div class="flex items-center gap-1">
				<button
					type="button"
					:disabled="disabled"
					@click="selectCustom"
					:class="[
						'px-3 py-1.5 text-sm font-medium rounded-l-full border-2 border-r-0 transition-colors',
						'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-asparagus',
						isCustomSelected
							? 'bg-gray-asparagus text-white border-gray-asparagus'
							: 'bg-white text-gray-700 border-gray-300 hover:border-gray-asparagus hover:bg-norway',
						disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
					]">
					Custom
				</button>
				<div class="relative">
					<span
						class="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
						$
					</span>
					<input
						type="text"
						inputmode="decimal"
						:value="customAmount"
						@input="handleCustomInput"
						@focus="selectCustom"
						@blur="handleCustomBlur"
						:disabled="disabled"
						placeholder="0"
						:class="[
							'w-16 pl-5 pr-2 py-1.5 text-sm border-2 rounded-r-full transition-colors',
							'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-asparagus',
							isCustomSelected
								? 'border-gray-asparagus'
								: 'border-gray-300 hover:border-gray-asparagus',
							customError ? 'border-semantic-danger' : '',
							disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'
						]" />
				</div>
			</div>
		</div>

		<!-- Error message -->
		<p v-if="customError && isCustomSelected" class="mt-1 text-xs text-semantic-danger">
			{{ customError }}
		</p>

		<!-- Thank you message when paid amount selected -->
		<p
			v-else-if="modelValue > 0"
			class="mt-2 text-xs text-semantic-success flex items-center gap-1">
			<span>💚</span>
			<span>Thanks for supporting the guide!</span>
		</p>
	</div>
</template>
