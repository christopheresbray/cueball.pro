import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, '../../serviceAccountKey.json'), 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

// Get current year for season naming and ensure it's in the global scope
const CURRENT_YEAR = new Date().getFullYear();

// Helper function to create timestamps that are compatible with both Admin and Client SDKs
const createTimestamp = (date) => {
  const timestamp = date ? Timestamp.fromDate(date) : Timestamp.now();
  // Add a toJSON method to make it compatible with client SDK expectations
  if (!timestamp.toJSON) {
    timestamp.toJSON = function() {
      return {
        seconds: this.seconds,
        nanoseconds: this.nanoseconds
      };
    };
  }
  return timestamp;
};

// Helper function to split a full name into first and last name
const splitName = (fullName) => {
  const parts = fullName.split(' ');
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
};

// League data
const leagueData = {
  name: 'Hills 8-Ball League',
  description: 'The premier 8-ball pool league in the Adelaide Hills',
  adminIds: [], // Will be populated with admin user ID
  createdAt: Timestamp.now()
};

// Season data with explicit dates
const seasonData = {
  leagueId: '', // Will be populated with league ID
  name: `Winter ${CURRENT_YEAR}`,
  startDate: createTimestamp(new Date(`${CURRENT_YEAR}-01-01`)),
  endDate: createTimestamp(new Date(`${CURRENT_YEAR}-08-31`)),
  matchDay: 'wednesday',
  status: 'active',
  teamIds: [], // Will be populated with team IDs
  isCurrent: true,
  createdAt: Timestamp.now()
};

// Venue data
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

// Team data
const teams = [
  {
    name: 'BSSC Magic',
    players: ['Kane Weekly', 'Luke Hoffmann', 'Dylan Cahill', 'Ben Konig', 'Jayden Hoffmann', 'Trevor Williams', 'Max James'],
    captain: 'Luke Hoffmann',
    venue: 'Bridgewater Sports & Social Club'
  },
  {
    name: 'Grays Inn Nomads',
    players: ['Joe Player', 'Marrack Payne', 'Graeme Hilton', 'Mark Schutt', 'Daniel Brooksbank', 'Jimmy Peat'],
    captain: 'Marrack Payne',
    venue: 'Grays Inn'
  },
  {
    name: 'Maccy Bloods',
    players: ['Kane Weekley', 'Peter Richardson', 'Billy Lakey', 'Sam Elsegood', 'Klyde Goding', 'Slade Richardson'],
    captain: 'Peter Richardson',
    venue: 'Macclesfield Hotel'
  },
  {
    name: 'BSSC Reds',
    players: ['Jamie Wyatt', 'Steve Tasker', 'Paul Morton', 'Rob Belsole', 'Peter Bechara', 'Andrew Hooper', 'Keith Isgar'],
    captain: 'Steve Tasker',
    venue: 'Bridgewater Sports & Social Club'
  },
  {
    name: 'Maccy Bros',
    players: ['Geoffrey Eyers', 'Jarrad Chapman', 'Sean Atkinson', 'Cory Eyers', 'Steve Clifton', 'Jarred Horsnell', 'Jess Fairlie'],
    captain: 'Cory Eyers',
    venue: 'Macclesfield Hotel'
  },
  {
    name: 'BSSC Raiders',
    players: ['John Westerholm', 'Erik Westerholm', 'Alex Bray', 'Ben Hicks', 'Chris Bray', 'Michael Christou'],
    captain: 'Chris Bray',
    venue: 'Bridgewater Sports & Social Club'
  },
  {
    name: 'RSL Renegades',
    players: ['Rob Bonython', 'Gavan Pastors', 'Joe Marshall', 'Tim Murphy', 'Tyler Ellis', 'Abigayle Murphy', 'Bruce Hamlyn'],
    captain: 'Tim Murphy',
    venue: 'Barker Hotel'
  },
  {
    name: 'Farcue',
    players: ['Steve Kolman', 'Boris Hvatin', 'Karl Krenn', 'Allan Wake', 'Bill Kolman', 'Dave Mathews', 'Craig Weber'],
    captain: 'Steve Kolman',
    venue: 'Barker Hotel'
  },
  {
    name: 'Barker Mongrels',
    players: ['Jon Cocks', 'Geoff Bardy', 'Andrew Mabarrack', 'Ryan Worthley', 'Ron Wade'],
    captain: 'Jon Cocks',
    venue: 'Barker Hotel'
  },
  {
    name: 'Maccy Ring ins',
    players: ['Mark Swinburne', 'Peter McCaughan', 'Cody Blesing', 'Pete Symons', 'Sam Britton'],
    captain: 'Mark Swinburne',
    venue: 'Macclesfield Hotel'
  },
  {
    name: 'Old Mill Mob',
    players: ['Beth Kendall', 'Anthony Willing', 'Mandy Davies', 'John Sungod', 'Garry Daniel', 'Justin Kleinig'],
    captain: 'Beth Kendall',
    venue: 'Old Mill'
  },
  {
    name: 'Scenic Slayers',
    players: ['George Sarlay', 'Carlo Russo', 'Ben Anderson', 'John Cavuoto', 'Paul McEachern', 'Dave Gleeson', 'Elliot Trestrail', 'Paul Eckert'],
    captain: 'Carlo Russo',
    venue: 'Grays Inn'
  },
  {
    name: 'Grays Innkeepers',
    players: ['Matt Smart', 'Nick Smart', 'Alasdair McLaren', 'Shane Williams', 'Lucy Borland'],
    captain: 'Matt Smart',
    venue: 'Grays Inn'
  }
];

// Player data without team assignments
const players = [
  // BSSC Magic
  {
    name: 'Kane Weekly',
    ...splitName('Kane Weekly'),
    email: 'kane.weekly@example.com',
    phone: '0412345678',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Luke Hoffmann',
    ...splitName('Luke Hoffmann'),
    email: 'luke.hoffmann@example.com',
    phone: '0423456789',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Dylan Cahill',
    ...splitName('Dylan Cahill'),
    email: 'dylan.cahill@example.com',
    phone: '0434567890',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Ben Konig',
    ...splitName('Ben Konig'),
    email: 'ben.konig@example.com',
    phone: '0445678901',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Jayden Hoffmann',
    ...splitName('Jayden Hoffmann'),
    email: 'jayden.hoffmann@example.com',
    phone: '0456789012',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Trevor Williams',
    ...splitName('Trevor Williams'),
    email: 'trevor.williams@example.com',
    phone: '0467890123',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Max James',
    ...splitName('Max James'),
    email: 'max.james@example.com',
    phone: '0478901234',
    handicap: 3,
    ignored: false
  },

  // Grays Inn Nomads
  {
    name: 'Joe Player',
    ...splitName('Joe Player'),
    email: 'joe.player@example.com',
    phone: '0489012345',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Marrack Payne',
    ...splitName('Marrack Payne'),
    email: 'marrack.payne@example.com',
    phone: '0411111111',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Graeme Hilton',
    ...splitName('Graeme Hilton'),
    email: 'graeme.hilton@example.com',
    phone: '0422222222',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Mark Schutt',
    ...splitName('Mark Schutt'),
    email: 'mark.schutt@example.com',
    phone: '0433333333',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Daniel Brooksbank',
    ...splitName('Daniel Brooksbank'),
    email: 'daniel.brooksbank@example.com',
    phone: '0444444444',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Jimmy Peat',
    ...splitName('Jimmy Peat'),
    email: 'jimmy.peat@example.com',
    phone: '0455555555',
    handicap: 3,
    ignored: false
  },

  // Maccy Bloods
  {
    name: 'Kane Weekley',
    ...splitName('Kane Weekley'),
    email: 'kane.weekley@example.com',
    phone: '0466666666',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Peter Richardson',
    ...splitName('Peter Richardson'),
    email: 'peter.richardson@example.com',
    phone: '0477777777',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Billy Lakey',
    ...splitName('Billy Lakey'),
    email: 'billy.lakey@example.com',
    phone: '0488888888',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Sam Elsegood',
    ...splitName('Sam Elsegood'),
    email: 'sam.elsegood@example.com',
    phone: '0499999999',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Klyde Goding',
    ...splitName('Klyde Goding'),
    email: 'klyde.goding@example.com',
    phone: '0411222333',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Slade Richardson',
    ...splitName('Slade Richardson'),
    email: 'slade.richardson@example.com',
    phone: '0422333444',
    handicap: 3,
    ignored: false
  },

  // BSSC Reds
  {
    name: 'Jamie Wyatt',
    ...splitName('Jamie Wyatt'),
    email: 'jamie.wyatt@example.com',
    phone: '0433444555',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Steve Tasker',
    ...splitName('Steve Tasker'),
    email: 'steve.tasker@example.com',
    phone: '0444555666',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Paul Morton',
    ...splitName('Paul Morton'),
    email: 'paul.morton@example.com',
    phone: '0455666777',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Rob Belsole',
    ...splitName('Rob Belsole'),
    email: 'rob.belsole@example.com',
    phone: '0466777888',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Peter Bechara',
    ...splitName('Peter Bechara'),
    email: 'peter.bechara@example.com',
    phone: '0477888999',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Andrew Hooper',
    ...splitName('Andrew Hooper'),
    email: 'andrew.hooper@example.com',
    phone: '0488999000',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Keith Isgar',
    ...splitName('Keith Isgar'),
    email: 'keith.isgar@example.com',
    phone: '0499000111',
    handicap: 3,
    ignored: false
  },

  // Maccy Bros
  {
    name: 'Geoffrey Eyers',
    ...splitName('Geoffrey Eyers'),
    email: 'geoffrey.eyers@example.com',
    phone: '0411333444',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Jarrad Chapman',
    ...splitName('Jarrad Chapman'),
    email: 'jarrad.chapman@example.com',
    phone: '0422444555',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Sean Atkinson',
    ...splitName('Sean Atkinson'),
    email: 'sean.atkinson@example.com',
    phone: '0433555666',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Cory Eyers',
    ...splitName('Cory Eyers'),
    email: 'cory.eyers@example.com',
    phone: '0444666777',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Steve Clifton',
    ...splitName('Steve Clifton'),
    email: 'steve.clifton@example.com',
    phone: '0455777888',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Jarred Horsnell',
    ...splitName('Jarred Horsnell'),
    email: 'jarred.horsnell@example.com',
    phone: '0466888999',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Jess Fairlie',
    ...splitName('Jess Fairlie'),
    email: 'jess.fairlie@example.com',
    phone: '0477999000',
    handicap: 3,
    ignored: false
  },

  // BSSC Raiders
  {
    name: 'John Westerholm',
    ...splitName('John Westerholm'),
    email: 'john.westerholm@example.com',
    phone: '0488000111',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Erik Westerholm',
    ...splitName('Erik Westerholm'),
    email: 'erik.westerholm@example.com',
    phone: '0499111222',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Alex Bray',
    ...splitName('Alex Bray'),
    email: 'alex.bray@example.com',
    phone: '0411444555',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Ben Hicks',
    ...splitName('Ben Hicks'),
    email: 'ben.hicks@example.com',
    phone: '0422555666',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Chris Bray',
    ...splitName('Chris Bray'),
    email: 'chris.bray@example.com',
    phone: '0433666777',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Michael Christou',
    ...splitName('Michael Christou'),
    email: 'michael.christou@example.com',
    phone: '0444777888',
    handicap: 3,
    ignored: false
  },

  // RSL Renegades
  {
    name: 'Rob Bonython',
    ...splitName('Rob Bonython'),
    email: 'rob.bonython@example.com',
    phone: '0455888999',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Gavan Pastors',
    ...splitName('Gavan Pastors'),
    email: 'gavan.pastors@example.com',
    phone: '0466999000',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Joe Marshall',
    ...splitName('Joe Marshall'),
    email: 'joe.marshall@example.com',
    phone: '0477000111',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Tim Murphy',
    ...splitName('Tim Murphy'),
    email: 'tim.murphy@example.com',
    phone: '0488111222',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Tyler Ellis',
    ...splitName('Tyler Ellis'),
    email: 'tyler.ellis@example.com',
    phone: '0499222333',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Abigayle Murphy',
    ...splitName('Abigayle Murphy'),
    email: 'abigayle.murphy@example.com',
    phone: '0411555666',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Bruce Hamlyn',
    ...splitName('Bruce Hamlyn'),
    email: 'bruce.hamlyn@example.com',
    phone: '0422666777',
    handicap: 3,
    ignored: false
  },

  // Farcue
  {
    name: 'Steve Kolman',
    ...splitName('Steve Kolman'),
    email: 'steve.kolman@example.com',
    phone: '0433777888',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Boris Hvatin',
    ...splitName('Boris Hvatin'),
    email: 'boris.hvatin@example.com',
    phone: '0444888999',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Karl Krenn',
    ...splitName('Karl Krenn'),
    email: 'karl.krenn@example.com',
    phone: '0455999000',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Allan Wake',
    ...splitName('Allan Wake'),
    email: 'allan.wake@example.com',
    phone: '0466000111',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Bill Kolman',
    ...splitName('Bill Kolman'),
    email: 'bill.kolman@example.com',
    phone: '0477111222',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Dave Mathews',
    ...splitName('Dave Mathews'),
    email: 'dave.mathews@example.com',
    phone: '0488222333',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Craig Weber',
    ...splitName('Craig Weber'),
    email: 'craig.weber@example.com',
    phone: '0499333444',
    handicap: 3,
    ignored: false
  },

  // Barker Mongrels
  {
    name: 'Jon Cocks',
    ...splitName('Jon Cocks'),
    email: 'jon.cocks@example.com',
    phone: '0411666777',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Geoff Bardy',
    ...splitName('Geoff Bardy'),
    email: 'geoff.bardy@example.com',
    phone: '0422777888',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Andrew Mabarrack',
    ...splitName('Andrew Mabarrack'),
    email: 'andrew.mabarrack@example.com',
    phone: '0433888999',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Ryan Worthley',
    ...splitName('Ryan Worthley'),
    email: 'ryan.worthley@example.com',
    phone: '0444999000',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Ron Wade',
    ...splitName('Ron Wade'),
    email: 'ron.wade@example.com',
    phone: '0455000111',
    handicap: 3,
    ignored: false
  },

  // Maccy Ring ins
  {
    name: 'Mark Swinburne',
    ...splitName('Mark Swinburne'),
    email: 'mark.swinburne@example.com',
    phone: '0466111222',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Peter McCaughan',
    ...splitName('Peter McCaughan'),
    email: 'peter.mccaughan@example.com',
    phone: '0477222333',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Cody Blesing',
    ...splitName('Cody Blesing'),
    email: 'cody.blesing@example.com',
    phone: '0488333444',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Pete Symons',
    ...splitName('Pete Symons'),
    email: 'pete.symons@example.com',
    phone: '0499444555',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Sam Britton',
    ...splitName('Sam Britton'),
    email: 'sam.britton@example.com',
    phone: '0411777888',
    handicap: 3,
    ignored: false
  },

  // Old Mill Mob
  {
    name: 'Beth Kendall',
    ...splitName('Beth Kendall'),
    email: 'beth.kendall@example.com',
    phone: '0422888999',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Anthony Willing',
    ...splitName('Anthony Willing'),
    email: 'anthony.willing@example.com',
    phone: '0433999000',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Mandy Davies',
    ...splitName('Mandy Davies'),
    email: 'mandy.davies@example.com',
    phone: '0444000111',
    handicap: 3,
    ignored: false
  },
  {
    name: 'John Sungod',
    ...splitName('John Sungod'),
    email: 'john.sungod@example.com',
    phone: '0455111222',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Garry Daniel',
    ...splitName('Garry Daniel'),
    email: 'garry.daniel@example.com',
    phone: '0466222333',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Justin Kleinig',
    ...splitName('Justin Kleinig'),
    email: 'justin.kleinig@example.com',
    phone: '0477333444',
    handicap: 3,
    ignored: false
  },

  // Scenic Slayers
  {
    name: 'George Sarlay',
    ...splitName('George Sarlay'),
    email: 'george.sarlay@example.com',
    phone: '0488444555',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Carlo Russo',
    ...splitName('Carlo Russo'),
    email: 'carlo.russo@example.com',
    phone: '0499555666',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Ben Anderson',
    ...splitName('Ben Anderson'),
    email: 'ben.anderson@example.com',
    phone: '0411888999',
    handicap: 3,
    ignored: false
  },
  {
    name: 'John Cavuoto',
    ...splitName('John Cavuoto'),
    email: 'john.cavuoto@example.com',
    phone: '0422999000',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Paul McEachern',
    ...splitName('Paul McEachern'),
    email: 'paul.mceachern@example.com',
    phone: '0433000111',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Dave Gleeson',
    ...splitName('Dave Gleeson'),
    email: 'dave.gleeson@example.com',
    phone: '0444111222',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Elliot Trestrail',
    ...splitName('Elliot Trestrail'),
    email: 'elliot.trestrail@example.com',
    phone: '0455222333',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Paul Eckert',
    ...splitName('Paul Eckert'),
    email: 'paul.eckert@example.com',
    phone: '0466333444',
    handicap: 3,
    ignored: false
  },

  // Grays Innkeepers
  {
    name: 'Matt Smart',
    ...splitName('Matt Smart'),
    email: 'matt.smart@example.com',
    phone: '0477444555',
    handicap: 4,
    ignored: false
  },
  {
    name: 'Nick Smart',
    ...splitName('Nick Smart'),
    email: 'nick.smart@example.com',
    phone: '0488555666',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Alasdair McLaren',
    ...splitName('Alasdair McLaren'),
    email: 'alasdair.mclaren@example.com',
    phone: '0499666777',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Shane Williams',
    ...splitName('Shane Williams'),
    email: 'shane.williams@example.com',
    phone: '0411999000',
    handicap: 3,
    ignored: false
  },
  {
    name: 'Lucy Borland',
    ...splitName('Lucy Borland'),
    email: 'lucy.borland@example.com',
    phone: '0422000111',
    handicap: 3,
    ignored: false
  }
];

const clearCollection = async (collectionName) => {
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
          createdAt: createTimestamp(),
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

const validateTeamData = (team) => {
  const requiredFields = ['name', 'players', 'captain', 'venue'];
  const missingFields = requiredFields.filter(field => !team[field]);
  if (missingFields.length > 0) {
    throw new Error(`Team ${team.name} is missing required fields: ${missingFields.join(', ')}`);
  }
  if (!team.players.includes(team.captain)) {
    throw new Error(`Team ${team.name}'s captain ${team.captain} is not in the players list`);
  }
};

const validatePlayerData = (player) => {
  const requiredFields = ['firstName', 'lastName', 'email'];
  const missingFields = requiredFields.filter(field => !player[field]);
  if (missingFields.length > 0) {
    throw new Error(`Player ${player.name} is missing required fields: ${missingFields.join(', ')}`);
  }
};

const createTeamPlayersInBatch = async (team, teamId, seasonId, playerIds) => {
  console.log(`🔄 Creating team_players associations for team ${team.name}...`);
  const batch = db.batch();
  let batchCount = 0;
  const maxBatchSize = 500; // Firestore batch limit
  const teamPlayers = [];

  for (const playerName of team.players) {
    const isCaptain = playerName === team.captain;
    const playerId = playerIds[playerName];
    
    if (!playerId) {
      console.error(`⚠️ No player ID found for ${playerName} in team ${team.name}`);
      continue;
    }

    const teamPlayerRef = db.collection('team_players').doc();
    const teamPlayerData = {
      teamId,
      playerId,
      seasonId,
      role: isCaptain ? 'captain' : 'player',
      isActive: true,
      joinDate: createTimestamp(),
      createdAt: createTimestamp()
    };

    batch.set(teamPlayerRef, teamPlayerData);
    teamPlayers.push({ ref: teamPlayerRef, data: teamPlayerData });
    batchCount++;

    // If we reach batch limit, commit and start new batch
    if (batchCount === maxBatchSize) {
      await batch.commit();
      console.log(`✅ Committed batch of ${batchCount} team_players for ${team.name}`);
      batchCount = 0;
    }
  }

  // Commit any remaining operations
  if (batchCount > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${batchCount} team_players for ${team.name}`);
  }

  return teamPlayers;
};

/**
 * Helper to generate the initial flat array of 16 frames for a match
 * Each frame is uniquely identified by (round, homePlayerPosition, awayPlayerPosition, frameId)
 * homePlayerPosition and awayPlayerPosition are immutable after creation
 */
function generateInitialFrames(matchId, seasonId) {
  const frames = [];
  for (let round = 1; round <= 4; round++) {
    for (let frameNumber = 1; frameNumber <= 4; frameNumber++) {
      const homePlayerPosition = frameNumber; // 1-4
      const awayPositionIndex = (frameNumber + round - 2) % 4; // 0-3
      const awayPlayerPosition = String.fromCharCode(65 + awayPositionIndex); // 'A'-'D'
      const frameId = `${matchId}-r${round}-h${homePlayerPosition}-a${awayPlayerPosition}`;
      frames.push({
        frameId,
        matchId,
        seasonId,
        round,
        frameNumber,
        homePlayerPosition,
        awayPlayerPosition,
        homePlayerId: '', // To be set at lineup
        awayPlayerId: '', // To be set at lineup
        winnerPlayerId: null,
        isComplete: false,
        homeScore: 0,
        awayScore: 0,
        substitutionHistory: [] // For audit trail
      });
    }
  }
  return frames;
}

const seedDatabase = async () => {
  console.log('🔥 Starting Firebase database seeding...');
  console.log(`📅 Creating season for year ${CURRENT_YEAR}`);
  console.log('🌐 Node.js version:', process.version);

  try {
    // Clear existing data
    console.log('Step 1: Clearing existing data...');
    try {
      await Promise.all([
        clearCollection('leagues'),
        clearCollection('seasons'),
        clearCollection('teams'),
        clearCollection('players'),
        clearCollection('team_players'),
        clearCollection('venues'),
        clearCollection('matches')
      ]);
      console.log('Step 1: ✅ Existing data cleared successfully');
    } catch (error) {
      console.error('Step 1: ❌ Error clearing collections:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }

    // Validate all data before proceeding
    console.log('🔍 Validating data...');
    teams.forEach(validateTeamData);
    players.forEach(validatePlayerData);
    console.log('✅ Data validation passed');

    // Create league
    console.log('🏆 Creating league...');
    let leagueId;
    try {
      const leagueRef = await db.collection('leagues').add(leagueData);
      leagueId = leagueRef.id;
      console.log(`✅ League created with ID: ${leagueId}`);
    } catch (error) {
      console.error('❌ Error creating league:', error);
      throw error;
    }
    
    // Create season
    console.log('🏆 Creating season...');
    let seasonId;
    try {
      const seasonRef = await db.collection('seasons').add({
        ...seasonData,
        leagueId
      });
      seasonId = seasonRef.id;
      console.log(`✅ Season created with ID: ${seasonId}`);
    } catch (error) {
      console.error('❌ Error creating season:', error);
      throw error;
    }

    // Create venues
    console.log('🏢 Creating venues...');
    const venueIds = {};
    try {
      const venuePromises = venues.map(async venue => {
        const venueRef = await db.collection('venues').add(venue);
        venueIds[venue.name] = venueRef.id;
        console.log(`✅ Created venue ${venue.name} with ID: ${venueRef.id}`);
      });
      await Promise.all(venuePromises);
    } catch (error) {
      console.error('❌ Error creating venues:', error);
      throw error;
    }

    // Create teams and players
    console.log('👥 Creating players first...');
    const playerIds = {};
    const captainUserIds = {};
    try {
      // First create all players
      for (const team of teams) {
        for (const playerName of team.players) {
          try {
            const [firstName, ...lastNameParts] = playerName.split(' ');
            const lastName = lastNameParts.join(' ');
            const email = `${playerName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
            const isCaptain = playerName === team.captain;

            // Create user account for captains first
            let userId = null;
            if (isCaptain) {
              try {
                userId = await ensureUser(email, playerName, 'captain');
                captainUserIds[playerName] = userId;
                console.log(`✅ Created captain user account for ${playerName} (${userId})`);
              } catch (error) {
                console.error(`❌ Error creating captain user account for ${playerName}:`, error);
                userId = `placeholder-${Date.now()}`;
                captainUserIds[playerName] = userId;
              }
            }

            if (!playerIds[playerName]) {
              const playerRef = await db.collection('players').add({
                firstName,
                lastName,
                email,
                phone: `04${Math.floor(10000000 + Math.random() * 90000000)}`,
                userId: isCaptain ? userId : null,
                createdAt: createTimestamp()
              });
              playerIds[playerName] = playerRef.id;
              console.log(`✅ Player created: ${playerName} (${playerRef.id})`);
            }
          } catch (error) {
            console.error(`❌ Error creating player ${playerName}:`, error);
            throw error;
          }
        }
      }

      // Create teams with batch processing for team_players
      console.log('🏢 Creating teams...');
      const teamIds = [];
      for (const team of teams) {
        try {
          const venueId = venueIds[team.venue];
          if (!venueId) {
            throw new Error(`No venue ID found for venue ${team.venue}`);
          }

          const teamRef = await db.collection('teams').add({
            name: team.name,
            seasonId,
            homeVenueId: venueId,
            captainUserId: captainUserIds[team.captain],
            createdAt: createTimestamp()
          });

          teamIds.push(teamRef.id);
          console.log(`✅ Created team ${team.name} with ID: ${teamRef.id}`);

          // Create team_players associations using batch processing
          await createTeamPlayersInBatch(team, teamRef.id, seasonId, playerIds);
          
          // Update season's teamIds array
          await db.collection('seasons').doc(seasonId).update({
            teamIds: FieldValue.arrayUnion(teamRef.id)
          });
          
          console.log(`✅ Updated season ${seasonId} with team ${team.name}`);
        } catch (error) {
          console.error(`❌ Error processing team ${team.name}:`, error);
          throw error;
        }
      }

      // --- NEW: Create matches for the season using the new flat frames model ---
      console.log('🎱 Creating matches for the season...');
      // Simple round-robin: each team plays each other once
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          const homeTeamId = teamIds[i];
          const awayTeamId = teamIds[j];
          const venueId = teams[i].venue === teams[j].venue ? venueIds[teams[i].venue] : venueIds[teams[i].venue];
          const matchData = {
            seasonId,
            divisionId: '', // Set if needed
            homeTeamId,
            awayTeamId,
            venueId,
            date: createTimestamp(new Date(`${CURRENT_YEAR}-02-01`)), // Example date
            scheduledDate: createTimestamp(new Date(`${CURRENT_YEAR}-02-01`)),
            status: 'scheduled',
            homeTeamScore: 0,
            awayTeamScore: 0,
            completed: false,
            frames: [], // Will be set below
            homeLineup: [],
            awayLineup: [],
            matchParticipants: {
              homeTeam: [],
              awayTeam: []
            },
            roundLockedStatus: {},
            homeConfirmedRounds: {},
            awayConfirmedRounds: {},
            currentRound: 1,
            notes: '',
            matchDate: createTimestamp(new Date(`${CURRENT_YEAR}-02-01`)),
          };
          // Add frames using the new model
          const matchRef = await db.collection('matches').add(matchData);
          const frames = generateInitialFrames(matchRef.id, seasonId);
          await db.collection('matches').doc(matchRef.id).update({ frames });
          console.log(`✅ Created match: ${homeTeamId} vs ${awayTeamId} with ${frames.length} frames`);
        }
      }
      // --- END NEW ---
    } catch (error) {
      console.error('❌ Error creating teams and players:', error);
      throw error;
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