const { spawn } = require('child_process')
const waitOn = require('wait-on')
const net = require('net')

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
	const url = `http://localhost:${port}`

	// Start Vite dev server on the chosen port
	const server = spawn(
		process.platform === 'win32' ? 'npx.cmd' : 'npx',
		['vite', '--port', String(port), '--strictPort'],
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

	try {
		await waitOn({ resources: [`http-get://${url.replace('http://', '')}`], timeout: 120000 })
	} catch (err) {
		console.error('Dev server did not start in time')
		if (!serverExited) server.kill()
		process.exit(1)
	}

	// Run Cypress tests with matching baseUrl
	const cypressEnv = { ...process.env, CYPRESS_baseUrl: url }
	const cypress = spawn('npm run cy:run', {
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
