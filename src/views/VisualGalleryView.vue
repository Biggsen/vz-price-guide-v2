<script setup>
import { ref, computed, onMounted } from 'vue'
import {
	HeartIcon,
	HeartIcon as HeartSolidIcon,
	EyeIcon,
	ArrowLeftIcon,
	ArrowRightIcon,
	XMarkIcon,
	FunnelIcon,
	MagnifyingGlassIcon,
	ArrowsPointingOutIcon,
	ArrowsPointingInIcon,
	DocumentTextIcon,
	CodeBracketIcon
} from '@heroicons/vue/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/vue/24/solid'
import {
	screenshotToViewMap,
	getScreenshotMetadata,
	getScreenshotsByType
} from '../screenshot-metadata.js'

// State management
const screenshots = ref([])
const favorites = ref(new Set())
const selectedCategory = ref('all')
const searchQuery = ref('')
const selectedScreenshot = ref(null)
const isFullscreen = ref(false)
const isLoading = ref(true)

// Enhanced categories with metadata integration
const categories = {
	all: 'All Screenshots',
	favorites: '⭐ Favorites',
	'public-pages': 'Public Pages',
	'auth-pages': 'Authentication Pages',
	'user-pages': 'User Pages',
	'admin-pages': 'Admin Pages',
	modals: 'Modals',
	responsive: 'Responsive',
	errors: 'Error Pages'
}

// Load screenshots from the API
async function loadScreenshots() {
	try {
		// Try to load from the screenshot server API
		const response = await fetch('http://localhost:3001/api/screenshots')
		if (response.ok) {
			const apiScreenshots = await response.json()
			screenshots.value = enhanceScreenshotsWithMetadata(apiScreenshots)
		} else {
			// Fallback to mock data if API is not available
			console.warn('Screenshot API not available, using mock data')
			screenshots.value = enhanceScreenshotsWithMetadata(getMockScreenshots())
		}

		// Load favorites from localStorage
		const savedFavorites = localStorage.getItem('visual-gallery-favorites')
		if (savedFavorites) {
			favorites.value = new Set(JSON.parse(savedFavorites))
		}

		isLoading.value = false
	} catch (error) {
		console.error('Failed to load screenshots:', error)
		// Fallback to mock data
		screenshots.value = enhanceScreenshotsWithMetadata(getMockScreenshots())
		isLoading.value = false
	}
}

// Enhance screenshots with metadata from the mapping
function enhanceScreenshotsWithMetadata(screenshotList) {
	return screenshotList.map((screenshot) => {
		const metadata = getScreenshotMetadata(screenshot.id)
		return {
			...screenshot,
			// Add metadata fields
			viewFile: metadata?.viewFile || null,
			route: metadata?.route || null,
			type: metadata?.type || screenshot.category,
			// Override description with metadata if available
			description: metadata?.description || screenshot.description,
			// Add viewport from metadata if available
			viewport: metadata?.viewport || screenshot.viewport
		}
	})
}

// Fallback mock data
function getMockScreenshots() {
	return [
		{
			id: 'home-default',
			name: 'Home Page - Default',
			category: 'public-pages',
			path: '/visual-screenshots/public-pages/home-default.png',
			description: 'Main homepage with all categories visible',
			viewport: '1280x720'
		},
		{
			id: 'signin-default',
			name: 'Sign In Page',
			category: 'public-pages',
			path: '/visual-screenshots/public-pages/signin-default.png',
			description: 'User authentication sign-in form',
			viewport: '1280x720'
		},
		{
			id: 'signup-default',
			name: 'Sign Up Page',
			category: 'public-pages',
			path: '/visual-screenshots/public-pages/signup-default.png',
			description: 'New user registration form',
			viewport: '1280x720'
		},
		{
			id: 'home-mobile',
			name: 'Home Page - Mobile',
			category: 'responsive',
			path: '/visual-screenshots/public-pages/home-mobile.png',
			description: 'Homepage optimized for mobile devices',
			viewport: '375x667'
		},
		{
			id: 'home-tablet',
			name: 'Home Page - Tablet',
			category: 'responsive',
			path: '/visual-screenshots/public-pages/home-tablet.png',
			description: 'Homepage optimized for tablet devices',
			viewport: '768x1024'
		},
		{
			id: 'admin-default',
			name: 'Admin Dashboard',
			category: 'admin-pages',
			path: '/visual-screenshots/admin-pages/admin-default.png',
			description: 'Administrative dashboard interface',
			viewport: '1280x720'
		},
		{
			id: 'settings-modal-default',
			name: 'Settings Modal',
			category: 'modals',
			path: '/visual-screenshots/modals/settings-modal-default.png',
			description: 'Application settings modal dialog',
			viewport: '1280x720'
		},
		{
			id: 'export-modal-default',
			name: 'Export Modal',
			category: 'modals',
			path: '/visual-screenshots/modals/export-modal-default.png',
			description: 'Data export modal dialog',
			viewport: '1280x720'
		},
		{
			id: '404-default',
			name: '404 Error Page',
			category: 'errors',
			path: '/visual-screenshots/public-pages/404-default.png',
			description: 'Page not found error page',
			viewport: '1280x720'
		},
		{
			id: 'account-default',
			name: 'Account Page',
			category: 'user-pages',
			path: '/visual-screenshots/user-pages/account-default.png',
			description: 'User account page with profile information',
			viewport: '1280x720'
		},
		{
			id: 'account-edit-profile',
			name: 'Account - Edit Profile',
			category: 'user-pages',
			path: '/visual-screenshots/user-pages/account-edit-profile.png',
			description: 'Account page in profile editing mode',
			viewport: '1280x720'
		},
		{
			id: 'account-unverified',
			name: 'Account - Unverified User',
			category: 'user-pages',
			path: '/visual-screenshots/user-pages/account-unverified.png',
			description: 'Account page for unverified user without profile',
			viewport: '1280x720'
		}
	]
}

// Computed properties
const filteredScreenshots = computed(() => {
	let filtered = screenshots.value

	// Filter by category
	if (selectedCategory.value === 'favorites') {
		filtered = filtered.filter((s) => favorites.value.has(s.id))
	} else if (selectedCategory.value !== 'all') {
		filtered = filtered.filter((s) => s.category === selectedCategory.value)
	}

	// Filter by search query
	if (searchQuery.value) {
		const query = searchQuery.value.toLowerCase()
		filtered = filtered.filter(
			(s) =>
				s.name.toLowerCase().includes(query) ||
				s.description.toLowerCase().includes(query) ||
				s.category.toLowerCase().includes(query) ||
				(s.viewFile && s.viewFile.toLowerCase().includes(query)) ||
				(s.route && s.route.toLowerCase().includes(query))
		)
	}

	return filtered
})

const favoriteScreenshots = computed(() => {
	return screenshots.value.filter((s) => favorites.value.has(s.id))
})

// Methods
function toggleFavorite(screenshotId) {
	if (favorites.value.has(screenshotId)) {
		favorites.value.delete(screenshotId)
	} else {
		favorites.value.add(screenshotId)
	}

	// Save to localStorage
	localStorage.setItem('visual-gallery-favorites', JSON.stringify([...favorites.value]))
}

function openScreenshot(screenshot) {
	selectedScreenshot.value = screenshot
}

function closeScreenshot() {
	selectedScreenshot.value = null
	isFullscreen.value = false
}

function toggleFullscreen() {
	isFullscreen.value = !isFullscreen.value
}

function navigateScreenshot(direction) {
	const currentIndex = filteredScreenshots.value.findIndex(
		(s) => s.id === selectedScreenshot.value.id
	)
	let newIndex

	if (direction === 'prev') {
		newIndex = currentIndex > 0 ? currentIndex - 1 : filteredScreenshots.value.length - 1
	} else {
		newIndex = currentIndex < filteredScreenshots.value.length - 1 ? currentIndex + 1 : 0
	}

	selectedScreenshot.value = filteredScreenshots.value[newIndex]
}

// Helper function to get view file name from path
function getViewFileName(viewFile) {
	if (!viewFile) return null
	return viewFile.split('/').pop()
}

// Helper function to open view file in editor (placeholder)
function openViewFile(viewFile) {
	// This would typically open the file in your editor
	console.log('Opening view file:', viewFile)
	// For now, just copy to clipboard
	navigator.clipboard.writeText(viewFile)
}

// Keyboard navigation
function handleKeydown(event) {
	if (!selectedScreenshot.value) return

	switch (event.key) {
		case 'Escape':
			closeScreenshot()
			break
		case 'ArrowLeft':
			navigateScreenshot('prev')
			break
		case 'ArrowRight':
			navigateScreenshot('next')
			break
		case 'f':
		case 'F':
			if (selectedScreenshot.value) {
				toggleFavorite(selectedScreenshot.value.id)
			}
			break
	}
}

onMounted(() => {
	loadScreenshots()
	document.addEventListener('keydown', handleKeydown)
})
</script>

<template>
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<div class="bg-white shadow-sm border-b">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-gray-900">Visual Gallery</h1>
						<p class="text-gray-600 mt-1">Browse and compare application screenshots</p>
					</div>

					<!-- View Toggle -->
					<div class="flex items-center space-x-4">
						<div class="flex items-center space-x-2">
							<span class="text-sm text-gray-600">Favorites Only:</span>
							<button
								@click="
									selectedCategory =
										selectedCategory === 'favorites' ? 'all' : 'favorites'
								"
								:class="[
									selectedCategory === 'favorites'
										? 'bg-gray-asparagus text-white'
										: 'bg-gray-200 text-gray-700',
									'px-3 py-1 rounded-md text-sm font-medium transition-colors'
								]">
								{{ selectedCategory === 'favorites' ? 'On' : 'Off' }}
							</button>
						</div>
					</div>
				</div>

				<!-- Filters -->
				<div class="mt-6 flex flex-col sm:flex-row gap-4">
					<!-- Search -->
					<div class="flex-1">
						<div class="relative">
							<MagnifyingGlassIcon
								class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								v-model="searchQuery"
								type="text"
								placeholder="Search screenshots, components, or routes..."
								class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus" />
						</div>
					</div>

					<!-- Category Filter -->
					<div class="sm:w-48">
						<select
							v-model="selectedCategory"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
							<option v-for="(label, key) in categories" :key="key" :value="key">
								{{ label }}
							</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<!-- Loading State -->
		<div v-if="isLoading" class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-asparagus"></div>
		</div>

		<!-- Screenshots Grid -->
		<div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div class="mb-6">
				<p class="text-gray-600">
					Showing {{ filteredScreenshots.length }} screenshot{{
						filteredScreenshots.length === 1 ? '' : 's'
					}}
					<span v-if="searchQuery">for "{{ searchQuery }}"</span>
				</p>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				<div
					v-for="screenshot in filteredScreenshots"
					:key="screenshot.id"
					class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
					@click="openScreenshot(screenshot)">
					<!-- Screenshot Image -->
					<div class="aspect-video bg-gray-100 relative overflow-hidden">
						<img
							:src="screenshot.path"
							:alt="screenshot.name"
							class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
							@error="$event.target.src = '/placeholder-screenshot.png'" />

						<!-- Favorite Button -->
						<button
							@click.stop="toggleFavorite(screenshot.id)"
							class="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
							:title="
								favorites.has(screenshot.id)
									? 'Remove from favorites'
									: 'Add to favorites'
							">
							<HeartSolid
								v-if="favorites.has(screenshot.id)"
								class="h-5 w-5 text-red-500" />
							<HeartIcon v-else class="h-5 w-5 text-gray-400 hover:text-red-500" />
						</button>

						<!-- Category Badge -->
						<div
							class="absolute top-2 left-2 px-2 py-1 bg-gray-asparagus/90 text-white text-xs font-medium rounded">
							{{ categories[screenshot.category] || screenshot.category }}
						</div>

						<!-- Viewport Info -->
						<div
							class="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
							{{ screenshot.viewport }}
						</div>
					</div>

					<!-- Screenshot Info -->
					<div class="p-4">
						<h3 class="font-medium text-gray-900 truncate">{{ screenshot.name }}</h3>
						<p class="text-sm text-gray-600 mt-1 line-clamp-2">
							{{ screenshot.description }}
						</p>

						<!-- View File Info -->
						<div
							v-if="screenshot.viewFile"
							class="mt-2 flex items-center justify-between">
							<div class="flex items-center space-x-1 text-xs text-gray-500">
								<CodeBracketIcon class="h-3 w-3" />
								<span class="truncate">
									{{ getViewFileName(screenshot.viewFile) }}
								</span>
							</div>
							<button
								@click.stop="openViewFile(screenshot.viewFile)"
								class="text-xs text-gray-asparagus hover:text-laurel transition-colors"
								:title="`Open ${screenshot.viewFile}`">
								<DocumentTextIcon class="h-3 w-3" />
							</button>
						</div>

						<!-- Route Info -->
						<div v-if="screenshot.route" class="mt-1 text-xs text-gray-400">
							Route: {{ screenshot.route }}
						</div>
					</div>
				</div>
			</div>

			<!-- Empty State -->
			<div v-if="filteredScreenshots.length === 0" class="text-center py-12">
				<EyeIcon class="mx-auto h-12 w-12 text-gray-400" />
				<h3 class="mt-2 text-sm font-medium text-gray-900">No screenshots found</h3>
				<p class="mt-1 text-sm text-gray-500">
					<span v-if="searchQuery">Try adjusting your search terms.</span>
					<span v-else>No screenshots match your current filters.</span>
				</p>
			</div>
		</div>

		<!-- Screenshot Modal -->
		<div
			v-if="selectedScreenshot"
			class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
			@click="closeScreenshot">
			<div
				class="bg-white rounded-lg max-w-6xl max-h-full overflow-hidden relative group"
				:class="{ 'w-full h-full': isFullscreen }"
				@click.stop>
				<!-- Modal Header -->
				<div class="flex items-center justify-between p-4 border-b">
					<div class="flex-1 min-w-0">
						<h2 class="text-xl font-semibold text-gray-900 truncate">
							{{ selectedScreenshot.name }}
						</h2>
						<p class="text-sm text-gray-600 mt-1">
							{{ selectedScreenshot.description }}
						</p>

						<!-- View File Link in Modal -->
						<div
							v-if="selectedScreenshot.viewFile"
							class="mt-2 flex items-center space-x-2">
							<button
								@click="openViewFile(selectedScreenshot.viewFile)"
								class="flex items-center space-x-1 text-sm text-gray-asparagus hover:text-laurel transition-colors">
								<CodeBracketIcon class="h-4 w-4" />
								<span>{{ selectedScreenshot.viewFile }}</span>
							</button>
						</div>
					</div>

					<div class="flex items-center space-x-2 ml-4">
						<!-- Favorite Button -->
						<button
							@click="toggleFavorite(selectedScreenshot.id)"
							class="p-2 text-gray-400 hover:text-red-500 transition-colors"
							:title="
								favorites.has(selectedScreenshot.id)
									? 'Remove from favorites'
									: 'Add to favorites'
							">
							<HeartSolid
								v-if="favorites.has(selectedScreenshot.id)"
								class="h-6 w-6 text-red-500" />
							<HeartIcon v-else class="h-6 w-6" />
						</button>

						<!-- Fullscreen Toggle -->
						<button
							@click="toggleFullscreen"
							class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
							:title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'">
							<ArrowsPointingInIcon v-if="isFullscreen" class="h-6 w-6" />
							<ArrowsPointingOutIcon v-else class="h-6 w-6" />
						</button>

						<!-- Close Button -->
						<button
							@click="closeScreenshot"
							class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
							<XMarkIcon class="h-6 w-6" />
						</button>
					</div>
				</div>

				<!-- Screenshot -->
				<div class="relative overflow-auto max-h-[calc(100vh-200px)]">
					<img
						:src="selectedScreenshot.path"
						:alt="selectedScreenshot.name"
						class="w-full h-auto"
						@error="$event.target.src = '/placeholder-screenshot.png'" />

					<!-- Navigation Arrows - Only show on hover -->
					<button
						@click="navigateScreenshot('prev')"
						class="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all duration-200 opacity-0 hover:opacity-100 group-hover:opacity-100">
						<ArrowLeftIcon class="h-6 w-6 text-gray-600" />
					</button>

					<button
						@click="navigateScreenshot('next')"
						class="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all duration-200 opacity-0 hover:opacity-100 group-hover:opacity-100">
						<ArrowRightIcon class="h-6 w-6 text-gray-600" />
					</button>
				</div>

				<!-- Modal Footer -->
				<div class="flex items-center justify-between p-4 border-t bg-gray-50">
					<div class="flex items-center space-x-4 text-sm text-gray-600">
						<span>Viewport: {{ selectedScreenshot.viewport }}</span>
						<span>
							Category:
							{{
								categories[selectedScreenshot.category] ||
								selectedScreenshot.category
							}}
						</span>
						<span v-if="selectedScreenshot.route">
							Route: {{ selectedScreenshot.route }}
						</span>
					</div>

					<div class="text-sm text-gray-500">
						Press
						<kbd class="px-2 py-1 bg-gray-200 rounded text-xs">←</kbd>
						<kbd class="px-2 py-1 bg-gray-200 rounded text-xs ml-1">→</kbd>
						to navigate •
						<kbd class="px-2 py-1 bg-gray-200 rounded text-xs ml-1">F</kbd>
						to favorite •
						<kbd class="px-2 py-1 bg-gray-200 rounded text-xs ml-1">Esc</kbd>
						to close
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.line-clamp-2 {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

kbd {
	font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo,
		monospace;
}
</style>
