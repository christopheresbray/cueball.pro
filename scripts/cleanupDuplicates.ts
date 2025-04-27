const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { cleanupDuplicateTeamPlayers } = require('../src/services/databaseService');

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runCleanup() {
  try {
    console.log('Starting cleanup of duplicate team_player entries...');
    console.log('Using Firebase project:', process.env.VITE_FIREBASE_PROJECT_ID);
    
    // Run cleanup without any filters to process all entries
    const deletedCount = await cleanupDuplicateTeamPlayers();
    
    console.log(`Cleanup completed successfully!`);
    console.log(`Removed ${deletedCount} duplicate entries.`);
    
    // Exit process after a short delay to ensure all Firebase operations complete
    setTimeout(() => process.exit(0), 1000);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup(); 