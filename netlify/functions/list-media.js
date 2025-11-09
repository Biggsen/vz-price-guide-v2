import {
	badRequest,
	ensureStore,
	isAuthorized,
	methodNotAllowed,
	normalizePath,
	unauthorized
} from './_shared/media.js'

export const config = {
	path: '/api/list-media'
}

export default async (req, context) => {
	if (req.method !== 'GET') {
		return methodNotAllowed('GET')
	}

	if (!isAuthorized(req)) {
		return unauthorized()
	}

	const store = ensureStore(context)

	const url = new URL(req.url)
	const prefixParam = url.searchParams.get('prefix')

	const prefix = prefixParam ? normalizePath(prefixParam) : 'items/'
	if (!prefix) {
		return badRequest('Invalid prefix')
	}

	try {
		const { blobs, directories } = await store.list({
			directories: true,
			prefix
		})

		return Response.json({
			ok: true,
			prefix,
			items: blobs.map((blob) => ({
				key: blob.key,
				etag: blob.etag
			})),
			directories
		})
	} catch (error) {
		console.error('Failed to list blobs', error)
		return new Response('Failed to list media', { status: 500 })
	}
}

