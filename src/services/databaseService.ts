import { 
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp, writeBatch, DocumentReference, QuerySnapshot,
  DocumentData, Query, DocumentSnapshot, WithFieldValue, limit, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Match, Frame, Player, Team } from '../types/match';

// Types
export type { Match, Frame, Player, Team };
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

export interface FrameResult {
  winnerPlayerId: string;
  homeScore?: number;
  awayScore?: number;
}

// Helper functions
export const getDocumentById = async <T extends DocumentData>(
  collectionName: string,
  docId: string
): Promise<(T & { id: string }) | null> => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...(docSnap.data() as T) } : null;
};

export const getCollectionDocs = async <T extends DocumentData>(
  collectionName: string,
  queryConstraints?: any[]
): Promise<(T & { id: string })[]> => {
  const collectionRef = collection(db, collectionName);
  const q = queryConstraints ? query(collectionRef, ...queryConstraints) : collectionRef;
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as T) }));
};

export const createDocument = async <T extends DocumentData>(
  collectionName: string,
  data: WithFieldValue<T>
): Promise<DocumentReference<DocumentData>> => {
  return await addDoc(collection(db, collectionName), data as DocumentData);
};

export const updateDocument = async <T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<WithFieldValue<T>>
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data as DocumentData);
};

export const deleteDocument = async (
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

// Export this interface
export interface TeamPlayer {
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
  // Get all team_player entries
  const teamPlayers = await getCollectionDocs<TeamPlayer>('team_players', [
    where('teamId', '==', teamId),
    where('seasonId', '==', seasonId)
  ]);
  
  // Log any duplicate entries in team_players
  const playerIdCounts = teamPlayers.reduce((acc, tp) => {
    acc[tp.playerId] = (acc[tp.playerId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const duplicates = Object.entries(playerIdCounts)
    .filter(([_, count]) => count > 1)
    .map(([playerId, count]) => ({ playerId, count }));

  if (duplicates.length > 0) {
    console.warn(`Found duplicate team_players entries:`, 
      duplicates.map(d => `Player ${d.playerId} appears ${d.count} times`));
  }
  
  // Deduplicate player IDs
  const uniquePlayerIds = [...new Set(teamPlayers.map(tp => tp.playerId))];
  if (!uniquePlayerIds.length) return [];

  console.log(`Found ${teamPlayers.length} team_player entries, ${uniquePlayerIds.length} unique players`);

  const players: Player[] = [];
  const batchSize = 10;

  // Fetch players in batches
  for (let i = 0; i < uniquePlayerIds.length; i += batchSize) {
    const batchIds = uniquePlayerIds.slice(i, i + batchSize);
    const batchPlayers = await getCollectionDocs<Player>('players', [
      where('__name__', 'in', batchIds)
    ]);
    players.push(...batchPlayers);
  }

  // Log if we couldn't find some players
  const foundPlayerIds = new Set(players.map(p => p.id));
  const missingPlayerIds = uniquePlayerIds.filter(id => !foundPlayerIds.has(id));
  if (missingPlayerIds.length > 0) {
    console.warn(`Could not find ${missingPlayerIds.length} players:`, missingPlayerIds);
  }

  return players;
};

export const getTeamByPlayerId = async (playerId: string) => {
  try {
    const teamsRef = collection(db, 'teams');
    const teamPlayersRef = collection(db, 'team_players');
    
    // First find the team_player document for this player
    const teamPlayerQuery = query(teamPlayersRef, where('playerId', '==', playerId));
    const teamPlayerSnapshot = await getDocs(teamPlayerQuery);
    
    if (teamPlayerSnapshot.empty) {
      return null;
    }
    
    // Get the teamId from the first team_player document
    const teamId = teamPlayerSnapshot.docs[0].data().teamId;
    
    // Now get the team document
    const teamDoc = await getDoc(doc(teamsRef, teamId));
    
    if (!teamDoc.exists()) {
      return null;
    }
    
    return {
      id: teamDoc.id,
      ...teamDoc.data()
    };
  } catch (error) {
    console.error('Error getting team by player ID:', error);
    throw error;
  }
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

  // Use a transaction to ensure atomicity
  const batch = writeBatch(db);

  try {
    // Find existing player by combining email and name checks
    let playerDoc;
    const queries = [];
    
    if (playerData.email) {
      queries.push(where('email', '==', playerData.email));
    }
    
    if (playerData.firstName && playerData.lastName) {
      queries.push(
        where('firstName', '==', playerData.firstName),
        where('lastName', '==', playerData.lastName)
      );
    }
    
    if (queries.length > 0) {
      const existingPlayers = await getCollectionDocs<Player>('players', queries);
      if (existingPlayers.length > 0) {
        if (playerData.email) {
          const emailMatch = existingPlayers.find(p => p.email === playerData.email);
          if (emailMatch) {
            playerDoc = { id: emailMatch.id };
          }
        }
        if (!playerDoc) {
          playerDoc = { id: existingPlayers[0].id };
        }
      }
    }

    if (!playerDoc) {
      const newPlayerRef = doc(collection(db, 'players'));
      batch.set(newPlayerRef, {
        ...playerData,
        email: playerData.email || '',
        userId: playerData.userId || '',
        joinDate: serverTimestamp(),
        isActive: true,
      });
      playerDoc = { id: newPlayerRef.id };
    }

    // Check for existing team_player entries
    const teamPlayersQuery = query(
      collection(db, 'team_players'),
      where('teamId', '==', teamId),
      where('playerId', '==', playerDoc.id),
      where('seasonId', '==', seasonId)
    );
    
    const existingTeamPlayers = await getDocs(teamPlayersQuery);

    if (existingTeamPlayers.empty) {
      // Create new team_player entry
      const teamPlayerRef = doc(collection(db, 'team_players'));
      batch.set(teamPlayerRef, {
        teamId,
        playerId: playerDoc.id,
        seasonId,
        joinDate: serverTimestamp(),
        role,
        isActive: true,
      });
    } else if (existingTeamPlayers.size > 1) {
      // Clean up duplicate entries
      console.warn(`Found ${existingTeamPlayers.size} team_player entries for player ${playerDoc.id} in team ${teamId}. Cleaning up...`);
      
      const docs = existingTeamPlayers.docs
        .map(doc => ({
          ref: doc.ref,
          data: doc.data() as TeamPlayer,
          joinDate: doc.data().joinDate
        }))
        .sort((a, b) => a.joinDate.seconds - b.joinDate.seconds);
      
      // Keep oldest entry, delete the rest
      for (let i = 1; i < docs.length; i++) {
        batch.delete(docs[i].ref);
      }
      
      // Update role if needed
      if (role === 'captain') {
        batch.update(docs[0].ref, { role: 'captain' });
      }
    } else {
      // Single existing entry - update role if needed
      if (role === 'captain') {
        batch.update(existingTeamPlayers.docs[0].ref, { role: 'captain' });
      }
    }

    // Commit all changes atomically
    await batch.commit();
    return playerDoc.id;
  } catch (error) {
    console.error('Error in addPlayerToTeam:', error);
    throw error;
  }
};

export const createSeason = (season: Season) => createDocument('seasons', season);

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

/**
 * Add a new method to fetch frames directly by player ID
 * TODO: This function assumes a top-level 'frames' collection which doesn't exist.
 * Frames are stored within Match documents. This needs refactoring if used.
 */
/*
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
*/

// Add a function to delete all frames for a match
export const deleteFramesForMatch = async (matchId: string): Promise<number> => {
  try {
    // Query for all frames for this match
    const framesQuery = query(collection(db, 'frames'), where('matchId', '==', matchId));
    const framesSnapshot = await getDocs(framesQuery);
    
    // If no frames found, return early
    if (framesSnapshot.empty) {
      console.log(`No frames found for match ${matchId}`);
      return 0;
    }
    
    // Delete each frame document
    const batch = writeBatch(db);
    framesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch delete
    await batch.commit();
    console.log(`Deleted ${framesSnapshot.size} frames for match ${matchId}`);
    
    return framesSnapshot.size;
  } catch (error) {
    console.error('Error deleting frames for match:', error);
    throw error;
  }
};

/**
 * Add a new method to fetch frames for multiple players efficiently
 * TODO: This function assumes a top-level 'frames' collection which doesn't exist.
 * Frames are stored within Match documents. This needs refactoring if used.
 */
/*
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
*/

export const removeTeamCaptain = async (teamId: string, userId: string, seasonId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  // Get the player record for this user
  const players = await getCollectionDocs<Player>('players', [where('userId', '==', userId)]);
  if (!players.length) {
    throw new Error('No player record found for this user');
  }
  const player = players[0];

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

export const isUserTeamCaptain = async (userId: string, teamId: string, seasonId: string): Promise<boolean> => {
  // Find player associated with the userId
  const players = await getCollectionDocs<Player>('players', [where('userId', '==', userId)]);
  if (!players.length) {
    return false; // No player found for this user
  }
  const playerId = players[0].id;

  // Query team_players to check if this player is captain for the team in the given season
  const teamPlayerQuery = query(
    collection(db, 'team_players'),
    where('teamId', '==', teamId),
    where('playerId', '==', playerId),
    where('seasonId', '==', seasonId),
    where('role', '==', 'captain'),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(teamPlayerQuery);
  return !snapshot.empty; // Return true if a matching captain entry exists
};

// Add this new function to enable real-time listening for match document changes
export const onMatchSnapshot = (matchId: string, callback: (match: Match | null) => void) => {
  const matchRef = doc(db, 'matches', matchId);
  
  return onSnapshot(matchRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const matchData = { 
        id: docSnapshot.id, 
        ...docSnapshot.data() 
      } as Match;
      callback(matchData);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to match updates:', error);
    callback(null);
  });
};

export const cleanupDuplicateTeamPlayers = async (teamId?: string, seasonId?: string): Promise<number> => {
  try {
    // Build query constraints based on provided filters
    const constraints = [];
    if (teamId) constraints.push(where('teamId', '==', teamId));
    if (seasonId) constraints.push(where('seasonId', '==', seasonId));
    
    // Get all team_player entries matching the constraints
    const teamPlayers = await getCollectionDocs<TeamPlayer>('team_players', constraints);
    
    // Create a map to track unique combinations and find duplicates
    const uniqueKeyMap = new Map<string, { doc: TeamPlayer & { id: string }, count: number }>();
    
    teamPlayers.forEach(tp => {
      const key = `${tp.teamId}-${tp.playerId}-${tp.seasonId}`;
      if (!uniqueKeyMap.has(key)) {
        uniqueKeyMap.set(key, { doc: tp, count: 1 });
      } else {
        uniqueKeyMap.get(key)!.count++;
      }
    });
    
    // Find entries with duplicates
    const duplicates = Array.from(uniqueKeyMap.entries())
      .filter(([_, value]) => value.count > 1)
      .map(([key, value]) => ({
        key,
        originalDoc: value.doc,
        count: value.count
      }));
    
    if (duplicates.length === 0) {
      console.log('No duplicate team_player entries found');
      return 0;
    }
    
    console.log(`Found ${duplicates.length} sets of duplicate team_player entries`);
    
    // Delete duplicate entries, keeping only the oldest entry for each unique combination
    const batch = writeBatch(db);
    let deletedCount = 0;
    
    for (const { key, originalDoc } of duplicates) {
      // Get all documents for this combination
      const dupeQuery = query(
        collection(db, 'team_players'),
        where('teamId', '==', originalDoc.teamId),
        where('playerId', '==', originalDoc.playerId),
        where('seasonId', '==', originalDoc.seasonId)
      );
      
      const dupeSnapshot = await getDocs(dupeQuery);
      
      // Sort by joinDate to keep the oldest
      const docs = dupeSnapshot.docs
        .map(doc => ({
          id: doc.id,
          data: doc.data() as TeamPlayer,
          joinDate: doc.data().joinDate
        }))
        .sort((a, b) => a.joinDate.seconds - b.joinDate.seconds);
      
      // Keep the first (oldest) document, delete the rest
      for (let i = 1; i < docs.length; i++) {
        batch.delete(doc(db, 'team_players', docs[i].id));
        deletedCount++;
      }
    }
    
    // Commit the batch delete
    await batch.commit();
    console.log(`Successfully deleted ${deletedCount} duplicate team_player entries`);
    
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up duplicate team_players:', error);
    throw error;
  }
};

/**
 * Initialize all frames for a match when it starts
 * This creates 16 frames (4 rounds x 4 frames) with the initial player assignments
 */
export const initializeMatchFrames = (
  match: Match,
  homePlayers: string[],  // Player IDs for fixed positions 1, 2, 3, 4
  awayPlayers: string[]   // Player IDs for fixed positions A, B, C, D
): Frame[] => {
  // Creates all 16 frames for the match at initialization.
  // IMPORTANT: homePlayerPosition (1-4) and awayPlayerPosition (A-D) represent the
  // *fixed* position identifier assigned to the player for the entire match (unless substituted).
  // These identifiers DO NOT change based on round rotation; only the player IDs assigned to the matchup change.
  // This structure ensures the UI can always display the correct fixed position next to the player's name.
  const frames: Frame[] = [];
  if (homePlayers.length < 4 || awayPlayers.length < 4) {
    throw new Error('Both teams must have 4 players set to start the match');
  }

  for (let round = 1; round <= 4; round++) {
    for (let homePositionIndex = 0; homePositionIndex < 4; homePositionIndex++) {
      // Determine the away player's *fixed position index* (0-3) based on rotation for this matchup
      const awayPositionIndex = (homePositionIndex + round - 1) % 4;

      // Get the actual Player IDs for this frame's matchup
      const currentHomePlayerId = homePlayers[homePositionIndex];
      const currentAwayPlayerId = awayPlayers[awayPositionIndex];

      // Get the FIXED positions for these players
      const fixedHomePosition = homePositionIndex + 1; // 1, 2, 3, 4
      const fixedAwayPosition = String.fromCharCode(65 + awayPositionIndex); // A, B, C, D

      const frame: Frame = {
        matchId: match.id!,
        seasonId: match.seasonId,
        round,
        homePlayerPosition: fixedHomePosition, // Store the player's fixed position (1-4)
        homePlayerId: currentHomePlayerId,
        awayPlayerPosition: fixedAwayPosition, // Store the player's fixed position (A-D)
        awayPlayerId: currentAwayPlayerId,
        winnerPlayerId: null,
        isComplete: false,
        // Ensure scores are initialized
        homeScore: 0,
        awayScore: 0,
      };
      frames.push(frame);
    }
  }
  return frames;
};

/**
 * Start a match by initializing all frames with the initial player assignments
 */
export const startMatch = async (
  matchId: string, 
  homePlayers: string[], // Array of 4 player IDs in positions 1-4
  awayPlayers: string[]  // Array of 4 player IDs in positions A-D
): Promise<void> => {
  console.log(`startMatch called for matchId: ${matchId}`);
  const match = await getDocumentById<Match>('matches', matchId);
  if (!match) {
    console.error(`startMatch: Match ${matchId} not found`);
    throw new Error('Match not found');
  }

  // Initialize frames with the provided player assignments
  console.log('startMatch: Initializing frames with home:', homePlayers, 'away:', awayPlayers);
  const frames = initializeMatchFrames(match, homePlayers, awayPlayers);
  console.log(`startMatch: Initialized ${frames.length} frames:`, frames);
  
  // Prepare update data
  const updateData = {
    frames, // Include the generated frames
    status: 'in_progress' as const,
    currentRound: 1
  };
  console.log('startMatch: Updating match with:', updateData);
  
  try {
    await updateMatch(matchId, updateData);
    console.log(`startMatch: Successfully updated match ${matchId} with frames and status.`);
  } catch (error) {
    console.error(`startMatch: Error updating match ${matchId}:`, error);
    throw error; // Re-throw the error after logging
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

  // Update team_player record
  const teamPlayersQuery = query(
    collection(db, 'team_players'),
    where('teamId', '==', teamId),
    where('playerId', '==', player.id),
    where('seasonId', '==', seasonId)
  );
  
  const teamPlayerDocs = await getDocs(teamPlayersQuery);
  
  if (!teamPlayerDocs.empty) {
    // Update the role to captain
    batch.update(teamPlayerDocs.docs[0].ref, { role: 'captain' });
  }

  await batch.commit();
};