<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { XCircleIcon } from '@heroicons/vue/24/solid'

const props = defineProps({
	isOpen: {
		type: Boolean,
		required: true
	},
	editingShop: {
		type: Object,
		default: null
	},
	shopForm: {
		type: Object,
		required: true
	},
	loading: {
		type: Boolean,
		default: false
	},
	errors: {
		type: Object,
		default: () => ({
			name: null,
			player: null,
			server: null,
			create: null,
			edit: null
		})
	},
	presetServerId: {
		type: String,
		default: null
	},
	servers: {
		type: Array,
		default: () => []
	},
	userProfile: {
		type: Object,
		default: null
	},
	usePlayerAsShopName: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['update:isOpen', 'update:shopForm', 'update:usePlayerAsShopName', 'submit', 'close'])

// Refs for form inputs to enable auto-focus
const shopPlayerInput = ref(null)
const shopNameInput = ref(null)

// Computed properties
const isEditMode = computed(() => !!props.editingShop)
const modalTitle = computed(() => (isEditMode.value ? 'Edit Shop' : 'Add New Shop'))
const showServerDropdown = computed(() => !props.presetServerId && !isEditMode.value)
const buttonText = computed(() => {
	if (props.loading) {
		return isEditMode.value ? 'Updating...' : 'Creating...'
	}
	return isEditMode.value ? 'Update Shop' : 'Create Shop'
})

// Watch player name to auto-fill shop name when checkbox is checked
watch(
	() => props.shopForm.player,
	(newPlayer) => {
		if (props.usePlayerAsShopName && newPlayer) {
			emit('update:shopForm', {
				...props.shopForm,
				name: newPlayer
			})
		}
	}
)

// Watch checkbox to sync shop name field
watch(
	() => props.usePlayerAsShopName,
	(checked) => {
		if (checked && props.shopForm.player) {
			emit('update:shopForm', {
				...props.shopForm,
				name: props.shopForm.player
			})
		} else if (!checked) {
			emit('update:shopForm', {
				...props.shopForm,
				name: ''
			})
		}
	}
)

// Auto-focus first input when modal opens
watch(
	() => props.isOpen,
	(isOpen) => {
		if (isOpen) {
			nextTick(() => {
				if (!props.shopForm.is_own_shop && shopPlayerInput.value) {
					shopPlayerInput.value.focus()
				} else if (props.shopForm.is_own_shop && shopNameInput.value) {
					shopNameInput.value.focus()
				}
			})
		}
	}
)

// Handle form input updates
function updateFormField(field, value) {
	emit('update:shopForm', {
		...props.shopForm,
		[field]: value
	})
}


// Handle form submission
function handleSubmit() {
	emit('submit')
}

// Handle modal close
function handleClose() {
	emit('close')
}
</script>

<template>
	<BaseModal
		:isOpen="isOpen"
		:title="modalTitle"
		maxWidth="max-w-2xl"
		@close="handleClose">
		<form @submit.prevent="handleSubmit" class="space-y-4">
			<!-- Player Name Input (only for non-own shops) -->
			<div v-if="!shopForm.is_own_shop">
				<label
					:for="isEditMode ? 'edit-shop-player' : 'shop-player'"
					class="block text-sm font-medium text-gray-700 mb-1">
					Player (Minecraft Username) *
				</label>
				<input
					:id="isEditMode ? 'edit-shop-player' : 'shop-player'"
					ref="shopPlayerInput"
					:value="shopForm.player"
					@input="updateFormField('player', $event.target.value)"
					type="text"
					placeholder="Enter Minecraft username"
					:class="[
						'block w-full rounded border-2 px-3 py-1.5 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
						errors.player
							? 'border-red-500 focus:ring-red-500 focus:border-red-500'
							: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
					]" />
				<div
					v-if="errors.player"
					class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
					<XCircleIcon class="w-4 h-4" />
					{{ errors.player }}
				</div>
			</div>

			<!-- Shop Name Input -->
			<div>
				<label
					:for="isEditMode ? 'edit-shop-name' : 'shop-name'"
					class="block text-sm font-medium text-gray-700 mb-1">
					Shop Name *
				</label>
				<div class="mt-2">
					<label
						v-if="!shopForm.is_own_shop"
						class="flex items-center mb-2 cursor-pointer">
						<input
							:checked="usePlayerAsShopName"
							@change="$emit('update:usePlayerAsShopName', $event.target.checked)"
							type="checkbox"
							class="mr-2 checkbox-input" />
						<span class="text-sm text-gray-700">Use Player as Shop Name</span>
					</label>
					<input
						:id="isEditMode ? 'edit-shop-name' : 'shop-name'"
						ref="shopNameInput"
						:value="shopForm.name"
						@input="updateFormField('name', $event.target.value)"
						type="text"
						required
						:disabled="usePlayerAsShopName && !shopForm.is_own_shop"
						:placeholder="isEditMode ? 'e.g., vz market' : 'e.g., verzion\'s shop'"
						:class="[
							'block w-full rounded border-2 px-3 py-1.5 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans disabled:bg-gray-100 disabled:cursor-not-allowed',
							errors.name
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />
				</div>
				<div
					v-if="errors.name"
					class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
					<XCircleIcon class="w-4 h-4" />
					{{ errors.name }}
				</div>
			</div>

			<!-- Server Selection (only when creating and no preset server) -->
			<div v-if="showServerDropdown">
				<label
					for="shop-server"
					class="block text-sm font-medium text-gray-700 mb-1">
					Server *
				</label>
				<select
					id="shop-server"
					:value="shopForm.server_id"
					@change="updateFormField('server_id', $event.target.value)"
					required
					:class="[
						'block w-full rounded border-2 px-3 py-1.5 mt-2 mb-2 text-gray-900 focus:ring-2 font-sans',
						errors.server
							? 'border-red-500 focus:ring-red-500 focus:border-red-500'
							: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
					]">
					<option value="">Select a server</option>
					<option
						v-for="server in servers"
						:key="server.id"
						:value="server.id">
						{{ server.name }}
					</option>
				</select>
				<div
					v-if="errors.server"
					class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
					<XCircleIcon class="w-4 h-4" />
					{{ errors.server }}
				</div>
			</div>

			<!-- Location Input -->
			<div>
				<label
					:for="isEditMode ? 'edit-shop-location' : 'shop-location'"
					class="block text-sm font-medium text-gray-700 mb-1">
					Location
				</label>
				<input
					:id="isEditMode ? 'edit-shop-location' : 'shop-location'"
					:value="shopForm.location"
					@input="updateFormField('location', $event.target.value)"
					type="text"
					:placeholder="isEditMode ? 'e.g., /warp shops' : 'e.g., /warp shops, coordinates, etc.'"
					class="mt-2 mb-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus" />
			</div>

			<!-- Description Input -->
			<div>
				<label
					:for="isEditMode ? 'edit-shop-description' : 'shop-description'"
					class="block text-sm font-medium text-gray-700 mb-1">
					Description
				</label>
				<textarea
					:id="isEditMode ? 'edit-shop-description' : 'shop-description'"
					:value="shopForm.description"
					@input="updateFormField('description', $event.target.value)"
					rows="3"
					placeholder="Optional description for this shop..."
					class="mt-2 mb-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1.5 text-gray-900 placeholder:text-gray-400 focus:border-gray-asparagus focus:outline-none focus:ring-2 focus:ring-gray-asparagus"></textarea>
			</div>

			<!-- Error Messages -->
			<div
				v-if="errors.create && !isEditMode"
				class="text-sm text-red-600 font-semibold flex items-center gap-1 bg-red-100 border border-red-300 px-3 py-2 rounded">
				<XCircleIcon class="w-4 h-4" />
				{{ errors.create }}
			</div>
			<div
				v-if="errors.edit && isEditMode"
				class="text-sm text-red-600 font-semibold flex items-center gap-1 bg-red-100 border border-red-300 px-3 py-2 rounded">
				<XCircleIcon class="w-4 h-4" />
				{{ errors.edit }}
			</div>
		</form>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<button
						type="button"
						class="btn-secondary--outline"
						@click="handleClose">
						Cancel
					</button>
					<BaseButton
						type="button"
						@click="handleSubmit"
						:disabled="loading"
						variant="primary">
						{{ buttonText }}
					</BaseButton>
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

