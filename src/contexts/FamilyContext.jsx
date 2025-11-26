// src/contexts/FamilyContext.jsx - Complete Family Data Management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  maintenanceService, 
  rentService, 
  documentService,
  messageService
} from '../services/firebaseService';
import toast from 'react-hot-toast';

const FamilyContext = createContext();

export function useFamily() {
  return useContext(FamilyContext);
}

export function FamilyProvider({ children }) {
  const { currentUser } = useAuth();
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [rentPayments, setRentPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState({
    maintenance: false,
    rent: false,
    documents: false,
    messages: false
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
      setMaintenanceRequests([]);
    } finally {
      setLoading(prev => ({ ...prev, maintenance: false }));
    }
  };
  
  // Load rent payments
  const loadRentPayments = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, rent: true }));
    try {
      const payments = await rentService.getUserPayments(currentUser.uid);
      setRentPayments(payments || []);
    } catch (error) {
      console.error('Error loading rent payments:', error);
      setRentPayments([]);
    } finally {
      setLoading(prev => ({ ...prev, rent: false }));
    }
  };

  // Load documents
  const loadDocuments = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, documents: true }));
    try {
      const docs = await documentService.getUserDocuments(currentUser.uid);
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(prev => ({ ...prev, documents: false }));
    }
  };

  // Load messages
  const loadMessages = async () => {
    if (!currentUser) return;
    
    setLoading(prev => ({ ...prev, messages: true }));
    try {
      const msgs = await messageService.getUserMessages(currentUser.uid);
      setMessages(msgs || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  // Submit maintenance request
  const submitMaintenanceRequest = async (requestData) => {
    if (!currentUser) throw new Error('Not authenticated');

    const requestId = await maintenanceService.createRequest(currentUser.uid, requestData);
    await loadMaintenanceRequests();
    return requestId;
  };

  // Add rent payment (alias for compatibility)
  const addRentPayment = async (paymentData) => {
    if (!currentUser) throw new Error('Not authenticated');

    const paymentId = await rentService.createPayment(currentUser.uid, paymentData);
    await loadRentPayments();
    return paymentId;
  };

  // Create rent payment (same as addRentPayment)
  const createRentPayment = addRentPayment;

  // Add document
  const addDocument = async (documentData) => {
    if (!currentUser) throw new Error('Not authenticated');

    const docId = await documentService.uploadDocument(currentUser.uid, documentData);
    await loadDocuments();
    return docId;
  };

  // Upload document (alias for compatibility)
  const uploadDocument = addDocument;

  // Delete document
  const deleteDocument = async (documentId, filePath) => {
    if (!currentUser) throw new Error('Not authenticated');

    await documentService.deleteDocument(documentId, currentUser.uid, filePath);
    await loadDocuments();
  };

  // Send message
  const sendMessage = async (messageData) => {
    if (!currentUser) throw new Error('Not authenticated');

    const msgId = await messageService.sendMessage(currentUser.uid, {
      ...messageData,
      from: 'user'
    });
    await loadMessages();
    return msgId;
  };

  // Mark message as read
  const markMessageAsRead = async (messageId) => {
    if (!currentUser) throw new Error('Not authenticated');

    await messageService.markAsRead(messageId, currentUser.uid);
    await loadMessages();
  };

  // Load all data when user changes
  useEffect(() => {
    if (currentUser) {
      loadMaintenanceRequests();
      loadRentPayments();
      loadDocuments();
      loadMessages();
    } else {
      setMaintenanceRequests([]);
      setRentPayments([]);
      setDocuments([]);
      setMessages([]);
    }
  }, [currentUser]);

  const value = {
    // Data
    maintenanceRequests,
    rentPayments,
    documents,
    messages,
    loading,
    
    // Maintenance functions
    submitMaintenanceRequest,
    
    // Rent functions
    addRentPayment,
    createRentPayment,
    
    // Document functions
    addDocument,
    uploadDocument,
    deleteDocument,
    
    // Message functions
    sendMessage,
    markMessageAsRead,
    
    // Utility
    refreshData: () => {
      loadMaintenanceRequests();
      loadRentPayments();
      loadDocuments();
      loadMessages();
    }
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}
