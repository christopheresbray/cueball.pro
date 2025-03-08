// seed-database.js
import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  collection, 
  addDoc,
  Timestamp,
  doc,
  setDoc
} from 'firebase/firestore';

// Initialize Firebase with your config
// You need to fill in your actual Firebase config values here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "cueballpro-d0d07.firebaseapp.com",
  projectId: "cueballpro-d0d07",
  storageBucket: "cueballpro-d0d07.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to add document with custom ID
async function addDocWithId(collectionPath, docId, data) {
  await setDoc(doc(db, collectionPath, docId), data);
  return docId;
}

// Helper function to add document and return ID
async function addDocument(collectionPath, data) {
  const docRef = await addDoc(collection(db, collectionPath), data);
  return docRef.id;
}

// Define team names
const teamNames = [
  'BSSC Magic',
  'Grays Inn Nomads',
  'Maccy Bloods',
  'BSSC Reds',
  'Maccy Bros',
  'BSSC Raiders',
  'RSL Renegades',
  'Farcue',
  'Barker Mongrels',
  'Maccy Ring ins',
  'Old Mill Mob',
  'Scenic Slayers',
  'Grays Innkeepers'
];

// Define players with their teams
const playersByTeam = {
  'BSSC Magic': [
    'Kane Weekly',
    'Luke Hoffmann',
    'Dylan Cahill',
    'Ben Konig',
    'Jayden Hoffmann',
    'Trevor Williams',
    'Max James'
  ],
  'Grays Inn Nomads': [
    'Joe Player',
    'Marrack Payne',
    'Graeme Hilton',
    'Mark Schutt',
    'Daniel Brooksbank',
    'Jimmy Peat'
  ],
  'Maccy Bloods': [
    'Kane Weekley',
    'Peter Richardson',
    'Billy Lakey',
    'Sam Elsegood',
    'Klyde Goding',
    'Slade Richardson'
  ],
  'BSSC Reds': [
    'Jamie Wyatt',
    'Steve Tasker',
    'Paul Morton',
    'Rob Belsole',
    'Peter Bechara',
    'Andrew Hooper',
    'Keith Isgar'
  ],
  'Maccy Bros': [
    'Geoffrey Eyers',
    'Jarrad Chapman',
    'Sean Atkinson',
    'Cory Eyers',
    'Steve Clifton',
    'Jarred Horsnell',
    'Jess Fairlie'
  ],
  'BSSC Raiders': [
    'John Westerholm',
    'Erik Westerholm',
    'Alex Bray',
    'Ben Hicks',
    'Chris Bray',
    'Michael Christou'
  ],
  'RSL Renegades': [
    'Rob Bonython',
    'Gavan Pastors',
    'Joe Marshall',
    'Tim Murphy',
    'Tyler Ellis',
    'Abigayle Murphy',
    'Bruce Hamlyn'
  ],
  'Farcue': [
    'Steve Kolman',
    'Boris Hvatin',
    'Karl Krenn',
    'Allan Wake',
    'Bill Kolman',
    'Dave Mathews',
    'Craig Weber'
  ],
  'Barker Mongrels': [
    'Jon Cocks',
    'Geoff Bardy',
    'Andrew Mabarrack',
    'Ryan Worthley',
    'Ron Wade'
  ],
  'Maccy Ring ins': [
    'Mark Swinburne',
    'Peter McCaughan',
    'Cody Blesing',
    'Pete Symons',
    'Sam Britton'
  ],
  'Old Mill Mob': [
    'Beth Kendall',
    'Anthony Willing',
    'Mandy Davies',
    'John Sungod',
    'Garry Daniel',
    'Justin Kleinig'
  ],
  'Scenic Slayers': [
    'George Sarlay',
    'Carlo Russo',
    'Ben Anderson',
    'John Cavuoto',
    'Paul McEachern',
    'Dave Gleeson',
    'Elliot Trestrail',
    'Paul Eckert'
  ],
  'Grays Innkeepers': [
    'Matt Smart',
    'Nick Smart',
    'Alasdair McLaren',
    'Shane Williams',
    'Lucy Borland'
  ]
};

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Step 1: Create venues
    console.log('Creating venues...');
    const venueIds = [];
    
    const venues = [
      {
        name: 'BSSC',
        address: 'Bateau Bay NSW',
        contact: 'Club Manager'
      },
      {
        name: 'Maccy',
        address: 'MacMasters Beach NSW',
        contact: 'Venue Manager'
      },
      {
        name: 'Scenic',
        address: 'Terrigal NSW',
        contact: 'Reception'
      },
      {
        name: 'Old Mill',
        address: 'Central Coast NSW',
        contact: 'Manager'
      },
      {
        name: 'RSL',
        address: 'Central Coast NSW',
        contact: 'Club Manager'
      },
      {
        name: 'Grays Inn',
        address: 'Kincumber NSW',
        contact: 'Venue Manager'
      },
      {
        name: '3 Bros Arms',
        address: 'Central Coast NSW',
        contact: 'Reception'
      },
      {
        name: 'The Barker',
        address: 'Central Coast NSW',
        contact: 'Manager'
      }
    ];
    
    for (const venue of venues) {
      const venueId = await addDocument('venues', venue);
      venueIds.push(venueId);
    }
    
    console.log('Venues created:', venueIds);
    
    // Step 2: Create a league
    console.log('Creating league...');
    const leagueId = await addDocument('leagues', {
      name: 'Central Coast 8-Ball League',
      description: 'Premier 8-ball pool league on the Central Coast',
      adminIds: ['admin123'] // You'll need to replace this with real admin user IDs
    });
    console.log('League created:', leagueId);
    
    // Step 3: Create a season
    console.log('Creating season...');
    const seasonId = await addDocument('seasons', {
      leagueId: leagueId,
      name: 'Autumn 2025',
      startDate: Timestamp.fromDate(new Date('2025-03-01')),
      endDate: Timestamp.fromDate(new Date('2025-06-30')),
      matchDay: 'Wednesday',
      status: 'active',
      teamIds: [] // We'll update this after creating teams
    });
    console.log('Season created:', seasonId);
    
    // Step 4: Create teams and distribute venues
    console.log('Creating teams...');
    const teamIds = {};
    let venueIndex = 0;
    
    for (const teamName of teamNames) {
      // Cycle through venues
      const homeVenueId = venueIds[venueIndex % venueIds.length];
      venueIndex++;
      
      const teamData = {
        name: teamName,
        homeVenueId: homeVenueId,
        captainId: '', // Will be set later
        playerIds: [], // Will be populated later
        seasonId: seasonId
      };
      
      const teamId = await addDocument('teams', teamData);
      teamIds[teamName] = teamId;
    }
    
    console.log('Teams created:', Object.keys(teamIds).length);
    
    // Step 5: Update season with team IDs
    console.log('Updating season with team IDs...');
    await setDoc(doc(db, 'seasons', seasonId), { 
      teamIds: Object.values(teamIds) 
    }, { merge: true });
    
    // Step 6: Create players and assign to teams
    console.log('Creating players...');
    const playerIds = {};
    
    for (const [teamName, players] of Object.entries(playersByTeam)) {
      const teamId = teamIds[teamName];
      playerIds[teamName] = [];
      
      for (let i = 0; i < players.length; i++) {
        const playerName = players[i];
        // Generate a simple email based on player name
        const simplifiedName = playerName.toLowerCase().replace(/\s+/g, '.');
        const playerEmail = `${simplifiedName}@example.com`;
        
        const playerId = await addDocument('players', {
          name: playerName,
          email: playerEmail,
          phone: `+61 4${Math.floor(10 + Math.random() * 90)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`,
          teamIds: [teamId]
        });
        
        playerIds[teamName].push(playerId);
        
        // Designate first player as captain
        if (i === 0) {
          await setDoc(doc(db, 'teams', teamId), { captainId: playerId }, { merge: true });
        }
      }
      
      // Update team with player IDs
      await setDoc(doc(db, 'teams', teamId), { 
        playerIds: playerIds[teamName] 
      }, { merge: true });
      console.log(`Added ${players.length} players to ${teamName}`);
    }
    
    // Step 7: Create matches for the season
    console.log('Creating matches...');
    const matchIds = [];
    
    // Set up a round-robin schedule
    let matchDate = new Date('2025-03-05'); // First match date (Wednesday)
    const allTeamNames = Object.keys(teamIds);
    
    // Create a round-robin schedule
    for (let round = 1; round <= allTeamNames.length - 1; round++) {
      for (let i = 0; i < Math.floor(allTeamNames.length / 2); i++) {
        const homeTeamName = allTeamNames[i];
        const awayTeamName = allTeamNames[allTeamNames.length - 1 - i];
        
        // Skip if same team
        if (homeTeamName === awayTeamName) continue;
        
        const homeTeamId = teamIds[homeTeamName];
        const awayTeamId = teamIds[awayTeamName];
        
        // Get home venue
        const venueId = await db.collection('teams').doc(homeTeamId).get().then(doc => doc.data().homeVenueId);
        
        // Create match
        const matchId = await addDocument('matches', {
          seasonId: seasonId,
          homeTeamId: homeTeamId,
          awayTeamId: awayTeamId,
          venueId: venueId,
          scheduledDate: Timestamp.fromDate(new Date(matchDate)),
          status: matchDate < new Date() ? 'completed' : 'scheduled',
          homeLineup: playerIds[homeTeamName].slice(0, Math.min(5, playerIds[homeTeamName].length)),
          awayLineup: playerIds[awayTeamName].slice(0, Math.min(5, playerIds[awayTeamName].length)),
          homeSubstitutes: {},
          awaySubstitutes: {}
        });
        
        matchIds.push(matchId);
        
        // If match is completed (in the past), create frames
        if (matchDate < new Date()) {
          // Use up to 5 players from each team
          const maxFrames = Math.min(
            playerIds[homeTeamName].length, 
            playerIds[awayTeamName].length, 
            5
          );
          
          for (let position = 1; position <= maxFrames; position++) {
            const homePlayerId = playerIds[homeTeamName][position - 1];
            const awayPlayerId = playerIds[awayTeamName][position - 1];
            
            // Randomize the winner (slightly favor home team)
            const winnerId = Math.random() > 0.45 ? homePlayerId : awayPlayerId;
            
            await addDocument('frames', {
              matchId: matchId,
              round: 1, // First round
              position: position,
              homePlayerId: homePlayerId,
              awayPlayerId: awayPlayerId,
              winnerId: winnerId
            });
          }
        }
      }
      
      // Add 7 days for next match
      matchDate = new Date(matchDate);
      matchDate.setDate(matchDate.getDate() + 7);
      
      // Rotate teams for next round (keeping first team fixed)
      allTeamNames.splice(1, 0, allTeamNames.pop());
    }
    
    console.log('Matches created:', matchIds.length);
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    console.error('Error details:', error.stack);
  }
}

// Execute the seeding function
seedDatabase();