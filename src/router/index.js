import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { getCurrentUser } from 'vuefire'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	scrollBehavior(to, from, savedPosition) {
		// If there's a saved position (like when using browser back/forward), use it
		if (savedPosition) {
			return savedPosition
		}
		// Otherwise, scroll to top
		return { top: 0 }
	},
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView,
			meta: { title: "verzion's economy price guide for Minecraft" }
		},
		{
			path: '/about',
			name: 'about',
			component: () => import('../views/AboutView.vue'),
			meta: { title: "About - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/login',
			name: 'login',
			component: () => import('../views/LoginView.vue'),
			meta: { title: "Login - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/profile',
			name: 'profile',
			component: () => import('../views/ProfileView.vue'),
			meta: {
				requiresAuth: true,
				title: "Profile - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/add',
			name: 'add',
			component: () => import('../views/AddItemView.vue'),
			meta: {
				requiresAuth: true,
				title: "Add Item - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/edit/:id',
			name: 'edit',
			component: () => import('../views/EditItemView.vue'),
			meta: {
				requiresAuth: true,
				title: "Edit Item - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/missing-items',
			name: 'missing-items',
			component: () => import('../views/MissingItemsView.vue'),
			meta: {
				requiresAuth: true,
				title: "Missing Items - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/bulk-update',
			name: 'bulk-update',
			component: () => import('../views/BulkUpdateItemsView.vue'),
			meta: {
				requiresAuth: true,
				title: "Bulk Update - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/updates',
			name: 'updates',
			component: () => import('../views/UpdatesView.vue'),
			meta: { title: "Updates and Roadmap - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/privacy-policy',
			name: 'privacy-policy',
			component: () => import('../views/PrivacyPolicyView.vue'),
			meta: { title: "Privacy Policy - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/cookie-policy',
			name: 'cookie-policy',
			component: () => import('../views/CookiePolicyView.vue'),
			meta: { title: "Cookie Policy - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/terms-of-use',
			name: 'terms-of-use',
			component: () => import('../views/TermsOfUseView.vue'),
			meta: { title: "Terms of Use - verzion's economy price guide for Minecraft" }
		}
	]
})

router.beforeEach(async (to, from, next) => {
	// Update document title based on route meta
	if (to.meta.title) {
		document.title = to.meta.title
	}

	// Check authentication
	if (to.meta.requiresAuth) {
		const user = await getCurrentUser()
		if (!user) {
			return next({ path: '/login', query: { redirect: to.fullPath } })
		}
	}
	next()
})

export default router
