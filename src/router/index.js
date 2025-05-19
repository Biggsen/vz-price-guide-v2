import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { getCurrentUser } from 'vuefire'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView
		},
		{
			path: '/about',
			name: 'about',
			component: () => import('../views/AboutView.vue')
		},
		{
			path: '/login',
			name: 'login',
			component: () => import('../views/LoginView.vue')
		},
		{
			path: '/add',
			name: 'add',
			component: () => import('../views/AddItemView.vue'),
			meta: { requiresAuth: true }
		},
		{
			path: '/edit/:id',
			name: 'edit',
			component: () => import('../views/EditItemView.vue'),
			meta: { requiresAuth: true }
		},
		{
			path: '/missing-items',
			name: 'missing-items',
			component: () => import('../views/MissingItemsView.vue'),
			meta: { requiresAuth: true }
		},
		{
			path: '/bulk-update',
			name: 'bulk-update',
			component: () => import('../views/BulkUpdateItemsView.vue'),
			meta: { requiresAuth: true }
		}
	]
})

router.beforeEach(async (to, from, next) => {
	if (to.meta.requiresAuth) {
		const user = await getCurrentUser()
		if (!user) {
			return next({ path: '/login', query: { redirect: to.fullPath } })
		}
	}
	next()
})

export default router
