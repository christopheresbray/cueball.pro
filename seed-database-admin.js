import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

// === Data Definitions ===
const season = {
  name: 'Winter 2025',
  startDate: new Date('2025-06-01'),
  endDate: new Date('2025-08-31'),
  status: 'active'
};

const teamNames = [
  'BSSC Magic', 'Grays Inn Nomads', 'Maccy Bloods', 'BSSC Reds',
  'Maccy Bros', 'BSSC Raiders', 'RSL Renegades', 'Farcue',
  'Barker Mongrels', 'Maccy Ring ins', 'Old Mill Mob',
  'Scenic Slayers', 'Grays Innkeepers'
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

const captainsByTeam = {
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
  'Grays Innkeepers': 'Alasdair McLaren'
};

// === Helper Functions ===
async function addDocument(collection, data) {
  const ref = await db.collection(collection).add(processData(data));
  return ref.id;
}

function processData(data) {
  const result = {};
  Object.entries(data).forEach(([key, value]) => {
    result[key] = value instanceof Date ? Timestamp.fromDate(value) : value;
  });
  return result;
}

async function createPlayer(fullName, teamId) {
  const [firstName, ...lastNames] = fullName.split(' ');
  const lastName = lastNames.join(' ');
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, '')}@example.com`;

  const userId = await addDocument('users', {
    email, displayName: fullName, role: 'player', createdAt: new Date()
  });

  const playerId = await addDocument('players', {
    userId, firstName, lastName, email, joinDate: new Date(), handicap: 5, isActive: true
  });

  await addDocument('team_players', {
    teamId, playerId, joinDate: new Date(), isActive: true, role: 'regular'
  });

  return { playerId, userId, fullName };
}

// === Main Seed Function ===
async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    const leagueId = await addDocument('leagues', {
      name: 'Hills 8-Ball League',
      description: 'Premier 8-ball pool league',
      createdAt: new Date(),
      isActive: true
    });

    const seasonId = await addDocument('seasons', {
      leagueId, ...season, createdAt: new Date()
    });

    const teamIds = {};

    for (const teamName of teamNames) {
      const teamId = await addDocument('teams', {
        leagueId, seasonId, name: teamName, createdAt: new Date(), isActive: true
      });
      teamIds[teamName] = teamId;
    }

    const playerData = {};

    for (const [teamName, playerList] of Object.entries(playersByTeam)) {
      playerData[teamName] = [];
      for (const playerName of playerList) {
        const player = await createPlayer(playerName, teamIds[teamName]);
        playerData[teamName].push(player);
      }
    }

    // Assign Captains
    for (const [teamName, captainName] of Object.entries(captainsByTeam)) {
      const captain = playerData[teamName].find(p => p.fullName === captainName);
      if (captain) {
        await db.collection('teams').doc(teamIds[teamName]).update({ captainId: captain.userId });
        await db.collection('team_players')
          .where('teamId', '==', teamIds[teamName])
          .where('playerId', '==', captain.playerId)
          .get()
          .then(snapshot => {
            snapshot.forEach(doc => doc.ref.update({ role: 'captain' }));
          });
      }
    }

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
