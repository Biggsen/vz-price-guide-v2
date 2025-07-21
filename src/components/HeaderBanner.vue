<script setup>
import { CubeIcon } from '@heroicons/vue/24/solid'
</script>

<template>
	<div class="bg-gray-asparagus p-4 sm:p-8 pt-3 sm:pt-7 pattern hidden sm:block">
		<h1
			class="flex items-center gap-2 text-lg sm:text-2xl text-white font-bold [text-shadow:_2px_2px_2px_#000]">
			<CubeIcon
				class="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow mt-1 [filter:_drop-shadow(2px_2px_2px_#000)]" />
			<span class="block sm:hidden">vz's price guide for Minecraft</span>
			<span class="hidden sm:block">verzion's economy price guide for Minecraft</span>
		</h1>
	</div>
</template>

<style scoped lang="scss">
.pattern {
	background-image: repeating-linear-gradient(
			-45deg,
			rgba(120, 148, 113, 0.2) 0,
			rgba(120, 148, 113, 0.2) 1px,
			transparent 0,
			transparent 12.73px
		),
		linear-gradient(rgba(36, 44, 37, 0.5), rgba(36, 44, 37, 0.5)), url('/headerbg.png');
}
</style>
