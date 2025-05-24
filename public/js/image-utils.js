// Helper functions for handling event banner images

/**
 * Returns the proper URL for an event banner image
 * 
 * @param {string} bannerImage - The banner image filename
 * @returns {string} The complete URL to the image
 */
function getEventBannerUrl(bannerImage) {
  if (!bannerImage) {
    return 'https://placehold.co/800x400?text=Event+Banner';
  }
  // Use the backend server URL for serving images
  return `http://localhost:3031/Images/events/${bannerImage}`;
}

/**
 * Returns true if the provided image path is valid
 * 
 * @param {string} imagePath - The image path to validate
 * @returns {boolean} True if the image path is valid
 */
function isValidImagePath(imagePath) {
  if (!imagePath) return false;
  
  // Basic validation that it's a string
  if (typeof imagePath !== 'string') return false;
  
  // Check for common image extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  return validExtensions.some(ext => imagePath.toLowerCase().endsWith(ext));
}

/**
 * Preloads an image to check if it exists
 * 
 * @param {string} src - The image source URL
 * @returns {Promise<boolean>} Promise resolving to true if the image loads
 */
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// Export the functions if we're in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getEventBannerUrl,
    isValidImagePath,
    preloadImage
  };
}
