<script setup>
import { ref, computed } from 'vue'
import updatesData from '../../data/updates.json'
import roadmapData from '../../data/roadmap.json'

// Load data from JSON files and convert date strings to Date objects
const updates = ref(
	updatesData.map((update) => ({
		...update,
		date: new Date(update.date)
	}))
)

const roadmap = ref(roadmapData)
const showAllUpdates = ref(false)

// Computed property to control displayed updates
const displayedUpdates = computed(() => {
	if (showAllUpdates.value) {
		return updates.value
	}
	return updates.value.slice(0, 3)
})

function toggleShowAllUpdates() {
	showAllUpdates.value = !showAllUpdates.value
}

function formatDate(date) {
	const today = new Date()
	const yesterday = new Date(today)
	yesterday.setDate(yesterday.getDate() - 1)

	// Reset time to compare just dates
	const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
	const yesterdayDate = new Date(
		yesterday.getFullYear(),
		yesterday.getMonth(),
		yesterday.getDate()
	)

	if (inputDate.getTime() === todayDate.getTime()) {
		return 'Today'
	} else if (inputDate.getTime() === yesterdayDate.getTime()) {
		return 'Yesterday'
	} else {
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}
}

function getUpdateTypeClass(type) {
	const classes = {
		Feature: 'bg-green-100 text-green-800',
		Enhancement: 'bg-blue-100 text-blue-800',
		Security: 'bg-red-100 text-red-800',
		'Bug Fix': 'bg-yellow-100 text-yellow-800'
	}
	return classes[type] || 'bg-gray-100 text-gray-800'
}

function getStatusClass(status) {
	const classes = {
		Completed: 'bg-green-100 text-green-800',
		'In Progress': 'bg-blue-100 text-blue-800',
		Planned: 'bg-yellow-100 text-yellow-800',
		Future: 'bg-gray-100 text-gray-800'
	}
	return classes[status] || 'bg-gray-100 text-gray-800'
}

function calculateProgress(phase) {
	if (!phase.features || phase.features.length === 0) {
		return 0
	}

	const completedFeatures = phase.features.filter((feature) => feature.completed).length
	const totalFeatures = phase.features.length

	return Math.round((completedFeatures / totalFeatures) * 100)
}
</script>

<template>
	<main class="container px-4 py-6">
		<div class="max-w-4xl">
			<h1 class="text-3xl font-bold mb-6 text-gray-800">Updates & Roadmap</h1>

			<!-- Updates Section -->
			<section class="mb-12">
				<h2
					class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
					Recent Updates
				</h2>

				<div class="space-y-6">
					<div
						v-for="update in displayedUpdates"
						:key="update.id"
						class="bg-gray-100 border border-gray-300 p-6 border-l-4 border-laurel">
						<div class="flex justify-between items-start mb-3">
							<h3 class="text-lg font-semibold text-gray-800">{{ update.title }}</h3>
							<span
								class="text-sm text-gray-500 bg-white px-2 py-1 rounded whitespace-nowrap">
								{{ formatDate(update.date) }}
							</span>
						</div>
						<div class="text-sm text-gray-600 mb-2">
							<span
								:class="getUpdateTypeClass(update.type)"
								class="px-2 py-1 rounded-full text-xs font-medium bg-white">
								{{ update.type }}
							</span>
						</div>
						<p class="text-gray-700 leading-relaxed">{{ update.description }}</p>
						<ul
							v-if="update.changes && update.changes.length"
							class="mt-3 ml-4 space-y-1">
							<li
								v-for="change in update.changes"
								:key="change"
								class="text-sm text-gray-600 list-disc">
								{{ change }}
							</li>
						</ul>
					</div>
				</div>

				<!-- Show All/Show Less Toggle -->
				<div v-if="updates.length > 3" class="mt-6 text-center">
					<button
						@click="toggleShowAllUpdates"
						class="text-laurel hover:text-gray-asparagus font-medium underline transition-colors duration-200">
						{{ showAllUpdates ? 'Show less' : `Show all ${updates.length} updates` }}
					</button>
				</div>
			</section>

			<!-- Roadmap Section -->
			<section>
				<h2
					class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
					Roadmap
				</h2>

				<div class="space-y-8">
					<div
						v-for="phase in roadmap"
						:key="phase.id"
						class="bg-gray-100 border border-gray-300 p-6">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold text-gray-800">{{ phase.title }}</h3>
							<div class="flex items-center gap-2">
								<span
									:class="getStatusClass(phase.status)"
									class="px-3 py-1 rounded-full text-xs font-medium bg-white">
									{{ phase.status }}
								</span>
								<span v-if="phase.timeline" class="text-sm text-gray-500">
									{{ phase.timeline }}
								</span>
							</div>
						</div>

						<p class="text-gray-700 mb-4">{{ phase.description }}</p>

						<div v-if="phase.features && phase.features.length" class="mb-4">
							<h4 class="text-sm font-semibold text-gray-600 mb-2">Planned:</h4>
							<ul class="space-y-2">
								<li
									v-for="feature in phase.features"
									:key="feature.name"
									class="flex items-start gap-2">
									<span class="text-xs mt-1 flex-shrink-0">
										{{ feature.completed ? '✅' : '⏳' }}
									</span>
									<span
										:class="
											feature.completed
												? 'line-through text-gray-500'
												: 'text-gray-700'
										"
										class="text-sm">
										{{ feature.name }}
									</span>
								</li>
							</ul>
						</div>

						<div v-if="phase.status === 'In Progress'" class="bg-blue-50 p-3 rounded">
							<div class="flex justify-between items-center mb-1">
								<span class="text-sm font-medium text-blue-800">Progress</span>
								<span class="text-sm text-blue-600">
									{{ calculateProgress(phase) }}%
								</span>
							</div>
							<div class="w-full bg-blue-200 rounded-full h-2">
								<div
									class="bg-blue-600 h-2 rounded-full transition-all duration-300"
									:style="{ width: calculateProgress(phase) + '%' }"></div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	</main>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
