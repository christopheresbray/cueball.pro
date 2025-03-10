// seed-database-admin.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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
const app = initializeApp({
  credential: cert(serviceAccount)
});

// Get Firestore database instance
const db = getFirestore();
const auth = getAuth();

// Helper function to add document and return ID
async function addDocument(collectionPath, data) {
  // Process data to replace JS Date objects with Firestore Timestamps
  const processedData = processData(data);
  const docRef = await db.collection(collectionPath).add(processedData);
  return docRef.id;
}

// Helper function to add document with custom ID
async function addDocWithId(collectionPath, docId, data) {
  const processedData = processData(data);
  await db.collection(collectionPath).doc(docId).set(processedData);
  return docId;
}

// Function to convert Date objects to Firestore Timestamps
function processData(data) {
  if (!data) return data;
  
  const newData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      newData[key] = Timestamp.fromDate(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      newData[key] = processData(value);
    } else {
      newData[key] = value;
    }
  }
  return newData;
}

// Helper functions for statistics updates
async function updatePlayerStats(playerId, seasonId, wonFrame, eightBallBreak, runOut) {
  // Check if player statistics record exists
  const statsQuery = await db.collection('player_statistics')
    .where('playerId', '==', playerId)
    .where('seasonId', '==', seasonId)
    .limit(1)
    .get();
  
  if (statsQuery.empty) {
    // Create new statistics record
    await addDocument('player_statistics', {
      playerId: playerId,
      seasonId: seasonId,
      matchesPlayed: 1,
      framesPlayed: 1,
      framesWon: wonFrame ? 1 : 0,
      winPercentage: wonFrame ? 100 : 0,
      eightBallBreaks: eightBallBreak ? 1 : 0,
      runOuts: runOut ? 1 : 0,
      updatedAt: new Date()
    });
  } else {
    // Update existing statistics
    const statsDoc = statsQuery.docs[0];
    const currentStats = statsDoc.data();
    
    const framesPlayed = (currentStats.framesPlayed || 0) + 1;
    const framesWon = (currentStats.framesWon || 0) + (wonFrame ? 1 : 0);
    const eightBallBreaks = (currentStats.eightBallBreaks || 0) + (eightBallBreak ? 1 : 0);
    const runOuts = (currentStats.runOuts || 0) + (runOut ? 1 : 0);
    const winPercentage = (framesWon / framesPlayed) * 100;
    
    await db.collection('player_statistics').doc(statsDoc.id).update({
      framesPlayed: framesPlayed,
      framesWon: framesWon,
      winPercentage: parseFloat(winPercentage.toFixed(2)),
      eightBallBreaks: eightBallBreaks,
      runOuts: runOuts,
      updatedAt: Timestamp.fromDate(new Date())
    });
  }
}

async function updateTeamStats(teamId, seasonId, matchesPlayed, matchesWon, framesPlayed, framesWon) {
  // Check if team statistics record exists
  const statsQuery = await db.collection('team_statistics')
    .where('teamId', '==', teamId)
    .where('seasonId', '==', seasonId)
    .limit(1)
    .get();
  
  if (!statsQuery.empty) {
    // Update existing statistics
    const statsDoc = statsQuery.docs[0];
    const currentStats = statsDoc.data();
    
    const totalMatchesPlayed = (currentStats.matchesPlayed || 0) + matchesPlayed;
    const totalMatchesWon = (currentStats.matchesWon || 0) + matchesWon;
    const totalFramesPlayed = (currentStats.framesPlayed || 0) + framesPlayed;
    const totalFramesWon = (currentStats.framesWon || 0) + framesWon;
    
    // Calculate points (2 for win, 1 for draw)
    let pointsToAdd = 0;
    if (matchesWon > 0) {
      pointsToAdd = 2; // Win
    } else if (framesWon === framesPlayed / 2) {
      pointsToAdd = 1; // Draw
    }
    
    const totalPoints = (currentStats.points || 0) + pointsToAdd;
    
    await db.collection('team_statistics').doc(statsDoc.id).update({
      matchesPlayed: totalMatchesPlayed,
      matchesWon: totalMatchesWon,
      framesPlayed: totalFramesPlayed,
      framesWon: totalFramesWon,
      points: totalPoints,
      updatedAt: Timestamp.fromDate(new Date())
    });
  }
}

// Helper function to update team standings based on points
async function updateStandings(seasonId) {
  // Get all team statistics for this season
  const statsQuery = await db.collection('team_statistics')
    .where('seasonId', '==', seasonId)
    .get();
  
  if (statsQuery.empty) return;
  
  // Sort teams by points (descending)
  const teams = statsQuery.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Sort by points (descending), then by frames won (descending)
  teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.framesWon - a.framesWon;
  });
  
  // Update positions
  const batch = db.batch();
  teams.forEach((team, index) => {
    const statsRef = db.collection('team_statistics').doc(team.id);
    batch.update(statsRef, { position: index + 1 });
  });
  
  await batch.commit();
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

// Define seasons
const seasonsToCreate = [
  {
    name: 'Autumn 2025',
    startDate: new Date('2025-03-01'),
    endDate: new Date('2025-06-30'),
    status: 'active'
  },
  {
    name: 'Winter 2025',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-08-31'),
    status: 'active'
  }
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

async function createAuthUser(email, password, displayName) {
  try {
    // Check if user already exists
    try {
      const userRecord = await auth.getUserByEmail(email);
      console.log(`User ${email} already exists with UID: ${userRecord.uid}`);
      return userRecord.uid;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create the user
        const userRecord = await auth.createUser({
          email: email,
          password: password,
          displayName: displayName,
          emailVerified: true
        });
        console.log(`Created new user ${email} with UID: ${userRecord.uid}`);
        return userRecord.uid;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error creating/retrieving user ${email}:`, error);
    throw error;
  }
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Create Chris Bray user with authentication
    console.log('Creating Chris Bray user with authentication...');
    
    // Create the authentication user
    const chrisBrayAuthUid = await createAuthUser(
      'chris.bray@braychan.com.au',
      'Open1234',
      'Chris Bray'
    );
    
    // Create the Firestore user document
    const chrisBrayUserId = await addDocWithId('users', chrisBrayAuthUid, {
      email: 'chris.bray@braychan.com.au',
      displayName: 'Chris Bray',
      role: 'captain',
      createdAt: new Date(),
      lastLogin: new Date()
    });
    
    console.log('Chris Bray user created with ID:', chrisBrayUserId);
    
    // Step 1: Create venues
    console.log('Creating venues...');
    const venueIds = {};
    
    const venues = [
      {
        name: 'BSSC',
        address: 'Bateau Bay NSW',
        city: 'Bateau Bay',
        state: 'NSW',
        contactName: 'Club Manager',
        contactPhone: '02 4332 1300',
        isActive: true,
        createdAt: new Date()
      },
      {
        name: 'Maccy',
        address: 'MacMasters Beach NSW',
        city: 'MacMasters Beach',
        state: 'NSW',
        contactName: 'Venue Manager',
        contactPhone: '02 4123 4567',
        isActive: true,
        createdAt: new Date()
      },
      {
        name: 'Scenic',
        address: 'Terrigal NSW',
        city: 'Terrigal',
        state: 'NSW',
        contactName: 'Reception',
        contactPhone: '02 4321 9876',
        isActive: true,
        createdAt: new Date()
      },
      {
        name: 'Old Mill',
        address: 'Central Coast NSW',
        city: 'Central Coast',
        state: 'NSW',
        contactName: 'Manager',
        contactPhone: '02 4356 7890',
        isActive: true,
        createdAt: new Date()
      },
      {
        name: 'RSL',
        address: 'Central Coast NSW',
        city: 'Central Coast',
        state: 'NSW',
        contactName: 'Club Manager',
        contactPhone: '02 4345 6789',
        isActive: true,
        createdAt: new Date()
      },
      {
        name: 'Grays Inn',
        address: 'Kincumber NSW',
        city: 'Kincumber',
        state: 'NSW',
        contactName: 'Venue Manager',
        contactPhone: '02 4368 1201',
        isActive: true,
        createdAt: new Date()
      },
      {
        name: '3 Bros Arms',
        address: 'Central Coast NSW',
        city: 'Central Coast',
        state: 'NSW',
        contactName: 'Reception',
        contactPhone: '02 4309 8765',
        isActive: true,
        createdAt: new Date()
      },
      {
        name: 'The Barker',
        address: 'Central Coast NSW',
        city: 'Central Coast',
        state: 'NSW',
        contactName: 'Manager',
        contactPhone: '02 4387 6543',
        isActive: true,
        createdAt: new Date()
      }
    ];
    
    for (const venue of venues) {
      const venueId = await addDocument('venues', venue);
      venueIds[venue.name] = venueId;
    }
    
    console.log('Venues created:', venueIds);
    
    // Step 2: Create a league
    console.log('Creating league...');
    const leagueId = await addDocument('leagues', {
      name: 'Hills 8-Ball League',
      description: 'Premier 8-ball pool league in the Adelaide Hills',
      createdAt: new Date(),
      createdBy: chrisBrayUserId, // Use Chris as the creator
      isActive: true,
      settings: {
        pointsForWin: 2,
        pointsForDraw: 1,
        frameFormat: '5 frames per match'
      }
    });
    console.log('League created:', leagueId);
    
    // Step 3: Create seasons
    console.log('Creating seasons...');
    const seasonIds = {};
    
    for (const season of seasonsToCreate) {
      const seasonId = await addDocument('seasons', {
        leagueId: leagueId,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        status: season.status,
        createdAt: new Date(),
        createdBy: chrisBrayUserId,
        settings: {
          matchDay: 'Wednesday',
          frameFormat: '5 singles frames',
          homeTeamBreaksFirst: true
        }
      });
      console.log(`Season created: ${season.name} (${seasonId})`);
      seasonIds[season.name] = seasonId;
    }
    
    // Step 4: Create teams
    console.log('Creating teams...');
    const teamIds = {};
    const winterTeamIds = {};
    
    for (const teamName of teamNames) {
      // Assign a venue
      const venueKey = Object.keys(venueIds)[Math.floor(Math.random() * Object.keys(venueIds).length)];
      const venueId = venueIds[venueKey];
      
      // Create team for Autumn 2025
      const teamData = {
        leagueId: leagueId,
        seasonId: seasonIds['Autumn 2025'],
        name: teamName,
        abbreviation: teamName.split(' ').map(word => word[0]).join('').toUpperCase(),
        venueId: venueId,
        createdAt: new Date(),
        isActive: true,
        stats: {
          matchesPlayed: 0,
          matchesWon: 0,
          framesPlayed: 0,
          framesWon: 0,
          points: 0
        }
      };
      
      const teamId = await addDocument('teams', teamData);
      teamIds[teamName] = teamId;
      
      // Create the same team for Winter 2025
      const winterTeamData = {
        ...teamData,
        seasonId: seasonIds['Winter 2025']
      };
      
      const winterTeamId = await addDocument('teams', winterTeamData);
      winterTeamIds[teamName] = winterTeamId;
    }
    
    console.log('Teams created for Autumn 2025:', Object.keys(teamIds).length);
    console.log('Teams created for Winter 2025:', Object.keys(winterTeamIds).length);
    
    // Step 5: Create players
    console.log('Creating players...');
    const playerIds = {};
    const userIds = {};
    
    // Create an admin user first
    const adminId = await addDocument('users', {
      email: 'admin@centralcoast8ball.com',
      displayName: 'League Admin',
      role: 'admin',
      createdAt: new Date(),
      lastLogin: new Date()
    });
    
    // Special handling for Chris Bray
    // Create a player entry for Chris Bray
    const chrisBrayPlayerId = await addDocument('players', {
      userId: chrisBrayUserId,
      firstName: 'Chris',
      lastName: 'Bray',
      email: 'chris.bray@braychan.com.au',
      phone: `+61 412 345 678`,
      joinDate: new Date(),
      isActive: true,
      handicap: 6, // Give a good handicap
      stats: {
        framesPlayed: 0,
        framesWon: 0,
        winPercentage: 0
      }
    });
    
    // Process all teams and players
    for (const [teamName, players] of Object.entries(playersByTeam)) {
      const teamId = teamIds[teamName];
      const winterTeamId = winterTeamIds[teamName];
      playerIds[teamName] = [];
      
      // Special handling for BSSC Raiders to add Chris as captain
      if (teamName === 'BSSC Raiders') {
        // Add Chris to the team player list if not already there
        if (!playerIds[teamName].includes(chrisBrayPlayerId)) {
          playerIds[teamName].push(chrisBrayPlayerId);
        }
        
        // Create team_players junction entry for Autumn season
        await addDocument('team_players', {
          teamId: teamId,
          playerId: chrisBrayPlayerId,
          joinDate: new Date(),
          isActive: true,
          role: 'captain'
        });
        
        // Set Chris as captain for Autumn team
        await db.collection('teams').doc(teamId).update({ 
          captainId: chrisBrayUserId
        });
        
        // Create team_players junction entry for Winter season
        await addDocument('team_players', {
          teamId: winterTeamId,
          playerId: chrisBrayPlayerId,
          joinDate: new Date(),
          isActive: true,
          role: 'captain'
        });
        
        // Set Chris as captain for Winter team
        await db.collection('teams').doc(winterTeamId).update({ 
          captainId: chrisBrayUserId
        });
        
        // Skip Chris Bray in the player list since we've already added him
        const filteredPlayers = players.filter(player => player !== 'Chris Bray');
        
        // Process the rest of the players for this team
        for (let i = 0; i < filteredPlayers.length; i++) {
          const playerName = filteredPlayers[i];
          await processPlayer(playerName, teamId, winterTeamId, i > 0 ? 'player' : 'captain', teamName);
        }
      } else {
        // Regular team processing
        for (let i = 0; i < players.length; i++) {
          const playerName = players[i];
          await processPlayer(playerName, teamId, winterTeamId, i === 0 ? 'captain' : 'player', teamName);
        }
      }
      
      // Create initial team statistics for Autumn season
      await addDocument('team_statistics', {
        teamId: teamId,
        seasonId: seasonIds['Autumn 2025'],
        matchesPlayed: 0,
        matchesWon: 0,
        framesPlayed: 0,
        framesWon: 0,
        points: 0,
        position: 0,
        updatedAt: new Date()
      });
      
      // Create initial team statistics for Winter season
      await addDocument('team_statistics', {
        teamId: winterTeamId,
        seasonId: seasonIds['Winter 2025'],
        matchesPlayed: 0,
        matchesWon: 0,
        framesPlayed: 0,
        framesWon: 0,
        points: 0,
        position: 0,
        updatedAt: new Date()
      });
    }
    
    // Helper function to process a player
    async function processPlayer(playerName, teamId, winterTeamId, role, teamName) {
      const nameParts = playerName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      // Generate a simple email based on player name
      const simplifiedName = playerName.toLowerCase().replace(/\s+/g, '.');
      const email = `${simplifiedName}@example.com`;
      
      // Create a user for the player
      const userId = await addDocument('users', {
        email: email,
        displayName: playerName,
        role: role, // captain or player
        createdAt: new Date(),
        lastLogin: new Date()
      });
      
      userIds[playerName] = userId;
      
      // Create the player
      const playerId = await addDocument('players', {
        userId: userId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: `+61 4${Math.floor(10 + Math.random() * 90)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`,
        joinDate: new Date(),
        isActive: true,
        handicap: Math.floor(Math.random() * 5) + 3, // Random handicap between 3-7
        stats: {
          framesPlayed: 0,
          framesWon: 0,
          winPercentage: 0
        }
      });
      
      playerIds[teamName].push(playerId);
      
      // Create team_players junction entry for Autumn season
      await addDocument('team_players', {
        teamId: teamId,
        playerId: playerId,
        joinDate: new Date(),
        isActive: true,
        role: role === 'captain' ? 'captain' : 'regular'
      });
      
      // Create team_players junction entry for Winter season
      await addDocument('team_players', {
        teamId: winterTeamId,
        playerId: playerId,
        joinDate: new Date(),
        isActive: true,
        role: role === 'captain' ? 'captain' : 'regular'
      });
      
      // If captain and not BSSC Raiders (since we're handling that specially)
      if (role === 'captain' && teamName !== 'BSSC Raiders') {
        // Update Autumn team with captain
        await db.collection('teams').doc(teamId).update({ 
          captainId: userId
        });
        
        // Update Winter team with captain
        await db.collection('teams').doc(winterTeamId).update({ 
          captainId: userId
        });
      }
      
      return playerId;
    }
    
    // Step 6: Create matches and frames
    console.log('Creating matches and frames...');
    const matchIds = [];
    
    // Set up a round-robin schedule for Autumn 2025
    const allTeamNames = Object.keys(teamIds);
    
    // Create some past match dates for completed matches
    const pastMatchDates = [
      new Date('2025-03-05'),
      new Date('2025-03-12'),
      new Date('2025-03-19')
    ];
    
    // Create future match dates
    const futureMatchDates = [
      new Date('2025-03-26'),
      new Date('2025-04-02'),
      new Date('2025-04-09'),
      new Date('2025-04-16'),
      new Date('2025-04-23'),
      new Date('2025-04-30')
    ];
    
    // Create a round-robin schedule for Autumn 2025
    for (let round = 1; round <= allTeamNames.length - 1; round++) {
      for (let i = 0; i < Math.floor(allTeamNames.length / 2); i++) {
        const homeTeamName = allTeamNames[i];
        const awayTeamName = allTeamNames[allTeamNames.length - 1 - i];
        
        // Skip if same team
        if (homeTeamName === awayTeamName) continue;
        
        const homeTeamId = teamIds[homeTeamName];
        const awayTeamId = teamIds[awayTeamName];
        
        // Get home team's venue
        const homeTeamDoc = await db.collection('teams').doc(homeTeamId).get();
        const venueId = homeTeamDoc.data().venueId;
        
        // Determine if this is a past or future match
        const isPastMatch = round <= 3; // First 3 rounds are in the past
        const currentMatchDate = isPastMatch 
          ? pastMatchDates[round - 1] 
          : futureMatchDates[Math.min(round - 4, futureMatchDates.length - 1)]; // Safe indexing
        
        // Calculate start time (7:30 PM)
        const startTime = new Date(currentMatchDate);
        startTime.setHours(19, 30, 0, 0);
        
        // Calculate end time (10:30 PM)
        const endTime = new Date(currentMatchDate);
        endTime.setHours(22, 30, 0, 0);
        
        // Create match
        const matchStatus = isPastMatch ? 'completed' : 'scheduled';
        
        // Random scores for completed matches
        let homeTeamScore = 0;
        let awayTeamScore = 0;
        
        if (isPastMatch) {
          homeTeamScore = Math.floor(Math.random() * 6); // 0-5 frames won
          awayTeamScore = 5 - homeTeamScore; // Total of 5 frames
        }
        
        const match = {
          seasonId: seasonIds['Autumn 2025'],
          homeTeamId: homeTeamId,
          awayTeamId: awayTeamId,
          venueId: venueId,
          scheduledDate: currentMatchDate,
          startTime: startTime,
          endTime: isPastMatch ? endTime : null,
          status: matchStatus,
          homeTeamScore: homeTeamScore,
          awayTeamScore: awayTeamScore,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: isPastMatch ? endTime : null,
          submittedBy: isPastMatch ? userIds[playersByTeam[homeTeamName][0]] : null, // Captain submitted
          notes: isPastMatch ? 'Match completed successfully' : ''
        };
        
        const matchId = await addDocument('matches', match);
        matchIds.push(matchId);
        
        // For completed matches, create lineups and frames
        if (isPastMatch) {
          // Create lineups for both teams
          const homePlayers = playerIds[homeTeamName].slice(0, Math.min(5, playerIds[homeTeamName].length));
          const awayPlayers = playerIds[awayTeamName].slice(0, Math.min(5, playerIds[awayTeamName].length));
          
          // Add player lineups
          for (let playerPosition = 0; playerPosition < Math.min(homePlayers.length, awayPlayers.length); playerPosition++) {
            // Home team lineup
            await addDocument('match_lineups', {
              matchId: matchId,
              teamId: homeTeamId,
              round: 1, // Single round
              playerId: homePlayers[playerPosition],
              position: playerPosition + 1,
              isSubstitute: false
            });
            
            // Away team lineup
// Away team lineup
await addDocument('match_lineups', {
    matchId: matchId,
    teamId: awayTeamId,
    round: 1, // Single round
    playerId: awayPlayers[playerPosition],
    position: playerPosition + 1,
    isSubstitute: false
  });
}

// Create frames
const maxFrames = Math.min(homePlayers.length, awayPlayers.length);

for (let framePosition = 0; framePosition < maxFrames; framePosition++) {
  const homePlayerId = homePlayers[framePosition];
  const awayPlayerId = awayPlayers[framePosition];
  
  // Determine winner based on match score
  let winnerId;
  if (framePosition < homeTeamScore) {
    winnerId = homePlayerId; // Home team won this frame
  } else {
    winnerId = awayPlayerId; // Away team won this frame
  }
  
  // Random special achievements
  const eightBallBreak = Math.random() < 0.05; // 5% chance
  const runOut = Math.random() < 0.1; // 10% chance
  
  await addDocument('frames', {
    matchId: matchId,
    round: 1,
    frameNumber: framePosition + 1,
    homePlayerId: homePlayerId,
    awayPlayerId: awayPlayerId,
    winnerId: winnerId,
    homeBreak: framePosition % 2 === 0, // Alternate breaks
    isCompleted: true,
    eightBallBreak: eightBallBreak,
    runOut: runOut,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Update player statistics
  await updatePlayerStats(homePlayerId, seasonIds['Autumn 2025'], winnerId === homePlayerId, eightBallBreak, runOut);
  await updatePlayerStats(awayPlayerId, seasonIds['Autumn 2025'], winnerId === awayPlayerId, false, false);
}

// Update team statistics
await updateTeamStats(homeTeamId, seasonIds['Autumn 2025'], 1, homeTeamScore > awayTeamScore ? 1 : 0, maxFrames, homeTeamScore);
await updateTeamStats(awayTeamId, seasonIds['Autumn 2025'], 1, awayTeamScore > homeTeamScore ? 1 : 0, maxFrames, awayTeamScore);
}
}

// Rotate teams for next round (keeping first team fixed)
allTeamNames.splice(1, 0, allTeamNames.pop());
}

console.log('Matches created for Autumn 2025:', matchIds.length);

// Also create some Winter 2025 season matches
console.log('Creating Winter 2025 season matches...');
const winterMatchIds = [];
const winterTeamNames = Object.keys(winterTeamIds);

// Create match dates for Winter 2025
const winterMatchDates = [
new Date('2025-06-04'),
new Date('2025-06-11'),
new Date('2025-06-18'),
new Date('2025-06-25'),
new Date('2025-07-02'),
new Date('2025-07-09')
];

// Create a round-robin schedule for Winter 2025 (just scheduled matches)
for (let round = 1; round <= Math.min(6, winterTeamNames.length - 1); round++) {
for (let i = 0; i < Math.floor(winterTeamNames.length / 2); i++) {
const homeTeamName = winterTeamNames[i];
const awayTeamName = winterTeamNames[winterTeamNames.length - 1 - i];

// Skip if same team
if (homeTeamName === awayTeamName) continue;

const homeTeamId = winterTeamIds[homeTeamName];
const awayTeamId = winterTeamIds[awayTeamName];

// Get home team's venue
const homeTeamDoc = await db.collection('teams').doc(homeTeamId).get();
const venueId = homeTeamDoc.data().venueId;

// Calculate match date
const matchDate = winterMatchDates[round - 1];

// Calculate start time (7:30 PM)
const startTime = new Date(matchDate);
startTime.setHours(19, 30, 0, 0);

// Create match (all scheduled)
const match = {
seasonId: seasonIds['Winter 2025'],
homeTeamId: homeTeamId,
awayTeamId: awayTeamId,
venueId: venueId,
scheduledDate: matchDate,
startTime: startTime,
status: 'scheduled',
createdAt: new Date(),
updatedAt: new Date()
};

const matchId = await addDocument('matches', match);
winterMatchIds.push(matchId);
}

// Rotate teams for next round (keeping first team fixed)
winterTeamNames.splice(1, 0, winterTeamNames.pop());
}

console.log('Matches created for Winter 2025:', winterMatchIds.length);

// Step 7: Update standings positions for Autumn 2025
console.log('Updating team standings positions for Autumn 2025...');
await updateStandings(seasonIds['Autumn 2025']);

// Create player statistics entries for Winter 2025
console.log('Creating initial player statistics for Winter 2025...');

for (const [teamName, playerIdList] of Object.entries(playerIds)) {
for (const playerId of playerIdList) {
await addDocument('player_statistics', {
playerId: playerId,
teamId: winterTeamIds[teamName],
seasonId: seasonIds['Winter 2025'],
framesPlayed: 0,
framesWon: 0,
eightBallBreaks: 0,
runOuts: 0,
winPercentage: 0,
updatedAt: new Date()
});
}
}

console.log('\n==================================');
console.log('Database seeding completed successfully!');
console.log('==================================\n');
console.log('Summary:');
console.log('--------');
console.log(`Venues: ${Object.keys(venueIds).length}`);
console.log(`League: ${leagueId}`);
console.log(`Seasons: ${Object.keys(seasonIds).length} (${Object.keys(seasonIds).join(', ')})`);
console.log(`Teams: ${Object.keys(teamIds).length} (Autumn) + ${Object.keys(winterTeamIds).length} (Winter)`);
console.log(`Matches: ${matchIds.length} (Autumn) + ${winterMatchIds.length} (Winter)`);
console.log('\nChris Bray Account:');
console.log('------------------');
console.log('Email: chris.bray@braychan.com.au');
console.log('Password: Open1234');
console.log('Role: Captain of BSSC Raiders (both seasons)');
console.log('User ID:', chrisBrayUserId);

process.exit(0);

} catch (error) {
console.error('Error seeding database:', error);
console.error('Error details:', error.stack);
process.exit(1);
}
}

// Execute the seeding function
seedDatabase();