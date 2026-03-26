/**
 * Maps Spigot/Bukkit {@link org.bukkit.enchantments.Enchantment} enum names to
 * Minecraft resource-location style keys used in guide `material_id`s
 * (e.g. enchanted_book_aqua_affinity_1).
 *
 * @see https://hub.spigotmc.org/javadocs/bukkit/org/bukkit/enchantments/Enchantment.html
 */

/** @type {Record<string, string>} */
export const BUKKIT_ENCHANT_TO_VANILLA = {
	// Armor
	PROTECTION_ENVIRONMENTAL: 'protection',
	PROTECTION_FIRE: 'fire_protection',
	PROTECTION_FALL: 'feather_falling',
	PROTECTION_EXPLOSIONS: 'blast_protection',
	PROTECTION_PROJECTILE: 'projectile_protection',
	THORNS: 'thorns',
	DEPTH_STRIDER: 'depth_strider',
	FROST_WALKER: 'frost_walker',
	SOUL_SPEED: 'soul_speed',
	SWIFT_SNEAK: 'swift_sneak',
	BINDING_CURSE: 'curse_of_binding',
	VANISHING_CURSE: 'curse_of_vanishing',
	// Melee
	DAMAGE_ALL: 'sharpness',
	DAMAGE_UNDEAD: 'smite',
	DAMAGE_ARTHROPODS: 'bane_of_arthropods',
	KNOCKBACK: 'knockback',
	FIRE_ASPECT: 'fire_aspect',
	LOOT_BONUS_MOBS: 'looting',
	SWEEPING_EDGE: 'sweeping_edge',
	BREACH: 'breach',
	DENSITY: 'density',
	WIND_BURST: 'wind_burst',
	// Mining
	DIG_SPEED: 'efficiency',
	SILK_TOUCH: 'silk_touch',
	DURABILITY: 'unbreaking',
	LOOT_BONUS_BLOCKS: 'fortune',
	// Ranged
	ARROW_DAMAGE: 'power',
	ARROW_KNOCKBACK: 'punch',
	ARROW_FIRE: 'flame',
	ARROW_INFINITE: 'infinity',
	// Fishing
	LUCK: 'luck_of_the_sea',
	LURE: 'lure',
	// Misc
	OXYGEN: 'respiration',
	WATER_WORKER: 'aqua_affinity',
	MENDING: 'mending',
	IMPALING: 'impaling',
	RIPTIDE: 'riptide',
	LOYALTY: 'loyalty',
	CHANNELING: 'channeling',
	MULTISHOT: 'multishot',
	QUICK_CHARGE: 'quick_charge',
	PIERCING: 'piercing'
}

/**
 * Resolve an enchantment name from EconomyShopGUI YAML (Bukkit enum, vanilla id, or minecraft:)
 * to the vanilla snake_case key used in guide material_ids.
 * @param {string} raw
 * @returns {string|null} null if empty / invalid
 */
export function bukkitEnchantmentToVanillaKey(raw) {
	if (raw == null || typeof raw !== 'string') return null
	const trimmed = raw.trim()
	if (!trimmed) return null

	const withoutNs = trimmed.replace(/^minecraft:/i, '')
	const upper = withoutNs.toUpperCase().replace(/\s+/g, '_')
	if (BUKKIT_ENCHANT_TO_VANILLA[upper]) {
		return BUKKIT_ENCHANT_TO_VANILLA[upper]
	}

	return withoutNs.toLowerCase().replace(/\s+/g, '_')
}
