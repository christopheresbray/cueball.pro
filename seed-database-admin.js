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
const clearCollection = async collectionName => {
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
const clearAuthUsers = async () => {
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

// Improved user creation with retry logic
const ensureUser = async (email, displayName, role = 'player', retryCount = 0) => {
  try {
    console.log(`👤 Processing user: ${email} (${role})`);
    let user;
    
    try {
      user = await auth.getUserByEmail(email);
      console.log(`Found existing user: ${email}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        user = await auth.createUser({
          email,
          password: 'Open1234',
          displayName,
          emailVerified: true
        });
        console.log(`Created new user: ${email}`);
      } else throw error;
    }

    // Create or update user document in Firestore
    await db.collection('users').doc(user.uid).set({
      email,
      displayName,
      role,
      createdAt: Timestamp.fromDate(new Date())
    });
    
    console.log(`✅ User document created/updated for: ${email}`);
    return user.uid;
  } catch (error) {
    if (retryCount < 3) {
      console.warn(`⚠️  Retrying user creation for ${email} (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return ensureUser(email, displayName, role, retryCount + 1);
    }
    console.error(`❌ Failed to process user ${email}:`, error);
    throw error;
  }
};

// Improved addDoc function with validation and retry logic
const addDoc = async (collection, data, retryCount = 0) => {
  try {
    console.log(`📄 Adding document to ${collection}`);
    const processedData = processData(data);
    const ref = db.collection(collection).doc();
    await ref.set(processedData);
    
    // Verify the document was created with all fields
    const doc = await ref.get();
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
    if (retryCount < 3) {
      console.warn(`⚠️  Retrying document creation in ${collection} (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return addDoc(collection, data, retryCount + 1);
    }
    console.error(`❌ Failed to create document in ${collection}:`, error);
    throw error;
  }
};

const seedDatabase = async () => {
  console.log('🔥 Starting Firebase database seeding...');
  console.log(`📅 Creating season for year ${currentYear}`);

  try {
    // Clear existing data
    await Promise.all([
      clearCollection('leagues'),
      clearCollection('seasons'),
      clearCollection('teams'),
      clearCollection('players'),
      clearCollection('team_players'),
      clearCollection('users'),
      clearCollection('venues')
    ]);
    await clearAuthUsers();

    // Create admin user
    const adminEmail = 'admin@cueballpro.com';
    console.log('👑 Creating admin user:', adminEmail);
    const adminUserId = await ensureUser(adminEmail, 'Admin User', 'admin');
    
    // Create league
    const leagueId = await addDoc('leagues', {
      ...leagueData,
      adminIds: [adminUserId]
    });
    
    // Create season
    console.log('🏆 Creating season');
    const seasonId = await addDoc('seasons', {
      ...seasonData,
      leagueId
    });
    
    // Create venues
    console.log('🏢 Creating venues');
    const venueIds = {};
    for (const venue of venues) {
      const venueId = await addDoc('venues', {
        ...venue,
        createdAt: new Date()
      });
      venueIds[venue.name] = venueId;
    }

    // Create teams and players
    console.log('👥 Creating teams and players');
    for (const teamName of teamNames) {
      // Assign appropriate venue to each team
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
        // Assign a random venue for teams without a specific venue
        const randomVenue = venues[Math.floor(Math.random() * venues.length)];
        homeVenueId = venueIds[randomVenue.name];
      }

      const teamId = await addDoc('teams', {
        leagueId,
        seasonId,
        name: teamName,
        homeVenueId,
        isActive: true,
        createdAt: new Date()
      });

      console.log(`🏃 Processing players for team: ${teamName}`);
      const playerIds = {}; // Store player IDs for captain assignment
      
      // First create all players
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

        playerIds[playerName] = userId; // Store the userId for later captain assignment
      }

      // Now assign the captain using the stored ID
      const captainName = teamCaptains[teamName];
      if (captainName && playerIds[captainName]) {
        await db.collection('teams').doc(teamId).update({ 
          captainId: playerIds[captainName] 
        });
        console.log(`👑 Set ${captainName} as captain for team ${teamName} with ID ${playerIds[captainName]}`);
      } else {
        console.warn(`⚠️ Could not find captain ${captainName} for team ${teamName}`);
      }
    }

    console.log('✅ Firebase seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase().catch(err => {
  console.error('❌ Fatal error during seeding:', err);
  process.exit(1);
});