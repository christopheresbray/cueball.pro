// src/utils/matchUtils.ts
import { Match, Frame } from '../services/databaseService';
import { Theme } from '@mui/material';

/**
 * Calculates the current match score based on frame results
 */
export const calculateMatchScore = (match: Match | null) => {
  if (!match?.frameResults) return { home: 0, away: 0 };
  
  console.log("Calculating match score with frameResults:", match.frameResults);
  
  // Count each frame and log which rounds are contributing to score
  const roundContributions: {[key: string]: {home: number, away: number}} = {};
  
  const score = Object.entries(match.frameResults).reduce(
    (acc, [frameId, frame]) => {
      console.log(`Processing frame ${frameId} with winner ${frame.winnerId}, homeScore: ${frame.homeScore}, awayScore: ${frame.awayScore}`);
      
      // Extract round number from frameId (format: "round-position")
      const roundNum = parseInt(frameId.split('-')[0]) + 1;
      
      // Initialize round contribution if not exists
      if (!roundContributions[`Round ${roundNum}`]) {
        roundContributions[`Round ${roundNum}`] = {home: 0, away: 0};
      }
      
      // Add to total and round contribution
      if (frame.homeScore) {
        acc.home += frame.homeScore;
        roundContributions[`Round ${roundNum}`].home += frame.homeScore;
      }
      if (frame.awayScore) {
        acc.away += frame.awayScore;
        roundContributions[`Round ${roundNum}`].away += frame.awayScore;
      }
      return acc;
    },
    { home: 0, away: 0 }
  );
  
  // Log contribution of each round to the total score
  console.log("Round contributions to score:", roundContributions);
  console.log(`Final score - Home: ${score.home}, Away: ${score.away}`);
  
  return score;
};

/**
 * Checks if a frame has been scored
 */
export const isFrameScored = (match: Match | null, round: number, position: number): boolean => {
  if (!match?.frameResults) return false;
  const frameId = `${round}-${position}`;
  return !!match.frameResults[frameId]?.winnerId;
};

/**
 * Gets the winner ID for a specific frame
 */
export const getFrameWinner = (match: Match | null, round: number, position: number): string | null => {
  if (!match?.frameResults) return null;
  const frameId = `${round}-${position}`;
  return match.frameResults[frameId]?.winnerId || null;
};

/**
 * Checks if all frames in a round are scored
 */
export const isRoundComplete = (match: Match | null, roundIndex: number): boolean => {
  if (!match) return false;
  return Array.from({ length: 4 }).every((_, position) => 
    isFrameScored(match, roundIndex, position)
  );
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
  console.log(`getOpponentPosition called - Round: ${round}, Position: ${position}, isHome: ${isHome}`);
  
  // Convert round to 0-indexed for calculations
  const roundIndex = round - 1;
  
  if (isHome) {
    // For home team positions looking up their away opponents:
    // In round 1: position 0 plays against away position 0, position 1 plays against away position 1, etc.
    // In round 2: position 0 plays against away position 1, position 1 plays against away position 2, etc.
    // This rotates by +1 for each round
    const awayOpponent = (position + roundIndex) % 4;
    console.log(`Home position ${position} plays against away position ${awayOpponent} in round ${round}`);
    return awayOpponent;
  } else {
    // For away team positions looking up their home opponents:
    // In round 1: position 0 plays against home position 0, position 1 plays against home position 1, etc.
    // In round 2: position 0 plays against home position 3, position 1 plays against home position 0, etc.
    // We need to determine which home position plays against this away position
    const homeOpponent = (position - roundIndex + 4) % 4;
    console.log(`Away position ${position} plays against home position ${homeOpponent} in round ${round}`);
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
  winnerId: string | null,
  homePlayerId: string,
  isUserHomeTeamCaptain: boolean
): string => {
  const breaksFirst = isHomeTeamBreaking ? homePlayerName : awayPlayerName;
  
  // Base information about the frame
  let info = `${homePlayerName} vs ${awayPlayerName}\nBreak: ${breaksFirst}`;
  
  // Status information
  if (isScored) {
    const winnerName = winnerId === homePlayerId ? homePlayerName : awayPlayerName;
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