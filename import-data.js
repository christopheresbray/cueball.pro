import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin with your service account
const serviceAccountPath = resolve(__dirname, './serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Sample data to import
const data = {
  // Users collection
  users: [
    {
      uid: 'admin-user-id', // Match this with the Firebase Auth UID
      email: 'admin@hills8ball.com',
      displayName: 'Admin User',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],
  // Leagues collection
  leagues: [
    {
      name: 'Hills District 8-Ball League',
      description: 'Official 8-ball pool league for the Hills District area',
      location: 'Hills District',
      active: true,
      startDate: admin.firestore.Timestamp.fromDate(new Date('2023-09-01')),
      endDate: admin.firestore.Timestamp.fromDate(new Date('2024-06-30')),
      rules: 'Standard 8-ball rules apply...',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ],
  // Venues collection
  venues: [
    {
      name: 'The Brewery',
      address: '123 Main Street',
      city: 'Castle Hill',
      state: 'NSW',
      zipCode: '2154',
      phoneNumber: '(02) 9123-4567',
      tableCount: 4,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  ]
  // Add more collections as needed
};

// Import function
async function importData() {
  const batch = db.batch();
  
  // Process each collection
  for (const [collectionName, documents] of Object.entries(data)) {
    console.log(`Importing ${documents.length} documents to ${collectionName}...`);
    
    documents.forEach(doc => {
      // For users collection, use the UID as the document ID
      const docRef = collectionName === 'users' && doc.uid 
        ? db.collection(collectionName).doc(doc.uid)
        : db.collection(collectionName).doc();
        
      batch.set(docRef, doc);
    });
  }
  
  // Commit the batch
  await batch.commit();
  console.log('Import completed successfully!');
}

// Run the import
importData()
  .then(() => {
    console.log('All data imported successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error importing data:', error);
    process.exit(1);
  });