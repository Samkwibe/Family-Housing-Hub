// src/components/SkeletonLoader.jsx
// Reusable skeleton loader components for better loading UX

import React from 'react';

/**
 * Base skeleton component
 */
export const Skeleton = ({ className = '', width, height, rounded = 'rounded' }) => {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${rounded} ${className}`}
      style={style}
      aria-label="Loading..."
    />
  );
};

/**
 * Text skeleton loader
 */
export const SkeletonText = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="1rem"
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
};

/**
 * Card skeleton loader
 */
export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 ${className}`}>
      <Skeleton height="1.5rem" width="60%" className="mb-4" />
      <SkeletonText lines={3} className="mb-4" />
      <div className="flex gap-2">
        <Skeleton height="2rem" width="5rem" />
        <Skeleton height="2rem" width="5rem" />
      </div>
    </div>
  );
};

/**
 * Avatar skeleton loader
 */
export const SkeletonAvatar = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  return (
    <Skeleton
      className={`${sizes[size] || sizes.md} rounded-full ${className}`}
    />
  );
};

/**
 * Image skeleton loader
 */
export const SkeletonImage = ({ aspectRatio = '16/9', className = '' }) => {
  return (
    <Skeleton
      className={`w-full ${className}`}
      style={{ aspectRatio }}
    />
  );
};

/**
 * List skeleton loader
 */
export const SkeletonList = ({ items = 5, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <SkeletonAvatar size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton height="1rem" width="40%" />
            <Skeleton height="0.875rem" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Table skeleton loader
 */
export const SkeletonTable = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="1.25rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 mb-2"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="1rem" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Dashboard skeleton loader
 */
export const SkeletonDashboard = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonCard />
        </div>
        <div>
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
};

/**
 * Message skeleton loader
 */
export const SkeletonMessage = ({ className = '' }) => {
  return (
    <div className={`flex gap-3 ${className}`}>
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton height="0.875rem" width="6rem" />
          <Skeleton height="0.875rem" width="4rem" />
        </div>
        <SkeletonText lines={2} />
      </div>
    </div>
  );
};

export default Skeleton;

