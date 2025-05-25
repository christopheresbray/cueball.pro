// src/utils/matchUtils.ts
import { Match, Frame } from '../services/databaseService';
import { Theme } from '@mui/material';

/**
 * Calculates the current match score based on frame results
 */
export const calculateMatchScore = (match: Match | null) => {
  if (!match?.frames) return { home: 0, away: 0 };
  
  // Comment out debug logging
  // console.log("Calculating match score with frames array:", match.frames);
  
  const roundContributions: {[key: string]: {home: number, away: number}} = {};
  
  // Convert frames object to array before reducing
  const framesArray = Object.values(match.frames);
  
  const score = framesArray.reduce(
    (acc, frame) => {
      const homeScore = frame.homeScore || 0;
      const awayScore = frame.awayScore || 0;
      
      // Comment out debug logging
      // console.log(`Processing frame in round ${frame.round} with winner ${frame.winnerPlayerId}, homeScore: ${homeScore}, awayScore: ${awayScore}`);
      
      const roundNum = frame.round;
      
      if (!roundContributions[`Round ${roundNum}`]) {
        roundContributions[`Round ${roundNum}`] = {home: 0, away: 0};
      }
      
      acc.home += homeScore;
      roundContributions[`Round ${roundNum}`].home += homeScore;
      acc.away += awayScore;
      roundContributions[`Round ${roundNum}`].away += awayScore;
      
      return acc;
    },
    { home: 0, away: 0 }
  );
  
  // Comment out debug logging
  // console.log("Round contributions to score:", roundContributions);
  // console.log(`Final score - Home: ${score.home}, Away: ${score.away}`);
  
  return score;
};

/**
 * Checks if a frame has been scored
 */
export const isFrameScored = (match: Match | null, roundIndex: number, position: number): boolean => {
  if (!match?.frames) return false;
  const framesArray = Object.values(match.frames);
  const frame = framesArray.find(f => 
    f.round === roundIndex + 1 &&
    (f.homePlayerPosition === position + 1 || f.awayPlayerPosition === String.fromCharCode(65 + position))
  );
  return !!frame?.winnerPlayerId;
};

/**
 * Gets the winner ID for a specific frame
 */
export const getFrameWinner = (match: Match | null, roundIndex: number, position: number): string | null => {
  if (!match?.frames) return null;
  const framesArray = Object.values(match.frames);
  const frame = framesArray.find(f => 
    f.round === roundIndex + 1 &&
    (f.homePlayerPosition === position + 1 || f.awayPlayerPosition === String.fromCharCode(65 + position))
  );
  return frame?.winnerPlayerId || null;
};

/**
 * Checks if all frames in a round are scored
 */
export const isRoundComplete = (match: Match, round: number): boolean => {
  // Convert frames object to array and filter for current round
  const roundFrames = Object.values(match.frames || {}).filter(
    frame => frame.round === round
  );
  
  // Check if all frames in the round are complete
  return roundFrames.every(frame => frame.isComplete);
};

/**
 * Checks if a round is currently active
 */
export const isRoundActive = (activeRound: number, roundIndex: number): boolean => {
  return roundIndex + 1 === activeRound;
};

/**
 * Checks if a round can be played
 */
export const isRoundPlayable = (completedRounds: number[], roundIndex: number): boolean => {
  if (roundIndex + 1 === 1) return true; // First round is always playable
  return completedRounds.includes(roundIndex); // Previous round must be completed
};

/**
 * Determines who breaks in each frame
 */
export const isHomeTeamBreaking = (round: number, position: number): boolean => {
  // Home team breaks in odd-numbered frames (0-based index)
  const frameNumber = (round - 1) * 4 + position;
  return frameNumber % 2 === 0;
};

/**
 * Gets the opponent position for matchups based on the rotation pattern.
 * This handles how matchups rotate each round, while players stay fixed in their positions:
 * - Round 1: 1vA, 2vB, 3vC, 4vD
 * - Round 2: 1vB, 2vC, 3vD, 4vA
 * - Round 3: 1vC, 2vD, 3vA, 4vB
 * - Round 4: 1vD, 2vA, 3vB, 4vC
 * 
 * @param round The 1-indexed round number (1-4)
 * @param position The 0-indexed position (0-3)
 * @param isHome Whether this is for the home team
 * @returns The opponent position to match against
 */
export const getOpponentPosition = (round: number, position: number, isHome: boolean): number => {
  // Comment out debug logging
  // console.log(`getOpponentPosition called - Round: ${round}, Position: ${position}, isHome: ${isHome}`);
  
  // Convert round to 0-indexed for calculations
  const roundIndex = round - 1;
  
  if (isHome) {
    // For home team positions looking up their away opponents:
    // Round 1: A->1, B->2, C->3, D->4
    // Round 2: A->2, B->3, C->4, D->1
    // Round 3: A->3, B->4, C->1, D->2
    // Round 4: A->4, B->1, C->2, D->3
    const awayOpponent = (position + roundIndex) % 4;
    // Comment out debug logging
    // console.log(`Home position ${position} plays against away position ${awayOpponent} in round ${round}`);
    return awayOpponent;
  } else {
    // For away team positions looking up their home opponents:
    // Round 1: 1->A, 2->B, 3->C, 4->D
    // Round 2: 1->D, 2->A, 3->B, 4->C
    // Round 3: 1->C, 2->D, 3->A, 4->B
    // Round 4: 1->B, 2->C, 3->D, 4->A
    const homeOpponent = ((4 - roundIndex) + position) % 4;
    // Comment out debug logging
    // console.log(`Away position ${position} plays against home position ${homeOpponent} in round ${round}`);
    return homeOpponent;
  }
};

/**
 * Gets the position letter for the away team position
 * Note: This doesn't change based on round - positions stay fixed.
 * Only the matchups rotate.
 * 
 * @param roundIndex The 0-indexed round number (0-3)
 * @param position The 0-indexed position (0-3)
 * @returns The position letter (A-D) for display
 */
export const getPositionLetter = (roundIndex: number, position: number): string => {
  // Position letters are fixed A, B, C, D
  return String.fromCharCode(65 + position);
};

/**
 * Enum for frame status
 */
export enum FrameStatus {
  COMPLETED = 'completed',
  EDITING = 'editing',
  ACTIVE = 'active',
  PENDING = 'pending'
}

/**
 * Gets the status of a frame
 */
export const getFrameStatus = (
  match: Match | null, 
  round: number, 
  position: number, 
  activeRound: number,
  editingFrame: {round: number, position: number} | null
): FrameStatus => {
  const isScored = match ? isFrameScored(match, round, position) : false;
  const isActive = isRoundActive(activeRound, round);
  const isEditing = editingFrame?.round === round && editingFrame?.position === position;
  
  if (isScored) return FrameStatus.COMPLETED;
  if (isEditing) return FrameStatus.EDITING;
  if (isActive) return FrameStatus.ACTIVE;
  return FrameStatus.PENDING;
};

/**
 * Gets the color for a frame status
 */
export const getFrameStatusColor = (status: FrameStatus, theme: Theme): string => {
  switch (status) {
    case FrameStatus.COMPLETED: return theme.palette.success.main;
    case FrameStatus.EDITING: return theme.palette.primary.main;
    case FrameStatus.ACTIVE: return theme.palette.info.main;
    default: return theme.palette.text.disabled;
  }
};

/**
 * Gets tooltip text for a frame
 */
export const getFrameTooltip = (
  round: number, 
  position: number,
  isScored: boolean,
  isActive: boolean,
  homePlayerName: string,
  awayPlayerName: string,
  isHomeTeamBreaking: boolean,
  winnerPlayerId: string | null,
  homePlayerId: string,
  isUserHomeTeamCaptain: boolean
): string => {
  const breaksFirst = isHomeTeamBreaking ? homePlayerName : awayPlayerName;
  
  // Base information about the frame
  let info = `${homePlayerName} vs ${awayPlayerName}\nBreak: ${breaksFirst}`;
  
  // Status information
  if (isScored) {
    const winnerName = winnerPlayerId === homePlayerId ? homePlayerName : awayPlayerName;
    info += `\nWinner: ${winnerName}`;
    
    // Actions for home team captain
    if (isUserHomeTeamCaptain) {
      info += '\n(Click to reset frame result)';
    }
  } else if (isActive) {
    // For active, unscored frames
    if (isUserHomeTeamCaptain) {
      info += '\nClick to score this frame';
    } else {
      info += '\nWaiting for home team to score';
    }
  } else {
    // For inactive, unscored frames
    if (isUserHomeTeamCaptain) {
      info += '\nNot yet active (click to score out of sequence)';
    } else {
      info += '\nNot yet available';
    }
  }
  
  return info;
};

/**
 * Gets all player IDs that are participating in a match.
 * matchParticipants is the single source of truth - set when lineups are submitted
 * and cannot be changed after the match starts.
 */
export function getAllParticipatingPlayers(match: Match, isHomeTeam: boolean): Set<string> {
  const participatingPlayers = new Set<string>();

  if (!match.matchParticipants) {
    // Comment out debug logging
    // console.warn('Match is missing matchParticipants field');
    return participatingPlayers;
  }

  const teamPlayers = isHomeTeam ? match.matchParticipants.homeTeam : match.matchParticipants.awayTeam;
  if (!teamPlayers || teamPlayers.length === 0) {
    // Comment out debug logging
    // console.warn(`Match ${match.id} has no participants for ${isHomeTeam ? 'home' : 'away'} team`);
    return participatingPlayers;
  }

  teamPlayers.forEach(playerId => {
    if (playerId) participatingPlayers.add(playerId);
  });

  return participatingPlayers;
}