// src/screenshot-metadata.js
// This file maps screenshot names to their corresponding Vue view files
// Used by the visual gallery to show which component/view each screenshot represents

export const screenshotToViewMap = {
	// Public Pages
	'home-default': {
		viewFile: 'src/views/HomeView.vue',
		route: '/',
		type: 'page',
		description: 'Main homepage with all categories visible'
	},
	'home-list-view': {
		viewFile: 'src/views/HomeView.vue',
		route: '/',
		type: 'page',
		description: 'Homepage in list view mode'
	},
	'home-compact-layout': {
		viewFile: 'src/views/HomeView.vue',
		route: '/',
		type: 'page',
		description: 'Homepage in compact layout mode'
	},
	'home-mobile': {
		viewFile: 'src/views/HomeView.vue',
		route: '/',
		type: 'responsive',
		viewport: '375x667',
		description: 'Homepage optimized for mobile devices'
	},
	'home-tablet': {
		viewFile: 'src/views/HomeView.vue',
		route: '/',
		type: 'responsive',
		viewport: '768x1024',
		description: 'Homepage optimized for tablet devices'
	},
	'home-large-desktop': {
		viewFile: 'src/views/HomeView.vue',
		route: '/',
		type: 'responsive',
		viewport: '1440x900',
		description: 'Homepage on large desktop screens'
	},
	'signin-default': {
		viewFile: 'src/views/SignInView.vue',
		route: '/signin',
		type: 'page',
		description: 'User authentication sign-in form'
	},
	'signup-default': {
		viewFile: 'src/views/SignUpView.vue',
		route: '/signup',
		type: 'page',
		description: 'New user registration form'
	},
	'reset-password-default': {
		viewFile: 'src/views/ResetPasswordView.vue',
		route: '/reset-password',
		type: 'page',
		description: 'Password reset request form'
	},
	'updates-default': {
		viewFile: 'src/views/UpdatesView.vue',
		route: '/updates',
		type: 'page',
		description: 'Application updates and changelog'
	},
	'privacy-policy-default': {
		viewFile: 'src/views/PrivacyPolicyView.vue',
		route: '/privacy-policy',
		type: 'page',
		description: 'Privacy policy and data handling information'
	},
	'cookie-policy-default': {
		viewFile: 'src/views/CookiePolicyView.vue',
		route: '/cookie-policy',
		type: 'page',
		description: 'Cookie usage policy and preferences'
	},
	'terms-of-use-default': {
		viewFile: 'src/views/TermsOfUseView.vue',
		route: '/terms-of-use',
		type: 'page',
		description: 'Terms of service and usage agreement'
	},
	'404-default': {
		viewFile: 'src/views/NotFoundView.vue',
		route: '/non-existent-page',
		type: 'error',
		description: '404 Not Found error page'
	},

	// Authentication Flow
	'verify-email-default': {
		viewFile: 'src/views/VerifyEmailView.vue',
		route: '/verify-email',
		type: 'auth',
		description: 'Email verification prompt for unverified users'
	},
	'verify-email-success-error': {
		viewFile: 'src/views/VerifyEmailSuccessView.vue',
		route: '/verify-email-success',
		type: 'auth',
		description: 'Email verification error state'
	},
	'reset-password-confirm-form': {
		viewFile: 'src/views/ResetPasswordConfirmView.vue',
		route: '/reset-password-confirm',
		type: 'auth',
		description: 'Password reset confirmation form with valid code'
	},
	'reset-password-confirm-error': {
		viewFile: 'src/views/ResetPasswordConfirmView.vue',
		route: '/reset-password-confirm',
		type: 'auth',
		description: 'Password reset error state with invalid link'
	},

	// Authenticated User Pages
	'account-default': {
		viewFile: 'src/views/AccountView.vue',
		route: '/account',
		type: 'user',
		description: 'User account page with profile information'
	},
	'account-edit-profile': {
		viewFile: 'src/views/AccountView.vue',
		route: '/account',
		type: 'user',
		description: 'Account page in profile editing mode'
	},
	'account-unverified': {
		viewFile: 'src/views/AccountView.vue',
		route: '/account',
		type: 'user',
		description: 'Account page for unverified user without profile'
	},
	'change-password-default': {
		viewFile: 'src/views/ChangePasswordView.vue',
		route: '/change-password',
		type: 'user',
		description: 'Password change form for authenticated users'
	},
	'suggestions-default': {
		viewFile: 'src/views/SuggestionsView.vue',
		route: '/suggestions',
		type: 'user',
		description: 'User suggestions submission form'
	},

	// Admin Pages
	'admin-default': {
		viewFile: 'src/views/AdminView.vue',
		route: '/admin',
		type: 'admin',
		description: 'Administrative dashboard interface'
	},
	'shop-manager-default': {
		viewFile: 'src/views/ShopManagerView.vue',
		route: '/shop-manager',
		type: 'admin',
		description: 'Shop management interface'
	},
	'add-item-default': {
		viewFile: 'src/views/AddItemView.vue',
		route: '/add',
		type: 'admin',
		description: 'Add new item form'
	},
	'missing-items-default': {
		viewFile: 'src/views/MissingItemsView.vue',
		route: '/missing-items',
		type: 'admin',
		description: 'Missing items report and management'
	},
	'bulk-update-default': {
		viewFile: 'src/views/BulkUpdateItemsView.vue',
		route: '/bulk-update',
		type: 'admin',
		description: 'Bulk item update interface'
	},
	'servers-default': {
		viewFile: 'src/views/ServersView.vue',
		route: '/servers',
		type: 'admin',
		description: 'Server management interface'
	},
	'shops-default': {
		viewFile: 'src/views/ShopsView.vue',
		route: '/shops',
		type: 'admin',
		description: 'Shop listing and management'
	},
	'shop-items-default': {
		viewFile: 'src/views/ShopItemsView.vue',
		route: '/shop-items',
		type: 'admin',
		description: 'Shop items management interface'
	},
	'market-overview-default': {
		viewFile: 'src/views/MarketOverviewView.vue',
		route: '/market-overview',
		type: 'admin',
		description: 'Market analysis and overview dashboard'
	},
	'recipes-import-default': {
		viewFile: 'src/views/recipes/ImportRecipesView.vue',
		route: '/recipes/import',
		type: 'admin',
		description: 'Recipe import interface'
	},
	'recipes-manage-default': {
		viewFile: 'src/views/recipes/ManageRecipesView.vue',
		route: '/recipes/manage',
		type: 'admin',
		description: 'Recipe management interface'
	},
	'recipes-recalculate-default': {
		viewFile: 'src/views/recipes/RecalculateRecipesView.vue',
		route: '/recipes/recalculate',
		type: 'admin',
		description: 'Recipe price recalculation interface'
	},
	'suggestions-admin-default': {
		viewFile: 'src/views/SuggestionsAdminView.vue',
		route: '/suggestions/all',
		type: 'admin',
		description: 'Admin interface for managing user suggestions'
	},
	'styleguide-default': {
		viewFile: 'src/views/StyleguideView.vue',
		route: '/styleguide',
		type: 'admin',
		description: 'Design system and component styleguide'
	},

	// Access Control
	'restricted-access-default': {
		viewFile: 'src/views/RestrictedAccessView.vue',
		route: '/admin',
		type: 'error',
		description: 'Access denied page for unauthorized users'
	},

	// Modals
	'settings-modal-default': {
		viewFile: 'src/components/SettingsModal.vue',
		route: '/',
		type: 'modal',
		description: 'Application settings modal dialog'
	},
	'export-modal-default': {
		viewFile: 'src/components/ExportModal.vue',
		route: '/',
		type: 'modal',
		description: 'Data export modal dialog'
	}
}

// Helper functions for the visual gallery
export function getViewFileForScreenshot(screenshotName) {
	return screenshotToViewMap[screenshotName]?.viewFile || 'Unknown'
}

export function getScreenshotsForView(viewFile) {
	return Object.entries(screenshotToViewMap)
		.filter(([screenshot, metadata]) => metadata.viewFile === viewFile)
		.map(([screenshot]) => screenshot)
}

export function getScreenshotsByType(type) {
	return Object.entries(screenshotToViewMap)
		.filter(([screenshot, metadata]) => metadata.type === type)
		.map(([screenshot, metadata]) => ({
			name: screenshot,
			...metadata
		}))
}

export function getScreenshotMetadata(screenshotName) {
	return screenshotToViewMap[screenshotName] || null
}
