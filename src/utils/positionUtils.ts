// src/utils/positionUtils.ts

/**
 * Position Utilities - Handles conversions between position identifiers and array indices
 * 
 * IMPORTANT: Positions are abstract identifiers, NOT mathematical values.
 * Home positions: 1, 2, 3, 4, etc.
 * Away positions: 'A', 'B', 'C', 'D', etc.
 * 
 * These utilities ensure consistent, type-safe conversions without mathematical operations.
 */

// Standard 4v4 format position mappings
export const HOME_POSITIONS_4V4 = [1, 2, 3, 4] as const;
export const AWAY_POSITIONS_4V4 = ['A', 'B', 'C', 'D'] as const;

// Lookup maps for 4v4 format
export const HOME_POSITION_TO_INDEX: Record<number, number> = {
  1: 0, 2: 1, 3: 2, 4: 3
};

export const AWAY_POSITION_TO_INDEX: Record<string, number> = {
  'A': 0, 'B': 1, 'C': 2, 'D': 3
};

export const INDEX_TO_HOME_POSITION: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4
};

export const INDEX_TO_AWAY_POSITION: Record<number, string> = {
  0: 'A', 1: 'B', 2: 'C', 3: 'D'
};

/**
 * Convert home position to array index
 * @param position Home position (1, 2, 3, 4)
 * @returns Array index (0-3) or -1 if invalid
 */
export const homePositionToIndex = (position: number): number => {
  return HOME_POSITION_TO_INDEX[position] ?? -1;
};

/**
 * Convert away position to array index
 * @param position Away position ('A', 'B', 'C', 'D')
 * @returns Array index (0-3) or -1 if invalid
 */
export const awayPositionToIndex = (position: string): number => {
  return AWAY_POSITION_TO_INDEX[position.toUpperCase()] ?? -1;
};

/**
 * Convert array index to home position
 * @param index Array index (0-3)
 * @returns Home position (1, 2, 3, 4) or null if invalid
 */
export const indexToHomePosition = (index: number): number | null => {
  return INDEX_TO_HOME_POSITION[index] ?? null;
};

/**
 * Convert array index to away position
 * @param index Array index (0-3)
 * @returns Away position ('A', 'B', 'C', 'D') or null if invalid
 */
export const indexToAwayPosition = (index: number): string | null => {
  return INDEX_TO_AWAY_POSITION[index] ?? null;
};

/**
 * Convert home position to character for display purposes
 * @param position Home position (1, 2, 3, 4)
 * @returns String representation of the number
 */
export const homePositionToChar = (position: number): string => {
  return position.toString();
};

/**
 * Convert away position to character for display purposes
 * @param position Away position ('A', 'B', 'C', 'D')
 * @returns The position as-is (since it's already a character)
 */
export const awayPositionToChar = (position: string): string => {
  return position.toUpperCase();
};

/**
 * Convert array index to home position character
 * @param index Array index (0-3)
 * @returns Character ('1', '2', '3', '4') or null if invalid
 */
export const indexToHomeChar = (index: number): string | null => {
  const position = indexToHomePosition(index);
  return position !== null ? position.toString() : null;
};

/**
 * Validate if a position is a valid home position
 * @param position Position to validate
 * @returns true if valid home position
 */
export const isValidHomePosition = (position: number): boolean => {
  return HOME_POSITIONS_4V4.includes(position as any);
};

/**
 * Validate if a position is a valid away position
 * @param position Position to validate
 * @returns true if valid away position
 */
export const isValidAwayPosition = (position: string): boolean => {
  return AWAY_POSITIONS_4V4.includes(position.toUpperCase() as any);
};

/**
 * Get all valid home positions for the current format
 * @returns Array of home positions [1, 2, 3, 4]
 */
export const getAllHomePositions = (): readonly number[] => {
  return HOME_POSITIONS_4V4;
};

/**
 * Get all valid away positions for the current format
 * @returns Array of away positions ['A', 'B', 'C', 'D']
 */
export const getAllAwayPositions = (): readonly string[] => {
  return AWAY_POSITIONS_4V4;
};

/**
 * Compare if two positions are equivalent (for frame matching)
 * @param homePos Home position (1, 2, 3, 4)
 * @param awayPos Away position ('A', 'B', 'C', 'D')
 * @param targetPos Target position (could be either format)
 * @returns true if the target position matches either home or away
 */
export const positionMatches = (
  homePos: number, 
  awayPos: string, 
  targetPos: string | number
): boolean => {
  if (typeof targetPos === 'number') {
    return homePos === targetPos;
  } else {
    return awayPos.toUpperCase() === targetPos.toUpperCase();
  }
};

/**
 * Get the matchup for a specific round and frame
 * Based on the predefined pattern:
 * Round 1: 1vsA, 2vsB, 3vsC, 4vsD
 * Round 2: 2vsC, 1vsB, 4vsA, 3vsD
 * Round 3: 4vsB, 3vsA, 2vsD, 1vsC
 * Round 4: 3vsB, 2vsA, 1vsD, 4vsC
 * 
 * Note: Home team gets numbers (1,2,3,4), Away team gets letters (A,B,C,D)
 */
export const getFrameMatchup = (round: number, frameNumber: number): { homePosition: number, awayPosition: string } => {
  const matchups = [
    // Round 1
    [
      { homePosition: 1, awayPosition: 'A' },
      { homePosition: 2, awayPosition: 'B' },
      { homePosition: 3, awayPosition: 'C' },
      { homePosition: 4, awayPosition: 'D' }
    ],
    // Round 2
    [
      { homePosition: 2, awayPosition: 'C' },
      { homePosition: 1, awayPosition: 'B' },
      { homePosition: 4, awayPosition: 'A' },
      { homePosition: 3, awayPosition: 'D' }
    ],
    // Round 3
    [
      { homePosition: 4, awayPosition: 'B' },
      { homePosition: 3, awayPosition: 'A' },
      { homePosition: 2, awayPosition: 'D' },
      { homePosition: 1, awayPosition: 'C' }
    ],
    // Round 4
    [
      { homePosition: 3, awayPosition: 'B' },
      { homePosition: 2, awayPosition: 'A' },
      { homePosition: 1, awayPosition: 'D' },
      { homePosition: 4, awayPosition: 'C' }
    ]
  ];

  // Ensure round and frame are within bounds
  const roundIndex = Math.max(0, Math.min(round - 1, 3));
  const frameIndex = Math.max(0, Math.min(frameNumber - 1, 3));
  
  return matchups[roundIndex][frameIndex];
}; 