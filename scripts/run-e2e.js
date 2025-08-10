const { spawn } = require('child_process')
const waitOn = require('wait-on')
const net = require('net')
const http = require('http')

function checkPortAvailable(port) {
	return new Promise((resolve) => {
		const tester = net
			.createServer()
			.once('error', () => resolve(false))
			.once('listening', () => tester.once('close', () => resolve(true)).close())
			.listen(port, '127.0.0.1')
	})
}

async function pickPort(preferredPort, fallbacks = []) {
	const candidates = [preferredPort, ...fallbacks]
	for (const port of candidates) {
		// If available, use it
		// Close the test server and return the port
		const available = await checkPortAvailable(port)
		if (available) return port
	}
	// As a last resort, return the preferred port
	return preferredPort
}

async function run() {
	const port = await pickPort(5173, [5174, 5175])
	const host = '127.0.0.1'
	const url = `http://${host}:${port}`

	// Start Vite dev server on the chosen port
	const server = spawn(
		process.platform === 'win32' ? 'npx.cmd' : 'npx',
		['vite', '--port', String(port), '--strictPort', '--host', host],
		{
			stdio: 'inherit',
			env: process.env,
			shell: true
		}
	)

	let serverExited = false
	server.on('exit', () => {
		serverExited = true
	})

	// Fallback poller in case wait-on has issues
	async function waitForHttpReady(targetUrl, timeoutMs = 120_000, intervalMs = 500) {
		const start = Date.now()
		return new Promise((resolve, reject) => {
			const attempt = () => {
				if (serverExited) return reject(new Error('Dev server exited early'))
				const req = http.get(targetUrl, (res) => {
					const statusOk = res.statusCode && res.statusCode >= 200 && res.statusCode < 500
					res.resume()
					if (statusOk) return resolve(true)
					if (Date.now() - start > timeoutMs)
						return reject(new Error('Timed out waiting for server'))
					setTimeout(attempt, intervalMs)
				})
				req.on('error', () => {
					if (Date.now() - start > timeoutMs)
						return reject(new Error('Timed out waiting for server'))
					setTimeout(attempt, intervalMs)
				})
			}
			attempt()
		})
	}

	try {
		// Try wait-on first; if it hangs on Windows, our fallback will also ensure readiness
		await Promise.race([
			waitOn({ resources: [`http-get://${host}:${port}/`], timeout: 120000, interval: 500 }),
			waitForHttpReady(`${url}/`, 120_000, 500)
		])
		console.log(`[e2e] Dev server is up at ${url}`)
	} catch (err) {
		console.error('Dev server did not start in time')
		if (!serverExited) server.kill()
		process.exit(1)
	}

	// Run Cypress tests with matching baseUrl
	const cypressEnv = { ...process.env, CYPRESS_baseUrl: url }
	console.log(`[e2e] Starting Cypress with baseUrl=${url}`)
	const cypress = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'cy:run'], {
		stdio: 'inherit',
		env: cypressEnv,
		shell: true
	})

	cypress.on('exit', (code) => {
		if (!serverExited) {
			if (process.platform === 'win32') {
				spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'inherit' })
			} else {
				server.kill('SIGTERM')
			}
		}
		process.exit(code || 0)
	})
}

run().catch((e) => {
	console.error(e)
	process.exit(1)
})
