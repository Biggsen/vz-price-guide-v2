import yaml from 'js-yaml'
import { enabledCategories, categoryByKey } from '../constants.js'
import { vanillaEnchantmentToBukkitKey } from './bukkitToVanillaEnchantment.js'

const SHOP_GUI_ROWS = 5
const ITEMS_PER_SHOP_PAGE = SHOP_GUI_ROWS * 9
const SECTION_FILL_ITEM = {
	material: 'AIR',
	name: ' '
}

function normalizeCategoryKey(category) {
	return String(category || '')
		.trim()
		.toLowerCase()
}

function categoryLabel(categoryKey) {
	return categoryKey
		.split(' ')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

function categoryFileStem(categoryKey) {
	return categoryLabel(categoryKey).replace(/\s+/g, '')
}

function materialIdToEconomyShopGuiItem(materialId, fallbackMaterial = 'CHEST') {
	const raw = String(materialId || '')
	const m = raw.match(/^enchanted_book_(.+)_(\d+)$/)
	if (!m) {
		return {
			material: raw ? raw.toUpperCase() : fallbackMaterial
		}
	}

	const vanillaEnchant = m[1]
	const level = Math.max(1, parseInt(m[2], 10) || 1)
	const bukkit = vanillaEnchantmentToBukkitKey(vanillaEnchant)
	if (!bukkit) {
		return {
			material: 'ENCHANTED_BOOK'
		}
	}

	return {
		material: 'ENCHANTED_BOOK',
		enchantments: [`${bukkit}:${level}`]
	}
}

function sortCategoryKeysForExport(keys) {
	const rank = new Map(enabledCategories.map((key, idx) => [normalizeCategoryKey(key), idx]))
	return [...keys].sort((a, b) => {
		const ra = rank.has(a) ? rank.get(a) : Number.MAX_SAFE_INTEGER
		const rb = rank.has(b) ? rank.get(b) : Number.MAX_SAFE_INTEGER
		if (ra !== rb) return ra - rb
		return a.localeCompare(b)
	})
}

function buildShopsYamlForCategory(items) {
	const pages = {}
	items.forEach((item, idx) => {
		const pageNum = Math.floor(idx / ITEMS_PER_SHOP_PAGE) + 1
		const pageKey = `page${pageNum}`
		if (!pages[pageKey]) {
			pages[pageKey] = {
				'gui-rows': SHOP_GUI_ROWS,
				items: {}
			}
		}

		const slot = idx % ITEMS_PER_SHOP_PAGE
		const itemKey = String(idx + 1)
		const buy = item.buy_price == null || isNaN(Number(item.buy_price)) ? -1 : Number(item.buy_price)
		const sell =
			item.sell_price == null || isNaN(Number(item.sell_price)) ? -1 : Number(item.sell_price)

		pages[pageKey].items[itemKey] = {
			material: item.material,
			buy,
			sell,
			slot
		}
		if (item.enchantments?.length) {
			pages[pageKey].items[itemKey].enchantments = item.enchantments
		}
	})

	return yaml.dump(
		{
			pages
		},
		{ lineWidth: -1, noRefs: true }
	)
}

function buildSectionsYamlForCategory(categoryKey, slot, iconMaterial) {
	const label = categoryLabel(categoryKey)
	return yaml.dump(
		{
			enable: true,
			slot,
			title: `&8&l<<=== &f&l${label} &8&l===>>`,
			hidden: false,
			'sub-section': false,
			'display-item': false,
			'fill-item': SECTION_FILL_ITEM,
			'nav-bar': {
				mode: 'INHERIT'
			},
			item: {
				material: iconMaterial || 'CHEST',
				displayname: `&f&l${label}`,
				name: `&f&l${label}`
			}
		},
		{ lineWidth: -1, noRefs: true }
	)
}

/**
 * Build EconomyShopGUI export files for the given shop inventory.
 * @param {Array<{ item_id: string, buy_price: number|null, sell_price: number|null }>} shopItems
 * @param {Array<{ id: string, category?: string, material_id?: string }>} guideItems
 * @returns {{ files: Array<{ path: string, content: string }>, exportedCategories: string[] }}
 */
export function buildEconomyShopGuiExportFiles(shopItems, guideItems) {
	const guideById = {}
	for (const item of guideItems || []) {
		if (item?.id) guideById[item.id] = item
	}

	const byCategory = {}
	for (const si of shopItems || []) {
		const guide = guideById[si.item_id]
		if (!guide?.material_id || !guide?.category) continue
		const categoryKey = normalizeCategoryKey(guide.category)
		if (!categoryKey || categoryKey === 'uncategorized') continue
		if (!byCategory[categoryKey]) byCategory[categoryKey] = []

		const esgui = materialIdToEconomyShopGuiItem(guide.material_id, 'CHEST')
		byCategory[categoryKey].push({
			material: esgui.material,
			enchantments: esgui.enchantments || [],
			buy_price: si.buy_price,
			sell_price: si.sell_price
		})
	}

	const categoryKeys = sortCategoryKeysForExport(Object.keys(byCategory))
	const files = []

	categoryKeys.forEach((categoryKey, idx) => {
		const fileStem = categoryFileStem(categoryKey)
		const sectionMeta = categoryByKey[categoryKey]
		const iconMaterial = sectionMeta?.icon_material || byCategory[categoryKey][0]?.material || 'CHEST'

		files.push({
			path: `shops/${fileStem}.yml`,
			content: buildShopsYamlForCategory(byCategory[categoryKey])
		})
		files.push({
			path: `sections/${fileStem}.yml`,
			content: buildSectionsYamlForCategory(categoryKey, idx + 1, iconMaterial)
		})
	})

	return {
		files,
		exportedCategories: categoryKeys
	}
}
