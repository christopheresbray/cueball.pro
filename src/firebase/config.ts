// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration using a single environment variable for better security
let firebaseConfig;
try {
  // Parse the JSON configuration string from environment variable
  firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');
  
  // Validate that we have the minimum required configuration
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('Firebase configuration is missing required fields. Check your VITE_FIREBASE_CONFIG environment variable.');
  }
} catch (error) {
  console.error('Error parsing Firebase configuration:', error);
  // Provide a fallback empty config to prevent app crash
  firebaseConfig = {};
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent caching settings
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);

export { db, auth };

// Log minimal config info in non-production environments (for debugging)
if (import.meta.env.DEV) {
  console.log("Firebase initialized with project:", firebaseConfig.projectId);
}
