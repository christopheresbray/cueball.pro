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
    // Only use the new per-round confirmation fields
    const homeConfirmedRounds = matchData.homeConfirmedRounds || {};
    const awayConfirmedRounds = matchData.awayConfirmedRounds || {};
    const isHomeConfirmed = !!homeConfirmedRounds[currentRoundIndex];
    const isAwayConfirmed = !!awayConfirmedRounds[currentRoundIndex];
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
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup
      };
      await updateMatch(match.id, updateData);
      setMatch(prevMatch => prevMatch ? { ...prevMatch, ...updateData } : null);
      const newHomeConfirmedState = { ...homeTeamConfirmed, [roundIndex]: true };
      setHomeTeamConfirmed(newHomeConfirmedState);
      if (awayTeamConfirmed[roundIndex]) {
        console.log('Home confirmed, Away was already confirmed. Advancing round...');
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
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup
      };
      await updateMatch(match.id, updateData);
      setMatch(prevMatch => prevMatch ? { ...prevMatch, ...updateData } : null);
      const newAwayConfirmedState = { ...awayTeamConfirmed, [roundIndex]: true };
      setAwayTeamConfirmed(newAwayConfirmedState);
      if (homeTeamConfirmed[roundIndex]) {
        console.log('Away confirmed, Home was already confirmed. Advancing round...');
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
      const homeConfirmedRounds = { ...(match.homeConfirmedRounds || {}) };
      delete homeConfirmedRounds[roundIndex];
      const updateData: Partial<Match> = {
        homeConfirmedRounds
      };
      await updateMatch(match.id, updateData);
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          homeConfirmedRounds
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
      const awayConfirmedRounds = { ...(match.awayConfirmedRounds || {}) };
      delete awayConfirmedRounds[roundIndex];
      const updateData: Partial<Match> = {
        awayConfirmedRounds
      };
      await updateMatch(match.id, updateData);
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          awayConfirmedRounds
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
    console.log('[advanceToNextRound] called with roundIndex:', roundIndex, 'match id:', match?.id);
    if (!match?.id) return;
    try {
      console.log(`Advancing from round ${roundIndex + 1} to ${roundIndex + 2}`);
      const updateData: Partial<Match> = {
        currentRound: roundIndex + 2,
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup,
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup
      };
      console.log('Updating match to advance round:', updateData);
      await updateMatch(match.id, updateData);
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        console.log('Advancing local round state to:', roundIndex + 2);
        return {
          ...prevMatch,
          currentRound: roundIndex + 2,
          homeLineup: updateData.homeLineup || prevMatch.homeLineup,
          awayLineup: updateData.awayLineup || prevMatch.awayLineup
        };
      });
      console.log('FORCE REFRESH: Setting active round to:', roundIndex + 2);
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