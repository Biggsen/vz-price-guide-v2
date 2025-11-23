import { getFunctions, httpsCallable } from 'firebase/functions'
import { firebaseApp } from '../firebase'

export async function updateShopManagerAccess(userId, shopManager) {
	if (!userId || typeof shopManager !== 'boolean') {
		throw new Error('userId and shopManager (boolean) are required')
	}

	const functions = getFunctions(firebaseApp, 'us-central1')
	const updateAccess = httpsCallable(functions, 'updateShopManagerAccess')

	const result = await updateAccess({ userId, shopManager })
	return result.data
}

