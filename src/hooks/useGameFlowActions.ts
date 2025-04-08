import { useEffect } from 'react';
import { useGameFlow, GameEvent } from '../context/GameFlowContext';
import { Match, updateMatch } from '../services/databaseService';
import { isRoundComplete } from '../utils/matchUtils';

/**
 * Hook for handling game flow actions and database operations
 */
export const useGameFlowActions = (matchId: string | undefined) => {
  const { state, dispatch, canSubstitute, isRoundLocked } = useGameFlow();
  
  // Listen for match changes from the database
  useEffect(() => {
    if (!matchId) return;
    
    // This would be your actual database listener 
    // (depends on your database service implementation)
    const listenToMatch = async () => {
      try {
        // Example using a hypothetical listenToDocumentChanges function
        // Replace this with your actual database listener code
        // const unsubscribe = listenToDocumentChanges(
        //   'matches',
        //   matchId,
        //   (updatedMatch) => {
        //     dispatch({ type: 'SET_MATCH', payload: { match: updatedMatch } });
        //   }
        // );
        
        // Return the unsubscribe function for cleanup
        return () => {
          // if (unsubscribe) unsubscribe();
        };
      } catch (err: any) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { error: err.message || 'Failed to connect to match data' } 
        });
      }
    };
    
    const cleanupListener = listenToMatch();
    
    // Clean up listener on unmount
    return () => {
      cleanupListener.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, [matchId, dispatch]);
  
  // Function to set the match data (called once on initial load)
  const setMatchData = (match: Match) => {
    dispatch({ type: 'SET_MATCH', payload: { match } });
  };
  
  // Function to start the match
  const startMatch = async () => {
    if (!state.matchId) return;
    
    try {
      const updateData: Partial<Match> = {
        status: 'in_progress',
        currentRound: 1
      };
      
      await updateMatch(state.matchId, updateData);
      dispatch({ type: GameEvent.START_MATCH });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to start match' } });
    }
  };
  
  // Function to lock a completed round
  const lockRound = async (roundIndex: number) => {
    if (!state.matchId || !state.match) return;
    
    // Check if the round is complete
    if (!isRoundComplete(state.match, roundIndex)) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { error: 'Cannot lock round - all frames must be scored first.' } 
      });
      return;
    }
    
    try {
      // Update round locked status in the database
      const roundLockedStatus = { ...(state.match.roundLockedStatus || {}) };
      roundLockedStatus[roundIndex] = true;
      
      await updateMatch(state.matchId, { roundLockedStatus });
      
      // Update local state
      dispatch({ type: GameEvent.LOCK_ROUND, payload: { roundIndex } });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to lock round' } });
    }
  };
  
  // Function to handle substitution
  const makeSubstitution = async (position: number, isHomeTeam: boolean, playerId: string, roundIndex: number) => {
    if (!state.matchId || !state.match) return;
    
    // Check if the substitution is valid
    if (!canSubstitute(position, isHomeTeam, playerId, roundIndex)) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { error: 'Invalid substitution - player cannot play in this position.' } 
      });
      return;
    }
    
    try {
      // Update local state first for immediate UI feedback
      dispatch({ 
        type: GameEvent.MAKE_SUBSTITUTION, 
        payload: { position, isHomeTeam, playerId, roundIndex } 
      });
      
      // The next round number
      const nextRound = roundIndex + 2;
      
      // Get the lineup for the next round
      const nextRoundLineup = state.lineupHistory[nextRound] || {
        homeLineup: [...(state.match.homeLineup || [])].slice(0, 4),
        awayLineup: [...(state.match.awayLineup || [])].slice(0, 4)
      };
      
      // Apply the substitution
      if (isHomeTeam) {
        nextRoundLineup.homeLineup[position] = playerId;
      } else {
        nextRoundLineup.awayLineup[position] = playerId;
      }
      
      // Store in the match's lineup history (if the match has this field)
      if (state.match.lineupHistory) {
        const lineupHistory = { ...(state.match.lineupHistory || {}) };
        lineupHistory[nextRound] = nextRoundLineup;
        
        await updateMatch(state.matchId, { lineupHistory });
      }
      
      // No error from database operation
      dispatch({ type: 'SET_ERROR', payload: { error: null } });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to make substitution' } });
    }
  };
  
  // Function to confirm home team lineup
  const confirmHomeLineup = async (roundIndex: number) => {
    if (!state.matchId || !state.match) return;
    
    try {
      const homeConfirmedRounds = { ...(state.match.homeConfirmedRounds || {}) };
      homeConfirmedRounds[roundIndex] = true;
      
      const updateData: Partial<Match> = {
        homeConfirmedRounds,
        homeTeamConfirmedNextRound: true
      };
      
      await updateMatch(state.matchId, updateData);
      
      // If both teams are now confirmed, we need to advance to the next round
      if (state.awayTeamConfirmed[roundIndex]) {
        dispatch({ 
          type: GameEvent.CONFIRM_HOME_LINEUP, 
          payload: { roundIndex } 
        });
        
        // Advance round after both teams confirm
        await advanceToNextRound(roundIndex);
      } else {
        dispatch({ 
          type: GameEvent.CONFIRM_HOME_LINEUP, 
          payload: { roundIndex } 
        });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to confirm home team lineup' } });
    }
  };
  
  // Function to confirm away team lineup
  const confirmAwayLineup = async (roundIndex: number) => {
    if (!state.matchId || !state.match) return;
    
    try {
      const awayConfirmedRounds = { ...(state.match.awayConfirmedRounds || {}) };
      awayConfirmedRounds[roundIndex] = true;
      
      const updateData: Partial<Match> = {
        awayConfirmedRounds,
        awayTeamConfirmedNextRound: true
      };
      
      await updateMatch(state.matchId, updateData);
      
      // If both teams are now confirmed, we need to advance to the next round
      if (state.homeTeamConfirmed[roundIndex]) {
        dispatch({ 
          type: GameEvent.CONFIRM_AWAY_LINEUP, 
          payload: { roundIndex } 
        });
        
        // Advance round after both teams confirm
        await advanceToNextRound(roundIndex);
      } else {
        dispatch({ 
          type: GameEvent.CONFIRM_AWAY_LINEUP, 
          payload: { roundIndex } 
        });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to confirm away team lineup' } });
    }
  };
  
  // Function to edit home team lineup
  const editHomeLineup = async (roundIndex: number) => {
    if (!state.matchId || !state.match) return;
    
    try {
      const homeConfirmedRounds = { ...(state.match.homeConfirmedRounds || {}) };
      delete homeConfirmedRounds[roundIndex];
      
      const updateData: Partial<Match> = {
        homeConfirmedRounds,
        homeTeamConfirmedNextRound: false
      };
      
      await updateMatch(state.matchId, updateData);
      
      dispatch({ 
        type: GameEvent.EDIT_HOME_LINEUP, 
        payload: { roundIndex } 
      });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to edit home team lineup' } });
    }
  };
  
  // Function to edit away team lineup
  const editAwayLineup = async (roundIndex: number) => {
    if (!state.matchId || !state.match) return;
    
    try {
      const awayConfirmedRounds = { ...(state.match.awayConfirmedRounds || {}) };
      delete awayConfirmedRounds[roundIndex];
      
      const updateData: Partial<Match> = {
        awayConfirmedRounds,
        awayTeamConfirmedNextRound: false
      };
      
      await updateMatch(state.matchId, updateData);
      
      dispatch({ 
        type: GameEvent.EDIT_AWAY_LINEUP, 
        payload: { roundIndex } 
      });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to edit away team lineup' } });
    }
  };
  
  // Function to advance to the next round after both teams confirm
  const advanceToNextRound = async (roundIndex: number) => {
    if (!state.matchId || !state.match) return;
    
    try {
      const nextRound = roundIndex + 2;
      
      // Step 1: Update currentRound and save confirmed lineups
      const updateData: Partial<Match> = {
        currentRound: nextRound,
        homeTeamConfirmedNextRound: false,
        awayTeamConfirmedNextRound: false
      };
      
      // If we have lineup history for this next round, use it
      if (state.lineupHistory[nextRound]) {
        updateData.homeLineup = state.lineupHistory[nextRound].homeLineup;
        updateData.awayLineup = state.lineupHistory[nextRound].awayLineup;
      }
      
      await updateMatch(state.matchId, updateData);
      
      dispatch({ 
        type: GameEvent.ADVANCE_ROUND, 
        payload: { roundIndex } 
      });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to advance to next round' } });
    }
  };
  
  return {
    // State
    gameState: state.state,
    currentRound: state.currentRound,
    match: state.match,
    homeTeamConfirmed: state.homeTeamConfirmed,
    awayTeamConfirmed: state.awayTeamConfirmed,
    lineupHistory: state.lineupHistory,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    setMatchData,
    startMatch,
    lockRound,
    makeSubstitution,
    confirmHomeLineup,
    confirmAwayLineup,
    editHomeLineup,
    editAwayLineup,
    
    // Helpers
    canSubstitute,
    isRoundLocked
  };
}; 