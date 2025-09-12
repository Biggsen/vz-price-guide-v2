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
 * Track page views (for custom page tracking if needed)
 * @param {string} pageName - The name of the page
 * @param {Object} options - Additional tracking options
 */
export function trackPageView(pageName, options = {}) {
	trackEvent('page_view', {
		page_name: pageName,
		...options
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
