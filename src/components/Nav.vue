<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useCurrentUser } from 'vuefire'
import {
	CubeIcon,
	Bars3Icon,
	XMarkIcon,
	ChevronRightIcon,
	ChevronDownIcon,
	UserIcon,
	ArrowRightEndOnRectangleIcon
} from '@heroicons/vue/24/solid'

import { useAdmin } from '../utils/admin.js'
import { userProfileExists } from '../utils/userProfile.js'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { navigationHandlers } from '../utils/analytics.js'

const props = defineProps({
	activeMainNav: {
		type: String,
		default: null
	}
})

const emit = defineEmits(['setActiveMainNav'])

const user = useCurrentUser()
const route = useRoute()
const router = useRouter()
const { isAdmin, canViewMissingItems, canAddItems, canBulkUpdate } = useAdmin()

// User profile state
const userProfile = ref(null)
const isMenuOpen = ref(false)

// Subnav expansion state
const expandedSections = ref(new Set())

// Auto-hiding header state
const isHeaderVisible = ref(true)
const lastScrollY = ref(0)

// Load user profile
async function loadUserProfile(userId) {
	if (!userId) return

	try {
		const exists = await userProfileExists(userId)
		if (exists) {
			const db = getFirestore()
			const docRef = doc(db, 'users', userId)
			const docSnap = await getDoc(docRef)

			if (docSnap.exists()) {
				userProfile.value = docSnap.data()
			}
		}
	} catch (error) {
		console.error('Error loading user profile:', error)
	}
}

// Watch for user changes
watch(
	user,
	async (newUser) => {
		if (newUser?.uid) {
			await loadUserProfile(newUser.uid)
		} else {
			userProfile.value = null
		}
	},
	{ immediate: true }
)

function handleLogoClick() {
	navigationHandlers.logoClick({
		current_page: route.path,
		action: route.path === '/' ? 'scroll_to_top' : 'navigate_home'
	})

	if (route.path === '/') {
		// Already on homepage - scroll to top
		window.scrollTo({ top: 0, behavior: 'smooth' })
	} else {
		// Navigate to homepage
		router.push('/')
	}
}

function toggleMenu() {
	console.log('Toggle menu clicked, current state:', isMenuOpen.value)
	const newState = !isMenuOpen.value
	isMenuOpen.value = newState
	navigationHandlers.menuToggle(newState)
	console.log('New state:', newState)
}

function closeMenu() {
	isMenuOpen.value = false
}

function setActiveMainNav(section) {
	emit('setActiveMainNav', section)
	closeMenu()
}

// Track navigation link clicks
function handleNavigationClick(linkName) {
	navigationHandlers.navigationLink(linkName, {
		location: 'main_nav',
		current_page: route.path
	})
}

function toggleSubnav(section) {
	if (expandedSections.value.has(section)) {
		expandedSections.value.delete(section)
	} else {
		expandedSections.value.add(section)
	}
}

function isSubnavExpanded(section) {
	return expandedSections.value.has(section)
}

function handleSuggestionsClick() {
	if (isAdmin.value) {
		router.push('/suggestions/all')
	} else {
		router.push('/suggestions')
	}
	closeMenu()
}

// Navigation handlers using externalized analytics
const handleSignInClickMobile = () => navigationHandlers.signInMobile(closeMenu)
const handleSignUpClickMobile = () => navigationHandlers.signUpMobile(closeMenu)
const handleSignInClickDesktop = () => navigationHandlers.signInDesktop()
const handleSignUpClickDesktop = () => navigationHandlers.signUpDesktop()

// Scroll detection for auto-hiding header
function handleScroll() {
	const currentScrollY = window.scrollY

	// Don't hide header if menu is open
	if (isMenuOpen.value) {
		isHeaderVisible.value = true
		lastScrollY.value = currentScrollY
		return
	}

	// Show header at top of page
	if (currentScrollY <= 50) {
		isHeaderVisible.value = true
		lastScrollY.value = currentScrollY
		return
	}

	// Hide on scroll down, show on scroll up
	if (currentScrollY > lastScrollY.value + 10) {
		// Scrolling down - hide header
		isHeaderVisible.value = false
	} else if (currentScrollY < lastScrollY.value - 10) {
		// Scrolling up - show header
		isHeaderVisible.value = true
	}

	lastScrollY.value = currentScrollY
}

// Add scroll listener on mount
onMounted(() => {
	window.addEventListener('scroll', handleScroll, { passive: true })
})

// Clean up scroll listener on unmount
onUnmounted(() => {
	window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
	<!-- Mobile Navigation -->
	<nav
		class="bg-gray-800 text-white sm:hidden fixed top-0 left-0 right-0 z-50 transition-transform duration-300"
		:class="{ '-translate-y-full': !isHeaderVisible }">
		<!-- Mobile Header -->
		<div class="flex items-center justify-between px-4 py-2 pattern">
			<!-- Logo/Brand -->
			<button
				@click="handleLogoClick"
				class="flex items-center gap-2 hover:opacity-80 transition-opacity">
				<CubeIcon
					class="w-6 h-6 text-white drop-shadow [filter:_drop-shadow(2px_2px_2px_#000)]" />
				<span class="font-semibold text-sm text-white [text-shadow:_2px_2px_2px_#000]">
					vz's price guide for Minecraft
				</span>
			</button>

			<!-- Hamburger Menu Button -->
			<button
				@click="toggleMenu"
				class="p-2 rounded hover:bg-gray-700 transition-colors"
				:aria-label="isMenuOpen ? 'Close menu' : 'Open menu'">
				<XMarkIcon v-if="isMenuOpen" class="w-6 h-6" />
				<Bars3Icon v-else class="w-6 h-6" />
			</button>
		</div>

		<!-- Mobile Menu -->
		<div v-show="isMenuOpen" class="pb-2">
			<!-- Main Navigation Links -->
			<RouterLink
				to="/"
				@click="
					() => {
						handleNavigationClick('Home')
						setActiveMainNav(null)
					}
				"
				:class="[
					'block px-3 py-2 transition-colors',
					route.path === '/' || route.path.startsWith('/edit/')
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				Home
			</RouterLink>

			<button
				@click="handleSuggestionsClick"
				:class="[
					'block px-3 py-2 transition-colors w-full text-left',
					route.path === '/suggestions' || route.path === '/suggestions/all'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]"
				v-if="user?.email">
				Suggestions
			</button>

			<RouterLink
				to="/crate-rewards"
				@click="
					() => {
						handleNavigationClick('Crate Rewards')
						setActiveMainNav(null)
					}
				"
				:class="[
					'block px-3 py-2 transition-colors',
					route.path === '/crate-rewards' || route.path.startsWith('/crate-rewards/')
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]"
				v-if="user?.email">
				Crate Rewards
			</RouterLink>

			<RouterLink
				to="/updates"
				@click="
					() => {
						handleNavigationClick('Updates')
						setActiveMainNav(null)
					}
				"
				:class="[
					'block px-3 py-2 transition-colors',
					route.path === '/updates'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				Updates
			</RouterLink>

			<!-- Admin section (only for admins) -->
			<div v-if="isAdmin">
				<button
					@click="toggleSubnav('admin')"
					class="w-full text-left px-3 py-2 flex items-center justify-between">
					<span>Admin</span>
					<ChevronRightIcon v-if="!isSubnavExpanded('admin')" class="w-4 h-4" />
					<ChevronDownIcon v-else class="w-4 h-4" />
				</button>

				<!-- Admin Subnav -->
				<div v-show="isSubnavExpanded('admin')" class="ml-4 space-y-0.5">
					<RouterLink
						to="/admin"
						@click="closeMenu"
						class="block px-3 py-1.5 transition-colors hover:bg-gray-700 hover:text-white text-sm">
						Dashboard
					</RouterLink>
					<RouterLink
						v-if="canViewMissingItems"
						to="/missing-items"
						@click="closeMenu"
						class="block px-3 py-1.5 transition-colors hover:bg-gray-700 hover:text-white text-sm">
						Missing Items
					</RouterLink>
					<RouterLink
						v-if="canAddItems"
						to="/add"
						@click="closeMenu"
						class="block px-3 py-1.5 transition-colors hover:bg-gray-700 hover:text-white text-sm">
						Add Item
					</RouterLink>
					<RouterLink
						v-if="canBulkUpdate"
						to="/bulk-update"
						@click="closeMenu"
						class="block px-3 py-1.5 transition-colors hover:bg-gray-700 hover:text-white text-sm">
						Bulk Update
					</RouterLink>
					<RouterLink
						to="/styleguide"
						@click="closeMenu"
						class="block px-3 py-1.5 transition-colors hover:bg-gray-700 hover:text-white text-sm">
						Styleguide
					</RouterLink>
				</div>
			</div>

			<!-- Divider -->
			<div v-if="user?.email" class="border-t border-gray-700 my-2"></div>

			<!-- User Actions -->
			<div v-if="!user?.email" class="border-t border-gray-700 my-2"></div>
			<RouterLink
				v-if="!user?.email"
				to="/signin"
				@click="handleSignInClickMobile"
				:class="[
					'block px-3 py-2 transition-colors',
					route.path === '/signin'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				<div class="flex items-center gap-2">
					<ArrowRightEndOnRectangleIcon class="w-4 h-4" />
					<span>Sign In</span>
				</div>
			</RouterLink>
			<RouterLink
				v-if="!user?.email"
				to="/signup"
				@click="handleSignUpClickMobile"
				:class="[
					'block px-3 py-2 transition-colors',
					route.path === '/signup'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				<div class="flex items-center gap-2">
					<UserIcon class="w-4 h-4" />
					<span>Sign Up</span>
				</div>
			</RouterLink>

			<!-- User profile display (when logged in, regardless of verification) -->
			<RouterLink
				v-if="user?.email"
				to="/account"
				@click="closeMenu"
				class="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-gray-700 hover:text-white">
				<!-- Profile Avatar -->
				<img
					v-if="userProfile?.minecraft_avatar_url"
					:src="userProfile.minecraft_avatar_url"
					:alt="userProfile.display_name || userProfile.minecraft_username"
					class="w-8 h-8 rounded"
					@error="$event.target.style.display = 'none'" />
				<!-- Fallback if no avatar -->
				<div
					v-else
					class="w-8 h-8 bg-gray-600 rounded flex items-center justify-center text-sm font-bold">
					{{ (userProfile?.display_name || user.email || '?').charAt(0).toUpperCase() }}
				</div>

				<!-- Display Name or Email -->
				<div class="flex-1">
					<div class="font-medium">
						{{ userProfile?.display_name || user.email || 'User' }}
					</div>
					<div class="text-xs text-gray-300">View Account</div>
				</div>
			</RouterLink>
		</div>
	</nav>

	<!-- Desktop Navigation (hidden on mobile) -->
	<nav class="bg-gray-800 text-white px-4 py-2 hidden sm:flex gap-2 items-center">
		<RouterLink
			to="/"
			@click="
				() => {
					handleNavigationClick('Home')
					setActiveMainNav(null)
				}
			"
			:class="[
				'px-3 py-2 rounded transition-colors',
				route.path === '/' || route.path.startsWith('/edit/')
					? 'bg-gray-700 text-white'
					: 'hover:bg-gray-700 hover:text-white'
			]">
			Home
		</RouterLink>
		<button
			@click="handleSuggestionsClick"
			:class="[
				'px-3 py-2 rounded transition-colors',
				route.path === '/suggestions' || route.path === '/suggestions/all'
					? 'bg-gray-700 text-white'
					: 'hover:bg-gray-700 hover:text-white'
			]"
			v-if="user?.email">
			Suggestions
		</button>
		<RouterLink
			to="/crate-rewards"
			@click="
				() => {
					handleNavigationClick('Crate Rewards')
					setActiveMainNav(null)
				}
			"
			:class="[
				'px-3 py-2 rounded transition-colors',
				route.path === '/crate-rewards' || route.path.startsWith('/crate-rewards/')
					? 'bg-gray-700 text-white'
					: 'hover:bg-gray-700 hover:text-white'
			]"
			v-if="user?.email">
			Crate Rewards
		</RouterLink>
		<RouterLink
			to="/updates"
			@click="
				() => {
					handleNavigationClick('Updates')
					setActiveMainNav(null)
				}
			"
			:class="[
				'px-3 py-2 rounded transition-colors',
				route.path === '/updates'
					? 'bg-gray-700 text-white'
					: 'hover:bg-gray-700 hover:text-white'
			]">
			Updates
		</RouterLink>

		<!-- Admin section (only for admins) -->
		<RouterLink
			v-if="isAdmin"
			to="/admin"
			:class="[
				'px-3 py-2 rounded transition-colors',
				activeMainNav === 'admin'
					? 'bg-gray-700 text-white'
					: 'hover:bg-gray-700 hover:text-white'
			]">
			Admin
		</RouterLink>

		<!-- Sign In/Sign Up buttons (when not logged in) -->
		<div v-if="!user?.email" class="flex gap-2 ml-auto">
			<RouterLink
				to="/signin"
				@click="handleSignInClickDesktop"
				:class="[
					'px-3 py-2 rounded transition-colors',
					route.path === '/signin'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				<div class="flex items-center gap-2">
					<ArrowRightEndOnRectangleIcon class="w-4 h-4" />
					<span>Sign In</span>
				</div>
			</RouterLink>
			<RouterLink
				to="/signup"
				@click="handleSignUpClickDesktop"
				:class="[
					'px-3 py-2 rounded transition-colors',
					route.path === '/signup'
						? 'bg-gray-700 text-white'
						: 'hover:bg-gray-700 hover:text-white'
				]">
				<div class="flex items-center gap-2">
					<UserIcon class="w-4 h-4" />
					<span>Sign Up</span>
				</div>
			</RouterLink>
		</div>

		<!-- User profile display (when logged in, regardless of verification) -->
		<RouterLink
			v-if="user?.email"
			class="flex items-center gap-2 hover:bg-gray-700 px-2 py-1 rounded transition-colors ml-auto"
			to="/account"
			@click="setActiveMainNav(null)">
			<!-- Display Name or Email -->
			<span class="text-sm font-medium">
				{{ userProfile?.display_name || user.email || 'User' }}
			</span>

			<!-- Profile Avatar -->
			<img
				v-if="userProfile?.minecraft_avatar_url"
				:src="userProfile.minecraft_avatar_url"
				:alt="userProfile.display_name || userProfile.minecraft_username"
				class="w-5 h-5 rounded"
				@error="$event.target.style.display = 'none'" />
			<!-- Fallback if no avatar -->
			<div
				v-else
				class="w-5 h-5 bg-gray-600 rounded flex items-center justify-center text-xs font-bold">
				{{ (userProfile?.display_name || user.email || '?').charAt(0).toUpperCase() }}
			</div>
		</RouterLink>
	</nav>
</template>

<style scoped lang="scss">
.pattern {
	background-image: repeating-linear-gradient(
			-45deg,
			rgba(120, 148, 113, 0.2) 0,
			rgba(120, 148, 113, 0.2) 1px,
			transparent 0,
			transparent 12.73px
		),
		linear-gradient(rgba(36, 44, 37, 0.5), rgba(36, 44, 37, 0.5)), url('/headerbg.png');
	background-position: center top;
	background-size: cover;
}
</style>
