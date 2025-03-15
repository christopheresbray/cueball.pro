import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

const seasonData = {
  name: 'Winter 2025',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-08-31'),
  status: 'active',
  createdAt: new Date(),
  isCurrent: true,  
};

const leagueData = {
  name: 'Hills 8-Ball League',
  createdAt: new Date(),
  isActive: true,
};

const teamNames = [
  'BSSC Magic', 'Grays Inn Nomads', 'Maccy Bloods', 'BSSC Reds', 'Maccy Bros',
  'BSSC Raiders', 'RSL Renegades', 'Farcue', 'Barker Mongrels', 'Maccy Ring ins',
  'Old Mill Mob', 'Scenic Slayers', 'Grays Innkeepers'
];

const playersByTeam = {
  'BSSC Magic': ['Kane Weekly','Luke Hoffmann','Dylan Cahill','Ben Konig','Jayden Hoffmann','Trevor Williams','Max James'],
  'Grays Inn Nomads': ['Joe Player','Marrack Payne','Graeme Hilton','Mark Schutt','Daniel Brooksbank','Jimmy Peat'],
  'Maccy Bloods': ['Kane Weekley','Peter Richardson','Billy Lakey','Sam Elsegood','Klyde Goding','Slade Richardson'],
  'BSSC Reds': ['Jamie Wyatt','Steve Tasker','Paul Morton','Rob Belsole','Peter Bechara','Andrew Hooper','Keith Isgar'],
  'Maccy Bros': ['Geoffrey Eyers','Jarrad Chapman','Sean Atkinson','Cory Eyers','Steve Clifton','Jarred Horsnell','Jess Fairlie'],
  'BSSC Raiders': ['John Westerholm','Erik Westerholm','Alex Bray','Ben Hicks','Chris Bray','Michael Christou'],
  'RSL Renegades': ['Rob Bonython','Gavan Pastors','Joe Marshall','Tim Murphy','Tyler Ellis','Abigayle Murphy','Bruce Hamlyn'],
  'Farcue': ['Steve Kolman','Boris Hvatin','Karl Krenn','Allan Wake','Bill Kolman','Dave Mathews','Craig Weber'],
  'Barker Mongrels': ['Jon Cocks','Geoff Bardy','Andrew Mabarrack','Ryan Worthley','Ron Wade'],
  'Maccy Ring ins': ['Mark Swinburne','Peter McCaughan','Cody Blesing','Pete Symons','Sam Britton'],
  'Old Mill Mob': ['Beth Kendall','Anthony Willing','Mandy Davies','John Sungod','Garry Daniel','Justin Kleinig'],
  'Scenic Slayers': ['George Sarlay','Carlo Russo','Ben Anderson','John Cavuoto','Paul McEachern','Dave Gleeson','Elliot Trestrail','Paul Eckert'],
  'Grays Innkeepers': ['Matt Smart','Nick Smart','Alasdair McLaren','Shane Williams','Lucy Borland']
};

const teamCaptains = {
  'BSSC Magic': 'Luke Hoffmann',
  'Grays Inn Nomads': 'Marrack Payne',
  'Maccy Bloods': 'Peter Richardson',
  'BSSC Reds': 'Steve Tasker',
  'Maccy Bros': 'Cory Eyers',
  'BSSC Raiders': 'Chris Bray',
  'RSL Renegades': 'Tim Murphy',
  'Farcue': 'Steve Kolman',
  'Barker Mongrels': 'Jon Cocks',
  'Maccy Ring ins': 'Mark Swinburne',
  'Old Mill Mob': 'Beth Kendall',
  'Scenic Slayers': 'Carlo Russo',
  'Grays Innkeepers': 'Matt Smart'
};

// Improved processData function to ensure all fields are preserved
const processData = data => {
  const processed = {};
  for (const [key, value] of Object.entries(data)) {
    processed[key] = value instanceof Date ? Timestamp.fromDate(value) : value;
  }
  return processed;
};

const clearCollection = async collectionName => {
  const snapshot = await db.collection(collectionName).get();
  const deletions = snapshot.docs.map(doc => doc.ref.delete());
  await Promise.all(deletions);
};

const clearAuthUsers = async () => {
  const listAllUsers = async (nextPageToken) => {
    const result = await auth.listUsers(1000, nextPageToken);
    await Promise.all(result.users.map(user => auth.deleteUser(user.uid)));
    if (result.pageToken) {
      await listAllUsers(result.pageToken);
    }
  };
  await listAllUsers();
};

const ensureUser = async (email, displayName, role = 'player') => {
  try {
    const user = await auth.getUserByEmail(email);
    // Create or update user document in Firestore
    await db.collection('users').doc(user.uid).set({
      email,
      displayName,
      role,
      createdAt: Timestamp.fromDate(new Date())
    });
    return user.uid;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await auth.createUser({ email, password: 'Open1234', displayName, emailVerified: true });
      // Create user document in Firestore
      await db.collection('users').doc(newUser.uid).set({
        email,
        displayName,
        role,
        createdAt: Timestamp.fromDate(new Date())
      });
      return newUser.uid;
    } else throw error;
  }
};

// Improved addDoc function with logging to ensure all fields are being set
const addDoc = async (collection, data) => {
  const processedData = processData(data);
  const ref = db.collection(collection).doc();
  await ref.set(processedData);
  
  // Verify the document was created with all fields
  const doc = await ref.get();
  const savedData = doc.data();
  
  // Check if isCurrent field exists (for seasons collection)
  if (collection === 'seasons' && data.isCurrent !== undefined && savedData.isCurrent === undefined) {
    console.warn('⚠️ isCurrent field not saved properly. Explicitly updating...');
    await ref.update({ isCurrent: data.isCurrent });
  }
  
  return ref.id;
};

const seedDatabase = async () => {
  console.log('🔥 Starting Firebase database seeding...');

  await Promise.all(['leagues', 'seasons', 'teams', 'players', 'team_players', 'users'].map(clearCollection));
  await clearAuthUsers();

  // Create admin user
  const adminEmail = 'admin@cueballpro.com';
  console.log('Creating admin user:', adminEmail);
  let adminUser;
  try {
    adminUser = await auth.getUserByEmail(adminEmail);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Create the admin user if they don't exist
      adminUser = await auth.createUser({
        email: adminEmail,
        password: 'Open1234',
        displayName: 'Admin User',
        emailVerified: true
      });
      console.log('Created new admin user with ID:', adminUser.uid);
    } else {
      console.error('Error getting/creating admin user:', error);
      throw error;
    }
  }
  
  // Create user document for admin in Firestore
  await db.collection('users').doc(adminUser.uid).set({
    email: adminEmail,
    displayName: 'Admin User',
    role: 'admin',
    createdAt: Timestamp.fromDate(new Date())
  });
  console.log(`Created/updated admin user document in Firestore`);
  
  // Create league with admin user
  const updatedLeagueData = {
    ...leagueData,
    adminIds: [adminUser.uid] // Add admin user ID to the adminIds array
  };
  
  const leagueId = await addDoc('leagues', updatedLeagueData);
  console.log(`Created league with admin user ${adminUser.uid}`);
  
  // Create season with explicit isCurrent field
  const updatedSeasonData = {
    name: 'Winter 2025',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-08-31'),
    status: 'active',
    createdAt: new Date(),
    leagueId,
    isCurrent: true,
    matchDay: 'wednesday' // Adding matchDay field for schedule generation
  };
  
  console.log('Creating season with data:', JSON.stringify(updatedSeasonData, null, 2));
  const seasonId = await addDoc('seasons', updatedSeasonData);
  
  // Double-check that isCurrent field is set correctly
  const seasonDoc = await db.collection('seasons').doc(seasonId).get();
  const seasonDataSaved = seasonDoc.data();
  console.log('Season saved with data:', JSON.stringify(seasonDataSaved, null, 2));
  
  if (seasonDataSaved.isCurrent !== true) {
    console.warn('⚠️ isCurrent field not saved. Fixing...');
    await db.collection('seasons').doc(seasonId).update({ isCurrent: true });
  }
  
  // Create venue documents
  const venueNames = ['The Cue Club', 'Corner Pocket', 'Billiard Palace', 'Shark Shack', 'Eight Ball Hall'];
  const venueIds = {};
  
  for (const venueName of venueNames) {
    const venueId = await addDoc('venues', {
      name: venueName,
      address: `${Math.floor(Math.random() * 100) + 1} Main St, Adelaide, SA 5000`,
      contact: `+61 4${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
      createdAt: new Date()
    });
    venueIds[venueName] = venueId;
    console.log(`Created venue: ${venueName}`);
  }

  for (const teamName of teamNames) {
    // Assign a random venue to each team
    const randomVenueName = venueNames[Math.floor(Math.random() * venueNames.length)];
    const homeVenueId = venueIds[randomVenueName];
    
    const teamId = await addDoc('teams', { 
      leagueId, 
      seasonId, 
      name: teamName, 
      homeVenueId,
      isActive: true, 
      createdAt: new Date() 
    });

    for (const playerName of playersByTeam[teamName]) {
      const email = `${playerName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
      const isCaptain = playerName === teamCaptains[teamName];
      const role = isCaptain ? 'captain' : 'player';
      
      const userId = await ensureUser(email, playerName, role);
      const [firstName, ...lastNameParts] = playerName.split(' ');
      const lastName = lastNameParts.join(' ');

      const playerId = await addDoc('players', { 
        userId, 
        firstName, 
        lastName, 
        email, 
        joinDate: new Date(), 
        isActive: true 
      });

      await addDoc('team_players', {
        teamId,
        playerId,
        seasonId,
        joinDate: new Date(),
        role,
        isActive: true,
      });

      if (isCaptain) {
        await db.collection('teams').doc(teamId).update({ captainId: userId });
      }
    }
  }

  console.log('✅ Firebase seeding complete.');
  process.exit(0);
};

seedDatabase().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});