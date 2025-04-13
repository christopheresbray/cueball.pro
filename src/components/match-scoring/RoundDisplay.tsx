import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Grid,
  Alert
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
const RoundDisplay: React.FC<RoundDisplayProps> = React.memo(({
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
  const isLocked = useMemo(() => 
    !!match?.roundLockedStatus?.[roundIndex], 
    [match?.roundLockedStatus, roundIndex]
  );
  
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
  
  // Current round number (1-indexed for display)
  const roundNumber = roundIndex + 1;
  
  // Check if this round has pending confirmations
  const isPendingConfirmations = useMemo(() => 
    isLocked && (!homeTeamConfirmed[roundIndex] || !awayTeamConfirmed[roundIndex]),
    [isLocked, homeTeamConfirmed, awayTeamConfirmed, roundIndex]
  );
  
  // Determine the round status text and color
  const { roundStatusText, roundStatusColor } = useMemo(() => {
    if (isLocked) {
      return { 
        roundStatusText: "LOCKED", 
        roundStatusColor: "success" as const
      };
    } else if (isRoundComplete) {
      return { 
        roundStatusText: "COMPLETED", 
        roundStatusColor: "primary" as const 
      };
    } else if (isRoundActive) {
      return { 
        roundStatusText: "ACTIVE", 
        roundStatusColor: "error" as const 
      };
    } else {
      return { 
        roundStatusText: "PENDING", 
        roundStatusColor: "default" as const 
      };
    }
  }, [isLocked, isRoundComplete, isRoundActive]);

  // Handler for locking the round
  const handleLockRound = useCallback(() => {
    handleLockRoundScores(roundIndex);
  }, [handleLockRoundScores, roundIndex]);

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
            Round {roundNumber}
            <Chip 
              size="small" 
              label={roundStatusText} 
              color={roundStatusColor} 
              variant="outlined"
              sx={{ ml: 2 }} 
            />
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
            {activeRound === roundNumber && !isRoundComplete && (
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
              onClick={handleLockRound}
            >
              Lock Round {roundNumber} Scores
            </Button>
          )}
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={2} direction="column">
          {useMemo(() => 
            Array.from({ length: 4 }).map((_, position) => {
              const homePlayerId = getPlayerForRound(roundNumber, position, true);
              const awayPlayerId = getPlayerForRound(roundNumber, position, false);
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

              // Define click handlers conditionally - always use no-op for locked rounds
              const frameClickHandler = isLocked || isFutureRound ? noOpFrameClick : handleFrameClick;
              const resetFrameHandler = isLocked || isFutureRound ? noOpResetFrame : handleResetFrame;

              return (
                <Grid item xs={12} key={`frame-${roundIndex}-${position}`}>
                  <FrameCard
                    round={roundIndex}
                    position={position}
                    frameNumber={(roundIndex * 4) + position + 1}
                    status={frameStatus}
                    isHovered={hoveredFrame?.round === roundIndex && hoveredFrame?.position === position}
                    isBreaking={isBreaking}
                    isClickable={isActive}
                    homePlayerName={homePlayerName}
                    awayPlayerName={awayPlayerName}
                    homePlayerId={homePlayerId}
                    awayPlayerId={awayPlayerId}
                    winnerId={winnerId}
                    onMouseEnter={() => setHoveredFrame({ round: roundIndex, position })}
                    onMouseLeave={() => setHoveredFrame(null)}
                    onClick={(event) => frameClickHandler(roundIndex, position, event)}
                    onReset={(event) => resetFrameHandler(roundIndex, position, event)}
                    cueBallImage={cueBallImage}
                    cueBallDarkImage={cueBallDarkImage}
                    isUserHomeTeamCaptain={isUserHomeTeamCaptain && isRoundEnabled(roundIndex)}
                    isUserAwayTeamCaptain={isUserAwayTeamCaptain && isRoundEnabled(roundIndex)}
                    positionLetter={positionLetter}
                  />
                </Grid>
              );
            }),
            [
              roundIndex, 
              roundNumber, 
              getFrameStatus, 
              getPlayerForRound, 
              isHomeTeamBreaking, 
              isRoundActive, 
              isUserHomeTeamCaptain, 
              isUserAwayTeamCaptain, 
              isLocked, 
              hoveredFrame, 
              getPlayerName, 
              getFrameWinner, 
              setHoveredFrame, 
              handleFrameClick, 
              handleResetFrame, 
              cueBallImage, 
              isRoundEnabled
            ]
          )}
        </Grid>
      </Paper>
    </Box>
  );
});

export default RoundDisplay; 