import {
	badRequest,
	buildBlobUrls,
	ensureStore,
	isAuthorized,
	isBlobLike,
	methodNotAllowed,
	normalizePath,
	resolveSiteUrl,
	unauthorized
} from './_shared/media.js'

export const config = {
	path: '/api/upload-items'
}

export default async (req, context) => {
	if (req.method !== 'POST') {
		return methodNotAllowed('POST')
	}

	if (!isAuthorized(req)) {
		return unauthorized()
	}

	let form

	try {
		form = await req.formData()
	} catch (error) {
		console.error('Failed to parse form data', error)
		return badRequest('Invalid form data')
	}

	const file = form.get('file')
	const pathValue = normalizePath(form.get('path'))

	if (!isBlobLike(file)) {
		return badRequest('Missing file')
	}

	if (!pathValue) {
		return badRequest('Missing or invalid path')
	}

	const store = ensureStore(context)

	try {
		await store.set(pathValue, file, {
			metadata: {
				contentType: file.type || 'application/octet-stream',
				size: file.size ?? undefined
			}
		})
	} catch (error) {
		console.error('Failed to write blob', error)
		return new Response('Failed to store file', { status: 500 })
	}

	const siteUrl = resolveSiteUrl(req)
	const { blobPath, blobUrl, imageUrl } = buildBlobUrls(siteUrl, pathValue)

	return Response.json({
		ok: true,
		path: pathValue,
		blobPath,
		blobUrl,
		imageUrl
	})
}

