import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const require = createRequire(import.meta.url)
const { fetchAndSaveWikiImage, fetchAndSaveWikiInviconImage } = require('./scripts/lib/wikiImageScrape.js')

function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		let data = ''
		req.on('data', (chunk) => {
			data += chunk
		})
		req.on('end', () => {
			try {
				resolve(data ? JSON.parse(data) : {})
			} catch (error) {
				reject(error)
			}
		})
		req.on('error', reject)
	})
}

function wikiImageDevApiPlugin() {
	return {
		name: 'wiki-image-dev-api',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				if (req.url !== '/api/wiki-image' || req.method !== 'POST') {
					next()
					return
				}

				try {
					const body = await readJsonBody(req)
					const item = {
						material_id: body.material_id,
						name: body.name,
						url: body.url
					}
					const mode = body.mode === 'invicon' ? 'invicon' : 'infobox'

					if (!item.material_id && !item.name) {
						res.statusCode = 400
						res.setHeader('Content-Type', 'application/json')
						res.end(JSON.stringify({ ok: false, error: 'material_id or name is required' }))
						return
					}

					const result =
						mode === 'invicon'
							? await fetchAndSaveWikiInviconImage(item)
							: await fetchAndSaveWikiImage(item)
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.end(JSON.stringify({ ok: true, mode, ...result }))
				} catch (error) {
					res.statusCode = error.code === 'NOT_FOUND' ? 404 : 500
					res.setHeader('Content-Type', 'application/json')
					res.end(
						JSON.stringify({
							ok: false,
							error: error.message,
							wikiUrl: error.wikiUrl || null
						})
					)
				}
			})
		}
	}
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue(), wikiImageDevApiPlugin()],
	server: {
		host: true,
		port: 5180
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	test: {
		globals: true,
		environment: 'jsdom'
	}
})
