<script setup>
import { computed } from 'vue'
import { getImageUrl } from '../utils/image.js'
import { stripColorCodes } from '../utils/minecraftText.js'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import {
	XMarkIcon as XMarkIconMini,
	XCircleIcon,
	ChevronDoubleLeftIcon,
	QuestionMarkCircleIcon
} from '@heroicons/vue/20/solid'

const props = defineProps({
	isOpen: {
		type: Boolean,
		required: true
	},
	editingRewardDoc: {
		type: Object,
		default: null
	},
	itemForm: {
		type: Object,
		required: true
	},
	selectedItem: {
		type: Object,
		default: null
	},
	searchQuery: {
		type: String,
		required: true
	},
	filteredItems: {
		type: Array,
		required: true
	},
	itemsByCategory: {
		type: Object,
		required: true
	},
	highlightedIndex: {
		type: Number,
		required: true
	},
	getItemVisualIndex: {
		type: Function,
		required: true
	},
	showEnchantmentsSection: {
		type: Boolean,
		required: true
	},
	canAddEnchantments: {
		type: Boolean,
		required: true
	},
	enchantmentSearchQuery: {
		type: String,
		required: true
	},
	filteredEnchantments: {
		type: Array,
		required: true
	},
	enchantmentHighlightedIndex: {
		type: Number,
		required: true
	},
	addItemFormError: {
		type: String,
		default: null
	},
	loading: {
		type: Boolean,
		default: false
	},
	getItemById: {
		type: Function,
		required: true
	},
	formatEnchantmentName: {
		type: Function,
		required: true
	},
	handleSearchInput: {
		type: Function,
		required: true
	},
	handleKeyDown: {
		type: Function,
		required: true
	},
	selectItem: {
		type: Function,
		required: true
	},
	clearSelectedItem: {
		type: Function,
		required: true
	},
	handleEnchantmentSearchInput: {
		type: Function,
		required: true
	},
	handleEnchantmentKeyDown: {
		type: Function,
		required: true
	},
	addEnchantmentToForm: {
		type: Function,
		required: true
	},
	removeEnchantment: {
		type: Function,
		required: true
	},
	setQuantityToStack: {
		type: Function,
		required: true
	},
	saveItem: {
		type: Function,
		required: true
	}
})

const emit = defineEmits(['close', 'update:itemForm', 'update:searchQuery', 'update:enchantmentSearchQuery'])

const modalTitle = computed(() =>
	props.editingRewardDoc ? 'Edit Reward' : 'Add Item to Crate Reward'
)

function handleClose() {
	emit('close')
}

function updateItemForm(field, value) {
	emit('update:itemForm', { ...props.itemForm, [field]: value })
}

function updateQuantity(value) {
	// Allow empty string for clearing the field
	if (value === '' || value === null) {
		updateItemForm('quantity', '')
	} else {
		const numValue = parseInt(value)
		updateItemForm('quantity', isNaN(numValue) ? '' : numValue)
	}
}

function updateWeight(value) {
	// Allow empty string for clearing the field
	if (value === '' || value === null) {
		updateItemForm('weight', '')
	} else {
		const numValue = parseInt(value)
		updateItemForm('weight', isNaN(numValue) ? '' : numValue)
	}
}

function updateValueSource(value) {
	updateItemForm('value_source', value)
}

function updateCustomValue(value) {
	updateItemForm('custom_value', value ? Number(value) : null)
}
</script>

<template>
	<BaseModal :isOpen="isOpen" :title="modalTitle" maxWidth="max-w-2xl" :closeOnBackdrop="false" @close="handleClose">
		<form @submit.prevent="saveItem" class="space-y-4">
			<!-- Item selection -->
			<div v-if="!editingRewardDoc">
				<!-- Show search input when no item is selected -->
				<div v-if="!selectedItem">
					<label
						for="item-search"
						class="block text-sm font-medium text-gray-700 mb-1">
						Search and Select Item *
					</label>
					<input
						id="item-search"
						:value="searchQuery"
						@input="(e) => { handleSearchInput(); $emit('update:searchQuery', e.target.value) }"
						@keydown="handleKeyDown"
						type="text"
						autocomplete="off"
						placeholder="Search items by name, material ID, or category..."
						data-cy="item-search-input"
						class="block w-full rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans" />

					<!-- Error message for item selection -->
					<div
						v-if="addItemFormError && addItemFormError === 'Please select an item'"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1"
						data-cy="item-search-error">
						<XCircleIcon class="w-4 h-4" />
						{{ addItemFormError }}
					</div>

					<!-- Item selection dropdown -->
					<div
						v-if="searchQuery && filteredItems.length > 0"
						class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white"
						data-cy="item-search-results">
						<template
							v-for="(categoryItems, category) in itemsByCategory"
							:key="category">
							<div
								class="px-3 py-2 bg-gray-100 text-sm font-medium text-gray-700 border-b">
								{{ category }}
							</div>
							<div
								v-for="(item, categoryIndex) in categoryItems"
								:key="item.id"
								@click="selectItem(item)"
								:class="[
									'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center justify-between',
									getItemVisualIndex(category, categoryIndex) === highlightedIndex
										? 'bg-norway text-blue-900'
										: 'hover:bg-sea-mist'
								]">
								<div>
									<div class="font-medium text-heavy-metal">{{ item.name }}</div>
									<div class="text-sm text-gray-asparagus">
										{{ item.material_id }}
									</div>
								</div>
								<div v-if="item.image" class="w-8 h-8 flex items-center justify-center">
									<img
										:src="getImageUrl(item.image)"
										:alt="item.name"
										loading="lazy"
										decoding="async"
										fetchpriority="low"
										class="max-w-full max-h-full object-contain" />
								</div>
							</div>
						</template>
					</div>
				</div>

				<!-- Show selected item when item is selected -->
				<div v-else>
					<label class="block text-sm font-medium text-gray-700 mb-1">Item *</label>
					<div
						class="px-3 py-2 bg-sea-mist border-2 border-highland rounded flex items-center justify-between">
						<div>
							<div class="font-medium text-heavy-metal">
								{{ selectedItem.name }}
							</div>
							<div class="text-sm text-gray-asparagus">
								{{ selectedItem.material_id }}
							</div>
						</div>
						<div v-if="selectedItem.image" class="w-8 h-8 flex items-center justify-center">
							<img
								:src="getImageUrl(selectedItem.image)"
								:alt="selectedItem.name"
								loading="lazy"
								decoding="async"
								fetchpriority="low"
								class="max-w-full max-h-full object-contain" />
						</div>
					</div>
					<button
						type="button"
						@click="clearSelectedItem"
						class="mt-2 text-sm text-heavy-metal hover:text-gray-asparagus underline">
						Select different item
					</button>
				</div>
			</div>

			<!-- Show selected item when editing -->
			<div
				v-else-if="editingRewardDoc"
				class="p-3 bg-gray-100 border border-gray-300 rounded">
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">
							{{
								stripColorCodes(
									getItemById(itemForm.item_id)?.name ||
										editingRewardDoc.display_name ||
										'Unknown Item'
								)
							}}
						</div>
						<div class="text-sm text-gray-600">
							{{
								getItemById(editingRewardDoc.display_item)?.material_id ||
								editingRewardDoc.display_item ||
								itemForm.item_id
							}}
						</div>
					</div>
					<div class="w-8 h-8 flex items-center justify-center">
						<img
							v-if="getItemById(itemForm.item_id)?.image"
							:src="getImageUrl(getItemById(itemForm.item_id).image)"
							:alt="getItemById(itemForm.item_id).name"
							loading="lazy"
							decoding="async"
							fetchpriority="low"
							class="max-w-full max-h-full object-contain" />
						<QuestionMarkCircleIcon v-else class="w-6 h-6 text-gray-600" />
					</div>
				</div>
			</div>

			<!-- Enchantments (Shop Manager UI) - placed directly under selected item -->
			<div
				v-if="
					(!editingRewardDoc || (editingRewardDoc.items && editingRewardDoc.items.length > 0)) &&
					showEnchantmentsSection
				"
				class="mt-4">
				<label
					for="enchantment-search"
					class="block text-sm font-medium text-gray-700 mb-1">
					Enchantments
				</label>

				<!-- Selected enchantments display -->
				<div
					v-if="itemForm.enchantments && itemForm.enchantments.length > 0"
					class="mb-2 flex flex-wrap gap-2">
					<div
						v-for="enchantmentId in itemForm.enchantments"
						:key="enchantmentId"
						class="flex items-center gap-2 pl-3 pr-2 py-1 bg-sea-mist text-heavy-metal rounded-md text-sm font-medium">
						<span>{{ formatEnchantmentName(enchantmentId) }}</span>
						<button
							type="button"
							@click="removeEnchantment(enchantmentId)"
							class="text-heavy-metal hover:text-red-700">
							<XMarkIconMini class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Enchantment search input -->
				<input
					id="enchantment-search"
					:value="enchantmentSearchQuery"
					@input="(e) => { handleEnchantmentSearchInput(); $emit('update:enchantmentSearchQuery', e.target.value) }"
					@keydown="handleEnchantmentKeyDown"
					type="text"
					autocomplete="off"
					:disabled="!canAddEnchantments"
					placeholder="Search enchantments..."
					class="block w-full rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus" />

				<!-- Enchantment dropdown -->
				<div
					v-if="canAddEnchantments && enchantmentSearchQuery && filteredEnchantments.length > 0"
					class="max-h-64 overflow-y-auto border-2 border-gray-asparagus rounded-md bg-white">
					<div
						v-for="(enchantment, index) in filteredEnchantments"
						:key="enchantment.id"
						@click="addEnchantmentToForm(enchantment)"
						:class="[
							'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center gap-3 justify-between',
							index === enchantmentHighlightedIndex
								? 'bg-norway text-heavy-metal'
								: 'hover:bg-sea-mist'
						]">
						<div class="flex-1">
							<div class="font-medium">
								{{ formatEnchantmentName(enchantment.id) }}
							</div>
						</div>
						<div v-if="enchantment.image" class="w-8 h-8 flex-shrink-0">
							<img
								:src="getImageUrl(enchantment.image)"
								:alt="formatEnchantmentName(enchantment.id)"
								class="w-full h-full object-contain" />
						</div>
					</div>
				</div>
				<div
					v-else-if="canAddEnchantments && enchantmentSearchQuery && filteredEnchantments.length === 0"
					class="px-3 py-2 text-sm text-gray-500 italic">
					No enchantments found
				</div>
			</div>

			<div class="space-y-4">
				<!-- Quantity field - only show for item-based rewards -->
				<div
					v-if="!editingRewardDoc || (editingRewardDoc.items && editingRewardDoc.items.length > 0)">
					<label class="block text-sm font-medium text-gray-700 mb-1">
						Quantity *
					</label>
					<div class="flex gap-2">
					<input
						id="item-quantity"
						:value="itemForm.quantity"
						@input="updateQuantity($event.target.value)"
						type="number"
						min="1"
						required
						data-cy="item-quantity-input"
							:class="[
								'w-20 rounded border-2 px-3 py-1 text-gray-900 focus:ring-2 font-sans',
								addItemFormError && addItemFormError.includes('quantity')
									? 'border-red-500 focus:ring-red-500 focus:border-red-500'
									: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
							]" />
						<BaseButton
							type="button"
							@click="setQuantityToStack"
							variant="tertiary"
							class="text-sm whitespace-nowrap">
							<template #left-icon>
								<ChevronDoubleLeftIcon class="w-4 h-4" />
							</template>
							Apply stack size
						</BaseButton>
					</div>
					<div
						v-if="addItemFormError && addItemFormError.includes('quantity')"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1"
						data-cy="item-quantity-error">
						<XCircleIcon class="w-4 h-4" />
						Quantity must be at least 1
					</div>
				</div>
				<div>
					<label
						for="item-weight"
						class="block text-sm font-medium text-gray-700 mb-1">
						Weight *
					</label>
					<input
						id="item-weight"
						:value="itemForm.weight"
						@input="updateWeight($event.target.value)"
						type="number"
						min="1"
						required
						data-cy="item-weight-input"
						:class="[
							'block w-20 rounded border-2 px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 font-sans',
							addItemFormError && addItemFormError.includes('weight')
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />
					<div
						v-if="addItemFormError && addItemFormError.includes('weight')"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1"
						data-cy="item-weight-error">
						<XCircleIcon class="w-4 h-4" />
						Weight must be at least 1
					</div>
				</div>
			</div>

			<!-- Value Source Section -->
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">
						Value Source
					</label>
					<div class="space-y-2">
						<label class="flex items-center cursor-pointer">
							<input
								:checked="itemForm.value_source === 'catalog'"
								@change="updateValueSource('catalog')"
								type="radio"
								value="catalog"
								class="mr-2 radio-input" />
							<span class="text-sm text-gray-700">Use price guide</span>
						</label>
						<label class="flex items-center cursor-pointer">
							<input
								:checked="itemForm.value_source === 'custom'"
								@change="updateValueSource('custom')"
								type="radio"
								value="custom"
								class="mr-2 radio-input" />
							<span class="text-sm text-gray-700">Set custom value</span>
						</label>
					</div>
				</div>

				<!-- Custom Value Input (only show when custom is selected) -->
				<div v-if="itemForm.value_source === 'custom'">
					<label class="block text-sm font-medium text-gray-700 mb-1">
						Custom Value *
					</label>
					<input
						:value="itemForm.custom_value"
						@input="updateCustomValue($event.target.value)"
						type="number"
						min="0"
						step="0.01"
						:class="[
							'block w-32 rounded border-2 px-3 py-1 text-gray-900 focus:ring-2 font-sans',
							addItemFormError && addItemFormError.includes('custom_value')
								? 'border-red-500 focus:ring-red-500 focus:border-red-500'
								: 'border-gray-asparagus focus:ring-gray-asparagus focus:border-gray-asparagus'
						]" />
					<div
						v-if="addItemFormError && addItemFormError.includes('custom_value')"
						class="mt-1 text-sm text-red-600 font-semibold flex items-center gap-1">
						<XCircleIcon class="w-4 h-4" />
						Custom value is required when using custom pricing
					</div>
				</div>
			</div>
		</form>

		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<button type="button" @click="handleClose" class="btn-secondary--outline">
						Cancel
					</button>
					<BaseButton
						@click="saveItem"
						:disabled="loading"
						variant="primary"
						data-cy="item-submit-button">
						{{ loading ? 'Saving...' : editingRewardDoc ? 'Update' : 'Add' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>

<style scoped>
.radio-input {
	@apply w-5 h-5;
	accent-color: theme('colors.gray-asparagus');
}
</style>
