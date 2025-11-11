<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import { GlobeAltIcon, BuildingStorefrontIcon, CurrencyDollarIcon } from '@heroicons/vue/24/outline'
import { useAdmin } from '../utils/admin.js'
import { useShops } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'

const { user, userProfile } = useAdmin()

// Get user's shops and servers
const { shops } = useShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))

// Find the user's own shop (marked with is_own_shop flag)
const ownShop = computed(() => {
	if (!shops.value) return null
	return shops.value.find((shop) => shop.is_own_shop === true)
})

// Get the server info for the own shop
const ownShopServer = computed(() => {
	if (!ownShop.value || !servers.value) return null
	return servers.value.find((server) => server.id === ownShop.value.server_id)
})

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
		<div v-if="ownShop" class="mb-8">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Your Shops
			</h2>
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div
					class="bg-sea-mist rounded-lg shadow-md border-2 border-amulet h-full overflow-hidden flex flex-col">
				<!-- Card Header -->
				<div
					class="bg-amulet py-2 px-3 pl-4 border-x-2 border-t-2 border-white rounded-t-lg">
					<div class="flex items-center justify-between">
						<h3
							class="text-xl font-semibold text-heavy-metal hover:text-gray-asparagus cursor-pointer flex-1 inline-flex items-center gap-2">
							<BuildingStorefrontIcon class="w-5 h-5" />
							{{ ownShop.name }}
						</h3>
						<!-- Action Buttons -->
						<div class="flex gap-2 ml-3">
							<RouterLink
								:to="`/shop-items?shop=${ownShop.id}`"
								class="p-1 bg-gray-asparagus text-white hover:bg-opacity-80 transition-colors rounded">
								<svg
									class="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
								</svg>
							</RouterLink>
						</div>
					</div>
				</div>
				<!-- Card Body -->
				<div
					class="bg-norway p-4 border-x-2 border-b-2 border-white rounded-b-lg flex-1 flex flex-col">
					<div class="flex-1">
						<p class="text-heavy-metal mb-3">
							{{ ownShop.description || 'Your main economy shop for managing item prices and inventory.' }}
						</p>
						<div class="text-sm text-heavy-metal">
							<span class="font-medium">Server:</span>
							{{ ownShopServer?.name || 'Unknown Server' }}
							<span class="mx-2"></span>
							<span class="font-medium">Version:</span>
							{{ ownShopServer?.minecraft_version || 'Unknown' }}
							<span v-if="ownShop.location" class="mx-2"></span>
							<span v-if="ownShop.location" class="font-medium">Location:</span>
							<span v-if="ownShop.location">📍 {{ ownShop.location }}</span>
						</div>
					</div>
					<div class="mt-4 flex-shrink-0">
						<RouterLink :to="`/shop-items?shop=${ownShop.id}`">
							<BaseButton variant="primary">
								<template #left-icon>
									<svg
										class="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
									</svg>
								</template>
								Manage Items
							</BaseButton>
						</RouterLink>
					</div>
				</div>
			</div>
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
				<div
					v-for="server in servers"
					:key="server.id"
					class="bg-saltpan rounded-lg shadow-md border-2 border-highland h-full">
					<div class="p-6 border-2 border-white rounded-lg h-full flex flex-col space-y-4">
						<div>
						<h3 class="text-lg font-semibold text-heavy-metal flex items-center gap-2">
							<GlobeAltIcon class="w-5 h-5" />
							{{ server.name }}
						</h3>
							<p class="mt-1 text-xs text-gray-500">
								Version {{ server.minecraft_version || 'n/a' }}
							</p>

							<div
								v-if="(shops || []).some((s) => s.server_id === server.id)"
								class="mt-3 space-y-3">
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
									<h4 class="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-asparagus/40 pb-1 w-full">
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
								class="mt-3 text-sm italic text-gray-500">
								No shops yet for this server.
							</p>
						</div>

					</div>
				</div>
			</div>

			<div
				v-else
				class="rounded-xl border border-dashed border-gray-asparagus/50 bg-saltpan px-6 py-10 text-center text-sm text-gray-600">
				<p>No servers yet. Use the Manage Servers button above to add your first server.</p>
			</div>
		</div>
	</div>
</template>
