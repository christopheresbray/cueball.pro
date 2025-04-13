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
  Player
} from '../services/databaseService';
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
            
            // Prevent infinite updates by comparing current round
            if (matchData.currentRound !== match?.currentRound) {
              console.log('Real-time match update - current round changed:', matchData.currentRound);
              
              // Set match data
              setMatch(matchData);
              
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
            } else {
              // For other updates, just update the match data but not the activeRound
              // to prevent infinite loops
              console.log('Real-time match update - other changes');
              setMatch(matchData);
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

        // Find which team the user is captain of
        let userTeamData = null;
        if (homeTeamData && homeTeamData.captainUserId === user.uid) {
          userTeamData = homeTeamData;
        } else if (awayTeamData && awayTeamData.captainUserId === user.uid) {
          userTeamData = awayTeamData;
        }

        // If not found directly, try team_players
        if (!userTeamData) {
          const teamByPlayer = await getTeamByPlayerId(user.uid);
          if (teamByPlayer && (teamByPlayer.id === initialMatchData.homeTeamId || teamByPlayer.id === initialMatchData.awayTeamId)) {
            userTeamData = teamByPlayer.id === initialMatchData.homeTeamId ? homeTeamData : awayTeamData;
          }
        }

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

        setHomeTeam(homeTeamData);
        setAwayTeam(awayTeamData);
        setVenue(venueData);
        setHomePlayers(homePlayersData);
        setAwayPlayers(awayPlayersData);
        
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
    
    // Calculate completed rounds
    if (match.frameResults) {
      const completedRoundSet = new Set<number>();
      
      // Check each round (0-3) for completion
      for (let round = 0; round <= 3; round++) {
        const isComplete = Array.from({ length: 4 }).every((_, position) => {
          const frameId = `${round}-${position}`;
          return !!match.frameResults?.[frameId]?.winnerId;
        });
        
        if (isComplete) {
          completedRoundSet.add(round + 1); // Store 1-indexed round numbers
          console.log(`Round ${round + 1} is complete`);
        }
      }
      
      setCompletedRounds([...completedRoundSet]);
      console.log('Completed rounds:', [...completedRoundSet]);
    } else {
      setCompletedRounds([]);
      console.log('No completed rounds');
    }
  }, [match]);

  // Get current match score
  const getMatchScore = () => {
    if (!match) return { home: 0, away: 0 };
    
    console.log("getMatchScore called, current match frameResults:", match.frameResults);
    
    // Check if there are any frames for round 2 (1-indexed in UI, 0-indexed in code)
    if (match.frameResults) {
      let round2Frames = 0;
      let round2HomeScore = 0;
      let round2AwayScore = 0;
      
      Object.entries(match.frameResults).forEach(([frameId, result]) => {
        if (frameId.startsWith('1-')) { // Round 2 (index 1)
          round2Frames++;
          if (result.homeScore) round2HomeScore += result.homeScore;
          if (result.awayScore) round2AwayScore += result.awayScore;
        }
      });
      
      console.log(`Round 2 has ${round2Frames} frames, Home: ${round2HomeScore}, Away: ${round2AwayScore}`);
    }
    
    return calculateMatchScore(match);
  };

  return {
    match, setMatch,
    homeTeam, awayTeam, venue,
    homePlayers, awayPlayers,
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