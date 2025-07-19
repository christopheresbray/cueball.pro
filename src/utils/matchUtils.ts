// src/utils/matchUtils.ts

import { MatchFormat, Frame, MatchState, FrameState, Match } from '../types/match';
import { Theme } from '@mui/material';

/**
 * ENHANCED MATCH UTILITIES
 */

/**
 * Generate frame rotation patterns for different match formats
 */
export const generateFrameRotation = (
  format: MatchFormat,
  round: number, 
  frameNumber: number
): { homePositionIndex: number; awayPositionIndex: number } => {
  const homePositionIndex = (frameNumber - 1) % format.positionsPerTeam;
  const awayPositionIndex = (frameNumber + round - 2) % format.positionsPerTeam;
  
  return { homePositionIndex, awayPositionIndex };
};

/**
 * Calculate match score from frames (new V2 version)
 */
export const calculateMatchScoreV2 = (frames: Frame[]): { home: number; away: number } => {
  return frames.reduce(
    (score, frame) => {
      if (frame.isComplete && frame.winnerPlayerId) {
        // Determine if winner is home or away player
        if (frame.winnerPlayerId === frame.homePlayerId) {
          score.home++;
        } else if (frame.winnerPlayerId === frame.awayPlayerId) {
          score.away++;
        }
      }
      return score;
    },
    { home: 0, away: 0 }
  );
};

/**
 * Calculate match score from match object (legacy compatibility)
 */
export const calculateMatchScore = (match: Match | null): { home: number; away: number } => {
  if (!match?.frames) return { home: 0, away: 0 };
  
  const framesArray = Array.isArray(match.frames) ? match.frames : Object.values(match.frames) as Frame[];
  
  return framesArray.reduce(
    (acc, frame: Frame) => {
      const homeScore = frame.homeScore || 0;
      const awayScore = frame.awayScore || 0;
      
      acc.home += homeScore;
      acc.away += awayScore;
      
      return acc;
    },
    { home: 0, away: 0 }
  );
};

/**
 * Get frames for a specific round
 */
export const getFramesForRound = (frames: Frame[], round: number): Frame[] => {
  return frames.filter(frame => frame.round === round);
};

/**
 * Check if a round is complete (V2 version)
 */
export const isRoundCompleteV2 = (frames: Frame[], round: number): boolean => {
  const roundFrames = getFramesForRound(frames, round);
  return roundFrames.length > 0 && roundFrames.every(frame => frame.isComplete);
};

/**
 * Check if match is complete
 */
export const isMatchComplete = (frames: Frame[], format: MatchFormat): boolean => {
  for (let round = 1; round <= format.roundsPerMatch; round++) {
    if (!isRoundCompleteV2(frames, round)) {
      return false;
    }
  }
  return true;
};

/**
 * Get next round number that needs to be played
 */
export const getNextRound = (frames: Frame[], format: MatchFormat): number | null => {
  for (let round = 1; round <= format.roundsPerMatch; round++) {
    if (!isRoundCompleteV2(frames, round)) {
      return round;
    }
  }
  return null; // All rounds complete
};

/**
 * Validate frame structure for a match format
 */
export const validateFrameStructure = (frames: Frame[], format: MatchFormat): string[] => {
  const errors: string[] = [];
  
  const expectedFrameCount = format.roundsPerMatch * format.framesPerRound;
  if (frames.length !== expectedFrameCount) {
    errors.push(`Expected ${expectedFrameCount} frames, got ${frames.length}`);
  }
  
  // Check each round has correct number of frames
  for (let round = 1; round <= format.roundsPerMatch; round++) {
    const roundFrames = getFramesForRound(frames, round);
    if (roundFrames.length !== format.framesPerRound) {
      errors.push(`Round ${round}: Expected ${format.framesPerRound} frames, got ${roundFrames.length}`);
    }
  }
  
  // Check for duplicate frame IDs
  const frameIds = frames.map(f => f.frameId);
  const uniqueFrameIds = new Set(frameIds);
  if (frameIds.length !== uniqueFrameIds.size) {
    errors.push('Duplicate frame IDs detected');
  }
  
  return errors;
};

/**
 * Create match formats for different game types
 */
export const MATCH_FORMATS: Record<string, MatchFormat> = {
  '4v4_standard': {
    roundsPerMatch: 4,
    framesPerRound: 4,
    positionsPerTeam: 4,
    name: '4v4 Standard'
  },
  '2v2_doubles': {
    roundsPerMatch: 4,
    framesPerRound: 2,
    positionsPerTeam: 2,
    name: '2v2 Doubles'
  },
  '8v8_large': {
    roundsPerMatch: 4,
    framesPerRound: 8,
    positionsPerTeam: 8,
    name: '8v8 Large Teams'
  },
  '3v3_compact': {
    roundsPerMatch: 3,
    framesPerRound: 3,
    positionsPerTeam: 3,
    name: '3v3 Compact'
  }
};

/**
 * Get all available match formats
 */
export const getAvailableFormats = (): MatchFormat[] => {
  return Object.values(MATCH_FORMATS);
};

/**
 * Find a frame by position and round
 */
export const findFrameByPosition = (
  frames: Frame[], 
  round: number, 
  homePosition: string, 
  awayPosition: number
): Frame | undefined => {
  return frames.find(frame => 
    frame.round === round && 
    frame.homePosition === homePosition && 
    frame.awayPosition === awayPosition
  );
};

/**
 * Get player frames for statistics
 */
export const getPlayerFrames = (frames: Frame[], playerId: string): Frame[] => {
  return frames.filter(frame => 
    frame.homePlayerId === playerId || frame.awayPlayerId === playerId
  );
};

/**
 * Calculate player win percentage
 */
export const calculatePlayerWinPercentage = (frames: Frame[], playerId: string): number => {
  const playerFrames = getPlayerFrames(frames, playerId).filter(f => f.isComplete);
  if (playerFrames.length === 0) return 0;
  
  const wins = playerFrames.filter(frame => frame.winnerPlayerId === playerId).length;
  return Math.round((wins / playerFrames.length) * 100);
};

/**
 * Get current match state based on frames and format
 */
export const determineMatchState = (
  frames: Frame[], 
  format: MatchFormat, 
  currentStatus: string
): MatchState => {
  if (currentStatus === 'cancelled') return 'cancelled';
  if (currentStatus === 'scheduled') return 'pre-match';
  
  if (isMatchComplete(frames, format)) {
    return 'completed';
  }
  
  const hasStartedFrames = frames.some(f => f.isComplete);
  return hasStartedFrames ? 'in-progress' : 'ready';
};

// ============================================================================
// LEGACY FUNCTIONS (for backward compatibility)
// ============================================================================

/**
 * Enum for frame status (legacy compatibility)
 */
export enum FrameStatus {
  COMPLETED = 'completed',
  EDITING = 'editing',
  ACTIVE = 'active',
  PENDING = 'pending'
}

/**
 * Gets all player IDs that are participating in a match.
 * matchParticipants is the single source of truth - set when lineups are submitted
 * and cannot be changed after the match starts.
 */
export function getAllParticipatingPlayers(match: Match, isHomeTeam: boolean): Set<string> {
  const participatingPlayers = new Set<string>();

  if (!match.matchParticipants) {
    console.warn('Match is missing matchParticipants field');
    return participatingPlayers;
  }

  const teamPlayers = isHomeTeam ? match.matchParticipants.homeTeam : match.matchParticipants.awayTeam;
  if (!teamPlayers || teamPlayers.length === 0) {
    console.warn(`Match ${match.id} has no participants for ${isHomeTeam ? 'home' : 'away'} team`);
    return participatingPlayers;
  }

  teamPlayers.forEach(playerId => {
    if (playerId) participatingPlayers.add(playerId);
  });

  return participatingPlayers;
}

/**
 * Gets the opponent position for matchups based on the rotation pattern.
 * This handles how matchups rotate each round, while players stay fixed in their positions:
 * - Round 1: 1vA, 2vB, 3vC, 4vD
 * - Round 2: 1vB, 2vC, 3vD, 4vA
 * - Round 3: 1vC, 2vD, 3vA, 4vB
 * - Round 4: 1vD, 2vA, 3vB, 4vC
 */
export const getOpponentPosition = (round: number, position: number, isHome: boolean): number => {
  // Convert round to 0-indexed for calculations
  const roundIndex = round - 1;
  
  if (isHome) {
    // For home team positions looking up their away opponents:
    const awayOpponent = (position + roundIndex) % 4;
    return awayOpponent;
  } else {
    // For away team positions looking up their home opponents:
    const homeOpponent = ((4 - roundIndex) + position) % 4;
    return homeOpponent;
  }
};

/**
 * Gets the position letter for the away team position
 * Note: This doesn't change based on round - positions stay fixed.
 * Only the matchups rotate.
 */
export const getPositionLetter = (roundIndex: number, position: number): string => {
  // Position letters are fixed A, B, C, D
  return String.fromCharCode(65 + position);
};

/**
 * Gets the status of a frame (legacy compatibility)
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
 * Checks if a frame has been scored (legacy compatibility)
 */
export const isFrameScored = (match: Match | null, roundIndex: number, position: number): boolean => {
  if (!match?.frames) return false;
  const framesArray = Array.isArray(match.frames) ? match.frames : Object.values(match.frames) as Frame[];
  const frame = framesArray.find((f: Frame) => 
    f.round === roundIndex + 1 &&
    (f.homePosition === String.fromCharCode(65 + position) || f.awayPosition === position + 1)
  );
  return !!frame?.winnerPlayerId;
};

/**
 * Checks if a round is currently active
 */
export const isRoundActive = (activeRound: number, roundIndex: number): boolean => {
  return roundIndex + 1 === activeRound;
};

/**
 * Legacy isRoundComplete function (uses different signature than new one)
 * Export with the old name for backward compatibility
 */
export const isRoundComplete = (match: Match | null, roundIndex: number): boolean => {
  if (!match?.frames) return false;
  const framesArray = Array.isArray(match.frames) ? match.frames : Object.values(match.frames) as Frame[];
  const roundFrames = framesArray.filter((f: Frame) => f.round === roundIndex + 1);
  
  const allScored = roundFrames.length === 4 && 
    roundFrames.every((f: Frame) => typeof f.winnerPlayerId === 'string' && f.winnerPlayerId.trim().length > 0);
  
  return allScored;
};

/**
 * Export all match format utilities
 */
export const MatchFormatUtils = {
  generateFrameRotation,
  calculateMatchScore: calculateMatchScoreV2,
  getFramesForRound,
  isRoundComplete: isRoundCompleteV2,
  isMatchComplete,
  getNextRound,
  validateFrameStructure,
  getAvailableFormats,
  findFrameByPosition,
  getPlayerFrames,
  calculatePlayerWinPercentage,
  determineMatchState,
  MATCH_FORMATS
};