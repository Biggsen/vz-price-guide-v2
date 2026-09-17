/**
 * Homepage feature announcement banners.
 * Enable one banner at a time; keep others disabled for easy swap-back.
 */
export const HOMEPAGE_FEATURE_BANNERS = [
	{
		id: 'minecraft-26-3-wilderness-bound',
		enabled: true,
		dismissStorageKey: 'featureAnnouncementDismissed_minecraft263',
		title: 'Minecraft 26.3 (Wilderness Bound) items added!',
		message:
			'Over 120 new items are now in the Price Guide, including the full poplar wood set, new dyed slabs and stairs, cushions, explorer maps, and more.',
		readMoreHref: '/updates'
	},
	{
		id: 'crafting-smelting-costs',
		enabled: false,
		dismissStorageKey: 'featureAnnouncementDismissed_craftingSmeltingCosts',
		title: 'New! Crafting & Smelting Costs',
		message: 'Add optional crafting and smelting costs on top of item prices.',
		readMoreHref: '/updates'
	},
	{
		id: 'minecraft-26-2-chaos-cubed',
		enabled: false,
		dismissStorageKey: 'featureAnnouncementDismissed_minecraft262',
		title: 'Minecraft 26.2 (Chaos Cubed) items added!',
		message:
			'New items including sulfur & cinnabar blocks, Golden Dandelion, and the Bounce music disc are now available in the catalog.',
		readMoreHref: '/updates'
	},
	{
		id: 'admin-shop',
		enabled: false,
		dismissStorageKey: 'featureAnnouncementDismissed',
		title: 'Introducing Admin Shop.',
		message:
			'Manage your server economy from one place with recipe pricing and EconomyShopGUI import/export.',
		readMoreHref: '/updates'
	}
]

export function getActiveHomepageBanner() {
	return HOMEPAGE_FEATURE_BANNERS.find((banner) => banner.enabled) ?? null
}
