import { useEffect, useCallback } from 'react';
import { useGameFlow, GameEvent, GameState } from '../context/GameFlowContext';
import { Match, updateMatch } from '../services/databaseService';
import { isRoundComplete } from '../utils/matchUtils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook for handling game flow actions and database operations
 */
export const useGameFlowActions = (matchId?: string) => {
  const { state, dispatch, canSubstitute, isRoundLocked } = useGameFlow();
  const { user } = useAuth();
  const { showError } = useToast();
  
  useEffect(() => {
    // If matchId is provided, use it; otherwise use the one from state
    const effectiveMatchId = matchId || state.matchId;
    if (!effectiveMatchId) return;
    
    console.log('Setting up match listener for', effectiveMatchId);
    
    // Set up listener for match changes
    const unsubscribe = onSnapshot(
      doc(db, 'matches', effectiveMatchId),
      (matchDoc) => {
        if (matchDoc.exists()) {
          const match = { id: matchDoc.id, ...matchDoc.data() } as Match;
          console.log('Match update from Firestore:', match?.id);
          
          // Use skipIfUnchanged to prevent unnecessary re-renders
          dispatch({
            type: 'SET_MATCH',
            payload: { match, skipIfUnchanged: true }
          });
        }
      },
      (error) => {
        console.error('Error listening to match updates:', error);
      }
    );
    
    // Clean up listener on unmount or when matchId changes
    return () => {
      console.log('Cleaning up match listener');
      unsubscribe();
    };
  }, [matchId, state.matchId, dispatch]); // Only re-run effect if matchId changes
  
  // Function to set the match data (called once on initial load)
  const setMatchData = useCallback((match: Match) => {
    // Use a more reliable method to prevent unnecessary updates
    // by using a ref to compare with the previous match
    dispatch({ 
      type: 'SET_MATCH', 
      payload: { 
        match,
        skipIfUnchanged: true // Flag to tell reducer to check if match is unchanged
      } 
    });
  }, [dispatch]); // Only depend on dispatch, not on state properties
  
  // Function to start the match
  const startMatch = useCallback(async () => {
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
  }, [state.matchId, dispatch]);
  
  // Function to lock a completed round
  const lockRound = useCallback(async (roundIndex: number) => {
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
  }, [state.matchId, state.match, dispatch]);
  
  // Function to handle substitution
  const makeSubstitution = useCallback(async (position: number, isHomeTeam: boolean, playerId: string, roundIndex: number) => {
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
  }, [state.matchId, state.match, state.lineupHistory, canSubstitute, dispatch]);
  
  // Function to confirm home team lineup
  const confirmHomeLineup = useCallback(async (roundIndex: number) => {
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
  }, [state.matchId, state.match, state.awayTeamConfirmed, dispatch]);
  
  // Function to confirm away team lineup
  const confirmAwayLineup = useCallback(async (roundIndex: number) => {
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
  }, [state.matchId, state.match, state.homeTeamConfirmed, dispatch]);
  
  // Function to edit home team lineup
  const editHomeLineup = useCallback(async (roundIndex: number) => {
    if (!state.matchId || !state.match) {
      console.error("Cannot edit home lineup - match data is missing", { 
        matchId: state.matchId, 
        matchExists: !!state.match 
      });
      return;
    }
    
    console.log("Editing home lineup for round", roundIndex, "current match state:", {
      homeConfirmedRounds: state.match.homeConfirmedRounds,
      awayConfirmedRounds: state.match.awayConfirmedRounds,
      currentRound: state.match.currentRound
    });
    
    try {
      const homeConfirmedRounds = { ...(state.match.homeConfirmedRounds || {}) };
      delete homeConfirmedRounds[roundIndex];
      
      console.log("Will update with new homeConfirmedRounds:", homeConfirmedRounds);
      
      const updateData: Partial<Match> = {
        homeConfirmedRounds,
        homeTeamConfirmedNextRound: false
      };
      
      await updateMatch(state.matchId, updateData);
      console.log("Database updated successfully for home lineup edit");
      
      dispatch({ 
        type: GameEvent.EDIT_HOME_LINEUP, 
        payload: { roundIndex } 
      });
      console.log("Dispatched EDIT_HOME_LINEUP event");
    } catch (err: any) {
      console.error('Error editing home team lineup:', err);
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to edit home team lineup' } });
    }
  }, [state.matchId, state.match, dispatch]);
  
  // Function to edit away team lineup
  const editAwayLineup = useCallback(async (roundIndex: number) => {
    if (!state.matchId || !state.match) {
      console.error("Cannot edit away lineup - match data is missing", { 
        matchId: state.matchId, 
        matchExists: !!state.match 
      });
      return;
    }
    
    console.log("Editing away lineup for round", roundIndex, "current match state:", {
      homeConfirmedRounds: state.match.homeConfirmedRounds,
      awayConfirmedRounds: state.match.awayConfirmedRounds,
      currentRound: state.match.currentRound
    });
    
    try {
      const awayConfirmedRounds = { ...(state.match.awayConfirmedRounds || {}) };
      delete awayConfirmedRounds[roundIndex];
      
      console.log("Will update with new awayConfirmedRounds:", awayConfirmedRounds);
      
      const updateData: Partial<Match> = {
        awayConfirmedRounds,
        awayTeamConfirmedNextRound: false
      };
      
      await updateMatch(state.matchId, updateData);
      console.log("Database updated successfully for away lineup edit");
      
      dispatch({ 
        type: GameEvent.EDIT_AWAY_LINEUP, 
        payload: { roundIndex } 
      });
      console.log("Dispatched EDIT_AWAY_LINEUP event");
    } catch (err: any) {
      console.error('Error editing away team lineup:', err);
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to edit away team lineup' } });
    }
  }, [state.matchId, state.match, dispatch]);
  
  // Function to reset the game flow state for match reset
  const resetGameFlow = useCallback(async () => {
    if (!state.matchId || !state.match) return;
    
    try {
      // Reset the game state to initial state for round 1
      dispatch({ 
        type: GameEvent.START_MATCH
      });
      
      // Log the reset
      console.log("GameFlow state reset for match reset");
    } catch (err: any) {
      console.error('Error resetting game flow state:', err);
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to reset game flow state' } });
    }
  }, [state.matchId, state.match, dispatch]);
  
  // Function to advance to the next round after both teams confirm
  const advanceToNextRound = useCallback(async (roundIndex: number) => {
    if (!state.matchId || !state.match) return;
    
    // Prevent redundant calls if we're already transitioning
    if (state.state === GameState.TRANSITIONING_TO_NEXT_ROUND) {
      console.log("Already transitioning to next round, ignoring redundant call");
      return;
    }
    
    try {
      const nextRound = roundIndex + 2;
      
      // Skip update if already in this round to prevent loops
      if (state.match.currentRound === nextRound) {
        console.log(`Already in round ${nextRound}, skipping redundant advancement`);
        dispatch({ 
          type: GameEvent.ADVANCE_ROUND, 
          payload: { roundIndex } 
        });
        return;
      }
      
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
  }, [state.matchId, state.match, state.lineupHistory, state.state, dispatch]);
  
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
    resetGameFlow,
    
    // Helper functions
    canSubstitute,
    isRoundLocked
  };
}; 