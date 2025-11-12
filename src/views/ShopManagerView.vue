<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseCard from '../components/BaseCard.vue'
import {
	GlobeAltIcon,
	BuildingStorefrontIcon,
	CurrencyDollarIcon,
	CubeIcon
} from '@heroicons/vue/24/outline'
import { useAdmin } from '../utils/admin.js'
import { useShops } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'

const { user, userProfile } = useAdmin()

// Get user's shops and servers
const { shops } = useShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))

// Find all shops owned by the user (marked with is_own_shop flag)
const ownShops = computed(() => {
	if (!shops.value) return []
	return shops.value.filter((shop) => shop.is_own_shop === true)
})

function getServerForShop(shop) {
	if (!shop || !servers.value) return null
	return servers.value.find((server) => server.id === shop.server_id) || null
}

</script>

<template>
	<div class="p-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
				<div>
						<h1 class="text-3xl font-bold text-gray-900 mb-2">Player Shop Manager</h1>
					<p class="text-gray-600">
						Manage your player shops and track pricing data.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-3 md:gap-4">
					<RouterLink to="/servers">
						<BaseButton variant="secondary">
							<template #left-icon>
								<GlobeAltIcon />
							</template>
							Manage Servers
						</BaseButton>
					</RouterLink>
					<RouterLink to="/shops">
						<BaseButton variant="secondary">
							<template #left-icon>
								<BuildingStorefrontIcon />
							</template>
							Manage Shops
						</BaseButton>
					</RouterLink>
					<RouterLink to="/market-overview">
						<BaseButton variant="secondary">
							<template #left-icon>
								<CurrencyDollarIcon />
							</template>
							View Market
						</BaseButton>
					</RouterLink>
				</div>
			</div>
		</div>

		<!-- Your Shops Section -->
		<div v-if="ownShops.length" class="mb-8">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				My Shops
			</h2>
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<BaseCard
					v-for="shop in ownShops"
					:key="shop.id"
					variant="secondary">
					<template #header>
						<h3
							class="text-xl font-semibold text-heavy-metal hover:text-gray-asparagus cursor-pointer inline-flex items-center gap-2">
							<BuildingStorefrontIcon class="w-5 h-5" />
							{{ shop.name }}
						</h3>
					</template>
					<template #actions>
						<RouterLink
							:to="`/shop-items?shop=${shop.id}`"
							class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
							<CubeIcon class="w-4 h-4" />
						</RouterLink>
					</template>
					<template #body>
						<div class="flex flex-col gap-4 w-full">
							<p v-if="shop.description">
								{{ shop.description }}
							</p>
							<div class="text-sm text-heavy-metal">
								<span class="font-medium">Server:</span>
								{{ getServerForShop(shop)?.name || 'Unknown Server' }}
								<span class="mx-2"></span>
								<span class="font-medium">Version:</span>
								{{ getServerForShop(shop)?.minecraft_version || 'Unknown' }}
								<span v-if="shop.location" class="mx-2"></span>
								<span v-if="shop.location" class="font-medium">Location:</span>
								<span v-if="shop.location">📍 {{ shop.location }}</span>
							</div>
							<RouterLink :to="`/shop-items?shop=${shop.id}`" class="mt-auto w-fit">
								<BaseButton variant="primary">
									<template #left-icon>
										<CubeIcon class="w-4 h-4" />
									</template>
									Manage Items
								</BaseButton>
							</RouterLink>
						</div>
					</template>
				</BaseCard>
		</div>
		</div>

		<!-- Other Section -->
		<div class="mb-8">
			<h2 class="text-2xl font-semibold text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Servers and Shops
			</h2>
		</div>

		<!-- Support Cards -->
		<div class="space-y-6">
			<div
				v-if="servers?.length"
				class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<BaseCard
					v-for="server in servers"
					:key="server.id"
					variant="tertiary"
					class="h-full">
					<template #header>
						<div class="flex flex-col gap-1">
							<h3 class="text-lg font-semibold text-heavy-metal flex items-center gap-2">
								<GlobeAltIcon class="w-5 h-5" />
								{{ server.name }}
							</h3>
							<p class="text-xs text-gray-500">
								Version {{ server.minecraft_version || 'n/a' }}
							</p>
						</div>
					</template>
					<template #body>
						<div class="flex flex-col gap-4">
							<div
								v-if="(shops || []).some((s) => s.server_id === server.id)"
								class="space-y-4">
								<div>
									<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-asparagus/40 pb-1 w-full">
										My Shops
									</h4>
									<ul class="mt-1 space-y-1 text-sm text-gray-600">
										<li
											v-for="shop in (shops || [])
												.filter((s) => s.server_id === server.id && s.is_own_shop)"
											:key="shop.id"
											class="flex items-center gap-3">
											<RouterLink
												:to="{ path: '/shop-items', query: { shop: shop.id } }"
												class="text-base font-semibold text-heavy-metal hover:text-gray-asparagus transition">
												{{ shop.name }}
											</RouterLink>
										</li>
										<li
											v-if="!(shops || []).some((s) => s.server_id === server.id && s.is_own_shop)"
											class="text-sm italic text-gray-500">
											No personal shops yet.
										</li>
									</ul>
								</div>
								<div>
									<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-asparagus/40 pb-1 w-full">
										Competitors
									</h4>
									<ul class="mt-1 space-y-1 text-sm text-gray-600">
										<li
											v-for="shop in (shops || [])
												.filter((s) => s.server_id === server.id && !s.is_own_shop)"
											:key="shop.id"
											class="flex items-center gap-3">
											<RouterLink
												:to="{ path: '/shop-items', query: { shop: shop.id } }"
												class="text-base font-semibold text-heavy-metal hover:text-gray-asparagus transition">
												{{ shop.name }}
											</RouterLink>
										</li>
										<li
											v-if="!(shops || []).some((s) => s.server_id === server.id && !s.is_own_shop)"
											class="text-sm italic text-gray-500">
											No competitor shops tracked.
										</li>
									</ul>
								</div>
							</div>
							<p
								v-else
								class="text-sm italic text-gray-500">
								No shops yet for this server.
							</p>
						</div>
					</template>
				</BaseCard>
			</div>

			<div
				v-else
				class="rounded-xl border border-dashed border-gray-asparagus/50 bg-saltpan px-6 py-10 text-center text-sm text-gray-600">
				<p>No servers yet. Use the Manage Servers button above to add your first server.</p>
			</div>
		</div>
	</div>
</template>
