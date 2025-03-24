import { 
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp, writeBatch, DocumentReference, QuerySnapshot,
  DocumentData, Query, DocumentSnapshot, WithFieldValue, limit, orderBy
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
  captainUserId: string;
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
  ignored?: boolean;
}

export interface Match {
  id?: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledDate: Timestamp;
  status: 'scheduled' | 'in_progress' | 'completed';
  homeLineup?: string[];
  awayLineup?: string[];
  
  // New fields for tracking rounds
  currentRound?: number;
  roundScored?: boolean;
  homeTeamConfirmedNextRound?: boolean;
  awayTeamConfirmedNextRound?: boolean;
  frameResults?: {
    [frameId: string]: {
      winnerId: string;
      homeScore?: number;
      awayScore?: number;
    }
  };
}
export interface Frame {
  id?: string;
  matchId: string;
  round: number;
  position: number;
  homePlayerId: string;
  awayPlayerId: string;
  winnerId?: string;
  seasonId?: string;
  homeScore?: number;
  awayScore?: number;
}

// Helper functions
const getDocumentById = async <T extends DocumentData>(
  collectionName: string,
  docId: string
): Promise<(T & { id: string }) | null> => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...(docSnap.data() as T) } : null;
};

const getCollectionDocs = async <T extends DocumentData>(
  collectionName: string,
  queryConstraints?: any[]
): Promise<(T & { id: string })[]> => {
  const collectionRef = collection(db, collectionName);
  const q = queryConstraints ? query(collectionRef, ...queryConstraints) : collectionRef;
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as T) }));
};

const createDocument = async <T extends DocumentData>(
  collectionName: string,
  data: WithFieldValue<T>
): Promise<DocumentReference<DocumentData>> => {
  return await addDoc(collection(db, collectionName), data as DocumentData);
};

const updateDocument = async <T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<WithFieldValue<T>>
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data as DocumentData);
};

const deleteDocument = async (
  collectionName: string,
  docId: string
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
};

// Database service functions
export const getLeagues = () => getCollectionDocs<League>('leagues');

export const getSeasons = (leagueId: string) => 
  getCollectionDocs<Season>('seasons', [where('leagueId', '==', leagueId)]);

export const getCurrentSeason = async (): Promise<Season | null> => {
  const seasons = await getCollectionDocs<Season>('seasons', [where('isCurrent', '==', true)]);
  return seasons[0] || null;
};

export const setCurrentSeason = async (seasonId: string) => {
  const batch = writeBatch(db);
  const seasons = await getDocs(collection(db, 'seasons'));
  
  seasons.forEach(seasonDoc => {
    batch.update(seasonDoc.ref, { isCurrent: false });
  });
  batch.update(doc(db, 'seasons', seasonId), { isCurrent: true });
  
  await batch.commit();
};

export const createTeam = (team: Team) => createDocument('teams', team);

export const getTeams = (seasonId?: string) => 
  seasonId ? 
    getCollectionDocs<Team>('teams', [where('seasonId', '==', seasonId)]) : 
    getCollectionDocs<Team>('teams');

export const getTeam = (teamId: string) => getDocumentById<Team>('teams', teamId);

export const updateTeam = (teamId: string, data: Partial<Team>) => 
  updateDocument<Team>('teams', teamId, data);

export const deleteTeam = (teamId: string) => deleteDocument('teams', teamId);

interface TeamPlayer {
  id?: string;
  teamId: string;
  playerId: string;
  seasonId: string;
  joinDate: Timestamp;
  role: 'player' | 'captain';
  isActive: boolean;
}

export const getPlayers = async (teamId: string): Promise<Player[]> => {
  const teamPlayers = await getCollectionDocs<TeamPlayer>('team_players', [
    where('teamId', '==', teamId)
  ]);
  
  const playerIds = teamPlayers.map(tp => tp.playerId);
  return playerIds.length ? 
    getCollectionDocs<Player>('players', [where('__name__', 'in', playerIds)]) : 
    [];
};

export const getPlayersForTeam = async (teamId: string, seasonId: string) => {
  const teamPlayers = await getCollectionDocs<TeamPlayer>('team_players', [
    where('teamId', '==', teamId),
    where('seasonId', '==', seasonId)
  ]);
  
  const playerIds = teamPlayers.map(tp => tp.playerId);
  if (!playerIds.length) return [];

  const players: Player[] = [];
  const batchSize = 10;

  for (let i = 0; i < playerIds.length; i += batchSize) {
    const batchIds = playerIds.slice(i, i + batchSize);
    const batchPlayers = await getCollectionDocs<Player>('players', [
      where('__name__', 'in', batchIds)
    ]);
    players.push(...batchPlayers);
  }

  return players;
};

export const getTeamByPlayerId = async (userId: string): Promise<Team | null> => {
  const players = await getCollectionDocs<Player>('players', [
    where('userId', '==', userId)
  ]);
  if (!players.length) return null;

  const teamPlayers = await getCollectionDocs<TeamPlayer>(
    'team_players',
    [
      where('playerId', '==', players[0].id),
      where('isActive', '==', true)
    ]
  );
  if (!teamPlayers.length) return null;

  return getTeam(teamPlayers[0].teamId);
};

export const createPlayer = (player: Player) => createDocument('players', player);

export const updatePlayer = (playerId: string, data: Partial<Player>) => 
  updateDocument<Player>('players', playerId, data);

export const getAllPlayers = async (): Promise<Player[]> => {
  return getCollectionDocs<Player>('players');
};

export const createVenue = (venue: Venue) => createDocument('venues', venue);

export const getVenues = () => getCollectionDocs<Venue>('venues');

export const getVenue = (venueId: string) => getDocumentById<Venue>('venues', venueId);

export const updateVenue = (venueId: string, data: Partial<Venue>) => 
  updateDocument<Venue>('venues', venueId, data);

export const deleteVenue = (venueId: string) => deleteDocument('venues', venueId);

export const getMatches = (seasonId: string) => 
  getCollectionDocs<Match>('matches', [where('seasonId', '==', seasonId)]);

export const getTeamMatches = async (teamId: string): Promise<Match[]> => {
  try {
    const [homeMatches, awayMatches] = await Promise.all([
      getCollectionDocs<Match>('matches', [where('homeTeamId', '==', teamId)]),
      getCollectionDocs<Match>('matches', [where('awayTeamId', '==', teamId)])
    ]);

    const matchesMap = new Map<string, Match>();
    homeMatches.forEach(match => matchesMap.set(match.id!, match));
    awayMatches.forEach(match => {
      if (!matchesMap.has(match.id!)) {
        matchesMap.set(match.id!, match);
      }
    });

    return Array.from(matchesMap.values());
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};

export const getFrames = (matchId: string) => 
  getCollectionDocs<Frame>('frames', [where('matchId', '==', matchId)]);

export const getFramesForMatches = async (matchIds: string[]): Promise<Frame[]> => {
  if (!matchIds.length) return [];
  
  // Firebase limitation: 'in' queries are limited to 10 values
  // So we need to chunk our requests if we have more than 10 matchIds
  const chunkSize = 10;
  const chunks = [];
  
  for (let i = 0; i < matchIds.length; i += chunkSize) {
    const chunk = matchIds.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  
  // Create a promise for each chunk
  const promises = chunks.map(chunk => 
    getCollectionDocs<Frame>('frames', [where('matchId', 'in', chunk)])
  );
  
  // Wait for all promises to resolve
  const results = await Promise.all(promises);
  
  // Flatten the results
  return results.flat();
};

export const getMatch = (matchId: string) => getDocumentById<Match>('matches', matchId);

export const updateMatch = (matchId: string, data: Partial<Match>) => 
  updateDocument<Match>('matches', matchId, data);

export const createMatch = (match: Match) => createDocument('matches', match);

export const deleteMatch = (matchId: string) => deleteDocument('matches', matchId);

export const addPlayerToTeam = async (
  teamId: string,
  playerData: { firstName: string; lastName: string; email?: string; userId?: string },
  seasonId: string,
  role: 'player' | 'captain' = 'player'
) => {
  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  const playerDoc = await createDocument('players', {
    ...playerData,
    email: playerData.email || '',
    userId: playerData.userId || '',
    joinDate: serverTimestamp(),
    isActive: true,
  });

  await createDocument('team_players', {
    teamId,
    playerId: playerDoc.id,
    seasonId,
    joinDate: serverTimestamp(),
    role,
    isActive: true,
  });

  const updatedPlayerIds = [...(team.playerIds || []), playerDoc.id];
  await updateTeam(teamId, { 
    playerIds: updatedPlayerIds,
    ...(role === 'captain' ? { captainUserId: playerDoc.id } : {})
  });

  return playerDoc.id;
};

export const createSeason = (season: Season) => createDocument('seasons', season);

export const updateTeamCaptain = async (teamId: string, captainId: string): Promise<void> => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, { captainUserId: captainId });
    console.log(`Successfully updated team ${teamId} captain to ${captainId}`);
  } catch (error) {
    console.error('Error updating team captain:', error);
    throw error;
  }
};

export const getTeamPlayersForSeason = async (seasonId: string): Promise<TeamPlayer[]> => {
  const teamPlayers = await getCollectionDocs<TeamPlayer>('team_players', [
    where('seasonId', '==', seasonId),
    where('isActive', '==', true)
  ]);
  
  console.log(`DEBUG - getTeamPlayersForSeason: Found ${teamPlayers.length} team_players records for season ${seasonId}`);
  
  return teamPlayers;
};

export interface PlayerWithTeam extends Player {
  teamId?: string;
  teamName?: string;
}

export const getPlayersForSeason = async (seasonId: string): Promise<PlayerWithTeam[]> => {
  // First get all team_players for this season
  const teamPlayers = await getTeamPlayersForSeason(seasonId);
  
  // Get all unique player IDs
  const playerIds = [...new Set(teamPlayers.map(tp => tp.playerId))];
  
  console.log(`DEBUG - getPlayersForSeason: Found ${playerIds.length} unique players from team_players`);
  
  if (!playerIds.length) return [];

  // Get all teams for this season
  const teams = await getTeams(seasonId);
  const teamsMap = new Map(teams.map(team => [team.id, team]));
  
  console.log(`DEBUG - getPlayersForSeason: Retrieved ${teams.length} teams for the season`);

  // Create a map of player IDs to their team associations
  const playerTeamMap = new Map<string, Set<string>>();
  teamPlayers.forEach(tp => {
    if (!playerTeamMap.has(tp.playerId)) {
      playerTeamMap.set(tp.playerId, new Set());
    }
    playerTeamMap.get(tp.playerId)?.add(tp.teamId);
  });

  // Fetch players in batches
  const players: PlayerWithTeam[] = [];
  const batchSize = 10;

  for (let i = 0; i < playerIds.length; i += batchSize) {
    const batchIds = playerIds.slice(i, i + batchSize);
    const batchPlayers = await getCollectionDocs<Player>('players', [
      where('__name__', 'in', batchIds)
    ]);
    
    console.log(`DEBUG - getPlayersForSeason: Batch ${i/batchSize + 1}: Retrieved ${batchPlayers.length} of ${batchIds.length} players`);
    
    // Add team information to each player
    const playersWithTeams = batchPlayers.map(player => {
      const playerTeamIds = playerTeamMap.get(player.id!) || new Set();
      
      // Find the primary team (first active team found)
      let primaryTeam: Team | undefined;
      for (const teamId of playerTeamIds) {
        const team = teamsMap.get(teamId);
        if (team) {
          primaryTeam = team;
          break;
        }
      }
      
      if (!primaryTeam) {
        console.log(`DEBUG - Player ${player.firstName} ${player.lastName} (${player.id}) has no valid team`);
      }
      
      return {
        ...player,
        teamId: primaryTeam?.id,
        teamName: primaryTeam?.name || 'Unknown Team',
        allTeamIds: Array.from(playerTeamIds)
      };
    });
    
    players.push(...playersWithTeams);
  }
  
  // Log summary of players with missing team information
  const playersWithNoTeam = players.filter(p => !p.teamName || p.teamName === 'Unknown Team')
    .map(p => `${p.firstName} ${p.lastName}`);
  if (playersWithNoTeam.length > 0) {
    console.log(`DEBUG - ${playersWithNoTeam.length} players have no team name: ${playersWithNoTeam.join(', ')}`);
  }

  return players;
};

// Function to delete all unplayed matches in a season
export const deleteUnplayedMatchesInSeason = async (seasonId: string): Promise<number> => {
  try {
    const matches = await getCollectionDocs<Match>('matches', [
      where('seasonId', '==', seasonId),
      where('status', '==', 'scheduled')
    ]);
    
    const batch = writeBatch(db);
    matches.forEach(match => {
      batch.delete(doc(db, 'matches', match.id!));
    });
    
    await batch.commit();
    return matches.length;
  } catch (error) {
    console.error('Error deleting unplayed matches:', error);
    throw error;
  }
};

// Function to check if a season has any played matches
export const seasonHasPlayedMatches = async (seasonId: string): Promise<boolean> => {
  try {
    const playedMatches = await getCollectionDocs<Match>('matches', [
      where('seasonId', '==', seasonId),
      where('status', 'in', ['in_progress', 'completed'])
    ]);
    
    return playedMatches.length > 0;
  } catch (error) {
    console.error('Error checking for played matches:', error);
    throw error;
  }
};

// Function to safely delete a season (only if it has no played matches)
export const deleteUnplayedSeason = async (seasonId: string): Promise<boolean> => {
  try {
    const hasPlayedMatches = await seasonHasPlayedMatches(seasonId);
    
    if (hasPlayedMatches) {
      return false; // Can't delete season with played matches
    }
    
    // Delete all unplayed matches first
    await deleteUnplayedMatchesInSeason(seasonId);
    
    // Delete the season itself
    await deleteDocument('seasons', seasonId);
    return true;
  } catch (error) {
    console.error('Error deleting unplayed season:', error);
    throw error;
  }
};

// Add a new method to fetch frames directly by player ID
export const getFramesByPlayer = async (playerId: string): Promise<Frame[]> => {
  try {
    // Get frames where player is home
    const homeFramesQuery = query(collection(db, 'frames'), where('homePlayerId', '==', playerId));
    const homeFramesSnapshot = await getDocs(homeFramesQuery);
    
    // Get frames where player is away
    const awayFramesQuery = query(collection(db, 'frames'), where('awayPlayerId', '==', playerId));
    const awayFramesSnapshot = await getDocs(awayFramesQuery);
    
    // Combine and deduplicate frames
    const framesMap = new Map<string, Frame & { id: string }>();
    
    homeFramesSnapshot.forEach(doc => {
      framesMap.set(doc.id, { id: doc.id, ...(doc.data() as Frame) });
    });
    
    awayFramesSnapshot.forEach(doc => {
      if (!framesMap.has(doc.id)) {
        framesMap.set(doc.id, { id: doc.id, ...(doc.data() as Frame) });
      }
    });
    
    return Array.from(framesMap.values());
  } catch (error) {
    console.error('Error fetching frames by player:', error);
    return [];
  }
};

// Add a new method to fetch frames for multiple players efficiently
export const getFramesByPlayers = async (playerIds: string[]): Promise<Record<string, Frame[]>> => {
  if (!playerIds.length) return {};
  
  try {
    // Firebase limitation: 'in' queries are limited to 10 values
    // So we need to chunk our requests if we have more than 10 playerIds
    const chunkSize = 10;
    const chunks: string[][] = [];
    
    for (let i = 0; i < playerIds.length; i += chunkSize) {
      const chunk = playerIds.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    // Fetch home frames
    const homeFramePromises = chunks.map(chunk => 
      getDocs(query(collection(db, 'frames'), where('homePlayerId', 'in', chunk)))
    );
    
    // Fetch away frames
    const awayFramePromises = chunks.map(chunk => 
      getDocs(query(collection(db, 'frames'), where('awayPlayerId', 'in', chunk)))
    );
    
    // Wait for all queries to complete
    const [homeFramesResults, awayFramesResults] = await Promise.all([
      Promise.all(homeFramePromises),
      Promise.all(awayFramePromises)
    ]);
    
    // Organize frames by player
    const framesByPlayer: Record<string, Frame[]> = {};
    
    // Initialize arrays for each player
    playerIds.forEach(id => {
      framesByPlayer[id] = [];
    });
    
    // Process home frames
    homeFramesResults.forEach(snapshot => {
      snapshot.forEach(doc => {
        const frame = { id: doc.id, ...(doc.data() as Frame) };
        if (framesByPlayer[frame.homePlayerId]) {
          framesByPlayer[frame.homePlayerId].push(frame);
        }
      });
    });
    
    // Process away frames
    awayFramesResults.forEach(snapshot => {
      snapshot.forEach(doc => {
        const frame = { id: doc.id, ...(doc.data() as Frame) };
        if (framesByPlayer[frame.awayPlayerId]) {
          framesByPlayer[frame.awayPlayerId].push(frame);
        }
      });
    });
    
    return framesByPlayer;
  } catch (error) {
    console.error('Error fetching frames by players:', error);
    return {};
  }
};

export const assignTeamCaptain = async (teamId: string, userId: string, seasonId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Get the player record for this user
  const players = await getCollectionDocs<Player>('players', [where('userId', '==', userId)]);
  if (!players.length) {
    throw new Error('No player record found for this user');
  }
  const player = players[0];

  // Update the team's captainUserId
  const teamRef = doc(db, 'teams', teamId);
  batch.update(teamRef, { captainUserId: userId });

  // Update or create the team_player record
  const teamPlayersQuery = query(
    collection(db, 'team_players'),
    where('teamId', '==', teamId),
    where('playerId', '==', player.id),
    where('seasonId', '==', seasonId)
  );
  
  const teamPlayerDocs = await getDocs(teamPlayersQuery);
  
  if (teamPlayerDocs.empty) {
    // Create new team_player record
    const teamPlayerRef = doc(collection(db, 'team_players'));
    batch.set(teamPlayerRef, {
      teamId,
      playerId: player.id,
      seasonId,
      joinDate: serverTimestamp(),
      role: 'captain',
      isActive: true
    });
  } else {
    // Update existing team_player record
    batch.update(teamPlayerDocs.docs[0].ref, { role: 'captain' });
  }

  await batch.commit();
};

export const removeTeamCaptain = async (teamId: string, userId: string, seasonId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Get the player record for this user
  const players = await getCollectionDocs<Player>('players', [where('userId', '==', userId)]);
  if (!players.length) {
    throw new Error('No player record found for this user');
  }
  const player = players[0];

  // Remove captain from team
  const teamRef = doc(db, 'teams', teamId);
  batch.update(teamRef, { captainUserId: '' });

  // Update team_player record
  const teamPlayersQuery = query(
    collection(db, 'team_players'),
    where('teamId', '==', teamId),
    where('playerId', '==', player.id),
    where('seasonId', '==', seasonId)
  );
  
  const teamPlayerDocs = await getDocs(teamPlayersQuery);
  
  if (!teamPlayerDocs.empty) {
    // Update the role to player
    batch.update(teamPlayerDocs.docs[0].ref, { role: 'player' });
  }

  await batch.commit();
};

export const isUserTeamCaptain = async (userId: string, teamId: string): Promise<boolean> => {
  const team = await getTeam(teamId);
  return team?.captainUserId === userId;
};