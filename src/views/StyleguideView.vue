<script setup>
import { ref } from 'vue'
import {
	ArrowDownIcon,
	ArrowDownTrayIcon,
	Cog6ToothIcon,
	PencilIcon,
	RocketLaunchIcon,
	TrashIcon,
	XMarkIcon
} from '@heroicons/vue/24/outline'
import BaseButton from '@/components/BaseButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BaseIconButton from '@/components/BaseIconButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import NotificationBanner from '@/components/NotificationBanner.vue'

defineOptions({
	name: 'StyleguideView'
})

const viewMode = ref('categories')
const layout = ref('comfortable')
const searchQuery = ref('')

const baseTableColumns = [
	{ key: 'item', label: 'Item' },
	{ key: 'buyPrice', label: 'Buy Price', align: 'right' },
	{ key: 'sellPrice', label: 'Sell Price', align: 'right' },
	{ key: 'profitMargin', label: 'Profit Margin', align: 'center' },
	{ key: 'lastUpdated', label: 'Last Updated' },
	{ key: 'actions', label: 'Actions', align: 'center' }
]

const baseTableRows = [
	{
		id: 'coal',
		item: 'Coal',
		buyPrice: '15.00',
		sellPrice: '5.00',
		profitMargin: '66.7%',
		lastUpdated: 'Today',
		actions: 'View'
	},
	{
		id: 'copper_ingot',
		item: 'Copper Ingot',
		buyPrice: '10.00',
		sellPrice: '3.00',
		profitMargin: '70.0%',
		lastUpdated: 'Today',
		actions: 'View'
	},
	{
		id: 'diamond',
		item: 'Diamond',
		buyPrice: '250.00',
		sellPrice: '75.00',
		profitMargin: '70.0%',
		lastUpdated: 'Today',
		actions: 'View'
	},
	{
		id: 'gold_ingot',
		item: 'Gold Ingot',
		buyPrice: '50.00',
		sellPrice: '15.00',
		profitMargin: '70.0%',
		lastUpdated: 'Today',
		actions: 'View'
	},
	{
		id: 'iron_ingot',
		item: 'Iron Ingot',
		buyPrice: '30.00',
		sellPrice: '10.00',
		profitMargin: '66.7%',
		lastUpdated: 'Today',
		actions: 'View'
	}
]
</script>

<template>
	<div class="p-4 pt-8 max-w-7xl mx-auto">
		<!-- Back Button -->
		<div class="mb-4">
			<RouterLink
				to="/design"
				class="inline-flex items-center rounded-md bg-white text-gray-700 border-2 border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition">
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
				Back to Design
			</RouterLink>
		</div>

		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Design System & Styleguide</h1>
			<p class="text-gray-600">
				Comprehensive guide to the design patterns, components, and styling conventions used
				in verzion's economy price guide for Minecraft.
			</p>
		</div>

		<!-- Color Palette -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Color Palette</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<!-- Primary Colors -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Primary Colors</h3>
					<div class="space-y-3">
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-gray-asparagus rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Gray Asparagus</div>
								<div class="text-sm text-gray-500">#49584b</div>
								<div class="text-xs text-gray-400">Primary brand color</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-highland rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Highland</div>
								<div class="text-sm text-gray-500">#6b835f</div>
								<div class="text-xs text-gray-400">Secondary brand color</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-amulet rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Amulet</div>
								<div class="text-sm text-gray-500">#85a17e</div>
								<div class="text-xs text-gray-400">Tertiary brand color</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-norway rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Norway</div>
								<div class="text-sm text-gray-500">#a7c3a0</div>
								<div class="text-xs text-gray-400">Accent color</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-sea-mist rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Sea Mist</div>
								<div class="text-sm text-gray-500">#c2ddbc</div>
								<div class="text-xs text-gray-400">Lighter than norway</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-heavy-metal rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Heavy Metal</div>
								<div class="text-sm text-gray-500">#242c25</div>
								<div class="text-xs text-gray-400">Dark text color</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-goldenrod rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Goldenrod</div>
								<div class="text-sm text-gray-500">#d4a42d</div>
								<div class="text-xs text-gray-400">Brand accent color</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-flame rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Flame</div>
								<div class="text-sm text-gray-500">#cb6843</div>
								<div class="text-xs text-gray-400">Brand accent color</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-saltpan rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Saltpan</div>
								<div class="text-sm text-gray-500">#f8faf3</div>
								<div class="text-xs text-gray-400">
									Background/neutral brand color
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Semantic Colors -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Semantic Colors</h3>
					<div class="space-y-3">
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-semantic-success rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Success (Sea Green)</div>
								<div class="text-sm text-gray-500">bg-semantic-success</div>
								<div class="text-xs text-gray-400">Positive actions</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-semantic-danger rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Danger (Chestnut)</div>
								<div class="text-sm text-gray-500">bg-semantic-danger</div>
								<div class="text-xs text-gray-400">Destructive actions</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-semantic-info rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Info (Horizon)</div>
								<div class="text-sm text-gray-500">bg-semantic-info</div>
								<div class="text-xs text-gray-400">Information & links</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-semantic-warning rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Warning (Alpine)</div>
								<div class="text-sm text-gray-500">bg-semantic-warning</div>
								<div class="text-xs text-gray-400">Cautions & alerts</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Semantic Color Light Variants -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Semantic Light Variants</h3>
					<div class="space-y-3">
						<div class="flex items-center space-x-3">
							<div
								class="w-16 h-16 bg-semantic-success-light rounded-lg shadow-md border border-gray-200"></div>
							<div>
								<div class="font-medium text-gray-900">Success Light</div>
								<div class="text-sm text-gray-500">bg-semantic-success-light</div>
								<div class="text-xs text-gray-400">Light success backgrounds</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div
								class="w-16 h-16 bg-semantic-danger-light rounded-lg shadow-md border border-gray-200"></div>
							<div>
								<div class="font-medium text-gray-900">Danger Light</div>
								<div class="text-sm text-gray-500">bg-semantic-danger-light</div>
								<div class="text-xs text-gray-400">Light danger backgrounds</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div
								class="w-16 h-16 bg-semantic-info-light rounded-lg shadow-md border border-gray-200"></div>
							<div>
								<div class="font-medium text-gray-900">Info Light</div>
								<div class="text-sm text-gray-500">bg-semantic-info-light</div>
								<div class="text-xs text-gray-400">Light info backgrounds</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div
								class="w-16 h-16 bg-semantic-warning-light rounded-lg shadow-md border border-gray-200"></div>
							<div>
								<div class="font-medium text-gray-900">Warning Light</div>
								<div class="text-sm text-gray-500">bg-semantic-warning-light</div>
								<div class="text-xs text-gray-400">Light warning backgrounds</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Root Colors -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Root Colors</h3>
					<div class="space-y-3">
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-sea-green rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Sea Green</div>
								<div class="text-sm text-gray-500">#5E8D64</div>
								<div class="text-xs text-gray-400">Root color for success</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-chestnut rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Chestnut</div>
								<div class="text-sm text-gray-500">#b85745</div>
								<div class="text-xs text-gray-400">Root color for danger</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-horizon rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Horizon</div>
								<div class="text-sm text-gray-500">#5b7d98</div>
								<div class="text-xs text-gray-400">Root color for info</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-alpine rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Alpine</div>
								<div class="text-sm text-gray-500">#b99130</div>
								<div class="text-xs text-gray-400">Root color for warning</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Gray Scale -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Gray Scale</h3>
					<div class="space-y-3">
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-gray-900 rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Gray 900</div>
								<div class="text-sm text-gray-500">bg-gray-900</div>
								<div class="text-xs text-gray-400">Dark backgrounds</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-gray-700 rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Gray 700</div>
								<div class="text-sm text-gray-500">bg-gray-700</div>
								<div class="text-xs text-gray-400">Navigation backgrounds</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-gray-300 rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Gray 300</div>
								<div class="text-sm text-gray-500">bg-gray-300</div>
								<div class="text-xs text-gray-400">Borders & dividers</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-16 h-16 bg-gray-100 rounded-lg shadow-md"></div>
							<div>
								<div class="font-medium text-gray-900">Gray 100</div>
								<div class="text-sm text-gray-500">bg-gray-100</div>
								<div class="text-xs text-gray-400">Light backgrounds</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Text Colors -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Text Colors</h3>
					<div class="space-y-3">
						<div class="flex items-center space-x-3">
							<div
								class="w-16 h-16 bg-white border border-gray-300 rounded-lg shadow-md flex items-center justify-center">
								<span class="text-gray-900 font-medium">Text</span>
							</div>
							<div>
								<div class="font-medium text-gray-900">Gray 900</div>
								<div class="text-sm text-gray-500">text-gray-900</div>
								<div class="text-xs text-gray-400">Primary text</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div
								class="w-16 h-16 bg-white border border-gray-300 rounded-lg shadow-md flex items-center justify-center">
								<span class="text-gray-600 font-medium">Text</span>
							</div>
							<div>
								<div class="font-medium text-gray-900">Gray 600</div>
								<div class="text-sm text-gray-500">text-gray-600</div>
								<div class="text-xs text-gray-400">Secondary text</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div
								class="w-16 h-16 bg-white border border-gray-300 rounded-lg shadow-md flex items-center justify-center">
								<span class="text-gray-500 font-medium">Text</span>
							</div>
							<div>
								<div class="font-medium text-gray-900">Gray 500</div>
								<div class="text-sm text-gray-500">text-gray-500</div>
								<div class="text-xs text-gray-400">Muted text</div>
							</div>
						</div>
						<div class="flex items-center space-x-3">
							<div
								class="w-16 h-16 bg-gray-900 rounded-lg shadow-md flex items-center justify-center">
								<span class="text-white font-medium">Text</span>
							</div>
							<div>
								<div class="font-medium text-gray-900">White</div>
								<div class="text-sm text-gray-500">text-white</div>
								<div class="text-xs text-gray-400">Light text on dark</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Typography -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Typography</h2>
			<div class="space-y-6">
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Headings</h3>
					<div class="space-y-2">
						<h1 class="text-3xl font-bold text-gray-900">
							Heading 1 (text-3xl font-bold)
						</h1>
						<h2 class="text-2xl font-bold text-gray-900">
							Heading 2 (text-2xl font-bold)
						</h2>
						<h3 class="text-xl font-semibold text-gray-900">
							Heading 3 (text-xl font-semibold)
						</h3>
						<h4 class="text-lg font-semibold text-gray-800">
							Heading 4 (text-lg font-semibold)
						</h4>
						<h5 class="text-base font-medium text-gray-800">
							Heading 5 (text-base font-medium)
						</h5>
						<h6 class="text-sm font-medium text-gray-800">
							Heading 6 (text-sm font-medium)
						</h6>
					</div>
				</div>

				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Body Text</h3>
					<div class="space-y-2">
						<p class="text-base text-gray-900">
							Base text (text-base text-gray-900) - This is the standard body text
							used throughout the application for general content and descriptions.
						</p>
						<p class="text-sm text-gray-600">
							Small text (text-sm text-gray-600) - Used for secondary information,
							captions, and helper text.
						</p>
						<p class="text-xs text-gray-500">
							Extra small text (text-xs text-gray-500) - Used for metadata,
							timestamps, and very small details.
						</p>
					</div>
				</div>

				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Font Weights</h3>
					<div class="space-y-2">
						<p class="font-bold text-gray-900">Bold (font-bold)</p>
						<p class="font-semibold text-gray-900">Semibold (font-semibold)</p>
						<p class="font-medium text-gray-900">Medium (font-medium)</p>
						<p class="font-normal text-gray-900">Normal (font-normal)</p>
					</div>
				</div>

				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Links</h3>
					<div class="space-y-2">
						<p class="text-gray-900">
							This is a paragraph with a
							<a href="#" class="font-medium hover:text-horizon">
								<span class="underline">link using font-medium</span>
							</a>
							class for proper styling.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Section Headings -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Section Headings</h2>
			<div class="space-y-8">
				<!-- Fieldset Section Headers -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Fieldset Section Headers</h3>
					<p class="text-sm text-gray-600 mb-4">
						Used for grouping form sections with a heading and bottom border line.
					</p>

					<!-- Example fieldset with section heading -->
					<fieldset class="mb-10 border-0">
						<legend
							class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
							Basic Information
						</legend>
					</fieldset>

					<!-- Code example -->
					<div class="space-y-2">
						<h4 class="text-md font-medium text-gray-700">HTML Structure</h4>
						<div class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
							<pre><code>&lt;fieldset class="mb-10"&gt;
  &lt;legend class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6"&gt;
    Section Title
  &lt;/legend&gt;
  &lt;!-- Form content --&gt;
&lt;/fieldset&gt;</code></pre>
						</div>
					</div>
				</div>

				<!-- General Section Headers -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">General Section Headers</h3>
					<p class="text-sm text-gray-600 mb-4">
						Used for any content section that needs a heading with a bottom border line.
					</p>

					<!-- Example general section heading -->
					<div class="mb-8">
						<h3
							class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6">
							Content Section
						</h3>
					</div>

					<!-- Code example -->
					<div class="space-y-2">
						<h4 class="text-md font-medium text-gray-700">HTML Structure</h4>
						<div class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
							<pre><code>&lt;div class="mb-8"&gt;
  &lt;h3 class="block w-full text-lg font-semibold text-gray-900 border-b border-gray-asparagus pb-2 mb-6"&gt;
    Section Title
  &lt;/h3&gt;
  &lt;!-- Section content --&gt;
&lt;/div&gt;</code></pre>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Buttons -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Buttons</h2>
			<div class="space-y-8">
				<!-- Primary Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">
						Primary Buttons (BaseButton Component)
					</h3>
					<div class="space-y-4">
						<!-- Regular Primary Button -->
						<div>
							<h4 class="text-md font-medium text-gray-700 mb-2">
								Regular Primary Button
							</h4>
							<div class="flex flex-wrap gap-4">
								<BaseButton variant="primary">Primary Button</BaseButton>
							</div>
						</div>

						<!-- Primary Buttons with Icons -->
						<div>
							<h4 class="text-md font-medium text-gray-700 mb-2">
								Primary Buttons with Icons
							</h4>
							<div class="flex flex-wrap gap-4">
								<BaseButton variant="primary">
									<template #left-icon>
										<ArrowDownTrayIcon />
									</template>
									Download
								</BaseButton>
								<BaseButton variant="primary">
									Continue
									<template #right-icon>
										<ArrowDownIcon />
									</template>
								</BaseButton>
							</div>
						</div>
					</div>
				</div>

				<!-- Secondary Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">
						Secondary Buttons (BaseButton Component)
					</h3>
					<div class="space-y-4">
						<!-- Regular Secondary Button -->
						<div>
							<h4 class="text-md font-medium text-gray-700 mb-2">
								Regular Secondary Button
							</h4>
							<div class="flex flex-wrap gap-4">
								<BaseButton variant="secondary">Secondary Button</BaseButton>
							</div>
						</div>

						<!-- Secondary Buttons with Icons -->
						<div>
							<h4 class="text-md font-medium text-gray-700 mb-2">
								Secondary Buttons with Icons
							</h4>
							<div class="flex flex-wrap gap-4">
								<BaseButton variant="secondary">
									<template #left-icon>
										<Cog6ToothIcon />
									</template>
									Settings
								</BaseButton>
								<BaseButton variant="secondary">
									Cancel
									<template #right-icon>
										<XMarkIcon />
									</template>
								</BaseButton>
							</div>
						</div>
					</div>
				</div>

				<!-- Tertiary Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">
						Tertiary Buttons (BaseButton Component)
					</h3>
					<div class="space-y-4">
						<!-- Regular Tertiary Button -->
						<div>
							<h4 class="text-md font-medium text-gray-700 mb-2">
								Regular Tertiary Button
							</h4>
							<div class="flex flex-wrap gap-4">
								<BaseButton variant="tertiary">Outline Button</BaseButton>
							</div>
						</div>

						<!-- Tertiary Buttons with Icons -->
						<div>
							<h4 class="text-md font-medium text-gray-700 mb-2">
								Tertiary Buttons with Icons
							</h4>
							<div class="flex flex-wrap gap-4">
								<BaseButton variant="tertiary">
									<template #left-icon>
										<XMarkIcon />
									</template>
									Cancel
								</BaseButton>
								<BaseButton variant="tertiary">
									Close
									<template #right-icon>
										<XMarkIcon />
									</template>
								</BaseButton>
							</div>
						</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Action Buttons</h3>

					<!-- Small Action Buttons -->
					<div class="space-y-2">
						<h4 class="text-md font-medium text-gray-700">Small (px-3 py-1 text-sm)</h4>
						<div class="flex flex-wrap gap-4">
							<button
								class="px-3 py-1 text-sm bg-semantic-success text-white rounded hover:bg-opacity-80 transition-colors">
								Save
							</button>
							<button
								class="px-3 py-1 text-sm bg-semantic-info text-white rounded hover:bg-opacity-80 transition-colors">
								Edit
							</button>
							<button
								class="px-3 py-1 text-sm bg-semantic-danger text-white rounded hover:bg-opacity-80 transition-colors">
								Delete
							</button>
							<button
								class="px-3 py-1 text-sm bg-semantic-warning text-white rounded hover:bg-opacity-80 transition-colors">
								Warning
							</button>
						</div>
					</div>

					<!-- Large Action Buttons -->
					<div class="space-y-2">
						<h4 class="text-md font-medium text-gray-700">
							Large (px-4 py-2 text-sm font-semibold)
						</h4>
						<div class="flex flex-wrap gap-4">
							<button
								class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
								Save
							</button>
							<button
								class="rounded-md bg-semantic-info px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
								Edit
							</button>
							<button
								class="rounded-md bg-semantic-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
								Delete
							</button>
							<button
								class="rounded-md bg-semantic-warning px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
								Warning
							</button>
						</div>
					</div>
				</div>

				<!-- Toggle Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Toggle Buttons</h3>
					<div class="space-y-4">
						<div>
							<span class="text-sm font-medium text-gray-700 mb-2 block">
								View Mode:
							</span>
							<div
								class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
								<button
									:class="[
										viewMode === 'categories'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-3 py-1 text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
									]">
									Categories
								</button>
								<button
									:class="[
										viewMode === 'list'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-3 py-1 text-sm font-medium transition'
									]">
									List
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Icon Buttons -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Icon Buttons</h2>
			<div class="space-y-8">
				<!-- Primary Icon Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">
						Primary Icon Buttons (BaseIconButton Component)
					</h3>
					<div class="flex flex-wrap gap-4 items-center">
						<BaseIconButton variant="primary" aria-label="Edit item">
							<PencilIcon />
						</BaseIconButton>
						<BaseIconButton variant="primary" aria-label="Delete item">
							<TrashIcon />
						</BaseIconButton>
						<BaseIconButton variant="primary" aria-label="Settings">
							<Cog6ToothIcon />
						</BaseIconButton>
						<BaseIconButton variant="primary" aria-label="Close">
							<XMarkIcon />
						</BaseIconButton>
					</div>
				</div>

				<!-- Secondary Icon Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">
						Secondary Icon Buttons (BaseIconButton Component)
					</h3>
					<div class="flex flex-wrap gap-4 items-center">
						<BaseIconButton variant="secondary" aria-label="Edit item">
							<PencilIcon />
						</BaseIconButton>
						<BaseIconButton variant="secondary" aria-label="Delete item">
							<TrashIcon />
						</BaseIconButton>
						<BaseIconButton variant="secondary" aria-label="Settings">
							<Cog6ToothIcon />
						</BaseIconButton>
						<BaseIconButton variant="secondary" aria-label="Close">
							<XMarkIcon />
						</BaseIconButton>
					</div>
				</div>

				<!-- Ghost Icon Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">
						Ghost Icon Buttons (BaseIconButton Component)
					</h3>
					<div class="flex flex-wrap gap-4 items-center">
						<BaseIconButton variant="ghost" aria-label="Edit item">
							<PencilIcon />
						</BaseIconButton>
						<BaseIconButton variant="ghost" aria-label="Delete item">
							<TrashIcon />
						</BaseIconButton>
						<BaseIconButton variant="ghost" aria-label="Settings">
							<Cog6ToothIcon />
						</BaseIconButton>
						<BaseIconButton variant="ghost" aria-label="Close">
							<XMarkIcon />
						</BaseIconButton>
					</div>
				</div>

				<!-- States -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Icon Button States</h3>
					<div class="space-y-4">
						<div>
							<h4 class="text-md font-medium text-gray-700 mb-2">Disabled State</h4>
							<div class="flex flex-wrap gap-4 items-center">
								<BaseIconButton
									variant="primary"
									disabled
									aria-label="Disabled edit">
									<PencilIcon />
								</BaseIconButton>
								<BaseIconButton
									variant="secondary"
									disabled
									aria-label="Disabled delete">
									<TrashIcon />
								</BaseIconButton>
							</div>
						</div>
						<div>
							<h4 class="text-md font-medium text-gray-700 mb-2">Loading State</h4>
							<div class="flex flex-wrap gap-4 items-center">
								<BaseIconButton variant="primary" loading aria-label="Loading">
									<PencilIcon />
								</BaseIconButton>
								<BaseIconButton variant="secondary" loading aria-label="Loading">
									<TrashIcon />
								</BaseIconButton>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Form Elements -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Form Elements</h2>
			<div class="space-y-8">
				<!-- Text Inputs -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Text Inputs</h3>
					<div class="space-y-4">
						<div>
							<label class="block text-base font-medium leading-6 text-gray-900">
								Standard Input
							</label>
							<input
								type="text"
								placeholder="Enter text..."
								class="block w-80 rounded border-2 border-gray-asparagus px-3 py-1 mt-2 mb-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus" />
						</div>
						<div>
							<label class="block text-base font-medium leading-6 text-gray-900">
								Search Input
							</label>
							<input
								type="text"
								v-model="searchQuery"
								placeholder="Search for items..."
								class="border-2 border-gray-asparagus rounded px-3 py-2 w-80 mt-2 mb-2" />
						</div>
						<div>
							<label class="block text-base font-medium leading-6 text-gray-900">
								Number Input
							</label>
							<input
								type="number"
								placeholder="0"
								class="w-20 px-3 py-1 border-2 border-gray-asparagus rounded text-sm mt-2 mb-2 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus" />
						</div>
						<div>
							<label class="block text-base font-medium leading-6 text-gray-900">
								Select Dropdown
							</label>
							<select
								class="border-2 border-gray-asparagus rounded px-3 py-1 mt-2 mb-2 w-80">
								<option>Option 1</option>
								<option>Option 2</option>
								<option>Option 3</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Checkboxes and Radio Buttons -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Checkboxes</h3>
					<div class="flex flex-wrap gap-6">
						<label class="flex items-center cursor-pointer">
							<input type="checkbox" class="mr-2 checkbox-input" />
							<span>Checkbox</span>
						</label>
					</div>
				</div>

				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Radio Buttons</h3>
					<div class="space-y-2">
						<label class="flex items-center cursor-pointer">
							<input
								type="radio"
								name="example"
								value="option1"
								class="mr-2 radio-input" />
							<span>Option 1</span>
						</label>
						<label class="flex items-center cursor-pointer">
							<input
								type="radio"
								name="example"
								value="option2"
								class="mr-2 radio-input" />
							<span>Option 2</span>
						</label>
					</div>
				</div>
			</div>
		</section>

		<!-- Cards & Containers -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Cards & Containers</h2>
			<div class="space-y-8">
				<div class="flex flex-col lg:flex-row lg:space-x-8 space-y-8 lg:space-y-0">
					<div class="lg:w-1/3">
						<div class="space-y-3">
							<p
								class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
								BaseCard (Primary Variant)
							</p>
							<BaseCard variant="primary">
								<template #media>
									<img
										class="w-full h-32 object-cover"
										src="https://picsum.photos/400/128"
										alt="Navigation Card Image" />
								</template>
								<template #header>Primary Card</template>
								<template #body>
									<p class="mb-4">
										Use the primary card to highlight a key action or
										destination.
									</p>
									<BaseButton variant="primary">Action</BaseButton>
								</template>
							</BaseCard>
						</div>
					</div>

					<div class="lg:w-1/3">
						<div class="space-y-3">
							<p
								class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
								BaseCard (Primary Variant - No Media)
							</p>
							<BaseCard variant="primary">
								<template #header>Primary Card (No Media)</template>
								<template #body>
									<p class="mb-4">
										Use the primary card without an image for streamlined
										content blocks.
									</p>
									<BaseButton variant="primary">Action</BaseButton>
								</template>
							</BaseCard>
						</div>
					</div>
				</div>

				<div class="flex flex-col lg:flex-row lg:space-x-8 space-y-8 lg:space-y-0">
					<div class="lg:w-1/3">
						<div class="space-y-3">
							<p
								class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
								BaseCard (Secondary Variant)
							</p>
							<BaseCard variant="secondary">
								<template #media>
									<img
										class="w-full h-32 object-cover"
										src="https://picsum.photos/400/128?grayscale"
										alt="Secondary Card Media" />
								</template>
								<template #header>
									<span
										class="cursor-pointer hover:text-gray-asparagus transition-colors">
										Secondary Card
									</span>
								</template>
								<template #actions>
									<button
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
										<PencilIcon class="w-4 h-4" />
									</button>
									<button
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
										<TrashIcon class="w-4 h-4" />
									</button>
								</template>
								<template #body>
									<div class="flex-1">
										<p class="mb-3">
											Use the secondary card when additional actions or
											metadata are required.
										</p>
										<div class="text-sm">
											<span class="font-medium">Detail:</span>
											Supporting metadata
											<span class="mx-2"></span>
											<span class="font-medium">Status:</span>
											Active
											<span class="mx-2"></span>
											<span class="font-medium">Priority:</span>
											High
										</div>
									</div>
								</template>
								<template #footer>
									<BaseButton variant="primary">Action</BaseButton>
								</template>
							</BaseCard>
						</div>
					</div>

					<div class="lg:w-1/3">
						<div class="space-y-3">
							<p
								class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
								BaseCard (Secondary Variant - No Media)
							</p>
							<BaseCard variant="secondary">
								<template #header>Secondary Card (No Media)</template>
								<template #actions>
									<button
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
										<PencilIcon class="w-4 h-4" />
									</button>
									<button
										class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
										<TrashIcon class="w-4 h-4" />
									</button>
								</template>
								<template #body>
									<div class="flex-1">
										<p class="mb-3">
											Use the secondary card with compact layout when no media
											is needed.
										</p>
										<div class="text-sm">
											<span class="font-medium">Detail:</span>
											Supporting metadata
											<span class="mx-2"></span>
											<span class="font-medium">Status:</span>
											Active
											<span class="mx-2"></span>
											<span class="font-medium">Priority:</span>
											High
										</div>
									</div>
								</template>
								<template #footer>
									<BaseButton variant="primary">Action</BaseButton>
								</template>
							</BaseCard>
						</div>
					</div>
				</div>

				<div class="flex flex-col lg:flex-row lg:space-x-8 space-y-8 lg:space-y-0">
					<div class="lg:w-1/3">
						<div class="space-y-3">
							<p
								class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
								BaseCard (Tertiary Variant)
							</p>
							<BaseCard variant="tertiary">
								<template #media>
									<img
										class="w-full h-32 object-cover"
										src="https://picsum.photos/400/128?blur"
										alt="Tertiary Card Media" />
								</template>
								<template #header>Tertiary Card</template>
								<template #body>
									<p class="mb-4">
										Use the tertiary card for contextual information or
										secondary content.
									</p>
								</template>
								<template #footer>
									<BaseButton variant="secondary" class="self-start">
										Action
									</BaseButton>
								</template>
							</BaseCard>
						</div>
					</div>

					<div class="lg:w-1/3">
						<div class="space-y-3">
							<p
								class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
								BaseCard (Tertiary Variant - No Media)
							</p>
							<BaseCard variant="tertiary">
								<template #header>Tertiary Card (No Media)</template>
								<template #body>
									<p class="mb-4">
										Use the tertiary card without media for compact callouts.
									</p>
								</template>
								<template #footer>
									<BaseButton variant="secondary" class="self-start">
										Action
									</BaseButton>
								</template>
							</BaseCard>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Tables -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-4">Tables</h2>
			<p class="text-gray-600 mb-6 max-w-3xl">
				`BaseTable` provides a consistent data table foundation with the Rails & Riches
				look: dark headers, soft green rows, white grid lines, and subtle hover feedback.
				Use column slots to customise content, icons, or actions while keeping the shell
				styling identical.
			</p>

			<BaseTable :columns="baseTableColumns" :rows="baseTableRows" row-key="id" />
		</section>

		<!-- Navigation -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Navigation</h2>
			<div class="space-y-6">
				<!-- Main Navigation -->
				<div class="bg-gray-800 text-white px-4 py-2 flex gap-2 items-center rounded-lg">
					<RouterLink
						to="#"
						class="px-3 py-2 rounded transition-colors bg-gray-700 text-white">
						Active Link
					</RouterLink>
					<RouterLink
						to="#"
						class="px-3 py-2 rounded transition-colors hover:bg-gray-700 hover:text-white">
						Inactive Link
					</RouterLink>
					<RouterLink
						to="#"
						class="px-3 py-2 rounded transition-colors hover:bg-gray-700 hover:text-white">
						Another Link
					</RouterLink>
				</div>

				<!-- Sub Navigation -->
				<div
					class="bg-gray-700 text-white px-4 py-2 flex gap-4 items-center border-t border-gray-600 rounded-lg">
					<RouterLink class="hover:underline underline" to="#">
						Active Sub Link
					</RouterLink>
					<RouterLink class="hover:underline" to="#">Sub Link</RouterLink>
					<RouterLink class="hover:underline" to="#">Another Sub Link</RouterLink>
					<div class="ml-auto">
						<span class="px-2 py-1 bg-red-600 text-xs rounded font-bold">ADMIN</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Alerts & Notifications -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Alerts & Notifications</h2>
			<div class="space-y-4">
				<NotificationBanner
					type="success"
					title="Success Alert"
					message="This is a success message with helpful information." />

				<NotificationBanner
					type="error"
					title="Error Alert"
					message="This is an error message with important information." />

				<NotificationBanner
					type="warning"
					title="Warning Alert"
					message="This is a warning message with cautionary information." />

				<NotificationBanner
					type="info"
					title="Info Alert"
					message="This is an informational message with helpful details." />

				<!-- Custom Icon Example -->
				<NotificationBanner
					type="success"
					title="Custom Icon Example"
					message="This success alert uses a custom rocket icon instead of the default checkmark."
					:icon="RocketLaunchIcon" />
			</div>
		</section>

		<!-- Spacing & Layout -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Spacing & Layout</h2>
			<div class="space-y-6">
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Spacing Scale</h3>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div class="bg-gray-100 p-1 text-center">
							<div class="bg-gray-asparagus text-white text-xs p-1">p-1</div>
						</div>
						<div class="bg-gray-100 p-2 text-center">
							<div class="bg-gray-asparagus text-white text-xs p-2">p-2</div>
						</div>
						<div class="bg-gray-100 p-3 text-center">
							<div class="bg-gray-asparagus text-white text-xs p-3">p-3</div>
						</div>
						<div class="bg-gray-100 p-4 text-center">
							<div class="bg-gray-asparagus text-white text-xs p-4">p-4</div>
						</div>
						<div class="bg-gray-100 p-6 text-center">
							<div class="bg-gray-asparagus text-white text-xs p-6">p-6</div>
						</div>
						<div class="bg-gray-100 p-8 text-center">
							<div class="bg-gray-asparagus text-white text-xs p-8">p-8</div>
						</div>
					</div>
				</div>

				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Grid Layouts</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div class="bg-gray-100 p-4 text-center">Grid Item 1</div>
						<div class="bg-gray-100 p-4 text-center">Grid Item 2</div>
						<div class="bg-gray-100 p-4 text-center">Grid Item 3</div>
						<div class="bg-gray-100 p-4 text-center">Grid Item 4</div>
						<div class="bg-gray-100 p-4 text-center">Grid Item 5</div>
						<div class="bg-gray-100 p-4 text-center">Grid Item 6</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Responsive Design -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Responsive Design</h2>
			<div class="space-y-6">
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Breakpoints</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between items-center p-2 bg-gray-100 rounded">
							<span class="font-medium">Mobile First</span>
							<span class="text-gray-600">Default (no prefix)</span>
						</div>
						<div class="flex justify-between items-center p-2 bg-gray-100 rounded">
							<span class="font-medium">Small (sm:)</span>
							<span class="text-gray-600">640px and up</span>
						</div>
						<div class="flex justify-between items-center p-2 bg-gray-100 rounded">
							<span class="font-medium">Medium (md:)</span>
							<span class="text-gray-600">768px and up</span>
						</div>
						<div class="flex justify-between items-center p-2 bg-gray-100 rounded">
							<span class="font-medium">Large (lg:)</span>
							<span class="text-gray-600">1024px and up</span>
						</div>
						<div class="flex justify-between items-center p-2 bg-gray-100 rounded">
							<span class="font-medium">Extra Large (xl:)</span>
							<span class="text-gray-600">1280px and up</span>
						</div>
					</div>
				</div>

				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Responsive Examples</h3>
					<div class="space-y-4">
						<div class="flex flex-col sm:flex-row gap-4">
							<div class="flex-1 bg-gray-100 p-4 text-center">Flex Column → Row</div>
							<div class="flex-1 bg-gray-100 p-4 text-center">Responsive Layout</div>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div class="bg-gray-100 p-4 text-center">1 → 2 → 3 Columns</div>
							<div class="bg-gray-100 p-4 text-center">Responsive Grid</div>
							<div class="bg-gray-100 p-4 text-center">Auto Adjust</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Code Examples -->
		<section class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">Code Examples</h2>
			<div class="space-y-6">
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Vue Component Structure</h3>
					<div class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
						<pre><code>&lt;script setup&gt;
import { ref } from 'vue'

// Component logic here
const data = ref([])
&lt;/script&gt;

&lt;template&gt;
  &lt;div class="p-4 pt-8"&gt;
    &lt;h1 class="text-3xl font-bold text-gray-900 mb-6"&gt;Title&lt;/h1&gt;
    &lt;!-- Content here --&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;style scoped&gt;
/* Component-specific styles */
&lt;/style&gt;</code></pre>
					</div>
				</div>

				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-800">Common Tailwind Classes</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-2">
							<h4 class="font-medium text-gray-800">Layout</h4>
							<div class="text-sm space-y-1">
								<div>
									<code class="bg-gray-100 px-1 rounded">flex</code>
									- Flexbox container
								</div>
								<div>
									<code class="bg-gray-100 px-1 rounded">grid</code>
									- CSS Grid container
								</div>
								<div>
									<code class="bg-gray-100 px-1 rounded">hidden</code>
									- Hide element
								</div>
								<div>
									<code class="bg-gray-100 px-1 rounded">block</code>
									- Block display
								</div>
							</div>
						</div>
						<div class="space-y-2">
							<h4 class="font-medium text-gray-800">Spacing</h4>
							<div class="text-sm space-y-1">
								<div>
									<code class="bg-gray-100 px-1 rounded">p-4</code>
									- Padding all sides
								</div>
								<div>
									<code class="bg-gray-100 px-1 rounded">m-2</code>
									- Margin all sides
								</div>
								<div>
									<code class="bg-gray-100 px-1 rounded">gap-4</code>
									- Gap between items
								</div>
								<div>
									<code class="bg-gray-100 px-1 rounded">space-y-4</code>
									- Vertical spacing
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>

<style scoped>
/* Custom styles for the styleguide */
pre {
	white-space: pre-wrap;
	word-wrap: break-word;
}

code {
	font-family: 'Courier New', Courier, monospace;
}

.radio-input {
	@apply w-5 h-5;
	accent-color: theme('colors.gray-asparagus');
}

.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
