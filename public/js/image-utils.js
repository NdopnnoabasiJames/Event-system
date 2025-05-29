// Helper functions for handling event banner images

/**
 * Returns the proper URL for an event banner image
 * 
 * @param {string} bannerImage - The banner image filename or Cloudinary public ID
 * @returns {string} The complete URL to the image
 */
function getEventBannerUrl(bannerImage) {
  if (!bannerImage) {
    return 'https://placehold.co/800x400?text=Event+Banner';
  }
  
  // Check if it's already a full URL (Cloudinary URL)
  if (bannerImage.startsWith('http://') || bannerImage.startsWith('https://')) {
    return bannerImage;
  }
  
  // Check if it's a Cloudinary public ID (contains forward slashes typically)
  if (bannerImage.includes('/') || bannerImage.includes('events_')) {
    // Use dynamic cloud name if available, otherwise fallback
    const cloudName = window.CloudinaryConfig?.CLOUDINARY_CONFIG?.cloudName || 'your-cloud-name';
    const transformations = 'c_fill,w_1200,h_600,q_auto,f_auto';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${bannerImage}`;
  }  
  // Return placeholder for non-Cloudinary images
  return 'https://placehold.co/1200x600?text=Event+Banner';
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
  
  // Check if it's a URL (Cloudinary or other)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return true;
  }
  
  // Check if it's a Cloudinary public ID
  if (imagePath.includes('/') || imagePath.includes('events_')) {
    return true;
  }
  
  // Check for common image extensions (for local files)
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

/**
 * Get optimized Cloudinary URL with specific dimensions
 * 
 * @param {string} publicId - The Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} The optimized Cloudinary URL
 */
function getCloudinaryUrl(publicId, options = {}) {
  if (!publicId) return '';
  
  const {
    width = 'auto',
    height = 'auto',
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    cloudName = 'your-cloud-name' // This should be replaced with actual cloud name
  } = options;
  
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  const transformations = `c_${crop},w_${width},h_${height},q_${quality},f_${format}`;
  
  return `${baseUrl}/${transformations}/${publicId}`;
}

/**
 * Get thumbnail URL for event images
 * 
 * @param {string} bannerImage - The banner image filename or Cloudinary public ID
 * @returns {string} The thumbnail URL
 */
function getEventThumbnailUrl(bannerImage) {
  if (!bannerImage) {
    return 'https://placehold.co/400x300?text=Event+Banner';
  }
  
  // Check if it's already a full URL
  if (bannerImage.startsWith('http://') || bannerImage.startsWith('https://')) {
    return bannerImage;
  }
  
  // Check if it's a Cloudinary public ID
  if (bannerImage.includes('/') || bannerImage.includes('events_')) {
    return getCloudinaryUrl(bannerImage, {
      width: 400,
      height: 300,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    });  }
  
  // Fallback to placeholder image if no valid URL found
  return '/Images/events/placeholder-banner.jpg';
}

/**
 * Extract public ID from Cloudinary URL
 * 
 * @param {string} cloudinaryUrl - The full Cloudinary URL
 * @returns {string} The public ID
 */
function extractCloudinaryPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') return '';
  
  // Match Cloudinary URL pattern and extract public ID
  const match = cloudinaryUrl.match(/\/v\d+\/(.+?)(?:\.[^.]+)?$/);
  if (match) {
    return match[1];
  }
  
  // If no version number, try another pattern
  const match2 = cloudinaryUrl.match(/\/upload\/(?:[^/]+\/)*(.+?)(?:\.[^.]+)?$/);
  if (match2) {
    return match2[1];
  }
  
  return '';
}

// Export the functions if we're in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getEventBannerUrl,
    isValidImagePath,
    preloadImage,
    getCloudinaryUrl,
    getEventThumbnailUrl,
    extractCloudinaryPublicId
  };
}
