import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Types
export interface League {
  id?: string;
  name: string;
  description: string;
  adminIds: string[];
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
  name: string;
  email: string;
  phone: string;
  teamIds: string[];
}

export interface Venue {
  id?: string;
  name: string;
  address: string;
  contact: string;
}

export interface Match {
  id?: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledDate: Timestamp;
  status: 'scheduled' | 'in_progress' | 'completed';
  homeLineup: string[];
  awayLineup: string[];
  homeSubstitutes?: Record<string, { position: number, player: string }>;
  awaySubstitutes?: Record<string, { position: number, player: string }>;
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

// League functions
export const createLeague = async (league: League) => {
  return await addDoc(collection(db, 'leagues'), league);
};

export const getLeagues = async () => {
  const snapshot = await getDocs(collection(db, 'leagues'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as League[];
};

// Season functions
export const createSeason = async (season: Season) => {
  return await addDoc(collection(db, 'seasons'), season);
};

export const getSeasons = async (leagueId: string) => {
  const q = query(collection(db, 'seasons'), where('leagueId', '==', leagueId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Season[];
};

// Team functions
export const createTeam = async (team: Team) => {
  return await addDoc(collection(db, 'teams'), team);
};

export const getTeams = async (seasonId: string) => {
  const q = query(collection(db, 'teams'), where('seasonId', '==', seasonId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Team[];
};

// Player functions
export const createPlayer = async (player: Player) => {
  return await addDoc(collection(db, 'players'), player);
};

export const getPlayers = async (teamId: string) => {
  const q = query(collection(db, 'players'), where('teamIds', 'array-contains', teamId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Player[];
};

export const updatePlayer = async (playerId: string, playerData: Partial<Player>) => {
  const playerRef = doc(db, 'players', playerId);
  await updateDoc(playerRef, playerData);
};

// Venue functions
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

// Match functions
export const createMatch = async (match: Match) => {
  return await addDoc(collection(db, 'matches'), match);
};

export const getMatches = async (seasonId: string) => {
  const q = query(collection(db, 'matches'), where('seasonId', '==', seasonId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Match[];
};

export const updateMatch = async (matchId: string, matchData: Partial<Match>) => {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, matchData);
};

// Frame functions
export const createFrame = async (frame: Frame) => {
  return await addDoc(collection(db, 'frames'), frame);
};

export const getFrames = async (matchId: string) => {
  const q = query(collection(db, 'frames'), where('matchId', '==', matchId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Frame[];
};

export const updateFrame = async (frameId: string, frameData: Partial<Frame>) => {
  const frameRef = doc(db, 'frames', frameId);
  await updateDoc(frameRef, frameData);
};