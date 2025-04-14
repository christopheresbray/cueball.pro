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
   * Get available substitutes for a specific round based on lineup history
   */
  const getSubstitutesForRound = (
    roundIndex: number,
    isHomeTeam: boolean
  ): Player[] => {
    if (!match) return [];
    
    // Extract all players that have ever been part of the lineup
    const getAllPlayersInLineup = (isHomeTeam: boolean): string[] => {
      const allPlayerIds = new Set<string>();
      
      // Get players from base lineup (which may contain more than 4 players)
      const baseLineup = isHomeTeam ? match.homeLineup : match.awayLineup;
      if (baseLineup) {
        baseLineup.forEach(playerId => {
          if (playerId) allPlayerIds.add(playerId);
        });
      }
      
      // Get players from lineup history
      if (match.lineupHistory) {
        Object.values(match.lineupHistory).forEach(roundLineup => {
          const lineup = isHomeTeam ? roundLineup.homeLineup : roundLineup.awayLineup;
          lineup.forEach(playerId => {
            if (playerId) allPlayerIds.add(playerId);
          });
        });
      }
      
      return [...allPlayerIds];
    };
    
    // Get the players from the full roster
    const allTeamPlayerIds = getAllPlayersInLineup(isHomeTeam);
    
    // Get the currently active players for this round
    const activePositionIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const playerId = getPlayerForRound(roundIndex + 1, i, isHomeTeam);
      if (playerId) activePositionIds.push(playerId);
    }
    
    // Filter all players to get the ones that are not playing in the current round
    const allTeamPlayers = isHomeTeam ? homePlayers : awayPlayers;
    const substitutes = allTeamPlayers.filter(player => {
      return player.id && allTeamPlayerIds.includes(player.id) && !activePositionIds.includes(player.id);
    });
    
    return substitutes;
  };

  /**
   * Get player ID for a specific position in a specific round
   */
  const getPlayerForRound = (round: number, position: number, isHomeTeam: boolean): string => {
    // First check our local state
    if (lineupHistory[round] && position < 4) {
      const lineup = isHomeTeam ? lineupHistory[round].homeLineup : lineupHistory[round].awayLineup;
      if (lineup && lineup[position]) {
        return lineup[position];
      }
    }
    
    // Then check the match lineupHistory
    if (match?.lineupHistory && match.lineupHistory[round] && position < 4) {
      const lineup = isHomeTeam ? match.lineupHistory[round].homeLineup : match.lineupHistory[round].awayLineup;
      if (lineup && lineup[position]) {
        return lineup[position];
      }
    }
    
    // Logic for first round or when no substitutions have happened
    if (round === 1 && position < 4) {
      // For first round, we just use the initial lineup
      const initialLineup = isHomeTeam ? match?.homeLineup : match?.awayLineup;
      if (initialLineup && initialLineup[position]) {
        return initialLineup[position];
      }
    }
    
    // For later rounds with no explicit lineup history, find the most recent round
    if (match?.lineupHistory && round > 1) {
      // Find the most recent round with a lineup before the requested round
      for (let r = round - 1; r >= 1; r--) {
        if (match.lineupHistory[r]) {
          const lineup = isHomeTeam ? match.lineupHistory[r].homeLineup : match.lineupHistory[r].awayLineup;
          
          // For both home and away teams, positions stay fixed
          // The player in that position might change due to substitutions
          if (position < 4 && lineup && lineup[position]) {
            return lineup[position];
          }
          
          break;
        }
      }
    }
    
    // If we have normal lineup array for the user's team, use that as a fallback
    const baseLineup = isHomeTeam ? match?.homeLineup : match?.awayLineup;
    if (baseLineup && position < baseLineup.length) {
      return baseLineup[position] || '';
    }
    
    // Last resort: return empty string
    return '';
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
   * Handle substitution confirmation and update lineupHistory
   */
  const handleConfirmSubstitution = async (
    roundIndex: number,
    isHomeTeam: boolean,
    updatedPositions: Record<number, string>
  ) => {
    if (!match?.id) return;
    
    const nextRound = roundIndex + 2;
    
    // Get the current lineup for the round
    const currentLineup = isHomeTeam ? match.homeLineup || [] : match.awayLineup || [];
    
    // Create the updated lineup with substitutions
    const updatedLineup = [...currentLineup];
    
    // Apply the position changes
    Object.entries(updatedPositions).forEach(([position, playerId]) => {
      const pos = parseInt(position);
      if (!isNaN(pos) && pos >= 0 && pos < 4) {
        updatedLineup[pos] = playerId;
      }
    });
    
    // Ensure we have a full lineup
    while (updatedLineup.length < 4) {
      updatedLineup.push('');
    }
    
    // Get available substitutes
    const substitutes = getSubstitutesForRound(roundIndex, isHomeTeam);
    const substituteIds = substitutes.map(player => player.id!).filter(Boolean);
    
    try {
      setIsConfirmingRound(roundIndex);
      
      // Create or update the lineup history
      const lineupHistoryUpdate = { ...(match.lineupHistory || {}) };
      lineupHistoryUpdate[nextRound] = {
        ...(lineupHistoryUpdate[nextRound] || {}),
        homeLineup: isHomeTeam ? updatedLineup : (lineupHistoryUpdate[nextRound]?.homeLineup || match.homeLineup || []),
        awayLineup: !isHomeTeam ? updatedLineup : (lineupHistoryUpdate[nextRound]?.awayLineup || match.awayLineup || [])
      };
      
      // Update the match with the new lineup history
      await updateMatch(match.id, {
        lineupHistory: lineupHistoryUpdate
      });
      
      // Update local state to reflect changes
      setLineupHistory(prev => ({
        ...prev,
        [nextRound]: lineupHistoryUpdate[nextRound]
      }));
      
      setIsConfirmingRound(null);
    } catch (err: any) {
      console.error('Error confirming substitution:', err);
      setError(err.message || 'Failed to confirm substitution');
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