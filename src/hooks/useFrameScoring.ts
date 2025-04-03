import { useState } from 'react';
import { 
  Match,
  Frame,
  updateMatch,
  createDocument,
  deleteFramesForMatch
} from '../services/databaseService';

/**
 * Custom hook to handle frame scoring functionality
 */
export const useFrameScoring = (
  match: Match | null, 
  setMatch: React.Dispatch<React.SetStateAction<Match | null>>,
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void
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

  // Helper function to check if all frames in a round are scored
  const isRoundComplete = (roundIndex: number): boolean => {
    return Array.from({ length: 4 }).every((_, position) => 
      isFrameScored(roundIndex, position)
    );
  };

  // Handle clicking on a frame
  const handleFrameClick = (round: number, position: number, event?: React.MouseEvent | React.TouchEvent) => {
    // Don't call preventDefault or stopPropagation here as it blocks other interactions
    if (event) {
      event.preventDefault();
    }
    
    console.log('Frame clicked:', { round, position });
    
    // Only home team captain can edit frames (this check is now redundant if the button is disabled for non-captains)
    if (!match?.homeTeamId) {
      console.log('No match found');
      return;
    }

    // Check if this frame is already scored
    const isScored = isFrameScored(round, position);
    
    if (isScored) {
      // For already scored frames, ask if the user wants to reset the frame
      if (window.confirm('This frame already has a result. Do you want to reset it?')) {
        handleResetFrame(round, position);
      }
      return;
    }

    // If we're already editing this frame, cancel the edit
    if (editingFrame?.round === round && editingFrame?.position === position) {
      console.log('Already editing this frame, canceling edit');
      setEditingFrame(null);
      return;
    }

    // For unscored frames, proceed with editing
    setEditingFrame({ round, position });
    setSelectedWinner('');
  };

  // Handle selecting a winner for a frame
  const handleSelectWinner = async (round: number, position: number, winnerId: string) => {
    console.log('handleSelectWinner called:', { round, position, winnerId });
    if (!match?.id) {
      console.log('No match ID found');
      setError('Match ID not found. Please refresh the page.');
      return;
    }

    if (!winnerId) {
      console.log('No winner selected');
      setError('Please select a winner.');
      return;
    }

    try {
      // Set loading state first, before any async operations
      setLoading(true);
      
      // Immediately clear the editing state for better mobile UX
      setEditingFrame(null);
      const frameId = `${round}-${position}`;
      console.log('Creating frame with ID:', frameId);
      const existingFrameResults = match.frameResults || {};
      
      // Get the player IDs using the existing match data
      let homePlayerId: string;
      let awayPlayerId: string;
      
      if (match.homeLineup && match.awayLineup) {
        // For home team, use the position as is
        homePlayerId = match.homeLineup[position] || '';
        
        // For away team, calculate the rotated position based on the round
        const awayPosition = round === 0 ? position :
                            round === 1 ? (position + 1) % 4 :
                            round === 2 ? (position + 2) % 4 :
                                        (position + 3) % 4;
        awayPlayerId = match.awayLineup[awayPosition] || '';
      } else {
        homePlayerId = '';
        awayPlayerId = '';
      }
      
      if (!homePlayerId || !awayPlayerId) {
        throw new Error('Missing player information. Please check the lineup.');
      }
      
      console.log('Player IDs:', { homePlayerId, awayPlayerId });

      // Create the frame document with complete data
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
      console.log('Frame data to be created:', frameData);

      // Create the frame document in the database
      const frameRef = await createDocument('frames', frameData);
      console.log('Frame document created:', frameRef);
      
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
        // Set match status to in_progress if it was scheduled
        status: match.status === 'scheduled' ? 'in_progress' : match.status
      };
      console.log('Match update data:', updateData);

      // Check if all frames in the round are completed
      const allFramesInRound = Array.from({ length: 4 }, (_, i) => `${round}-${i}`);
      const roundFrames = allFramesInRound.map(id => {
        // Get frame result from the update data or existing match data
        return updateData.frameResults![id] || match.frameResults?.[id];
      });
      const isRoundComplete = roundFrames.every(frame => frame?.winnerId);
      console.log('Round completion check:', { allFramesInRound, roundFrames, isRoundComplete });

      // If round is complete, update the currentRound and roundScored flags
      if (isRoundComplete) {
        updateData.currentRound = round + 1;
        updateData.roundScored = true;
        
        // Check if the entire match is complete (all 16 frames)
        if (round === 3) {
          const allFrames = Array.from({ length: 4 }, (_, r) => 
            Array.from({ length: 4 }, (_, p) => `${r}-${p}`)
          ).flat();
          
          const allFrameResults = allFrames.map(id => 
            updateData.frameResults![id] || match.frameResults?.[id]
          );
          
          const isMatchComplete = allFrameResults.every(frame => frame?.winnerId);
          
          if (isMatchComplete) {
            updateData.status = 'completed';
          }
        }
      }

      // Update the match in the database
      await updateMatch(match.id, updateData);
      console.log('Match updated successfully');
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: {
            ...(prevMatch.frameResults || {}),
            ...updateData.frameResults
          },
          currentRound: updateData.currentRound || prevMatch.currentRound,
          roundScored: updateData.roundScored || prevMatch.roundScored,
          status: updateData.status || prevMatch.status
        };
      });

      // Reset UI state
      setSelectedWinner('');
      console.log('Frame scoring completed');
      
      // Clear any previous errors
      setError(''); 
    } catch (err: any) {
      console.error('Error submitting frame result:', err);
      setError(err.message || 'Failed to submit frame result. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting a frame
  const handleResetFrame = async (round: number, position: number) => {
    if (!match?.id) return;

    try {
      setLoading(true);
      setError('');
      
      const frameId = `${round}-${position}`;
      console.log(`Resetting frame ${frameId}`);
      
      // Make a copy of the existing frame results
      const existingFrameResults = { ...match.frameResults };
      
      // Remove the frame result
      delete existingFrameResults[frameId];

      const updateData: Partial<Match> = {
        frameResults: existingFrameResults
      };

      // Update the match in the database
      await updateMatch(match.id, updateData);
      console.log(`Frame ${frameId} reset successfully`);
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: existingFrameResults
        };
      });

      // Make sure any dialogs are closed
      setEditingFrame(null);
      setSelectedWinner('');
    } catch (err: any) {
      console.error('Error resetting frame:', err);
      setError(`Failed to reset frame: ${err.message || 'Unknown error'}`);
      
      // Show an alert to make the error more visible
      alert(`Error resetting frame: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting a round
  const handleResetRound = async (roundIndex: number) => {
    if (!match?.id) return;

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
      // Get the original lineups from the first round
      const originalHomeLineup = match.homeLineup?.filter((_, i) => i < 4) || [];
      const originalAwayLineup = match.awayLineup?.filter((_, i) => i < 4) || [];

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
        awayConfirmedRounds: {}
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
    handleResetMatch
  };
}; 