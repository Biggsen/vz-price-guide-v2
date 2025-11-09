<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getImageUrl } from '../utils/image.js'
import {
	deleteMedia,
	getBlobUrlFromKey,
	listMedia,
	normalizeMediaPath,
	uploadMedia
} from '../utils/media.js'

const selectedFile = ref(null)
const fileInput = ref(null)
const pathInput = ref('')
const uploading = ref(false)
const uploadError = ref('')
const uploadSuccess = ref('')

const currentPrefix = ref('items/')
const prefixInput = ref('items/')
const loadingMedia = ref(false)
const mediaError = ref('')
const mediaItems = ref([])
const mediaDirectories = ref([])

const clipboardMessage = ref('')
let clipboardTimer = null

const canUpload = computed(() => !!selectedFile.value && !!pathInput.value.trim())

const breadcrumbs = computed(() => {
	const parts = currentPrefix.value.replace(/\/+$/, '').split('/')
	return parts.map((part, index) => {
		const path = `${parts.slice(0, index + 1).join('/')}/`
		return {
			label: index === 0 ? part : part.replace(/_/g, ' '),
			path
		}
	})
})

onMounted(async () => {
	await loadMedia()
})

watch(
	() => currentPrefix.value,
	async () => {
		prefixInput.value = currentPrefix.value
		await loadMedia()
	}
)

function resetClipboardMessage() {
	if (clipboardTimer) {
		clearTimeout(clipboardTimer)
	}
	clipboardTimer = setTimeout(() => {
		clipboardMessage.value = ''
	}, 3000)
}

function sanitizeFileName(fileName) {
	const hasExtension = fileName.includes('.')
	const extension = hasExtension ? fileName.split('.').pop().toLowerCase() : ''
	const baseName = hasExtension ? fileName.slice(0, -(extension.length + 1)) : fileName
	const slug = baseName
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')

	return extension ? `${slug}.${extension}` : slug
}

function joinPrefixWithName(prefix, name) {
	const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`
	const joined = `${normalizedPrefix}${name}`.replace(/\/{2,}/g, '/')
	return joined.startsWith('items/') ? joined : `items/${joined.replace(/^items\//, '')}`
}

function handleFileChange(event) {
	const file = event.target.files?.[0]
	selectedFile.value = file || null
	uploadError.value = ''
	uploadSuccess.value = ''

	if (file) {
		try {
			const sanitizedName = sanitizeFileName(file.name)
			const suggestedPath = joinPrefixWithName(currentPrefix.value, sanitizedName)
			pathInput.value = normalizeMediaPath(suggestedPath)
		} catch (error) {
			uploadError.value = error.message
		}
	}
}

function clearUploadForm() {
	selectedFile.value = null
	pathInput.value = ''
	uploadError.value = ''
	uploadSuccess.value = ''
	if (fileInput.value) {
		fileInput.value.value = ''
	}
}

async function handleUpload() {
	if (!canUpload.value || !selectedFile.value) return

	uploadError.value = ''
	uploadSuccess.value = ''
	uploading.value = true

	try {
		const response = await uploadMedia({
			file: selectedFile.value,
			path: pathInput.value
		})
		uploadSuccess.value = `Uploaded ${response.path}`
		await loadMedia()
		clearUploadForm()
	} catch (error) {
		uploadError.value = error.message || 'Upload failed'
	} finally {
		uploading.value = false
	}
}

async function loadMedia() {
	loadingMedia.value = true
	mediaError.value = ''

	try {
		const response = await listMedia(currentPrefix.value)
		const prefixBase = currentPrefix.value.replace(/\/+$/, '')

		const directories = new Set()
		for (const directory of response.directories || []) {
			const path = resolveDirectoryPath(prefixBase, directory)
			directories.add(path)
		}

		mediaDirectories.value = Array.from(directories).map((path) => ({
			path,
			label: path.replace(/\/$/, '').split('/').pop()
		}))

		mediaItems.value = (response.items || []).sort((a, b) => a.key.localeCompare(b.key))
	} catch (error) {
		console.error('Failed to load media', error)
		mediaError.value = error.message || 'Failed to load media items'
		mediaItems.value = []
		mediaDirectories.value = []
	} finally {
		loadingMedia.value = false
	}
}

function resolveDirectoryPath(currentBase, directory) {
	if (!directory) return 'items/'
	const trimmedDirectory = directory.replace(/\/+$/, '')

	if (trimmedDirectory.startsWith('items/')) {
		return `${trimmedDirectory}/`
	}

	const base = currentBase || 'items'
	const joined = `${base}/${trimmedDirectory}`.replace(/\/{2,}/g, '/')
	return `${joined}/`
}

function openDirectory(path) {
	currentPrefix.value = path
}

function goUpOneLevel() {
	const trimmed = currentPrefix.value.replace(/\/+$/, '')
	const lastSlashIndex = trimmed.lastIndexOf('/')

	if (lastSlashIndex <= 5) {
		currentPrefix.value = 'items/'
		return
}

	const parent = trimmed.slice(0, lastSlashIndex)
	currentPrefix.value = `${parent}/`
}

function isAtRoot() {
	return currentPrefix.value === 'items/'
}

async function applyPrefixInput() {
	try {
		const normalized = `${normalizeMediaPath(prefixInput.value)}`.replace(/\/+$/, '')
		currentPrefix.value = `${normalized}/`
	} catch (error) {
		mediaError.value = error.message
	}
}

async function handleDelete(key) {
	if (!window.confirm(`Delete ${key}? This cannot be undone.`)) {
		return
	}

	try {
		await deleteMedia(key)
		await loadMedia()
	} catch (error) {
		mediaError.value = error.message || 'Failed to delete media item'
	}
}

async function copyToClipboard(text, message) {
	try {
		await navigator.clipboard.writeText(text)
		clipboardMessage.value = message
		resetClipboardMessage()
	} catch (error) {
		console.error('Clipboard copy failed', error)
		clipboardMessage.value = 'Failed to copy to clipboard'
		resetClipboardMessage()
	}
}

function getPreviewSrc(key) {
	return getImageUrl(key, { width: 128 })
}

function getBlobUrl(key) {
	return getBlobUrlFromKey(key)
}

function getCdnUrl(key) {
	const blobUrl = getBlobUrl(key)
	return `/.netlify/images?url=${encodeURIComponent(blobUrl)}`
}
</script>

<template>
	<div class="max-w-6xl mx-auto px-4 py-8 space-y-8">
		<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h1 class="text-2xl font-semibold text-gray-900">Media Manager</h1>
			<p class="mt-2 text-sm text-gray-600">
				Upload and manage Netlify Blob assets for item images. Images are stored under
				<code class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">items/*</code> and should use
				<code class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">.webp</code> wherever possible.
			</p>
		</section>

		<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
			<div>
				<h2 class="text-xl font-semibold text-gray-900">Upload Image</h2>
				<p class="text-sm text-gray-600">
					Provide a file and blob path (e.g.
					<code class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
						items/wood/1_21/oak_log.webp
					</code>
					).
				</p>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<label for="media-file" class="text-sm font-medium text-gray-700">File</label>
					<input
						id="media-file"
						ref="fileInput"
						type="file"
						accept=".png,.jpg,.jpeg,.gif,.webp,.avif"
						@change="handleFileChange"
						class="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
					<p class="text-xs text-gray-500">
						Filenames are slugified automatically (spaces become underscores, lowercase, keep extension).
					</p>
				</div>

				<div class="space-y-2">
					<label for="media-path" class="text-sm font-medium text-gray-700">Blob Path</label>
					<input
						id="media-path"
						v-model="pathInput"
						type="text"
						placeholder="items/category/version/slug.webp"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono" />
					<p class="text-xs text-gray-500">Paths must reside in the <code>items/</code> namespace.</p>
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					@click="handleUpload"
					:disabled="!canUpload || uploading"
					class="inline-flex items-center rounded-md bg-semantic-info px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
					<span v-if="uploading" class="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
					Upload
				</button>
				<button
					type="button"
					@click="clearUploadForm"
					class="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
					Clear
				</button>
				<span v-if="uploadSuccess" class="text-sm text-green-600">{{ uploadSuccess }}</span>
				<span v-if="uploadError" class="text-sm text-red-600">{{ uploadError }}</span>
			</div>
		</section>

		<section class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Stored Images</h2>
					<div class="flex items-center gap-2 text-sm text-gray-600">
						<span>Prefix:</span>
						<nav class="flex items-center gap-1 text-gray-700">
							<span
								v-for="(crumb, index) in breadcrumbs"
								:key="crumb.path"
								class="flex items-center gap-1">
								<button
									type="button"
									class="text-blue-600 hover:text-blue-800 font-mono text-xs"
									@click="currentPrefix = crumb.path">
									{{ crumb.label }}
								</button>
								<span v-if="index !== breadcrumbs.length - 1">/</span>
							</span>
						</nav>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<input
						v-model="prefixInput"
						type="text"
						class="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="items/wood/" />
					<button
						type="button"
						@click="applyPrefixInput"
						class="inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700">
						Go
					</button>
					<button
						type="button"
						@click="goUpOneLevel"
						:disabled="isAtRoot()"
						class="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
						Up one level
					</button>
				</div>
			</div>

			<div v-if="clipboardMessage" class="text-sm text-green-600">{{ clipboardMessage }}</div>
			<div v-if="mediaError" class="text-sm text-red-600">{{ mediaError }}</div>

			<div v-if="loadingMedia" class="flex items-center gap-2 text-sm text-gray-600">
				<span class="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></span>
				Loading media...
			</div>

			<div v-else class="space-y-6">
				<div v-if="mediaDirectories.length" class="space-y-2">
					<h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Directories</h3>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="directory in mediaDirectories"
							:key="directory.path"
							type="button"
							@click="openDirectory(directory.path)"
							class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">
							{{ directory.label }}
						</button>
					</div>
				</div>

				<div class="border border-gray-200 rounded-lg overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 text-sm">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider w-24">
									Preview
								</th>
								<th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider">
									Key
								</th>
								<th class="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider w-48">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							<tr v-if="!mediaItems.length">
								<td colspan="3" class="px-4 py-6 text-center text-sm text-gray-500">
									No images found for this prefix.
								</td>
							</tr>
							<tr v-for="item in mediaItems" :key="item.key">
								<td class="px-4 py-3">
									<div class="w-16 h-16 border border-gray-200 rounded flex items-center justify-center bg-gray-50 overflow-hidden">
										<img
											:src="getPreviewSrc(item.key)"
											:alt="item.key"
											class="max-w-full max-h-full object-contain" />
									</div>
								</td>
								<td class="px-4 py-3 font-mono text-xs text-gray-800">
									{{ item.key }}
								</td>
								<td class="px-4 py-3">
									<div class="flex flex-wrap gap-2">
										<button
											type="button"
											class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
											@click="copyToClipboard(item.key, 'Blob key copied')">
											Copy key
										</button>
										<button
											type="button"
											class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
											@click="copyToClipboard(getBlobUrl(item.key), 'Blob URL copied')">
											Copy blob URL
										</button>
										<button
											type="button"
											class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
											@click="copyToClipboard(getCdnUrl(item.key), 'CDN URL copied')">
											Copy CDN URL
										</button>
										<button
											type="button"
											class="inline-flex items-center rounded-md bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
											@click="handleDelete(item.key)">
											Delete
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>
	</div>
</template>

