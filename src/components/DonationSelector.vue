<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { getCurrency } from '@/utils/donations.js'

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

const emit = defineEmits(['update:modelValue', 'update:currency'])

// Detect currency once on component mount
const currency = getCurrency()

// Emit currency immediately so parent can use it
emit('update:currency', currency.code)

// Generate presets with localized currency symbol
const presets = computed(() => [
	{ value: 0, label: `${currency.symbol}0 (free)` },
	{ value: 10, label: `${currency.symbol}10` },
	{ value: 20, label: `${currency.symbol}20` },
	{ value: 50, label: `${currency.symbol}50` }
])

const isCustomSelected = ref(false)
const customAmount = ref('')
const customError = ref('')
const customInput = ref(null)

// Track which preset is selected (or null if custom)
const selectedPreset = computed(() => {
	if (isCustomSelected.value) return null
	return presets.value.find((p) => p.value === props.modelValue)?.value ?? null
})

// Check if a valid paid donation is selected
const hasValidDonation = computed(() => {
	if (props.modelValue <= 0) return false
	if (!isCustomSelected.value) return true // Preset is selected
	// For custom: check that input is a valid number >= 1
	const num = parseFloat(customAmount.value)
	return !isNaN(num) && num >= 1 && !customError.value
})

// Validate custom amount
function validateCustomAmount(value) {
	if (value === '') {
		return '' // Empty is fine, just defaults to 0
	}
	const num = parseFloat(value)
	if (isNaN(num)) {
		return 'Enter a valid amount'
	}
	if (num < 1) {
		return `Minimum ${currency.symbol}1`
	}
	if (num > 500) {
		return `Maximum ${currency.symbol}500`
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
	// Focus the input
	nextTick(() => {
		customInput.value?.focus()
	})
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
		if (isCustomSelected.value && !presets.value.some((p) => p.value === newValue)) {
			customAmount.value = newValue > 0 ? String(newValue) : ''
		}
	}
)
</script>

<template>
	<div class="donation-selector">
		<div class="mb-2 text-gray-700">
			<p class="text-sm font-medium">
				If you find the Price Guide useful, please consider supporting it.
			</p>
			<p class="text-sm text-gray-500">
				Supporting is optional — exporting is always available.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
				<!-- Preset buttons -->
				<button
					v-for="preset in presets"
					:key="preset.value"
					type="button"
					:disabled="disabled"
					@click="selectPreset(preset.value)"
					:class="[
						'px-3 py-1 text-sm font-medium border-r border-gray-asparagus',
						selectedPreset === preset.value && !isCustomSelected
							? 'bg-gray-asparagus text-white'
							: 'bg-norway text-heavy-metal hover:bg-gray-100',
						disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
					]">
					{{ preset.label }}
				</button>

				<!-- Custom amount -->
				<button
					type="button"
					:disabled="disabled"
					@click="selectCustom"
					:class="[
						'px-3 py-1 text-sm font-medium border-r border-gray-asparagus',
						isCustomSelected
							? 'bg-gray-asparagus text-white'
							: 'bg-norway text-heavy-metal hover:bg-gray-100',
						disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
					]">
					Amount
				</button>
				<div class="relative flex items-center bg-white">
					<span class="absolute left-2 text-sm text-gray-500 pointer-events-none">
						{{ currency.symbol }}
					</span>
					<input
						ref="customInput"
						type="text"
						inputmode="decimal"
						:value="customAmount"
						@input="handleCustomInput"
						@focus="selectCustom"
						@blur="handleCustomBlur"
						:disabled="disabled"
						placeholder="0"
						:class="[
							'w-14 pl-5 pr-2 py-1 text-sm border-0 focus:outline-none',
							customError ? 'bg-red-50' : 'bg-white',
							disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
						]" />
				</div>
			</div>

			<!-- Thank you message when valid paid amount selected -->
			<p
				v-if="hasValidDonation"
				class="text-sm text-semantic-success flex items-center gap-1">
				<span>💚</span>
				<span>Thanks for your support!</span>
			</p>

			<!-- Error message -->
			<p v-if="customError && isCustomSelected" class="text-xs text-semantic-danger">
				{{ customError }}
			</p>
		</div>
	</div>
</template>
