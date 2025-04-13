import { useState } from 'react';
import { 
  Match,
  Frame,
  updateMatch,
  createDocument,
  deleteFramesForMatch
} from '../services/databaseService';
import { getOpponentPosition, calculateMatchScore } from '../utils/matchUtils';
import { useToast } from '../context/ToastContext';
import { useGameFlowActions } from '../hooks/useGameFlowActions';

/**
 * Custom hook to handle frame scoring functionality
 */
export const useFrameScoring = (
  match: Match | null, 
  setMatch: React.Dispatch<React.SetStateAction<Match | null>>,
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void,
  isUserHomeTeamCaptain: boolean
) => {
  // Add useToast hook for notifications
  const toast = useToast();
  // Add GameFlow actions
  const gameFlowActions = useGameFlowActions(match?.id);
  const [editingFrame, setEditingFrame] = useState<{round: number, position: number} | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [hoveredFrame, setHoveredFrame] = useState<{round: number, position: number} | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Helper function to check if a frame is scored
  const isFrameScored = (round: number, position: number): boolean => {
    if (!match?.frameResults) return false;
    const frameId = `${round}-${position}`;
    return !!match.frameResults[frameId]?.winnerId;
  };

  // Helper function to get the winner of a frame
  const getFrameWinner = (round: number, position: number): string | null => {
    if (!match?.frameResults) return null;
    const frameId = `${round}-${position}`;
    return match.frameResults[frameId]?.winnerId || null;
  };

  /**
   * Check if all frames in a round are scored
   */
  const isRoundComplete = (roundIndex: number): boolean => {
    if (!match?.frameResults) return false;
    
    const isComplete = Array.from({ length: 4 }).every((_, position) => {
      const frameId = `${roundIndex}-${position}`;
      return !!match.frameResults?.[frameId]?.winnerId;
    });
    
    return isComplete;
  };

  // Handle clicking on a frame
  const handleFrameClick = (round: number, position: number, event?: React.MouseEvent | React.TouchEvent) => {
    if (event) {
      event.preventDefault();
    }
    
    // Check if the round is locked - if so, prevent editing
    if (match?.roundLockedStatus?.[round]) {
      console.log(`Round ${round + 1} is locked, cannot edit frames.`);
      alert(`Round ${round + 1} scores are locked and cannot be changed.`);
      return;
    }
    
    // Only home team captain can edit frames 
    // (This is mostly handled by UI disabling, but keep for safety)
    if (!match?.homeTeamId) {
      console.log('No match found or user not home captain');
      return;
    }

    const isScored = isFrameScored(round, position);
    
    if (isScored) {
      // Only allow reset if the round is NOT locked
      if (window.confirm('This frame already has a result. Do you want to reset it?')) {
        handleResetFrame(round, position);
      }
      return;
    }

    if (editingFrame?.round === round && editingFrame?.position === position) {
      setEditingFrame(null);
      return;
    }

    setEditingFrame({ round, position });
    setSelectedWinner('');
  };

  // Handle selecting a winner for a frame
  const handleSelectWinner = async (round: number, position: number, winnerId: string) => {
    if (!match?.id) return;
    if (!winnerId) return;

    // Prevent scoring if round is locked
    if (match?.roundLockedStatus?.[round]) {
      setError(`Round ${round + 1} is locked. Cannot score frame.`);
      return;
    }

    try {
      setLoading(true);
      setEditingFrame(null);
      
      // Important: round is 0-indexed in code, but 1-indexed in UI
      const frameId = `${round}-${position}`;
      console.log(`Creating frame result for frameId: ${frameId} (Round ${round+1}, Position ${position})`);
      
      const existingFrameResults = match.frameResults || {};
      
      // Get correct player IDs from the current round's lineup history
      const roundNumber = round + 1; // Convert to 1-indexed round number
      
      // For home player, we need to check lineup history for this round
      let homePlayerId = '';
      let awayPlayerId = '';
      
      // First check if we have lineup history for this round
      if (match.lineupHistory && match.lineupHistory[roundNumber]) {
        homePlayerId = match.lineupHistory[roundNumber].homeLineup[position] || '';
        
        // For away team, need to get the correct rotated position
        const awayPosition = getOpponentPosition(roundNumber, position, false);
        awayPlayerId = match.lineupHistory[roundNumber].awayLineup[awayPosition] || '';
        
        console.log(`Getting players from lineup history - Round ${roundNumber}:`, { 
          homePos: position, 
          awayPos: awayPosition,
          homePlayerId, 
          awayPlayerId 
        });
      } else {
        // Fallback to basic lineup for round 1 or if no history
        homePlayerId = match.homeLineup?.[position] || '';
        
        // For away team in round 1, positions are 1-to-1
        // For later rounds, use rotation pattern
        const awayPosition = roundNumber === 1 ? position : getOpponentPosition(roundNumber, position, false);
        awayPlayerId = match.awayLineup?.[awayPosition] || '';
        
        console.log(`Getting players from basic lineup - Round ${roundNumber}:`, { 
          homePos: position, 
          awayPos: awayPosition,
          homePlayerId, 
          awayPlayerId 
        });
      }
      
      if (!homePlayerId || !awayPlayerId) { 
        throw new Error('Missing player ID in lineup.'); 
      }

      // Determine who won (home or away)
      let homeWon = winnerId === homePlayerId;
      let awayWon = winnerId === awayPlayerId;
      
      // Add detailed logging for player ID matching (for all rounds)
      console.log('🔍 Winner validation details:', {
        winnerId,
        homePlayerId,
        awayPlayerId,
        round: roundNumber,
        position,
        homeWon,
        awayWon
      });
      
      // IMPROVED VALIDATION: If neither player matched exactly, check if the winner ID is 
      // actually in the lineup history for this round at ANY position
      if (!homeWon && !awayWon) {
        // Get all player IDs in this round from both teams
        const allHomePlayerIds = match.lineupHistory?.[roundNumber]?.homeLineup || match.homeLineup || [];
        const allAwayPlayerIds = match.lineupHistory?.[roundNumber]?.awayLineup || match.awayLineup || [];
        
        // Check if winner ID is in either lineup
        if (allHomePlayerIds.includes(winnerId)) {
          homeWon = true;
          awayWon = false;
          console.log(`Winner ID ${winnerId} found in home lineup at different position, counting as home win`);
        } else if (allAwayPlayerIds.includes(winnerId)) {
          homeWon = false;
          awayWon = true;
          console.log(`Winner ID ${winnerId} found in away lineup at different position, counting as away win`);
        } else {
          console.error('Winner ID does not match any player in this round:', {
            winnerId,
            homeLineup: allHomePlayerIds,
            awayLineup: allAwayPlayerIds
          });
          throw new Error('Winner ID does not match either player');
        }
      }
      
      console.log(`Setting winner for frame ${frameId}: ${winnerId} (${homeWon ? 'Home' : 'Away'} team)`);

      const frameData: Frame = {
        matchId: match.id,
        round: round,
        position: position,
        homePlayerId: homePlayerId,
        awayPlayerId: awayPlayerId,
        winnerId: winnerId,
        seasonId: match.seasonId,
        homeScore: homeWon ? 1 : 0,
        awayScore: awayWon ? 1 : 0
      };
      
      // Log the frame data to verify it's correct
      console.log('Creating frame with data:', frameData);
      
      await createDocument('frames', frameData);
      
      // Prepare data for updating the match
      const updateData: Partial<Match> = {
        frameResults: {
          ...existingFrameResults,
          [frameId]: {
            winnerId: winnerId,
            homeScore: homeWon ? 1 : 0,
            awayScore: awayWon ? 1 : 0,
          },
        },
        status: match.status === 'scheduled' ? 'in_progress' : match.status
      };

      // Log the frame results to verify they're correct
      console.log('Frame results after update:', updateData.frameResults);

      // Check if the round is now complete using updated data
      const isRoundNowComplete = Array.from({ length: 4 }).every((_, pos) => {
        const checkFrameId = `${round}-${pos}`;
        return !!updateData.frameResults?.[checkFrameId]?.winnerId;
      });
      console.log('Round completion check (using updated data):', { round, isRoundNowComplete });

      // Check if the entire match is complete (all 16 frames)
      if (round === 3 && isRoundNowComplete) {
        const allFrames = Array.from({ length: 16 }, (_, i) => {
          const r = Math.floor(i / 4);
          const p = i % 4;
          return `${r}-${p}`;
        });
        const allFrameResults = allFrames.map(id => updateData.frameResults?.[id]);
        const isMatchComplete = allFrameResults.every(frame => frame?.winnerId);
        
        if (isMatchComplete) {
          console.log('Match is complete. Setting status to completed.');
          updateData.status = 'completed';
          // REMOVE automatic locking of final round - require manual locking just like other rounds
          // DO NOT set roundLockedStatus for round 3 (final round)
        }
      }

      await updateMatch(match.id, updateData);
      
      // Update local match state with the new frame result
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        
        const updatedMatch = {
          ...prevMatch,
          frameResults: { ...(prevMatch.frameResults || {}), ...updateData.frameResults },
          status: updateData.status || prevMatch.status,
          roundLockedStatus: updateData.roundLockedStatus || prevMatch.roundLockedStatus
        };
        
        // Log the match score calculation
        const score = calculateMatchScore(updatedMatch);
        console.log(`Updated match score: Home ${score.home} - Away ${score.away}`);
        
        return updatedMatch;
      });

      setSelectedWinner('');
      setError(''); 
    } catch (err: any) {
      console.error('Error submitting frame result:', err);
      setError(err.message || 'Failed to submit frame result.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting a frame
  const handleResetFrame = async (round: number, position: number) => {
    if (!match?.id) return;
    
    // Prevent reset if round is locked
    if (match?.roundLockedStatus?.[round]) {
      alert(`Round ${round + 1} scores are locked and cannot be reset.`);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const frameId = `${round}-${position}`;
      const existingFrameResults = { ...match.frameResults };
      delete existingFrameResults[frameId];
      const updateData: Partial<Match> = { frameResults: existingFrameResults };

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return { ...prevMatch, frameResults: existingFrameResults };
      });

      setEditingFrame(null);
      setSelectedWinner('');
    } catch (err: any) {
      console.error('Error resetting frame:', err);
      setError(`Failed to reset frame: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting a round - ONLY ALLOW if not locked
  const handleResetRound = async (roundIndex: number) => {
    if (!match?.id) return;
    
    // Prevent reset if round is locked
    if (match?.roundLockedStatus?.[roundIndex]) {
      alert(`Round ${roundIndex + 1} scores are locked and cannot be reset.`);
      return;
    }

    try {
      // Find all frames in this round
      const roundFrameIds = Array.from({ length: 4 }, (_, position) => `${roundIndex}-${position}`);
      const existingFrameResults = { ...match.frameResults };
      
      // Remove all frames in this round
      roundFrameIds.forEach(frameId => {
        if (existingFrameResults[frameId]) {
          delete existingFrameResults[frameId];
        }
      });

      const updateData: Partial<Match> = {
        frameResults: existingFrameResults,
        // Reset current round if needed
        ...(match.currentRound && match.currentRound > roundIndex + 1 ? { currentRound: roundIndex + 1 } : {})
      };

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: existingFrameResults,
          ...(prevMatch.currentRound && prevMatch.currentRound > roundIndex + 1 ? { currentRound: roundIndex + 1 } : {})
        };
      });

      // Reset editing state
      setEditingFrame(null);
    } catch (err: any) {
      console.error('Error resetting round:', err);
      setError(err.message || 'Failed to reset round');
    }
  };

  // Handle resetting the entire match
  const handleResetMatch = async (isUserHomeTeamCaptain: boolean) => {
    if (!match?.id || !isUserHomeTeamCaptain) return;

    try {
      setLoading(true);
      console.log("Starting match reset process");
      
      // Get the original starting lineups only
      const homeStartingFour = match.homeLineup?.slice(0, 4) || [];
      const awayStartingFour = match.awayLineup?.slice(0, 4) || [];
      
      // Step 1: Delete all frames from the database for this match
      try {
        const deletedCount = await deleteFramesForMatch(match.id);
        console.log(`Deleted ${deletedCount} frames for match ${match.id}`);
      } catch (error: any) {
        console.error('Error deleting frames:', error);
        throw new Error(`Failed to delete frames: ${error.message || 'Unknown error'}`);
      }
      
      // Step 2: Prepare the complete reset data structure
      const updateData: Partial<Match> = {
        frameResults: {},
        currentRound: 1,
        roundScored: false,
        status: 'in_progress',
        // Only keep the starting four players instead of all players
        homeLineup: homeStartingFour,
        awayLineup: awayStartingFour,
        // Reset ALL confirmation states
        homeTeamConfirmedNextRound: false,
        awayTeamConfirmedNextRound: false,
        homeConfirmedRounds: {},
        awayConfirmedRounds: {},
        roundLockedStatus: {},
        // Very important: Reset lineup history to ONLY include round 1
        lineupHistory: {
          1: {
            homeLineup: homeStartingFour,
            awayLineup: awayStartingFour
          }
        }
      };

      console.log("Resetting match with clean starting lineups:", {
        homeLineup: homeStartingFour,
        awayLineup: awayStartingFour
      });

      // Step 3: Update the match in the database
      await updateMatch(match.id, updateData);
      
      // Step 4: Update local state comprehensively
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          ...updateData
        };
      });

      // Step 5: Reset GameFlow state to ensure everything is in sync
      if (gameFlowActions?.resetGameFlow) {
        await gameFlowActions.resetGameFlow();
      }

      // Step 6: Explicitly reset related local states across hooks
      // Reset editing state
      setEditingFrame(null);
      setSelectedWinner('');
      setHoveredFrame(null);
      
      // Reset any error message
      setError('');
      
      // Reset the confirmation dialog
      setShowResetConfirmation(false);
      
      // Provide user feedback via Toast
      if (toast?.showSuccess) {
        toast.showSuccess('Match has been reset successfully');
      } else {
        // Fallback to console if toast not available
        console.log('Match reset successful');
      }
      
      // Log completion for debugging
      console.log('Match reset complete', { matchId: match.id });
    } catch (err: any) {
      console.error('Error resetting match:', err);
      setError(err.message || 'Failed to reset match');
      
      // Provide error feedback to user
      if (toast?.showError) {
        toast.showError(`Failed to reset match: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // *** NEW FUNCTION: Lock Round Scores ***
  const handleLockRoundScores = async (roundIndex: number) => {
    if (!match?.id) return;
    
    // Only home captain can lock scores
    if (!isUserHomeTeamCaptain) {
      setError("Only the home team captain can lock round scores.");
      return;
    }
    
    // Check if round is actually complete
    if (!isRoundComplete(roundIndex)) {
      setError("Cannot lock scores: Not all frames in this round are completed.");
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const currentLockedStatus = { ...(match.roundLockedStatus || {}) };
      currentLockedStatus[roundIndex] = true;
      
      const updateData: Partial<Match> = {
        roundLockedStatus: currentLockedStatus
      };
      
      await updateMatch(match.id, updateData);
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          roundLockedStatus: currentLockedStatus
        };
      });
      
      console.log(`Round ${roundIndex + 1} scores locked.`);
      
    } catch (err: any) {
      console.error(`Error locking scores for round ${roundIndex + 1}:`, err);
      setError(err.message || 'Failed to lock scores.');
    } finally {
      setLoading(false);
    }
  };

  return {
    editingFrame, setEditingFrame,
    selectedWinner, setSelectedWinner,
    hoveredFrame, setHoveredFrame,
    showResetConfirmation, setShowResetConfirmation,
    isFrameScored,
    getFrameWinner,
    isRoundComplete,
    handleFrameClick,
    handleSelectWinner,
    handleResetFrame,
    handleResetRound,
    handleResetMatch,
    handleLockRoundScores
  };
}; 