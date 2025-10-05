<script setup>
import { ref } from 'vue'
import { useCurrentUser } from 'vuefire'
import BaseButton from '../components/BaseButton.vue'
import {
	CalculatorIcon,
	ChartBarIcon,
	Cog6ToothIcon,
	DocumentTextIcon,
	GlobeAltIcon,
	LightBulbIcon,
	RocketLaunchIcon,
	PuzzlePieceIcon,
	SparklesIcon,
	WrenchScrewdriverIcon
} from '@heroicons/vue/24/outline'

const user = useCurrentUser()

// Tool categories and their tools
const toolCategories = ref([
	{
		id: 'calculators',
		name: 'Calculators',
		description: 'Mathematical tools for pricing and economics',
		icon: CalculatorIcon,
		color: 'bg-blue-500',
		tools: [
			{
				name: 'Price Calculator',
				description: 'Calculate item prices with custom multipliers and margins',
				status: 'coming-soon',
				icon: CalculatorIcon
			},
			{
				name: 'Stack Value Calculator',
				description: 'Calculate the total value of item stacks',
				status: 'coming-soon',
				icon: ChartBarIcon
			},
			{
				name: 'Profit Margin Calculator',
				description: 'Calculate buy/sell profit margins for items',
				status: 'coming-soon',
				icon: ChartBarIcon
			}
		]
	},
	{
		id: 'converters',
		name: 'Converters',
		description: 'Convert between different formats and units',
		icon: Cog6ToothIcon,
		color: 'bg-green-500',
		tools: [
			{
				name: 'JSON to YAML Converter',
				description: 'Convert price lists between JSON and YAML formats',
				status: 'available',
				icon: DocumentTextIcon
			},
			{
				name: 'Version Converter',
				description: 'Convert item data between Minecraft versions',
				status: 'coming-soon',
				icon: PuzzlePieceIcon
			}
		]
	},
	{
		id: 'generators',
		name: 'Generators',
		description: 'Generate useful content and configurations',
		icon: SparklesIcon,
		color: 'bg-purple-500',
		tools: [
			{
				name: 'Shop Configuration Generator',
				description: 'Generate shop plugin configurations from price lists',
				status: 'coming-soon',
				icon: WrenchScrewdriverIcon
			},
			{
				name: 'Recipe Generator',
				description: 'Generate crafting recipes for items',
				status: 'coming-soon',
				icon: LightBulbIcon
			}
		]
	},
	{
		id: 'analyzers',
		name: 'Analyzers',
		description: 'Analyze and visualize your data',
		icon: ChartBarIcon,
		color: 'bg-orange-500',
		tools: [
			{
				name: 'Price Trend Analyzer',
				description: 'Analyze price trends over time',
				status: 'coming-soon',
				icon: ChartBarIcon
			},
			{
				name: 'Market Analysis',
				description: 'Analyze market conditions and opportunities',
				status: 'coming-soon',
				icon: GlobeAltIcon
			}
		]
	}
])

function getStatusColor(status) {
	switch (status) {
		case 'available':
			return 'bg-green-100 text-green-800'
		case 'coming-soon':
			return 'bg-yellow-100 text-yellow-800'
		case 'beta':
			return 'bg-blue-100 text-blue-800'
		default:
			return 'bg-gray-100 text-gray-800'
	}
}

function getStatusText(status) {
	switch (status) {
		case 'available':
			return 'Available'
		case 'coming-soon':
			return 'Coming Soon'
		case 'beta':
			return 'Beta'
		default:
			return 'Unknown'
	}
}
</script>

<template>
	<!-- Main Content -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
		<!-- Header -->
		<div class="text-left mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Tools Dashboard</h1>
			<p class="text-gray-600 max-w-2xl">
				Here you will find various server and plugin-related tools that I'm building for
				myself, but they might be useful for other people too. From price calculators to
				config generators, these are the utilities I use to manage my own Minecraft servers.
			</p>
		</div>
		<!-- New Asparagus Card -->
		<div class="mb-12 w-1/3">
			<div
				class="bg-norway rounded-lg shadow-md border-2 border-gray-asparagus overflow-hidden">
				<img
					src="/images/tools/crate-rewards.png"
					alt="Crate Rewards"
					class="w-full h-36 object-cover object-top border-t-2 border-x-2 border-white rounded-t-lg" />
				<h3
					class="text-xl font-semibold text-white bg-gray-asparagus px-4 py-2 w-full border-x-2 border-white">
					CrazyCrates Crate Rewards
				</h3>
				<div class="text-left p-4 border-2 border-white rounded-b-lg">
					<p class="text-heavy-metal mb-4 max-w-2xl mx-auto">
						Build up crate prizes one item at a time, set their weights, and see their
						values. Export your configuration as CrazyCrates Prizes format for easy
						integration into your server.
					</p>
					<div class="mb-6 text-heavy-metal">
						<span class="font-bold">Plugin:</span>
						<a
							href="https://modrinth.com/plugin/crazycrates"
							class="text-heavy-metal hover:text-gray-asparagus ml-2">
							<span class="underline">CrazyCrates</span>
						</a>
					</div>
					<router-link to="/crate-rewards">
						<BaseButton variant="primary">Try Crate Rewards</BaseButton>
					</router-link>
				</div>
			</div>
		</div>

		<!-- Call to Action -->
		<div class="mt-12 text-left w-1/3">
			<div class="bg-saltpan rounded-lg shadow-md border-2 border-laurel">
				<div class="p-6 border-2 border-white rounded-lg">
					<h3 class="text-xl font-semibold text-gray-900 mb-2">Need a specific tool?</h3>
					<p class="text-heavy-metal mb-4 max-w-2xl">
						Have an idea for a tool that would help with your Minecraft economy
						management? We're always looking for ways to improve the platform.
					</p>
					<div class="flex flex-col sm:flex-row gap-4">
						<router-link v-if="user?.email" to="/suggestions">
							<BaseButton variant="secondary">
								<template #left-icon>
									<LightBulbIcon />
								</template>
								Suggest a Tool
							</BaseButton>
						</router-link>
						<router-link v-else to="/signup">
							<BaseButton variant="secondary">
								<template #left-icon>
									<LightBulbIcon />
								</template>
								Sign Up to Suggest
							</BaseButton>
						</router-link>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
