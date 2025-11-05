<script setup>
import { ref, computed } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useRouter } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
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
	WrenchScrewdriverIcon,
	UserIcon,
	CheckCircleIcon
} from '@heroicons/vue/24/outline'

const user = useCurrentUser()
const router = useRouter()

// Modal state
const showCrateRewardsModal = ref(false)

// Computed properties for authentication states
const isAuthenticated = computed(() => {
	return user.value?.email && user.value?.emailVerified
})

const isSignedInButNotVerified = computed(() => {
	return user.value?.email && !user.value?.emailVerified
})

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

// Navigation functions
function goToSignUp() {
	router.push('/signup')
}

function goToSignIn() {
	router.push('/signin')
}

function goToVerifyEmail() {
	router.push('/verify-email')
}

// Handle crate rewards button click
function handleCrateRewardsClick() {
	if (isAuthenticated.value) {
		// User is authenticated and verified, navigate directly
		router.push('/crate-rewards')
	} else {
		// User is not authenticated or not verified, show modal
		showCrateRewardsModal.value = true
	}
}

function closeCrateRewardsModal() {
	showCrateRewardsModal.value = false
}
</script>

<template>
	<!-- Main Content -->
	<div class="p-4 py-8">
		<!-- Header -->
		<div class="text-left mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Tools</h1>
			<p class="text-gray-600 max-w-2xl">
				Here you will find various server and plugin-related tools that I'm building for
				myself, but they might be useful for other people too. These are the tools I use to
				setup and manage my own Minecraft servers.
			</p>
		</div>
		<!-- Tools Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
			<!-- Crate Rewards Tool Card -->
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
					<p class="text-heavy-metal mb-4">
						Build up crate prizes one item at a time, set their weights, and see their
						values. Export your configuration as CrazyCrates Prizes format for easy
						integration into your server.
					</p>
					<div class="mb-6 text-heavy-metal">
						<span class="font-bold">Plugin:</span>
						<a
							href="https://modrinth.com/plugin/crazycrates"
							target="_blank"
							rel="noopener noreferrer"
							class="text-heavy-metal hover:text-gray-asparagus ml-2">
							<span class="underline">CrazyCrates</span>
						</a>
					</div>
					<BaseButton
						@click="handleCrateRewardsClick"
						variant="primary"
						data-cy="crate-rewards-tool">
						{{ isAuthenticated ? 'Open Crate Rewards' : 'Try Crate Rewards' }}
					</BaseButton>
				</div>
			</div>

			<!-- Minecraft Region Forge Tool Card -->
			<div
				class="bg-norway rounded-lg shadow-md border-2 border-gray-asparagus overflow-hidden flex flex-col">
				<img
					src="/images/tools/region-forge.png"
					alt="Region Forge"
					class="w-full h-36 object-cover object-top border-t-2 border-x-2 border-white rounded-t-lg" />
				<h3
					class="text-xl font-semibold text-white bg-gray-asparagus px-4 py-2 w-full border-x-2 border-white">
					Region Forge
				</h3>
				<div class="text-left p-4 border-2 border-white rounded-b-lg flex flex-col h-full">
					<p class="text-heavy-metal mb-4">
						Draw, edit, and manage WorldGuard regions on an interactive Map Canvas. Export
						ready-to-use regions.yml files with Minecraft Region Forge.
					</p>
					<div class="mb-6 text-heavy-metal">
						<span class="font-bold">Plugin:</span>
						<a
							href="https://dev.bukkit.org/projects/worldguard"
							target="_blank"
							rel="noopener noreferrer"
							class="text-heavy-metal hover:text-gray-asparagus ml-2">
							<span class="underline">WorldGuard</span>
						</a>
					</div>
					<a
						href="https://www.minecraftregionforge.com/"
						target="_blank"
						rel="noopener noreferrer"
						class="mt-auto">
						<BaseButton
							variant="primary"
							data-cy="region-forge-tool">
							Try Region Forge
						</BaseButton>
					</a>
				</div>
			</div>

			<!-- Call to Action Card -->
			<div class="bg-saltpan rounded-lg shadow-md border-2 border-highland">
				<div class="p-6 border-2 border-white rounded-lg h-full flex flex-col">
					<h3 class="text-xl font-semibold text-gray-900 mb-2">Need a specific tool?</h3>
					<p class="text-heavy-metal mb-4 flex-grow">
						Have an idea for a tool that would help with your Minecraft server
						management? I'm always looking for ways to improve the platform.
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

	<!-- Crate Rewards Modal -->
	<BaseModal
		:isOpen="showCrateRewardsModal"
		title="Try Crate Rewards"
		@close="closeCrateRewardsModal">
		<!-- Sign-up content for unauthenticated users -->
		<div v-if="!user?.email" class="text-left pt-2 pb-4 sm:py-4">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Almost there!</h1>
				<p class="mb-6">You'll need an account to use the Crate Rewards tool.</p>
				<p class="text-sm text-gray-900 mb-2">With an account, you can:</p>
				<ul class="text-sm text-gray-900 space-y-1 list-disc list-inside">
					<li>
						import existing crates with items, quantities, weights, and enchantments
					</li>
					<li>build up your own crates and set quantities, weights, and enchantments</li>
					<li>export your crate in CrazyCrates Prizes YAML format</li>
					<li>test your crate with the simulate rewards functionality</li>
				</ul>
			</div>

			<!-- Action buttons -->
			<div>
				<BaseButton @click="goToSignUp" variant="primary">
					<template #left-icon>
						<UserIcon />
					</template>
					Create Account
				</BaseButton>
				<div class="text-left pt-4">
					<p class="text-sm text-gray-500">
						Already have an account?
						<button @click="goToSignIn" class="text-gray-700 hover:text-opacity-80">
							<span class="underline">Sign in</span>
						</button>
					</p>
				</div>
			</div>
		</div>

		<!-- Email verification content for signed-in but unverified users -->
		<div v-else-if="isSignedInButNotVerified" class="text-left pt-2 pb-4 sm:py-4">
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">So close!</h1>
				<p class="mb-6">Please verify your email address to use the Crate Rewards tool.</p>
				<p class="text-sm text-gray-900 mb-2">Once verified, you can:</p>
				<ul class="text-sm text-gray-900 space-y-1 list-disc list-inside">
					<li>
						import existing crates with items, quantities, weights, and enchantments
					</li>
					<li>build up your own crates and set quantities, weights, and enchantments</li>
					<li>export your crate in CrazyCrates Prizes YAML format</li>
					<li>test your crate with the simulate rewards functionality</li>
				</ul>
			</div>

			<!-- Action buttons -->
			<div>
				<BaseButton @click="goToVerifyEmail" variant="primary">
					<template #left-icon>
						<CheckCircleIcon />
					</template>
					Resend verification email
				</BaseButton>
				<div class="text-left pt-4">
					<p class="text-sm text-gray-500">
						Need to sign in with a different account?
						<button @click="goToSignIn" class="text-gray-700 hover:text-opacity-80">
							<span class="underline">Sign in</span>
						</button>
					</p>
				</div>
			</div>
		</div>
	</BaseModal>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
