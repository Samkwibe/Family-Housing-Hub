// src/contexts/FamilyContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  maintenanceService, 
  rentService, 
  documentService 
} from '../services/firebaseService';

const FamilyContext = createContext();

export function useFamily() {
  return useContext(FamilyContext);
}

export function FamilyProvider({ children }) {
  const { currentUser } = useAuth();
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [rentPayments, setRentPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState({
    maintenance: false,
    rent: false,
    documents: false
  });

  // Load maintenance requests
  const loadMaintenanceRequests = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, maintenance: true }));
    try {
      const requests = await maintenanceService.getUserRequests(currentUser.uid);
      setMaintenanceRequests(requests || []);
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      // Set empty array instead of showing error for offline mode
      setMaintenanceRequests([]);
      // Only show toast for non-offline errors
      if (!error.message.includes('offline')) {
        toast.error('Failed to load maintenance requests');
      }
    } finally {
      setLoading(prev => ({ ...prev, maintenance: false }));
    }
  };
  
  // Apply similar safe patterns to other load functions
  const loadRentPayments = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, rent: true }));
    try {
      const payments = await rentService.getUserPayments(currentUser.uid);
      setRentPayments(payments || []);
    } catch (error) {
      console.error('Error loading rent payments:', error);
      setRentPayments([]);
      if (!error.message.includes('offline')) {
        toast.error('Failed to load rent payments');
      }
    } finally {
      setLoading(prev => ({ ...prev, rent: false }));
    }
  };
  // laod codumrnts
  const loadDocuments = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, documents: true }));
    try {
      const docs = await documentService.getUserDocuments(currentUser.uid);
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
      if (!error.message.includes('offline')) {
        toast.error('Failed to load documents');
      }
    } finally {
      setLoading(prev => ({ ...prev, documents: false }));
    }
  };

  // Submit maintenance request
  const submitMaintenanceRequest = async (requestData) => {
    if (!currentUser) throw new Error('Not authenticated');

    try {
      const requestId = await maintenanceService.createRequest(currentUser.uid, requestData);
      await loadMaintenanceRequests(); // Reload to get the new request
      toast.success('Maintenance request submitted!');
      return requestId;
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      toast.error('Failed to submit maintenance request');
      throw error;
    }
  };

  // Create rent payment
  const createRentPayment = async (paymentData) => {
    if (!currentUser) throw new Error('Not authenticated');

    try {
      const paymentId = await rentService.createPayment(currentUser.uid, paymentData);
      await loadRentPayments(); // Reload to get the new payment
      toast.success('Rent payment recorded!');
      return paymentId;
    } catch (error) {
      console.error('Error creating rent payment:', error);
      toast.error('Failed to record rent payment');
      throw error;
    }
  };

  // Upload document
  const uploadDocument = async (documentData) => {
    if (!currentUser) throw new Error('Not authenticated');

    try {
      const docId = await documentService.uploadDocument(currentUser.uid, documentData);
      await loadDocuments(); // Reload to get the new document
      toast.success('Document uploaded successfully!');
      return docId;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      throw error;
    }
  };

  // Delete document
  const deleteDocument = async (documentId, fileURL) => {
    try {
      await documentService.deleteDocument(documentId, fileURL);
      await loadDocuments(); // Reload to reflect deletion
      toast.success('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      throw error;
    }
  };

  // Load all data when user changes
  useEffect(() => {
    if (currentUser) {
      loadMaintenanceRequests();
      loadRentPayments();
      loadDocuments();
    } else {
      setMaintenanceRequests([]);
      setRentPayments([]);
      setDocuments([]);
    }
  }, [currentUser]);

  const value = {
    maintenanceRequests,
    rentPayments,
    documents,
    loading,
    submitMaintenanceRequest,
    createRentPayment,
    uploadDocument,
    deleteDocument,
    refreshData: () => {
      loadMaintenanceRequests();
      loadRentPayments();
      loadDocuments();
    }
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}