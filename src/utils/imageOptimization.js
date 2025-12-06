// src/utils/imageOptimization.js
// Image optimization utilities for better performance

/**
 * Create a responsive image srcset
 * @param {string} baseUrl - Base image URL
 * @param {Array<number>} widths - Array of widths for srcset
 * @returns {string} srcset string
 */
export const createSrcSet = (baseUrl, widths = [400, 800, 1200, 1600]) => {
  if (!baseUrl) return '';
  
  return widths
    .map((width) => `${baseUrl}?w=${width} ${width}w`)
    .join(', ');
};

/**
 * Get optimal image size based on container
 * @param {number} containerWidth - Container width in pixels
 * @param {number} devicePixelRatio - Device pixel ratio (default: 2)
 * @returns {number} Optimal image width
 */
export const getOptimalImageSize = (containerWidth, devicePixelRatio = 2) => {
  return Math.ceil(containerWidth * devicePixelRatio);
};

/**
 * Lazy load image with intersection observer
 * @param {HTMLElement} imgElement - Image element
 * @param {string} src - Image source URL
 * @param {Object} options - IntersectionObserver options
 */
export const lazyLoadImage = (imgElement, src, options = {}) => {
  if (!imgElement || !src) return;

  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = src;
        img.classList.remove('lazy');
        observer.unobserve(img);
      }
    });
  }, { ...defaultOptions, ...options });

  observer.observe(imgElement);
};

/**
 * Preload critical images
 * @param {Array<string>} imageUrls - Array of image URLs to preload
 */
export const preloadImages = (imageUrls) => {
  imageUrls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Convert image to WebP format (client-side)
 * @param {File} file - Image file
 * @param {number} quality - Quality (0-1)
 * @returns {Promise<Blob>} WebP blob
 */
export const convertToWebP = async (file, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert to WebP'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Quality (0-1)
 * @returns {Promise<Blob>} Compressed image blob
 */
export const compressImage = async (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Get image dimensions
 * @param {string} url - Image URL
 * @returns {Promise<{width: number, height: number}>} Image dimensions
 */
export const getImageDimensions = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Check if WebP is supported
 * @returns {boolean} True if WebP is supported
 */
export const isWebPSupported = () => {
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

