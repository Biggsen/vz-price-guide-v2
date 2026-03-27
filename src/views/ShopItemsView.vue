<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { useAllShops, updateShop } from '../utils/shopProfile.js'
import { useServers, getMajorMinorVersion } from '../utils/serverProfile.js'
import {
	useShopItems,
	addShopItem,
	updateShopItem,
	deleteShopItem,
	markShopItemsAsChecked,
	bulkUpdateShopItems,
	bulkDeleteShopItems
} from '../utils/shopItems.js'
import {
	parseEconomyShopGuiYaml,
	mapToGuideItems
} from '../utils/economyShopGuiImport.js'
import { classifyUnmappedImportMaterials } from '../utils/shopImportUnmapped.js'
import ShopItemForm from '../components/ShopItemForm.vue'
import ShopFormModal from '../components/ShopFormModal.vue'
import BaseTable from '../components/BaseTable.vue'
import InlinePriceInput from '../components/InlinePriceInput.vue'
import InlineNotesInput from '../components/InlineNotesInput.vue'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import BaseIconButton from '../components/BaseIconButton.vue'
import CategoryFilters from '../components/CategoryFilters.vue'
import { ArrowLeftIcon, PlusIcon, ArrowPathIcon } from '@heroicons/vue/20/solid'
import { Squares2X2Icon } from '@heroicons/vue/24/solid'
import {
	CurrencyDollarIcon,
	ClipboardDocumentCheckIcon,
	Cog6ToothIcon,
	ArrowDownTrayIcon,
	ArrowUpTrayIcon,
	ArrowUpIcon,
	ArrowPathRoundedSquareIcon
} from '@heroicons/vue/24/outline'
import {
	PencilIcon,
	TrashIcon,
	ArchiveBoxIcon,
	ArchiveBoxXMarkIcon,
	WalletIcon,
	StarIcon as StarIconOutline
} from '@heroicons/vue/24/outline'
import { StarIcon } from '@heroicons/vue/24/solid'
import { getImageUrl, getItemImageUrl } from '../utils/image.js'
import { generateMinecraftAvatar } from '../utils/userProfile.js'
import { transformShopItemForTable as transformShopItem } from '../utils/tableTransform.js'
import {
	recalculateRecipePricesForShop,
	versionToKey,
	getRecipeForItem,
	hasCircularRecipeDependency,
	computeRecipePriceForShop
} from '../utils/serverShopRecipes.js'
import { enabledCategories } from '../constants.js'

const user = useCurrentUser()
const router = useRouter()
const route = useRoute()
const db = useFirestore()

// Reactive state
const selectedShopId = ref('')
const showAddForm = ref(false)
const editingItem = ref(null)
const loading = ref(false)
const error = ref(null)
const shopItemForm = ref(null)

// View mode settings
const viewMode = ref('categories') // 'categories' or 'list'
const layout = ref('comfortable') // 'comfortable' or 'condensed'
const showEnchantments = ref(true) // Show enchantments in item table
const hideOutOfStock = ref(false) // Hide items that are out of stock

const showBackToTop = ref(false)

function scrollToTop() {
	window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleShopPageScroll() {
	showBackToTop.value = window.scrollY > 300
}

// Inline price editing state
const editingPriceId = ref(null)
const editingPriceType = ref(null) // 'buy' or 'sell'
const savingPriceId = ref(null)
const savingPriceType = ref(null)
const editingNotesId = ref(null)
const savingNotesId = ref(null)
const savingItemId = ref(null) // Track which item is being saved during quick edit
const showItemSavingSpinner = ref(null) // Show spinner after delay
let itemSavingTimeout = null
const markingAsChecked = ref(false) // Track if marking items as checked
const markingItemId = ref(null) // Track which item is being marked as checked
const catalogStatusLoading = ref(false)
const catalogStatusError = ref(null)
const recalculateLoading = ref(false)
const switchingPricingItemId = ref(null)
const showRecalculateResultsModal = ref(false)
const recalculateResultSummary = ref(null)
const searchQuery = ref('')
const shopVisibleCategories = shallowRef([])
const showShopCategoryFilters = ref(false)
const importLoading = ref(false)
const importError = ref(null)
const economyShopGuiFileInput = ref(null)
const showImportResultsModal = ref(false)
const importResultSummary = ref(null)
const clearAllItemsLoading = ref(false)
const showClearAllModal = ref(false)

// Shop settings modal state
const showShopSettingsModal = ref(false)

// Edit shop modal state
const showEditShopModal = ref(false)
const editingShop = ref(null)
const shopFormLoading = ref(false)
const shopFormError = ref(null)
const shopNameValidationError = ref(null)
const shopServerValidationError = ref(null)
const shopPlayerValidationError = ref(null)
const usePlayerAsShopName = ref(false)
const shopForm = ref({
	name: '',
	player: '',
	server_id: '',
	location: '',
	description: '',
	is_own_shop: false,
	server_shop: false,
	owner_funds: null
})

function resetShopForm() {
	shopForm.value = {
		name: '',
		player: '',
		server_id: '',
		location: '',
		description: '',
		is_own_shop: false,
		server_shop: false,
		owner_funds: null
	}
	usePlayerAsShopName.value = false
}

// Get user's shops and servers
const { shops } = useAllShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))

// Get shop items for selected shop (with error handling)
const safeShopId = computed(() => {
	// Only return shop ID if user owns the shop and is authenticated
	if (!user.value?.uid || !selectedShopId.value || !shops.value) return null

	const userShop = shops.value.find((shop) => shop.id === selectedShopId.value)
	return userShop ? selectedShopId.value : null
})

const shopItemsResult = useShopItems(safeShopId)
const shopItems = computed(() => {
	// Return empty array if there's an error or no data
	try {
		const items = shopItemsResult.items.value || []
		return items
	} catch (error) {
		console.warn('Error loading shop items:', error)
		return []
	}
})

// Computed properties - Define these FIRST before using them in other computeds
const hasShops = computed(() => shops.value && shops.value.length > 0)
const hasServers = computed(() => servers.value && servers.value.length > 0)
const selectedShop = computed(
	() => shops.value?.find((shop) => shop.id === selectedShopId.value) || null
)

const isShopOutOfMoney = computed(() => {
	return selectedShop.value?.owner_funds === 0
})

const isShopFullyCataloged = computed(() => {
	return Boolean(selectedShop.value?.fully_cataloged)
})

const isShopArchived = computed(() => {
	return Boolean(selectedShop.value?.archived)
})

const isServerShop = computed(() => Boolean(selectedShop.value?.server_shop))

const serverVersionKey = computed(() => {
	if (!selectedServer.value?.minecraft_version) return '1_21'
	return versionToKey(getMajorMinorVersion(selectedServer.value.minecraft_version))
})

async function handleOutOfMoneyChange(checked) {
	if (!selectedShop.value || !selectedShopId.value) return

	try {
		await updateShop(selectedShopId.value, {
			owner_funds: checked ? 0 : null
		})
	} catch (err) {
		console.error('Error updating shop funds:', err)
		error.value = err.message || 'Failed to update shop funds. Please try again.'
	}
}

async function handleArchiveChange(checked) {
	if (!selectedShop.value || !selectedShopId.value) return

	try {
		await updateShop(selectedShopId.value, {
			archived: checked
		})
	} catch (err) {
		console.error('Error archiving shop:', err)
		error.value = err.message || 'Failed to update shop archive status. Please try again.'
	}
}

async function handleCatalogStatusChange(checked) {
	if (!selectedShopId.value) return

	catalogStatusLoading.value = true
	catalogStatusError.value = null

	try {
		await updateShop(selectedShopId.value, {
			fully_cataloged: Boolean(checked)
		})
	} catch (err) {
		console.error('Error updating catalog status:', err)
		catalogStatusError.value =
			err.message || 'Failed to update catalog status. Please try again.'
	} finally {
		catalogStatusLoading.value = false
	}
}
const selectedServer = computed(() =>
	selectedShop.value && servers.value
		? servers.value.find((s) => s.id === selectedShop.value.server_id)
		: null
)

// Watch player name to auto-fill shop name when checkbox is checked
watch(
	() => shopForm.value.player,
	(newPlayer) => {
		if (usePlayerAsShopName.value && newPlayer) {
			shopForm.value.name = newPlayer
		}
	}
)

// Watch checkbox to sync shop name field
watch(usePlayerAsShopName, (checked) => {
	if (checked && shopForm.value.player) {
		shopForm.value.name = shopForm.value.player
	} else if (!checked) {
		shopForm.value.name = ''
	}
})

// Clear validation errors when form fields change
watch(
	() => shopForm.value.name,
	() => {
		shopNameValidationError.value = null
		shopFormError.value = null
	}
)
watch(
	() => shopForm.value.player,
	() => {
		shopPlayerValidationError.value = null
		shopFormError.value = null
	}
)

// Guide items query: bind only once `selectedServer` resolves (shop + servers loaded).
// A computed query alone could leave useCollection stuck empty until another reactive
// bump (e.g. shop update); driving the query from `selectedServer` fixes Unknown Item names.
const allItemsQuery = ref(null)

watch(
	selectedServer,
	(server) => {
		if (!server) {
			allItemsQuery.value = null
			return
		}
		const majorMinorVersion = getMajorMinorVersion(server.minecraft_version)
		if (!majorMinorVersion) {
			allItemsQuery.value = null
			return
		}
		allItemsQuery.value = query(
			collection(db, 'items'),
			where('version', '<=', majorMinorVersion),
			orderBy('version', 'asc'),
			orderBy('category', 'asc'),
			orderBy('name', 'asc')
		)
	},
	{ immediate: true }
)

const availableItems = useCollection(allItemsQuery)
const guideItemsByMaterialId = computed(() => {
	const map = {}
	;(availableItems.value || []).forEach((item) => {
		if (item.material_id) map[item.material_id] = item
	})
	return map
})

const availableItemsForAdding = computed(() => availableItems.value || [])

const existingItemIdsInShop = computed(() => (shopItems.value || []).map((s) => s.item_id))

// Format enchantment name for display
function formatEnchantmentName(enchantmentId) {
	if (!enchantmentId || !availableItems.value) return ''

	// Get enchantment item from availableItems
	const enchantmentItem = availableItems.value.find((item) => item.id === enchantmentId)
	if (!enchantmentItem) return ''

	// Try to extract from material_id first (most reliable)
	const materialId = enchantmentItem.material_id
	if (materialId && materialId.startsWith('enchanted_book_')) {
		// Extract enchantment name from material_id like "enchanted_book_aqua_affinity_1"
		const enchantmentPart = materialId.replace('enchanted_book_', '')

		// Try to extract enchantment with level first (e.g., "unbreaking_3" -> "unbreaking 3")
		const enchantWithLevelMatch = enchantmentPart.match(/^(.+)_(\d+)$/)
		if (enchantWithLevelMatch) {
			const enchantName = enchantWithLevelMatch[1]
			const level = enchantWithLevelMatch[2]

			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())

			// Don't display level 1 for single-level enchantments (max level 1)
			const maxLevel = enchantmentItem.enchantment_max_level
			if (level === '1' && maxLevel === 1) {
				return capitalizedEnchant
			}

			return `${capitalizedEnchant} ${level}`
		}

		// Try enchantment without level (e.g., "silk_touch" -> "silk touch")
		const enchantWithoutLevelMatch = enchantmentPart.match(/^(.+)$/)
		if (enchantWithoutLevelMatch) {
			const enchantName = enchantWithoutLevelMatch[1]
			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			return capitalizedEnchant
		}
	}

	// Fallback: Use item name
	return enchantmentItem.name || ''
}

// Format enchantments for title attribute (comma-separated list)
function formatEnchantmentsForTitle(enchantments) {
	if (!enchantments || enchantments.length === 0) return ''
	return enchantments.map(formatEnchantmentName).filter(Boolean).join(', ')
}

// Group shop items by category for better organization
const shopItemsByCategory = computed(() => {
	if (!shopItems.value || !availableItems.value) return {}

	const grouped = {}

	shopItems.value.forEach((shopItem) => {
		// Filter out out of stock items if hideOutOfStock is enabled
		if (hideOutOfStock.value && shopItem.stock_quantity === 0) {
			return
		}

		// Find the corresponding item data from the main items collection
		const itemData = availableItems.value.find((item) => item.id === shopItem.item_id)
		if (itemData) {
			const category = itemData.category || 'Uncategorized'
			if (!grouped[category]) {
				grouped[category] = []
			}
			grouped[category].push({
				...shopItem,
				itemData
			})
		}
	})

	// Match homepage / useItems.js: subcategory asc, then name asc within each category
	Object.keys(grouped).forEach((cat) => {
		grouped[cat].sort((a, b) => {
			const subA = a.itemData?.subcategory || ''
			const subB = b.itemData?.subcategory || ''
			if (subA !== subB) return subA.localeCompare(subB)
			return (a.itemData?.name || '').localeCompare(b.itemData?.name || '')
		})
	})

	return grouped
})

// Flat list view combining all shop items
const allVisibleShopItems = computed(() => {
	if (!shopItems.value || !availableItems.value) return []

	return shopItems.value
		.filter((shopItem) => {
			// Filter out out of stock items if hideOutOfStock is enabled
			if (hideOutOfStock.value && shopItem.stock_quantity === 0) {
				return false
			}
			return true
		})
		.map((shopItem) => {
			// Find the corresponding item data from the main items collection
			const itemData = availableItems.value.find((item) => item.id === shopItem.item_id)
			return {
				...shopItem,
				itemData
			}
		})
})

// BaseTable column definitions (percentage widths; last column keeps fixed width)
const baseTableColumns = computed(() => {
	const cols = [
		{
			key: 'item',
			label: 'Item',
			sortable: true,
			headerAlign: 'center',
			widthStyle: { width: '26%' }
		},
		{
			key: 'buyPrice',
			label: 'Buy Price',
			align: 'right',
			headerAlign: 'center',
			sortable: true,
			widthStyle: { width: '11%' }
		},
		{
			key: 'sellPrice',
			label: 'Sell Price',
			align: 'right',
			headerAlign: 'center',
			sortable: true,
			widthStyle: { width: '11%' }
		}
	]
	if (isServerShop.value) {
		cols.push({
			key: 'pricingTypes',
			label: 'Pricing',
			align: 'left',
			headerAlign: 'center',
			sortable: true,
			widthStyle: { width: '9%' }
		})
	}
	cols.push(
		{
			key: 'profitMargin',
			label: 'Profit %',
			align: 'center',
			headerAlign: 'center',
			sortable: true,
			widthStyle: { width: '11%' },
			sortFn: (a, b) => {
				const valueA = a.profitMargin === '—' ? -Infinity : parseFloat(a.profitMargin) || 0
				const valueB = b.profitMargin === '—' ? -Infinity : parseFloat(b.profitMargin) || 0
				return valueA - valueB
			}
		},
		{
			key: 'notes',
			label: 'Notes',
			sortable: true,
			headerAlign: 'center',
			widthStyle: { width: '18%' }
		},
		{
			key: 'lastUpdated',
			label: 'Last Updated',
			sortable: true,
			headerAlign: 'center',
			widthStyle: { width: '14%' },
			sortFn: (a, b) => {
				const valueA = a._lastUpdatedTimestamp || 0
				const valueB = b._lastUpdatedTimestamp || 0
				return valueA - valueB
			}
		},
		{ key: 'actions', label: '', align: 'center', headerAlign: 'center', width: 'w-20' }
	)
	return cols
})

// Transform shop items for BaseTable (using shared utility)
function transformShopItemForTable(shopItem) {
	const transformed = transformShopItem(shopItem, {
		includeNotes: true,
		includeActions: true,
		includePricingTypes: isServerShop.value
	})
	if (isServerShop.value) {
		const effectivePricingType = getEffectivePricingType(shopItem)
		transformed.pricingTypes =
			effectivePricingType === 'from_recipe'
				? 'Recipe'
				: effectivePricingType === 'base'
					? 'Base'
					: 'Custom'
	}
	return transformed
}

// BaseTable rows for list view
const baseTableRows = computed(() => {
	if (!allVisibleShopItems.value) return []

	return allVisibleShopItems.value.map(transformShopItemForTable)
})

// BaseTable rows grouped by category
const baseTableRowsByCategory = computed(() => {
	if (!shopItemsByCategory.value || !availableItems.value) return {}

	const grouped = {}

	Object.entries(shopItemsByCategory.value).forEach(([category, categoryItems]) => {
		grouped[category] = categoryItems.map(transformShopItemForTable)
	})

	return grouped
})

// Sorted categories to match price guide order
const sortedCategories = computed(() => {
	if (!baseTableRowsByCategory.value) return []

	const categoryKeys = Object.keys(baseTableRowsByCategory.value)
	const orderedCategories = []

	// First, add categories in the order they appear in enabledCategories
	enabledCategories.forEach((category) => {
		if (categoryKeys.includes(category)) {
			orderedCategories.push(category)
		}
	})

	// Then, add any categories that aren't in enabledCategories (like 'Uncategorized')
	categoryKeys.forEach((category) => {
		if (!enabledCategories.includes(category)) {
			orderedCategories.push(category)
		}
	})

	return orderedCategories
})

// Search terms from query (comma-separated, OR logic; only for server shop)
function getSearchTerms() {
	if (!isServerShop.value || !searchQuery.value?.trim()) return []
	return searchQuery.value
		.trim()
		.toLowerCase()
		.split(',')
		.map((t) => t.trim())
		.filter((t) => t.length > 0)
}

// Filter rows by item name matching any search term
function rowMatchesSearch(row) {
	const terms = getSearchTerms()
	if (terms.length === 0) return true
	const name = (row?.item ?? '').toLowerCase()
	return terms.some((term) => name.includes(term))
}

// Filtered list rows (when server shop + search)
const filteredBaseTableRows = computed(() => {
	if (!isServerShop.value || getSearchTerms().length === 0) return baseTableRows.value
	return baseTableRows.value.filter(rowMatchesSearch)
})

// Filtered category rows (when server shop + search)
const filteredBaseTableRowsByCategory = computed(() => {
	if (!isServerShop.value || getSearchTerms().length === 0) return baseTableRowsByCategory.value
	const filtered = {}
	Object.entries(baseTableRowsByCategory.value || {}).forEach(([category, rows]) => {
		const match = rows.filter(rowMatchesSearch)
		if (match.length > 0) filtered[category] = match
	})
	return filtered
})

// Categories to show (search narrows set; chips narrow further)
const sortedCategoriesForDisplay = computed(() => {
	let categories = sortedCategories.value
	if (isServerShop.value && getSearchTerms().length > 0) {
		const filteredKeys = Object.keys(filteredBaseTableRowsByCategory.value || {})
		categories = categories.filter((c) => filteredKeys.includes(c))
	}
	if (shopVisibleCategories.value.length > 0) {
		categories = categories.filter((c) => shopVisibleCategories.value.includes(c))
	}
	return categories
})

// Count of items matching current search (server shop), after category chip filter
const filteredItemCount = computed(() => {
	if (!isServerShop.value || getSearchTerms().length === 0) return 0
	if (viewMode.value === 'list') return listRowsForDisplay.value.length
	return sortedCategoriesForDisplay.value.reduce((sum, cat) => {
		const useFiltered = getSearchTerms().length > 0
		const src = useFiltered ? filteredBaseTableRowsByCategory.value : baseTableRowsByCategory.value
		return sum + (src[cat] || []).length
	}, 0)
})

// Homepage-style category chips: counts per guide category (shop inventory only)
const shopTotalCategoryCounts = computed(() => {
	const out = {}
	for (const cat of enabledCategories) {
		out[cat] = (baseTableRowsByCategory.value[cat] || []).length
	}
	return out
})

const shopAllCategoriesWithSearch = computed(() => {
	const acc = {}
	const terms = getSearchTerms()
	for (const cat of enabledCategories) {
		const rows = baseTableRowsByCategory.value[cat] || []
		acc[cat] = terms.length === 0 ? rows : rows.filter(rowMatchesSearch)
	}
	return acc
})

const shopCategoryFilterTotalItemCount = computed(() => {
	if (getSearchTerms().length === 0) return baseTableRows.value.length
	return filteredBaseTableRows.value.length
})

// List view rows after search + category chip filter
const listRowsForDisplay = computed(() => {
	const base =
		isServerShop.value && getSearchTerms().length > 0
			? filteredBaseTableRows.value
			: baseTableRows.value
	if (shopVisibleCategories.value.length === 0) return base
	return base.filter((row) => {
		const cat = row._originalItem?.itemData?.category || 'Uncategorized'
		return shopVisibleCategories.value.includes(cat)
	})
})

function resetSearch() {
	searchQuery.value = ''
}

function loadShopVisibleCategories(shopId) {
	if (!shopId) return []
	try {
		const raw = localStorage.getItem(`shopItemsVisibleCategories_${shopId}`)
		if (!raw) return []
		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed.filter((c) => enabledCategories.includes(c))
	} catch {
		return []
	}
}

function persistShopVisibleCategories() {
	if (!selectedShopId.value) return
	try {
		localStorage.setItem(
			`shopItemsVisibleCategories_${selectedShopId.value}`,
			JSON.stringify(shopVisibleCategories.value)
		)
	} catch {
		// ignore
	}
}

function handleShopToggleCategory(cat) {
	const cur = shopVisibleCategories.value
	const idx = cur.indexOf(cat)
	if (idx !== -1) {
		shopVisibleCategories.value = cur.filter((c) => c !== cat)
	} else {
		shopVisibleCategories.value = [...cur, cat]
	}
	persistShopVisibleCategories()
}

function handleShopClearCategories() {
	shopVisibleCategories.value = []
	persistShopVisibleCategories()
}

// Load and save view settings from localStorage
function loadViewSettings() {
	try {
		const savedViewMode = localStorage.getItem('shopItemsViewMode')
		const savedLayout = localStorage.getItem('shopItemsLayout')
		const savedShowEnchantments = localStorage.getItem('shopItemsShowEnchantments')
		const savedHideOutOfStock = localStorage.getItem('shopItemsHideOutOfStock')

		if (savedViewMode && ['categories', 'list'].includes(savedViewMode)) {
			viewMode.value = savedViewMode
		}

		if (savedLayout && ['comfortable', 'condensed'].includes(savedLayout)) {
			layout.value = savedLayout
		}

		if (savedShowEnchantments !== null) {
			showEnchantments.value = savedShowEnchantments === 'true'
		}

		if (savedHideOutOfStock !== null) {
			hideOutOfStock.value = savedHideOutOfStock === 'true'
		}
	} catch (error) {
		console.warn('Error loading view settings:', error)
	}
}

function saveViewSettings() {
	try {
		localStorage.setItem('shopItemsViewMode', viewMode.value)
		localStorage.setItem('shopItemsLayout', layout.value)
		localStorage.setItem('shopItemsShowEnchantments', showEnchantments.value.toString())
		localStorage.setItem('shopItemsHideOutOfStock', hideOutOfStock.value.toString())
	} catch (error) {
		console.warn('Error saving view settings:', error)
	}
}

// Initialize from URL parameters
onMounted(() => {
	const shopId = route.params.shopId
	if (shopId) {
		selectedShopId.value = shopId
	}

	// Load view settings
	loadViewSettings()

	// Add keyboard shortcut listener
	document.addEventListener('keydown', handleKeyDown)

	window.addEventListener('scroll', handleShopPageScroll)
	handleShopPageScroll()
})

watch(
	() => route.params.shopId,
	(shopId) => {
		if (shopId && shopId !== selectedShopId.value) {
			selectedShopId.value = shopId
		}
	},
	{ immediate: false }
)

// Watch for user changes - redirect if not logged in
watch(
	user,
	(newUser) => {
		if (newUser === null) {
			router.push('/signin')
		}
	},
	{ immediate: true }
)

// Watch for shops loading - handle shop selection
watch(shops, (newShops) => {
	if (newShops && newShops.length > 0) {
		if (selectedShopId.value) {
			// Validate that the selected shop exists and user owns it
			const userShop = newShops.find((shop) => shop.id === selectedShopId.value)
			if (!userShop) {
				// If selected shop doesn't exist or user doesn't own it, redirect to shop manager
				console.warn('Shop not found or access denied:', selectedShopId.value)
				router.replace('/shop-manager')
				return
			}
		} else {
			// If no shop selected, select the first one
			selectedShopId.value = newShops[0].id
		}
	} else if (selectedShopId.value) {
		// User has no shops but trying to access one - redirect to shop manager
		router.replace('/shop-manager')
	}
})

// Update URL when shop selection changes
watch(selectedShopId, (newShopId) => {
	if (newShopId && route.params.shopId !== newShopId) {
		router.replace({
			name: 'shop',
			params: { shopId: newShopId },
			query: { ...route.query }
		})
	}
})

watch(
	() => selectedShopId.value,
	(id) => {
		if (!id) {
			shopVisibleCategories.value = []
			return
		}
		shopVisibleCategories.value = loadShopVisibleCategories(id)
	},
	{ immediate: true }
)

// Save view settings when they change
watch(
	[viewMode, layout, showEnchantments, hideOutOfStock],
	() => {
		saveViewSettings()
	},
	{ deep: true }
)

// Watch savingItemId to show spinner after delay
watch(savingItemId, (newVal) => {
	// Clear any existing timeout
	if (itemSavingTimeout) {
		clearTimeout(itemSavingTimeout)
		itemSavingTimeout = null
	}

	if (newVal) {
		// Wait 500ms before showing spinner
		itemSavingTimeout = setTimeout(() => {
			// Only show if still saving after delay
			if (savingItemId.value === newVal) {
				showItemSavingSpinner.value = newVal
			}
		}, 500)
	} else {
		// Immediately hide spinner when not saving
		showItemSavingSpinner.value = null
	}
})

// Clean up timeout on unmount
onUnmounted(() => {
	if (itemSavingTimeout) {
		clearTimeout(itemSavingTimeout)
		itemSavingTimeout = null
	}

	// Remove keyboard shortcut listener
	document.removeEventListener('keydown', handleKeyDown)

	window.removeEventListener('scroll', handleShopPageScroll)
})

// Form handlers
function showAddItemForm() {
	if (!selectedShop.value || !selectedShopId.value || !selectedServer.value) {
		error.value = 'Shop is unavailable. Return to the Shop Manager and try again.'
		return
	}
	showAddForm.value = true
	editingItem.value = null

	// Focus search input after form is shown
	setTimeout(() => {
		if (shopItemForm.value) {
			shopItemForm.value.focusSearchInput()
		}
	}, 100)
}

// Keyboard shortcut handler
function handleKeyDown(event) {
	// Don't trigger if user is typing in an input, textarea, or contenteditable
	const target = event.target
	const isInputFocused =
		target.tagName === 'INPUT' ||
		target.tagName === 'TEXTAREA' ||
		target.isContentEditable ||
		target.closest('input, textarea, [contenteditable]')

	// Only trigger if not typing and 'n' key is pressed
	if (!isInputFocused && event.key === 'n' && !event.ctrlKey && !event.metaKey) {
		// Prevent default only if we're going to trigger the action
		if (selectedShop.value && !showAddForm.value) {
			event.preventDefault()
			showAddItemForm()
		}
	}
}

function showEditItemForm(shopItem) {
	// Ensure the item has a proper document ID
	if (!shopItem.id) {
		console.error('ShopItemsView: Cannot edit item without document ID')
		error.value = 'Cannot edit item: missing document ID'
		return
	}

	editingItem.value = shopItem
	showAddForm.value = true
}

function cancelForm() {
	showAddForm.value = false
	editingItem.value = null
	error.value = null
}

// CRUD operations
async function handleItemSubmit(itemData) {
	if (!user.value?.uid || !selectedShopId.value) return

	loading.value = true
	error.value = null

	// Capture item ID before closing modal (editingItem gets cleared in cancelForm)
	const itemIdBeingEdited = editingItem.value?.id

	// Set saving state if editing an existing item
	if (itemIdBeingEdited) {
		savingItemId.value = itemIdBeingEdited
	}

	try {
		if (editingItem.value) {
			// Update existing shop item (single item only)
			// Validate that we have a document ID
			if (!editingItem.value.id) {
				throw new Error('Cannot update item: missing document ID')
			}

			await updateShopItem(editingItem.value.id, itemData)
		} else {
			// Add new shop item(s) - handle both single item and array
			if (Array.isArray(itemData)) {
				// Multiple items - add each one
				for (const item of itemData) {
					await addShopItem(selectedShopId.value, item.item_id, item)
				}
			} else {
				// Single item (backward compatibility)
				await addShopItem(selectedShopId.value, itemData.item_id, itemData)
			}
		}

		// Close form
		cancelForm()
	} catch (err) {
		console.error('Error saving shop item:', err)
		error.value = err.message || 'Failed to save shop item. Please try again.'
		// Clear saving state on error
		if (itemIdBeingEdited) {
			savingItemId.value = null
		}
	} finally {
		loading.value = false
		// Clear saving state
		if (itemIdBeingEdited) {
			savingItemId.value = null
		}
	}
}

const showDeleteItemModal = ref(false)
const itemPendingDelete = ref(null)

function handleItemDelete(shopItem) {
	itemPendingDelete.value = shopItem
	showDeleteItemModal.value = true
}

async function confirmDeleteItem() {
	if (!itemPendingDelete.value) return

	loading.value = true
	error.value = null

	try {
		await deleteShopItem(itemPendingDelete.value.id)
		showDeleteItemModal.value = false
		itemPendingDelete.value = null
	} catch (err) {
		console.error('Error deleting shop item:', err)
		error.value = err.message || 'Failed to delete shop item. Please try again.'
	} finally {
		loading.value = false
	}
}

function openClearAllModal() {
	if (!shopItems.value?.length) return
	showClearAllModal.value = true
}

function closeClearAllModal() {
	showClearAllModal.value = false
}

async function confirmClearAllItems() {
	if (!selectedShopId.value || !shopItems.value?.length) return
	clearAllItemsLoading.value = true
	error.value = null
	try {
		await bulkDeleteShopItems(selectedShopId.value)
		closeClearAllModal()
	} catch (err) {
		console.error('Error clearing shop items:', err)
		error.value = err.message || 'Failed to clear items. Please try again.'
	} finally {
		clearAllItemsLoading.value = false
	}
}

// Mark all items in shop as checked (updates last_updated)
async function handleMarkAllAsChecked() {
	if (!selectedShopId.value || !shopItems.value || shopItems.value.length === 0) return

	markingAsChecked.value = true
	error.value = null

	try {
		await markShopItemsAsChecked(selectedShopId.value)
	} catch (err) {
		console.error('Error marking items as checked:', err)
		error.value = err.message || 'Failed to mark items as checked. Please try again.'
	} finally {
		markingAsChecked.value = false
	}
}

// Mark a single item as checked (updates last_updated)
async function handleMarkItemAsChecked(itemId) {
	if (!selectedShopId.value || !itemId) return

	markingItemId.value = itemId
	error.value = null

	try {
		await markShopItemsAsChecked(selectedShopId.value, [itemId])
	} catch (err) {
		console.error('Error marking item as checked:', err)
		error.value = err.message || 'Failed to mark item as checked. Please try again.'
	} finally {
		markingItemId.value = null
	}
}

// Handle quick edit from table
async function handleQuickEdit(updatedItem) {
	// Validate that we have a document ID
	if (!updatedItem.id) {
		console.error('ShopItemsView: Cannot quick edit item without document ID')
		error.value = 'Cannot update item: missing document ID'
		return
	}

	if (!user.value?.uid || !selectedShopId.value) return

	// Set saving state for this item
	const isPriceUpdate = savingPriceId.value !== null
	if (!isPriceUpdate) {
		savingItemId.value = updatedItem.id
	}
	error.value = null

	try {
		// Extract the data to update (excluding the full item object)
		const updateData = {
			buy_price: updatedItem.buy_price,
			sell_price: updatedItem.sell_price,
			stock_quantity: updatedItem.stock_quantity,
			stock_full: updatedItem.stock_full,
			notes: updatedItem.notes !== undefined ? updatedItem.notes : ''
		}

		await updateShopItem(updatedItem.id, updateData)

		// Handle shop owner_funds update if needed
		if (updatedItem._setOwnerFunds !== undefined && updatedItem._shopId) {
			// Import shop utilities if needed
			const { updateShop } = await import('../utils/shopProfile.js')
			await updateShop(updatedItem._shopId, { owner_funds: updatedItem._setOwnerFunds })
		}
	} catch (err) {
		console.error('Error updating shop item:', err)
		error.value = err.message || 'Failed to update shop item. Please try again.'
		// Clear saving state immediately on error
		const isPriceUpdate = savingPriceId.value !== null
		if (!isPriceUpdate) {
			savingItemId.value = null
		}
	} finally {
		// Clear saving state if not a price update
		const isPriceUpdate = savingPriceId.value !== null
		if (!isPriceUpdate) {
			savingItemId.value = null
		}
	}
}

// Inline price editing functions
function startEditPrice(itemId, priceType) {
	editingPriceId.value = itemId
	editingPriceType.value = priceType
}

async function savePrice(row, priceType, newPrice) {
	if (isNaN(newPrice) || newPrice < 0) {
		cancelEditPrice()
		return
	}

	const originalItem = row._originalItem
	if (!originalItem || !originalItem.id) {
		cancelEditPrice()
		return
	}

	// Create updated item object
	const updatedItem = {
		...originalItem,
		[priceType === 'buy' ? 'buy_price' : 'sell_price']: newPrice
	}

	// Only update if value changed
	const currentValue = priceType === 'buy' ? originalItem.buy_price : originalItem.sell_price
	if (newPrice !== currentValue) {
		// Set saving state for this specific price
		savingPriceId.value = originalItem.id
		savingPriceType.value = priceType

		try {
			await handleQuickEdit(updatedItem)
		} finally {
			// Clear saving state
			savingPriceId.value = null
			savingPriceType.value = null
		}
	}

	cancelEditPrice()
}

function cancelEditPrice() {
	editingPriceId.value = null
	editingPriceType.value = null
}

function isFromRecipePricing(shopItem) {
	return getEffectivePricingType(shopItem) === 'from_recipe'
}

function getStoredPricingType(shopItem) {
	if (!shopItem) return 'manual'
	return (
		shopItem.pricing_type ||
		(shopItem.buy_pricing_type === 'from_recipe' || shopItem.sell_pricing_type === 'from_recipe'
			? 'from_recipe'
			: 'manual')
	)
}

function getEffectivePricingType(shopItem) {
	const storedType = getStoredPricingType(shopItem)
	const hasUsableRecipe = hasUsableRecipeForPricing(shopItem)

	if (storedType === 'from_recipe') {
		if (!hasUsableRecipe) return 'base'
		return 'from_recipe'
	}
	if (storedType === 'base') return 'base'
	if (storedType === 'manual' && !hasUsableRecipe) {
		return 'base'
	}
	return storedType
}

function hasUsableRecipeForPricing(shopItem) {
	const guideItem =
		shopItem?.itemData ||
		(availableItems.value || []).find((item) => item.id === shopItem?.item_id)
	const recipe = guideItem ? getRecipeForItem(guideItem, serverVersionKey.value) : null
	const hasCircularRecipe = guideItem
		? hasCircularRecipeDependency(
				guideItem,
				guideItemsByMaterialId.value,
				serverVersionKey.value
			)
		: false
	return Boolean(recipe) && !hasCircularRecipe
}

function canComputeRecipePricesForPricingSwitch(shopItem) {
	if (!shopItem) return false

	const guideItem =
		shopItem.itemData || (availableItems.value || []).find((item) => item.id === shopItem.item_id)
	if (!guideItem) return false

	const byMaterialId = guideItemsByMaterialId.value || {}
	const byItemId = {}
	;(shopItems.value || []).forEach((si) => {
		if (si?.item_id) byItemId[si.item_id] = si
	})
	const currentItem = byItemId[shopItem.item_id]
	if (!currentItem) return false

	const buyResult = computeRecipePriceForShop(
		currentItem,
		guideItem,
		byItemId,
		byMaterialId,
		serverVersionKey.value,
		'buy'
	)
	const sellResult = computeRecipePriceForShop(
		currentItem,
		guideItem,
		byItemId,
		byMaterialId,
		serverVersionKey.value,
		'sell'
	)

	return (
		!buyResult.error &&
		!sellResult.error &&
		buyResult.price != null &&
		sellResult.price != null
	)
}

function canSwitchCustomToRecipe(shopItem) {
	if (!isServerShop.value || !shopItem?.id) return false
	return (
		getStoredPricingType(shopItem) === 'manual' &&
		hasUsableRecipeForPricing(shopItem) &&
		canComputeRecipePricesForPricingSwitch(shopItem)
	)
}

function canSwitchRecipeToCustom(shopItem) {
	if (!isServerShop.value || !shopItem?.id) return false
	return getStoredPricingType(shopItem) === 'from_recipe'
}

async function switchCustomToRecipe(shopItem) {
	if (!selectedShopId.value || !availableItems.value || !canSwitchCustomToRecipe(shopItem)) return
	switchingPricingItemId.value = shopItem.id
	error.value = null
	try {
		await updateShopItem(shopItem.id, {
			pricing_type: 'from_recipe',
			buy_pricing_type: 'from_recipe',
			sell_pricing_type: 'from_recipe'
		})
		const patchedShopItems = (shopItems.value || []).map((si) =>
			si.id === shopItem.id
				? {
						...si,
						pricing_type: 'from_recipe',
						buy_pricing_type: 'from_recipe',
						sell_pricing_type: 'from_recipe'
					}
				: si
		)
		await recalculateRecipePricesForShop(
			selectedShopId.value,
			patchedShopItems,
			availableItems.value,
			serverVersionKey.value
		)
	} catch (err) {
		console.error('Error switching pricing type to recipe:', err)
		error.value = err.message || 'Failed to switch pricing type. Please try again.'
	} finally {
		switchingPricingItemId.value = null
	}
}

async function switchRecipeToCustom(shopItem) {
	if (!canSwitchRecipeToCustom(shopItem)) return
	switchingPricingItemId.value = shopItem.id
	error.value = null
	try {
		await updateShopItem(shopItem.id, {
			pricing_type: 'manual',
			buy_pricing_type: 'manual',
			sell_pricing_type: 'manual'
		})
	} catch (err) {
		console.error('Error switching pricing type to custom:', err)
		error.value = err.message || 'Failed to switch pricing type. Please try again.'
	} finally {
		switchingPricingItemId.value = null
	}
}

function formatPriceDisplay(value) {
	if (value == null || value === '' || isNaN(Number(value)) || Number(value) === 0) return '—'
	return parseFloat(Number(value).toFixed(2)).toString()
}

// Inline notes editing functions
function startEditNotes(itemId) {
	editingNotesId.value = itemId
}

async function saveNotes(row, newNotes) {
	const originalItem = row._originalItem
	if (!originalItem || !originalItem.id) {
		cancelEditNotes()
		return
	}

	// Ensure newNotes is a string and trim it
	const newNotesTrimmed = String(newNotes || '').trim()

	// Normalize current value for comparison (handle null/undefined as empty string)
	const currentNotes = String(originalItem.notes || '').trim()

	// Only update if value changed
	if (newNotesTrimmed !== currentNotes) {
		// Set saving state for this specific notes
		savingNotesId.value = originalItem.id

		// Create updated item object
		const updatedItem = {
			...originalItem,
			notes: newNotesTrimmed
		}

		try {
			await handleQuickEdit(updatedItem)
		} finally {
			// Clear saving state
			savingNotesId.value = null
		}
	}

	// Always cancel edit mode after save completes (or if no change)
	cancelEditNotes()
}

function cancelEditNotes() {
	editingNotesId.value = null
}

// Toggle starred status
async function toggleStar(itemId, currentlyStarred) {
	try {
		await updateShopItem(itemId, { starred: !currentlyStarred })
	} catch (error) {
		console.error('Error toggling star:', error)
		error.value = error.message || 'Failed to update starred status. Please try again.'
	}
}

function openEditShopModal() {
	if (!selectedShop.value) return

	editingShop.value = selectedShop.value
	showEditShopModal.value = true
	shopFormError.value = null
	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopFormLoading.value = false
	shopForm.value = {
		name: selectedShop.value.name,
		player: selectedShop.value.player || '',
		server_id: selectedShop.value.server_id,
		location: selectedShop.value.location || '',
		description: selectedShop.value.description || '',
		is_own_shop: Boolean(selectedShop.value.is_own_shop),
		server_shop: Boolean(selectedShop.value.server_shop),
		owner_funds:
			selectedShop.value.owner_funds === null || selectedShop.value.owner_funds === undefined
				? null
				: selectedShop.value.owner_funds
	}
	usePlayerAsShopName.value = (selectedShop.value.player || '') === selectedShop.value.name
}

function closeEditShopModal() {
	showEditShopModal.value = false
	editingShop.value = null
	shopFormError.value = null
	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopFormLoading.value = false
	usePlayerAsShopName.value = false
	resetShopForm()
}

async function submitEditShop() {
	if (!editingShop.value) return

	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopFormError.value = null

	if (!shopForm.value.name.trim()) {
		shopNameValidationError.value = 'Shop name is required'
		return
	}

	if (!shopForm.value.is_own_shop && !shopForm.value.player.trim()) {
		shopPlayerValidationError.value = 'Player name is required'
		return
	}

	shopFormLoading.value = true

	try {
		const shopData = {
			name: shopForm.value.name.trim(),
			server_id: editingShop.value.server_id,
			location: shopForm.value.location?.trim() || '',
			description: shopForm.value.description?.trim() || '',
			is_own_shop: editingShop.value.is_own_shop,
			server_shop: shopForm.value.server_shop,
			owner_funds: editingShop.value.owner_funds
		}

		if (!shopForm.value.is_own_shop) {
			shopData.player = shopForm.value.player?.trim() || ''
		}

		await updateShop(editingShop.value.id, shopData)
		closeEditShopModal()
	} catch (err) {
		console.error('Error updating shop:', err)
		shopFormError.value = err.message || 'Failed to update shop. Please try again.'
	} finally {
		shopFormLoading.value = false
	}
}

// Server shop: export price list (JSON)
function exportShopPrices() {
	if (!selectedShop.value || !shopItems.value || !availableItems.value) return
	const rows = shopItems.value.map((si) => {
		const guide = availableItems.value.find((g) => g.id === si.item_id)
		return {
			item_name: guide?.name || si.item_id,
			category: guide?.category || '',
			buy_price: si.buy_price,
			sell_price: si.sell_price,
			pricing_type:
				si.pricing_type ||
				(si.buy_pricing_type === 'from_recipe' || si.sell_pricing_type === 'from_recipe'
					? 'from_recipe'
					: 'manual'),
			notes: si.notes || ''
		}
	})
	const blob = new Blob([JSON.stringify(rows, null, 2)], {
		type: 'application/json'
	})
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `${selectedShop.value.name || 'shop'}-prices.json`
	a.click()
	URL.revokeObjectURL(url)
}

function guideNameForItemId(itemId) {
	const g = availableItems.value?.find((i) => i.id === itemId)
	return g?.name || itemId
}

// Server shop: recalculate all from-recipe prices
async function recalculateRecipePrices() {
	if (!selectedShopId.value || !shopItems.value || !availableItems.value) return
	recalculateLoading.value = true
	recalculateResultSummary.value = null
	try {
		const { updated, errors } = await recalculateRecipePricesForShop(
			selectedShopId.value,
			shopItems.value,
			availableItems.value,
			serverVersionKey.value
		)
		recalculateResultSummary.value = { updated, errors, fetchError: null }
		showRecalculateResultsModal.value = true
	} catch (err) {
		recalculateResultSummary.value = {
			updated: [],
			errors: [],
			fetchError: err.message || 'Recalculation failed.'
		}
		showRecalculateResultsModal.value = true
	} finally {
		recalculateLoading.value = false
	}
}

const BULK_IMPORT_CHUNK_SIZE = 400

function triggerEconomyShopGuiImport() {
	importError.value = null
	importResultSummary.value = null
	showImportResultsModal.value = false
	economyShopGuiFileInput.value?.click()
}

async function onEconomyShopGuiFileSelected(event) {
	const file = event.target?.files?.[0]
	event.target.value = ''
	if (!file || !selectedShopId.value || !availableItems.value?.length) return
	importLoading.value = true
	importError.value = null
	importResultSummary.value = null
	showImportResultsModal.value = false
	try {
		const text = await file.text()
		const entries = parseEconomyShopGuiYaml(text)
		if (entries.length === 0) {
			importError.value = 'No valid items found in the YAML file. Expected structure: pages.page*.items.* with material, buy, sell.'
			return
		}
		const existingIds = (shopItems.value || []).map((s) => s.item_id)
		const { toAdd, unmapped, unmappedMissingCategory, skipped } = mapToGuideItems(
			entries,
			availableItems.value,
			existingIds,
			serverVersionKey.value
		)
		const serverMM = getMajorMinorVersion(selectedServer.value?.minecraft_version)
		let unmappedNewerThanServer = []
		let unmappedNotInDatabase = []
		let unmappedOther = []
		if (unmapped.length > 0) {
			try {
				const c = await classifyUnmappedImportMaterials(db, unmapped, serverMM)
				unmappedNewerThanServer = c.newerThanServer
				unmappedNotInDatabase = c.notInDatabase
				unmappedOther = c.otherUnmatched
			} catch (classifyErr) {
				console.warn('Could not classify unmapped import materials:', classifyErr)
				unmappedNotInDatabase = unmapped
			}
		}
		if (toAdd.length === 0) {
			importResultSummary.value = {
				imported: 0,
				skipped,
				unmapped,
				unmappedMissingCategory,
				serverMinecraftLabel: serverMM,
				unmappedNewerThanServer,
				unmappedNotInDatabase,
				unmappedOther,
				totalEntries: entries.length
			}
			showImportResultsModal.value = true
			return
		}
		let imported = 0
		for (let i = 0; i < toAdd.length; i += BULK_IMPORT_CHUNK_SIZE) {
			const chunk = toAdd.slice(i, i + BULK_IMPORT_CHUNK_SIZE)
			await bulkUpdateShopItems(selectedShopId.value, chunk)
			imported += chunk.length
		}
		importResultSummary.value = {
			imported,
			skipped,
			unmapped,
			unmappedMissingCategory,
			serverMinecraftLabel: serverMM,
			unmappedNewerThanServer,
			unmappedNotInDatabase,
			unmappedOther,
			totalEntries: entries.length
		}
		showImportResultsModal.value = true
	} catch (err) {
		importError.value = err.message || 'Import failed.'
	} finally {
		importLoading.value = false
	}
}

// Helper functions
function getServerName(serverId) {
	return servers.value?.find((server) => server.id === serverId)?.name || 'Unknown Server'
}
</script>

<template>
	<div class="p-4 pt-8">
		<!-- Back Button -->
		<div class="mb-4">
			<BaseButton
				variant="tertiary"
				data-cy="shop-items-back-button"
				@click="router.push('/shop-manager')">
				<template #left-icon>
					<ArrowLeftIcon />
				</template>
				Back to Shop Manager
			</BaseButton>
		</div>

		<div>
			<div v-if="selectedShop && selectedServer">
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-bold text-gray-900">
						{{ selectedShop.name }}
					</h1>
					<button
						type="button"
						data-cy="shop-items-edit-shop-button"
						@click="openEditShopModal"
						class="text-gray-700 hover:text-gray-900 transition-colors"
						aria-label="Edit shop">
						<PencilIcon class="w-5 h-5" />
					</button>
				</div>
				<div v-if="selectedShop.player" class="flex items-center gap-2 mt-2">
					<img
						:src="generateMinecraftAvatar(selectedShop.player)"
						:alt="selectedShop.player"
						class="w-6 h-6 rounded"
						@error="$event.target.style.display = 'none'" />
					<span class="text-lg font-semibold text-gray-600">
						{{ selectedShop.player }}
					</span>
				</div>
				<p v-if="selectedShop.description" class="text-gray-600 mt-1 max-w-2xl">
					{{ selectedShop.description }}
				</p>
				<div
					class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
					<span>
						<span class="font-medium">Server:</span>
						{{ getServerName(selectedShop.server_id) }}
					</span>
					<span>
						<span class="font-medium">Version:</span>
						{{ selectedServer.minecraft_version }}
					</span>
					<span v-if="selectedShop.location">
						<span class="font-medium">Location:</span>
						{{ selectedShop.location }}
					</span>
					<span v-if="selectedShop.created_at">
						<span class="font-medium">Created:</span>
						{{ new Date(selectedShop.created_at).toLocaleDateString() }}
					</span>
				</div>
			</div>
			<div v-else>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Shop Items</h1>
				<p class="text-gray-600">
					This shop couldn't be found. Return to the manager to pick another one.
				</p>
			</div>
		</div>

		<!-- Error message -->
		<div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
			{{ error }}
		</div>

		<!-- Loading state -->
		<div
			v-else-if="shops === null || servers === null"
			class="flex items-center justify-center py-12">
			<div class="flex flex-col items-center">
				<div
					class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-asparagus mb-4"></div>
				<p class="text-gray-600">Loading shops...</p>
			</div>
		</div>

		<div
			v-else-if="hasShops && hasServers && !selectedShop"
			class="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-4 text-yellow-800">
			<p class="font-semibold">Shop unavailable</p>
			<p class="text-sm mt-1">
				We couldn't find this shop in your list. Head back to
				<router-link to="/shop-manager" class="text-yellow-900 underline">
					Shop Manager
				</router-link>
				to choose another.
			</p>
		</div>

		<!-- Main content -->
		<div v-else-if="hasShops && hasServers && selectedShop">
			<input
				ref="economyShopGuiFileInput"
				type="file"
				accept=".yml,.yaml"
				class="hidden"
				aria-label="Import EconomyShopGUI YAML"
				@change="onEconomyShopGuiFileSelected" />
			<!-- Search + Settings/Export row (search left, actions right; homepage-style layout) -->
			<div class="mt-4 mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<!-- Left: Search (Admin Shop only when items exist) -->
				<div class="flex-1 sm:max-w-md">
					<template v-if="isServerShop">
						<div class="flex flex-row gap-2">
							<input
								id="admin-shop-item-search"
								type="text"
								v-model="searchQuery"
								data-cy="admin-shop-search-input"
								placeholder="Search for items..."
								class="border-2 border-gray-asparagus rounded px-3 py-2 w-full mb-1 h-10 flex-1" />
							<BaseButton
								@click="resetSearch"
								variant="tertiary"
								data-cy="admin-shop-reset-search-button"
								class="flex-shrink-0 h-10">
								<ArrowPathIcon class="w-4 h-4 sm:mr-1.5" />
								<span class="hidden sm:inline">Reset</span>
							</BaseButton>
						</div>
						<p class="text-xs text-gray-500 mt-1">
							Tip: Use commas to search multiple terms
						</p>
						<div v-if="searchQuery && getSearchTerms().length > 0" class="mt-2 text-sm text-gray-600">
							<span v-if="filteredItemCount > 0">
								Showing {{ filteredItemCount }} item{{ filteredItemCount === 1 ? '' : 's' }}
								matching "{{ searchQuery }}"
							</span>
							<span v-else>No items found matching "{{ searchQuery }}"</span>
						</div>
					</template>
				</div>
				<!-- Right: Settings, Export, Recalculate, Market Overview -->
				<div class="flex flex-wrap items-center gap-3 sm:ml-4 sm:flex-shrink-0">
					<BaseButton
						@click="showShopSettingsModal = true"
						variant="secondary"
						data-cy="shop-items-settings-button">
						<template #left-icon>
							<Cog6ToothIcon />
						</template>
						Settings
					</BaseButton>
					<template v-if="isServerShop">
						<BaseButton
							type="button"
							variant="secondary"
							:disabled="!shopItems?.length"
							data-cy="shop-items-export-button"
							@click="exportShopPrices">
							<template #left-icon>
								<ArrowDownTrayIcon class="w-4 h-4" />
							</template>
							Export
						</BaseButton>
						<p v-if="importError" class="text-sm text-red-700 basis-full">
							{{ importError }}
						</p>
					</template>
					<RouterLink
						v-if="selectedShop?.server_id && !selectedShop?.server_shop"
						:to="`/market-overview?serverId=${selectedShop.server_id}`">
						<BaseButton
							type="button"
							variant="tertiary"
							data-cy="shop-items-market-overview-button">
							<template #left-icon>
								<CurrencyDollarIcon class="w-4 h-4" />
							</template>
							Market Overview
						</BaseButton>
					</RouterLink>
				</div>
			</div>

			<CategoryFilters
				v-if="shopItems && shopItems.length > 0"
				:visible-categories="shopVisibleCategories"
				:search-query="searchQuery"
				:total-item-count="shopCategoryFilterTotalItemCount"
				:total-category-counts="shopTotalCategoryCounts"
				:all-categories-with-search="shopAllCategoriesWithSearch"
				:show-category-filters="showShopCategoryFilters"
				data-cy="shop-items-category-filters"
				@toggle-category="handleShopToggleCategory"
				@clear-all="handleShopClearCategories"
				@toggle-visibility="showShopCategoryFilters = !showShopCategoryFilters" />

			<!-- Add Item Button -->
			<div>
				<div
					v-if="shopItems && shopItems.length > 0"
					class="flex flex-col sm:flex-row justify-start gap-3">
					<BaseButton
						type="button"
						variant="primary"
						data-cy="shop-items-add-item-button"
						@click="showAddItemForm"
						:disabled="!selectedShop"
						class="w-full sm:w-auto justify-center sm:justify-start">
						<template #left-icon>
							<PlusIcon />
						</template>
						Add Item
					</BaseButton>
					<template v-if="isServerShop">
						<BaseButton
							type="button"
							variant="secondary"
							:disabled="importLoading || !availableItems?.length"
							data-cy="shop-items-import-economyshopgui-button"
							@click="triggerEconomyShopGuiImport">
							<template #left-icon>
								<ArrowUpTrayIcon class="w-4 h-4" :class="{ 'animate-spin': importLoading }" />
							</template>
							{{ importLoading ? 'Importing…' : 'Import YAML' }}
						</BaseButton>
						<BaseButton
							type="button"
							variant="secondary"
							:disabled="recalculateLoading || !shopItems?.length"
							data-cy="shop-items-recalculate-button"
							@click="recalculateRecipePrices">
							<template #left-icon>
								<ArrowPathIcon
									class="w-4 h-4"
									:class="{ 'animate-spin': recalculateLoading }" />
							</template>
							{{ recalculateLoading ? 'Recalculating…' : 'Recalculate recipe prices' }}
						</BaseButton>
					</template>
				</div>
			</div>

			<!-- Inventory -->
			<div class="mt-4">
				<div v-if="shopItems.length > 0" class="mb-4">
					<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-8">
						<!-- View Mode -->
						<div>
							<span class="text-sm font-medium text-heavy-metal block">View as:</span>
							<div
								class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden mt-1">
								<button
									data-cy="shop-items-view-mode-categories"
									@click="viewMode = 'categories'"
									:class="[
										viewMode === 'categories'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
									]">
									Categories
								</button>
								<button
									data-cy="shop-items-view-mode-list"
									@click="viewMode = 'list'"
									:class="[
										viewMode === 'list'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition'
									]">
									List
								</button>
							</div>
						</div>

						<!-- Layout -->
						<div>
							<span class="text-sm font-medium text-heavy-metal block">Layout:</span>
							<div
								class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden mt-1">
								<button
									data-cy="shop-items-layout-comfortable"
									@click="layout = 'comfortable'"
									:class="[
										layout === 'comfortable'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
									]">
									Comfortable
								</button>
								<button
									data-cy="shop-items-layout-compact"
									@click="layout = 'condensed'"
									:class="[
										layout === 'condensed'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition'
									]">
									Compact
								</button>
							</div>
						</div>

						<!-- Mark All as Checked -->
						<div v-if="!selectedShop.is_own_shop">
							<span
								class="text-sm font-medium text-heavy-metal block opacity-0 pointer-events-none">
								Actions:
							</span>
							<div>
								<BaseButton
									type="button"
									variant="secondary"
									data-cy="shop-items-mark-all-checked-button"
									@click="handleMarkAllAsChecked"
									:disabled="
										markingAsChecked || !shopItems || shopItems.length === 0
									"
									class="px-3 py-1.5 text-xs sm:text-sm">
									<template #left-icon>
										<ArrowPathIcon
											:class="[
												'w-4 h-4',
												markingAsChecked ? 'animate-spin' : ''
											]" />
									</template>
									{{
										markingAsChecked
											? 'Marking...'
											: 'Mark All as Price Checked Today'
									}}
								</BaseButton>
							</div>
						</div>
					</div>
				</div>

				<div v-if="shopItems && shopItems.length > 0" class="space-y-4">
					<!-- BaseTable Implementation (New) -->
					<div class="mb-8">
						<template v-if="viewMode === 'categories'">
							<div v-for="category in sortedCategoriesForDisplay" :key="category" class="mb-6">
								<BaseTable
									:columns="baseTableColumns"
									:rows="isServerShop && getSearchTerms().length > 0 ? (filteredBaseTableRowsByCategory[category] || []) : baseTableRowsByCategory[category]"
									row-key="id"
									:layout="layout"
									:hoverable="true"
									:caption="
										category.charAt(0).toUpperCase() +
										category.slice(1).toLowerCase()
									">
									<template #cell-item="{ row, layout }">
										<div
											class="flex items-center group"
											:class="[
												layout === 'condensed'
													? '-mx-2 -my-1 px-2 py-1'
													: '-mx-4 -my-3 px-4 py-3'
											]">
											<div
												v-if="row.image"
												:class="[
													layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8',
													'mr-3 flex-shrink-0'
												]">
												<img
													:src="
														getItemImageUrl(row.image, row.enchantments)
													"
													:alt="row.item"
													@error="
														$event.target.src = getImageUrl(row.image)
													"
													class="w-full h-full object-contain"
													loading="lazy" />
											</div>
											<div class="flex-1 min-w-0">
												<div
													class="font-medium text-gray-900 flex items-center justify-between flex-1 min-w-0 relative">
													<span
														:title="
															!showEnchantments &&
															row.enchantments &&
															row.enchantments.length > 0
																? formatEnchantmentsForTitle(
																		row.enchantments
																  )
																: ''
														">
														{{ row.item }}
													</span>
													<div
														class="flex items-center gap-2 ml-2 flex-shrink-0">
														<ArrowPathIcon
															v-if="showItemSavingSpinner === row.id"
															class="w-4 h-4 text-gray-500 animate-spin" />
														<button
															@click.stop="
																toggleStar(
																	row.id,
																	row._originalItem?.starred ||
																		false
																)
															"
															class="flex-shrink-0 transition-opacity"
															:class="{
																'opacity-0 group-hover:opacity-100':
																	!(
																		row._originalItem
																			?.starred || false
																	),
																'opacity-100':
																	row._originalItem?.starred ||
																	false
															}"
															:title="
																row._originalItem?.starred
																	? 'Unstar item'
																	: 'Star item'
															">
															<StarIcon
																v-if="row._originalItem?.starred"
																class="w-5 h-5 text-gray-asparagus" />
															<StarIconOutline
																v-else
																class="w-5 h-5 text-gray-asparagus" />
														</button>
													</div>
												</div>
												<!-- Enchantments Display -->
												<div
													v-if="
														showEnchantments &&
														row.enchantments &&
														row.enchantments.length > 0
													"
													class="mt-1 pb-1">
													<div class="flex flex-wrap gap-1">
														<span
															v-for="enchantmentId in row.enchantments"
															:key="enchantmentId"
															class="px-1 border border-gray-asparagus text-heavy-metal text-[10px] font-medium rounded uppercase leading-[1.6]">
															{{
																formatEnchantmentName(enchantmentId)
															}}
														</span>
													</div>
												</div>
											</div>
										</div>
									</template>
									<template #cell-pricingTypes="{ row }">
										<span
											class="inline-flex items-center justify-start gap-1 text-left">
											<PencilIcon
												v-if="row.pricingTypes === 'Base'"
												class="w-3.5 h-3.5 shrink-0 text-highland"
												aria-hidden="true" />
											<PencilIcon
												v-if="row.pricingTypes === 'Custom'"
												class="w-3.5 h-3.5 shrink-0 text-highland"
												aria-hidden="true" />
											<Squares2X2Icon
												v-if="row.pricingTypes === 'Recipe'"
												class="w-3.5 h-3.5 shrink-0 text-highland"
												aria-hidden="true" />
											{{ row.pricingTypes }}
											<BaseIconButton
												v-if="canSwitchCustomToRecipe(row._originalItem)"
												variant="ghost-in-table"
												aria-label="Switch to recipe pricing"
												title="Switch to recipe pricing"
												:loading="switchingPricingItemId === row._originalItem?.id"
												:disabled="
													switchingPricingItemId === row._originalItem?.id
												"
												@click.stop="switchCustomToRecipe(row._originalItem)">
												<ArrowPathRoundedSquareIcon />
											</BaseIconButton>
											<BaseIconButton
												v-if="canSwitchRecipeToCustom(row._originalItem)"
												variant="ghost-in-table"
												aria-label="Switch to custom pricing"
												title="Switch to custom pricing"
												:loading="switchingPricingItemId === row._originalItem?.id"
												:disabled="
													switchingPricingItemId === row._originalItem?.id
												"
												@click.stop="switchRecipeToCustom(row._originalItem)">
												<ArrowPathRoundedSquareIcon />
											</BaseIconButton>
										</span>
									</template>
									<template #cell-buyPrice="{ row, layout }">
										<div class="flex items-center justify-end gap-2">
											<div
												v-if="row._originalItem?.stock_quantity === 0"
												class="flex-shrink-0 mr-auto"
												title="Out of stock">
												<ArchiveBoxXMarkIcon
													class="w-5 h-5 text-current"
													aria-label="Out of stock" />
												<span class="sr-only">Out of stock</span>
											</div>
											<template v-if="isFromRecipePricing(row._originalItem)">
												<span
													:class="[
														'text-right text-gray-600',
														row._originalItem?.stock_quantity === 0 &&
															'line-through'
													]">
													{{
														formatPriceDisplay(
															row._originalItem?.buy_price
														)
													}}
												</span>
											</template>
											<InlinePriceInput
												v-else
												:value="row._originalItem?.buy_price"
												:layout="layout"
												:is-editing="
													editingPriceId === row.id &&
													editingPriceType === 'buy'
												"
												:is-saving="
													savingPriceId === row.id &&
													savingPriceType === 'buy'
												"
												:strikethrough="
													row._originalItem?.stock_quantity === 0
												"
												@update:is-editing="
													(val) => {
														if (val) startEditPrice(row.id, 'buy')
														else cancelEditPrice()
													}
												"
												@save="
													(newPrice) => savePrice(row, 'buy', newPrice)
												"
												@cancel="cancelEditPrice" />
										</div>
									</template>
									<template #cell-sellPrice="{ row, layout }">
										<div class="flex items-center justify-end gap-2">
											<div
												v-if="
													row._originalItem?.stock_full ||
													(isShopOutOfMoney &&
														row._originalItem?.sell_price > 0)
												"
												class="flex-shrink-0 mr-auto"
												:title="
													isShopOutOfMoney &&
													row._originalItem?.sell_price > 0
														? 'Shop owner has run out of money'
														: 'Stock full'
												">
												<WalletIcon
													v-if="
														isShopOutOfMoney &&
														row._originalItem?.sell_price > 0
													"
													class="w-5 h-5 text-current"
													aria-label="Shop owner has run out of money" />
												<ArchiveBoxIcon
													v-else-if="row._originalItem?.stock_full"
													class="w-5 h-5 text-current"
													aria-label="Stock full" />
												<span class="sr-only">
													{{
														isShopOutOfMoney &&
														row._originalItem?.sell_price > 0
															? 'Shop owner has run out of money'
															: 'Stock full'
													}}
												</span>
											</div>
											<template v-if="isFromRecipePricing(row._originalItem)">
												<span
													:class="[
														'text-right text-gray-600',
														(row._originalItem?.stock_full ||
															(isShopOutOfMoney &&
																row._originalItem?.sell_price >
																	0)) &&
															'line-through'
													]">
													{{
														formatPriceDisplay(
															row._originalItem?.sell_price
														)
													}}
												</span>
											</template>
											<InlinePriceInput
												v-else
												:value="row._originalItem?.sell_price"
												:layout="layout"
												:is-editing="
													editingPriceId === row.id &&
													editingPriceType === 'sell'
												"
												:is-saving="
													savingPriceId === row.id &&
													savingPriceType === 'sell'
												"
												:strikethrough="
													row._originalItem?.stock_full ||
													(isShopOutOfMoney &&
														row._originalItem?.sell_price > 0)
												"
												@update:is-editing="
													(val) => {
														if (val) startEditPrice(row.id, 'sell')
														else cancelEditPrice()
													}
												"
												@save="
													(newPrice) => savePrice(row, 'sell', newPrice)
												"
												@cancel="cancelEditPrice" />
										</div>
									</template>
									<template #cell-notes="{ row, layout }">
										<InlineNotesInput
											:value="row._originalItem?.notes || ''"
											:layout="layout"
											:is-editing="editingNotesId === row.id"
											:is-saving="savingNotesId === row.id"
											@update:is-editing="
												(val) => {
													if (val) startEditNotes(row.id)
													else if (savingNotesId !== row.id)
														cancelEditNotes()
												}
											"
											@save="(newNotes) => saveNotes(row, newNotes)"
											@cancel="cancelEditNotes" />
									</template>
									<template #cell-lastUpdated="{ row }">
										<div class="flex items-center justify-end gap-2">
											<span>{{ row.lastUpdated }}</span>
											<BaseIconButton
												v-if="!selectedShop.is_own_shop"
												variant="ghost-in-table"
												data-cy="shop-item-mark-checked-button"
												:ariaLabel="'Mark as price checked today'"
												title="Mark as price checked today"
												:loading="markingItemId === row._originalItem?.id"
												@click="
													handleMarkItemAsChecked(row._originalItem?.id)
												"
												:disabled="markingItemId === row._originalItem?.id">
												<ArrowPathIcon />
											</BaseIconButton>
										</div>
									</template>
									<template #cell-actions="{ row, layout }">
										<div
											class="flex items-center justify-end gap-2 px-3"
											:class="[layout === 'condensed' ? '-mx-2' : '-mx-4']">
											<BaseIconButton
												variant="primary"
												data-cy="shop-item-edit-button"
												aria-label="Edit item"
												@click="showEditItemForm(row._originalItem)">
												<PencilIcon />
											</BaseIconButton>
											<BaseIconButton
												variant="primary"
												data-cy="shop-item-delete-button"
												aria-label="Delete item"
												@click="handleItemDelete(row._originalItem)">
												<TrashIcon />
											</BaseIconButton>
										</div>
									</template>
								</BaseTable>
							</div>
						</template>

						<template v-else>
							<BaseTable
								:columns="baseTableColumns"
								:rows="listRowsForDisplay"
								row-key="id"
								:layout="layout"
								:hoverable="true">
								<template #cell-item="{ row, layout }">
									<div
										class="flex items-center group"
										:class="[
											layout === 'condensed'
												? '-mx-2 -my-1 px-2 py-1'
												: '-mx-4 -my-3 px-4 py-3'
										]">
										<div
											v-if="row.image"
											:class="[
												layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8',
												'mr-3 flex-shrink-0'
											]">
											<img
												:src="getItemImageUrl(row.image, row.enchantments)"
												:alt="row.item"
												@error="$event.target.src = getImageUrl(row.image)"
												class="w-full h-full object-contain"
												loading="lazy" />
										</div>
										<div class="flex-1 min-w-0">
											<div
												class="font-medium text-gray-900 flex items-center justify-between flex-1 min-w-0 relative">
												<span
													:title="
														!showEnchantments &&
														row.enchantments &&
														row.enchantments.length > 0
															? formatEnchantmentsForTitle(
																	row.enchantments
															  )
															: ''
													">
													{{ row.item }}
												</span>
												<div
													class="flex items-center gap-2 ml-2 flex-shrink-0">
													<ArrowPathIcon
														v-if="showItemSavingSpinner === row.id"
														class="w-4 h-4 text-gray-500 animate-spin" />
													<button
														@click.stop="
															toggleStar(
																row.id,
																row._originalItem?.starred || false
															)
														"
														class="flex-shrink-0 transition-opacity"
														:class="{
															'opacity-0 group-hover:opacity-100': !(
																row._originalItem?.starred || false
															),
															'opacity-100':
																row._originalItem?.starred || false
														}"
														:title="
															row._originalItem?.starred
																? 'Unstar item'
																: 'Star item'
														">
														<StarIcon
															v-if="row._originalItem?.starred"
															class="w-5 h-5 text-gray-asparagus" />
														<StarIconOutline
															v-else
															class="w-5 h-5 text-gray-asparagus" />
													</button>
												</div>
											</div>
											<!-- Enchantments Display -->
											<div
												v-if="
													showEnchantments &&
													row.enchantments &&
													row.enchantments.length > 0
												"
												class="mt-1 pb-1">
												<div class="flex flex-wrap gap-1">
													<span
														v-for="enchantmentId in row.enchantments"
														:key="enchantmentId"
														class="px-1 border border-gray-asparagus text-heavy-metal text-[10px] font-medium rounded uppercase leading-[1.6]">
														{{ formatEnchantmentName(enchantmentId) }}
													</span>
												</div>
											</div>
										</div>
									</div>
								</template>
								<template #cell-pricingTypes="{ row }">
									<span
										class="inline-flex items-center justify-start gap-1 text-left">
										<PencilIcon
											v-if="row.pricingTypes === 'Base'"
											class="w-3.5 h-3.5 shrink-0 text-highland"
											aria-hidden="true" />
										<PencilIcon
											v-if="row.pricingTypes === 'Custom'"
											class="w-3.5 h-3.5 shrink-0 text-highland"
											aria-hidden="true" />
										<Squares2X2Icon
											v-if="row.pricingTypes === 'Recipe'"
											class="w-3.5 h-3.5 shrink-0 text-highland"
											aria-hidden="true" />
										{{ row.pricingTypes }}
										<BaseIconButton
											v-if="canSwitchCustomToRecipe(row._originalItem)"
											variant="ghost-in-table"
											aria-label="Switch to recipe pricing"
											title="Switch to recipe pricing"
											:loading="switchingPricingItemId === row._originalItem?.id"
											:disabled="switchingPricingItemId === row._originalItem?.id"
											@click.stop="switchCustomToRecipe(row._originalItem)">
											<ArrowPathRoundedSquareIcon />
										</BaseIconButton>
										<BaseIconButton
											v-if="canSwitchRecipeToCustom(row._originalItem)"
											variant="ghost-in-table"
											aria-label="Switch to custom pricing"
											title="Switch to custom pricing"
											:loading="switchingPricingItemId === row._originalItem?.id"
											:disabled="switchingPricingItemId === row._originalItem?.id"
											@click.stop="switchRecipeToCustom(row._originalItem)">
											<ArrowPathRoundedSquareIcon />
										</BaseIconButton>
									</span>
								</template>
								<template #cell-buyPrice="{ row, layout }">
									<div class="flex items-center justify-end gap-2">
										<div
											v-if="row._originalItem?.stock_quantity === 0"
											class="flex-shrink-0 mr-auto"
											title="Out of stock">
											<ArchiveBoxXMarkIcon
												class="w-5 h-5 text-current"
												aria-label="Out of stock" />
											<span class="sr-only">Out of stock</span>
										</div>
										<template v-if="isFromRecipePricing(row._originalItem)">
											<span
												:class="[
													'text-right text-gray-600',
													row._originalItem?.stock_quantity === 0 &&
														'line-through'
												]">
												{{
													formatPriceDisplay(row._originalItem?.buy_price)
												}}
											</span>
										</template>
										<InlinePriceInput
											v-else
											:value="row._originalItem?.buy_price"
											:layout="layout"
											:is-editing="
												editingPriceId === row.id &&
												editingPriceType === 'buy'
											"
											:is-saving="
												savingPriceId === row.id &&
												savingPriceType === 'buy'
											"
											:strikethrough="row._originalItem?.stock_quantity === 0"
											@update:is-editing="
												(val) => {
													if (val) startEditPrice(row.id, 'buy')
													else cancelEditPrice()
												}
											"
											@save="(newPrice) => savePrice(row, 'buy', newPrice)"
											@cancel="cancelEditPrice" />
									</div>
								</template>
								<template #cell-sellPrice="{ row, layout }">
									<div class="flex items-center justify-end gap-2">
										<div
											v-if="
												row._originalItem?.stock_full ||
												(isShopOutOfMoney &&
													row._originalItem?.sell_price > 0)
											"
											class="flex-shrink-0 mr-auto"
											:title="
												isShopOutOfMoney &&
												row._originalItem?.sell_price > 0
													? 'Shop owner has run out of money'
													: 'Stock full'
											">
											<WalletIcon
												v-if="
													isShopOutOfMoney &&
													row._originalItem?.sell_price > 0
												"
												class="w-5 h-5 text-current"
												aria-label="Shop owner has run out of money" />
											<ArchiveBoxIcon
												v-else-if="row._originalItem?.stock_full"
												class="w-5 h-5 text-current"
												aria-label="Stock full" />
											<span class="sr-only">
												{{
													isShopOutOfMoney &&
													row._originalItem?.sell_price > 0
														? 'Shop owner has run out of money'
														: 'Stock full'
												}}
											</span>
										</div>
										<template v-if="isFromRecipePricing(row._originalItem)">
											<span
												:class="[
													'text-right text-gray-600',
													(row._originalItem?.stock_full ||
														(isShopOutOfMoney &&
															row._originalItem?.sell_price > 0)) &&
														'line-through'
												]">
												{{
													formatPriceDisplay(
														row._originalItem?.sell_price
													)
												}}
											</span>
										</template>
										<InlinePriceInput
											v-else
											:value="row._originalItem?.sell_price"
											:layout="layout"
											:is-editing="
												editingPriceId === row.id &&
												editingPriceType === 'sell'
											"
											:is-saving="
												savingPriceId === row.id &&
												savingPriceType === 'sell'
											"
											:strikethrough="
												row._originalItem?.stock_full ||
												(isShopOutOfMoney &&
													row._originalItem?.sell_price > 0)
											"
											@update:is-editing="
												(val) => {
													if (val) startEditPrice(row.id, 'sell')
													else cancelEditPrice()
												}
											"
											@save="(newPrice) => savePrice(row, 'sell', newPrice)"
											@cancel="cancelEditPrice" />
									</div>
								</template>
								<template #cell-notes="{ row, layout }">
									<InlineNotesInput
										:value="row._originalItem?.notes || ''"
										:layout="layout"
										:is-editing="editingNotesId === row.id"
										:is-saving="savingNotesId === row.id"
										@update:is-editing="
											(val) => {
												if (val) startEditNotes(row.id)
												else if (savingNotesId !== row.id) cancelEditNotes()
											}
										"
										@save="(newNotes) => saveNotes(row, newNotes)"
										@cancel="cancelEditNotes" />
								</template>
								<template #cell-lastUpdated="{ row }">
									<div class="flex items-center justify-end gap-2">
										<span>{{ row.lastUpdated }}</span>
										<BaseIconButton
											v-if="!selectedShop.is_own_shop"
											variant="ghost-in-table"
											:ariaLabel="'Mark as price checked today'"
											title="Mark as price checked today"
											:loading="markingItemId === row._originalItem?.id"
											@click="handleMarkItemAsChecked(row._originalItem?.id)"
											:disabled="markingItemId === row._originalItem?.id">
											<ArrowPathIcon />
										</BaseIconButton>
									</div>
								</template>
								<template #cell-actions="{ row, layout }">
									<div
										class="flex items-center justify-end gap-2 px-3"
										:class="[layout === 'condensed' ? '-mx-2' : '-mx-4']">
										<BaseIconButton
											variant="primary"
											aria-label="Edit item"
											@click="showEditItemForm(row._originalItem)">
											<PencilIcon />
										</BaseIconButton>
										<BaseIconButton
											variant="primary"
											aria-label="Delete item"
											@click="handleItemDelete(row._originalItem)">
											<TrashIcon />
										</BaseIconButton>
									</div>
								</template>
							</BaseTable>
						</template>
					</div>
				</div>

				<div
					v-else
					class="bg-white rounded-lg pt-6 pr-6 pb-6"
					data-cy="shop-items-empty-state">
					<div class="text-gray-600">
						<p class="text-lg font-medium mb-2">No items in this shop yet</p>
						<p class="text-sm">Add or import items to get started with your shop.</p>
					</div>
				</div>

				<!-- Add Item Button (below tables) -->
				<div class="mt-4 flex flex-row flex-wrap items-start gap-2">
					<div class="flex flex-col items-start gap-4">
						<BaseButton
							type="button"
							variant="primary"
							data-cy="shop-items-add-item-button-bottom"
							@click="showAddItemForm"
							:disabled="!selectedShop">
							<template #left-icon>
								<PlusIcon />
							</template>
							Add items
						</BaseButton>
						<button
							v-if="shopItems && shopItems.length > 0"
							type="button"
							class="flex items-center gap-1.5 text-sm text-gray-asparagus hover:text-highland hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
							:disabled="clearAllItemsLoading"
							data-cy="shop-items-clear-all-button"
							@click="openClearAllModal">
							<TrashIcon class="w-4 h-4 flex-shrink-0" />
							{{ clearAllItemsLoading ? 'Clearing…' : 'Clear all items' }}
						</button>
					</div>
					<BaseButton
						v-if="isServerShop && (!shopItems || shopItems.length === 0)"
						type="button"
						variant="secondary"
						:disabled="importLoading || !availableItems?.length"
						data-cy="shop-items-import-economyshopgui-button-empty"
						@click="triggerEconomyShopGuiImport"
						class="self-start">
						<template #left-icon>
							<ArrowUpTrayIcon class="w-4 h-4" :class="{ 'animate-spin': importLoading }" />
						</template>
						{{ importLoading ? 'Importing…' : 'Import YAML' }}
					</BaseButton>
				</div>
			</div>
		</div>
	</div>

	<ShopFormModal
		:isOpen="showEditShopModal"
		:editingShop="editingShop"
		v-model:shopForm="shopForm"
		v-model:usePlayerAsShopName="usePlayerAsShopName"
		:loading="shopFormLoading"
		:errors="{
			name: shopNameValidationError,
			player: shopPlayerValidationError,
			server: shopServerValidationError,
			create: null,
			edit: shopFormError
		}"
		:servers="servers"
		@submit="submitEditShop"
		@close="closeEditShopModal" />

	<BaseModal
		:isOpen="showAddForm"
		:title="editingItem ? 'Edit Shop Item' : 'Add Shop Item'"
		maxWidth="max-w-2xl"
		:closeOnBackdrop="false"
		data-cy="shop-item-form-modal"
		@close="cancelForm">
		<ShopItemForm
			ref="shopItemForm"
			:available-items="availableItemsForAdding"
			:editing-item="editingItem"
			:existing-item-ids="existingItemIdsInShop"
			:server="selectedServer"
			:shop="selectedShop"
			:shop-items-for-recipe="shopItems || []"
			:server-version-key="serverVersionKey"
			display-variant="modal"
			@submit="handleItemSubmit"
			@cancel="cancelForm" />
		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<BaseButton
						type="button"
						variant="tertiary"
						data-cy="shop-item-form-cancel-button"
						@click="cancelForm">
						Cancel
					</BaseButton>
					<BaseButton
						type="button"
						variant="primary"
						data-cy="shop-item-form-submit-button"
						:disabled="loading || !shopItemForm?.isFormValid"
						@click="shopItemForm?.submit()">
						{{
							loading
								? 'Saving...'
								: editingItem
								? 'Update Item'
								: shopItemForm?.selectedItemsCount > 1
								? `Add ${shopItemForm.selectedItemsCount} Items`
								: 'Add Item'
						}}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>

	<!-- prettier-ignore -->
	<BaseModal
		:isOpen="showDeleteItemModal"
		title="Delete Item"
		size="small"
		data-cy="shop-item-delete-modal"
		@close="showDeleteItemModal = false; itemPendingDelete = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Remove
					<span class="font-semibold">
						{{ itemPendingDelete?.itemData?.name || 'this item' }}
					</span>
					from your shop?
				</h3>
				<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<!-- prettier-ignore -->
					<button
						type="button"
						class="btn-secondary--outline"
						data-cy="shop-item-delete-cancel-button"
						@click="showDeleteItemModal = false; itemPendingDelete = null">
						Cancel
					</button>
					<BaseButton
						type="button"
						variant="primary"
						data-cy="shop-item-delete-confirm-button"
						class="bg-semantic-danger hover:bg-opacity-90"
						:disabled="loading"
						@click="confirmDeleteItem">
						{{ loading ? 'Deleting...' : 'Delete' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>

	<!-- Clear All Items confirmation -->
	<BaseModal
		:isOpen="showClearAllModal"
		title="Clear All Items"
		size="small"
		data-cy="shop-items-clear-all-modal"
		@close="closeClearAllModal">
		<div class="space-y-4">
			<div>
				<p class="font-normal text-gray-900">
					Are you sure you want to clear <strong>ALL</strong> items from this shop?
				</p>
				<p class="text-sm text-gray-600 mt-2">
					This action cannot be undone and will permanently delete all
					{{ shopItems?.length || 0 }} item{{ (shopItems?.length || 0) === 1 ? '' : 's' }}.
				</p>
			</div>
		</div>
		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<button
						type="button"
						class="btn-secondary--outline"
						data-cy="shop-items-clear-all-cancel-button"
						@click="closeClearAllModal">
						Cancel
					</button>
					<BaseButton
						type="button"
						variant="primary"
						data-cy="shop-items-clear-all-confirm-button"
						class="bg-semantic-danger hover:bg-opacity-90"
						:disabled="clearAllItemsLoading"
						@click="confirmClearAllItems">
						{{ clearAllItemsLoading ? 'Clearing…' : 'Clear All' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>

	<!-- Shop Settings Modal -->
	<BaseModal
		:isOpen="showShopSettingsModal"
		title="Settings"
		size="normal"
		maxWidth="max-w-md"
		data-cy="shop-items-settings-modal"
		@close="showShopSettingsModal = false">
		<div class="space-y-4">
			<div>
				<h3 class="text-sm font-semibold text-gray-900 mb-3">Shop settings</h3>
				<div class="space-y-3">
					<div v-if="!selectedShop?.is_own_shop" class="space-y-1">
						<label class="flex items-center gap-2 text-sm font-semibold text-gray-800">
							<input
								type="checkbox"
								data-cy="shop-items-fully-cataloged-checkbox"
								class="checkbox-input"
								:checked="isShopFullyCataloged"
								:disabled="catalogStatusLoading"
								@change="handleCatalogStatusChange($event.target.checked)" />
							<span class="flex items-center gap-1">
								Shop is fully cataloged
								<ClipboardDocumentCheckIcon class="w-4 h-4 text-gray-700" />
							</span>
						</label>
						<p v-if="catalogStatusError" class="text-sm text-red-700">
							{{ catalogStatusError }}
						</p>
					</div>
					<div v-if="!selectedShop?.is_own_shop">
						<label
							class="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
							<input
								data-cy="shop-items-out-of-money-checkbox"
								:checked="isShopOutOfMoney"
								@change="handleOutOfMoneyChange($event.target.checked)"
								type="checkbox"
								class="checkbox-input" />
							<span class="flex items-center gap-1">
								Shop owner has run out of money
								<WalletIcon class="w-4 h-4 text-gray-700" />
							</span>
						</label>
					</div>
					<div>
						<label
							class="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
							<input
								data-cy="shop-items-archive-checkbox"
								:checked="isShopArchived"
								@change="handleArchiveChange($event.target.checked)"
								type="checkbox"
								class="checkbox-input" />
							<span>Archive this shop</span>
						</label>
					</div>
				</div>
			</div>
			<div class="pt-4">
				<h3 class="text-sm font-semibold text-gray-900 mb-3">Items list</h3>
				<div class="space-y-3">
					<label
						class="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
						<input
							data-cy="shop-items-hide-enchantments-checkbox"
							:checked="!showEnchantments"
							@change="showEnchantments = !$event.target.checked"
							type="checkbox"
							class="checkbox-input" />
						<span>Hide enchantments</span>
					</label>
					<label
						v-if="!selectedShop?.server_shop"
						class="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
						<input
							data-cy="shop-items-hide-out-of-stock-checkbox"
							:checked="hideOutOfStock"
							@change="hideOutOfStock = $event.target.checked"
							type="checkbox"
							class="checkbox-input" />
						<span>Hide out of stock</span>
					</label>
				</div>
			</div>
		</div>
	</BaseModal>

	<BaseModal
		:isOpen="showImportResultsModal"
		title="Import results"
		size="normal"
		maxWidth="max-w-2xl"
		data-cy="shop-items-import-results-modal"
		@close="showImportResultsModal = false">
		<div v-if="importResultSummary" class="space-y-4">
			<p class="text-sm text-gray-700">
				Processed {{ importResultSummary.totalEntries }} YAML
				entry{{ importResultSummary.totalEntries === 1 ? '' : 'ies' }}.
			</p>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div class="rounded border border-green-200 bg-green-50 px-3 py-2">
					<p class="text-xs font-semibold uppercase tracking-wide text-green-700">Imported</p>
					<p class="text-lg font-bold text-green-800">{{ importResultSummary.imported }}</p>
				</div>
				<div class="rounded border border-amber-200 bg-amber-50 px-3 py-2">
					<p class="text-xs font-semibold uppercase tracking-wide text-amber-700">
						Skipped (already in shop)
					</p>
					<p class="text-lg font-bold text-amber-800">{{ importResultSummary.skipped }}</p>
				</div>
				<div class="rounded border border-red-200 bg-red-50 px-3 py-2">
					<p class="text-xs font-semibold uppercase tracking-wide text-red-700">Not imported</p>
					<p class="text-lg font-bold text-red-800">
						{{
							(importResultSummary.unmapped || []).length +
							(importResultSummary.unmappedMissingCategory || []).length
						}}
					</p>
				</div>
			</div>
			<p class="text-xs text-gray-500">
				<strong class="font-medium text-gray-600">Skipped</strong> counts rows that were already in
				this shop. <strong class="font-medium text-gray-600">Not imported</strong> counts YAML lines
				that could not be added (no guide match, or guide item missing a category).
			</p>
			<div v-if="importResultSummary.unmapped.length > 0" class="space-y-4">
				<p v-if="importResultSummary.serverMinecraftLabel" class="text-sm text-gray-700">
					This shop's server runs Minecraft
					<strong>{{ importResultSummary.serverMinecraftLabel }}</strong>. Only guide items for that
					version can be added here, so YAML entries for blocks from a newer Minecraft version are
					not imported.
				</p>
				<div
					v-if="(importResultSummary.unmappedNewerThanServer || []).length > 0"
					class="space-y-2">
					<p class="text-sm font-semibold text-gray-900">
						Not available in Minecraft {{ importResultSummary.serverMinecraftLabel }}
					</p>
					<p class="text-xs text-gray-600">
						These materials are in the database for a newer Minecraft version than this server, so
						they are not offered for this shop.
					</p>
					<div class="max-h-40 overflow-y-auto rounded border border-amber-200 bg-amber-50 p-3">
						<ul class="text-sm text-gray-800 list-disc list-inside space-y-1">
							<li
								v-for="row in importResultSummary.unmappedNewerThanServer.slice(0, 30)"
								:key="row.material">
								<span class="font-mono">{{ row.material }}</span>
								<span class="text-gray-600">
									(Minecraft {{ row.itemVersion }})
								</span>
							</li>
						</ul>
					</div>
				</div>
				<div
					v-if="(importResultSummary.unmappedNotInDatabase || []).length > 0"
					class="space-y-2">
					<p class="text-sm font-semibold text-gray-900">Not found in the item database</p>
					<p class="text-xs text-gray-600">
						No matching guide item for this material id (check spelling or modded names).
					</p>
					<div class="max-h-32 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3">
						<p class="text-sm text-gray-700 break-words font-mono">
							{{ importResultSummary.unmappedNotInDatabase.slice(0, 30).join(', ') }}
						</p>
					</div>
				</div>
				<div v-if="(importResultSummary.unmappedOther || []).length > 0" class="space-y-2">
					<p class="text-sm font-semibold text-gray-900">Could not match to the guide</p>
					<p class="text-xs text-gray-600">
						These exist in the database for this Minecraft version but did not match the import list
						(often a different material id than the YAML name).
					</p>
					<div class="max-h-32 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3">
						<p class="text-sm text-gray-700 break-words font-mono">
							{{ importResultSummary.unmappedOther.slice(0, 30).join(', ') }}
						</p>
					</div>
				</div>
			</div>
			<div
				v-if="(importResultSummary.unmappedMissingCategory || []).length > 0"
				class="space-y-2 rounded border border-red-100 bg-red-50/50 p-3">
				<p class="text-sm font-semibold text-gray-900">Missing category in guide</p>
				<p class="text-xs text-gray-600">
					These materials matched a guide item, but that item has no category or is Uncategorized,
					so it was not imported.
				</p>
				<div class="max-h-32 overflow-y-auto rounded border border-red-200 bg-white p-3">
					<ul class="text-sm text-gray-800 list-disc list-inside space-y-1">
						<li
							v-for="mat in (importResultSummary.unmappedMissingCategory || []).slice(0, 30)"
							:key="mat">
							<span class="font-mono">{{ mat }}</span>
							<span class="text-gray-500"> — Missing category in guide</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
		<template #footer>
			<div class="flex items-center justify-end p-4">
				<BaseButton
					type="button"
					variant="primary"
					data-cy="shop-items-import-results-close-button"
					@click="showImportResultsModal = false">
					Close
				</BaseButton>
			</div>
		</template>
	</BaseModal>

	<BaseModal
		:isOpen="showRecalculateResultsModal"
		title="Recipe price recalculation"
		size="normal"
		maxWidth="max-w-2xl"
		data-cy="shop-items-recalculate-results-modal"
		@close="showRecalculateResultsModal = false">
		<div v-if="recalculateResultSummary" class="space-y-4">
			<div
				v-if="recalculateResultSummary.fetchError"
				class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
				{{ recalculateResultSummary.fetchError }}
			</div>
			<template v-else>
				<p
					v-if="
						recalculateResultSummary.updated.length === 0 &&
						recalculateResultSummary.errors.length === 0
					"
					class="text-sm text-gray-700">
					No recipe-based prices were updated. This shop may have no items using
					<strong>from recipe</strong> pricing, or costs did not change.
				</p>
				<div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="rounded border border-green-200 bg-green-50 px-3 py-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-green-700">
							Prices updated
						</p>
						<p class="text-lg font-bold text-green-800">
							{{ recalculateResultSummary.updated.length }}
						</p>
					</div>
					<div class="rounded border border-amber-200 bg-amber-50 px-3 py-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-amber-800">Issues</p>
						<p class="text-lg font-bold text-amber-900">
							{{ recalculateResultSummary.errors.length }}
						</p>
					</div>
				</div>
				<div v-if="recalculateResultSummary.updated.length > 0" class="space-y-2">
					<p class="text-sm font-semibold text-gray-900">Updated items</p>
					<div class="max-h-48 overflow-y-auto rounded border border-green-100 bg-white p-3">
						<ul class="text-sm text-gray-800 list-disc list-inside space-y-1">
							<li
								v-for="row in recalculateResultSummary.updated.slice(0, 50)"
								:key="row.id">
								{{ guideNameForItemId(row.item_id) }}
								<span
									v-if="row.buy_price != null || row.sell_price != null"
									class="text-gray-600">
									(buy {{ row.buy_price ?? '—' }}, sell {{ row.sell_price ?? '—' }})
								</span>
							</li>
						</ul>
					</div>
				</div>
				<div v-if="recalculateResultSummary.errors.length > 0" class="space-y-2">
					<p class="text-sm font-semibold text-gray-900">Could not recalculate</p>
					<div class="max-h-40 overflow-y-auto rounded border border-amber-200 bg-amber-50/50 p-3">
						<ul class="text-sm text-gray-800 list-disc list-inside space-y-2">
							<li
								v-for="(err, idx) in recalculateResultSummary.errors.slice(0, 30)"
								:key="idx">
								<span class="font-medium">{{ err.name || guideNameForItemId(err.item_id) }}</span>
								<span class="text-red-700"> — {{ err.error }}</span>
							</li>
						</ul>
					</div>
				</div>
			</template>
		</div>
		<template #footer>
			<div class="flex items-center justify-end p-4">
				<BaseButton
					type="button"
					variant="primary"
					data-cy="shop-items-recalculate-results-close-button"
					@click="showRecalculateResultsModal = false">
					Close
				</BaseButton>
			</div>
		</template>
	</BaseModal>

	<button
		v-if="showBackToTop"
		type="button"
		class="fixed bottom-6 right-6 z-50 bg-amulet text-white p-3 opacity-50 hover:opacity-100 transition-all duration-200 flex items-center justify-center"
		aria-label="Back to top"
		data-cy="shop-items-back-to-top"
		@click="scrollToTop">
		<ArrowUpIcon class="w-6 h-6" />
	</button>
</template>
