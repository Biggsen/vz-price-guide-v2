/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				'gray-asparagus': '#49584b',
				highland: '#6b835f',
				amulet: '#85a17e',
				norway: '#a7c3a0',
				'sea-mist': '#c2ddbc', // lighter than norway
				'heavy-metal': '#242c25',
				goldenrod: '#d4a42d',
				flame: '#cb6843',
				'sea-green': '#5E8D64',
				chestnut: '#b85745',
				horizon: '#5b7d98',
				alpine: '#b99130',
				saltpan: '#f8faf3', // new brand color
				// Semantic color aliases
				'semantic-success': '#5E8D64', // sea-green
				'semantic-danger': '#b85745', // chestnut
				'semantic-info': '#5b7d98', // horizon
				'semantic-warning': '#b99130' // alpine
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
}
