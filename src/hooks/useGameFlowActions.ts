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
          console.log('[GameFlowActions] Dispatching SET_MATCH to reducer', match);
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
    
    try {
      // Calculate the next round number (1-based)
      const nextRound = roundIndex + 2;
      console.log(`Locking round ${roundIndex + 1} and preparing for round ${nextRound}`);
      
      // Update the match document with locked status and next round
      const updateData: Partial<Match> = {
        [`roundLockedStatus.${roundIndex}`]: true,
        currentRound: nextRound, // Set the next round as the current round
        // Reset round-specific confirmation flags using correct map property
        [`homeConfirmedRounds.${roundIndex + 1}`]: false,
        [`awayConfirmedRounds.${roundIndex + 1}`]: false
      };
      
      console.log('Updating match with:', updateData);
      await updateMatch(state.matchId, updateData);
      
      // Dispatch the lock round event to update local state
      dispatch({ type: GameEvent.LOCK_ROUND, payload: { roundIndex } });
    } catch (error) {
      console.error('Error locking round:', error);
      showError('Failed to lock round scores');
    }
  }, [state.matchId, state.match, dispatch, showError]);
  
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
      const round1LineupHistory = state.match?.lineupHistory?.[1];
      const defaultLineup = {
          homeLineup: round1LineupHistory?.homeLineup?.slice(0,4) || [],
          awayLineup: round1LineupHistory?.awayLineup?.slice(0,4) || []
      };
      const nextRoundLineup = state.lineupHistory[nextRound] || defaultLineup;
      
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
      // Get the original starting lineups from round 1 history
      const round1LineupHistory = state.match?.lineupHistory?.[1];
      const homeStartingFour = round1LineupHistory?.homeLineup?.slice(0, 4) || [];
      const awayStartingFour = round1LineupHistory?.awayLineup?.slice(0, 4) || [];
      
      // Reset the match data in the context
      dispatch({ 
        type: 'SET_MATCH',
        payload: { 
          match: {
            ...state.match,
            frames: [], // Reset frames array completely
            currentRound: 1,
            status: 'in_progress', // Keep consistent with handleResetMatch
            homeConfirmedRounds: {},
            awayConfirmedRounds: {},
            roundLockedStatus: {},
            lineupHistory: {
              1: {
                homeLineup: homeStartingFour,
                awayLineup: awayStartingFour
              }
            }
          } as Match
        }
      });
      
      // Reset game flow state to SETUP and transition to SCORING_ROUND
      dispatch({ 
        type: GameEvent.RESET_GAME_FLOW
      });
      
      // Force transition to SCORING_ROUND state
      dispatch({
        type: GameEvent.START_MATCH
      });
      
      // Reset any stored error
      dispatch({
        type: 'SET_ERROR',
        payload: { error: null }
      });
      
      console.log("GameFlow state completely reset for match reset");
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
      
      // Log current and next round values to help debug
      console.log(`Advancing from round ${roundIndex+1} to round ${nextRound}`, {
        currentStateRound: state.currentRound,
        matchCurrentRound: state.match.currentRound,
        nextRound
      });
      
      // Only check for redundant updates when not advancing to the final round (4)
      // Final round advancement (to Round 4) should always proceed
      const isAdvancingToFinalRound = nextRound === 4;
      
      if (!isAdvancingToFinalRound && state.match.currentRound === nextRound) {
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
      };
      
      console.log(`Updating match database with new currentRound=${nextRound}`, updateData);
      await updateMatch(state.matchId, updateData);
      
      dispatch({ 
        type: GameEvent.ADVANCE_ROUND, 
        payload: { roundIndex } 
      });
      
      console.log(`Successfully advanced to round ${nextRound}`);
    } catch (err: any) {
      console.error('Error advancing to next round:', err);
      dispatch({ type: 'SET_ERROR', payload: { error: err.message || 'Failed to advance to next round' } });
    }
  }, [state.matchId, state.match, state.lineupHistory, state.state, state.currentRound, dispatch]);
  
  // Function to mark a round as complete (all frames scored)
  const completeRound = useCallback(() => {
    dispatch({ type: GameEvent.COMPLETE_ROUND });
  }, [dispatch]);
  
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
    advanceToNextRound,
    completeRound,
    
    // Helper functions
    canSubstitute,
    isRoundLocked
  };
}; 