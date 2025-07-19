// src/components/match-scoring-v2/hooks/usePositionLabels.ts

import { useMemo } from 'react';
import { PositionLabels } from '../../../types/matchV2';

/**
 * Hook to generate position labels for home and away teams
 * Supports formats with any number of positions per team
 */
export const usePositionLabels = (framesPerRound: number): PositionLabels => {
  const homePositions = useMemo(() => {
    const positions: string[] = [];
    
    for (let i = 0; i < framesPerRound; i++) {
      if (i < 26) {
        // A-Z for first 26 positions
        positions.push(String.fromCharCode(65 + i));
      } else {
        // AA, AB, AC... for 27+ positions
        const firstLetter = String.fromCharCode(65 + Math.floor((i - 26) / 26));
        const secondLetter = String.fromCharCode(65 + ((i - 26) % 26));
        positions.push(firstLetter + secondLetter);
      }
    }
    
    return positions;
  }, [framesPerRound]);
  
  const awayPositions = useMemo(() => {
    return Array.from({ length: framesPerRound }, (_, i) => i + 1);
  }, [framesPerRound]);
  
  return { homePositions, awayPositions };
};

/**
 * Get position label for a specific index
 */
export const getHomePositionLabel = (index: number): string => {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  } else {
    const firstLetter = String.fromCharCode(65 + Math.floor((index - 26) / 26));
    const secondLetter = String.fromCharCode(65 + ((index - 26) % 26));
    return firstLetter + secondLetter;
  }
};

/**
 * Get away position number for a specific index
 */
export const getAwayPositionLabel = (index: number): number => {
  return index + 1;
}; 