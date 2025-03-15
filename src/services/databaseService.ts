import { 
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Types
export interface League {
  id?: string;
  name: string;
  description?: string;
  adminIds: string[];
}

export interface Venue {
  id?: string;
  name: string;
  address: string;
  contact: string;
}

export interface Season {
  id?: string;
  leagueId: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  matchDay: string;
  status: 'active' | 'completed' | 'scheduled';
  teamIds: string[];
  isCurrent: boolean;
}

export interface Team {
  id?: string;
  name: string;
  homeVenueId: string;
  captainId: string;
  playerIds: string[];
  seasonId: string;
}

export interface Player {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  userId: string;
  joinDate: Timestamp;
  isActive: boolean;
}

export interface Match {
  id?: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledDate: Timestamp;
  status: 'scheduled' | 'in_progress' | 'completed';
  homeLineup?: string[]; // Add these properties if needed
  awayLineup?: string[]; // Make them optional with ?
}

export interface Frame {
  id?: string;
  matchId: string;
  round: number;
  position: number;
  homePlayerId: string;
  awayPlayerId: string;
  winnerId?: string;
}

export const getLeagues = async () => {
  const snapshot = await getDocs(collection(db, 'leagues'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as League[];
};

export const getSeasons = async (leagueId: string) => {
  const q = query(collection(db, 'seasons'), where('leagueId', '==', leagueId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Season[];
};

export const getCurrentSeason = async (): Promise<Season | null> => {
  const q = query(collection(db, 'seasons'), where('isCurrent', '==', true));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...(docSnap.data() as Season) };
};

export const setCurrentSeason = async (seasonId: string) => {
  const seasons = await getDocs(collection(db, 'seasons'));
  const batch = writeBatch(db);
  seasons.forEach(seasonDoc => {
    batch.update(seasonDoc.ref, { isCurrent: false });
  });
  batch.update(doc(db, 'seasons', seasonId), { isCurrent: true });
  await batch.commit();
};

export const createTeam = async (team: Team) => {
  return await addDoc(collection(db, 'teams'), team);
};

export const getTeams = async (seasonId?: string) => {
  const teamsQuery = seasonId
    ? query(collection(db, 'teams'), where('seasonId', '==', seasonId))
    : collection(db, 'teams');

  const snapshot = await getDocs(teamsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Team) }));
};

export const getPlayers = async (teamId: string): Promise<Player[]> => {
  const q = query(
    collection(db, 'team_players'),
    where('teamId', '==', teamId)
  );
  const snapshot = await getDocs(q);
  const playerIds = snapshot.docs.map(doc => doc.data().playerId);

  if (playerIds.length === 0) return [];

  const playersQuery = query(collection(db, 'players'), where('__name__', 'in', playerIds));
  const playersSnapshot = await getDocs(playersQuery);
  return playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Player[];
};

export const getPlayersForTeam = async (teamId: string, seasonId: string) => {
  const teamPlayersSnapshot = await getDocs(query(
    collection(db, 'team_players'),
    where('teamId', '==', teamId),
    where('seasonId', '==', seasonId)
  ));
  const playerIds = teamPlayersSnapshot.docs.map(doc => doc.data().playerId);
  
  if (playerIds.length === 0) return [];

  const players: Player[] = [];
  const batchSize = 10;

  for (let i = 0; i < playerIds.length; i += batchSize) {
    const batchIds = playerIds.slice(i, i + batchSize);
    const playersSnapshot = await getDocs(query(collection(db, 'players'), where('__name__', 'in', batchIds)));
    players.push(...playersSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Player) })));
  }

  return players;
};

export const createPlayer = async (player: Player) => {
  return await addDoc(collection(db, 'players'), player);
};

export const updatePlayer = async (playerId: string, playerData: Partial<Player>) => {
  await updateDoc(doc(db, 'players', playerId), playerData);
};

export const createVenue = async (venue: Venue) => {
  return await addDoc(collection(db, 'venues'), venue);
};

export const getVenues = async () => {
  const snapshot = await getDocs(collection(db, 'venues'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Venue[];
};

export const updateVenue = async (venueId: string, venueData: Partial<Venue>) => {
  const venueRef = doc(db, 'venues', venueId);
  await updateDoc(venueRef, venueData);
};

export const deleteVenue = async (venueId: string) => {
  const venueRef = doc(db, 'venues', venueId);
  await deleteDoc(venueRef);
};

export const getMatches = async (seasonId: string) => {
  const q = query(collection(db, 'matches'), where('seasonId', '==', seasonId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Match[];
};

export const getTeamMatches = async (teamId: string): Promise<Match[]> => {
  try {
    const homeQuery = query(collection(db, 'matches'), where('homeTeamId', '==', teamId));
    const awayQuery = query(collection(db, 'matches'), where('awayTeamId', '==', teamId));

    const [homeSnapshot, awaySnapshot] = await Promise.all([
      getDocs(homeQuery),
      getDocs(awayQuery)
    ]);

    const matchesMap = new Map<string, Match>();

    homeSnapshot.forEach(doc => {
      matchesMap.set(doc.id, { id: doc.id, ...(doc.data() as Match) });
    });

    awaySnapshot.forEach(doc => {
      if (!matchesMap.has(doc.id)) {
        matchesMap.set(doc.id, { id: doc.id, ...(doc.data() as Match) });
      }
    });

    return Array.from(matchesMap.values());
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};

export const getFrames = async (matchId: string) => {
  const q = query(collection(db, 'frames'), where('matchId', '==', matchId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Frame[];
};

export const getMatch = async (matchId: string) => {
  const matchRef = doc(db, 'matches', matchId);
  const matchDoc = await getDoc(matchRef);
  return matchDoc.exists() ? { id: matchDoc.id, ...(matchDoc.data() as Match) } : null;
};

export const updateMatch = async (matchId: string, matchData: Partial<Match>) => {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, matchData);
};

export const createMatch = async (match: Match) => {
  return await addDoc(collection(db, 'matches'), match);
};

export const deleteMatch = async (matchId: string) => {
  const matchRef = doc(db, 'matches', matchId);
  await deleteDoc(matchRef);
};

export const getTeam = async (teamId: string) => {
  const teamRef = doc(db, 'teams', teamId);
  const teamDoc = await getDoc(teamRef);
  return teamDoc.exists() ? { id: teamDoc.id, ...(teamDoc.data() as Team) } : null;
};

export const getVenue = async (venueId: string) => {
  const venueRef = doc(db, 'venues', venueId);
  const venueDoc = await getDoc(venueRef);
  return venueDoc.exists() ? { id: venueDoc.id, ...(venueDoc.data() as Venue) } : null;
};

export const addPlayerToTeam = async (
  teamId: string,
  playerData: { firstName: string; lastName: string; email: string; userId: string },
  seasonId: string,
  role: 'player' | 'captain' = 'player'
) => {
  const playerRef = await addDoc(collection(db, 'players'), {
    ...playerData,
    joinDate: serverTimestamp(),
    isActive: true,
  });

  await addDoc(collection(db, 'team_players'), {
    teamId,
    playerId: playerRef.id,
    seasonId,
    joinDate: serverTimestamp(),
    role,
    isActive: true,
  });

  if (role === 'captain') {
    await updateDoc(doc(db, 'teams', teamId), { captainId: playerRef.id });
  }

  return playerRef.id;
};