import { connectLambda, getStore } from '@netlify/blobs'

export const STORE_NAME = 'media'
export const ADMIN_HEADER = 'x-admin-media-key'

export const methodNotAllowed = (allow = 'POST') =>
	new Response('Method Not Allowed', {
		status: 405,
		headers: { Allow: allow }
	})

export const unauthorized = () =>
	new Response('Unauthorized', {
		status: 401
	})

export const badRequest = (message = 'Bad Request') =>
	new Response(message, {
		status: 400
	})

export const isAuthorized = (req) => {
	const adminKey = process.env.ADMIN_MEDIA_KEY
	return Boolean(adminKey) && req.headers.get(ADMIN_HEADER) === adminKey
}

export const normalizePath = (value) => {
	if (typeof value !== 'string') return null
	const trimmed = value.trim().replace(/^\/+/, '')
	if (!trimmed) return null
	if (trimmed.includes('..') || trimmed.includes('\\')) return null
	return trimmed
}

export const isBlobLike = (value) => {
	if (!value) return false
	if (typeof Blob !== 'undefined' && value instanceof Blob) {
		return true
	}
	return typeof value.arrayBuffer === 'function' || typeof value.stream === 'function'
}

export const ensureStore = (context) => {
	if (context?.lambdaEvent) {
		connectLambda(context.lambdaEvent)
	}
	return getStore(STORE_NAME)
}

export const resolveSiteUrl = (req) => {
	const envUrl = process.env.URL || process.env.DEPLOY_URL || process.env.SITE_URL
	if (envUrl) return envUrl
	try {
		const requestUrl = new URL(req.url)
		return requestUrl.origin
	} catch (error) {
		console.error('Failed to resolve site URL', error)
		return ''
	}
}

export const buildBlobUrls = (siteUrl, path) => {
	const baseUrl = siteUrl?.replace(/\/+$/, '') || ''
	const encodedPath = path.split('/').map(encodeURIComponent).join('/')
	const blobPath = `/.netlify/blob/${STORE_NAME}/${encodedPath}`
	const blobUrl = baseUrl ? `${baseUrl}${blobPath}` : blobPath
	const imageUrl = `${baseUrl}/.netlify/images?url=${encodeURIComponent(blobUrl)}`
	return { blobPath, blobUrl, imageUrl }
}

