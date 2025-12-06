// src/components/OptimizedImage.jsx
// Optimized image component with lazy loading, error handling, and WebP support

import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { lazyLoadImage, isWebPSupported } from '../utils/imageOptimization';

const OptimizedImage = ({
  src,
  alt = '',
  className = '',
  width,
  height,
  loading = 'lazy',
  fallback,
  onError,
  onLoad,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Check WebP support and modify URL if needed
    let optimizedSrc = src;
    if (isWebPSupported() && !src.includes('.webp') && !src.includes('?')) {
      // If backend supports WebP, you could append ?format=webp
      // For now, we'll use the original src
    }

    setImageSrc(optimizedSrc);
    setIsLoading(true);
    setHasError(false);

    // If lazy loading, use intersection observer
    if (loading === 'lazy' && imgRef.current) {
      lazyLoadImage(imgRef.current, optimizedSrc);
    }
  }, [src, loading]);

  const handleError = (e) => {
    setHasError(true);
    setIsLoading(false);
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e) => {
    setIsLoading(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  // Show fallback or placeholder
  if (hasError || !imageSrc) {
    if (fallback) {
      return <img src={fallback} alt={alt} className={className} {...props} />;
    }
    return (
      <div
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={{ width, height }}
        aria-label={alt || 'Image placeholder'}
      >
        <ImageIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
      )}
      <img
        ref={imgRef}
        src={loading === 'lazy' ? undefined : imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onError={handleError}
        onLoad={handleLoad}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${className}`}
        decoding="async"
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;

