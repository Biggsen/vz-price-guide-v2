<script setup>
import { ref, watch, provide } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import HeaderBanner from './components/HeaderBanner.vue'
import Nav from './components/Nav.vue'
import SubNav from './components/SubNav.vue'
import Footer from './components/Footer.vue'
import { useAdmin } from './utils/admin.js'

const route = useRoute()
const { isAdmin } = useAdmin()

// Navigation state for subnav
const activeMainNav = ref(null)

// Determine active main nav based on current route
function updateActiveMainNav() {
	const adminRoutes = ['/admin', '/missing-items', '/add', '/bulk-update', '/styleguide']
	const shopManagerRoutes = [
		'/shop-manager',
		'/servers',
		'/shops',
		'/shop-items',
		'/market-overview'
	]
	const recipeRoutes = ['/recipes', '/recipes/import', '/recipes/manage', '/recipes/recalculate']

	if (adminRoutes.includes(route.path)) {
		activeMainNav.value = 'admin'
	} else if (shopManagerRoutes.includes(route.path)) {
		activeMainNav.value = 'shop-manager'
	} else if (recipeRoutes.includes(route.path) || route.path.startsWith('/edit-recipe/')) {
		activeMainNav.value = 'recipes'
	} else {
		activeMainNav.value = null
	}
}

// Watch route changes to update active main nav
watch(route, updateActiveMainNav, { immediate: true })

// Provide the active main nav to child components
provide('activeMainNav', activeMainNav)

// Functions to set active main nav
function setActiveMainNav(section) {
	activeMainNav.value = section
}
</script>

<template>
	<div class="min-h-screen flex flex-col">
		<header>
			<HeaderBanner />
			<Nav :activeMainNav="activeMainNav" @setActiveMainNav="setActiveMainNav" />
			<SubNav />
		</header>

		<main class="flex-1 sm:pt-0 pt-16">
			<RouterView />
		</main>

		<Footer />
	</div>
</template>
