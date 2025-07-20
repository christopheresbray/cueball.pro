// src/utils/positionUtils.ts

/**
 * Position Utilities - Handles conversions between position identifiers and array indices
 * 
 * IMPORTANT: Positions are abstract identifiers, NOT mathematical values.
 * Home positions: 'A', 'B', 'C', 'D', etc.
 * Away positions: 1, 2, 3, 4, etc.
 * 
 * These utilities ensure consistent, type-safe conversions without mathematical operations.
 */

// Standard 4v4 format position mappings
export const HOME_POSITIONS_4V4 = ['A', 'B', 'C', 'D'] as const;
export const AWAY_POSITIONS_4V4 = [1, 2, 3, 4] as const;

// Lookup maps for 4v4 format
export const HOME_POSITION_TO_INDEX: Record<string, number> = {
  'A': 0, 'B': 1, 'C': 2, 'D': 3
};

export const AWAY_POSITION_TO_INDEX: Record<number, number> = {
  1: 0, 2: 1, 3: 2, 4: 3
};

export const INDEX_TO_HOME_POSITION: Record<number, string> = {
  0: 'A', 1: 'B', 2: 'C', 3: 'D'
};

export const INDEX_TO_AWAY_POSITION: Record<number, number> = {
  0: 1, 1: 2, 2: 3, 3: 4
};

/**
 * Convert home position to array index
 * @param position Home position ('A', 'B', 'C', 'D')
 * @returns Array index (0-3) or -1 if invalid
 */
export const homePositionToIndex = (position: string): number => {
  return HOME_POSITION_TO_INDEX[position.toUpperCase()] ?? -1;
};

/**
 * Convert away position to array index
 * @param position Away position (1, 2, 3, 4)
 * @returns Array index (0-3) or -1 if invalid
 */
export const awayPositionToIndex = (position: number): number => {
  return AWAY_POSITION_TO_INDEX[position] ?? -1;
};

/**
 * Convert array index to home position
 * @param index Array index (0-3)
 * @returns Home position ('A', 'B', 'C', 'D') or null if invalid
 */
export const indexToHomePosition = (index: number): string | null => {
  return INDEX_TO_HOME_POSITION[index] ?? null;
};

/**
 * Convert array index to away position
 * @param index Array index (0-3)
 * @returns Away position (1, 2, 3, 4) or null if invalid
 */
export const indexToAwayPosition = (index: number): number | null => {
  return INDEX_TO_AWAY_POSITION[index] ?? null;
};

/**
 * Convert home position to character for display purposes
 * @param position Home position ('A', 'B', 'C', 'D')
 * @returns The position as-is (since it's already a character)
 */
export const homePositionToChar = (position: string): string => {
  return position.toUpperCase();
};

/**
 * Convert away position to character for display purposes
 * @param position Away position (1, 2, 3, 4)
 * @returns Character representation ('A', 'B', 'C', 'D')
 */
export const awayPositionToChar = (position: number): string | null => {
  const index = awayPositionToIndex(position);
  return index >= 0 ? indexToHomePosition(index) : null;
};

/**
 * Convert array index to home position character
 * @param index Array index (0-3)
 * @returns Character ('A', 'B', 'C', 'D') or null if invalid
 */
export const indexToHomeChar = (index: number): string | null => {
  return indexToHomePosition(index);
};

/**
 * Validate if a position is a valid home position
 * @param position Position to validate
 * @returns true if valid home position
 */
export const isValidHomePosition = (position: string): boolean => {
  return HOME_POSITIONS_4V4.includes(position.toUpperCase() as any);
};

/**
 * Validate if a position is a valid away position
 * @param position Position to validate
 * @returns true if valid away position
 */
export const isValidAwayPosition = (position: number): boolean => {
  return AWAY_POSITIONS_4V4.includes(position as any);
};

/**
 * Get all valid home positions for the current format
 * @returns Array of home positions ['A', 'B', 'C', 'D']
 */
export const getAllHomePositions = (): readonly string[] => {
  return HOME_POSITIONS_4V4;
};

/**
 * Get all valid away positions for the current format
 * @returns Array of away positions [1, 2, 3, 4]
 */
export const getAllAwayPositions = (): readonly number[] => {
  return AWAY_POSITIONS_4V4;
};

/**
 * Compare if two positions are equivalent (for frame matching)
 * @param homePos Home position ('A', 'B', 'C', 'D')
 * @param awayPos Away position (1, 2, 3, 4)
 * @param targetPos Target position (could be either format)
 * @returns true if the target position matches either home or away
 */
export const positionMatches = (
  homePos: string, 
  awayPos: number, 
  targetPos: string | number
): boolean => {
  if (typeof targetPos === 'string') {
    return homePos.toUpperCase() === targetPos.toUpperCase();
  } else {
    return awayPos === targetPos;
  }
}; 