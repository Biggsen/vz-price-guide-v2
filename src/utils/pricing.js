export function formatNumber(num) {
	if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) {
		return '0'
	}

	const units = [
		{ value: 1000000000, suffix: 'B' },
		{ value: 1000000, suffix: 'M' },
		{ value: 1000, suffix: 'k' }
	]

	for (const { value, suffix } of units) {
		if (num >= value) {
			const scaled = num / value
			const rounded = scaled === Math.floor(scaled) ? scaled : Math.round(scaled * 10) / 10
			return rounded + suffix
		}
	}

	return num.toString()
}

export function formatCurrency(num, roundToWhole = false) {
	if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) {
		return '0'
	}
	if (num < 1) {
		return parseFloat(num.toFixed(2)).toString()
	}
	if (num < 1000) {
		if (roundToWhole) {
			return Math.round(num).toString()
		}
		// Show up to 2 decimal places, but remove trailing zeros
		return parseFloat(num.toFixed(2)).toString()
	}
	return formatNumber(Math.round(num))
}

export function buyUnitPrice(price, priceMultiplier, roundToWhole = false) {
	return formatCurrency(price * priceMultiplier, roundToWhole)
}

export function sellUnitPrice(price, priceMultiplier, sellMargin, roundToWhole = false) {
	return formatCurrency(price * priceMultiplier * sellMargin, roundToWhole)
}

export function buyStackPrice(price, stack, priceMultiplier, roundToWhole = false) {
	return formatCurrency(price * stack * priceMultiplier, roundToWhole)
}

export function sellStackPrice(price, stack, priceMultiplier, sellMargin, roundToWhole = false) {
	return formatCurrency(price * stack * priceMultiplier * sellMargin, roundToWhole)
}
