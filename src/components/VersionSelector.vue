<script setup>
const props = defineProps({
	modelValue: {
		type: String,
		required: true
	},
	versions: {
		type: Array,
		required: true
	},
	enabledVersions: {
		type: Array,
		default: () => []
	}
})

const emit = defineEmits(['update:modelValue'])

function selectVersion(version) {
	if (!props.enabledVersions.length || props.enabledVersions.includes(version)) {
		emit('update:modelValue', version)
	}
}
</script>

<template>
	<div class="mb-6">
		<label class="block text-sm font-medium text-gray-700 mb-2">Minecraft Version:</label>

		<!-- Desktop: Button Pills -->
		<div class="hidden sm:inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
			<button
				v-for="version in versions"
				:key="version"
				@click="selectVersion(version)"
				:class="[
					modelValue === version
						? 'bg-gray-asparagus text-white'
						: enabledVersions.length && !enabledVersions.includes(version)
						? 'bg-gray-200 text-gray-400 cursor-not-allowed'
						: 'bg-norway text-heavy-metal hover:bg-gray-100',
					'px-3 py-1 text-sm font-medium border-r border-gray-asparagus last:border-r-0',
					enabledVersions.length && !enabledVersions.includes(version) ? 'opacity-60' : ''
				]">
				{{ version }}
			</button>
		</div>

		<!-- Mobile: Dropdown -->
		<select
			:value="modelValue"
			@input="emit('update:modelValue', $event.target.value)"
			class="sm:hidden w-full border-2 border-gray-asparagus rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-asparagus focus:border-transparent">
			<option
				v-for="version in versions"
				:key="version"
				:value="version"
				:disabled="enabledVersions.length > 0 && !enabledVersions.includes(version)">
				{{ version }}
			</option>
		</select>
	</div>
</template>
