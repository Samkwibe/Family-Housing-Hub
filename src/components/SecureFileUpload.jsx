// src/components/SecureFileUpload.jsx
// Secure file upload component with validation and preview

import React, { useState, useRef } from 'react';
import { Upload, X, File, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { validateFileUpload } from '../utils/security';
import { compressImage } from '../utils/imageOptimization';
import errorLogger from '../services/errorLoggingService';

const SecureFileUpload = ({
  onFileSelect,
  accept = 'image/*,application/pdf',
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  showPreview = true,
  compressImages = true,
  className = '',
  label = 'Upload File',
  ...props
}) => {
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileValidation = async (fileList) => {
    const newFiles = [];
    const newErrors = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validation = validateFileUpload(file, { maxSize });

      if (!validation.valid) {
        newErrors.push(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        let processedFile = file;

        // Compress images if enabled
        if (compressImages && file.type.startsWith('image/')) {
          try {
            const compressedBlob = await compressImage(file, 1920, 1080, 0.8);
            processedFile = new File([compressedBlob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
          } catch (compressError) {
            errorLogger.logWarning('Failed to compress image, using original', {
              fileName: file.name,
              error: compressError.message,
            });
            // Continue with original file if compression fails
          }
        }

        newFiles.push({
          file: processedFile,
          originalFile: file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
          name: file.name,
          size: processedFile.size,
          type: file.type,
        });
      } catch (error) {
        errorLogger.logError(error, {
          component: 'SecureFileUpload',
          action: 'processFile',
          fileName: file.name,
        });
        newErrors.push(`${file.name}: Failed to process file`);
      }
    }

    setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));
    setErrors(newErrors);

    if (newFiles.length > 0 && onFileSelect) {
      onFileSelect(multiple ? newFiles.map((f) => f.file) : newFiles[0].file);
    }

    if (newErrors.length > 0) {
      errorLogger.logWarning('File upload validation errors', { errors: newErrors });
    }
  };

  const handleFileChange = (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length > 0) {
      handleFileValidation(fileList);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const fileList = Array.from(e.dataTransfer.files || []);
    if (fileList.length > 0) {
      handleFileValidation(fileList);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index) => {
    const fileToRemove = files[index];
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (onFileSelect && newFiles.length > 0) {
      onFileSelect(multiple ? newFiles.map((f) => f.file) : newFiles[0].file);
    } else if (onFileSelect) {
      onFileSelect(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-xl p-6 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          {...props}
        />

        <div className="text-center">
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Drag and drop files here, or click to browse
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Select Files
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Max size: {formatFileSize(maxSize)}
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                Upload Errors
              </p>
              <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {showPreview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((fileData, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              {fileData.preview ? (
                <img
                  src={fileData.preview}
                  alt={fileData.name}
                  className="h-12 w-12 object-cover rounded"
                />
              ) : (
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  {fileData.type === 'application/pdf' ? (
                    <File className="h-6 w-6 text-gray-400" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {fileData.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(fileData.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                aria-label="Remove file"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SecureFileUpload;

