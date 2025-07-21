<script setup>
import { inject, ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'

const { user, isAdmin, canViewMissingItems, canAddItems, canBulkUpdate } = useAdmin()
const activeMainNav = inject('activeMainNav')

// State for collapsible sections
const isAdminExpanded = ref(false)
const isRecipesExpanded = ref(false)
const isShopManagerExpanded = ref(false)

// Auto-expand the active section
const expandedSection = computed(() => {
	if (activeMainNav === 'admin') return 'admin'
	if (activeMainNav === 'recipes') return 'recipes'
	if (activeMainNav === 'shop-manager') return 'shop-manager'
	return null
})

// Watch for activeMainNav changes to auto-expand
watch(
	activeMainNav,
	(newSection) => {
		if (newSection === 'admin') {
			isAdminExpanded.value = true
			isRecipesExpanded.value = false
			isShopManagerExpanded.value = false
		} else if (newSection === 'recipes') {
			isAdminExpanded.value = false
			isRecipesExpanded.value = true
			isShopManagerExpanded.value = false
		} else if (newSection === 'shop-manager') {
			isAdminExpanded.value = false
			isRecipesExpanded.value = false
			isShopManagerExpanded.value = true
		}
	},
	{ immediate: true }
)

function toggleSection(section) {
	if (section === 'admin') {
		isAdminExpanded.value = !isAdminExpanded.value
	} else if (section === 'recipes') {
		isRecipesExpanded.value = !isRecipesExpanded.value
	} else if (section === 'shop-manager') {
		isShopManagerExpanded.value = !isShopManagerExpanded.value
	}
}
</script>

<template>
	<!-- Admin Subnav (Desktop Only) -->
	<nav
		v-if="activeMainNav === 'admin' && isAdmin"
		class="bg-gray-700 text-white border-t border-gray-600 hidden sm:block">
		<!-- Mobile: Collapsible layout -->
		<div class="sm:hidden">
			<!-- Section Header -->
			<button
				@click="toggleSection('admin')"
				class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors">
				<span class="font-medium">Admin Tools</span>
				<span
					class="text-sm transition-transform"
					:class="{ 'rotate-180': isAdminExpanded }">
					▼
				</span>
			</button>

			<!-- Collapsible Content -->
			<div v-show="isAdminExpanded" class="border-t border-gray-600">
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/admin">
					Dashboard
				</RouterLink>
				<RouterLink
					v-if="canViewMissingItems"
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/missing-items">
					Missing Items
				</RouterLink>
				<RouterLink
					v-if="canAddItems"
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/add">
					Add Item
				</RouterLink>
				<RouterLink
					v-if="canBulkUpdate"
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/bulk-update">
					Bulk Update
				</RouterLink>
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/styleguide">
					Styleguide
				</RouterLink>
				<div class="px-6 py-2">
					<span class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
				</div>
			</div>
		</div>

		<!-- Desktop: Horizontal layout -->
		<div class="hidden sm:flex gap-4 items-center px-4 py-2">
			<RouterLink class="hover:underline" active-class="underline" to="/admin">
				Dashboard
			</RouterLink>
			<RouterLink
				v-if="canViewMissingItems"
				class="hover:underline"
				active-class="underline"
				to="/missing-items">
				Missing Items
			</RouterLink>
			<RouterLink
				v-if="canAddItems"
				class="hover:underline"
				active-class="underline"
				to="/add">
				Add Item
			</RouterLink>
			<RouterLink
				v-if="canBulkUpdate"
				class="hover:underline"
				active-class="underline"
				to="/bulk-update">
				Bulk Update
			</RouterLink>
			<RouterLink class="hover:underline" active-class="underline" to="/styleguide">
				Styleguide
			</RouterLink>
			<div class="ml-auto">
				<span class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
			</div>
		</div>
	</nav>

	<!-- Recipes Subnav (Desktop Only) -->
	<nav
		v-if="activeMainNav === 'recipes' && isAdmin"
		class="bg-gray-700 text-white border-t border-gray-600 hidden sm:block">
		<!-- Mobile: Collapsible layout -->
		<div class="sm:hidden">
			<!-- Section Header -->
			<button
				@click="toggleSection('recipes')"
				class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors">
				<span class="font-medium">Recipe Management</span>
				<span
					class="text-sm transition-transform"
					:class="{ 'rotate-180': isRecipesExpanded }">
					▼
				</span>
			</button>

			<!-- Collapsible Content -->
			<div v-show="isRecipesExpanded" class="border-t border-gray-600">
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/recipes/import">
					Import
				</RouterLink>
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/recipes/manage">
					Manage
				</RouterLink>
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/recipes/recalculate">
					Recalculate Prices
				</RouterLink>
				<div class="px-6 py-2">
					<span class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
				</div>
			</div>
		</div>

		<!-- Desktop: Horizontal layout -->
		<div class="hidden sm:flex gap-4 items-center px-4 py-2">
			<RouterLink class="hover:underline" active-class="underline" to="/recipes/import">
				Import
			</RouterLink>
			<RouterLink class="hover:underline" active-class="underline" to="/recipes/manage">
				Manage
			</RouterLink>
			<RouterLink class="hover:underline" active-class="underline" to="/recipes/recalculate">
				Recalculate Prices
			</RouterLink>
			<div class="ml-auto">
				<span class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
			</div>
		</div>
	</nav>

	<!-- Shop Manager Subnav (Desktop Only) -->
	<nav
		v-if="activeMainNav === 'shop-manager' && user?.email"
		class="bg-gray-700 text-white border-t border-gray-600 hidden sm:block">
		<!-- Mobile: Collapsible layout -->
		<div class="sm:hidden">
			<!-- Section Header -->
			<button
				@click="toggleSection('shop-manager')"
				class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors">
				<span class="font-medium">Shop Management</span>
				<span
					class="text-sm transition-transform"
					:class="{ 'rotate-180': isShopManagerExpanded }">
					▼
				</span>
			</button>

			<!-- Collapsible Content -->
			<div v-show="isShopManagerExpanded" class="border-t border-gray-600">
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/shop-manager">
					Dashboard
				</RouterLink>
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/market-overview">
					Market Overview
				</RouterLink>
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/shop-items">
					Shop Items
				</RouterLink>
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/shops">
					Shops
				</RouterLink>
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/servers">
					Servers
				</RouterLink>
			</div>
		</div>

		<!-- Desktop: Horizontal layout -->
		<div class="hidden sm:flex gap-4 items-center px-4 py-2">
			<RouterLink class="hover:underline" active-class="underline" to="/shop-manager">
				Dashboard
			</RouterLink>
			<RouterLink class="hover:underline" active-class="underline" to="/market-overview">
				Market Overview
			</RouterLink>
			<RouterLink class="hover:underline" active-class="underline" to="/shop-items">
				Shop Items
			</RouterLink>
			<RouterLink class="hover:underline" active-class="underline" to="/shops">
				Shops
			</RouterLink>
			<RouterLink class="hover:underline" active-class="underline" to="/servers">
				Servers
			</RouterLink>
		</div>
	</nav>
</template>
