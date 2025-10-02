<script setup>
import { inject, ref, computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAdmin } from '../utils/admin.js'

const { user, isAdmin } = useAdmin()
const activeMainNav = inject('activeMainNav')
const route = useRoute()

// State for collapsible sections
const isPriceGuideExpanded = ref(false)
const isShopManagerExpanded = ref(false)
const isCrateRewardsExpanded = ref(false)
const isDesignExpanded = ref(false)

// Computed properties for active states
const isPriceGuideActive = computed(() => {
	return (
		[
			'/admin',
			'/missing-items',
			'/add',
			'/bulk-update',
			'/recipes/import',
			'/recipes/manage',
			'/recipes/recalculate'
		].includes(route.path) || route.path.startsWith('/edit-recipe/')
	)
})

const isShopManagerActive = computed(() => {
	return ['/shop-manager', '/market-overview', '/shop-items', '/shops', '/servers'].includes(
		route.path
	)
})

const isCrateRewardsActive = computed(() => {
	return route.path === '/crate-rewards' || route.path.startsWith('/crate-rewards/')
})

const isDesignActive = computed(() => {
	return ['/design', '/styleguide', '/visual-gallery'].includes(route.path)
})

// Auto-expand the active section based on current route
const expandedSection = computed(() => {
	if (activeMainNav === 'admin') {
		// Determine which category should be expanded based on current route
		const currentPath = window.location.pathname

		// Price Guide routes
		if (
			[
				'/admin',
				'/missing-items',
				'/add',
				'/bulk-update',
				'/recipes/import',
				'/recipes/manage',
				'/recipes/recalculate'
			].includes(currentPath) ||
			currentPath.startsWith('/edit-recipe/')
		) {
			return 'price-guide'
		}
		// Shop Manager routes
		else if (
			['/shop-manager', '/market-overview', '/shop-items', '/shops', '/servers'].includes(
				currentPath
			)
		) {
			return 'shop-manager'
		}
		// Crate Rewards routes
		else if (currentPath === '/crate-rewards' || currentPath.startsWith('/crate-rewards/')) {
			return 'crate-rewards'
		}
		// Design routes
		else if (['/design', '/styleguide', '/visual-gallery'].includes(currentPath)) {
			return 'design'
		}
	}
	return null
})

// Watch for activeMainNav changes to auto-expand
watch(
	activeMainNav,
	(newSection) => {
		if (newSection === 'admin') {
			const currentPath = window.location.pathname

			// Reset all expansions
			isPriceGuideExpanded.value = false
			isShopManagerExpanded.value = false
			isCrateRewardsExpanded.value = false
			isDesignExpanded.value = false

			// Expand the appropriate section
			if (
				[
					'/admin',
					'/missing-items',
					'/add',
					'/bulk-update',
					'/recipes/import',
					'/recipes/manage',
					'/recipes/recalculate'
				].includes(currentPath) ||
				currentPath.startsWith('/edit-recipe/')
			) {
				isPriceGuideExpanded.value = true
			} else if (
				['/shop-manager', '/market-overview', '/shop-items', '/shops', '/servers'].includes(
					currentPath
				)
			) {
				isShopManagerExpanded.value = true
			} else if (
				currentPath === '/crate-rewards' ||
				currentPath.startsWith('/crate-rewards/')
			) {
				isCrateRewardsExpanded.value = true
			} else if (['/design', '/styleguide', '/visual-gallery'].includes(currentPath)) {
				isDesignExpanded.value = true
			}
		} else {
			// Collapse all when not in admin section
			isPriceGuideExpanded.value = false
			isShopManagerExpanded.value = false
			isCrateRewardsExpanded.value = false
			isDesignExpanded.value = false
		}
	},
	{ immediate: true }
)

function toggleSection(section) {
	if (section === 'price-guide') {
		isPriceGuideExpanded.value = !isPriceGuideExpanded.value
	} else if (section === 'shop-manager') {
		isShopManagerExpanded.value = !isShopManagerExpanded.value
	} else if (section === 'crate-rewards') {
		isCrateRewardsExpanded.value = !isCrateRewardsExpanded.value
	} else if (section === 'design') {
		isDesignExpanded.value = !isDesignExpanded.value
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
			<!-- Price Guide Section -->
			<button
				@click="toggleSection('price-guide')"
				class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors">
				<span class="font-medium">Price Guide</span>
				<span
					class="text-sm transition-transform"
					:class="{ 'rotate-180': isPriceGuideExpanded }">
					▼
				</span>
			</button>

			<!-- Price Guide Content -->
			<div v-show="isPriceGuideExpanded" class="border-t border-gray-600">
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/admin">
					Dashboard
				</RouterLink>
			</div>

			<!-- Shop Manager Section -->
			<button
				@click="toggleSection('shop-manager')"
				class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors">
				<span class="font-medium">Shop Manager</span>
				<span
					class="text-sm transition-transform"
					:class="{ 'rotate-180': isShopManagerExpanded }">
					▼
				</span>
			</button>

			<!-- Shop Manager Content -->
			<div v-show="isShopManagerExpanded" class="border-t border-gray-600">
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/shop-manager">
					Dashboard
				</RouterLink>
			</div>

			<!-- Crate Rewards Section -->
			<button
				@click="toggleSection('crate-rewards')"
				class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors">
				<span class="font-medium">Crate Rewards</span>
				<span
					class="text-sm transition-transform"
					:class="{ 'rotate-180': isCrateRewardsExpanded }">
					▼
				</span>
			</button>

			<!-- Crate Rewards Content -->
			<div v-show="isCrateRewardsExpanded" class="border-t border-gray-600">
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/crate-rewards">
					Dashboard
				</RouterLink>
			</div>

			<!-- Design Section -->
			<button
				@click="toggleSection('design')"
				class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors">
				<span class="font-medium">Design</span>
				<span
					class="text-sm transition-transform"
					:class="{ 'rotate-180': isDesignExpanded }">
					▼
				</span>
			</button>

			<!-- Design Content -->
			<div v-show="isDesignExpanded" class="border-t border-gray-600">
				<RouterLink
					class="block hover:bg-gray-600 px-6 py-2 transition-colors"
					active-class="bg-blue-600 text-white"
					to="/design">
					Dashboard
				</RouterLink>
			</div>

			<div class="px-6 py-2">
				<span class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
			</div>
		</div>

		<!-- Desktop: Horizontal layout -->
		<div class="hidden sm:flex gap-6 items-center px-4 py-2">
			<RouterLink
				class="hover:underline"
				:class="{ 'underline font-semibold': isPriceGuideActive }"
				to="/admin">
				Price Guide
			</RouterLink>
			<RouterLink
				class="hover:underline"
				:class="{ 'underline font-semibold': isShopManagerActive }"
				to="/shop-manager">
				Shop Manager
			</RouterLink>
			<RouterLink
				class="hover:underline"
				:class="{ 'underline font-semibold': isCrateRewardsActive }"
				to="/crate-rewards">
				Crate Rewards
			</RouterLink>
			<RouterLink
				class="hover:underline"
				:class="{ 'underline font-semibold': isDesignActive }"
				to="/design">
				Design
			</RouterLink>
			<div class="ml-auto">
				<span class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
			</div>
		</div>
	</nav>
</template>
