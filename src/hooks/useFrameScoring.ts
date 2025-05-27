import { useState, useCallback } from 'react';
import { 
  Match,
  Frame,
  updateMatch,
  createDocument,
  deleteFramesForMatch,
  startMatch,
  getMatch
} from '../services/databaseService';
import { calculateMatchScore, getOpponentPosition, isRoundComplete as isRoundCompleteUtil } from '../utils/matchUtils';
import { useToast } from '../context/ToastContext';
import { useGameFlowActions } from '../hooks/useGameFlowActions';

type Position = number;  // All positions are passed as numbers 0-3 internally

interface EditingFrameState {
  roundIndex: number;
  position: Position;
  homePlayerId?: string;
  awayPlayerId?: string;
}

/**
 * Custom hook to handle frame scoring functionality
 */
export const useFrameScoring = (
  match: Match | null, 
  setMatch: React.Dispatch<React.SetStateAction<Match | null>>,
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void,
  isUserHomeTeamCaptain: boolean,
  setActiveRound?: (round: number) => void
) => {
  // Add useToast hook for notifications
  const toast = useToast();
  // Add GameFlow actions
  const gameFlowActions = useGameFlowActions(match?.id);
  const [editingFrame, setEditingFrame] = useState<EditingFrameState | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  // Add a new state to track if we're resetting the entire match
  const [isResettingMatch, setIsResettingMatch] = useState(false);
  // Add hoveredFrame state for frame hover effects
  const [hoveredFrame, setHoveredFrame] = useState<{ roundIndex: number, position: number } | null>(null);

  // Helper function to find a frame in the match
  const findFrame = (roundIndex: number, position: number): Frame | undefined => {
    if (!match?.frames) return undefined;
    // Round is 1-indexed in Frame, position is 0-indexed internally
    const targetRound = roundIndex + 1;
    const targetFrameNumber = position + 1;
    // Find the frame with the correct round and frameNumber
    return Object.values(match.frames).find(f => 
      f.round === targetRound && f.frameNumber === targetFrameNumber
    );
  };

  // Helper function to check if a frame is scored
  const isFrameScored = (roundIndex: number, position: number): boolean => {
    const frame = findFrame(roundIndex, position);
    return !!frame?.winnerPlayerId;
  };

  // Helper function to get the winner of a frame
  const getFrameWinner = (roundIndex: number, position: number): string | null => {
    const frame = findFrame(roundIndex, position);
    return frame?.winnerPlayerId || null;
  };

  /**
   * Check if all frames in a round are scored
   */
  const isRoundComplete = useCallback((roundIndex: number): boolean => {
    if (!match) {
      console.log('[useFrameScoring][isRoundComplete] No match object, returning false');
      return false;
    }
    
    const result = isRoundCompleteUtil(match, roundIndex);
    console.log('[useFrameScoring][isRoundComplete] Called with:', {
      roundIndex,
      matchId: match.id,
      matchFramesLength: match.frames?.length || 0,
      result,
      matchReference: match === match ? 'same' : 'different' // This will always be 'same' but helps debug
    });
    
    return result;
  }, [match]);

  // Handle clicking on a frame
  const handleFrameClick = (roundIndex: number, position: Position, event?: React.MouseEvent | React.TouchEvent) => {
    if (event) {
      event.preventDefault();
    }
    
    // Check if the round is locked - if so, prevent editing
    if (match?.roundLockedStatus?.[roundIndex]) {
      console.log(`Round ${roundIndex + 1} is locked, cannot edit frames.`);
      toast.showError(`Round ${roundIndex + 1} scores are locked and cannot be changed.`);
      return;
    }
    
    // Only home team captain can edit frames 
    // (This is mostly handled by UI disabling, but keep for safety)
    if (!isUserHomeTeamCaptain) {
      console.log('User is not home captain, cannot edit frames');
      return;
    }

    const frame = findFrame(roundIndex, position);
    if (!frame) {
      console.error('Frame not found:', { roundIndex, position });
      setError('Could not find the frame data. Please refresh.');
      return;
    }

    // Open the editing dialog regardless of whether it's scored or not
    setEditingFrame({ 
      roundIndex: roundIndex, 
      position: position,
      homePlayerId: frame.homePlayerId, // Get ID directly from frame
      awayPlayerId: frame.awayPlayerId  // Get ID directly from frame
    });
    setSelectedWinner('');
    
    // If frame is already scored, pre-select the existing winner
    if (frame.winnerPlayerId) {
      setSelectedWinner(frame.winnerPlayerId);
    }
  };

  // Handle selecting a winner for a frame
  const handleSelectWinner = async (roundIndex: number, position: Position, winnerPlayerId: string) => {
    if (!match?.id || !winnerPlayerId || !match.frames) return;

    // Prevent scoring if round is locked
    if (match?.roundLockedStatus?.[roundIndex]) {
      setError(`Round ${roundIndex + 1} is locked. Cannot score frame.`);
      toast.showError(`Round ${roundIndex + 1} is locked. Cannot score frame.`);
      return;
    }

    try {
      setLoading(true);
      setEditingFrame(null);

      // Log the winner selection
      console.log('[FrameScoring][SelectWinner] Winner selected:', {
        roundIndex,
        position,
        winnerPlayerId
      });

      // Find the frame structure (we need its round, positions, and ID)
      const frameStructure = findFrame(roundIndex, position);
      if (!frameStructure) {
        throw new Error('Frame structure not found for scoring');
      }
      // Log the specific frame structure found
      console.log('[handleSelectWinner] Found frame structure to score:', { 
        id: frameStructure.frameId, 
        round: frameStructure.round, 
        homePos: frameStructure.homePlayerPosition, 
        awayPos: frameStructure.awayPlayerPosition 
      });

      // Log a summary before mapping frames
      console.log(`[handleSelectWinner] Checking ${match.frames.length} frames for match`);

      const updatedFrames = match.frames.map(f => {
        if (f.frameId === frameStructure.frameId) {
          // Log the update for the TARGET frame
          console.log(`[handleSelectWinner] UPDATING frame id=${f.frameId} with winner=${winnerPlayerId}`);
          return {
            ...f,
            winnerPlayerId, // Set the winner
            isComplete: true, // Mark as complete
            homeScore: winnerPlayerId === f.homePlayerId ? 1 : 0,
            awayScore: winnerPlayerId === f.awayPlayerId ? 1 : 0
          };
        }
        return f; 
      });

      // Log the frames array before sending to Firestore
      console.log('[FrameScoring][FirestoreWrite][BeforeUpdate] frames:', updatedFrames.map(f => ({
        frameId: f.frameId,
        round: f.round,
        winnerPlayerId: f.winnerPlayerId,
        isComplete: f.isComplete
      })));

      const matchUpdate: Partial<Match> = {
        frames: updatedFrames,
        status: match.status === 'scheduled' ? 'in_progress' : match.status
      };

      // Log the data being sent to Firestore
      console.log('[FrameScoring][SelectWinner] Sending update to Firestore:', matchUpdate);

      try {
        await updateMatch(match.id, matchUpdate);
        console.log('[FrameScoring][SelectWinner] Firestore update succeeded.');
      } catch (err) {
        console.error('[FrameScoring][SelectWinner] Firestore update FAILED:', err);
        throw err;
      }

      // Add a delay and re-fetch the match to see what Firestore returns
      setTimeout(async () => {
        if (match?.id) {
          const latest = await getMatch(match.id);
          console.log('[FrameScoring][SelectWinner] After update, Firestore match.frames:', latest?.frames?.map(f => ({round: f.round, homePlayerPosition: f.homePlayerPosition, awayPlayerPosition: f.awayPlayerPosition, winnerPlayerId: f.winnerPlayerId})));
        }
      }, 1000);

      // Do NOT immediately update local state here; let the Firestore listener do it!
      // setMatch(prevMatch => ({ ...prevMatch, ...matchUpdate }));

      // After scoring, check if this was the last frame needed to complete the round
      // Use the updated frames array for the check
      const roundNowComplete = (() => {
        const roundFrames = updatedFrames.filter(f => f.round === roundIndex + 1);
        const allScored = roundFrames.length === 4 && roundFrames.every(f => typeof f.winnerPlayerId === 'string' && f.winnerPlayerId.trim().length > 0);
        console.log('[FrameScoring] roundNowComplete check:', { roundIndex, allScored, roundFrames });
        return allScored;
      })();

      if (roundNowComplete) {
        console.log('[FrameScoring] All frames in round', roundIndex + 1, 'are now scored. Dispatching COMPLETE_ROUND event.');
        if (gameFlowActions && typeof gameFlowActions.completeRound === 'function') {
          gameFlowActions.completeRound();
        }
        // Do NOT optimistically update local match state here
      }

      setSelectedWinner('');
      setError('');

      toast.showSuccess('Frame result recorded successfully');
    } catch (err: any) {
      setError('Failed to record frame result');
      toast.showError('Failed to record frame result');
      console.error('Error updating frame result:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle clearing/resetting a frame's result
  const clearFrame = async (roundIndex: number, position: Position) => {
    if (!match?.id || !match.frames) return;
    
    // Prevent reset if round is locked
    if (match.roundLockedStatus?.[roundIndex]) {
      toast.showError(`Round ${roundIndex + 1} scores are locked and cannot be reset.`);
      return;
    }
    
    // Only home team captain can reset frames
    if (!isUserHomeTeamCaptain) {
      console.log('User is not home captain, cannot reset frames');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const targetRound = roundIndex + 1;
      const targetFrameNumber = position + 1;

      const updatedFrames = match.frames.map(f => {
        if (f.round === targetRound && f.frameNumber === targetFrameNumber) {
          return {
            ...f,
            winnerPlayerId: null,
            isComplete: false,
            homeScore: 0,
            awayScore: 0
          };
        }
        return f;
      });

      // Update match with cleared frame
      const matchUpdate: Partial<Match> = {
        frames: updatedFrames
      };

      await updateMatch(match.id, matchUpdate);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          ...matchUpdate
        };
      });

      setEditingFrame(null);
      setError('');
      toast.showSuccess('Frame result cleared successfully');
    } catch (err: any) {
      console.error('Error clearing frame result:', err);
      setError(err.message || 'Failed to clear frame result.');
      toast.showError(err.message || 'Failed to clear frame result.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting a frame
  const handleResetFrame = useCallback((roundIndex: number, position: Position, event: React.MouseEvent<Element, MouseEvent>) => {
    event.preventDefault(); // Prevent any default behavior
    event.stopPropagation(); // Stop event bubbling
    clearFrame(roundIndex, position); // Pass the round and position to clearFrame
  }, [clearFrame]);

  // Handle resetting a round
  const handleResetRound = async (roundIndex: number) => {
    if (!match?.id) return;

    // Prevent reset if round is locked
    if (match.roundLockedStatus?.[roundIndex]) {
      toast.showError(`Round ${roundIndex + 1} scores are locked and cannot be reset.`);
      return;
    }

    // Only home team captain can reset rounds
    if (!isUserHomeTeamCaptain) {
      console.log('User is not home captain, cannot reset rounds');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Update all frames in the round to be unscored
      const updatedFrames = match.frames?.map(f => {
        if (f.round === roundIndex + 1) {
          return {
            ...f,
            winnerPlayerId: null,
            isComplete: false,
            homeScore: 0,
            awayScore: 0
          };
        }
        return f;
      }) || [];

      // Update match with cleared round
      const matchUpdate: Partial<Match> = {
        frames: updatedFrames
      };

      await updateMatch(match.id, matchUpdate);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          ...matchUpdate
        };
      });

      setError('');
      toast.showSuccess(`Round ${roundIndex + 1} has been reset`);
    } catch (err: any) {
      console.error('Error resetting round:', err);
      setError(err.message || 'Failed to reset round.');
      toast.showError(err.message || 'Failed to reset round.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting the entire match
  const handleResetMatch = async (isUserHomeTeamCaptain: boolean) => {
    if (!match?.id || !match.lineupHistory?.[1]) {
      setError('Cannot reset match: Missing essential match data (ID or initial lineup history).');
      return;
    }

    // Only home team captain can reset match
    if (!isUserHomeTeamCaptain) {
      console.log('User is not home captain, cannot reset match');
      return;
    }

    // Use the initial lineups from lineupHistory[1]
    const homeStartingLineup = match.lineupHistory[1].homeLineup || [];
    const awayStartingLineup = match.lineupHistory[1].awayLineup || [];
    // Ensure both lineups are arrays of 4 valid player IDs (no empty strings)
    if (
      homeStartingLineup.length < 4 ||
      awayStartingLineup.length < 4 ||
      homeStartingLineup.some(id => !id) ||
      awayStartingLineup.some(id => !id)
    ) {
      setError('Cannot reset match: Initial lineups are incomplete.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setIsResettingMatch(true); // Keep this flag for potential future use

      // 1. Update match to clear round-specific progress but keep lineups
      const resetUpdate: Partial<Match> = {
        // frames: [], // Defer frame handling to startMatch
        // status: 'in_progress', // Let startMatch handle status
        // currentRound: 1, // Let startMatch handle round
        roundLockedStatus: {},
        homeConfirmedRounds: {},
        awayConfirmedRounds: {},
        homeTeamScore: 0, // Explicitly reset scores
        awayTeamScore: 0,
        // Keep homeLineup and awayLineup as they are
      };
      console.log('handleResetMatch: Clearing round status...', resetUpdate);
      await updateMatch(match.id, resetUpdate);
      console.log('handleResetMatch: Round status cleared.');

      // 2. Call startMatch to re-initialize frames and set status/currentRound
      console.log('handleResetMatch: Calling startMatch to re-initialize frames...');
      await startMatch(match.id, homeStartingLineup, awayStartingLineup);
      console.log('handleResetMatch: startMatch completed.');
      
      // 3. Update local state optimistically (or wait for listener)
      // Fetching latest state might be safer after startMatch
      const latestMatchState = await getMatch(match.id); // Re-fetch latest state
      setMatch(latestMatchState); // Update local state with the fresh data
      // Also reset active round to 1 if setActiveRound is provided
      if (setActiveRound) setActiveRound(1);
      
      // 4. Reset game flow state in the context
      if (gameFlowActions) {
        console.log('handleResetMatch: Resetting game flow context...');
        await gameFlowActions.resetGameFlow();
        console.log('handleResetMatch: Game flow context reset.');
      }

      setShowResetConfirmation(false);
      setError('');
      toast.showSuccess('Match has been reset to Round 1');
    } catch (err: any) {
      console.error('Error resetting match:', err);
      setError(err.message || 'Failed to reset match.');
      toast.showError(err.message || 'Failed to reset match.');
    } finally {
      setLoading(false);
      setIsResettingMatch(false); // Ensure flag is reset
    }
  };

  /**
   * Locks the scores for the current round
   */
  const handleLockRoundScores = async (roundIndex: number) => {
    if (!match?.id) return;

    // Get fresh match data from the database to avoid stale state issues
    console.log('[handleLockRoundScores][Debug] Getting fresh match data from database...');
    const freshMatch = await getMatch(match.id);
    if (!freshMatch) {
      console.error('[handleLockRoundScores][Debug] Could not fetch fresh match data');
      alert('Could not verify match data. Please refresh and try again.');
      return;
    }

    // Add detailed debugging to see what match data we have
    console.log('[handleLockRoundScores][Debug] Called with:', {
      roundIndex,
      matchId: freshMatch.id,
      matchFramesLength: freshMatch.frames?.length || 0,
      usingFreshData: true
    });
    
    // Log the specific frames for this round using fresh data
    const roundFrames = freshMatch.frames?.filter(f => f.round === roundIndex + 1) || [];
    console.log('[handleLockRoundScores][Debug] Round frames (FRESH):', roundFrames.map(f => ({
      frameId: f.frameId,
      round: f.round,
      winnerPlayerId: f.winnerPlayerId,
      isComplete: f.isComplete
    })));

    // Check if the round is actually complete using the working utility function with FRESH data
    const isComplete = isRoundCompleteUtil(freshMatch, roundIndex);
    console.log('[handleLockRoundScores][Debug] isRoundCompleteUtil result (FRESH):', isComplete);
    
    if (!isComplete) {
      console.log('[handleLockRoundScores][Debug] Round not complete, showing alert');
      alert('Cannot lock round until all frames are scored.');
      return;
    }
    
    // Check if the round is already locked
    if (freshMatch?.roundLockedStatus?.[roundIndex]) {
      console.log(`Round ${roundIndex + 1} is already locked.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to lock scores for Round ${roundIndex + 1}? Once locked, scores cannot be changed.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Update the roundLockedStatus map in Firestore
      const updatedRoundLockedStatus = { ...(freshMatch?.roundLockedStatus || {}), [roundIndex]: true };
      await updateMatch(freshMatch.id, { roundLockedStatus: updatedRoundLockedStatus });
      
      // Use gameFlowActions to update the state machine
      gameFlowActions.lockRound(roundIndex);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return { ...prevMatch, roundLockedStatus: updatedRoundLockedStatus };
      });
      
      toast.showSuccess(`Scores for Round ${roundIndex + 1} have been locked.`);
      
    } catch (err: any) {
      console.error('Error locking round scores:', err);
      setError(`Failed to lock Round ${roundIndex + 1}: ${err.message || 'Unknown error'}`);
      toast.showError(`Failed to lock Round ${roundIndex + 1}: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const isFrameInRoundAndPosition = (f: Frame, roundIndex: number, position: Position) => {
    // Check if the frame is in the specified round
    const targetRound = roundIndex + 1;
    if (f.round !== targetRound) return false;
    
    // Convert position (0-3) to both formats
    const homePosition = position + 1;  // Convert to 1-4
    const awayPosition = String.fromCharCode(65 + position);  // Convert to A-D
    
    // Compare with type assertions to match matchUtils.ts pattern
    return (f.homePlayerPosition === homePosition) || (f.awayPlayerPosition === awayPosition);
  };

  // Return all the necessary functions and state
  return {
    editingFrame,
    setEditingFrame,
    selectedWinner,
    setSelectedWinner,
    hoveredFrame,
    setHoveredFrame,
    showResetConfirmation,
    setShowResetConfirmation,
    isFrameScored,
    getFrameWinner,
    isRoundComplete,
    handleFrameClick,
    handleSelectWinner,
    handleResetRound,
    handleResetMatch,
    handleLockRoundScores,
    clearFrame,
    handleResetFrame
  };
};