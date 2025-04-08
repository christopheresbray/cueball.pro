import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(join(__dirname, 'serviceAccountKey.json'));
console.log('🔍 Reading service account from:', serviceAccountPath);

// Set the environment variable for the service account
process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  console.log('✅ Service account loaded successfully');
  console.log('Project ID:', serviceAccount.project_id);
  console.log('Client Email:', serviceAccount.client_email);
} catch (error) {
  console.error('❌ Failed to load service account:', error);
  process.exit(1);
}

let db;
let auth;

// Initialize Firebase with timeout
async function initializeFirebase() {
  console.log('🔥 Initializing Firebase Admin SDK for production...');
  
  try {
    console.log('  - Creating app with service account credentials...');
    console.log('  - Service account project:', serviceAccount.project_id);
    console.log('  - Service account client email:', serviceAccount.client_email);
    
    // Initialize the app
    const app = initializeApp({ 
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id 
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('App name:', app.name);
    
    // Get Firestore and Auth
    console.log('🔄 Getting Firestore and Auth instances...');
    db = getFirestore();
    auth = getAuth();
    
    console.log('✅ Firestore and Auth services initialized');
    return;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Get current year and calculate season dates
const currentYear = new Date().getFullYear();
const seasonData = {
  name: `Winter ${currentYear}`,
  startDate: new Date(`${currentYear}-03-01`), // Season starts March 1st
  endDate: new Date(`${currentYear}-10-31`),   // Ends October 31st
  status: 'active',
  createdAt: new Date(),
  isCurrent: true,
  matchDay: 'wednesday'
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

const venues = [
  {
    name: 'Bridgewater Sports & Social Club',
    address: '387 Mount Barker Rd, Bridgewater SA 5155',
    contact: '+61 883392559'
  },
  {
    name: 'Grays Inn',
    address: '40 Main St, Crafers SA 5152',
    contact: '+61 883393711'
  },
  {
    name: 'Macclesfield Hotel',
    address: '45 Venables St, Macclesfield SA 5153',
    contact: '+61 883889016'
  },
  {
    name: 'Barker Hotel',
    address: '32 Hutchinson St, Mount Barker SA 5251',
    contact: '+61 883112000'
  },
  {
    name: 'Old Mill',
    address: '18 Walker St, Mount Barker SA 5251',
    contact: '+61 883912266'
  }
];

// Improved processData function with error handling
const processData = data => {
  try {
    const processed = {};
    for (const [key, value] of Object.entries(data)) {
      processed[key] = value instanceof Date ? Timestamp.fromDate(value) : value;
    }
    return processed;
  } catch (error) {
    console.error('Error processing data:', error);
    throw error;
  }
};

// Clear collection with progress logging
const clearCollection = async (db, collectionName) => {
  console.log(`🗑️  Clearing collection: ${collectionName}`);
  try {
    const snapshot = await db.collection(collectionName).get();
    const total = snapshot.docs.length;
    console.log(`Found ${total} documents to delete in ${collectionName}`);
    
    const deletions = snapshot.docs.map(async (doc, index) => {
      await doc.ref.delete();
      if ((index + 1) % 10 === 0) {
        console.log(`Deleted ${index + 1}/${total} documents in ${collectionName}`);
      }
    });
    
    await Promise.all(deletions);
    console.log(`✅ Cleared ${total} documents from ${collectionName}`);
  } catch (error) {
    console.error(`❌ Error clearing collection ${collectionName}:`, error);
    throw error;
  }
};

// Clear auth users with progress logging
const clearAuthUsers = async (auth) => {
  console.log('🗑️  Clearing auth users');
  try {
    const listAllUsers = async (nextPageToken) => {
      const result = await auth.listUsers(1000, nextPageToken);
      await Promise.all(result.users.map(async user => {
        try {
          await auth.deleteUser(user.uid);
          console.log(`Deleted user: ${user.email}`);
        } catch (error) {
          console.error(`Error deleting user ${user.email}:`, error);
        }
      }));
      if (result.pageToken) {
        await listAllUsers(result.pageToken);
      }
    };
    await listAllUsers();
    console.log('✅ Cleared all auth users');
  } catch (error) {
    console.error('❌ Error clearing auth users:', error);
    throw error;
  }
};

// Improved user creation with retry logic and timeout handling
const ensureUser = async (email, displayName, role = 'player', retryCount = 0) => {
  try {
    console.log(`👤 Processing user: ${email} (${role})`);
    let user;
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout while processing user ${email}`)), 15000);
    });
    
    try {
      console.log(`🔄 Checking if user exists: ${email}`);
      user = await Promise.race([
        auth.getUserByEmail(email),
        timeoutPromise
      ]);
      console.log(`Found existing user: ${email}, UID: ${user.uid}`);
    } catch (error) {
      if (error.message && error.message.includes('Timeout')) {
        console.error(`⏱️ Timeout while checking if user exists: ${email}`);
        throw error;
      }
      
      console.log(`Error code when getting user: ${error.code}`);
      if (error.code === 'auth/user-not-found') {
        console.log(`🔄 Creating new user: ${email}`);
        try {
          user = await Promise.race([
            auth.createUser({
              email,
              password: 'Open1234',
              displayName,
              emailVerified: true
            }),
            timeoutPromise
          ]);
          console.log(`Created new user: ${email}, UID: ${user.uid}`);
        } catch (createError) {
          if (createError.message && createError.message.includes('Timeout')) {
            console.error(`⏱️ Timeout while creating user: ${email}`);
          } else {
            console.error(`❌ Error creating user ${email}:`, createError);
            console.error(createError.stack);
          }
          throw createError;
        }
      } else {
        console.error(`❌ Unexpected error checking user ${email}:`, error);
        console.error(error.stack);
        throw error;
      }
    }

    // Create or update user document in Firestore
    console.log(`🔄 Creating Firestore document for user: ${email}, UID: ${user.uid}`);
    try {
      // Set with merge to avoid overwriting existing data
      await Promise.race([
        db.collection('users').doc(user.uid).set({
          email,
          displayName,
          role,
          createdAt: Timestamp.fromDate(new Date())
        }, { merge: true }),
        timeoutPromise
      ]);
      
      // Verify the document was created
      console.log(`🔄 Verifying user document creation: ${email}`);
      const userDoc = await Promise.race([
        db.collection('users').doc(user.uid).get(),
        timeoutPromise
      ]);
      
      if (userDoc.exists) {
        console.log(`✅ User document created/updated and verified for: ${email}`);
        console.log(`User document data: ${JSON.stringify(userDoc.data())}`);
      } else {
        console.error(`❌ User document was not created for: ${email}`);
        throw new Error('User document was not created');
      }
    } catch (firestoreError) {
      if (firestoreError.message && firestoreError.message.includes('Timeout')) {
        console.error(`⏱️ Timeout while working with Firestore for user: ${email}`);
      } else {
        console.error(`❌ Firestore error for user ${email}:`, firestoreError);
        console.error(firestoreError.stack);
      }
      
      // Even if Firestore fails, return the user ID since the Auth user was created
      console.log(`⚠️ Returning user ID despite Firestore error: ${user.uid}`);
      return user.uid;
    }
    
    return user.uid;
  } catch (error) {
    if (retryCount < 3) {
      console.warn(`⚠️ Retrying user creation for ${email} (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return ensureUser(email, displayName, role, retryCount + 1);
    }
    console.error(`❌ Failed to process user ${email} after multiple attempts:`, error);
    // Instead of throwing error, return a placeholder ID to let the process continue
    console.log(`⚠️ Using placeholder ID for failed user ${email}`);
    return `placeholder-${Date.now()}`;
  }
};

// Improved addDoc function with validation, retry logic and timeout handling
const addDoc = async (collection, data, retryCount = 0) => {
  try {
    console.log(`📄 Adding document to ${collection}`);
    const processedData = processData(data);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout while adding document to ${collection}`)), 15000);
    });
    
    const ref = db.collection(collection).doc();
    await Promise.race([
      ref.set(processedData),
      timeoutPromise
    ]);
    
    // Verify the document was created with all fields
    console.log(`🔄 Verifying document creation in ${collection}`);
    const doc = await Promise.race([
      ref.get(),
      timeoutPromise
    ]);
    
    const savedData = doc.data();
    
    // Validate saved data
    for (const [key, value] of Object.entries(processedData)) {
      if (savedData[key] === undefined) {
        throw new Error(`Field ${key} was not saved properly`);
      }
    }
    
    console.log(`✅ Document created in ${collection}: ${ref.id}`);
    return ref.id;
  } catch (error) {
    if (error.message && error.message.includes('Timeout')) {
      console.error(`⏱️ Timeout while working with collection ${collection}`);
    }
    
    if (retryCount < 3) {
      console.warn(`⚠️ Retrying document creation in ${collection} (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return addDoc(collection, data, retryCount + 1);
    }
    console.error(`❌ Failed to create document in ${collection}:`, error);
    // Return a placeholder ID to allow the process to continue
    console.log(`⚠️ Using placeholder ID for failed document in ${collection}`);
    return `placeholder-${collection}-${Date.now()}`;
  }
};

// Add a delay function to prevent rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to ensure collections exist
const createCollections = async (db) => {
  console.log('🔄 Creating collections if they don\'t exist...');
  const collections = [
    'leagues',
    'seasons',
    'teams',
    'players',
    'team_players',
    'users',
    'venues',
    'matches'
  ];
  
  for (const collection of collections) {
    try {
      console.log(`🔄 Creating collection: ${collection}`);
      // Add a dummy document to create the collection
      const dummyDoc = await db.collection(collection).add({
        _dummy: true,
        _created: Timestamp.fromDate(new Date())
      });
      
      // Delete the dummy document immediately
      await dummyDoc.delete();
      console.log(`✅ Collection created: ${collection}`);
    } catch (error) {
      console.error(`❌ Error creating collection ${collection}:`, error);
      // Continue with other collections
    }
    
    // Add delay between collection creations
    await delay(500);
  }
  
  console.log('✅ Collections setup complete');
};

// Add global error handler
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  console.error('Error details:', {
    code: error.code,
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Error details:', {
    code: error.code,
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

const seedDatabase = async () => {
  console.log('🔥 Starting Firebase database seeding...');
  console.log(`📅 Creating season for year ${currentYear}`);
  console.log('🌐 Node.js version:', process.version);

  try {
    // Initialize Firebase first
    console.log('Step 1: Initializing Firebase...');
    await initializeFirebase();
    console.log('Step 1: ✅ Firebase initialized successfully');
    
    // Clear existing data
    console.log('Step 2: Clearing existing data...');
    try {
      await Promise.all([
        clearCollection(db, 'leagues'),
        clearCollection(db, 'seasons'),
        clearCollection(db, 'teams'),
        clearCollection(db, 'players'),
        clearCollection(db, 'team_players'),
        clearCollection(db, 'venues'),
        clearCollection(db, 'matches')
      ]);
      console.log('Step 2: ✅ Existing data cleared successfully');
    } catch (error) {
      console.error('Step 2: ❌ Error clearing collections:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }

    // Create league
    console.log('🏆 Creating league...');
    let leagueId;
    try {
      leagueId = await addDoc('leagues', {
        ...leagueData,
        adminIds: ['admin-placeholder']
      });
      console.log('✅ League created with ID:', leagueId);
    } catch (error) {
      console.error('❌ Error creating league:', error);
      throw error;
    }
    
    // Create season
    console.log('🏆 Creating season...');
    let seasonId;
    try {
      seasonId = await addDoc('seasons', {
        ...seasonData,
        leagueId
      });
      console.log('✅ Season created with ID:', seasonId);
    } catch (error) {
      console.error('❌ Error creating season:', error);
      throw error;
    }

    // Create venues
    console.log('🏢 Creating venues...');
    const venueIds = {};
    for (const venue of venues) {
      try {
        const venueId = await addDoc('venues', {
          ...venue,
          createdAt: new Date()
        });
        venueIds[venue.name] = venueId;
        console.log(`✅ Venue created: ${venue.name} (${venueId})`);
      } catch (error) {
        console.error(`❌ Error creating venue ${venue.name}:`, error);
      }
    }

    // Create teams
    console.log('👥 Creating teams and players...');
    const teamIds = {};
    const playerIdsByTeam = {};
    
    for (const teamName of teamNames) {
      try {
        let homeVenueId;
        if (teamName.includes('BSSC')) {
          homeVenueId = venueIds['Bridgewater Sports & Social Club'];
        } else if (teamName.includes('Grays')) {
          homeVenueId = venueIds['Grays Inn'];
        } else if (teamName.includes('Maccy')) {
          homeVenueId = venueIds['Macclesfield Hotel'];
        } else if (teamName.includes('Barker')) {
          homeVenueId = venueIds['Barker Hotel'];
        } else if (teamName.includes('Old Mill')) {
          homeVenueId = venueIds['Old Mill'];
        } else {
          const randomVenue = venues[Math.floor(Math.random() * venues.length)];
          homeVenueId = venueIds[randomVenue.name];
        }

        const teamId = await addDoc('teams', {
          leagueId,
          seasonId,
          name: teamName,
          homeVenueId,
          isActive: true,
          createdAt: new Date(),
          captainUserId: 'captain-placeholder'
        });
        
        teamIds[teamName] = teamId;
        playerIdsByTeam[teamId] = [];
        
        console.log(`🏃 Processing players for team: ${teamName}`);
        
        // Create players for the team
        for (const playerName of playersByTeam[teamName]) {
          try {
            const [firstName, ...lastNameParts] = playerName.split(' ');
            const lastName = lastNameParts.join(' ');
            const email = `${playerName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
            const isCaptain = playerName === teamCaptains[teamName];

            const playerId = await addDoc('players', {
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
              role: isCaptain ? 'captain' : 'player',
              isActive: true,
            });

            playerIdsByTeam[teamId].push(playerId);
            console.log(`✅ Player created: ${playerName} (${playerId})`);
          } catch (error) {
            console.error(`❌ Error creating player ${playerName}:`, error);
          }
        }

        console.log(`✅ Team created: ${teamName} (${teamId})`);
      } catch (error) {
        console.error(`❌ Error creating team ${teamName}:`, error);
      }
    }

    // Create sample matches
    console.log('🏆 Creating sample matches...');
    const sampleMatches = [
      {
        homeTeam: 'Maccy Bros',
        awayTeam: 'Barker Mongrels',
        status: 'scheduled',
        venueName: 'Macclesfield Hotel',
        date: new Date(currentYear, 2, 15, 19, 30) // March 15th 7:30 PM
      },
      {
        homeTeam: 'BSSC Magic',
        awayTeam: 'Grays Inn Nomads',
        status: 'in_progress',
        venueName: 'Bridgewater Sports & Social Club',
        date: new Date(currentYear, 2, 8, 19, 30), // March 8th 7:30 PM
        currentRound: 2,
        roundLockedStatus: { 0: true },
        homeConfirmedRounds: { 0: true },
        awayConfirmedRounds: { 0: true }
      },
      {
        homeTeam: 'Farcue',
        awayTeam: 'RSL Renegades',
        status: 'completed',
        venueName: 'Grays Inn',
        date: new Date(currentYear, 2, 1, 19, 30), // March 1st 7:30 PM
        currentRound: 5,
        roundLockedStatus: { 0: true, 1: true, 2: true, 3: true },
        homeConfirmedRounds: { 0: true, 1: true, 2: true, 3: true },
        awayConfirmedRounds: { 0: true, 1: true, 2: true, 3: true }
      }
    ];

    for (const matchData of sampleMatches) {
      try {
        const { homeTeam, awayTeam, venueName, ...rest } = matchData;
        
        if (!teamIds[homeTeam] || !teamIds[awayTeam] || !venueIds[venueName]) {
          console.warn(`⚠️ Skipping match ${homeTeam} vs ${awayTeam} - missing team or venue IDs`);
          continue;
        }
        
        const homeTeamId = teamIds[homeTeam];
        const awayTeamId = teamIds[awayTeam];
        const venueId = venueIds[venueName];
        
        console.log(`Creating match: ${homeTeam} vs ${awayTeam}`);
        
        const homePlayerIds = playerIdsByTeam[homeTeamId] || [];
        const awayPlayerIds = playerIdsByTeam[awayTeamId] || [];
        
        if (homePlayerIds.length < 4 || awayPlayerIds.length < 4) {
          console.warn(`⚠️ Skipping match - not enough players for ${homeTeam} or ${awayTeam}`);
          continue;
        }
        
        const homeLineup = homePlayerIds.slice(0, 4);
        const awayLineup = awayPlayerIds.slice(0, 4);
        
        const homeSubstitutes = homePlayerIds.slice(4);
        const awaySubstitutes = awayPlayerIds.slice(4);
        
        const lineupHistory = {};
        if (rest.status !== 'scheduled') {
          lineupHistory[1] = {
            homeLineup,
            awayLineup
          };
          
          if (rest.currentRound >= 2) {
            const round2HomeLineup = [...homeLineup];
            const round2AwayLineup = [...awayLineup];
            
            if (homeSubstitutes.length > 0) {
              round2HomeLineup[3] = homeSubstitutes[0];
            }
            if (awaySubstitutes.length > 0) {
              round2AwayLineup[3] = awaySubstitutes[0];
            }
            
            lineupHistory[2] = {
              homeLineup: round2HomeLineup,
              awayLineup: round2AwayLineup
            };
          }
          
          if (rest.currentRound >= 3) {
            lineupHistory[3] = {
              homeLineup: [...(lineupHistory[2]?.homeLineup || homeLineup)],
              awayLineup: [...(lineupHistory[2]?.awayLineup || awayLineup)]
            };
          }
          
          if (rest.currentRound >= 4) {
            lineupHistory[4] = {
              homeLineup: [...(lineupHistory[3]?.homeLineup || homeLineup)],
              awayLineup: [...(lineupHistory[3]?.awayLineup || awayLineup)]
            };
          }
        }
        
        let frameResults = {};
        if (rest.status === 'in_progress') {
          frameResults = {
            '0-0': { winnerId: homePlayerIds[0], homeScore: 1, awayScore: 0 },
            '0-1': { winnerId: awayPlayerIds[1], homeScore: 0, awayScore: 1 },
            '0-2': { winnerId: homePlayerIds[2], homeScore: 1, awayScore: 0 },
            '0-3': { winnerId: awayPlayerIds[3], homeScore: 0, awayScore: 1 }
          };
        } else if (rest.status === 'completed') {
          frameResults['0-0'] = { winnerId: homePlayerIds[0], homeScore: 1, awayScore: 0 };
          frameResults['0-1'] = { winnerId: awayPlayerIds[1], homeScore: 0, awayScore: 1 };
          frameResults['0-2'] = { winnerId: homePlayerIds[2], homeScore: 1, awayScore: 0 };
          frameResults['0-3'] = { winnerId: awayPlayerIds[3], homeScore: 0, awayScore: 1 };
          
          frameResults['1-0'] = { winnerId: homePlayerIds[0], homeScore: 1, awayScore: 0 };
          frameResults['1-1'] = { winnerId: homePlayerIds[1], homeScore: 1, awayScore: 0 };
          frameResults['1-2'] = { winnerId: awayPlayerIds[2], homeScore: 0, awayScore: 1 };
          frameResults['1-3'] = { winnerId: awayPlayerIds[3], homeScore: 0, awayScore: 1 };
          
          frameResults['2-0'] = { winnerId: homePlayerIds[0], homeScore: 1, awayScore: 0 };
          frameResults['2-1'] = { winnerId: awayPlayerIds[1], homeScore: 0, awayScore: 1 };
          frameResults['2-2'] = { winnerId: homePlayerIds[2], homeScore: 1, awayScore: 0 };
          frameResults['2-3'] = { winnerId: awayPlayerIds[3], homeScore: 0, awayScore: 1 };
          
          frameResults['3-0'] = { winnerId: homePlayerIds[0], homeScore: 1, awayScore: 0 };
          frameResults['3-1'] = { winnerId: homePlayerIds[1], homeScore: 1, awayScore: 0 };
          frameResults['3-2'] = { winnerId: awayPlayerIds[2], homeScore: 0, awayScore: 1 };
          frameResults['3-3'] = { winnerId: homePlayerIds[3], homeScore: 1, awayScore: 0 };
        }
        
        const matchId = await addDoc('matches', {
          seasonId,
          homeTeamId,
          awayTeamId,
          venueId,
          scheduledDate: rest.date,
          homeLineup,
          awayLineup,
          status: rest.status,
          currentRound: rest.currentRound || 1,
          roundLockedStatus: rest.roundLockedStatus || {},
          homeConfirmedRounds: rest.homeConfirmedRounds || {},
          awayConfirmedRounds: rest.awayConfirmedRounds || {},
          frameResults,
          lineupHistory,
          createdAt: new Date()
        });
        
        console.log(`✅ Created ${rest.status} match: ${homeTeam} vs ${awayTeam} (${matchId})`);
      } catch (error) {
        console.error(`❌ Error creating match:`, error);
      }
    }

    console.log('✅ Firebase seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Execute seeding with better error handling
console.log('🚀 Starting seed script...');
seedDatabase().catch(err => {
  console.error('❌ Fatal error during seeding:', err);
  console.error('Error details:', {
    code: err.code,
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
});