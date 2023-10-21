<script setup>
import { ref } from 'vue'
import { useFirebaseAuth } from 'vuefire'
import { signInWithEmailAndPassword } from '@firebase/auth'

const userInput = ref({
	email: '',
	password: ''
})

const auth = useFirebaseAuth()

async function loginToFirebase() {
	signInWithEmailAndPassword(auth, userInput.value.email, userInput.value.password)
		.then((userCredential) => {
			// Signed in
			const user = userCredential.user
			// ...
		})
		.catch((error) => {
			const errorCode = error.code
			const errorMessage = error.message
		})
}

console.log(auth)
</script>

<template>
	<div class="login">
		<h1>This is the login page</h1>
		<form @submit.prevent="loginToFirebase">
			<label>email</label>
			<input type="email" v-model="userInput.email" />
			<br />
			<label>password</label>
			<input type="password" v-model="userInput.password" />
			<br />
			<input type="submit" value="Login" />
		</form>
	</div>
</template>

<style>
@media (min-width: 1024px) {
	.about {
		min-height: 100vh;
		display: flex;
		align-items: center;
	}
}
</style>
