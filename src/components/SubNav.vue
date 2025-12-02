<script setup>
import { inject, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAdmin } from '../utils/admin.js'

const { user, isAdmin } = useAdmin()
const activeMainNav = inject('activeMainNav')
const route = useRoute()

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
	return (
		['/shop-manager', '/market-overview', '/shop'].includes(route.path) ||
		route.path.startsWith('/shop/')
	)
})

const isDesignActive = computed(() => {
	return ['/design', '/styleguide', '/visual-gallery'].includes(route.path)
})

const isCommunityActive = computed(() => {
	return ['/admin/community', '/admin/suggestions'].includes(route.path)
})

const isToolsActive = computed(() => {
	return (
		route.path === '/tools' ||
		route.path === '/crate-rewards' ||
		route.path.startsWith('/crate-rewards/')
	)
})

</script>

<template>
	<!-- Admin Subnav (Desktop Only) -->
	<nav
		v-if="activeMainNav === 'admin' && isAdmin"
		class="bg-gray-700 text-white border-t border-gray-600 hidden sm:block">
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
				:class="{ 'underline font-semibold': isCommunityActive }"
				to="/admin/community">
				Community
			</RouterLink>
			<RouterLink
				class="hover:underline"
				:class="{ 'underline font-semibold': isDesignActive }"
				to="/design">
				Design
			</RouterLink>
			<RouterLink
				class="hover:underline"
				:class="{ 'underline font-semibold': route.path === '/admin/access' }"
				to="/admin/access">
				Access
			</RouterLink>
			<div class="ml-auto">
				<span class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
			</div>
		</div>
	</nav>

	<!-- Tools Subnav (Desktop Only) -->
	<nav
		v-if="activeMainNav === 'tools' && user?.email"
		class="bg-gray-700 text-white border-t border-gray-600 hidden sm:block">
		<!-- Desktop: Horizontal layout -->
		<div class="hidden sm:flex gap-6 items-center px-4 py-2">
			<RouterLink
				class="hover:underline"
				:class="{ 'underline font-semibold': route.path === '/tools' }"
				to="/tools">
				Tools
			</RouterLink>
			<RouterLink
				class="hover:underline"
				:class="{ 'underline font-semibold': isToolsActive && route.path !== '/tools' }"
				to="/crate-rewards">
				Crate Rewards
			</RouterLink>
		</div>
	</nav>
</template>
