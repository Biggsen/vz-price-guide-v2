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
		// If only the query parameters changed (same path), preserve scroll position
		if (to.path === from.path) {
			return false // Don't scroll
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
			path: '/signin',
			name: 'signin',
			component: () => import('../views/SignInView.vue'),
			meta: { title: "Sign In - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/signup',
			name: 'signup',
			component: () => import('../views/SignUpView.vue'),
			meta: { title: "Create Account - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/verify-email',
			name: 'verify-email',
			component: () => import('../views/VerifyEmailView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: false,
				title: "Verify Email - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/auth-action',
			name: 'auth-action',
			beforeEnter: (to, from, next) => {
				const mode = to.query.mode
				if (mode === 'resetPassword') {
					next({ path: '/reset-password-confirm', query: to.query })
				} else if (mode === 'verifyEmail') {
					next({ path: '/verify-email-success', query: to.query })
				} else {
					next({ path: '/' })
				}
			},
			meta: { title: "Account Action - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/verify-email-success',
			name: 'verify-email-success',
			component: () => import('../views/VerifyEmailSuccessView.vue'),
			meta: {
				title: "Email Verified - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/reset-password',
			name: 'reset-password',
			component: () => import('../views/ResetPasswordView.vue'),
			meta: { title: "Reset Password - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/reset-password-confirm',
			name: 'reset-password-confirm',
			component: () => import('../views/ResetPasswordConfirmView.vue'),
			meta: { title: "Reset Password - verzion's economy price guide for Minecraft" }
		},
		{
			path: '/profile',
			name: 'profile',
			component: () => import('../views/ProfileView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: false,
				title: "Profile - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/change-password',
			name: 'change-password',
			component: () => import('../views/ChangePasswordView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Change Password - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/admin',
			name: 'admin',
			component: () => import('../views/AdminView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Admin Dashboard - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/shop-manager',
			name: 'shop-manager',
			component: () => import('../views/ShopManagerView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Shop Manager - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/add',
			name: 'add',
			component: () => import('../views/AddItemView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Add Item - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/edit/:id',
			name: 'edit',
			component: () => import('../views/EditItemView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Edit Item - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/missing-items',
			name: 'missing-items',
			component: () => import('../views/MissingItemsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Missing Items - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/bulk-update',
			name: 'bulk-update',
			component: () => import('../views/BulkUpdateItemsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Bulk Update - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/servers',
			name: 'servers',
			component: () => import('../views/ServersView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "My Servers - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/shops',
			name: 'shops',
			component: () => import('../views/ShopsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "My Shops - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/shop-items',
			name: 'shop-items',
			component: () => import('../views/ShopItemsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Shop Items - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/market-overview',
			name: 'market-overview',
			component: () => import('../views/MarketOverviewView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Market Overview - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/recipes',
			name: 'recipes',
			redirect: '/recipes/import'
		},
		{
			path: '/recipes/import',
			name: 'recipes-import',
			component: () => import('../views/recipes/RecipeImportView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Import Recipes - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/recipes/manage',
			name: 'recipes-manage',
			component: () => import('../views/recipes/RecipeManageView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Manage Recipes - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/recipes/recalculate',
			name: 'recipes-recalculate',
			component: () => import('../views/recipes/RecipeRecalculateView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Recalculate Prices - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/edit-recipe/:id',
			name: 'edit-recipe',
			component: () => import('../views/EditRecipeView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Edit Recipe - verzion's economy price guide for Minecraft"
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
		},
		{
			path: '/styleguide',
			name: 'styleguide',
			component: () => import('../views/StyleguideView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: "Design System & Styleguide - verzion's economy price guide for Minecraft"
			}
		},
		{
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: () => import('../views/NotFoundView.vue'),
			meta: { title: "Page Not Found - verzion's economy price guide for Minecraft" }
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
			return next({ path: '/signin', query: { redirect: to.fullPath } })
		}

		// Check email verification for routes that require it
		if (to.meta.requiresVerification !== false && !user.emailVerified) {
			return next({ path: '/verify-email' })
		}
	}
	next()
})

export default router
