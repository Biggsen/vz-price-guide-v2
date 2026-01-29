import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { getCurrentUser } from 'vuefire'
import { isAdmin } from '../constants'
import { trackPageView } from '../utils/analytics.js'

const siteName = "verzion's economy price guide for Minecraft"

const defaultSeo = {
	title: siteName,
	description:
		'Comprehensive, searchable and exportable Minecraft economy price guide with unit and stack prices for over 1600 items from versions 1.16-1.21',
	keywords:
		'minecraft, price guide, economy, items, unit price, stack price, minecraft server economy, ores, stone, brick, copper, earth, sand, wood, drops, food, utility, light, plants, redstone, tools, weapons, armor, enchantments, ocean, nether, end, deep dark, archaeology, ice, dyed, discs',
	ogImage: 'https://minecraft-economy-price-guide.net/cube.png',
	ogUrl: 'https://minecraft-economy-price-guide.net'
}

function setMetaTag(name, content) {
	if (!content) return

	let tag = document.head.querySelector(`meta[name="${name}"]`)

	if (!tag) {
		tag = document.createElement('meta')
		tag.setAttribute('name', name)
		document.head.appendChild(tag)
	}

	tag.setAttribute('content', content)
}

function setPropertyMeta(property, content) {
	if (!content) return

	let tag = document.head.querySelector(`meta[property="${property}"]`)

	if (!tag) {
		tag = document.createElement('meta')
		tag.setAttribute('property', property)
		document.head.appendChild(tag)
	}

	tag.setAttribute('content', content)
}

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
			meta: {
				title: siteName
			}
		},

		{
			path: '/signin',
			name: 'signin',
			component: () => import('../views/SignInView.vue'),
			meta: {
				title: `Sign In - ${siteName}`,
				description: `Access your ${siteName} account.`,
				noindex: true
			}
		},
		{
			path: '/signup',
			name: 'signup',
			component: () => import('../views/SignUpView.vue'),
			meta: {
				title: `Create Account - ${siteName}`,
				description: `Create an account on ${siteName} to export the price guide or make suggestions.`,
				noindex: true
			}
		},
		{
			path: '/verify-email',
			name: 'verify-email',
			component: () => import('../views/VerifyEmailView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: false,
				title: `Verify Email - ${siteName}`,
				description: `Confirm your email so you can keep on using ${siteName}.`,
				noindex: true
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
			meta: {
				title: `Account Action - ${siteName}`,
				noindex: true
			}
		},
		{
			path: '/verify-email-success',
			name: 'verify-email-success',
			component: () => import('../views/VerifyEmailSuccessView.vue'),
			meta: {
				title: `Email Verified - ${siteName}`,
				description: `Your email is verified. You can now enjoy full access to ${siteName}.`,
				noindex: true
			}
		},
		{
			path: '/export-success',
			name: 'export-success',
			component: () => import('../views/ExportSuccessView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: `Export Complete - ${siteName}`,
				noindex: true
			}
		},
		{
			path: '/reset-password',
			name: 'reset-password',
			component: () => import('../views/ResetPasswordView.vue'),
			meta: {
				title: `Reset Password - ${siteName}`,
				description: `Start a secure password reset to regain access to your ${siteName} account.`,
				noindex: true
			}
		},
		{
			path: '/reset-password-confirm',
			name: 'reset-password-confirm',
			component: () => import('../views/ResetPasswordConfirmView.vue'),
			meta: {
				title: `Reset Password - ${siteName}`,
				description: `Choose a new password and restore access to your ${siteName} account.`,
				noindex: true
			}
		},
		{
			path: '/account',
			name: 'account',
			component: () => import('../views/AccountView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: false,
				title: `Account - ${siteName}`,
				noindex: true
			}
		},
		{
			path: '/change-password',
			name: 'change-password',
			component: () => import('../views/ChangePasswordView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: false,
				title: `Change Password - ${siteName}`,
				noindex: true
			}
		},
		{
			path: '/admin',
			name: 'admin',
			component: () => import('../views/AdminView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Admin Dashboard - ${siteName}`
			}
		},
		{
			path: '/shop-manager',
			name: 'shop-manager',
			component: () => import('../views/ShopManagerView.vue'),
			meta: {
				title: `Shop Manager - ${siteName}`,
				description:
					'Manage your Minecraft shops across multiple servers. Track buy and sell prices, stock status, and shop inventory without spreadsheets.'
			}
		},
		{
			path: '/add',
			name: 'add',
			component: () => import('../views/AddItemView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Add Item - ${siteName}`
			}
		},
		{
			path: '/edit/:id',
			name: 'edit',
			component: () => import('../views/EditItemView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Edit Item - ${siteName}`
			}
		},
		{
			path: '/missing-items',
			name: 'missing-items',
			component: () => import('../views/MissingItemsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Missing Items - ${siteName}`
			}
		},
		{
			path: '/bulk-update',
			name: 'bulk-update',
			component: () => import('../views/BulkUpdateItemsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Bulk Update - ${siteName}`
			}
		},
		{
			path: '/shop/:shopId?',
			name: 'shop',
			component: () => import('../views/ShopItemsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: `Shop Items - ${siteName}`,
				description:
					'View and manage items for your shop. Set buy and sell prices, track stock, and update inventory with inline editing.'
			}
		},
		{
			path: '/market-overview',
			name: 'market-overview',
			component: () => import('../views/MarketOverviewView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: `Market Overview - ${siteName}`,
				description:
					'Browse and compare prices across all shops on a server. Find the best deals and spot profitable trading opportunities at a glance.'
			}
		},
		{
			path: '/recipes',
			name: 'recipes',
			redirect: '/recipes/import',
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true
			}
		},
		{
			path: '/recipes/import',
			name: 'recipes-import',
			component: () => import('../views/recipes/RecipeImportView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Import Recipes - ${siteName}`
			}
		},
		{
			path: '/recipes/manage',
			name: 'recipes-manage',
			component: () => import('../views/recipes/RecipeManageView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Manage Recipes - ${siteName}`
			}
		},
		{
			path: '/recipes/recalculate',
			name: 'recipes-recalculate',
			component: () => import('../views/recipes/RecipeRecalculateView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Recalculate Prices - ${siteName}`
			}
		},
		{
			path: '/edit-recipe/:id',
			name: 'edit-recipe',
			component: () => import('../views/EditRecipeView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Edit Recipe - ${siteName}`
			}
		},
		{
			path: '/tools',
			name: 'tools',
			component: () => import('../views/ToolsView.vue'),
			meta: {
				title: "Tools - verzion's economy price guide for Minecraft",
				description:
					'A growing list of tools and utilities verzion has built to set up and run his own Minecraft servers.'
			}
		},
		{
			path: '/updates',
			name: 'updates',
			component: () => import('../views/UpdatesView.vue'),
			meta: {
				title: `Updates and Roadmap - ${siteName}`,
				description: `Read release notes and roadmap updates to stay current on ${siteName}.`
			}
		},
		{
			path: '/privacy-policy',
			name: 'privacy-policy',
			component: () => import('../views/PrivacyPolicyView.vue'),
			meta: {
				title: `Privacy Policy - ${siteName}`,
				description:
					'This policy explains what information we collect, how we use it, and the privacy choices available to you.'
			}
		},
		{
			path: '/cookie-policy',
			name: 'cookie-policy',
			component: () => import('../views/CookiePolicyView.vue'),
			meta: {
				title: `Cookie Policy - ${siteName}`,
				description:
					'This policy outlines the cookies we use, why we use them, and how you can manage your preferences.'
			}
		},
		{
			path: '/terms-of-use',
			name: 'terms-of-use',
			component: () => import('../views/TermsOfUseView.vue'),
			meta: {
				title: `Terms of Use - ${siteName}`,
				description: `Understand the rules and responsibilities for using ${siteName}.`
			}
		},
		{
			path: '/design',
			name: 'design',
			component: () => import('../views/DesignView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Design Dashboard - ${siteName}`
			}
		},
		{
			path: '/styleguide',
			name: 'styleguide',
			component: () => import('../views/StyleguideView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Design System & Styleguide - ${siteName}`
			}
		},
		{
			path: '/visual-gallery',
			name: 'visual-gallery',
			component: () => import('../views/VisualGalleryView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Visual Gallery - ${siteName}`
			}
		},
		{
			path: '/restricted',
			name: 'RestrictedAccess',
			component: () => import('../views/RestrictedAccessView.vue'),
			meta: {
				title: `Restricted Access - ${siteName}`,
				description:
					'This area requires elevated permissions or a verified account before you can continue.'
			}
		},
		{
			path: '/suggestions',
			name: 'suggestions',
			component: () => import('../views/SuggestionsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: false,
				title: `Suggestions - ${siteName}`
			}
		},
		{
			path: '/admin/community',
			name: 'admin-community',
			component: () => import('../views/CommunityView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Community Dashboard - ${siteName}`
			}
		},
		{
			path: '/admin/suggestions',
			name: 'admin-suggestions',
			component: () => import('../views/SuggestionsAdminView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Admin Suggestions - ${siteName}`
			}
		},
		{
			path: '/admin/access',
			name: 'admin-access',
			component: () => import('../views/AccessManagementView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Access Management - ${siteName}`
			}
		},
		{
			path: '/admin/reports',
			name: 'admin-reports',
			component: () => import('../views/ReportsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Reports - ${siteName}`
			}
		},
		{
			path: '/admin/reports/shop-manager',
			name: 'admin-reports-shop-manager',
			component: () => import('../views/ShopManagerStatsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Shop Manager Statistics - ${siteName}`
			}
		},
		{
			path: '/admin/enchantments/migrate-items',
			name: 'enchantments-migrate-items',
			component: () => import('../views/enchantments/MigrateItemsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Migrate Enchantment Categories - ${siteName}`
			}
		},
		{
			path: '/admin/enchantments/migrate-books',
			name: 'enchantments-migrate-books',
			component: () => import('../views/enchantments/MigrateBooksView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Migrate Enchantment Metadata - ${siteName}`
			}
		},
		{
			path: '/admin/enchantments/manage',
			name: 'enchantments-manage',
			component: () => import('../views/enchantments/ManageEnchantableItemsView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `Manage Enchantable Items - ${siteName}`
			}
		},
		{
			path: '/crate-rewards',
			name: 'crate-rewards',
			component: () => import('../views/CrateRewardManagerView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: `Crate Rewards - ${siteName}`
			}
		},
		{
			path: '/crate-rewards/:id',
			name: 'crate-reward-detail',
			component: () => import('../views/CrateSingleView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				title: `Manage Crate Reward - ${siteName}`
			}
		},
		{
			path: '/dev/yaml-import',
			name: 'yaml-import-dev',
			component: () => import('../views/YamlImportDevView.vue'),
			meta: {
				requiresAuth: true,
				requiresVerification: true,
				requiresAdmin: true,
				title: `YAML Import Dev - ${siteName}`
			}
		},
		{
			path: '/:pathMatch(.*)*',
			name: 'not-found',
			component: () => import('../views/NotFoundView.vue'),
			meta: {
				title: `Page Not Found - ${siteName}`,
				description: `The page you requested is missing. Return to ${siteName}.`
			}
		}
	]
})

// SPA page view tracking for real navigation (path changes only).
// We skip the initial navigation because GA4 already records the first page load via gtag config.
let hasTrackedInitialPageView = false
router.afterEach((to, from) => {
	if (!hasTrackedInitialPageView) {
		hasTrackedInitialPageView = true
		return
	}

	// Avoid treating query-only updates (filters) as full page views
	if (to.path === from.path) return

	trackPageView({
		page_path: to.path,
		page_title: document.title
	})
})

router.beforeEach(async (to, from, next) => {
	const seo = {
		...defaultSeo,
		...to.meta
	}

	document.title = seo.title

	setMetaTag('description', seo.description)
	setMetaTag('keywords', seo.keywords)

	if (seo.noindex) {
		setMetaTag('robots', 'noindex')
	} else {
		// Remove noindex if it was previously set
		const robotsTag = document.head.querySelector('meta[name="robots"]')
		if (robotsTag && robotsTag.getAttribute('content') === 'noindex') {
			robotsTag.remove()
		}
	}

	setPropertyMeta('og:title', seo.ogTitle || seo.title)
	setPropertyMeta('og:description', seo.ogDescription || seo.description)
	setPropertyMeta('og:image', seo.ogImage)
	setPropertyMeta('og:url', seo.ogUrl)

	const authPages = ['signin', 'signup', 'reset-password']
	const user = await getCurrentUser()

	// Redirect signed-in users away from auth pages
	if (user && authPages.includes(to.name)) {
		return next({ path: '/account' })
	}

	// Check authentication
	if (to.meta.requiresAuth) {
		if (!user) {
			return next({ path: '/signin', query: { redirect: to.fullPath } })
		}

		// Check email verification for routes that require it
		if (to.meta.requiresVerification !== false && !user.emailVerified) {
			return next({ path: '/verify-email' })
		}

		// Admin route protection
		if (to.meta.requiresAdmin) {
			const admin = await isAdmin(user)
			if (!admin) {
				return next({ path: '/restricted' })
			}
		}
	}
	next()
})

export default router
