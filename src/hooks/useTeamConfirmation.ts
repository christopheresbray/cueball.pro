import { useState } from 'react';
import { 
  Match,
  updateMatch
} from '../services/databaseService';

/**
 * Custom hook to handle team confirmations between rounds
 */
export const useTeamConfirmation = (
  match: Match | null,
  setMatch: React.Dispatch<React.SetStateAction<Match | null>>,
  lineupHistory: {[round: number]: {homeLineup: string[], awayLineup: string[]}},
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void
) => {
  const [homeTeamConfirmed, setHomeTeamConfirmed] = useState<{[round: number]: boolean}>({});
  const [awayTeamConfirmed, setAwayTeamConfirmed] = useState<{[round: number]: boolean}>({});

  /**
   * Update confirmation states based on match data
   */
  const updateConfirmationStates = (matchData: Match) => {
    const currentRoundIndex = (matchData.currentRound || 1) - 1;
    
    // First check for the per-round confirmation fields (new approach)
    const homeConfirmedRounds = matchData.homeConfirmedRounds || {};
    const awayConfirmedRounds = matchData.awayConfirmedRounds || {};
    
    // Also check the old confirmation fields for backwards compatibility
    const isHomeConfirmed = !!homeConfirmedRounds[currentRoundIndex] || matchData.homeTeamConfirmedNextRound || false;
    const isAwayConfirmed = !!awayConfirmedRounds[currentRoundIndex] || matchData.awayTeamConfirmedNextRound || false;
    
    // Set local state with combined confirmation status
    setHomeTeamConfirmed(prev => ({
      ...prev,
      [currentRoundIndex]: isHomeConfirmed
    }));
    
    setAwayTeamConfirmed(prev => ({
      ...prev,
      [currentRoundIndex]: isAwayConfirmed
    }));
    
    return { isHomeConfirmed, isAwayConfirmed, currentRoundIndex };
  };

  /**
   * Handle home team confirmation
   */
  const handleHomeTeamConfirm = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      setLoading(true);
      console.log('Confirming home team lineup for round:', roundIndex);
      
      // Create a new field that stores confirmation by round number
      const homeConfirmedRounds = { ...(match.homeConfirmedRounds || {}) };
      homeConfirmedRounds[roundIndex] = true;
      
      // Save both the new field and the legacy field
      const updateData: Partial<Match> = {
        homeConfirmedRounds,
        homeTeamConfirmedNextRound: true,  // Keep the legacy field for compatibility
        // Save the lineup for the next round
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup
      };
      
      console.log('Updating match with data:', updateData);
      await updateMatch(match.id, updateData);
      
      // Update local state for immediate UI feedback
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          homeConfirmedRounds,
          homeTeamConfirmedNextRound: true
        };
      });
      
      setHomeTeamConfirmed(prev => ({
        ...prev,
        [roundIndex]: true
      }));
      
      // Check if both teams have confirmed this round
      const awayConfirmedRounds = match.awayConfirmedRounds || {};
      const isAwayConfirmed = !!awayConfirmedRounds[roundIndex] || match.awayTeamConfirmedNextRound || false;
      
      if (isAwayConfirmed) {
        console.log('Both teams have confirmed, advancing round...');
        await advanceToNextRound(roundIndex);
      }
    } catch (err: any) {
      console.error('Error confirming home team lineup:', err);
      setError(err.message || 'Failed to confirm lineup');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle away team confirmation
   */
  const handleAwayTeamConfirm = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      setLoading(true);
      console.log('Confirming away team lineup for round:', roundIndex);
      
      // Create a new field that stores confirmation by round number
      const awayConfirmedRounds = { ...(match.awayConfirmedRounds || {}) };
      awayConfirmedRounds[roundIndex] = true;
      
      // Save both the new field and the legacy field
      const updateData: Partial<Match> = {
        awayConfirmedRounds,
        awayTeamConfirmedNextRound: true,  // Keep the legacy field for compatibility
        // Save the lineup for the next round
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup
      };
      
      console.log('Updating match with data:', updateData);
      await updateMatch(match.id, updateData);
      
      // Update local state for immediate UI feedback
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          awayConfirmedRounds,
          awayTeamConfirmedNextRound: true
        };
      });
      
      setAwayTeamConfirmed(prev => ({
        ...prev,
        [roundIndex]: true
      }));
      
      // Check if both teams have confirmed this round
      const homeConfirmedRounds = match.homeConfirmedRounds || {};
      const isHomeConfirmed = !!homeConfirmedRounds[roundIndex] || match.homeTeamConfirmedNextRound || false;
      
      if (isHomeConfirmed) {
        console.log('Both teams have confirmed, advancing round...');
        await advanceToNextRound(roundIndex);
      }
    } catch (err: any) {
      console.error('Error confirming away team lineup:', err);
      setError(err.message || 'Failed to confirm lineup');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle home team edit
   */
  const handleHomeTeamEdit = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      setLoading(true);
      
      // Remove this round's confirmation
      const homeConfirmedRounds = { ...(match.homeConfirmedRounds || {}) };
      delete homeConfirmedRounds[roundIndex];
      
      const updateData: Partial<Match> = {
        homeConfirmedRounds,
        homeTeamConfirmedNextRound: false  // Clear the legacy field too
      };
      
      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          homeConfirmedRounds,
          homeTeamConfirmedNextRound: false
        };
      });
      
      setHomeTeamConfirmed(prev => ({
        ...prev,
        [roundIndex]: false
      }));
    } catch (err: any) {
      console.error('Error editing home team lineup:', err);
      setError(err.message || 'Failed to edit lineup');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle away team edit
   */
  const handleAwayTeamEdit = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      setLoading(true);
      
      // Remove this round's confirmation
      const awayConfirmedRounds = { ...(match.awayConfirmedRounds || {}) };
      delete awayConfirmedRounds[roundIndex];
      
      const updateData: Partial<Match> = {
        awayConfirmedRounds,
        awayTeamConfirmedNextRound: false  // Clear the legacy field too
      };
      
      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          awayConfirmedRounds,
          awayTeamConfirmedNextRound: false
        };
      });
      
      setAwayTeamConfirmed(prev => ({
        ...prev,
        [roundIndex]: false
      }));
    } catch (err: any) {
      console.error('Error editing away team lineup:', err);
      setError(err.message || 'Failed to edit lineup');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Advance to the next round after both teams confirm
   */
  const advanceToNextRound = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      console.log('Advancing to next round...');
      
      // First step: Update match with new round and lineups
      // IMPORTANT: Don't reset confirmation flags yet - this will allow them to persist correctly
      const updateData: Partial<Match> = {
        currentRound: roundIndex + 2,
        roundScored: true,
        // Store the confirmed lineups
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup,
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup
      };

      console.log('Updating match to advance round:', updateData);
      await updateMatch(match.id, updateData);
      
      // Second step (delayed): Only after the round is advanced, reset the confirmation flags
      // This second update ensures confirmation states don't get lost due to race conditions
      const resetConfirmationData: Partial<Match> = {
        homeTeamConfirmedNextRound: false,
        awayTeamConfirmedNextRound: false,
        homeConfirmedRounds: { 
          ...(match.homeConfirmedRounds || {}),
          [roundIndex]: false 
        },
        awayConfirmedRounds: { 
          ...(match.awayConfirmedRounds || {}),
          [roundIndex]: false 
        }
      };
      
      console.log('Resetting confirmation flags:', resetConfirmationData);
      await updateMatch(match.id, resetConfirmationData);
      
    } catch (err: any) {
      console.error('Error advancing round:', err);
      setError(err.message || 'Failed to advance round');
    }
  };

  /**
   * Generic team confirm handler
   */
  const handleTeamConfirm = (isHomeTeam: boolean, roundIndex: number) => {
    if (isHomeTeam) {
      handleHomeTeamConfirm(roundIndex);
    } else {
      handleAwayTeamConfirm(roundIndex);
    }
  };

  /**
   * Generic team edit handler
   */
  const handleTeamEdit = (isHomeTeam: boolean, roundIndex: number) => {
    if (isHomeTeam) {
      handleHomeTeamEdit(roundIndex);
    } else {
      handleAwayTeamEdit(roundIndex);
    }
  };

  return {
    homeTeamConfirmed, setHomeTeamConfirmed,
    awayTeamConfirmed, setAwayTeamConfirmed,
    updateConfirmationStates,
    handleHomeTeamConfirm,
    handleAwayTeamConfirm,
    handleHomeTeamEdit,
    handleAwayTeamEdit,
    advanceToNextRound,
    handleTeamConfirm,
    handleTeamEdit
  };
}; 