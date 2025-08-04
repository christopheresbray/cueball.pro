// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration for cueballpro-d0d07
// TODO: Move to environment variables for better security
const firebaseConfig = {
  apiKey: "AIzaSyD74cmzRhsv7IanfdnFVDB7ye_mgUCCCgc",
  authDomain: "cueballpro-d0d07.firebaseapp.com",
  projectId: "cueballpro-d0d07",
  storageBucket: "cueballpro-d0d07.firebasestorage.app",
  messagingSenderId: "297463907277",
  appId: "1:297463907277:web:f37fd2c639dbc834037a84"
};

// Validate that we have the minimum required configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing required fields.');
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
