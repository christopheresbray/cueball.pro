// src/hooks/useSubstitutions.ts
import { useState, useCallback, useEffect } from 'react';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import { 
  Match,
  Player,
  updateMatch,
  startMatch,
  updateMatchFrames
} from '../services/databaseService';
import { getOpponentPosition } from '../utils/matchUtils';
import type { Frame } from '../types/match';

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

  // Add this effect after state declarations
  useEffect(() => {
    if (openLineupDialog) {
      const defaultPlayers = editingHomeTeam ? homePlayers : awayPlayers;
      setSelectedPlayers(defaultPlayers.map(p => p.id).filter((id): id is string => typeof id === 'string'));
    }
  }, [openLineupDialog, editingHomeTeam, homePlayers, awayPlayers]);

  // Patch: Ensure lineupHistory[1] is always populated after match starts
  useEffect(() => {
    if (
      match?.status === 'in_progress' &&
      match?.id &&
      (
        !match.lineupHistory?.[1] ||
        (match.lineupHistory[1].homeLineup.length < 4 || match.lineupHistory[1].awayLineup.length < 4)
      ) &&
      match.homeLineup && match.awayLineup &&
      match.homeLineup.length >= 4 && match.awayLineup.length >= 4
    ) {
      // Patch lineupHistory[1] with the correct lineups
      const updatedLineupHistory = {
        ...(match.lineupHistory || {}),
        1: {
          homeLineup: match.homeLineup.slice(0, 4),
          awayLineup: match.awayLineup.slice(0, 4)
        }
      };
      updateMatch(match.id, { lineupHistory: updatedLineupHistory });
      setMatch(prev => prev ? { ...prev, lineupHistory: updatedLineupHistory } : prev);
    }
  }, [match?.status, match?.id, match?.homeLineup, match?.awayLineup, match?.lineupHistory, setMatch]);

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
    
    // Extract all players eligible for the match
    const getAllEligiblePlayers = (isHomeTeam: boolean): string[] => {
      const allPlayerIds = new Set<string>();
      
      // Get players from matchParticipants (the definitive list)
      const participants = match.matchParticipants;
      if (participants) {
        const teamParticipants = isHomeTeam ? participants.homeTeam : participants.awayTeam;
        teamParticipants.forEach(playerId => {
          if (playerId) allPlayerIds.add(playerId);
        });
      }
      // Fallback/Augment with lineupHistory if needed (though participants should be primary)
      if (match.lineupHistory) {
        Object.values(match.lineupHistory).forEach(roundLineup => {
          const lineup = isHomeTeam ? roundLineup.homeLineup : roundLineup.awayLineup;
          lineup.forEach((playerId: string) => { // Added type annotation
            if (playerId) allPlayerIds.add(playerId);
          });
        });
      }
      
      return [...allPlayerIds];
    };
    
    // Get the players from the full roster eligible for this match
    const allTeamPlayerIds = getAllEligiblePlayers(isHomeTeam);
    
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
    // Only log if lookup fails
    if (!match?.lineupHistory?.[round]) {
      // Get initial lineup from round 1 if available
      const round1Lineup = match?.lineupHistory?.[1];
      if (!round1Lineup) {
        console.log('No round 1 lineup found');
        return '';
      }
      const lineup = isHomeTeam ? round1Lineup.homeLineup : round1Lineup.awayLineup;
      const playerId = lineup?.[position] || '';
      if (!playerId) {
        console.log(`No player found in round 1 lineup for position ${position}`);
      }
      return playerId;
    }
    const lineup = isHomeTeam ? 
      match.lineupHistory[round].homeLineup : 
      match.lineupHistory[round].awayLineup;
    const playerId = lineup?.[position] || '';
    if (!playerId) {
      console.log(`No player found in lineup for round ${round}, position ${position}`);
    }
    return playerId;
  };

  /**
   * Get home player from previous round - Now relies solely on history
   */
  const getHomePreviousRoundPlayer = (round: number, position: number): string => {
    if (!match?.lineupHistory) return '';
    for (let r = round; r >= 1; r--) {
      if (match.lineupHistory[r]?.homeLineup?.[position]) {
        const playerId = match.lineupHistory[r].homeLineup[position];
        return playerId;
      }
    }
    console.log(`No home player found for position ${position} in any previous rounds`);
    return '';
  };
  
  /**
   * Get away player from previous round - Now relies solely on history
   */
  const getAwayPreviousRoundPlayer = (round: number, position: number): string => {
    if (!match?.lineupHistory) return '';
    for (let r = round; r >= 1; r--) {
      if (match.lineupHistory[r]?.awayLineup?.[position]) {
        const playerId = match.lineupHistory[r].awayLineup[position];
        return playerId;
      }
    }
    console.log(`No away player found for position ${position} in any previous rounds`);
    return '';
  };

  /**
   * NEW FUNCTION: Saves the updated player assignments to individual frame documents
   * after substitutions are confirmed.
   */
  const saveFrameLineupsAfterSubstitution = useCallback(async (
    confirmedLineups: {
      [roundNumber: number]: {
        homeLineup: string[];
        awayLineup: string[];
      }
    }
  ) => {
    if (!match?.id) {
       console.error("Cannot save frame lineups: Missing match ID.");
       setError("Missing match data, cannot save substitutions.");
       return;
    }
    if (!match.frames) {
       console.error("Cannot save frame lineups: Missing frames data on match object.");
       setError("Missing frame data, cannot save substitutions.");
       return;
    }

    const db = getFirestore();
    const batch = writeBatch(db);
    let updatesMade = 0;

    try {
      console.log("Starting batch update for frame lineups based on substitutions...", confirmedLineups);

      // Iterate through the rounds that have confirmed new lineups
      for (const roundStr in confirmedLineups) {
        const roundNumber = parseInt(roundStr, 10);
        if (isNaN(roundNumber)) continue;

        const { homeLineup, awayLineup } = confirmedLineups[roundNumber];

        // Find all frames for this round *that are not yet complete*
        const framesToUpdate = match.frames.filter(
          f => f.round === roundNumber && !(f.isComplete === true)
        );

        console.log(`Found ${framesToUpdate.length} uncompleted frames for round ${roundNumber} to update.`);

        framesToUpdate.forEach(frame => {
          if (!frame.frameId) {
            console.warn(`Frame missing ID in round ${roundNumber}, position ${frame.homePlayerPosition}/${frame.awayPlayerPosition}. Skipping update.`);
            return; // Cannot update without frame ID
          }

          let newHomePlayerId = frame.homePlayerId;
          let newAwayPlayerId = frame.awayPlayerId;

          // Determine the correct 0-based index for the lineups array
          const homePositionIndex = frame.homePlayerPosition - 1; // Convert 1-4 to 0-3
          const awayPositionIndex = frame.awayPlayerPosition.charCodeAt(0) - 65; // Convert A-D to 0-3

          // Get the new player ID from the confirmed lineup for the specific position
          // Ensure index is valid and player ID exists
          if (homePositionIndex >= 0 && homePositionIndex < homeLineup.length && homeLineup[homePositionIndex]) {
            newHomePlayerId = homeLineup[homePositionIndex];
          }
          if (awayPositionIndex >= 0 && awayPositionIndex < awayLineup.length && awayLineup[awayPositionIndex]) {
            newAwayPlayerId = awayLineup[awayPositionIndex];
          }

          // Only add to batch if there's a change
          if (newHomePlayerId !== frame.homePlayerId || newAwayPlayerId !== frame.awayPlayerId) {
            const frameRef = doc(db, 'matches', match.id!, 'frames', frame.frameId);
            batch.update(frameRef, {
              homePlayerId: newHomePlayerId,
              awayPlayerId: newAwayPlayerId
            });
            updatesMade++;
            console.log(`Batch: Updating frame ${frame.frameId} (Round ${roundNumber}, Pos ${frame.homePlayerPosition}/${frame.awayPlayerPosition}) -> Home: ${newHomePlayerId}, Away: ${newAwayPlayerId}`);
          }
        });
      }

      if (updatesMade > 0) {
        console.log(`Committing batch write with ${updatesMade} frame updates.`);
        await batch.commit();
        console.log("Batch write successful.");
      } else {
        console.log("No frame updates required in the batch.");
      }

    } catch (err: any) {
      console.error("Error saving frame lineups after substitution:", err);
      setError(err.message || "Failed to save lineup changes to frames.");
    }
  }, [match, setError]);

  /**
   * MODIFIED: Handle substitution confirmation.
   * Calculates the final lineups for future rounds and triggers a batch update to frames.
   */
  const handleConfirmSubstitution = async (
    roundIndex: number, // 0-based index of the round JUST completed
    isHomeTeam: boolean,
    updatedPositions: Record<number, string> // 0-based position index -> new playerId
  ) => {
    if (!match?.id) return;

    const currentRoundNumber = roundIndex + 1; // 1-based number of the round just completed
    const nextRoundNumber = roundIndex + 2; // 1-based number of the round substitutions apply to

    // Determine the Base Lineups for the next round
    let baseHomeLineup: string[] = [];
    let baseAwayLineup: string[] = [];
    // Simplified Base Lineup Determination: Use initial match lineups as the ultimate fallback
    // More robust logic might involve finding the *last* successfully saved frame state if needed
    baseHomeLineup = match.homeLineup?.slice(0,4) || [];
    baseAwayLineup = match.awayLineup?.slice(0,4) || [];

    // Ensure base lineups have 4 players
    while (baseHomeLineup.length < 4) baseHomeLineup.push('');
    while (baseAwayLineup.length < 4) baseAwayLineup.push('');


    // Calculate Final Lineups for Affected Rounds
    const confirmedLineupsForSave: { [roundNum: number]: { homeLineup: string[], awayLineup: string[] } } = {};

    // Apply the current substitution to the base lineups
    let nextRoundHomeLineup = [...baseHomeLineup];
    let nextRoundAwayLineup = [...baseAwayLineup];

    Object.entries(updatedPositions).forEach(([posStr, playerId]) => {
      const pos = parseInt(posStr);
      if (!isNaN(pos) && pos >= 0 && pos < 4) {
        if (isHomeTeam) {
          nextRoundHomeLineup[pos] = playerId;
        } else {
          nextRoundAwayLineup[pos] = playerId;
        }
      }
    });

    // Store the calculated final lineup for all future rounds (nextRoundNumber to 4)
    for (let r = nextRoundNumber; r <= 4; r++) {
        confirmedLineupsForSave[r] = {
            homeLineup: [...nextRoundHomeLineup],
            awayLineup: [...nextRoundAwayLineup]
        };
    }

    try {
      setIsConfirmingRound(roundIndex);
      await saveFrameLineupsAfterSubstitution(confirmedLineupsForSave); // Call with one argument
      setIsConfirmingRound(null);
      setError('');
    } catch (err: any) {
      console.error('Error during substitution confirmation process:', err);
      setError(err.message || 'Failed to confirm substitution');
      setIsConfirmingRound(null);
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
    // Use lineupHistory[1] for initial lineups
    const round1Lineups = match?.lineupHistory?.[1] || { homeLineup: [], awayLineup: [] };
    setSelectedPlayers(isHomeTeam ? round1Lineups.homeLineup : round1Lineups.awayLineup);
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
   * Handle saving lineup - This now primarily sets lineupHistory[1]
   * Note: This function seems designed for the pre-match LineupSubmission page.
   * It might need renaming or removal if LineupSubmission directly updates history.
   */
  const handleSaveLineup = async () => {
    if (!match?.id || !match.seasonId) return;

    // This function assumes it's setting the *initial* lineup (Round 1)
    const roundToUpdate = 1;

    try {
      const lineupHistoryUpdate = { ...(match.lineupHistory || {}) };
      
      // Ensure round 1 entry exists
      if (!lineupHistoryUpdate[roundToUpdate]) {
        lineupHistoryUpdate[roundToUpdate] = { homeLineup: [], awayLineup: [] };
      }

      // Update the correct lineup in history
      if (editingHomeTeam) {
        lineupHistoryUpdate[roundToUpdate].homeLineup = selectedPlayers;
        // Ensure opponent lineup exists in history entry, default to empty array if not
        lineupHistoryUpdate[roundToUpdate].awayLineup = 
          lineupHistoryUpdate[roundToUpdate]?.awayLineup || []; 
      } else {
        lineupHistoryUpdate[roundToUpdate].awayLineup = selectedPlayers;
        // Ensure opponent lineup exists in history entry, default to empty array if not
        lineupHistoryUpdate[roundToUpdate].homeLineup = 
          lineupHistoryUpdate[roundToUpdate]?.homeLineup || [];
      }
      
      // Prepare update data for the Match document
      const updateData: Partial<Match> = {
        lineupHistory: lineupHistoryUpdate
      };

      // // Check if opponent has submitted their lineup (using history)
      // const opponentLineupExists = editingHomeTeam 
      //   ? lineupHistoryUpdate[roundToUpdate]?.awayLineup?.length >= 4
      //   : lineupHistoryUpdate[roundToUpdate]?.homeLineup?.length >= 4;
      
      // // Potentially update status if both lineups are now in history
      // // Note: startMatch function in databaseService now handles status update
      // if (opponentLineupExists && selectedPlayers.length >= 4) {
      //   // updateData.status = 'in_progress'; // Let startMatch handle this
      // }

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        // Update local match state with new history
        return {
          ...prevMatch,
          lineupHistory: lineupHistoryUpdate
        };
      });

      handleCloseLineupDialog();
    } catch (err: any) {
      console.error('Error updating lineup history:', err);
      setError(err.message || 'Failed to update lineup history');
    }
  };

  /**
   * Handle starting the match - This might be simplified or removed
   * as startMatch in databaseService now takes over.
   */
  const handleStartMatch = async (isUserHomeTeamCaptain: boolean) => {
    if (!match?.id || !isUserHomeTeamCaptain) return;
    
    // Verification is now done within databaseService.startMatch based on lineupHistory[1]
    console.log("Attempting to start match via databaseService.startMatch...");
    
    try {
      // Call the centralized startMatch function
      // Pass the initial lineups from the match object
      if (!match.homeLineup || !match.awayLineup || 
          match.homeLineup.length < 4 || match.awayLineup.length < 4) {
          throw new Error('Initial lineups are not complete.');
      }
      await startMatch(match.id, match.homeLineup.slice(0, 4), match.awayLineup.slice(0, 4));
      
      // No need to update local state here, rely on real-time listener or refetch
      setError(''); // Clear any errors
    } catch (err: any) {
      console.error('Error starting match:', err);
      setError(err.message || 'Failed to start match');
    }
  };

  /**
   * Apply a substitution: update all unplayed frames for the given team/position in future rounds.
   * - Only update frames where isComplete !== true
   * - Never change homePlayerPosition or awayPlayerPosition
   * - Add a substitutionHistory entry to the frame for audit trail
   * - Validate eligibility before updating
   */
  const applySubstitution = async (
    match: Match,
    isHomeTeam: boolean,
    position: number, // 1-4 for home, 1-4 for away (A=1, B=2, ...)
    newPlayerId: string,
    performedBy: string // userId
  ) => {
    if (!match || !match.frames) return;
    // Validate eligibility: player must be on the team and active
    const teamPlayers = isHomeTeam ? match.matchParticipants?.homeTeam : match.matchParticipants?.awayTeam;
    if (!teamPlayers || !teamPlayers.includes(newPlayerId)) {
      throw new Error('Substitute is not on the team or not eligible');
    }
    // Update all unplayed frames for this team/position in future rounds
    const updatedFrames: Frame[] = match.frames.map((frame: Frame) => {
      // Only update future, unplayed frames for this team/position
      if (
        !frame.isComplete &&
        ((isHomeTeam && frame.homePlayerPosition === position) ||
         (!isHomeTeam && (frame.awayPlayerPosition.charCodeAt(0) - 64) === position)) // 'A'=1, 'B'=2, ...
      ) {
        const oldPlayerId = isHomeTeam ? frame.homePlayerId : frame.awayPlayerId;
        // Only update if the player is actually changing
        if (oldPlayerId !== newPlayerId) {
          // Add to substitutionHistory
          const newHistory: NonNullable<Frame['substitutionHistory']> = [
            ...(frame.substitutionHistory || []),
            {
              timestamp: Date.now(),
              team: isHomeTeam ? 'home' : 'away' as 'home' | 'away',
              position: isHomeTeam ? frame.homePlayerPosition : frame.awayPlayerPosition,
              oldPlayerId,
              newPlayerId,
              reason: 'substitution',
              performedBy
            }
          ];
          return {
            ...frame,
            ...(isHomeTeam ? { homePlayerId: newPlayerId } : { awayPlayerId: newPlayerId }),
            substitutionHistory: newHistory
          };
        }
      }
      return frame;
    });
    // Update the match document with the new frames array
    // CENTRALIZED: All changes to match.frames must go through updateMatchFrames for auditability and control
    await updateMatchFrames(match.id!, updatedFrames, {
      reason: 'substitution',
      performedBy,
    });
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
    handleStartMatch,
    saveFrameLineupsAfterSubstitution,
    applySubstitution
  };
}; 