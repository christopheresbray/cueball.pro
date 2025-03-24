import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { League, Season, Team, Player, Venue, Match } from '../services/databaseService';
import { Timestamp } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(__dirname, '../../serviceAccountKey.json'), 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

// League data
const leagueData: Omit<League, 'id'> = {
  name: 'Hills 8-Ball League',
  description: 'The premier 8-ball pool league in the Adelaide Hills',
  adminIds: [], // Will be populated with admin user ID
};

// Season data
const seasonData: Omit<Season, 'id'> = {
  leagueId: '', // Will be populated with league ID
  name: 'Winter 2025',
  startDate: Timestamp.fromDate(new Date('2025-01-01')),
  endDate: Timestamp.fromDate(new Date('2025-08-31')),
  matchDay: 'wednesday',
  status: 'active',
  teamIds: [], // Will be populated with team IDs
  isCurrent: true,
};

// Venue data
const venues: Omit<Venue, 'id'>[] = [
  {
    name: 'The Cue Club',
    address: '123 Main St, Adelaide, SA 5000',
    contact: '+61 4 1234 5678',
  },
  {
    name: 'Corner Pocket',
    address: '456 High St, Adelaide, SA 5000',
    contact: '+61 4 8765 4321',
  },
  {
    name: 'Billiard Palace',
    address: '789 Market St, Adelaide, SA 5000',
    contact: '+61 4 2468 1357',
  },
  {
    name: 'Shark Shack',
    address: '321 Beach Rd, Adelaide, SA 5000',
    contact: '+61 4 9876 5432',
  },
  {
    name: 'Eight Ball Hall',
    address: '654 Park Ave, Adelaide, SA 5000',
    contact: '+61 4 1357 2468',
  },
];

// Team data
const teams: Omit<Team, 'id'>[] = [
  {
    name: 'BSSC Magic',
    homeVenueId: '', // Will be populated with venue ID
    captainUserId: '', // Changed from captainId
    playerIds: [], // Will be populated with player IDs
    seasonId: '', // Will be populated with season ID
  },
  {
    name: 'Grays Inn Nomads',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'Maccy Bloods',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'BSSC Reds',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'Maccy Bros',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'BSSC Raiders',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'RSL Renegades',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'Farcue',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'Barker Mongrels',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'Maccy Ring ins',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'Old Mill Mob',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'Scenic Slayers',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
  {
    name: 'Grays Innkeepers',
    homeVenueId: '',
    captainUserId: '',
    playerIds: [],
    seasonId: '',
  },
];

// Player data
const players: Omit<Player, 'id'>[] = [
  // BSSC Magic
  {
    firstName: 'Kane',
    lastName: 'Weekly',
    email: 'kane.weekly@example.com',
    phone: '+61 4 1111 1111',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Luke',
    lastName: 'Hoffmann',
    email: 'luke.hoffmann@example.com',
    phone: '+61 4 1111 1112',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Dylan',
    lastName: 'Cahill',
    email: 'dylan.cahill@example.com',
    phone: '+61 4 1111 1113',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Ben',
    lastName: 'Konig',
    email: 'ben.konig@example.com',
    phone: '+61 4 1111 1114',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Jayden',
    lastName: 'Hoffmann',
    email: 'jayden.hoffmann@example.com',
    phone: '+61 4 1111 1115',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Trevor',
    lastName: 'Williams',
    email: 'trevor.williams@example.com',
    phone: '+61 4 1111 1116',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Max',
    lastName: 'James',
    email: 'max.james@example.com',
    phone: '+61 4 1111 1117',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },

  // Grays Inn Nomads
  {
    firstName: 'Joe',
    lastName: 'Player',
    email: 'joe.player@example.com',
    phone: '+61 4 2222 2221',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Marrack',
    lastName: 'Payne',
    email: 'marrack.payne@example.com',
    phone: '+61 4 2222 2222',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Graeme',
    lastName: 'Hilton',
    email: 'graeme.hilton@example.com',
    phone: '+61 4 2222 2223',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Mark',
    lastName: 'Schutt',
    email: 'mark.schutt@example.com',
    phone: '+61 4 2222 2224',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Daniel',
    lastName: 'Brooksbank',
    email: 'daniel.brooksbank@example.com',
    phone: '+61 4 2222 2225',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Jimmy',
    lastName: 'Peat',
    email: 'jimmy.peat@example.com',
    phone: '+61 4 2222 2226',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },

  // BSSC Raiders
  {
    firstName: 'John',
    lastName: 'Westerholm',
    email: 'john.westerholm@example.com',
    phone: '+61 4 3333 3331',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Erik',
    lastName: 'Westerholm',
    email: 'erik.westerholm@example.com',
    phone: '+61 4 3333 3332',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Alex',
    lastName: 'Bray',
    email: 'alex.bray@example.com',
    phone: '+61 4 3333 3333',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Ben',
    lastName: 'Hicks',
    email: 'ben.hicks@example.com',
    phone: '+61 4 3333 3334',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Chris',
    lastName: 'Bray',
    email: 'chris.bray@example.com',
    phone: '+61 4 3333 3335',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
  {
    firstName: 'Michael',
    lastName: 'Christou',
    email: 'michael.christou@example.com',
    phone: '+61 4 3333 3336',
    userId: '',
    joinDate: Timestamp.fromDate(new Date()),
    isActive: true,
  },
];

// Helper functions
const clearCollection = async (collectionName: string) => {
  const snapshot = await db.collection(collectionName).get();
  const deletions = snapshot.docs.map(doc => doc.ref.delete());
  await Promise.all(deletions);
};

const clearAuthUsers = async () => {
  const listAllUsers = async (nextPageToken?: string) => {
    const result = await auth.listUsers(1000, nextPageToken);
    await Promise.all(result.users.map(user => auth.deleteUser(user.uid)));
    if (result.pageToken) {
      await listAllUsers(result.pageToken);
    }
  };
  await listAllUsers();
};

const ensureUser = async (email: string, displayName: string, role: 'admin' | 'captain' | 'player' = 'player') => {
  try {
    const user = await auth.getUserByEmail(email);
    await db.collection('users').doc(user.uid).set({
      email,
      displayName,
      role,
      createdAt: Timestamp.fromDate(new Date()),
    });
    return user.uid;
  } catch (error: any) {
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
        createdAt: Timestamp.fromDate(new Date()),
      });
      return newUser.uid;
    }
    throw error;
  }
};

const seedDatabase = async () => {
  console.log('🔥 Starting Firebase database seeding...');

  // Clear existing data
  await Promise.all(['leagues', 'seasons', 'teams', 'players', 'venues', 'users'].map(clearCollection));
  await clearAuthUsers();

  // Create admin user
  const adminEmail = 'admin@cueballpro.com';
  console.log('Creating admin user:', adminEmail);
  const adminUserId = await ensureUser(adminEmail, 'Admin User', 'admin');

  // Create league
  const leagueRef = await db.collection('leagues').add({
    ...leagueData,
    adminIds: [adminUserId],
  });
  console.log('Created league:', leagueRef.id);

  // Create venues
  const venueRefs = await Promise.all(
    venues.map(venue => db.collection('venues').add(venue))
  );
  console.log('Created venues:', venueRefs.map(ref => ref.id));

  // Create season
  const seasonRef = await db.collection('seasons').add({
    ...seasonData,
    leagueId: leagueRef.id,
  });
  console.log('Created season:', seasonRef.id);

  // Create players and teams
  for (const team of teams) {
    // Create team
    const teamRef = await db.collection('teams').add({
      ...team,
      seasonId: seasonRef.id,
      homeVenueId: venueRefs[Math.floor(Math.random() * venueRefs.length)].id,
    });

    // Create players for the team
    const teamPlayers = players.filter(p => p.email?.includes(team.name.toLowerCase().replace(/\s+/g, '.')));
    const playerRefs = await Promise.all(
      teamPlayers.map(player => db.collection('players').add(player))
    );

    // Update team with player IDs
    const playerDoc = await db.collection('players').doc(playerRefs[0].id).get();
    const playerData = playerDoc.data();
    await teamRef.update({
      playerIds: playerRefs.map(ref => ref.id),
      captainUserId: playerData?.userId || '', // Get userId from player document
    });

    // Update season with team ID
    await seasonRef.update({
      teamIds: FieldValue.arrayUnion(teamRef.id),
    });
  }

  console.log('✅ Database seeding completed successfully!');
};

// Run the seeding
seedDatabase().catch(console.error); 