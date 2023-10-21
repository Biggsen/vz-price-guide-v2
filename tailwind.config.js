/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				'gray-asparagus': '#49584b',
				laurel: '#789471'
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
}
