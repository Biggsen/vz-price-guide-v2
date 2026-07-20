/**
 * Google Analytics utility for consistent event tracking across the app
 */

/**
 * Check if Google Analytics is available
 * @returns {boolean}
 */
function isGAAvailable() {
	return typeof gtag !== 'undefined'
}

/**
 * Detect if the user is on mobile device
 * @returns {boolean}
 */
function isMobile() {
	return window.innerWidth < 640 // Tailwind's sm breakpoint
}

/**
 * Track a custom event with Google Analytics
 * @param {string} eventName - The name of the event
 * @param {Object} parameters - Event parameters
 */
export function trackEvent(eventName, parameters = {}) {
	if (isGAAvailable()) {
		// Add device type to all events
		const enhancedParameters = {
			...parameters,
			device_type: isMobile() ? 'mobile' : 'desktop'
		}
		gtag('event', eventName, enhancedParameters)
	}
}

/**
 * Track homepage interactions with a single rich event.
 * @param {string} action - The homepage action (category_click, export_open, etc.)
 * @param {Object} options - Additional tracking options
 */
export function trackHomepageInteraction(action, options = {}) {
	trackEvent('homepage_interaction', {
		action,
		...options
	})
}

/**
 * Track modal interactions with a single rich event.
 * @param {string} modal - Modal identifier (settings, export)
 * @param {string} action - Modal action (open, close, change, cta_click, export_click)
 * @param {Object} options - Additional tracking options
 */
export function trackModalInteraction(modal, action, options = {}) {
	trackEvent('modal_interaction', {
		modal,
		action,
		...options
	})
}

/**
 * Track search intent (GA4 recommended event name).
 * @param {string} searchTerm - The search term
 * @param {Object} options - Additional tracking options
 */
export function trackSearch(searchTerm, options = {}) {
	trackEvent('search', {
		search_term: searchTerm,
		...options
	})
}

/**
 * Track navigation clicks
 * @param {string} action - The navigation action (sign_in, sign_up, home, etc.)
 * @param {Object} options - Additional tracking options
 */
export function trackNavigation(action, options = {}) {
	trackEvent('navigation_click', {
		action,
		button_location: options.location || 'main_nav',
		user_status: options.userStatus || 'unknown',
		...options
	})
}

/**
 * Track authentication events
 * @param {string} action - The auth action (sign_in_click, sign_up_click, etc.)
 * @param {Object} options - Additional tracking options
 */
export function trackAuth(action, options = {}) {
	trackEvent(action, {
		button_location: options.location || 'main_nav',
		user_status: options.userStatus || 'not_logged_in',
		...options
	})
}

/**
 * Track item interactions
 * @param {string} action - The interaction action (item_click, item_view, etc.)
 * @param {Object} options - Additional tracking options
 */
export function trackItemInteraction(action, options = {}) {
	trackEvent(action, {
		item_name: options.itemName,
		minecraft_version: options.version,
		click_location: options.location || 'unknown',
		...options
	})
}

/**
 * Track button clicks
 * @param {string} buttonName - The name/identifier of the button
 * @param {Object} options - Additional tracking options
 */
export function trackButtonClick(buttonName, options = {}) {
	trackEvent('button_click', {
		button_name: buttonName,
		button_location: options.location || 'unknown',
		...options
	})
}

/**
 * Track table interactions (sorting, filtering, etc.)
 * @param {string} action - The table action (sort, filter, etc.)
 * @param {Object} options - Additional tracking options
 */
export function trackTableInteraction(action, options = {}) {
	trackEvent('table_interaction', {
		action,
		table_type: options.tableType || 'unknown',
		column: options.column,
		direction: options.direction,
		...options
	})
}

/**
 * Track export actions
 * @param {string} format - The export format (JSON, YAML, etc.)
 * @param {Object} options - Additional tracking options
 */
export function trackExport(format, options = {}) {
	trackEvent('export_data', {
		export_format: format,
		export_location: options.location || 'unknown',
		item_count: options.itemCount,
		...options
	})
}

/**
 * Track page views (SPA-friendly).
 * @param {Object} options - Tracking options
 */
export function trackPageView(options = {}) {
	trackEvent('page_view', {
		page_location: window.location.href,
		...options
	})
}

/**
 * Map stored shop pricing type to GA4 pricing_type param.
 * @param {string} storedType - Storage value: base | manual | from_recipe
 * @returns {'base'|'custom'|'recipe'}
 */
export function mapPricingTypeForAnalytics(storedType) {
	if (storedType === 'from_recipe') return 'recipe'
	if (storedType === 'base') return 'base'
	return 'custom'
}

/**
 * Track successful Admin Shop creation.
 * @param {Object} options
 * @param {string} [options.minecraft_version]
 * @param {boolean} [options.user_manages_server]
 */
export function trackAdminShopCreated(options = {}) {
	trackEvent('admin_shop_created', {
		minecraft_version: options.minecraft_version,
		user_manages_server: options.user_manages_server
	})
}

/**
 * Track successful Admin Shop import.
 * @param {Object} options
 * @param {number} options.items_imported
 * @param {string} options.import_source - economyshopgui | vz
 * @param {number} [options.duration_ms]
 */
export function trackAdminShopImport(options = {}) {
	const params = {
		items_imported: options.items_imported,
		import_source: options.import_source
	}
	if (options.duration_ms != null) {
		params.duration_ms = options.duration_ms
	}
	trackEvent('admin_shop_import', params)
}

/**
 * Track successful Admin Shop export.
 * @param {Object} options
 * @param {string} options.format - json | yaml | economyshopgui_zip
 * @param {number} options.items_exported
 * @param {string} [options.minecraft_version]
 */
export function trackAdminShopExport(options = {}) {
	trackEvent('admin_shop_export', {
		format: options.format,
		items_exported: options.items_exported,
		minecraft_version: options.minecraft_version
	})
}

/**
 * Track successful Admin Shop item save (form edit, inline price, pricing switch).
 * @param {Object} options
 * @param {'base'|'custom'|'recipe'|string} options.pricing_type
 */
export function trackAdminShopItemUpdated(options = {}) {
	trackEvent('admin_shop_item_updated', {
		pricing_type: options.pricing_type
	})
}

/**
 * Track successful Admin Shop recipe price recalculation.
 * @param {Object} options
 * @param {number} options.items_changed
 */
export function trackAdminShopRecalculate(options = {}) {
	trackEvent('admin_shop_recalculate', {
		items_changed: options.items_changed
	})
}

/**
 * Navigation click handlers for consistent tracking
 */
export const navigationHandlers = {
	/**
	 * Handle Sign In click (mobile)
	 * @param {Function} closeMenu - Function to close mobile menu
	 */
	signInMobile(closeMenu) {
		trackAuth('sign_in_click', {
			location: 'main_nav_mobile',
			userStatus: 'not_logged_in'
		})
		if (closeMenu) closeMenu()
	},

	/**
	 * Handle Sign Up click (mobile)
	 * @param {Function} closeMenu - Function to close mobile menu
	 */
	signUpMobile(closeMenu) {
		trackAuth('sign_up_click', {
			location: 'main_nav_mobile',
			userStatus: 'not_logged_in'
		})
		if (closeMenu) closeMenu()
	},

	/**
	 * Handle Sign In click (desktop)
	 */
	signInDesktop() {
		trackAuth('sign_in_click', {
			location: 'main_nav_desktop',
			userStatus: 'not_logged_in'
		})
	},

	/**
	 * Handle Sign Up click (desktop)
	 */
	signUpDesktop() {
		trackAuth('sign_up_click', {
			location: 'main_nav_desktop',
			userStatus: 'not_logged_in'
		})
	},

	/**
	 * Handle navigation link clicks
	 * @param {string} linkName - Name of the navigation link
	 * @param {Object} options - Additional options
	 */
	navigationLink(linkName, options = {}) {
		trackNavigation('link_click', {
			link_name: linkName,
			location: options.location || 'main_nav',
			...options
		})
	},

	/**
	 * Handle logo clicks
	 * @param {Object} options - Additional options
	 */
	logoClick(options = {}) {
		trackEvent('logo_click', {
			location: 'main_nav',
			...options
		})
	},

	/**
	 * Handle menu toggle clicks
	 * @param {boolean} isOpen - Whether menu is opening or closing
	 */
	menuToggle(isOpen) {
		trackEvent('menu_toggle', {
			action: isOpen ? 'open' : 'close',
			location: 'main_nav_mobile'
		})
	}
}
