// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig)

// Connect to local emulators during E2E/dev when opted in
const useEmulators =
	(import.meta.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase() === '1' ||
	(import.meta.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase() === 'true'

// Check if we're in production mode
const isProductionMode = import.meta.env.VITE_DEV_MODE === 'production'
const isProductionDatabase = firebaseConfig.projectId === 'vz-price-guide'

export const db = getFirestore(firebaseApp)
export const auth = getAuth(firebaseApp)

// Safety warning for production database access
if (typeof window !== 'undefined' && isProductionDatabase && !useEmulators) {
	console.warn('🚨 PRODUCTION DATABASE MODE ACTIVE 🚨')
	console.warn('You are connected to the live production database.')
	console.warn('All changes will affect live users and data.')

	if (isProductionMode) {
		console.warn('Development mode: production - extra caution advised')
	}
}

if (useEmulators && typeof window !== 'undefined') {
	try {
		// Use the current hostname to allow network access from mobile devices
		const hostname = window.location.hostname
		connectFirestoreEmulator(db, hostname, 8080)
		console.log('📱 Connected to Firestore emulator')
	} catch {}
	try {
		const hostname = window.location.hostname
		connectAuthEmulator(auth, `http://${hostname}:9099`, { disableWarnings: true })
		console.log('🔐 Connected to Auth emulator')
	} catch {}
}
