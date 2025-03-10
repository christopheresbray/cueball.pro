import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Initialize Firebase
const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

// Data Definitions
const season = {
  name: 'Winter 2025',
  startDate: new Date('2025-06-01'),
  endDate: new Date('2025-08-31'),
  status: 'active',
  createdAt: new Date()
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

// Utility Functions
async function ensureUser(email, displayName) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    return userRecord.uid;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await auth.createUser({ email, password: 'Open1234', displayName, emailVerified: true });
      return newUser.uid;
    } else throw error;
  }
}

async function addDocument(collection, data, id = null) {
  const docRef = id ? db.collection(collection).doc(id) : db.collection(collection).doc();
  await docRef.set(processData(data));
  return docRef.id;
}

function processData(data) {
  return Object.entries(data).reduce((acc, [k,v]) => ({
    ...acc,
    [k]: v instanceof Date ? Timestamp.fromDate(v) : v
  }), {});
}

async function seedDatabase() {
  console.log('Starting Firebase database seeding...');

  const leagueId = await addDocument('leagues', {
    name: 'Hills 8-Ball League',
    createdAt: new Date(),
    isActive: true
  });

  const seasonId = await addDocument('seasons', {
    leagueId, ...season, createdAt: new Date()
  });

  const teamIds = {};
  for (const teamName of teamNames) {
    const teamId = await addDocument('teams', {
      leagueId, seasonId, name: teamName,
      createdAt: new Date(), isActive: true
    });
    teamIds[teamName] = teamId;
  }

  const playerIds = {};
  for (const [teamName, playerList] of Object.entries(playersByTeam)) {
    playerIds[teamName] = [];

    for (const fullName of playerList) {
      const email = `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
      const displayName = fullName;
      const userId = await ensureUser(email, 'Open1234', displayName=fullName);
      
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');

      const playerId = await addDocument('players', {
        userId, firstName, lastName, email, joinDate: new Date(), isActive: true
      });

      playerIds[teamName].push(playerId);

      await addDocument('team_players', {
        teamId: teamIds[teamName], playerId, joinDate: new Date(),
        role: fullName === teamCaptains[teamName] ? 'captain' : 'player', isActive: true
      });
    }
  }

  for (const [teamName, captainName] of Object.entries(teamCaptains)) {
    const captainIndex = playersByTeam[teamName].indexOf(captainName);
    const captainId = playerIds[teamName][captainIndex];
    await db.collection('teams').doc(teamIds[teamName]).update({ captainId });
  }

  console.log('Firebase seeding complete.');
  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
