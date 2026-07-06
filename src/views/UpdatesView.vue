<script setup>
import { ref, computed } from 'vue'
import updatesData from '../../data/updates.json'
import roadmapData from '../../data/roadmap.json'
import { roadmapStatusLegend } from '../constants.js'
import { DISCORD_INVITE_URL } from '../constants/socialLinks.js'

// Load data from JSON files and convert date strings to Date objects
const updates = ref(
	updatesData.map((update) => ({
		...update,
		date: new Date(update.date)
	}))
)

const roadmap = ref(roadmapData)
const showAllUpdates = ref(false)
const showCompletedRoadmap = ref(false)

const completedRoadmap = computed(() => {
	return [...roadmap.value]
		.filter((item) => item.status === 'Completed')
		.sort((a, b) => {
			const dateA = new Date(a.completedDate || 0)
			const dateB = new Date(b.completedDate || 0)
			return dateB - dateA
		})
})

const completedRoadmapCount = computed(() => completedRoadmap.value.length)

// Computed property to control displayed updates
const displayedUpdates = computed(() => {
	// Filter out hidden updates
	const visibleUpdates = updates.value.filter((update) => !update.hidden)

	if (showAllUpdates.value) {
		return visibleUpdates
	}
	return visibleUpdates.slice(0, 3)
})

function toggleShowAllUpdates() {
	showAllUpdates.value = !showAllUpdates.value
}

function toggleShowCompletedRoadmap() {
	showCompletedRoadmap.value = !showCompletedRoadmap.value
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

// Parse inline markdown: links [text](url) and bold **text**
function parseLinks(text) {
	if (!text) return ''
	return text
		.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-600">$1</a>'
		)
		.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
}

function getStatusStyle(status) {
	const statusInfo = roadmapStatusLegend[status]
	if (!statusInfo) return { backgroundColor: '#6B7280', color: 'white' }

	return {
		backgroundColor: statusInfo.color,
		color: 'white'
	}
}

function getDependencyTitles(dependencies) {
	if (!dependencies || dependencies.length === 0) return []

	return dependencies.map((depId) => {
		const depItem = roadmap.value.find((item) => item.id === depId)
		return depItem ? depItem.title : `Unknown (ID: ${depId})`
	})
}

function formatCompletionDate(dateString) {
	if (!dateString) return ''
	const date = new Date(dateString)
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

</script>

<template>
	<div class="p-4 py-8 max-w-2xl">
		<h1 class="text-3xl font-bold mb-6 text-gray-800">Updates & Roadmap</h1>

		<!-- Updates Section -->
		<section class="mb-12">
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Recent Updates
			</h2>

			<div class="space-y-4">
				<div v-for="update in displayedUpdates" :key="update.id" class="py-3">
					<div class="mb-3">
						<span class="text-sm text-flame inline-block mb-2">
							{{ formatDate(update.date) }}
						</span>
						<h3 class="text-xl font-semibold text-gray-800">{{ update.title }}</h3>
					</div>
					<p
						class="text-gray-700 whitespace-pre-line"
						v-html="parseLinks(update.description)"></p>
					<div v-if="update.link" class="mt-3">
						<a
							:href="update.link"
							target="_blank"
							rel="noopener noreferrer"
							class="text-gray-800 hover:text-gray-600 font-medium underline transition-colors duration-200">
							{{ update.linkText || 'Visit Link' }}
						</a>
					</div>
					<ul v-if="update.changes && update.changes.length" class="mt-3 ml-6 space-y-1">
						<li
							v-for="change in update.changes"
							:key="change"
							class="text-sm text-gray-600 list-disc"
							v-html="parseLinks(change)"></li>
					</ul>
					<div class="mt-3 flex flex-wrap gap-1">
						<template v-if="update.types">
							<span
								v-for="type in update.types"
								:key="type"
								class="px-3 py-1 rounded-full text-[10px] font-medium bg-white border border-laurel text-gray-asparagus uppercase">
								{{ type }}
							</span>
						</template>
						<template v-else>
							<span
								class="px-3 py-1 rounded-full text-[10px] font-medium bg-white border border-laurel text-gray-asparagus uppercase">
								{{ update.type }}
							</span>
						</template>
					</div>
				</div>
			</div>

			<!-- Show All/Show Less Toggle -->
			<div
				v-if="updates.filter((update) => !update.hidden).length > 3"
				class="mt-6 text-center">
				<button
					@click="toggleShowAllUpdates"
					class="text-highland hover:text-gray-asparagus font-medium underline transition-colors duration-200">
					{{
						showAllUpdates
							? 'Show less'
							: `Show all ${
									updates.filter((update) => !update.hidden).length
							  } updates`
					}}
				</button>
			</div>
		</section>

		<!-- Roadmap Section -->
		<section>
			<h2
				class="text-2xl font-semibold mb-6 text-gray-700 border-b-2 border-gray-asparagus pb-2">
				Roadmap
			</h2>

			<div class="space-y-4 text-gray-700">
				<p class="font-semibold">The roadmap is currently being planned.</p>
				<p>
					I have a number of ideas I'd like to build, but I'd like to get community
					feedback before deciding what to prioritise. I'll be adding ideas to the new
					<a
						:href="DISCORD_INVITE_URL"
						target="_blank"
						rel="noopener noreferrer"
						class="underline hover:text-gray-600">Feature Discussion</a>
					forum on Discord,
					where you can discuss them, vote on them, and help shape the roadmap.
				</p>
				<p>
					Don't use Discord? You can also submit ideas using the
					<router-link to="/suggestions" class="underline hover:text-gray-600">Suggestions</router-link>
					feature on the website.
				</p>
			</div>

			<div v-if="completedRoadmapCount > 0" class="mt-6 text-center">
				<button
					@click="toggleShowCompletedRoadmap"
					class="text-highland hover:text-gray-asparagus font-medium underline transition-colors duration-200">
					{{
						showCompletedRoadmap
							? 'Hide completed'
							: `Show all ${completedRoadmapCount} completed`
					}}
				</button>
			</div>

			<div v-if="showCompletedRoadmap" class="mt-6 space-y-4">
				<div v-for="phase in completedRoadmap" :key="phase.id" class="py-3">
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
						<div class="flex items-center gap-3 mb-2 sm:mb-0">
							<h3 class="text-xl font-semibold text-gray-800">
								{{ phase.title }}
							</h3>
							<span
								:style="getStatusStyle(phase.status)"
								class="px-3 py-1 rounded-full text-[10px] font-medium uppercase">
								{{ phase.status }}
							</span>
						</div>
					</div>

					<p class="text-gray-700 mb-4 whitespace-pre-line">{{ phase.description }}</p>

					<div v-if="phase.completedDate" class="mb-4">
						<h4 class="text-sm font-semibold text-gray-600 mb-1">Released</h4>
						<p class="text-sm text-gray-600">
							{{ formatCompletionDate(phase.completedDate) }}
						</p>
					</div>

					<div v-if="phase.dependencies && phase.dependencies.length" class="mb-4">
						<h4 class="text-sm font-semibold text-gray-600 mb-1">Dependencies</h4>
						<p class="text-sm text-gray-600">
							This feature depends on:
							<span
								v-for="(depTitle, index) in getDependencyTitles(phase.dependencies)"
								:key="index">
								<strong>{{ depTitle }}</strong>
								<span
									v-if="
										index < getDependencyTitles(phase.dependencies).length - 1
									">
									,
								</span>
							</span>
						</p>
					</div>

					<div v-if="phase.features && phase.features.length" class="mb-4">
						<h4 class="text-sm font-semibold text-gray-600 mb-2">Delivered:</h4>
						<ul class="ml-2 space-y-1">
							<li
								v-for="feature in phase.features"
								:key="feature.name"
								class="flex items-start gap-2">
								<span class="text-xs mt-1 flex-shrink-0">✅</span>
								<span class="text-sm line-through text-gray-500">
									{{ feature.name }}
								</span>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style>
