import { describe, it, expect } from 'vitest'
import {
	isItemEnchantable,
	getCompatibleEnchantments,
	isEnchantmentCompatibleWithItem,
	hasEnchantmentConflict,
	getEnchantmentConflictReason
} from '../enchantments.js'

describe('isItemEnchantable', () => {
	it('returns false for items without enchantCategories', () => {
		expect(isItemEnchantable({})).toBe(false)
		expect(isItemEnchantable({ enchantCategories: null })).toBe(false)
		expect(isItemEnchantable({ enchantCategories: [] })).toBe(false)
	})

	it('returns true for items with enchantCategories when enchantable is not false', () => {
		expect(
			isItemEnchantable({
				enchantCategories: ['weapon', 'durability']
			})
		).toBe(true)
		expect(
			isItemEnchantable({
				enchantCategories: ['weapon'],
				enchantable: true
			})
		).toBe(true)
		expect(
			isItemEnchantable({
				enchantCategories: ['weapon'],
				enchantable: null
			})
		).toBe(true)
		expect(
			isItemEnchantable({
				enchantCategories: ['weapon'],
				enchantable: undefined
			})
		).toBe(true)
	})

	it('returns false when enchantable is explicitly false', () => {
		expect(
			isItemEnchantable({
				enchantCategories: ['weapon', 'durability'],
				enchantable: false
			})
		).toBe(false)
	})

	it('returns false when enchantCategories is not an array', () => {
		expect(
			isItemEnchantable({
				enchantCategories: 'not-an-array'
			})
		).toBe(false)
	})
})

describe('getCompatibleEnchantments', () => {
	it('returns empty array for non-enchantable items', () => {
		const allEnchantments = [
			{
				id: 'ench1',
				material_id: 'enchanted_book_sharpness_1',
				enchantment_category: 'weapon'
			}
		]
		expect(getCompatibleEnchantments({}, allEnchantments)).toEqual([])
		expect(
			getCompatibleEnchantments(
				{
					enchantCategories: [],
					enchantable: false
				},
				allEnchantments
			)
		).toEqual([])
	})

	it('filters enchantments by matching category', () => {
		const allEnchantments = [
			{
				id: 'ench1',
				material_id: 'enchanted_book_sharpness_1',
				enchantment_category: 'weapon'
			},
			{
				id: 'ench2',
				material_id: 'enchanted_book_lure_1',
				enchantment_category: 'fishing'
			},
			{
				id: 'ench3',
				material_id: 'enchanted_book_unbreaking_1',
				enchantment_category: 'durability'
			}
		]

		const item = {
			enchantCategories: ['weapon', 'durability']
		}

		const result = getCompatibleEnchantments(item, allEnchantments)
		expect(result).toHaveLength(2)
		expect(result.map((e) => e.id)).toEqual(['ench1', 'ench3'])
	})

	it('returns empty array when no enchantments match', () => {
		const allEnchantments = [
			{
				id: 'ench1',
				material_id: 'enchanted_book_lure_1',
				enchantment_category: 'fishing'
			}
		]

		const item = {
			enchantCategories: ['weapon']
		}

		expect(getCompatibleEnchantments(item, allEnchantments)).toEqual([])
	})

	it('handles enchantments without category', () => {
		const allEnchantments = [
			{
				id: 'ench1',
				material_id: 'enchanted_book_sharpness_1',
				enchantment_category: 'weapon'
			},
			{
				id: 'ench2',
				material_id: 'enchanted_book_unknown_1',
				enchantment_category: null
			}
		]

		const item = {
			enchantCategories: ['weapon']
		}

		const result = getCompatibleEnchantments(item, allEnchantments)
		expect(result).toHaveLength(1)
		expect(result[0].id).toBe('ench1')
	})
})

describe('isEnchantmentCompatibleWithItem', () => {
	it('returns false for non-enchantable items', () => {
		const enchantment = {
			enchantment_category: 'weapon'
		}
		const item = {}
		expect(isEnchantmentCompatibleWithItem(enchantment, item)).toBe(false)
	})

	it('returns false when enchantment has no category', () => {
		const enchantment = {
			enchantment_category: null
		}
		const item = {
			enchantCategories: ['weapon']
		}
		expect(isEnchantmentCompatibleWithItem(enchantment, item)).toBe(false)
	})

	it('returns true when enchantment category matches item categories', () => {
		const enchantment = {
			enchantment_category: 'weapon'
		}
		const item = {
			enchantCategories: ['weapon', 'durability']
		}
		expect(isEnchantmentCompatibleWithItem(enchantment, item)).toBe(true)
	})

	it('returns false when enchantment category does not match', () => {
		const enchantment = {
			enchantment_category: 'fishing'
		}
		const item = {
			enchantCategories: ['weapon', 'durability']
		}
		expect(isEnchantmentCompatibleWithItem(enchantment, item)).toBe(false)
	})
})

describe('hasEnchantmentConflict', () => {
	const allEnchantments = [
		{
			id: 'sharpness',
			material_id: 'enchanted_book_sharpness_5',
			enchantment_exclude: ['smite', 'bane_of_arthropods']
		},
		{
			id: 'smite',
			material_id: 'enchanted_book_smite_5',
			enchantment_exclude: ['sharpness', 'bane_of_arthropods']
		},
		{
			id: 'unbreaking',
			material_id: 'enchanted_book_unbreaking_3',
			enchantment_exclude: []
		},
		{
			id: 'protection',
			material_id: 'enchanted_book_protection_4',
			enchantment_exclude: ['fire_protection', 'blast_protection', 'projectile_protection']
		},
		{
			id: 'fire_protection',
			material_id: 'enchanted_book_fire_protection_4',
			enchantment_exclude: ['protection', 'blast_protection', 'projectile_protection']
		}
	]

	it('returns false when there are no conflicts', () => {
		expect(hasEnchantmentConflict('unbreaking', ['sharpness'], allEnchantments)).toBe(false)
		expect(hasEnchantmentConflict('unbreaking', [], allEnchantments)).toBe(false)
	})

	it('returns true when new enchantment excludes existing enchantment', () => {
		expect(hasEnchantmentConflict('sharpness', ['smite'], allEnchantments)).toBe(true)
		expect(hasEnchantmentConflict('protection', ['fire_protection'], allEnchantments)).toBe(
			true
		)
	})

	it('returns true when existing enchantment excludes new enchantment', () => {
		expect(hasEnchantmentConflict('smite', ['sharpness'], allEnchantments)).toBe(true)
		expect(hasEnchantmentConflict('fire_protection', ['protection'], allEnchantments)).toBe(
			true
		)
	})

	it('returns false when enchantment is not found', () => {
		expect(hasEnchantmentConflict('nonexistent', ['sharpness'], allEnchantments)).toBe(false)
	})

	it('returns false when enchantment has no exclude list', () => {
		expect(hasEnchantmentConflict('unbreaking', ['sharpness'], allEnchantments)).toBe(false)
	})

	it('handles multiple existing enchantments', () => {
		expect(hasEnchantmentConflict('sharpness', ['smite', 'unbreaking'], allEnchantments)).toBe(
			true
		)
		expect(
			hasEnchantmentConflict('unbreaking', ['sharpness', 'smite'], allEnchantments)
		).toBe(false)
	})
})

describe('getEnchantmentConflictReason', () => {
	const allEnchantments = [
		{
			id: 'sharpness',
			material_id: 'enchanted_book_sharpness_5',
			enchantment_exclude: ['smite', 'bane_of_arthropods']
		},
		{
			id: 'smite',
			material_id: 'enchanted_book_smite_5',
			enchantment_exclude: ['sharpness', 'bane_of_arthropods']
		},
		{
			id: 'protection',
			material_id: 'enchanted_book_protection_4',
			enchantment_exclude: ['fire_protection', 'blast_protection']
		},
		{
			id: 'fire_protection',
			material_id: 'enchanted_book_fire_protection_4',
			enchantment_exclude: ['protection', 'blast_protection']
		},
		{
			id: 'unbreaking',
			material_id: 'enchanted_book_unbreaking_3',
			enchantment_exclude: []
		}
	]

	it('returns null when there is no conflict', () => {
		expect(getEnchantmentConflictReason('unbreaking', ['sharpness'], allEnchantments)).toBe(
			null
		)
		expect(getEnchantmentConflictReason('unbreaking', [], allEnchantments)).toBe(null)
	})

	it('returns conflict message when new enchantment excludes existing', () => {
		const reason = getEnchantmentConflictReason('sharpness', ['smite'], allEnchantments)
		expect(reason).toBeTruthy()
		expect(reason).toContain('Cannot combine')
		expect(reason).toContain('Sharpness')
		expect(reason).toContain('Smite')
	})

	it('returns conflict message when existing enchantment excludes new', () => {
		const reason = getEnchantmentConflictReason('smite', ['sharpness'], allEnchantments)
		expect(reason).toBeTruthy()
		expect(reason).toContain('Cannot combine')
		expect(reason).toContain('Sharpness')
		expect(reason).toContain('Smite')
	})

	it('formats enchantment names correctly', () => {
		const reason = getEnchantmentConflictReason('protection', ['fire_protection'], allEnchantments)
		expect(reason).toContain('Protection')
		expect(reason).toContain('Fire Protection')
	})

	it('handles multiple conflicts', () => {
		const reason = getEnchantmentConflictReason('sharpness', ['smite', 'unbreaking'], allEnchantments)
		expect(reason).toBeTruthy()
		expect(reason).toContain('Sharpness')
		expect(reason).toContain('Smite')
	})

	it('returns null when enchantment is not found', () => {
		expect(getEnchantmentConflictReason('nonexistent', ['sharpness'], allEnchantments)).toBe(
			null
		)
	})
})

