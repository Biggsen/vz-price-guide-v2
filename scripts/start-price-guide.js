#!/usr/bin/env node

const { spawn } = require('child_process')
const { exec } = require('child_process')
const path = require('path')

console.log('🚀 Starting VZ Price Guide...\n')

// Function to run a command and return a promise
function runCommand(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: 'inherit',
			shell: true,
			...options
		})

		child.on('close', (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`Command failed with exit code ${code}`))
			}
		})

		child.on('error', (error) => {
			reject(error)
		})
	})
}

// Function to run a command in the background
function runCommandBackground(command, args = [], options = {}) {
	const child = spawn(command, args, {
		stdio: 'pipe',
		shell: true,
		...options
	})

	// Don't wait for this process to complete
	child.unref()
	return child
}

async function startPriceGuide() {
	try {
		console.log('1️⃣ Starting Firebase emulators...')
		const emulatorProcess = runCommandBackground('npm', ['run', 'emulators'])

		// Wait a moment for emulators to start
		console.log('   ⏳ Waiting for emulators to initialize...')
		await new Promise((resolve) => setTimeout(resolve, 5000))

		console.log('2️⃣ Seeding database...')
		await runCommand('npm', ['run', 'seed:emu'])

		console.log('3️⃣ Starting development server...')
		const devProcess = runCommandBackground('npm', ['run', 'dev'])

		// Wait a moment for dev server to start
		console.log('   ⏳ Waiting for dev server to start...')
		await new Promise((resolve) => setTimeout(resolve, 3000))

		console.log('4️⃣ Opening browser...')
		await runCommand('start', ['http://localhost:5180'])

		console.log('\n✅ Price Guide is now running!')
		console.log('   🌐 App: http://localhost:5180')
		console.log('   🔥 Emulator UI: http://127.0.0.1:4080')
		console.log('\n📝 To stop all services, press Ctrl+C')

		// Keep the script running
		process.on('SIGINT', () => {
			console.log('\n🛑 Shutting down...')
			emulatorProcess.kill()
			devProcess.kill()
			process.exit(0)
		})

		// Keep the process alive
		await new Promise(() => {})
	} catch (error) {
		console.error('❌ Error starting Price Guide:', error.message)
		process.exit(1)
	}
}

startPriceGuide()
