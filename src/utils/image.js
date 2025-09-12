/**
 * Get the appropriate image URL based on environment
 * @param {string} imageUrl - The original image URL
 * @param {Object} options - Optional parameters for image processing
 * @param {number} options.width - Image width (default: 64)
 * @param {string} options.format - Image format (default: 'webp')
 * @param {number} options.quality - Image quality (default: 70)
 * @returns {string} The processed image URL
 */
export function getImageUrl(imageUrl, options = {}) {
	const { width = 64, format = 'webp', quality = 90 } = options

	if (process.env.NODE_ENV === 'production') {
		return `/.netlify/images?url=${imageUrl}&w=${width}&fm=${format}&q=${quality}`
	}

	return imageUrl
}
