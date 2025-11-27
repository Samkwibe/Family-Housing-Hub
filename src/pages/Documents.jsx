// src/pages/Documents.jsx - Enhanced Document Management
import React, { useState } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Download, 
  Eye, 
  Calendar,
  FileText,
  File,
  Image,
  Trash2,
  Search,
  Filter,
  Upload,
  FolderOpen,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Documents() {
  const { documents = [], addDocument, deleteDocument, loading } = useFamily();
  const { userProfile } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'other',
    description: '',
    expiryDate: '',
    file: null
  });

  const documentTypes = {
    lease: { label: 'Lease Agreement', icon: FileText, color: 'text-blue-600 bg-blue-100' },
    income: { label: 'Income Verification', icon: File, color: 'text-green-600 bg-green-100' },
    id: { label: 'Identification', icon: File, color: 'text-purple-600 bg-purple-100' },
    insurance: { label: 'Insurance', icon: FileText, color: 'text-orange-600 bg-orange-100' },
    other: { label: 'Other', icon: File, color: 'text-gray-600 bg-gray-100' }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Check if document is expiring soon (within 30 days)
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  };

  // Check if document is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file type
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        toast.error('Invalid file type. Please select PDF, JPG, PNG, DOC, or DOCX files.');
        e.target.value = ''; // Clear the input
        return;
      }
      
      setUploadForm(prev => ({ ...prev, file, title: prev.title || file.name }));
    }
  };

  // Handle upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      await addDocument({
        title: uploadForm.title,
        type: uploadForm.type,
        description: uploadForm.description,
        expiryDate: uploadForm.expiryDate || null,
        file: uploadForm.file
      });
      
      setUploadForm({ title: '', type: 'other', description: '', expiryDate: '', file: null });
      setIsUploadModalOpen(false);
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      // Show more specific error messages
      const errorMessage = error.message || error.toString();
      if (errorMessage.includes('Invalid file type')) {
        toast.error('Invalid file type. Please upload PDF, JPG, PNG, DOC, or DOCX files only.');
      } else if (errorMessage.includes('File size exceeds')) {
        toast.error('File is too large. Maximum size is 10MB.');
      } else if (errorMessage.includes('Permission denied')) {
        toast.error('Permission denied. Please check your account permissions.');
      } else {
        toast.error(errorMessage || 'Failed to upload document. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (docId, filePath) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDocument(docId, filePath);
      toast.success('Document deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Stats
  const totalDocs = documents.length;
  const expiringDocs = documents.filter(d => isExpiringSoon(d.expiryDate)).length;
  const expiredDocs = documents.filter(d => isExpired(d.expiryDate)).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">Manage your important housing documents securely</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-200"
        >
          <Upload className="h-5 w-5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Documents</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalDocs}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Valid Documents</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{totalDocs - expiredDocs}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Expiring Soon</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{expiringDocs}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Expired</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{expiredDocs}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert for expiring documents */}
      {expiringDocs > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <p className="text-orange-800">
            <span className="font-semibold">{expiringDocs} document(s)</span> will expire within the next 30 days. Please review and update them.
          </p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[180px]"
          >
            <option value="all">All Types</option>
            {Object.entries(documentTypes).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Documents Grid */}
      {loading?.documents ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const docType = documentTypes[doc.type] || documentTypes.other;
            const DocIcon = docType.icon;
            const expired = isExpired(doc.expiryDate);
            const expiringSoon = isExpiringSoon(doc.expiryDate);

            return (
              <div 
                key={doc.id} 
                className={`bg-white rounded-2xl border-2 p-5 hover:shadow-lg transition-all group ${
                  expired ? 'border-red-200 bg-red-50/50' :
                  expiringSoon ? 'border-orange-200 bg-orange-50/50' :
                  'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${docType.color}`}>
                    <DocIcon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center space-x-2">
                    {expired && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Expired</span>
                      </span>
                    )}
                    {expiringSoon && !expired && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Expiring</span>
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${docType.color}`}>
                      {docType.label}
                    </span>
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{doc.title}</h3>
                {doc.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{doc.description}</p>
                )}
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Uploaded: {formatDate(doc.uploadedAt || doc.createdAt)}</span>
                  </div>
                  {doc.expiryDate && (
                    <div className={`flex items-center space-x-2 ${expired ? 'text-red-600' : expiringSoon ? 'text-orange-600' : ''}`}>
                      <Clock className="h-4 w-4" />
                      <span>Expires: {formatDate(doc.expiryDate)}</span>
                    </div>
                  )}
                  {doc.fileSize && (
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4 text-gray-400" />
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 pt-3 border-t border-gray-100">
                  {doc.fileURL && (
                    <>
                      <a
                        href={doc.fileURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 text-white py-2.5 px-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </a>
                      <a
                        href={doc.fileURL}
                        download
                        className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-3 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id, doc.filePath)}
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || typeFilter !== 'all' ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            {searchTerm || typeFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria' 
              : 'Upload your first document to keep your important files organized and secure'
            }
          </p>
          {!searchTerm && typeFilter === 'all' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Upload className="h-5 w-5" />
              <span>Upload First Document</span>
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-5">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File *</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  uploadForm.file ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}>
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{uploadForm.file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadForm(prev => ({ ...prev, file: null }))}
                        className="p-1 hover:bg-red-100 rounded-full text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Title *</label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Lease Agreement 2025"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {Object.entries(documentTypes).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Add any notes about this document..."
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={uploadForm.expiryDate}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.file}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
