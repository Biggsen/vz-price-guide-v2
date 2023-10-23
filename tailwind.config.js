/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				'gray-asparagus': '#49584b',
				laurel: '#789471',
				norway: '#a7c3a0'
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
}
