// src/hooks/useSubstitutions.ts
import { useState } from 'react';
import { 
  Match,
  Player,
  updateMatch
} from '../services/databaseService';
import { getOpponentPosition } from '../utils/matchUtils';

/**
 * Custom hook to handle player substitutions
 */
export const useSubstitutions = (
  match: Match | null,
  homePlayers: Player[],
  awayPlayers: Player[],
  setMatch: React.Dispatch<React.SetStateAction<Match | null>>,
  setError: (error: string) => void
) => {
  const [lineupHistory, setLineupHistory] = useState<{
    [round: number]: {
      homeLineup: string[];
      awayLineup: string[];
    };
  }>({});
  const [openLineupDialog, setOpenLineupDialog] = useState(false);
  const [editingHomeTeam, setEditingHomeTeam] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isConfirmingRound, setIsConfirmingRound] = useState<number | null>(null);

  /**
   * Get player name from ID and team
   */
  const getPlayerName = (playerId: string, isHomeTeam: boolean): string => {
    const players = isHomeTeam ? homePlayers : awayPlayers;
    const player = players.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown Player';
  };

  /**
   * Determine if home team breaks in a specific frame
   */
  const isHomeTeamBreaking = (round: number, position: number): boolean => {
    // Home team breaks in odd-numbered frames (0-based index)
    const frameNumber = (round - 1) * 4 + position;
    return frameNumber % 2 === 0;
  };

  /**
   * Get available substitutes for a round
   */
  const getSubstitutesForRound = (round: number, isHomeTeam: boolean): string[] => {
    // Get all players from the initial lineup
    const allPlayers = isHomeTeam ? match?.homeLineup || [] : match?.awayLineup || [];
    
    // Get the current active players for this round
    const activePlayers = Array.from({ length: 4 }, (_, i) => 
      getPlayerForRound(round, i, isHomeTeam)
    );
    
    // Return players who are not currently active
    return allPlayers.filter(playerId => !activePlayers.includes(playerId));
  };

  /**
   * Get player for a specific round and position
   */
  const getPlayerForRound = (round: number, position: number, isHomeTeam: boolean): string => {
    if (!match) return '';
    
    // For frames that have already been played, we need to return the players who actually played them
    if (match.frameResults) {
      const frameId = `${round-1}-${position}`;
      const frameResult = match.frameResults[frameId];
      
      if (frameResult) {
        // This frame has been played
        // We need to get the players from our lineup history
        // Since frameResults don't store the actual player IDs directly
        const homePlayer = getHomePreviousRoundPlayer(round-1, position);
        const awayPlayer = getAwayPreviousRoundPlayer(round-1, position);
        return isHomeTeam ? homePlayer : awayPlayer;
      }
    }
    
    // For current and future rounds
    
    // For round 1, use the initial lineup
    if (round === 1) {
      if (isHomeTeam) {
        return match.homeLineup?.[position] || '';
      } else {
        return match.awayLineup?.[position] || '';
      }
    }

    // For other rounds, check the lineup history
    if (lineupHistory[round]) {
      if (isHomeTeam) {
        return lineupHistory[round].homeLineup[position];
      } else {
        // Apply the rotation pattern for away team
        const rotatedPosition = getOpponentPosition(round, position, false);
        return lineupHistory[round].awayLineup[rotatedPosition];
      }
    }

    // If we don't have a recorded lineup for this round,
    // look for the most recent recorded lineup before this round
    for (let r = round - 1; r >= 1; r--) {
      if (lineupHistory[r]) {
        if (isHomeTeam) {
          return lineupHistory[r].homeLineup[position];
        } else {
          // Apply the rotation pattern for away team
          const rotatedPosition = getOpponentPosition(round, position, false);
          return lineupHistory[r].awayLineup[rotatedPosition];
        }
      }
    }

    // If no history is found, fall back to the initial lineup
    if (isHomeTeam) {
      return match.homeLineup?.[position] || '';
    } else {
      // Apply the rotation pattern for away team
      const rotatedPosition = getOpponentPosition(round, position, false);
      return match.awayLineup?.[rotatedPosition] || '';
    }
  };

  /**
   * Get home player from previous round
   */
  const getHomePreviousRoundPlayer = (round: number, position: number): string => {
    if (!match) return '';
    
    // If this is a later round, check lineup history first
    if (round > 0 && lineupHistory[round]) {
      return lineupHistory[round].homeLineup[position];
    }
    
    // Otherwise, use the initial lineup
    return match.homeLineup?.[position] || '';
  };
  
  /**
   * Get away player from previous round
   */
  const getAwayPreviousRoundPlayer = (round: number, position: number): string => {
    if (!match) return '';
    
    // If this is a later round, check lineup history first
    if (round > 0 && lineupHistory[round]) {
      return lineupHistory[round].awayLineup[position];
    }
    
    // Otherwise, use the initial lineup
    return match.awayLineup?.[position] || '';
  };

  /**
   * Handle substitution of a player
   */
  const handleConfirmSubstitution = async (position: number, isHomeTeam: boolean, playerId: string, roundIndex: number) => {
    if (!match?.id || !playerId) return;

    try {
      const nextRound = roundIndex + 2;
      
      // Get the current lineup for this round
      let currentHomeLineup = [...(match.homeLineup || [])];
      let currentAwayLineup = [...(match.awayLineup || [])];
      
      // If we have history for the current round, use that instead
      if (lineupHistory[nextRound]) {
        currentHomeLineup = [...lineupHistory[nextRound].homeLineup];
        currentAwayLineup = [...lineupHistory[nextRound].awayLineup];
      } else {
        // If this is the first substitution for this round, 
        // we need to copy the previous round's lineup or the initial lineup
        for (let r = nextRound - 1; r >= 1; r--) {
          if (lineupHistory[r]) {
            currentHomeLineup = [...lineupHistory[r].homeLineup];
            currentAwayLineup = [...lineupHistory[r].awayLineup];
            break;
          }
        }
      }
      
      // Update the appropriate lineup
      if (isHomeTeam) {
        // Store the player being replaced but keep them in the overall lineup
        const replacedPlayer = currentHomeLineup[position];
        currentHomeLineup[position] = playerId;
        
        // Make sure the substituted player isn't lost from the overall lineup
        if (replacedPlayer && !currentHomeLineup.includes(replacedPlayer)) {
          if (match.homeLineup && !match.homeLineup.includes(replacedPlayer)) {
            const updatedHomeLineup = [...match.homeLineup, replacedPlayer];
            await updateMatch(match.id, { homeLineup: updatedHomeLineup });
            setMatch(prevMatch => {
              if (!prevMatch) return null;
              return {
                ...prevMatch,
                homeLineup: updatedHomeLineup
              };
            });
          }
        }
      } else {
        // Store the player being replaced but keep them in the overall lineup
        const replacedPlayer = currentAwayLineup[position];
        currentAwayLineup[position] = playerId;
        
        // Make sure the substituted player isn't lost from the overall lineup
        if (replacedPlayer && !currentAwayLineup.includes(replacedPlayer)) {
          if (match.awayLineup && !match.awayLineup.includes(replacedPlayer)) {
            const updatedAwayLineup = [...match.awayLineup, replacedPlayer];
            await updateMatch(match.id, { awayLineup: updatedAwayLineup });
            setMatch(prevMatch => {
              if (!prevMatch) return null;
              return {
                ...prevMatch,
                awayLineup: updatedAwayLineup
              };
            });
          }
        }
      }

      // Record the lineup for this round in history
      setLineupHistory(prev => ({
        ...prev,
        [nextRound]: {
          homeLineup: currentHomeLineup,
          awayLineup: currentAwayLineup
        }
      }));

    } catch (err: any) {
      console.error('Error making substitution:', err);
      setError(err.message || 'Failed to make substitution');
    }
  };

  /**
   * Handle lineup dialog open
   */
  const handleOpenLineupDialog = (isHomeTeam: boolean) => {
    // Only allow lineup editing if match is still in scheduled status
    if (match?.status !== 'scheduled') {
      setError('Lineup can only be edited before the match has started.');
      return;
    }
    
    setEditingHomeTeam(isHomeTeam);
    setSelectedPlayers(isHomeTeam ? match?.homeLineup || [] : match?.awayLineup || []);
    setOpenLineupDialog(true);
  };

  /**
   * Handle lineup dialog close
   */
  const handleCloseLineupDialog = () => {
    setOpenLineupDialog(false);
    setSelectedPlayers([]);
  };

  /**
   * Handle player selection in lineup dialog
   */
  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSelection = [...prev];
      const index = newSelection.indexOf(playerId);
      if (index === -1) {
        newSelection.push(playerId);
      } else {
        newSelection.splice(index, 1);
      }
      return newSelection;
    });
  };

  /**
   * Handle saving lineup
   */
  const handleSaveLineup = async () => {
    if (!match?.id) return;

    try {
      const updateData: Partial<Match> = {
        [editingHomeTeam ? 'homeLineup' : 'awayLineup']: selectedPlayers
      };

      // If both teams have submitted their lineups, update the match status
      if (
        (editingHomeTeam && match.awayLineup && match.awayLineup.length > 0) ||
        (!editingHomeTeam && match.homeLineup && match.homeLineup.length > 0)
      ) {
        updateData.status = 'in_progress';
      }

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          ...updateData
        };
      });

      handleCloseLineupDialog();
    } catch (err: any) {
      console.error('Error updating lineup:', err);
      setError(err.message || 'Failed to update lineup');
    }
  };

  /**
   * Handle starting the match
   */
  const handleStartMatch = async (isUserHomeTeamCaptain: boolean) => {
    if (!match?.id || !isUserHomeTeamCaptain) return;
    
    // Verify both teams have valid lineups
    if (!match?.homeLineup || match.homeLineup.length < 4 || !match?.awayLineup || match.awayLineup.length < 4) {
      setError('Both teams must set their lineup before starting the match.');
      return;
    }
    
    try {
      // Update match status to in_progress
      const updateData: Partial<Match> = {
        status: 'in_progress',
        currentRound: 1
      };
      
      await updateMatch(match.id, updateData);
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          status: 'in_progress',
          currentRound: 1
        };
      });
      
      setError(''); // Clear any errors
    } catch (err: any) {
      console.error('Error starting match:', err);
      setError(err.message || 'Failed to start match');
    }
  };

  return {
    lineupHistory, setLineupHistory,
    openLineupDialog, setOpenLineupDialog, 
    editingHomeTeam, setEditingHomeTeam,
    selectedPlayers, setSelectedPlayers,
    isConfirmingRound, setIsConfirmingRound,
    getPlayerName,
    isHomeTeamBreaking,
    getSubstitutesForRound,
    getPlayerForRound,
    getHomePreviousRoundPlayer,
    getAwayPreviousRoundPlayer,
    handleConfirmSubstitution,
    handleOpenLineupDialog,
    handleCloseLineupDialog,
    handlePlayerSelection,
    handleSaveLineup,
    handleStartMatch
  };
}; 