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
};

// Season data
const seasonData = {
  leagueId: '', // Will be populated with league ID
  name: 'Winter 2025',
  startDate: createTimestamp(new Date('2025-01-01')),
  endDate: createTimestamp(new Date('2025-08-31')),
  matchDay: 'wednesday',
  status: 'active',
  teamIds: [], // Will be populated with team IDs
  isCurrent: true,
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
    captain: 'Luke Hoffmann'
  },
  {
    name: 'Grays Inn Nomads',
    players: ['Joe Player', 'Marrack Payne', 'Graeme Hilton', 'Mark Schutt', 'Daniel Brooksbank', 'Jimmy Peat'],
    captain: 'Joe Player'
  },
  {
    name: 'Maccy Bloods',
    players: ['Kane Weekley', 'Peter Richardson', 'Billy Lakey', 'Sam Elsegood', 'Klyde Goding', 'Slade Richardson'],
    captain: 'Kane Weekley'
  },
  {
    name: 'BSSC Reds',
    players: ['Jamie Wyatt', 'Steve Tasker', 'Paul Morton', 'Rob Belsole', 'Peter Bechara', 'Andrew Hooper', 'Keith Isgar'],
    captain: 'Jamie Wyatt'
  },
  {
    name: 'Maccy Bros',
    players: ['Geoffrey Eyers', 'Jarrad Chapman', 'Sean Atkinson', 'Cory Eyers', 'Steve Clifton', 'Jarred Horsnell', 'Jess Fairlie'],
    captain: 'Geoffrey Eyers'
  },
  {
    name: 'BSSC Raiders',
    players: ['John Westerholm', 'Erik Westerholm', 'Alex Bray', 'Ben Hicks', 'Chris Bray', 'Michael Christou'],
    captain: 'John Westerholm'
  },
  {
    name: 'RSL Renegades',
    players: ['Rob Bonython', 'Gavan Pastors', 'Joe Marshall', 'Tim Murphy', 'Tyler Ellis', 'Abigayle Murphy', 'Bruce Hamlyn'],
    captain: 'Rob Bonython'
  },
  {
    name: 'Farcue',
    players: ['Steve Kolman', 'Boris Hvatin', 'Karl Krenn', 'Allan Wake', 'Bill Kolman', 'Dave Mathews', 'Craig Weber'],
    captain: 'Steve Kolman'
  },
  {
    name: 'Barker Mongrels',
    players: ['Jon Cocks', 'Geoff Bardy', 'Andrew Mabarrack', 'Ryan Worthley', 'Ron Wade'],
    captain: 'Jon Cocks'
  },
  {
    name: 'Maccy Ring ins',
    players: ['Mark Swinburne', 'Peter McCaughan', 'Cody Blesing', 'Pete Symons', 'Sam Britton'],
    captain: 'Mark Swinburne'
  },
  {
    name: 'Old Mill Mob',
    players: ['Beth Kendall', 'Anthony Willing', 'Mandy Davies', 'John Sungod', 'Garry Daniel', 'Justin Kleinig'],
    captain: 'Beth Kendall'
  },
  {
    name: 'Scenic Slayers',
    players: ['George Sarlay', 'Carlo Russo', 'Ben Anderson', 'John Cavuoto', 'Paul McEachern', 'Dave Gleeson', 'Elliot Trestrail', 'Paul Eckert'],
    captain: 'George Sarlay'
  },
  {
    name: 'Grays Innkeepers',
    players: ['Matt Smart', 'Nick Smart', 'Alasdair McLaren', 'Shane Williams', 'Lucy Borland'],
    captain: 'Matt Smart'
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
    handicap: 4
  },
  {
    name: 'Luke Hoffmann',
    ...splitName('Luke Hoffmann'),
    email: 'luke.hoffmann@example.com',
    phone: '0423456789',
    handicap: 4
  },
  {
    name: 'Dylan Cahill',
    ...splitName('Dylan Cahill'),
    email: 'dylan.cahill@example.com',
    phone: '0434567890',
    handicap: 3
  },
  {
    name: 'Ben Konig',
    ...splitName('Ben Konig'),
    email: 'ben.konig@example.com',
    phone: '0445678901',
    handicap: 3
  },
  {
    name: 'Jayden Hoffmann',
    ...splitName('Jayden Hoffmann'),
    email: 'jayden.hoffmann@example.com',
    phone: '0456789012',
    handicap: 3
  },
  {
    name: 'Trevor Williams',
    ...splitName('Trevor Williams'),
    email: 'trevor.williams@example.com',
    phone: '0467890123',
    handicap: 3
  },
  {
    name: 'Max James',
    ...splitName('Max James'),
    email: 'max.james@example.com',
    phone: '0478901234',
    handicap: 3
  },

  // Grays Inn Nomads
  {
    name: 'Joe Player',
    ...splitName('Joe Player'),
    email: 'joe.player@example.com',
    phone: '0489012345',
    handicap: 4
  },
  {
    name: 'Marrack Payne',
    ...splitName('Marrack Payne'),
    email: 'marrack.payne@example.com',
    phone: '0411111111',
    handicap: 3
  },
  {
    name: 'Graeme Hilton',
    ...splitName('Graeme Hilton'),
    email: 'graeme.hilton@example.com',
    phone: '0422222222',
    handicap: 3
  },
  {
    name: 'Mark Schutt',
    ...splitName('Mark Schutt'),
    email: 'mark.schutt@example.com',
    phone: '0433333333',
    handicap: 3
  },
  {
    name: 'Daniel Brooksbank',
    ...splitName('Daniel Brooksbank'),
    email: 'daniel.brooksbank@example.com',
    phone: '0444444444',
    handicap: 3
  },
  {
    name: 'Jimmy Peat',
    ...splitName('Jimmy Peat'),
    email: 'jimmy.peat@example.com',
    phone: '0455555555',
    handicap: 3
  },

  // Maccy Bloods
  {
    name: 'Kane Weekley',
    ...splitName('Kane Weekley'),
    email: 'kane.weekley@example.com',
    phone: '0466666666',
    handicap: 4
  },
  {
    name: 'Peter Richardson',
    ...splitName('Peter Richardson'),
    email: 'peter.richardson@example.com',
    phone: '0477777777',
    handicap: 3
  },
  {
    name: 'Billy Lakey',
    ...splitName('Billy Lakey'),
    email: 'billy.lakey@example.com',
    phone: '0488888888',
    handicap: 3
  },
  {
    name: 'Sam Elsegood',
    ...splitName('Sam Elsegood'),
    email: 'sam.elsegood@example.com',
    phone: '0499999999',
    handicap: 3
  },
  {
    name: 'Klyde Goding',
    ...splitName('Klyde Goding'),
    email: 'klyde.goding@example.com',
    phone: '0411222333',
    handicap: 3
  },
  {
    name: 'Slade Richardson',
    ...splitName('Slade Richardson'),
    email: 'slade.richardson@example.com',
    phone: '0422333444',
    handicap: 3
  },

  // BSSC Reds
  {
    name: 'Jamie Wyatt',
    ...splitName('Jamie Wyatt'),
    email: 'jamie.wyatt@example.com',
    phone: '0433444555',
    handicap: 4
  },
  {
    name: 'Steve Tasker',
    ...splitName('Steve Tasker'),
    email: 'steve.tasker@example.com',
    phone: '0444555666',
    handicap: 3
  },
  {
    name: 'Paul Morton',
    ...splitName('Paul Morton'),
    email: 'paul.morton@example.com',
    phone: '0455666777',
    handicap: 3
  },
  {
    name: 'Rob Belsole',
    ...splitName('Rob Belsole'),
    email: 'rob.belsole@example.com',
    phone: '0466777888',
    handicap: 3
  },
  {
    name: 'Peter Bechara',
    ...splitName('Peter Bechara'),
    email: 'peter.bechara@example.com',
    phone: '0477888999',
    handicap: 3
  },
  {
    name: 'Andrew Hooper',
    ...splitName('Andrew Hooper'),
    email: 'andrew.hooper@example.com',
    phone: '0488999000',
    handicap: 3
  },
  {
    name: 'Keith Isgar',
    ...splitName('Keith Isgar'),
    email: 'keith.isgar@example.com',
    phone: '0499000111',
    handicap: 3
  },

  // Maccy Bros
  {
    name: 'Geoffrey Eyers',
    ...splitName('Geoffrey Eyers'),
    email: 'geoffrey.eyers@example.com',
    phone: '0411333444',
    handicap: 4
  },
  {
    name: 'Jarrad Chapman',
    ...splitName('Jarrad Chapman'),
    email: 'jarrad.chapman@example.com',
    phone: '0422444555',
    handicap: 3
  },
  {
    name: 'Sean Atkinson',
    ...splitName('Sean Atkinson'),
    email: 'sean.atkinson@example.com',
    phone: '0433555666',
    handicap: 3
  },
  {
    name: 'Cory Eyers',
    ...splitName('Cory Eyers'),
    email: 'cory.eyers@example.com',
    phone: '0444666777',
    handicap: 3
  },
  {
    name: 'Steve Clifton',
    ...splitName('Steve Clifton'),
    email: 'steve.clifton@example.com',
    phone: '0455777888',
    handicap: 3
  },
  {
    name: 'Jarred Horsnell',
    ...splitName('Jarred Horsnell'),
    email: 'jarred.horsnell@example.com',
    phone: '0466888999',
    handicap: 3
  },
  {
    name: 'Jess Fairlie',
    ...splitName('Jess Fairlie'),
    email: 'jess.fairlie@example.com',
    phone: '0477999000',
    handicap: 3
  },

  // BSSC Raiders
  {
    name: 'John Westerholm',
    ...splitName('John Westerholm'),
    email: 'john.westerholm@example.com',
    phone: '0488000111',
    handicap: 4
  },
  {
    name: 'Erik Westerholm',
    ...splitName('Erik Westerholm'),
    email: 'erik.westerholm@example.com',
    phone: '0499111222',
    handicap: 3
  },
  {
    name: 'Alex Bray',
    ...splitName('Alex Bray'),
    email: 'alex.bray@example.com',
    phone: '0411444555',
    handicap: 3
  },
  {
    name: 'Ben Hicks',
    ...splitName('Ben Hicks'),
    email: 'ben.hicks@example.com',
    phone: '0422555666',
    handicap: 3
  },
  {
    name: 'Chris Bray',
    ...splitName('Chris Bray'),
    email: 'chris.bray@example.com',
    phone: '0433666777',
    handicap: 3
  },
  {
    name: 'Michael Christou',
    ...splitName('Michael Christou'),
    email: 'michael.christou@example.com',
    phone: '0444777888',
    handicap: 3
  },

  // RSL Renegades
  {
    name: 'Rob Bonython',
    ...splitName('Rob Bonython'),
    email: 'rob.bonython@example.com',
    phone: '0455888999',
    handicap: 4
  },
  {
    name: 'Gavan Pastors',
    ...splitName('Gavan Pastors'),
    email: 'gavan.pastors@example.com',
    phone: '0466999000',
    handicap: 3
  },
  {
    name: 'Joe Marshall',
    ...splitName('Joe Marshall'),
    email: 'joe.marshall@example.com',
    phone: '0477000111',
    handicap: 3
  },
  {
    name: 'Tim Murphy',
    ...splitName('Tim Murphy'),
    email: 'tim.murphy@example.com',
    phone: '0488111222',
    handicap: 3
  },
  {
    name: 'Tyler Ellis',
    ...splitName('Tyler Ellis'),
    email: 'tyler.ellis@example.com',
    phone: '0499222333',
    handicap: 3
  },
  {
    name: 'Abigayle Murphy',
    ...splitName('Abigayle Murphy'),
    email: 'abigayle.murphy@example.com',
    phone: '0411555666',
    handicap: 3
  },
  {
    name: 'Bruce Hamlyn',
    ...splitName('Bruce Hamlyn'),
    email: 'bruce.hamlyn@example.com',
    phone: '0422666777',
    handicap: 3
  },

  // Farcue
  {
    name: 'Steve Kolman',
    ...splitName('Steve Kolman'),
    email: 'steve.kolman@example.com',
    phone: '0433777888',
    handicap: 4
  },
  {
    name: 'Boris Hvatin',
    ...splitName('Boris Hvatin'),
    email: 'boris.hvatin@example.com',
    phone: '0444888999',
    handicap: 3
  },
  {
    name: 'Karl Krenn',
    ...splitName('Karl Krenn'),
    email: 'karl.krenn@example.com',
    phone: '0455999000',
    handicap: 3
  },
  {
    name: 'Allan Wake',
    ...splitName('Allan Wake'),
    email: 'allan.wake@example.com',
    phone: '0466000111',
    handicap: 3
  },
  {
    name: 'Bill Kolman',
    ...splitName('Bill Kolman'),
    email: 'bill.kolman@example.com',
    phone: '0477111222',
    handicap: 3
  },
  {
    name: 'Dave Mathews',
    ...splitName('Dave Mathews'),
    email: 'dave.mathews@example.com',
    phone: '0488222333',
    handicap: 3
  },
  {
    name: 'Craig Weber',
    ...splitName('Craig Weber'),
    email: 'craig.weber@example.com',
    phone: '0499333444',
    handicap: 3
  },

  // Barker Mongrels
  {
    name: 'Jon Cocks',
    ...splitName('Jon Cocks'),
    email: 'jon.cocks@example.com',
    phone: '0411666777',
    handicap: 4
  },
  {
    name: 'Geoff Bardy',
    ...splitName('Geoff Bardy'),
    email: 'geoff.bardy@example.com',
    phone: '0422777888',
    handicap: 3
  },
  {
    name: 'Andrew Mabarrack',
    ...splitName('Andrew Mabarrack'),
    email: 'andrew.mabarrack@example.com',
    phone: '0433888999',
    handicap: 3
  },
  {
    name: 'Ryan Worthley',
    ...splitName('Ryan Worthley'),
    email: 'ryan.worthley@example.com',
    phone: '0444999000',
    handicap: 3
  },
  {
    name: 'Ron Wade',
    ...splitName('Ron Wade'),
    email: 'ron.wade@example.com',
    phone: '0455000111',
    handicap: 3
  },

  // Maccy Ring ins
  {
    name: 'Mark Swinburne',
    ...splitName('Mark Swinburne'),
    email: 'mark.swinburne@example.com',
    phone: '0466111222',
    handicap: 4
  },
  {
    name: 'Peter McCaughan',
    ...splitName('Peter McCaughan'),
    email: 'peter.mccaughan@example.com',
    phone: '0477222333',
    handicap: 3
  },
  {
    name: 'Cody Blesing',
    ...splitName('Cody Blesing'),
    email: 'cody.blesing@example.com',
    phone: '0488333444',
    handicap: 3
  },
  {
    name: 'Pete Symons',
    ...splitName('Pete Symons'),
    email: 'pete.symons@example.com',
    phone: '0499444555',
    handicap: 3
  },
  {
    name: 'Sam Britton',
    ...splitName('Sam Britton'),
    email: 'sam.britton@example.com',
    phone: '0411777888',
    handicap: 3
  },

  // Old Mill Mob
  {
    name: 'Beth Kendall',
    ...splitName('Beth Kendall'),
    email: 'beth.kendall@example.com',
    phone: '0422888999',
    handicap: 4
  },
  {
    name: 'Anthony Willing',
    ...splitName('Anthony Willing'),
    email: 'anthony.willing@example.com',
    phone: '0433999000',
    handicap: 3
  },
  {
    name: 'Mandy Davies',
    ...splitName('Mandy Davies'),
    email: 'mandy.davies@example.com',
    phone: '0444000111',
    handicap: 3
  },
  {
    name: 'John Sungod',
    ...splitName('John Sungod'),
    email: 'john.sungod@example.com',
    phone: '0455111222',
    handicap: 3
  },
  {
    name: 'Garry Daniel',
    ...splitName('Garry Daniel'),
    email: 'garry.daniel@example.com',
    phone: '0466222333',
    handicap: 3
  },
  {
    name: 'Justin Kleinig',
    ...splitName('Justin Kleinig'),
    email: 'justin.kleinig@example.com',
    phone: '0477333444',
    handicap: 3
  },

  // Scenic Slayers
  {
    name: 'George Sarlay',
    ...splitName('George Sarlay'),
    email: 'george.sarlay@example.com',
    phone: '0488444555',
    handicap: 4
  },
  {
    name: 'Carlo Russo',
    ...splitName('Carlo Russo'),
    email: 'carlo.russo@example.com',
    phone: '0499555666',
    handicap: 3
  },
  {
    name: 'Ben Anderson',
    ...splitName('Ben Anderson'),
    email: 'ben.anderson@example.com',
    phone: '0411888999',
    handicap: 3
  },
  {
    name: 'John Cavuoto',
    ...splitName('John Cavuoto'),
    email: 'john.cavuoto@example.com',
    phone: '0422999000',
    handicap: 3
  },
  {
    name: 'Paul McEachern',
    ...splitName('Paul McEachern'),
    email: 'paul.mceachern@example.com',
    phone: '0433000111',
    handicap: 3
  },
  {
    name: 'Dave Gleeson',
    ...splitName('Dave Gleeson'),
    email: 'dave.gleeson@example.com',
    phone: '0444111222',
    handicap: 3
  },
  {
    name: 'Elliot Trestrail',
    ...splitName('Elliot Trestrail'),
    email: 'elliot.trestrail@example.com',
    phone: '0455222333',
    handicap: 3
  },
  {
    name: 'Paul Eckert',
    ...splitName('Paul Eckert'),
    email: 'paul.eckert@example.com',
    phone: '0466333444',
    handicap: 3
  },

  // Grays Innkeepers
  {
    name: 'Matt Smart',
    ...splitName('Matt Smart'),
    email: 'matt.smart@example.com',
    phone: '0477444555',
    handicap: 4
  },
  {
    name: 'Nick Smart',
    ...splitName('Nick Smart'),
    email: 'nick.smart@example.com',
    phone: '0488555666',
    handicap: 3
  },
  {
    name: 'Alasdair McLaren',
    ...splitName('Alasdair McLaren'),
    email: 'alasdair.mclaren@example.com',
    phone: '0499666777',
    handicap: 3
  },
  {
    name: 'Shane Williams',
    ...splitName('Shane Williams'),
    email: 'shane.williams@example.com',
    phone: '0411999000',
    handicap: 3
  },
  {
    name: 'Lucy Borland',
    ...splitName('Lucy Borland'),
    email: 'lucy.borland@example.com',
    phone: '0422000111',
    handicap: 3
  }
];

const clearCollection = async (collectionName) => {
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
    await db.collection('users').doc(user.uid).set({
      email,
      displayName,
      role,
      createdAt: createTimestamp(),
    });
    return user.uid;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await auth.createUser({
        email,
        password: 'Open1234',
        displayName,
        emailVerified: true,
      });
      await db.collection('users').doc(newUser.uid).set({
        email,
        displayName,
        role,
        createdAt: createTimestamp(),
      });
      return newUser.uid;
    }
    throw error;
  }
};

const seedDatabase = async () => {
  console.log('🔥 Starting Firebase database seeding...');

  // Clear existing data
  console.log('Clearing existing data...');
  await Promise.all(['leagues', 'seasons', 'teams', 'players', 'venues', 'users', 'team_players'].map(clearCollection));
  await clearAuthUsers();

  // Step 1: Create admin user
  console.log('Step 1: Creating admin user...');
  const adminEmail = 'admin@cueball.pro';
  const adminUserId = await ensureUser(adminEmail, 'Admin User', 'admin');
  console.log('Created admin user:', adminEmail);

  // Step 2: Create league
  console.log('Step 2: Creating league...');
  const league = {
    ...leagueData,
    adminIds: [adminUserId],
    createdAt: createTimestamp(),
  };
  const leagueRef = await db.collection('leagues').add(league);
  console.log('Created league:', leagueRef.id);

  // Step 3: Create venues
  console.log('Step 3: Creating venues...');
  const venueRefs = await Promise.all(
    venues.map(venue => db.collection('venues').add({
      ...venue,
      createdAt: createTimestamp(),
    }))
  );
  const venueIds = venueRefs.map(ref => ref.id);
  console.log('Created venues:', venueIds);

  // Step 4: Create season
  console.log('Step 4: Creating season...');
  const season = {
    ...seasonData,
    leagueId: leagueRef.id,
    createdAt: createTimestamp(),
    teamIds: [], // Will be populated as teams are created
  };
  const seasonRef = await db.collection('seasons').add(season);
  console.log('Created season:', seasonRef.id);

  // Step 5: Create teams
  console.log('Step 5: Creating teams...');
  const teamRefs = await Promise.all(
    teams.map(async (team, index) => {
      const teamData = {
        ...team,
        seasonId: seasonRef.id,
        homeVenueId: venueIds[index % venueIds.length], // Distribute venues evenly
        createdAt: createTimestamp(),
      };
      const teamRef = await db.collection('teams').add(teamData);
      
      // Add team to season
      await seasonRef.update({
        teamIds: FieldValue.arrayUnion(teamRef.id),
      });

      return { ref: teamRef, name: team.name };
    })
  );
  console.log('Created teams:', teamRefs.map(t => t.ref.id));

  // Step 6: Create players
  console.log('Step 6: Creating players...');
  const playerRefs = await Promise.all(
    players.map(async (player) => {
      // Create auth user for player
      const userId = await ensureUser(
        player.email,
        `${player.name}`,
        'player'
      );

      // Create player document
      const playerData = {
        ...player,
        userId,
        createdAt: createTimestamp(),
      };
      const playerRef = await db.collection('players').add(playerData);
      return { ref: playerRef, email: player.email };
    })
  );
  console.log('Created players:', playerRefs.map(p => p.ref.id));

  // Step 7: Create team_players assignments
  console.log('Step 7: Creating team_players assignments...');
  for (const team of teams) {
    const teamRef = teamRefs.find(t => t.name === team.name);
    if (!teamRef) {
      console.log(`Warning: Team ${team.name} not found`);
      continue;
    }

    for (const playerName of team.players) {
      const playerRef = playerRefs.find(p => {
        const player = players.find(pl => pl.name === playerName);
        return player && p.email === player.email;
      });

      if (!playerRef) {
        console.log(`Warning: Player ${playerName} not found`);
        continue;
      }

      // Create team_players assignment
      await db.collection('team_players').add({
        teamId: teamRef.ref.id,
        playerId: playerRef.ref.id,
        seasonId: seasonRef.id,
        joinDate: createTimestamp(),
        role: team.captain === playerName ? 'captain' : 'player',
        isActive: true,
      });

      // If player is captain, update team
      if (team.captain === playerName) {
        const playerDoc = await playerRef.ref.get();
        await teamRef.ref.update({
          captainUserId: playerDoc.data().userId,
        });
      }
    }
    console.log(`Created team_players assignments for ${team.name}`);
  }

  console.log('✅ Database seeding completed successfully!');
};

// Run the seeding
seedDatabase().catch(console.error); 