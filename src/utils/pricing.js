export function formatNumber(num) {
	if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) {
		return '0'
	}
	if (num < 1000) {
		return num.toString()
	}
	if (num < 1000000) {
		const thousands = num / 1000
		if (thousands === Math.floor(thousands)) {
			return thousands + 'k'
		}
		return Math.round(thousands * 10) / 10 + 'k'
	}
	if (num < 1000000000) {
		const millions = num / 1000000
		if (millions === Math.floor(millions)) {
			return millions + 'M'
		}
		return Math.round(millions * 10) / 10 + 'M'
	}
	const billions = num / 1000000000
	if (billions === Math.floor(billions)) {
		return billions + 'B'
	}
	return Math.round(billions * 10) / 10 + 'B'
}

export function formatCurrency(num) {
	if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) {
		return '0'
	}
	if (num < 1) {
		return parseFloat(num.toFixed(2)).toString()
	}
	return formatNumber(Math.round(num))
}

export function buyUnitPrice(price, priceMultiplier) {
	return formatCurrency(price * priceMultiplier)
}

export function sellUnitPrice(price, sellMargin) {
	return formatCurrency(price * sellMargin)
}

export function buyStackPrice(price, stack, priceMultiplier) {
	return formatCurrency(price * stack * priceMultiplier)
}

export function sellStackPrice(price, stack, sellMargin) {
	return formatCurrency(price * stack * sellMargin)
}
