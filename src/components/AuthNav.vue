<script setup>
import { RouterLink } from 'vue-router'
import { useAdmin } from '../utils/admin.js'

const { user, isAdmin, canViewMissingItems, canAddItems, canBulkUpdate } = useAdmin()
</script>

<template>
	<nav
		v-if="user?.email"
		class="bg-gray-700 text-white px-4 py-2 flex gap-4 items-center border-t border-gray-600">
		<RouterLink v-if="canViewMissingItems" class="hover:underline" to="/missing-items">
			Missing Items
		</RouterLink>
		<RouterLink v-if="canAddItems" class="hover:underline" to="/add">Add Item</RouterLink>
		<RouterLink v-if="canBulkUpdate" class="hover:underline" to="/bulk-update">
			Bulk Update
		</RouterLink>
		<div class="ml-auto">
			<span v-if="isAdmin" class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
		</div>
	</nav>
</template>
