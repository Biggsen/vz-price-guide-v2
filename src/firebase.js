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

export const db = getFirestore(firebaseApp)
export const auth = getAuth(firebaseApp)

if (useEmulators && typeof window !== 'undefined') {
	try {
		connectFirestoreEmulator(db, '127.0.0.1', 8080)
	} catch {}
	try {
		connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
	} catch {}
}
