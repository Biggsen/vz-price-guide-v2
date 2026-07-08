/**
 * Homepage feature announcement banners.
 * Enable one banner at a time; keep others disabled for easy swap-back.
 */
export const HOMEPAGE_FEATURE_BANNERS = [
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
		enabled: true,
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
