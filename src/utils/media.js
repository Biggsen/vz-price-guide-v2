const ADMIN_HEADER = 'x-admin-media-key'
const BLOB_PREFIX = '/.netlify/blob/media/'
const LEGACY_PREFIX = '/images/items/'

function getAdminKey() {
	const key = import.meta.env.VITE_ADMIN_MEDIA_KEY
	if (!key) {
		throw new Error('Missing VITE_ADMIN_MEDIA_KEY environment variable')
	}
	return key
}

function withAdminHeaders(extra = {}) {
	return {
		...extra,
		[ADMIN_HEADER]: getAdminKey()
	}
}

export function normalizeMediaPath(value) {
	if (value === undefined || value === null) {
		throw new Error('Image path is required')
	}

	const trimmed = String(value).trim()
	if (!trimmed) {
		throw new Error('Image path cannot be empty')
	}

	if (trimmed.includes('..')) {
		throw new Error('Path cannot contain ".."')
	}

	let normalized = trimmed.replace(/\\/g, '/')

	if (normalized.startsWith(BLOB_PREFIX)) {
		normalized = normalized.slice(BLOB_PREFIX.length)
	}

	if (normalized.startsWith(LEGACY_PREFIX)) {
		normalized = normalized.slice(LEGACY_PREFIX.length)
	}

	if (normalized.startsWith('/')) {
		normalized = normalized.slice(1)
	}

	normalized = normalized.replace(/^items\//, '')

	if (!normalized || normalized.endsWith('/')) {
		throw new Error('Image path must include a file name')
	}

	return `items/${normalized}`
}

export function getBlobUrlFromKey(key) {
	const normalized = normalizeMediaPath(key)
	const encoded = normalized.split('/').map(encodeURIComponent).join('/')
	return `${BLOB_PREFIX}${encoded}`
}

export async function uploadMedia({ file, path }) {
	if (!(file instanceof File || (typeof Blob !== 'undefined' && file instanceof Blob))) {
		throw new Error('A file is required for upload')
	}

	const mediaPath = normalizeMediaPath(path)
	const formData = new FormData()
	formData.append('file', file)
	formData.append('path', mediaPath)

	const response = await fetch('/api/upload-items', {
		method: 'POST',
		headers: withAdminHeaders(),
		body: formData
	})

	if (!response.ok) {
		const message = await response.text()
		throw new Error(message || 'Upload failed')
	}

	return response.json()
}

export async function deleteMedia(path) {
	const mediaPath = normalizeMediaPath(path)
	const response = await fetch('/api/delete-item', {
		method: 'POST',
		headers: withAdminHeaders({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify({ path: mediaPath })
	})

	if (!response.ok) {
		const message = await response.text()
		throw new Error(message || 'Delete failed')
	}

	return response.json()
}

export async function listMedia(prefix = 'items/') {
	const params = new URLSearchParams()
	if (prefix) {
		const normalizedPrefix = normalizeListPrefix(prefix)
		params.set('prefix', normalizedPrefix)
	}

	const response = await fetch(`/api/list-media?${params.toString()}`, {
		headers: withAdminHeaders(),
		cache: 'no-store'
	})

	if (!response.ok) {
		const message = await response.text()
		throw new Error(message || 'Failed to load media')
	}

	return response.json()
}

function normalizeListPrefix(prefix) {
	if (prefix === undefined || prefix === null) return 'items/'

	const trimmed = String(prefix).trim()
	if (!trimmed) return 'items/'
	if (trimmed.includes('..')) {
		throw new Error('Prefix cannot contain ".."')
	}

	let normalized = trimmed.replace(/\\/g, '/')

	if (normalized.startsWith(BLOB_PREFIX)) {
		normalized = normalized.slice(BLOB_PREFIX.length)
	}

	if (normalized.startsWith(LEGACY_PREFIX)) {
		normalized = normalized.slice(LEGACY_PREFIX.length)
	}

	if (normalized.startsWith('/')) {
		normalized = normalized.slice(1)
	}

	normalized = normalized.replace(/^items\//, '')

	const base = normalized ? `items/${normalized}` : 'items'
	return base.endsWith('/') ? base : `${base}/`
}

