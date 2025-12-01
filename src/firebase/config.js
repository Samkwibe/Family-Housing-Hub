// src/firebase/config.js - OPTIMIZED VERSION
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyB9rONAKw6unIEsS2f0qptmSIyflM3q-OM",
  authDomain: "family-housing-hub.firebaseapp.com",
  projectId: "family-housing-hub",
  storageBucket: "family-housing-hub.firebasestorage.app",
  messagingSenderId: "677200955206",
  appId: "1:677200955206:web:1008d5edde6b1f02be4747",
  measurementId: "G-VRKSHCPEZF"
};

// Validate configuration
const validateConfig = () => {
  const required = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missing = required.filter(key => !firebaseConfig[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing Firebase configuration:', missing);
    throw new Error(`Missing Firebase config: ${missing.join(', ')}`);
  }

  console.log('✅ Firebase configuration validated');
};

validateConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Auth persistence enabled');
  })
  .catch((error) => {
    console.warn('⚠️ Auth persistence failed:', error);
  });

// Initialize Firestore with optimized settings
export const db = initializeFirestore(app, {
  cacheSizeBytes: 50 * 1024 * 1024, // 50 MB cache
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: true
});

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db, {
  forceOwnership: false // Allow multiple tabs
})
  .then(() => {
    console.log('✅ Firestore offline persistence enabled');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ The current browser does not support persistence.');
    } else {
      console.error('❌ Firestore persistence error:', err);
    }
  });

// Global error handler for blocked requests (ad blockers)
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('ERR_BLOCKED_BY_CLIENT')) {
    console.warn('⚠️ Request blocked by client (likely ad blocker). Some features may not work.');
    // Don't show error to user as this is expected behavior with ad blockers
  }
}, true);

// Handle Firestore connection errors gracefully
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
    event.reason.message?.includes('network') ||
    event.reason.code === 'unavailable'
  )) {
    console.warn('⚠️ Network request failed (may be blocked):', event.reason);
    event.preventDefault(); // Prevent unhandled rejection error
  }
});

// Initialize Storage
export const storage = getStorage(app);

// Performance monitoring
if (import.meta.env.DEV) {
  console.log('🔥 Firebase initialized in development mode');
  console.log('📊 Configuration:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasStorage: !!firebaseConfig.storageBucket
  });
}

export default app;