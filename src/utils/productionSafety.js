// Production Safety Utilities
// Provides safety checks and warnings for production database operations

import { firebaseConfig } from '../firebase.js'

// Check if we're connected to production database
export function isProductionDatabase() {
	return firebaseConfig.projectId === 'vz-price-guide'
}

// Check if emulators are being used
export function isUsingEmulators() {
	const useEmulators =
		(import.meta.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase() === '1' ||
		(import.meta.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase() === 'true'
	return useEmulators
}

// Check if we're in production development mode
export function isProductionMode() {
	return import.meta.env.VITE_DEV_MODE === 'production'
}

// Get safety status
export function getSafetyStatus() {
	const isProd = isProductionDatabase()
	const isEmulator = isUsingEmulators()
	const isProdMode = isProductionMode()

	return {
		isProductionDatabase: isProd,
		isUsingEmulators: isEmulator,
		isProductionMode: isProdMode,
		isSafe: !isProd || isEmulator,
		requiresConfirmation: isProd && !isEmulator
	}
}

// Show production warning
export function showProductionWarning() {
	const status = getSafetyStatus()

	if (status.requiresConfirmation) {
		console.warn('🚨 PRODUCTION DATABASE OPERATION 🚨')
		console.warn('Project:', firebaseConfig.projectId)
		console.warn('Mode:', status.isProductionMode ? 'Production Development' : 'Standard')
		console.warn('This operation will affect live data!')
		return true
	}

	return false
}

// Confirm production operation
export function confirmProductionOperation(operation = 'database operation') {
	const status = getSafetyStatus()

	if (!status.requiresConfirmation) {
		return true
	}

	const confirmed = window.confirm(
		`🚨 PRODUCTION DATABASE WARNING 🚨\n\n` +
			`You are about to perform: ${operation}\n` +
			`Project: ${firebaseConfig.projectId}\n\n` +
			`This will affect LIVE PRODUCTION DATA!\n\n` +
			`Are you sure you want to continue?`
	)

	if (confirmed) {
		console.warn(`⚠️ Confirmed production operation: ${operation}`)
		return true
	}

	console.log(`❌ Cancelled production operation: ${operation}`)
	return false
}

// Safe wrapper for production operations
export async function safeProductionOperation(operation, fn, options = {}) {
	const { requireConfirmation = true, operationName = operation } = options

	if (requireConfirmation && !confirmProductionOperation(operationName)) {
		throw new Error(`Operation cancelled: ${operationName}`)
	}

	showProductionWarning()

	try {
		const result = await fn()
		console.log(`✅ Production operation completed: ${operationName}`)
		return result
	} catch (error) {
		console.error(`❌ Production operation failed: ${operationName}`, error)
		throw error
	}
}

// Development helper to check current environment
export function logEnvironmentInfo() {
	const status = getSafetyStatus()

	console.group('🔧 Development Environment Info')
	console.log('Project ID:', firebaseConfig.projectId)
	console.log('Is Production Database:', status.isProductionDatabase)
	console.log('Using Emulators:', status.isUsingEmulators)
	console.log('Production Mode:', status.isProductionMode)
	console.log('Safety Status:', status.isSafe ? '✅ Safe' : '⚠️ Production')
	console.groupEnd()

	return status
}
