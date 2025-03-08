// test-timestamp.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the service account key file
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8')
);

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

// Get Firestore database instance
const db = getFirestore();

// Test different timestamp creation approaches
async function testTimestamps() {
  try {
    console.log('Testing timestamp creation...');
    
    // Direct method
    const test1 = await db.collection('test').doc('timestamp1').set({
      description: 'Direct Timestamp.fromDate',
      date: Timestamp.fromDate(new Date()),
      createdAt: new Date() // Will be auto-converted
    });
    console.log('Test 1 success');
    
    // Future date
    const futureDate = new Date('2025-03-05');
    const test2 = await db.collection('test').doc('timestamp2').set({
      description: 'Future date',
      date: Timestamp.fromDate(futureDate)
    });
    console.log('Test 2 success');
    
    // Date with explicit time
    const dateWithTime = new Date('2025-03-05T19:30:00');
    const test3 = await db.collection('test').doc('timestamp3').set({
      description: 'Date with time',
      date: Timestamp.fromDate(dateWithTime),
      rawDate: dateWithTime
    });
    console.log('Test 3 success');
    
    // Server timestamp
    const test4 = await db.collection('test').doc('timestamp4').set({
      description: 'Server timestamp',
      date: Timestamp.now()
    });
    console.log('Test 4 success');
    
    // Read back test data
    const doc = await db.collection('test').doc('timestamp3').get();
    console.log('Document data:', doc.data());
    
    console.log('All timestamp tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('Error testing timestamps:', error);
    process.exit(1);
  }
}

testTimestamps();