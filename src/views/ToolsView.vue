<script setup>
import { ref } from 'vue'
import { useCurrentUser } from 'vuefire'
import {
	CalculatorIcon,
	ChartBarIcon,
	Cog6ToothIcon,
	DocumentTextIcon,
	GlobeAltIcon,
	LightBulbIcon,
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
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<div class="bg-white shadow-sm">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div class="text-left">
					<h1 class="text-3xl font-bold text-gray-900 mb-2">Tools Dashboard</h1>
					<p class="text-lg text-gray-600 max-w-2xl mx-auto">
						Access powerful tools to enhance your Minecraft economy management
						experience. Calculate prices, convert formats, generate configurations, and
						analyze your data.
					</p>
				</div>
			</div>
		</div>

		<!-- Main Content -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Tool Categories -->
			<div class="space-y-8">
				<div
					v-for="category in toolCategories"
					:key="category.id"
					class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
					<!-- Category Header -->
					<div class="px-6 py-4 border-b border-gray-200">
						<div class="flex items-center">
							<div :class="[category.color, 'p-3 rounded-lg mr-4']">
								<component :is="category.icon" class="w-6 h-6 text-white" />
							</div>
							<div>
								<h2 class="text-xl font-semibold text-gray-900">
									{{ category.name }}
								</h2>
								<p class="text-gray-600 mt-1">
									{{ category.description }}
								</p>
							</div>
						</div>
					</div>

					<!-- Tools Grid -->
					<div class="p-6">
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							<div
								v-for="tool in category.tools"
								:key="tool.name"
								class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
								<!-- Tool Icon and Status -->
								<div class="flex items-start justify-between mb-4">
									<div :class="[category.color, 'p-2 rounded-lg']">
										<component :is="tool.icon" class="w-5 h-5 text-white" />
									</div>
									<span
										:class="[
											getStatusColor(tool.status),
											'px-2 py-1 rounded-full text-xs font-medium'
										]">
										{{ getStatusText(tool.status) }}
									</span>
								</div>

								<!-- Tool Info -->
								<div>
									<h3 class="text-lg font-semibold text-gray-900 mb-2">
										{{ tool.name }}
									</h3>
									<p class="text-gray-600 text-sm mb-4">
										{{ tool.description }}
									</p>

									<!-- Action Button -->
									<button
										:disabled="tool.status !== 'available'"
										:class="[
											tool.status === 'available'
												? 'bg-gray-asparagus hover:bg-gray-700 text-white'
												: 'bg-gray-200 text-gray-500 cursor-not-allowed',
											'w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200'
										]">
										{{
											tool.status === 'available'
												? 'Open Tool'
												: 'Coming Soon'
										}}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Call to Action -->
			<div class="mt-12 text-center">
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
					<h3 class="text-xl font-semibold text-gray-900 mb-2">Need a specific tool?</h3>
					<p class="text-gray-600 mb-6 max-w-2xl mx-auto">
						Have an idea for a tool that would help with your Minecraft economy
						management? We're always looking for ways to improve the platform.
					</p>
					<div class="flex flex-col sm:flex-row gap-4 justify-center">
						<router-link
							v-if="user?.email"
							to="/suggestions"
							class="inline-flex items-center px-6 py-3 bg-gray-asparagus text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200">
							<LightBulbIcon class="w-5 h-5 mr-2" />
							Suggest a Tool
						</router-link>
						<router-link
							v-else
							to="/signup"
							class="inline-flex items-center px-6 py-3 bg-gray-asparagus text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200">
							<LightBulbIcon class="w-5 h-5 mr-2" />
							Sign Up to Suggest
						</router-link>
						<a
							href="/updates"
							class="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200">
							<SparklesIcon class="w-5 h-5 mr-2" />
							View Updates
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
