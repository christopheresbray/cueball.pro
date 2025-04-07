import { useState } from 'react';
import { 
  Match,
  Frame,
  updateMatch,
  createDocument,
  deleteFramesForMatch
} from '../services/databaseService';
import { getOpponentPosition } from '../utils/matchUtils';

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
      const frameId = `${round}-${position}`;
      const existingFrameResults = match.frameResults || {};
      
      let homePlayerId: string;
      let awayPlayerId: string;
      if (match.homeLineup && match.awayLineup) {
        homePlayerId = match.homeLineup[position] || '';
        const awayPosition = getOpponentPosition(round + 1, position, false);
        awayPlayerId = match.awayLineup[awayPosition] || '';
      } else { throw new Error('Missing lineup.'); }
      if (!homePlayerId || !awayPlayerId) { throw new Error('Missing player ID in lineup.'); }

      const frameData: Frame = {
        matchId: match.id,
        round: round,
        position: position,
        homePlayerId: homePlayerId,
        awayPlayerId: awayPlayerId,
        winnerId: winnerId,
        seasonId: match.seasonId,
        homeScore: winnerId === homePlayerId ? 1 : 0,
        awayScore: winnerId === awayPlayerId ? 1 : 0
      };
      await createDocument('frames', frameData);
      
      // Prepare data for updating the match
      const updateData: Partial<Match> = {
        frameResults: {
          ...existingFrameResults,
          [frameId]: {
            winnerId: winnerId,
            homeScore: winnerId === homePlayerId ? 1 : 0,
            awayScore: winnerId === awayPlayerId ? 1 : 0,
          },
        },
        status: match.status === 'scheduled' ? 'in_progress' : match.status
      };

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
          // Optionally lock the final round automatically
          const currentLockedStatus = { ...(match.roundLockedStatus || {}) };
          currentLockedStatus[3] = true;
          updateData.roundLockedStatus = currentLockedStatus;
        }
      }

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: { ...(prevMatch.frameResults || {}), ...updateData.frameResults },
          status: updateData.status || prevMatch.status,
          roundLockedStatus: updateData.roundLockedStatus || prevMatch.roundLockedStatus
        };
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
      // Preserve the full lineups including substitutes - don't filter them
      const originalHomeLineup = match.homeLineup || [];
      const originalAwayLineup = match.awayLineup || [];

      // Delete all frames from the database for this match
      await deleteFramesForMatch(match.id);
      console.log(`Deleted frames for match ${match.id}`);

      // Update match to clear frame results and reset round state
      const updateData: Partial<Match> = {
        frameResults: {},
        currentRound: 1,
        roundScored: false,
        status: 'in_progress',
        homeLineup: originalHomeLineup,
        awayLineup: originalAwayLineup,
        // Reset ALL confirmation states, both legacy and new
        homeTeamConfirmedNextRound: false,
        awayTeamConfirmedNextRound: false,
        homeConfirmedRounds: {},
        awayConfirmedRounds: {},
        roundLockedStatus: {}
      };

      await updateMatch(match.id, updateData);
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          ...updateData
        };
      });
      
      // Close the confirmation dialog
      setShowResetConfirmation(false);
    } catch (err: any) {
      console.error('Error resetting match:', err);
      setError(err.message || 'Failed to reset match');
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