<script setup>
import { inject } from 'vue'
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'

const { user, isAdmin, canViewMissingItems, canAddItems, canBulkUpdate } = useAdmin()
const activeMainNav = inject('activeMainNav')
</script>

<template>
	<!-- Admin Subnav -->
	<nav
		v-if="activeMainNav === 'admin' && isAdmin"
		class="bg-gray-700 text-white px-4 py-2 flex gap-4 items-center border-t border-gray-600">
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
		<RouterLink v-if="canAddItems" class="hover:underline" active-class="underline" to="/add">
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
	</nav>

	<!-- Recipes Subnav -->
	<nav
		v-if="activeMainNav === 'recipes' && isAdmin"
		class="bg-gray-700 text-white px-4 py-2 flex gap-4 items-center border-t border-gray-600">
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
	</nav>

	<!-- Shop Manager Subnav -->
	<nav
		v-if="activeMainNav === 'shop-manager' && user?.email"
		class="bg-gray-700 text-white px-4 py-2 flex gap-4 items-center border-t border-gray-600">
		<RouterLink class="hover:underline" active-class="underline" to="/shop-manager">
			Dashboard
		</RouterLink>
		<RouterLink class="hover:underline" active-class="underline" to="/market-overview">
			Market Overview
		</RouterLink>
		<RouterLink class="hover:underline" active-class="underline" to="/shop-items">
			Shop Items
		</RouterLink>
		<RouterLink class="hover:underline" active-class="underline" to="/shops">Shops</RouterLink>
		<RouterLink class="hover:underline" active-class="underline" to="/servers">
			Servers
		</RouterLink>
	</nav>
</template>
