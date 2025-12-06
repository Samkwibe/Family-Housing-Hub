// src/components/LinkPreview.jsx
// Link preview component for URLs in messages

import React, { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { sanitizeURL, validateURL } from '../utils/security';

const LinkPreview = ({ url, onClose }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url || !validateURL(url)) {
      setError('Invalid URL');
      setLoading(false);
      return;
    }

    // Simple link preview - in production, use a backend service
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(null);

        // For now, create a simple preview
        // In production, you'd call a backend API that fetches Open Graph data
        const safeUrl = sanitizeURL(url);
        const domain = new URL(safeUrl).hostname;

        setPreview({
          url: safeUrl,
          title: domain,
          description: `Link to ${domain}`,
          image: null,
        });
      } catch (err) {
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (error) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="truncate">{url}</span>
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <div className="p-3">
        {onClose && (
          <button
            onClick={onClose}
            className="float-right p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <a
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:opacity-80 transition-opacity"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
            {preview.title}
          </h4>
          {preview.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {preview.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <ExternalLink className="h-3 w-3" />
            <span className="truncate">{new URL(preview.url).hostname}</span>
          </div>
        </a>
      </div>
    </div>
  );
};

export default LinkPreview;

