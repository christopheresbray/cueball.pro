// Test setup file for Vitest
import { vi } from 'vitest';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({}),
  initializeFirestore: vi.fn().mockReturnValue({}),
  persistentLocalCache: vi.fn().mockReturnValue({}),
  persistentMultipleTabManager: vi.fn().mockReturnValue({}),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn().mockReturnValue({}),
  Timestamp: {
    now: vi.fn().mockReturnValue({ seconds: 0, nanoseconds: 0 }),
    fromDate: vi.fn().mockReturnValue({ seconds: 0, nanoseconds: 0 }),
  },
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn().mockReturnValue({}),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

// Mock environment variables
process.env.VITE_FIREBASE_CONFIG = JSON.stringify({
  apiKey: "test-api-key",
  authDomain: "test.firebaseapp.com",
  projectId: "test-project",
  storageBucket: "test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
});