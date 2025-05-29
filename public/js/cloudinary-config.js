// Cloudinary configuration for client-side
const CLOUDINARY_CONFIG = {
  cloudName: 'your-cloudinary-cloud-name', // Replace with your actual cloud name
  apiKey: 'your-cloudinary-api-key', // Only needed for upload widget (optional)
  uploadPreset: 'event_images', // Create this preset in your Cloudinary dashboard
};

// Image transformation presets
const IMAGE_PRESETS = {
  eventBanner: {
    width: 1200,
    height: 600,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  },
  eventThumbnail: {
    width: 400,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  },
  eventCard: {
    width: 350,
    height: 200,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  }
};

/**
 * Generate Cloudinary URL with transformations
 * @param {string} publicId - The Cloudinary public ID
 * @param {string} preset - The preset name or custom options
 * @returns {string} The transformed image URL
 */
function generateCloudinaryUrl(publicId, preset = 'eventBanner') {
  if (!publicId) return '';
  
  const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
  
  let transformations = '';
  if (typeof preset === 'string' && IMAGE_PRESETS[preset]) {
    const options = IMAGE_PRESETS[preset];
    transformations = `c_${options.crop},w_${options.width},h_${options.height},q_${options.quality},f_${options.format}`;
  } else if (typeof preset === 'object') {
    const { crop = 'fill', width = 'auto', height = 'auto', quality = 'auto', format = 'auto' } = preset;
    transformations = `c_${crop},w_${width},h_${height},q_${quality},f_${format}`;
  }
  
  return `${baseUrl}/${transformations}/${publicId}`;
}

// Update the existing getEventBannerUrl function to use the new configuration
function getEventBannerUrlWithConfig(bannerImage) {
  if (!bannerImage) {
    return 'https://placehold.co/800x400?text=Event+Banner';
  }
  
  // Check if it's already a full URL
  if (bannerImage.startsWith('http://') || bannerImage.startsWith('https://')) {
    return bannerImage;
  }
    // Check if it's a Cloudinary public ID
  if (bannerImage.includes('/') || bannerImage.includes('events_')) {
    return generateCloudinaryUrl(bannerImage, 'eventBanner');
  }
  
  // Fallback to placeholder image if no valid Cloudinary URL
  return '/Images/events/placeholder-banner.jpg';
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.CloudinaryConfig = {
    CLOUDINARY_CONFIG,
    IMAGE_PRESETS,
    generateCloudinaryUrl,
    getEventBannerUrlWithConfig
  };
}
