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
      const homeConfirmedRounds = { ...(match.homeConfirmedRounds || {}) };
      homeConfirmedRounds[roundIndex] = true;
      
      const updateData: Partial<Match> = {
        homeConfirmedRounds,
        homeTeamConfirmedNextRound: true, 
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup
      };
      
      await updateMatch(match.id, updateData);
      
      // Update local match state
      setMatch(prevMatch => prevMatch ? { ...prevMatch, ...updateData } : null);
      
      // Update local confirmation state *before* checking the other team
      const newHomeConfirmedState = { ...homeTeamConfirmed, [roundIndex]: true };
      setHomeTeamConfirmed(newHomeConfirmedState);
      
      // Check if away team is *already* confirmed (using local state)
      if (awayTeamConfirmed[roundIndex]) {
        console.log('Home confirmed, Away was already confirmed. Advancing round...');
        // Critical: Force immediate round advancement to prevent UI issues
        await advanceToNextRound(roundIndex);
      } else {
        console.log('Home confirmed, still waiting for Away team confirmation');
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
      const awayConfirmedRounds = { ...(match.awayConfirmedRounds || {}) };
      awayConfirmedRounds[roundIndex] = true;
      
      const updateData: Partial<Match> = {
        awayConfirmedRounds,
        awayTeamConfirmedNextRound: true,
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup
      };
      
      await updateMatch(match.id, updateData);
      
      // Update local match state
      setMatch(prevMatch => prevMatch ? { ...prevMatch, ...updateData } : null);
      
      // Update local confirmation state *before* checking the other team
      const newAwayConfirmedState = { ...awayTeamConfirmed, [roundIndex]: true };
      setAwayTeamConfirmed(newAwayConfirmedState);
      
      // Check if home team is *already* confirmed (using local state)
      if (homeTeamConfirmed[roundIndex]) {
        console.log('Away confirmed, Home was already confirmed. Advancing round...');
        // Critical: Force immediate round advancement to prevent UI issues
        await advanceToNextRound(roundIndex);
      } else {
        console.log('Away confirmed, still waiting for Home team confirmation');
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
      console.log(`Advancing from round ${roundIndex + 1} to ${roundIndex + 2}`);
      
      // Step 1: Update currentRound and save confirmed lineups
      const updateData: Partial<Match> = {
        currentRound: roundIndex + 2,
        // roundScored: true, // This flag seems redundant if currentRound advances
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup,
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup
      };
      console.log('Updating match to advance round:', updateData);
      await updateMatch(match.id, updateData);
      
      // Step 2: Reset legacy confirmation flags (if still needed), but DO NOT reset the round-specific ones.
      // The homeConfirmedRounds[roundIndex] and awayConfirmedRounds[roundIndex] flags should remain true.
      const resetLegacyFlags: Partial<Match> = {
        homeTeamConfirmedNextRound: false,
        awayTeamConfirmedNextRound: false,
        // NO reset for homeConfirmedRounds[roundIndex]
        // NO reset for awayConfirmedRounds[roundIndex]
      };
      
      // Only update if there are legacy flags to reset
      if (match.homeTeamConfirmedNextRound || match.awayTeamConfirmedNextRound) {
          console.log('Resetting legacy confirmation flags:', resetLegacyFlags);
          await updateMatch(match.id, resetLegacyFlags);
      }

      // Update local state immediately after advancing round - CRITICAL
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        console.log("Advancing local round state to:", roundIndex + 2);
        return {
          ...prevMatch,
          currentRound: roundIndex + 2, // Ensure local state reflects the advance
          // Update lineups if they changed
          homeLineup: updateData.homeLineup || prevMatch.homeLineup,
          awayLineup: updateData.awayLineup || prevMatch.awayLineup,
          // Clear legacy flags locally too
          homeTeamConfirmedNextRound: false,
          awayTeamConfirmedNextRound: false
        };
      });
      
      // Force the local state to refresh immediately
      console.log("FORCE REFRESH: Setting active round to:", roundIndex + 2);
      
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