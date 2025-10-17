/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
	root: true,
	extends: [
		'plugin:vue/vue3-essential',
		'eslint:recommended',
		'@vue/eslint-config-prettier/skip-formatting'
	],
	parserOptions: {
		ecmaVersion: 'latest'
	},
	env: {
		node: true,
		browser: true
	},
	overrides: [
		{
			files: ['*.config.js', 'scripts/**/*.js'],
			env: {
				node: true
			},
			globals: {
				require: 'readonly',
				module: 'readonly',
				process: 'readonly',
				__dirname: 'readonly'
			}
		},
		{
			files: ['cypress/**/*.js'],
			env: {
				'cypress/globals': true
			},
			extends: ['plugin:cypress/recommended']
		}
	],
	rules: {
		'no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				ignoreRestSiblings: true
			}
		]
	}
}
