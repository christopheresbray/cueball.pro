import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon
} from '@mui/icons-material';

import FrameCard from './FrameCard';

import { FrameStatus, getPositionLetter } from '../../utils/matchUtils';
import { Match } from '../../services/databaseService';

interface RoundDisplayProps {
  roundIndex: number;
  match: Match | null;
  activeRound: number;
  isRoundComplete: boolean;
  isRoundActive: boolean;
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
  homeTeamConfirmed: { [round: number]: boolean };
  awayTeamConfirmed: { [round: number]: boolean };
  hoveredFrame: { round: number, position: number } | null;
  setHoveredFrame: React.Dispatch<React.SetStateAction<{ round: number, position: number } | null>>;
  cueBallImage: string;
  cueBallDarkImage: string;
  getPlayerName: (playerId: string, isHomeTeam: boolean) => string;
  getPlayerForRound: (round: number, position: number, isHomeTeam: boolean) => string;
  getFrameWinner: (round: number, position: number) => string | null;
  isFrameScored: (round: number, position: number) => boolean;
  isHomeTeamBreaking: (round: number, position: number) => boolean;
  handleFrameClick: (round: number, position: number, event?: React.MouseEvent) => void;
  handleResetFrame: (round: number, position: number, event: React.MouseEvent) => void;
  getFrameStatus: (round: number, position: number) => FrameStatus;
  error: string;
  handleLockRoundScores: (roundIndex: number) => void;
}

/**
 * Component that displays a complete round with its frames
 */
const RoundDisplay: React.FC<RoundDisplayProps> = ({
  roundIndex,
  match,
  activeRound,
  isRoundComplete,
  isRoundActive,
  isUserHomeTeamCaptain,
  isUserAwayTeamCaptain,
  homeTeamConfirmed,
  awayTeamConfirmed,
  hoveredFrame,
  setHoveredFrame,
  cueBallImage,
  cueBallDarkImage,
  getPlayerName,
  getPlayerForRound,
  getFrameWinner,
  isFrameScored,
  isHomeTeamBreaking,
  handleFrameClick,
  handleResetFrame,
  getFrameStatus,
  error,
  handleLockRoundScores
}) => {
  // Check if the current round's scores are locked
  const isLocked = !!match?.roundLockedStatus?.[roundIndex];
  
  // Check if round is complete but not yet locked
  const isCompletePendingLock = isRoundComplete && !isLocked;

  // Check if this round should be fully enabled
  const isRoundEnabled = (currentRound: number) => {
    // Round 1 is always enabled
    if (currentRound === 0) return true;
    
    // For rounds 2-4, check if previous round is complete AND both teams confirmed
    const prevRoundIndex = currentRound - 1;
    const bothTeamsConfirmed = homeTeamConfirmed[prevRoundIndex] && awayTeamConfirmed[prevRoundIndex];
    return bothTeamsConfirmed || activeRound > currentRound;
  };
  
  // Determine if this is a future round (preview mode)
  const isFutureRound = roundIndex + 1 > activeRound;
  
  return (
    <Box key={`round-${roundIndex}`} sx={{ mb: 4 }}>
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 2, 
          bgcolor: isRoundActive ? 'rgba(144, 202, 249, 0.08)' : (isLocked ? 'background.default' : 'inherit'),
          opacity: isFutureRound ? 0.7 : 1,
          border: isLocked ? '1px solid grey' : (isCompletePendingLock ? '1px solid orange' : 'none'),
          position: 'relative'
        }}
      >
        {/* Overlay for future rounds */}
        {isFutureRound && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              right: 0, 
              p: 1,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '0 4px 0 4px',
              zIndex: 1
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Preview of future matchups
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Round {roundIndex + 1}
            {isLocked && (
              <Chip 
                size="small" 
                label="Completed" 
                color="success" 
                sx={{ ml: 2 }} 
                icon={<CheckCircleIcon />} 
              />
            )}
            {isCompletePendingLock && (
              <Chip 
                size="small" 
                label="Completed (Pending Lock)" 
                color="warning" 
                sx={{ ml: 2 }} 
              />
            )}
            {activeRound === roundIndex + 1 && !isRoundComplete && (
              <Chip 
                size="small" 
                label="Current" 
                color="primary" 
                sx={{ ml: 2 }} 
              />
            )}
            {isFutureRound && (
              <Chip 
                size="small" 
                label="Upcoming" 
                color="default" 
                variant="outlined"
                sx={{ ml: 2 }} 
              />
            )}
          </Typography>
          
          {isCompletePendingLock && isUserHomeTeamCaptain && (
            <Button 
              variant="contained" 
              color="secondary" 
              size="small" 
              startIcon={<LockIcon />}
              onClick={() => handleLockRoundScores(roundIndex)}
            >
              Lock Round {roundIndex + 1} Scores
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 4 }).map((_, position) => {
            const homePlayerId = getPlayerForRound(roundIndex + 1, position, true);
            const awayPlayerId = getPlayerForRound(roundIndex + 1, position, false);
            const homePlayerName = getPlayerName(homePlayerId, true);
            const awayPlayerName = getPlayerName(awayPlayerId, false);
            const isScored = isFrameScored(roundIndex, position);
            const isActive = isRoundActive && !isLocked && isRoundEnabled(roundIndex);
            const winnerId = getFrameWinner(roundIndex, position);
            const homeWon = winnerId === homePlayerId;
            const awayWon = winnerId === awayPlayerId;
            const isBreaking = isHomeTeamBreaking(roundIndex, position);
            const frameStatus = isFutureRound ? FrameStatus.PENDING 
                                     : isLocked ? FrameStatus.COMPLETED 
                                     : getFrameStatus(roundIndex, position);
            const positionLetter = getPositionLetter(roundIndex, position);

            // Define no-op functions for disabled state
            const noOpFrameClick = (round: number, position: number, event?: React.MouseEvent) => {};
            const noOpResetFrame = (round: number, position: number, event: React.MouseEvent) => {};

            // Define click handlers conditionally
            const frameClickHandler = isLocked || isFutureRound ? noOpFrameClick : handleFrameClick;
            const resetFrameHandler = isLocked || isFutureRound ? noOpResetFrame : handleResetFrame;

            return (
              <FrameCard
                key={`frame-${roundIndex}-${position}`}
                roundIndex={roundIndex}
                position={position}
                homePlayerName={homePlayerName}
                awayPlayerName={awayPlayerName}
                positionLetter={positionLetter}
                isScored={isScored}
                isActive={isActive}
                frameStatus={frameStatus}
                homeWon={homeWon}
                awayWon={awayWon}
                isBreaking={isBreaking}
                isUserHomeTeamCaptain={isUserHomeTeamCaptain && isRoundEnabled(roundIndex)}
                onFrameClick={frameClickHandler}
                onResetFrame={resetFrameHandler}
                cueBallImage={cueBallImage}
                cueBallDarkImage={cueBallDarkImage}
                onMouseEnter={() => setHoveredFrame({round: roundIndex, position})}
                onMouseLeave={() => setHoveredFrame(null)}
              />
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default RoundDisplay; 