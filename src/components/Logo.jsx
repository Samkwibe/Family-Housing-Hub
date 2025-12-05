import React, { useState } from 'react';

/**
 * Sam's Family Hub Logo Component
 * Uses logo.png from public folder
 * Features:
 * - Uses custom logo image
 * - Highly visible with proper sizing and contrast
 * - Responsive sizing
 * - Works in all appearances
 * - Multiple variants (default, compact, icon)
 * - Fallback if image doesn't load
 */
export default function Logo({ variant = 'default', className = '' }) {
  const [imageError, setImageError] = useState(false);
  
  // Variants: 'default' (full), 'compact' (icon + name), 'icon' (icon only)
  const isCompact = variant === 'compact';
  const isIconOnly = variant === 'icon';

  // Fallback logo if image doesn't load
  const FallbackLogo = ({ size = 'md' }) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-12 w-12',
      lg: 'h-16 w-16'
    };
    
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg`}>
        <span className="text-xs">SFH</span>
      </div>
    );
  };

  if (isIconOnly) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {!imageError ? (
          <img
            src="/logo.png"
            alt="Sam's Family Hub"
            className="h-12 w-auto object-contain max-w-[200px] drop-shadow-lg"
            onError={() => setImageError(true)}
            style={{ 
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              maxHeight: '48px'
            }}
          />
        ) : (
          <FallbackLogo size="md" />
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Image with enhanced visibility */}
      <div className="flex-shrink-0">
        {!imageError ? (
          <img
            src="/logo.png"
            alt="Sam's Family Hub"
            className={`object-contain drop-shadow-lg ${isCompact ? 'h-12 w-auto max-w-[150px]' : 'h-16 w-auto max-w-[200px]'}`}
            onError={() => setImageError(true)}
            style={{ 
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
              maxHeight: isCompact ? '48px' : '64px'
            }}
          />
        ) : (
          <FallbackLogo size={isCompact ? 'md' : 'lg'} />
        )}
      </div>

      {/* Text Content - Only show if not icon only */}
      {!isCompact && (
        <div className="flex flex-col">
          {/* Primary Text: Sam's Family Hub - white for visibility on dark header */}
          <span className="text-xl font-bold text-white leading-tight tracking-tight drop-shadow-lg">
            Sam's Family Hub
          </span>
          {/* Tagline */}
          <span className="text-xs text-blue-100 leading-tight font-medium drop-shadow-md">
            Your housing overview
          </span>
        </div>
      )}
      
      {isCompact && (
        <div className="flex flex-col">
          <span className="text-base font-bold text-white leading-tight drop-shadow-lg">
            Sam's Family Hub
          </span>
          <span className="text-[10px] text-blue-100 leading-tight font-medium drop-shadow-md">
            Your housing overview
          </span>
        </div>
      )}
    </div>
  );
}
