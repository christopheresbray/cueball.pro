import { 
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp, writeBatch, DocumentReference, QuerySnapshot,
  DocumentData, Query, DocumentSnapshot, WithFieldValue, limit, orderBy, onSnapshot, QueryConstraint, setDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Match, Frame, Player, Team, MatchFormat, MatchState, PreMatchState, AuditEntry, FrameState } from '../types/match';
import { initializeApp } from 'firebase/app';
import { indexToHomePosition, indexToAwayPosition } from '../utils/positionUtils';

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
  queryConstraints?: QueryConstraint[]
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

  // console.warn(`Found duplicate team_players entries:`, 
  //   duplicates.map(d => `Player ${d.playerId} appears ${d.count} times`));
  
  // Deduplicate player IDs
  const uniquePlayerIds = [...new Set(teamPlayers.map(tp => tp.playerId))];
  if (!uniquePlayerIds.length) return [];

  // console.log(`Found ${teamPlayers.length} team_player entries, ${uniquePlayerIds.length} unique players`);

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
  // console.warn(`Could not find ${missingPlayerIds.length} players:`, missingPlayerIds);

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
  
  // console.log(`DEBUG - getPlayersForSeason: Found ${playerIds.length} unique players from team_players`);
  
  if (!playerIds.length) return [];

  // Get all teams for this season
  const teams = await getTeams(seasonId);
  const teamsMap = new Map(teams.map(team => [team.id, team]));
  
  // console.log(`DEBUG - getPlayersForSeason: Retrieved ${teams.length} teams for the season`);

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
    
    // console.log(`DEBUG - getPlayersForSeason: Batch ${i/batchSize + 1}: Retrieved ${batchPlayers.length} of ${batchIds.length} players`);
    
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
        // console.log(`DEBUG - Player ${player.firstName} ${player.lastName} (${player.id}) has no valid team`);
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
    // console.log(`DEBUG - ${playersWithNoTeam.length} players have no team name: ${playersWithNoTeam.join(', ')}`);
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

// Function to delete ALL matches in a season (including in-progress and completed ones)
export const deleteAllMatchesInSeason = async (seasonId: string): Promise<number> => {
  try {
    const matches = await getCollectionDocs<Match>('matches', [
      where('seasonId', '==', seasonId)
    ]);
    
    const batch = writeBatch(db);
    matches.forEach(match => {
      batch.delete(doc(db, 'matches', match.id!));
    });
    
    await batch.commit();
    console.log(`Deleted ${matches.length} matches from season ${seasonId}`);
    return matches.length;
  } catch (error) {
    console.error('Error deleting all matches in season:', error);
    throw error;
  }
};

// PERFORMANCE OPTIMIZATION: Get matches for a specific team efficiently
export const getMatchesForTeam = async (teamId: string, seasonId: string): Promise<Match[]> => {
  try {
    // Get matches where team is home team OR away team
    const [homeMatches, awayMatches] = await Promise.all([
      getCollectionDocs<Match>('matches', [
        where('seasonId', '==', seasonId),
        where('homeTeamId', '==', teamId)
      ]),
      getCollectionDocs<Match>('matches', [
        where('seasonId', '==', seasonId),
        where('awayTeamId', '==', teamId)
      ])
    ]);
    
    // Combine and deduplicate matches
    const allMatches = [...homeMatches, ...awayMatches];
    const uniqueMatches = Array.from(
      new Map(allMatches.map(match => [match.id, match])).values()
    );
    
    // Sort by date (most recent first)
    return uniqueMatches.sort((a, b) => {
      const dateA = a.scheduledDate?.toDate?.() || new Date(0);
      const dateB = b.scheduledDate?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Error getting matches for team:', error);
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



// Add a function to delete all frames for a match
export const deleteFramesForMatch = async (matchId: string): Promise<number> => {
  try {
    // Query for all frames for this match
    const framesQuery = query(collection(db, 'frames'), where('matchId', '==', matchId));
    const framesSnapshot = await getDocs(framesQuery);
    
    // If no frames found, return early
    if (framesSnapshot.empty) {
      // console.log(`No frames found for match ${matchId}`);
      return 0;
    }
    
    // Delete each frame document
    const batch = writeBatch(db);
    framesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch delete
    await batch.commit();
    // console.log(`Deleted ${framesSnapshot.size} frames for match ${matchId}`);
    
    return framesSnapshot.size;
  } catch (error) {
    console.error('Error deleting frames for match:', error);
    throw error;
  }
};



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

// PERFORMANCE OPTIMIZATION: Get all teams user is captain of in ONE query
export const getTeamsUserIsCaptainOf = async (userId: string, seasonId: string): Promise<Team[]> => {
  try {
    // First find the player associated with this userId
    const players = await getCollectionDocs<Player>('players', [where('userId', '==', userId)]);
    if (!players.length) {
      return []; // No player found for this user
    }
    const playerId = players[0].id;

    // Get all team_players entries where this player is captain in the given season
    const teamPlayerQuery = query(
      collection(db, 'team_players'),
      where('playerId', '==', playerId),
      where('seasonId', '==', seasonId),
      where('role', '==', 'captain'),
      where('isActive', '==', true)
    );
    
    const teamPlayersSnapshot = await getDocs(teamPlayerQuery);
    
    if (teamPlayersSnapshot.empty) {
      return []; // User is not captain of any teams
    }

    // Get all team IDs where user is captain
    const teamIds = teamPlayersSnapshot.docs.map(doc => doc.data().teamId);
    
    // Fetch all those teams in parallel
    const teamPromises = teamIds.map(teamId => getDocumentById<Team>('teams', teamId));
    const teams = await Promise.all(teamPromises);
    
    // Filter out any null results and return
    return teams.filter((team): team is Team & { id: string } => team !== null) as Team[];
  } catch (error) {
    console.error('Error getting teams user is captain of:', error);
    return [];
  }
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
      // console.log('No duplicate team_player entries found');
      return 0;
    }
    
    // console.log(`Found ${duplicates.length} sets of duplicate team_player entries`);
    
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
    // console.log(`Successfully deleted ${deletedCount} duplicate team_player entries`);
    
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up duplicate team_players:', error);
    throw error;
  }
};

/**
 * Initialize all frames for a match when it starts
 * Now supports configurable match formats instead of hardcoded 4x4
 * Frame structure is flat, with each frame uniquely identified by (round, homePosition, awayPosition, frameId)
 * homePosition and awayPosition are immutable after creation
 */
export const initializeMatchFrames = (
  match: Match,
  homePlayers: string[],  // Player IDs for fixed positions
  awayPlayers: string[],  // Player IDs for fixed positions  
  format?: MatchFormat    // Match format configuration
): Frame[] => {
  // Use format from match or default to 4x4
  const matchFormat = format || match.format || { 
    roundsPerMatch: 4, 
    framesPerRound: 4, 
    positionsPerTeam: 4 
  };
  
  const frames: Frame[] = [];
  if (homePlayers.length < matchFormat.positionsPerTeam || awayPlayers.length < matchFormat.positionsPerTeam) {
    throw new Error(`Both teams must have ${matchFormat.positionsPerTeam} players set to start the match`);
  }

  for (let round = 1; round <= matchFormat.roundsPerMatch; round++) {
    for (let frameNumber = 1; frameNumber <= matchFormat.framesPerRound; frameNumber++) {
      // homePosition: A-D, awayPosition: 1-4 (rotated each round)
      const homePositionIndex = (frameNumber - 1); // 0-3
      const homePosition = indexToHomePosition(homePositionIndex) ?? 'A'; // 'A'-'D'
      const awayPositionIndex = (frameNumber + round - 2) % matchFormat.positionsPerTeam; // 0-3
      const awayPosition = indexToAwayPosition(awayPositionIndex) ?? 1; // 1-4
      const currentHomePlayerId = homePlayers[homePositionIndex];
      const currentAwayPlayerId = awayPlayers[awayPositionIndex];
      // Generate a unique frameId (client-side)
      const frameId = `${match.id}-r${round}-h${homePosition}-a${awayPosition}`;
      const frame: Frame = {
        frameId, // Unique and immutable
        matchId: match.id!,
        seasonId: match.seasonId,
        round, // 1-N
        frameNumber, // 1-N within the round
        homePosition, // 'A'-'D' (immutable)
        awayPosition, // 1-4 (immutable)
        homePlayerId: currentHomePlayerId, // Set at lineup, updated only by substitution
        awayPlayerId: currentAwayPlayerId, // Set at lineup, updated only by substitution
        winnerPlayerId: null,
        isComplete: false,
        homeScore: 0,
        awayScore: 0,
        state: 'unplayed',
        breakerSide: frameNumber % 2 === 1 ? 'home' : 'away', // Alternate breakers
        // substitutionHistory: [], // Optional, can be added later
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
  
  // CENTRALIZED: All changes to match.frames must go through updateMatchFrames for auditability and control
  let performedBy = 'unknown';
  if (match && typeof (match as any).createdBy === 'string') {
    performedBy = (match as any).createdBy;
  }
  try {
    await updateMatchFrames(matchId, frames, {
      reason: 'start_match',
      performedBy,
      extraData: {
        status: 'in_progress',
        currentRound: 1
      }
    });
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

/**
 * CENTRALIZED: All changes to match.frames MUST go through this function.
 * This ensures validation, auditability, and a single point of control for frame updates.
 * Do NOT update match.frames directly via updateMatch elsewhere in the codebase.
 *
 * @param matchId - The match document ID
 * @param updatedFrames - The new frames array to set
 * @param options - Optional: reason, performedBy, extraData (merged into match doc)
 */
export const updateMatchFrames = async (
  matchId: string,
  updatedFrames: Frame[],
  options?: { reason?: string; performedBy?: string; extraData?: Partial<Match> }
): Promise<void> => {
  // Basic validation: must be 16 frames for a standard match
  if (!Array.isArray(updatedFrames) || updatedFrames.length !== 16) {
    console.error('[updateMatchFrames] Invalid frames array length:', updatedFrames.length);
    throw new Error('Frames array must contain exactly 16 frames.');
  }
  // Optionally: Add more validation here (e.g., unique frameIds, valid playerIds, etc.)

  // Logging for audit
  console.log('[updateMatchFrames] Updating frames for match', matchId, {
    reason: options?.reason,
    performedBy: options?.performedBy,
    frameIds: updatedFrames.map(f => f.frameId),
  });

  // Prepare update data
  const updateData: Partial<Match> = {
    frames: updatedFrames,
    ...(options?.extraData || {})
  };

  // Optionally: Add audit trail to match document (not implemented here)

  await updateMatch(matchId, updateData);
};

// ============================================================================
// NEW UTILITY FUNCTIONS AND SERVICES
// ============================================================================

/**
 * Generate position arrays for teams based on format
 */
export const generatePositions = (count: number) => ({
  home: Array.from({ length: count }, (_, i) => indexToHomePosition(i) ?? 'A'), // A, B, C, D...
  away: Array.from({ length: count }, (_, i) => indexToAwayPosition(i) ?? 1) // 1, 2, 3, 4...
});

/**
 * Create default match format
 */
export const createDefaultMatchFormat = (): MatchFormat => ({
  roundsPerMatch: 4,
  framesPerRound: 4,
  positionsPerTeam: 4,
  name: "4v4 Standard"
});

/**
 * PRE-MATCH STATE MANAGEMENT
 */

/**
 * Update pre-match state for roster confirmation and planning
 */
export const updatePreMatchState = async (
  matchId: string, 
  preMatchState: Partial<PreMatchState>,
  options?: { reason?: string; performedBy?: string }
): Promise<void> => {
  console.log('[updatePreMatchState] Updating pre-match state for match', matchId, {
    reason: options?.reason,
    performedBy: options?.performedBy,
    updates: preMatchState
  });

  // Get current match to merge with existing preMatchState
  const match = await getMatch(matchId);
  const currentPreMatch = match?.preMatchState || {
    homeRosterConfirmed: false,
    awayRosterConfirmed: false,
    homeAvailablePlayers: [],
    awayAvailablePlayers: []
  };

  const updatedPreMatchState: PreMatchState = {
    ...currentPreMatch,
    ...preMatchState
  };

  const updateData: Partial<Match> = {
    preMatchState: updatedPreMatchState,
    state: 'pre-match'
  };

  await updateMatch(matchId, updateData);
};

/**
 * Confirm team roster for pre-match
 */
export const confirmTeamRoster = async (
  matchId: string,
  team: 'home' | 'away',
  confirmedPlayers: string[],
  performedBy: string
): Promise<void> => {
  const match = await getMatch(matchId);
  if (!match) throw new Error('Match not found');

  const currentPreMatch = match.preMatchState || {
    homeRosterConfirmed: false,
    awayRosterConfirmed: false,
    homeAvailablePlayers: [],
    awayAvailablePlayers: []
  };

  const updatedPreMatch: PreMatchState = {
    ...currentPreMatch,
    [`${team}RosterConfirmed`]: true,
    [`${team}AvailablePlayers`]: confirmedPlayers
  };

  await updatePreMatchState(matchId, updatedPreMatch, {
    reason: `${team}_roster_confirmed`,
    performedBy
  });
};

/**
 * SUB-COLLECTION SUPPORT
 */

/**
 * Create a frame in the frames sub-collection
 */
export const createFrame = async (matchId: string, frame: Frame): Promise<string> => {
  const frameRef = doc(collection(db, 'matches', matchId, 'frames'));
  await setDoc(frameRef, frame);
  return frameRef.id;
};

/**
 * Get all frames for a match from sub-collection
 */
export const getMatchFrames = async (matchId: string): Promise<Frame[]> => {
  const framesRef = collection(db, 'matches', matchId, 'frames');
  const snapshot = await getDocs(framesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Frame));
};

/**
 * Update a specific frame in sub-collection
 */
export const updateFrame = async (
  matchId: string, 
  frameId: string, 
  updates: Partial<Frame>
): Promise<void> => {
  const frameRef = doc(db, 'matches', matchId, 'frames', frameId);
  await updateDoc(frameRef, updates);
};

/**
 * AUDIT TRAIL SYSTEM
 */

/**
 * Add audit entry to match
 */
export const addAuditEntry = async (
  matchId: string,
  auditEntry: Omit<AuditEntry, 'id' | 'timestamp'>
): Promise<string> => {
  const auditRef = doc(collection(db, 'matches', matchId, 'audit'));
  const entry: AuditEntry = {
    ...auditEntry,
    timestamp: serverTimestamp() as Timestamp
  };
  await setDoc(auditRef, entry);
  return auditRef.id;
};

/**
 * Get audit trail for a match
 */
export const getMatchAuditTrail = async (matchId: string): Promise<AuditEntry[]> => {
  const auditRef = collection(db, 'matches', matchId, 'audit');
  const q = query(auditRef, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEntry));
};

/**
 * Update frame with audit trail
 */
export const updateFrameWithAudit = async (
  matchId: string,
  frameId: string,
  updates: Partial<Frame>,
  userId: string,
  reason?: string
): Promise<void> => {
  const batch = writeBatch(db);
  
  // Update frame
  const frameRef = doc(db, 'matches', matchId, 'frames', frameId);
  batch.update(frameRef, {
    ...updates,
    lastEditedAt: serverTimestamp(),
    lastEditedBy: userId
  });
  
  // Add audit entry
  const auditRef = doc(collection(db, 'matches', matchId, 'audit'));
  batch.set(auditRef, {
    timestamp: serverTimestamp(),
    userId,
    action: 'frame_update',
    changes: updates,
    reason: reason || 'frame_update'
  });
  
  await batch.commit();
};

/**
 * ROUND STATE MANAGEMENT
 */

/**
 * Update round state in sub-collection
 */
export const updateRoundState = async (
  matchId: string,
  roundNumber: number,
  state: 'upcoming' | 'active' | 'completed' | 'locked'
): Promise<void> => {
  const roundRef = doc(db, 'matches', matchId, 'rounds', `round_${roundNumber}`);
  await setDoc(roundRef, { 
    round: roundNumber, 
    state, 
    updatedAt: serverTimestamp() 
  }, { merge: true });
};

/**
 * MATCH STATE TRANSITIONS
 */

/**
 * Transition match to ready state when both rosters are confirmed
 */
export const transitionMatchToReady = async (matchId: string): Promise<void> => {
  const match = await getMatch(matchId);
  if (!match?.preMatchState) return;

  const { homeRosterConfirmed, awayRosterConfirmed } = match.preMatchState;
  
  if (homeRosterConfirmed && awayRosterConfirmed) {
    await updateMatch(matchId, { state: 'ready' });
  }
};

/**
 * MIGRATION UTILITIES
 */

/**
 * Migrate existing match to new format
 */
export const migrateMatchToV2 = async (matchId: string): Promise<void> => {
  const match = await getMatch(matchId);
  if (!match) throw new Error('Match not found');
  
  console.log(`[migrateMatchToV2] Migrating match ${matchId} to V2 format`);

  // Infer format from existing frames or use default
  const format: MatchFormat = match.format || createDefaultMatchFormat();
  
  // Determine state from status
  const state: MatchState = 
    match.status === 'scheduled' ? 'pre-match' : 
    match.status === 'completed' ? 'completed' : 
    match.status === 'cancelled' ? 'cancelled' :
    'in-progress';
  
  // Create default pre-match state
  const preMatchState: PreMatchState = {
    homeRosterConfirmed: match.status !== 'scheduled',
    awayRosterConfirmed: match.status !== 'scheduled',
    homeAvailablePlayers: match.matchParticipants?.homeTeam || [],
    awayAvailablePlayers: match.matchParticipants?.awayTeam || []
  };

  // Update match document
  await updateMatch(matchId, {
    format,
    state,
    preMatchState,
    version: 2
  });
  
  // Migrate frames to sub-collection if they exist
  if (match.frames?.length) {
    const batch = writeBatch(db);
    match.frames.forEach(frame => {
      const frameRef = doc(collection(db, 'matches', matchId, 'frames'));
      
      // Convert old frame format to new format
      const migratedFrame: Frame = {
        ...frame,
        // Fix property name changes if needed
        homePosition: frame.homePosition || (frame as any).homePlayerPosition?.toString() || 'A',
        awayPosition: frame.awayPosition || (frame as any).awayPlayerPosition || 1,
        state: frame.isComplete ? 'locked' : 'unplayed',
        breakerSide: frame.breakerSide || (frame.frameNumber % 2 === 1 ? 'home' : 'away')
      };
      
      batch.set(frameRef, migratedFrame);
    });
    await batch.commit();
    
    // Clear frames array from main document after migration
    await updateMatch(matchId, { frames: [] });
  }

  console.log(`[migrateMatchToV2] Successfully migrated match ${matchId}`);
};

/**
 * CENTRALIZED: All changes to match.matchParticipants MUST go through this function.
 * This ensures validation, auditability, and a single point of control for participant updates.
 * Do NOT update match.matchParticipants directly via updateMatch elsewhere in the codebase.
 *
 * @param matchId - The match document ID
 * @param updatedParticipants - The new matchParticipants object to set (homeTeam, awayTeam arrays)
 * @param options - Optional: reason, performedBy, extraData (merged into match doc)
 */
export const updateMatchParticipants = async (
  matchId: string,
  updatedParticipants: { homeTeam: string[]; awayTeam: string[] },
  options?: { reason?: string; performedBy?: string; extraData?: Partial<Match> }
): Promise<void> => {
  // Fetch the match to check status
  const match = await getDocumentById<Match>('matches', matchId);
  if (!match) {
    throw new Error('Match not found');
  }
  if (match.status !== 'scheduled') {
    throw new Error('Cannot update matchParticipants after match has started');
  }
  // Optionally: Add more validation here (e.g., arrays, no duplicates, all players on team, etc.)

  // Logging for audit
  console.log('[updateMatchParticipants] Updating matchParticipants for match', matchId, {
    reason: options?.reason,
    performedBy: options?.performedBy,
    homeTeam: updatedParticipants.homeTeam,
    awayTeam: updatedParticipants.awayTeam,
  });

  // Prepare update data
  const updateData: Partial<Match> = {
    matchParticipants: updatedParticipants,
    ...(options?.extraData || {})
  };

  await updateMatch(matchId, updateData);
};