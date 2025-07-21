<template>
	<footer class="p-3 mt-12">
		<div class="flex gap-4 text-sm">
			<p class="text-heavy-metal text-sm">© 2025</p>
			<router-link to="/privacy-policy" class="text-heavy-metal underline">
				<span class="sm:hidden">Privacy</span>
				<span class="hidden sm:inline">Privacy Policy</span>
			</router-link>
			<router-link to="/cookie-policy" class="text-heavy-metal underline">
				<span class="sm:hidden">Cookies</span>
				<span class="hidden sm:inline">Cookie Policy</span>
			</router-link>
			<router-link to="/terms-of-use" class="text-heavy-metal underline">
				<span class="sm:hidden">Terms</span>
				<span class="hidden sm:inline">Terms of Use</span>
			</router-link>
		</div>
	</footer>
</template>
