<script setup>
import { ref, computed, watch } from 'vue'
import { useAdmin } from '../utils/admin.js'
import { versions, baseEnabledVersions } from '../constants.js'
import { useRoute } from 'vue-router'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
	isOpen: {
		type: Boolean,
		default: false
	},
	selectedVersion: {
		type: String,
		required: true
	}
})

const emit = defineEmits(['close', 'save-settings'])

// Router access
const route = useRoute()

// Admin access
const { user, canEditItems } = useAdmin()

// Computed property for enabled versions based on user type
const enabledVersions = computed(() => {
	try {
		// Admin users can access all versions (but only if admin status is fully loaded)
		if (user.value?.email && canEditItems.value === true) {
			return [...(versions || ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21'])]
		}
		// Regular users only get base enabled versions
		return [...baseEnabledVersions]
	} catch (error) {
		// Fallback to base enabled versions if anything goes wrong
		console.warn('Error in enabledVersions computed:', error)
		return [...baseEnabledVersions]
	}
})

// Settings state
const selectedVersion = ref(props.selectedVersion)
const priceMultiplier = ref(1)
const sellMargin = ref(0.3)
const roundToWhole = ref(false)
const showStackSize = ref(true)

// Watch for prop changes and update local state
watch(
	() => props.selectedVersion,
	(newVersion) => {
		selectedVersion.value = newVersion
	}
)

// Computed property for percentage display (30 instead of 0.3)
const sellMarginPercentage = computed({
	get: () => Math.round(sellMargin.value * 100),
	set: (value) => {
		sellMargin.value = value / 100
	}
})

// Load settings from localStorage, but prioritize URL query parameters
function loadSettings() {
	const savedPriceMultiplier = localStorage.getItem('priceMultiplier')
	const savedSellMargin = localStorage.getItem('sellMargin')
	const savedRoundToWhole = localStorage.getItem('roundToWhole')
	const savedSelectedVersion = localStorage.getItem('selectedVersion')
	const savedShowStackSize = localStorage.getItem('showStackSize')

	// Check URL query parameters first for version
	const versionParam = route.query.version
	if (versionParam && enabledVersions.value.includes(versionParam)) {
		selectedVersion.value = versionParam
	} else if (savedSelectedVersion !== null) {
		selectedVersion.value = savedSelectedVersion
	}

	if (savedPriceMultiplier !== null) {
		priceMultiplier.value = parseFloat(savedPriceMultiplier)
	}
	if (savedSellMargin !== null) {
		sellMargin.value = parseFloat(savedSellMargin)
	}
	if (savedRoundToWhole !== null) {
		roundToWhole.value = savedRoundToWhole === 'true'
	}
	if (savedShowStackSize !== null) {
		showStackSize.value = savedShowStackSize === 'true'
	}
}

// Save settings to localStorage and emit to parent
function saveSettings() {
	localStorage.setItem('priceMultiplier', priceMultiplier.value.toString())
	localStorage.setItem('sellMargin', sellMargin.value.toString())
	localStorage.setItem('roundToWhole', roundToWhole.value.toString())
	localStorage.setItem('selectedVersion', selectedVersion.value)
	localStorage.setItem('showStackSize', showStackSize.value.toString())

	// Emit settings to parent component
	emit('save-settings', {
		selectedVersion: selectedVersion.value,
		priceMultiplier: priceMultiplier.value,
		sellMargin: sellMargin.value,
		roundToWhole: roundToWhole.value,
		showStackSize: showStackSize.value
	})
}

function selectVersion(version) {
	// Only allow selecting enabled versions
	if (enabledVersions.value.includes(version)) {
		selectedVersion.value = version
	}
}

function closeModal() {
	emit('close')
}

// Load settings when modal opens
function handleOpen() {
	loadSettings()
}

// Watch for changes in enabledVersions and re-initialize version from query
watch(
	enabledVersions,
	(newEnabledVersions) => {
		// Only re-initialize if we have enabled versions and there's a version param
		if (newEnabledVersions.length > 0 && route.query.version) {
			const versionParam = route.query.version
			if (newEnabledVersions.includes(versionParam)) {
				selectedVersion.value = versionParam
			}
		}
	},
	{ immediate: true }
)

// Save settings when modal closes
function handleClose() {
	saveSettings()
	closeModal()
}

// Expose methods for parent component
defineExpose({
	handleOpen,
	handleClose
})
</script>

<template>
	<BaseModal :isOpen="isOpen" title="Settings" @close="closeModal">
		<!-- Version Selection -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">Minecraft Version:</label>

			<!-- Desktop: Button Pills -->
			<div
				class="hidden sm:inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
				<button
					v-for="version in versions"
					:key="version"
					@click="selectVersion(version)"
					:class="[
						selectedVersion === version
							? 'bg-gray-asparagus text-white'
							: enabledVersions.includes(version)
							? 'bg-norway text-heavy-metal hover:bg-gray-100'
							: 'bg-gray-200 text-gray-400 cursor-not-allowed',
						'px-3 py-1 text-sm font-medium transition border-r border-gray-asparagus last:border-r-0',
						!enabledVersions.includes(version) ? 'opacity-60' : ''
					]">
					{{ version }}
				</button>
			</div>

			<!-- Mobile: Dropdown -->
			<select
				v-model="selectedVersion"
				class="sm:hidden w-full border-2 border-gray-asparagus rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-asparagus focus:border-transparent">
				<option
					v-for="version in versions"
					:key="version"
					:value="version"
					:disabled="!enabledVersions.includes(version)">
					{{ version }}{{ !enabledVersions.includes(version) ? ' (Admin only)' : '' }}
				</option>
			</select>

			<div class="text-sm text-gray-600 mt-1">
				<span v-if="user?.email && canEditItems">
					All versions available for admin users
				</span>
				<span v-else>Grayed out versions will be available soon</span>
			</div>
		</div>

		<!-- Price Configuration -->
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">Prices:</label>
			<div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
				<!-- Price Multiplier -->
				<div class="flex items-center gap-2">
					<label
						for="priceMultiplier"
						class="text-sm font-medium text-gray-700 whitespace-nowrap">
						Buy ×
					</label>
					<input
						id="priceMultiplier"
						v-model.number="priceMultiplier"
						type="number"
						min="0.1"
						max="10"
						step="0.1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm" />
				</div>

				<!-- Sell Margin -->
				<div class="flex items-center gap-2">
					<label
						for="sellMargin"
						class="text-sm font-medium text-gray-700 whitespace-nowrap">
						Sell %
					</label>
					<input
						id="sellMargin"
						v-model.number="sellMarginPercentage"
						type="number"
						min="1"
						max="100"
						step="1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm" />
				</div>
			</div>

			<!-- Round to Whole -->
			<div class="flex items-center gap-2">
				<input
					id="roundToWhole"
					v-model="roundToWhole"
					type="checkbox"
					class="checkbox-input" />
				<label for="roundToWhole" class="text-sm text-gray-700">Round to whole</label>
			</div>

			<!-- Show Zero Priced Items (admin only) -->

			<!-- Show Stack Size -->
			<div class="flex items-center gap-2 mt-2">
				<input
					id="showStackSize"
					v-model="showStackSize"
					type="checkbox"
					class="checkbox-input" />
				<label for="showStackSize" class="text-sm text-gray-700">Show stack size</label>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<button @click="closeModal" class="btn-secondary--outline">Cancel</button>
					<BaseButton @click="handleClose" variant="primary">Save Settings</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
