// src/pages/Documents.jsx
import React, { useState } from 'react'
import { useFamily } from '../contexts/FamilyContext'
import { Plus, Download, Eye, Calendar } from 'lucide-react'
import FileUpload from '../components/FileUpload'

export default function Documents() {
  const { documents, addDocument } = useFamily()
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (fileData) => {
    setIsUploading(true)
    await addDocument({
      name: fileData.name,
      type: 'other',
      fileUrl: fileData.url,
      size: fileData.size
    })
    setIsUploading(false)
  }

  const documentTypes = {
    lease: 'Lease Agreement',
    income: 'Income Verification',
    id: 'Identification',
    other: 'Other'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your important housing documents</p>
        </div>
        <FileUpload onUploadComplete={handleFileUpload} />
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((document) => (
          <div key={document.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                {documentTypes[document.type] || document.type}
              </span>
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-2">{document.name}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Uploaded {document.uploadedAt.toLocaleDateString()}
            </p>
            
            {document.expiryDate && (
              <div className="flex items-center text-sm text-orange-600 mb-4">
                <Calendar className="h-4 w-4 mr-1" />
                Expires {document.expiryDate.toLocaleDateString()}
              </div>
            )}
            
            <div className="flex space-x-2">
              <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1">
                <Eye className="h-4 w-4" />
                <span>View</span>
              </button>
              <button className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-1">
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {documents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-600 mb-6">
            Upload your first document to get started
          </p>
          <FileUpload onUploadComplete={handleFileUpload} />
        </div>
      )}
    </div>
  )
}