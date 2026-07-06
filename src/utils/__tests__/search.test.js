import { describe, expect, it } from 'vitest'
import {
	processSearchTerms,
	textMatchesSearch,
	filterItemsBySearch,
	hasActiveSearchTerms
} from '../search.js'

describe('processSearchTerms', () => {
	it('splits include terms and lowercases them', () => {
		expect(processSearchTerms('Iron, Raw')).toEqual({
			include: ['iron', 'raw'],
			exclude: []
		})
	})

	it('parses exclude terms prefixed with -', () => {
		expect(processSearchTerms('iron,raw,deepslate,-stairs')).toEqual({
			include: ['iron', 'raw', 'deepslate'],
			exclude: ['stairs']
		})
	})

	it('supports exclude-only queries', () => {
		expect(processSearchTerms('-stairs,-slab')).toEqual({
			include: [],
			exclude: ['stairs', 'slab']
		})
	})

	it('parses quoted phrases without splitting on internal commas', () => {
		expect(processSearchTerms('deepslate,-cracked,-polished,-brick,"golden shovel"')).toEqual({
			include: ['deepslate', 'golden shovel'],
			exclude: ['cracked', 'polished', 'brick']
		})
	})

	it('parses quoted exclude phrases', () => {
		expect(processSearchTerms('deepslate,-"polished deepslate"')).toEqual({
			include: ['deepslate'],
			exclude: ['polished deepslate']
		})
	})

	it('treats unmatched double quotes as literal characters', () => {
		expect(processSearchTerms('"golden shovel')).toEqual({
			include: ['"golden shovel'],
			exclude: []
		})
	})
})

describe('textMatchesSearch', () => {
	it('requires space-separated phrases for multi-word narrowing', () => {
		const narrowTerms = processSearchTerms('raw iron deepslate,-stairs')
		expect(textMatchesSearch('Raw Iron Block', narrowTerms)).toBe(false)
		expect(textMatchesSearch('Raw Iron Deepslate', narrowTerms)).toBe(true)
		expect(textMatchesSearch('Raw Iron Deepslate Stairs', narrowTerms)).toBe(false)
	})

	it('rejects items matching an exclude term', () => {
		expect(textMatchesSearch('Raw Iron Deepslate Stairs', processSearchTerms('deepslate,-stairs'))).toBe(
			false
		)
	})

	it('uses OR logic for comma-separated includes', () => {
		const orTerms = processSearchTerms('deepslate,shovel')
		expect(textMatchesSearch('Deepslate', orTerms)).toBe(true)
		expect(textMatchesSearch('Golden Shovel', orTerms)).toBe(true)
		expect(textMatchesSearch('Oak Planks', orTerms)).toBe(false)
	})

	it('applies excludes on top of OR includes', () => {
		const terms = processSearchTerms('deepslate,shovel,iron,-cobbled')
		expect(textMatchesSearch('Deepslate', terms)).toBe(true)
		expect(textMatchesSearch('Iron Shovel', terms)).toBe(true)
		expect(textMatchesSearch('Cobbled Deepslate', terms)).toBe(false)
		expect(textMatchesSearch('Oak Planks', terms)).toBe(false)
	})

	it('matches multi-word phrases with excludes', () => {
		const phraseTerms = processSearchTerms('deepslate,-cracked,-polished,-brick,golden shovel')
		expect(textMatchesSearch('Golden Shovel', phraseTerms)).toBe(true)
		expect(textMatchesSearch('Polished Deepslate', phraseTerms)).toBe(false)
		expect(textMatchesSearch('Deepslate Golden Shovel', phraseTerms)).toBe(true)
	})
})

describe('filterItemsBySearch', () => {
	const items = [
		{ name: 'Raw Iron Deepslate' },
		{ name: 'Raw Iron Deepslate Stairs' },
		{ name: 'Iron Ingot' }
	]

	it('filters items using include and exclude terms', () => {
		const result = filterItemsBySearch(items, processSearchTerms('iron,raw,deepslate,-stairs'))
		expect(result.map((item) => item.name)).toEqual(['Raw Iron Deepslate', 'Iron Ingot'])
	})

	it('returns all items when search is empty', () => {
		expect(filterItemsBySearch(items, processSearchTerms(''))).toEqual(items)
		expect(hasActiveSearchTerms(processSearchTerms(''))).toBe(false)
	})
})
