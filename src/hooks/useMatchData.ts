// src/hooks/useMatchData.ts
import { useState, useEffect } from 'react';
import { onSnapshot, doc, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  getMatch,
  getTeam,
  getVenue,
  getPlayersForTeam,
  getTeamByPlayerId,
  getCurrentSeason,
  Match,
  Team,
  Venue,
  Player,
  isUserTeamCaptain,
  getTeamPlayersForSeason // Import this
} from '../services/databaseService';
import type { TeamPlayer } from '../services/databaseService'; // Import TeamPlayer type
import { calculateMatchScore } from '../utils/matchUtils';

/**
 * Custom hook to load and manage match data
 */
export const useMatchData = (matchId: string | undefined, user: any, isAdmin: boolean) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeRound, setActiveRound] = useState<number>(1);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);
  // Add state for captain IDs
  const [homeCaptainUserId, setHomeCaptainUserId] = useState<string | null>(null);
  const [awayCaptainUserId, setAwayCaptainUserId] = useState<string | null>(null);
  
  // Computed properties based on the state
  const isUserHomeTeamCaptain = userTeam?.id === match?.homeTeamId;
  const isUserAwayTeamCaptain = userTeam?.id === match?.awayTeamId;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let safetyTimeout: NodeJS.Timeout | undefined;
    
    const fetchMatchData = async () => {
      if (!matchId || !user) return;

      try {
        setLoading(true);
        setError('');
        
        // Safety timeout to prevent infinite loading
        safetyTimeout = setTimeout(() => {
          console.log('Safety timeout triggered: forcing loading state to false');
          setLoading(false);
        }, 5000); // 5 seconds timeout
        
        // Initial fetch
        const initialMatchData = await getMatch(matchId);
        if (!initialMatchData) {
          setError('Match not found');
          clearTimeout(safetyTimeout);
          setLoading(false);
          return;
        }

        // Set up a real-time listener for match changes
        const matchRef = doc(db, 'matches', matchId);
        unsubscribe = onSnapshot(matchRef, (docSnapshot: DocumentSnapshot) => {
          if (docSnapshot.exists()) {
            const matchData = { 
              id: docSnapshot.id, 
              ...docSnapshot.data() 
            } as Match;
            
            // Always update local state with Firestore data
            setMatch(matchData);
            console.log('Firestore listener received match.frames:', matchData.frames);

            // Prevent infinite updates by comparing current round
            if (matchData.currentRound !== match?.currentRound) {
              console.log('Real-time match update - current round changed:', matchData.currentRound);
              // Set the active round - IMPORTANT! This ensures the UI updates
              if (matchData.currentRound) {
                console.log('Updating activeRound to', matchData.currentRound);
                setActiveRound(matchData.currentRound);
              }
              // Set completed rounds
              const completed: number[] = [];
              for (let i = 0; i < (matchData.currentRound || 1) - 1; i++) {
                completed.push(i);
              }
              setCompletedRounds(completed);
            }
            // Ensure loading is set to false after processing the data
            setLoading(false);
          } else {
            setError('Match not found');
            setLoading(false);
          }
        }, (error: Error) => {
          console.error('Error listening to match updates:', error);
          setError(`Error listening to match updates: ${error.message}`);
          setLoading(false);
        });

        // Load the home and away teams
        const [homeTeamData, awayTeamData, venueData] = await Promise.all([
          getTeam(initialMatchData.homeTeamId),
          getTeam(initialMatchData.awayTeamId),
          initialMatchData.venueId ? getVenue(initialMatchData.venueId) : null,
        ]);

        // Find which team the user is captain of using the new service function
        const [isHomeCap, isAwayCap] = await Promise.all([
          isUserTeamCaptain(user.uid, initialMatchData.homeTeamId, initialMatchData.seasonId),
          isUserTeamCaptain(user.uid, initialMatchData.awayTeamId, initialMatchData.seasonId)
        ]);

        // *** ADD LOGGING HERE ***
        console.log('useMatchData Captaincy Check:', {
          userId: user.uid,
          homeTeamId: initialMatchData.homeTeamId,
          awayTeamId: initialMatchData.awayTeamId,
          seasonId: initialMatchData.seasonId,
          isHomeCapResult: isHomeCap,
          isAwayCapResult: isAwayCap
        });
        // ************************

        let userTeamData = null;
        if (isHomeCap) {
          userTeamData = homeTeamData;
        } else if (isAwayCap) {
          userTeamData = awayTeamData;
        }
        
        // Fallback using getTeamByPlayerId remains the same, 
        // but the captain check within it might need updating if it existed.
        // Assuming getTeamByPlayerId is generic and doesn't check captaincy itself.
        if (!userTeamData) {
          const teamByPlayer = await getTeamByPlayerId(user.uid);
          if (teamByPlayer && (teamByPlayer.id === initialMatchData.homeTeamId || teamByPlayer.id === initialMatchData.awayTeamId)) {
            userTeamData = teamByPlayer.id === initialMatchData.homeTeamId ? homeTeamData : awayTeamData;
          }
        }

        // *** ADD LOGGING HERE ***
        console.log('useMatchData Determined User Team:', {
          userTeamDataId: userTeamData?.id || 'None'
        });
        // ************************

        // Set the user's team
        setUserTeam(userTeamData);

        // If user is not a captain of either team and not an admin, restrict access
        if (!userTeamData && !isAdmin) {
          setError('You are not authorized to view this match');
          return;
        }

        const currentSeason = await getCurrentSeason();
        if (!currentSeason) {
          setError('No active season found');
          return;
        }

        const [homePlayersData, awayPlayersData] = await Promise.all([
          getPlayersForTeam(initialMatchData.homeTeamId, currentSeason.id!),
          getPlayersForTeam(initialMatchData.awayTeamId, currentSeason.id!),
        ]);
        
        // Fetch team_players data to find captains
        const allTeamPlayers = await getTeamPlayersForSeason(currentSeason.id!); // Fetch all for the season
        
        const findCaptainUserId = (teamId: string): string | null => {
          const captainEntry = allTeamPlayers.find(
            tp => tp.teamId === teamId && tp.role === 'captain' && tp.isActive
          );
          if (!captainEntry) return null;
          // We need the full player list to map playerId to userId
          const teamPlayersList = teamId === homeTeamData?.id ? homePlayersData : awayPlayersData;
          const captainPlayer = teamPlayersList.find(p => p.id === captainEntry.playerId);
          return captainPlayer?.userId || null;
        };
        
        setHomeCaptainUserId(findCaptainUserId(initialMatchData.homeTeamId));
        setAwayCaptainUserId(findCaptainUserId(initialMatchData.awayTeamId));

        setHomeTeam(homeTeamData);
        setAwayTeam(awayTeamData);
        setVenue(venueData);
        setHomePlayers(homePlayersData);
        setAwayPlayers(awayPlayersData);
        
        // Debug log to check captaincy ID types and values
        console.log('Captaincy check:', {
          userUid: user?.uid,
          userEmail: user?.email,
          homeTeamCaptainUserId: homeTeamData?.captainUserId,
          awayTeamCaptainUserId: awayTeamData?.captainUserId,
          user
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Error loading match data:', err);
        setError(err.message || 'Failed to load match data');
        setLoading(false);
      }
    };

    fetchMatchData();
    
    // Clean up the subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  }, [matchId, user, isAdmin]);

  // Update activeRound and completedRounds based on match status
  useEffect(() => {
    if (!match) return;
    
    // Set active round from match data
    if (match.currentRound) {
      console.log(`Setting active round to ${match.currentRound} from match data`);
      setActiveRound(match.currentRound);
    } else {
      // Default to round 1 for new matches
      console.log('No current round in match data, defaulting to round 1');
      setActiveRound(1);
    }
    
    // Calculate completed rounds based on roundLockedStatus
    const completed: number[] = [];
    if (match.roundLockedStatus) {
      // Check rounds 0 to 3 (corresponding to rounds 1 to 4)
      for (let roundIndex = 0; roundIndex < 4; roundIndex++) {
        if (match.roundLockedStatus[roundIndex]) {
          completed.push(roundIndex + 1); // Store 1-indexed round number
        }
      }
    }
    setCompletedRounds(completed);
    console.log('Completed rounds (from locked status):', completed);
    
  }, [match]);

  // Get current match score
  const getMatchScore = () => {
    if (!match) return { home: 0, away: 0 };
    
    // We now use the embedded match.frames array
    return calculateMatchScore(match); 
  };

  return {
    match, setMatch,
    homeTeam, awayTeam, venue,
    homePlayers, awayPlayers,
    homeCaptainUserId, // Return captain IDs
    awayCaptainUserId, // Return captain IDs
    userTeam,
    isUserHomeTeamCaptain,
    isUserAwayTeamCaptain,
    loading, setLoading,
    error, setError,
    activeRound, setActiveRound,
    completedRounds, setCompletedRounds,
    getMatchScore
  };
};