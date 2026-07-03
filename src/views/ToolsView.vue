<script setup>
import { useCurrentUser } from 'vuefire'
import BaseButton from '../components/BaseButton.vue'
import BaseCard from '../components/BaseCard.vue'
import { LightBulbIcon } from '@heroicons/vue/24/outline'

const user = useCurrentUser()
</script>

<template>
	<div class="p-4 py-8">
		<div class="text-left mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Tools</h1>
			<p class="text-gray-600 max-w-2xl">
				Here you will find various server and plugin-related tools that I'm building for
				myself, but they might be useful for other people too. These are the tools I use to
				setup and manage my own Minecraft servers.
			</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
			<BaseCard variant="primary">
				<template #media>
					<img
						src="/images/tools/region-forge.png"
						alt="Region Forge"
						class="w-full h-36 object-cover object-top" />
				</template>
				<template #header>Region Forge</template>
				<template #body>
					<div class="flex flex-col text-left h-full">
						<p class="mb-4">
							Draw, edit, and manage WorldGuard regions on an interactive Map Canvas.
							Export ready-to-use regions.yml files with Minecraft Region Forge.
						</p>
						<div class="mb-6">
							<span class="font-bold">Plugin:</span>
							<a
								href="https://dev.bukkit.org/projects/worldguard"
								target="_blank"
								rel="noopener noreferrer"
								class="ml-2 text-heavy-metal hover:text-gray-asparagus">
								<span class="underline">WorldGuard</span>
							</a>
						</div>
						<a
							href="https://www.minecraftregionforge.com/"
							target="_blank"
							rel="noopener noreferrer"
							class="mt-auto">
							<BaseButton variant="primary" data-cy="region-forge-tool">
								Try Region Forge
							</BaseButton>
						</a>
					</div>
				</template>
			</BaseCard>

			<BaseCard variant="tertiary">
				<template #header>Need a specific tool?</template>
				<template #body>
					<div class="flex flex-col h-full">
						<p class="mb-4 flex-grow">
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
				</template>
			</BaseCard>
		</div>
	</div>
</template>
