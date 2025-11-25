// src/components/FileUpload.jsx
import React, { useRef } from 'react'
import { Upload, X } from 'lucide-react'

export default function FileUpload({ onUploadComplete, folder = 'documents' }) {
  const fileInputRef = useRef(null)

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Simulate file upload
    const fileData = {
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
      uploadedAt: new Date()
    }

    onUploadComplete(fileData)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer"
      >
        <Upload className="h-5 w-5" />
        <span>Upload File</span>
      </label>
    </div>
  )
}