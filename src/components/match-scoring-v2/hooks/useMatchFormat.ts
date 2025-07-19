// src/components/match-scoring-v2/hooks/useMatchFormat.ts

import { useMemo, useCallback } from 'react';
import { MatchFormat } from '../../../types/match';
import { MatchFormatHelper, FrameTemplate } from '../../../types/matchV2';
import { usePositionLabels } from './usePositionLabels';

/**
 * Hook for managing match format and generating frame templates
 */
export const useMatchFormat = (format: MatchFormat): MatchFormatHelper => {
  const positionLabels = usePositionLabels(format.framesPerRound);
  
  const totalFrames = useMemo(() => {
    return format.roundsPerMatch * format.framesPerRound;
  }, [format.roundsPerMatch, format.framesPerRound]);
  
  const generateFrameTemplates = useCallback((): FrameTemplate[] => {
    const templates: FrameTemplate[] = [];
    
    for (let round = 1; round <= format.roundsPerMatch; round++) {
      for (let frame = 0; frame < format.framesPerRound; frame++) {
        // Calculate rotated positions for this round
        const homePositionIndex = frame;
        const awayPositionIndex = (frame + round - 1) % format.positionsPerTeam;
        
        templates.push({
          roundNumber: round,
          frameNumber: frame + 1,
          homePosition: positionLabels.homePositions[homePositionIndex],
          awayPosition: positionLabels.awayPositions[awayPositionIndex],
          // Breaker alternates based on round and frame
          breakerSide: (round + frame) % 2 === 0 ? 'home' : 'away'
        });
      }
    }
    
    return templates;
  }, [format, positionLabels]);
  
  return {
    format,
    totalFrames,
    positionLabels,
    generateFrameTemplates
  };
};

/**
 * Validate match format
 */
export const validateMatchFormat = (format: MatchFormat): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (format.roundsPerMatch < 1) {
    errors.push('Rounds per match must be at least 1');
  }
  
  if (format.framesPerRound < 1) {
    errors.push('Frames per round must be at least 1');
  }
  
  if (format.positionsPerTeam < 1) {
    errors.push('Positions per team must be at least 1');
  }
  
  if (format.framesPerRound > format.positionsPerTeam) {
    errors.push('Frames per round cannot exceed positions per team');
  }
  
  // Check for reasonable limits
  if (format.roundsPerMatch > 10) {
    errors.push('Rounds per match should not exceed 10');
  }
  
  if (format.framesPerRound > 50) {
    errors.push('Frames per round should not exceed 50');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get common match formats
 */
export const getCommonFormats = (): MatchFormat[] => {
  return [
    {
      roundsPerMatch: 4,
      framesPerRound: 4,
      positionsPerTeam: 4,
      name: '4v4 Standard'
    },
    {
      roundsPerMatch: 4,
      framesPerRound: 2,
      positionsPerTeam: 2,
      name: '2v2 Doubles'
    },
    {
      roundsPerMatch: 3,
      framesPerRound: 3,
      positionsPerTeam: 3,
      name: '3v3 Compact'
    },
    {
      roundsPerMatch: 4,
      framesPerRound: 8,
      positionsPerTeam: 8,
      name: '8v8 Large'
    },
    {
      roundsPerMatch: 5,
      framesPerRound: 5,
      positionsPerTeam: 5,
      name: '5v5 Extended'
    }
  ];
}; 