import {
	badRequest,
	ensureStore,
	isAuthorized,
	methodNotAllowed,
	normalizePath,
	unauthorized
} from './_shared/media.js'

export const config = {
	path: '/api/delete-item'
}

export default async (req, context) => {
	if (req.method !== 'POST') {
		return methodNotAllowed('POST')
	}

	if (!isAuthorized(req)) {
		return unauthorized()
	}

	let body

	try {
		body = await req.json()
	} catch (error) {
		console.error('Failed to parse request body', error)
		return badRequest('Invalid JSON body')
	}

	const pathValue = normalizePath(body?.path)
	if (!pathValue) {
		return badRequest('Missing or invalid path')
	}

	const store = ensureStore(context)

	try {
		await store.delete(pathValue)
	} catch (error) {
		console.error('Failed to delete blob', error)
		return new Response('Failed to delete file', { status: 500 })
	}

	return Response.json({
		ok: true,
		deleted: pathValue
	})
}

