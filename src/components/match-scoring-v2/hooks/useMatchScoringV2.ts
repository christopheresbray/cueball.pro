// src/components/match-scoring-v2/hooks/useMatchScoringV2.ts

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { 
  MatchScoringState, 
  MatchScoringActions, 
  MatchPhase,
  PreMatchState,
  FrameWithPlayers,
  Round
} from '../../../types/matchV2';
import { Match, MatchFormat } from '../../../types/match';
import { 
  getMatch, 
  createDefaultMatchFormat,
  updatePreMatchState,
  updateMatch
} from '../../../services/databaseService';
import { useAuth } from '../../../hooks/useAuth';

/**
 * Main state management hook for Match Scoring V2
 */
export const useMatchScoringV2 = (matchId: string) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [state, setState] = useState<MatchScoringState>({
    match: null,
    matchPhase: 'pre-match',
    rounds: [],
    frames: [],
    players: new Map(),
    preMatch: {
      home: {
        rosterConfirmed: false,
        availablePlayers: [],
        round1Assignments: new Map(),
        lineupLocked: false
      },
      away: {
        rosterConfirmed: false,
        availablePlayers: [],
        round1Assignments: new Map(),
        lineupLocked: false
      },
      canStartMatch: false
    },
    currentRoundIndex: 0,
    loading: false,
    error: null,
    scoringFrame: null,
    editingFrame: null,
    substitutionFrame: null,
    isHomeCaptain: false,
    isAwayCaptain: false,
    canEdit: false
  });

  // Determine match phase from match data
  const determineMatchPhase = useCallback((match: Match): MatchPhase => {
    if (!match) return 'pre-match';
    
    // Use V2 state if available
    if (match.state) {
      switch (match.state) {
        case 'pre-match': return 'pre-match';
        case 'ready': return 'ready';
        case 'in-progress': return 'in-progress';
        case 'completed': return 'completed';
        default: return 'pre-match';
      }
    }
    
    // Fallback to legacy status
    switch (match.status) {
      case 'scheduled': return 'pre-match';
      case 'in_progress': return 'in-progress';
      case 'completed': return 'completed';
      default: return 'pre-match';
    }
  }, []);

  // Initialize or update state from match data
  const updateStateFromMatch = useCallback((match: Match) => {
    const matchPhase = determineMatchPhase(match);
    const format = match.format || createDefaultMatchFormat();
    
    // Create basic rounds structure
    const rounds: Round[] = [];
    for (let i = 1; i <= format.roundsPerMatch; i++) {
      rounds.push({
        roundNumber: i,
        roundState: i === 1 ? 'current-unresulted' : 'future',
        frames: [],
        homeTeamLocked: false,
        awayTeamLocked: false
      });
    }

    // Generate frame structure  
    const frames: FrameWithPlayers[] = [];
    
    // Generate complete frame structure for all rounds
    for (let round = 1; round <= format.roundsPerMatch; round++) {
      for (let frameNum = 1; frameNum <= format.framesPerRound; frameNum++) {
        // Calculate position rotation (A,B,C,D vs 1,2,3,4)
        const homePositionIndex = (frameNum - 1) % format.positionsPerTeam;
        const awayPositionIndex = (frameNum - 1 + round - 1) % format.positionsPerTeam;
        
        const homePosition = String.fromCharCode(65 + homePositionIndex); // A, B, C, D
        const awayPosition = awayPositionIndex + 1; // 1, 2, 3, 4
        
        const frameId = `${match.id}-R${round}-F${frameNum}`;
        
        // Check if this frame already exists in match data
        let existingFrame: any = null;
        if (match.frames) {
          const frameArray = Array.isArray(match.frames) ? match.frames : Object.values(match.frames) as any[];
          existingFrame = frameArray.find(f => 
            f.round === round && f.frameNumber === frameNum
          );
        }
        
        frames.push({
          frameId,
          matchId: match.id || matchId,
          round,
          frameNumber: frameNum,
          homePosition,
          awayPosition,
          homePlayerId: existingFrame?.homePlayerId || 'vacant',
          awayPlayerId: existingFrame?.awayPlayerId || 'vacant', 
          winnerPlayerId: existingFrame?.winnerPlayerId || null,
          homeScore: existingFrame?.homeScore || 0,
          awayScore: existingFrame?.awayScore || 0,
          isComplete: existingFrame?.isComplete || false,
          seasonId: match.seasonId,
          homePlayer: null, // Will be populated from player data
          awayPlayer: null, // Will be populated from player data
          isVacantFrame: false // Will be updated based on assignments
        });
      }
    }

    // Build pre-match state
    const preMatch: PreMatchState = {
      home: {
        rosterConfirmed: match.preMatchState?.homeRosterConfirmed || false,
        availablePlayers: match.preMatchState?.homeAvailablePlayers || [],
        round1Assignments: new Map(Object.entries(match.preMatchState?.homeRound1Assignments || {})),
        lineupLocked: match.preMatchState?.homeLineupLocked || false
      },
      away: {
        rosterConfirmed: match.preMatchState?.awayRosterConfirmed || false,
        availablePlayers: match.preMatchState?.awayAvailablePlayers || [],
        round1Assignments: new Map(Object.entries(match.preMatchState?.awayRound1Assignments || {})),
        lineupLocked: match.preMatchState?.awayLineupLocked || false
      },
      canStartMatch: false
    };

    // Apply lineup assignments to frames
    const updatedFrames = frames.map(frame => {
      let homePlayerId = frame.homePlayerId;
      let awayPlayerId = frame.awayPlayerId;
      
      // Apply player assignments for all rounds (with rotation)
      if (preMatch.home.round1Assignments.size > 0 || preMatch.away.round1Assignments.size > 0) {
        // For Round 1, positions match directly
        if (frame.round === 1) {
          const homeAssignment = preMatch.home.round1Assignments.get(frame.homePosition);
          const awayAssignment = preMatch.away.round1Assignments.get(String(frame.awayPosition)) || 
                                preMatch.away.round1Assignments.get(frame.awayPosition);
          
          if (homeAssignment && homeAssignment !== 'vacant') homePlayerId = homeAssignment;
          if (awayAssignment && awayAssignment !== 'vacant') awayPlayerId = awayAssignment;
        } else {
          // For future rounds, find the original Round 1 position for this frame's position
          // We need to reverse the rotation to find which Round 1 position corresponds to this frame's position
          
          // Calculate what Round 1 positions would create this frame's positions in this round
          const frameIndex = frame.frameNumber - 1; // 0-based
          const roundOffset = frame.round - 1; // 0-based round
          
          // Reverse calculation: what Round 1 position gives us this frame's position in this round?
          const homeOriginalIndex = frameIndex; // Home positions don't rotate
          const awayOriginalIndex = (frameIndex - roundOffset + format.positionsPerTeam) % format.positionsPerTeam;
          
          const homeOriginalPosition = String.fromCharCode(65 + homeOriginalIndex); // A, B, C, D
          const awayOriginalPosition = awayOriginalIndex + 1; // 1, 2, 3, 4
          
          // Get the player assigned to the original Round 1 position
          const homeAssignment = preMatch.home.round1Assignments.get(homeOriginalPosition);
          const awayAssignment = preMatch.away.round1Assignments.get(String(awayOriginalPosition)) || 
                                preMatch.away.round1Assignments.get(awayOriginalPosition);
          
          if (homeAssignment && homeAssignment !== 'vacant') homePlayerId = homeAssignment;
          if (awayAssignment && awayAssignment !== 'vacant') awayPlayerId = awayAssignment;
        }
      }
      
      return {
        ...frame,
        homePlayerId,
        awayPlayerId,
        isVacantFrame: homePlayerId === 'vacant' || awayPlayerId === 'vacant'
      };
    });

    // Check if both teams are ready
    preMatch.canStartMatch = 
      preMatch.home.rosterConfirmed && 
      preMatch.away.rosterConfirmed &&
      preMatch.home.lineupLocked &&
      preMatch.away.lineupLocked;

    // Load team data and determine captain status
    const loadTeamDataAndUpdateCaptainStatus = async () => {
      try {
        console.log('🔍 Loading team data for captain detection...');
        console.log('User ID:', user?.uid);
        console.log('Home Team ID:', match.homeTeamId);
        console.log('Away Team ID:', match.awayTeamId);

        // Import here to avoid circular dependency
        const { getTeam } = await import('../../../services/databaseService');
        
        const [homeTeam, awayTeam] = await Promise.all([
          getTeam(match.homeTeamId),
          getTeam(match.awayTeamId)
        ]);

        console.log('Home Team Captain:', homeTeam?.captainUserId);
        console.log('Away Team Captain:', awayTeam?.captainUserId);

        const isHomeCaptain = user?.uid === homeTeam?.captainUserId;
        const isAwayCaptain = user?.uid === awayTeam?.captainUserId;

        console.log('Captain Status:', { isHomeCaptain, isAwayCaptain });

        // Update state with captain information
        setState(prev => ({
          ...prev,
          match,
          matchPhase,
          rounds,
          frames: updatedFrames,
          preMatch,
          isHomeCaptain,
          isAwayCaptain,
          canEdit: isHomeCaptain || isAwayCaptain
        }));
      } catch (err) {
        console.error('Failed to load team data for captain detection:', err);
        // Fallback: update state without captain detection
        setState(prev => ({
          ...prev,
          match,
          matchPhase,
          rounds,
          frames: updatedFrames,
          preMatch,
          isHomeCaptain: false,
          isAwayCaptain: false,
          canEdit: false
        }));
      }
    };

    // Only load team data if we have a user
    if (user?.uid) {
      loadTeamDataAndUpdateCaptainStatus();
    } else {
      // No user, just update basic state
      setState(prev => ({
        ...prev,
        match,
        matchPhase,
        rounds,
        frames: updatedFrames,
        preMatch,
        isHomeCaptain: false,
        isAwayCaptain: false,
        canEdit: false
      }));
    }
  }, [determineMatchPhase, user]);

  // Subscribe to match changes
  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'matches', matchId),
      (snapshot) => {
        if (snapshot.exists()) {
          const matchData = { id: snapshot.id, ...snapshot.data() } as Match;
          updateStateFromMatch(matchData);
        } else {
          setError('Match not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Match subscription error:', error);
        setError('Failed to load match data');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [matchId, updateStateFromMatch]);

  // Actions
  const actions: MatchScoringActions = {
    // =======================================================================
    // ⚠️ TEMPORARY FOR TESTING: Home captain can manage both teams
    // This makes development/testing easier without multiple browser sessions
    // TODO: Remove this and restore proper team-specific permissions for production
    // =======================================================================
    
    // Pre-match actions
    togglePlayerAvailability: async (team: 'home' | 'away', playerId: string) => {
      try {
        const currentAvailable = team === 'home' 
          ? state.preMatch.home.availablePlayers 
          : state.preMatch.away.availablePlayers;
        
        const isCurrentlyAvailable = currentAvailable.includes(playerId);
        const newAvailable = isCurrentlyAvailable
          ? currentAvailable.filter(id => id !== playerId)
          : [...currentAvailable, playerId];

        const updateField = team === 'home' 
          ? 'homeAvailablePlayers' 
          : 'awayAvailablePlayers';

        await updatePreMatchState(matchId, {
          [updateField]: newAvailable
        });
      } catch (err) {
        setError(`Failed to update player availability: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },

    confirmRoster: async (team: 'home' | 'away') => {
      try {
        const updateField = team === 'home' 
          ? 'homeRosterConfirmed' 
          : 'awayRosterConfirmed';

        await updatePreMatchState(matchId, {
          [updateField]: true
        });
      } catch (err) {
        const errorMessage = `Failed to confirm roster: ${err instanceof Error ? err.message : 'Unknown error'}`;
        setError(errorMessage);
        
        // Show retry option
        console.error(errorMessage);
        throw err; // Re-throw so UI can handle retry
      }
    },

    assignPosition: (team: 'home' | 'away', position: string | number, playerId: string | 'vacant') => {
      setState(prev => {
        const newState = { ...prev };
        
        // Update the assignment
        if (team === 'home') {
          newState.preMatch.home.round1Assignments.set(position, playerId);
        } else {
          newState.preMatch.away.round1Assignments.set(position, playerId);
        }

        // Immediately update frames with new assignments
        const updatedFrames = newState.frames.map(frame => {
          let homePlayerId = frame.homePlayerId;
          let awayPlayerId = frame.awayPlayerId;
          
          // Apply player assignments for all rounds (with rotation)
          if (newState.preMatch.home.round1Assignments.size > 0 || newState.preMatch.away.round1Assignments.size > 0) {
            // For Round 1, positions match directly
            if (frame.round === 1) {
              const homeAssignment = newState.preMatch.home.round1Assignments.get(frame.homePosition);
              const awayAssignment = newState.preMatch.away.round1Assignments.get(String(frame.awayPosition)) || 
                                    newState.preMatch.away.round1Assignments.get(frame.awayPosition);
              
              if (homeAssignment && homeAssignment !== 'vacant') homePlayerId = homeAssignment;
              if (awayAssignment && awayAssignment !== 'vacant') awayPlayerId = awayAssignment;
            } else {
              // For future rounds, find the original Round 1 position for this frame's position
              // We need to reverse the rotation to find which Round 1 position corresponds to this frame's position
              
              // Calculate what Round 1 positions would create this frame's positions in this round
              const frameIndex = frame.frameNumber - 1; // 0-based
              const roundOffset = frame.round - 1; // 0-based round
              
              // Reverse calculation: what Round 1 position gives us this frame's position in this round?
              const homeOriginalIndex = frameIndex; // Home positions don't rotate
              const positionsPerTeam = newState.match?.format?.positionsPerTeam || 4;
              const awayOriginalIndex = (frameIndex - roundOffset + positionsPerTeam) % positionsPerTeam;
              
              const homeOriginalPosition = String.fromCharCode(65 + homeOriginalIndex); // A, B, C, D
              const awayOriginalPosition = awayOriginalIndex + 1; // 1, 2, 3, 4
              
              // Get the player assigned to the original Round 1 position
              const homeAssignment = newState.preMatch.home.round1Assignments.get(homeOriginalPosition);
              const awayAssignment = newState.preMatch.away.round1Assignments.get(String(awayOriginalPosition)) || 
                                    newState.preMatch.away.round1Assignments.get(awayOriginalPosition);
              
              if (homeAssignment && homeAssignment !== 'vacant') homePlayerId = homeAssignment;
              if (awayAssignment && awayAssignment !== 'vacant') awayPlayerId = awayAssignment;
            }
          }
          
          return {
            ...frame,
            homePlayerId,
            awayPlayerId,
            isVacantFrame: homePlayerId === 'vacant' || awayPlayerId === 'vacant'
          };
        });

        newState.frames = updatedFrames;
        return newState;
      });
    },

    lockInitialLineup: async (team: 'home' | 'away') => {
      try {
        const assignments = team === 'home' 
          ? state.preMatch.home.round1Assignments
          : state.preMatch.away.round1Assignments;

        // Save assignments and locked status to database
        const assignmentsField = team === 'home' 
          ? 'homeRound1Assignments' 
          : 'awayRound1Assignments';
        const lockedField = team === 'home'
          ? 'homeLineupLocked'
          : 'awayLineupLocked';

        const assignmentsObj = Object.fromEntries(assignments);

        await updatePreMatchState(matchId, {
          [assignmentsField]: assignmentsObj,
          [lockedField]: true
        });

        // Update local state to show as locked
        setState(prev => ({
          ...prev,
          preMatch: {
            ...prev.preMatch,
            [team]: {
              ...prev.preMatch[team],
              lineupLocked: true
            }
          }
        }));
      } catch (err) {
        setError(`Failed to lock lineup: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },

    unlockInitialLineup: async (team: 'home' | 'away') => {
      console.log('🔓 unlockInitialLineup called for team:', team);
      
      try {
        // TEMPORARY FOR TESTING: Allow unlocking even if other team is locked
        // Only allow unlocking if the other team hasn't locked their lineup yet
        const otherTeam = team === 'home' ? 'away' : 'home';
        const otherTeamLocked = team === 'home' 
          ? state.preMatch.away.lineupLocked 
          : state.preMatch.home.lineupLocked;

        console.log('Current state check:', {
          team,
          otherTeam,
          otherTeamLocked,
          currentTeamLocked: team === 'home' ? state.preMatch.home.lineupLocked : state.preMatch.away.lineupLocked,
          preMatchState: state.preMatch
        });

        // TEMPORARY FOR TESTING: Comment out the blocking check
        // if (otherTeamLocked) {
        //   // If both teams are locked, we can't unlock (match might be starting)
        //   console.log('❌ Cannot unlock: Other team has already locked their lineup');
        //   setError(`Cannot edit lineup: Both teams have confirmed their lineups and the match is ready to start.`);
        //   return;
        // }

        console.log('✅ Proceeding with unlock...');

        // Unlock the lineup in database
        const lockedField = team === 'home'
          ? 'homeLineupLocked'
          : 'awayLineupLocked';

        console.log('Updating database field:', lockedField, 'to false');

        await updatePreMatchState(matchId, {
          [lockedField]: false
        });

        console.log('✅ Database updated successfully');

        // Update local state to show as unlocked
        setState(prev => ({
          ...prev,
          preMatch: {
            ...prev.preMatch,
            [team]: {
              ...prev.preMatch[team],
              lineupLocked: false
            }
          }
        }));

        console.log('✅ Local state updated successfully');
      } catch (err) {
        console.error('❌ Error in unlockInitialLineup:', err);
        setError(`Failed to unlock lineup: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },

    startMatch: async () => {
      try {
        // Update match state to 'in-progress'
        await updateMatch(matchId, {
          state: 'in-progress',
          status: 'in_progress'
        });
      } catch (err) {
        setError(`Failed to start match: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },

    // Match actions
    scoreFrame: async (frame: FrameWithPlayers, winnerId: string) => {
      // TODO: Implement
      console.log('scoreFrame', frame.frameId, winnerId);
    },

    editFrame: (frame: FrameWithPlayers) => {
      setState(prev => ({ ...prev, editingFrame: frame }));
    },

    resetFrame: async (frame: FrameWithPlayers) => {
      // TODO: Implement
      console.log('resetFrame', frame.frameId);
    },

    makeSubstitution: async (round: number, position: string | number, playerId: string) => {
      // TODO: Implement
      console.log('makeSubstitution', round, position, playerId);
    },

    lockTeamLineup: async (round: number, team: 'home' | 'away') => {
      // TODO: Implement
      console.log('lockTeamLineup', round, team);
    },

    lockRound: async (round: number) => {
      // TODO: Implement
      console.log('lockRound', round);
    },

    // Utility actions
    refreshMatch: async () => {
      setLoading(true);
      try {
        const match = await getMatch(matchId);
        if (match) {
          updateStateFromMatch(match);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refresh match');
      } finally {
        setLoading(false);
      }
    },

    setError: (error: string | null) => {
      setError(error);
    },

    setDefaultAvailability: async (team: 'home' | 'away', playerIds: string[]) => {
      console.log('🔧 setDefaultAvailability called:', { team, playerIds });
      
      try {
        const updateField = team === 'home' 
          ? 'homeAvailablePlayers' 
          : 'awayAvailablePlayers';

        console.log('📝 Updating field:', updateField, 'with:', playerIds);

        await updatePreMatchState(matchId, {
          [updateField]: playerIds
        });

        console.log('✅ setDefaultAvailability database update completed for', team);
      } catch (err) {
        console.error('❌ setDefaultAvailability failed:', err);
        setError(`Failed to set default availability: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  return {
    state,
    actions,
    loading,
    error
  };
}; 