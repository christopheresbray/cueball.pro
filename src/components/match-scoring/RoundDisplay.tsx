import React, { useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon
} from '@mui/icons-material';

import FrameCard from './FrameCard';

import { FrameStatus, getPositionLetter } from '../../utils/matchUtils';
import { Match, Frame } from '../../services/databaseService';

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
  hoveredFrame: { roundIndex: number, position: number } | null;
  setHoveredFrame: React.Dispatch<React.SetStateAction<{ roundIndex: number, position: number } | null>>;
  cueBallImage: string;
  cueBallDarkImage: string;
  getPlayerName: (playerId: string, isHomeTeam: boolean) => string;
  isHomeTeamBreaking: (round: number, position: number) => boolean;
  handleFrameClick: (round: number, position: number, event?: React.MouseEvent<Element, MouseEvent>) => void;
  handleResetFrame: (round: number, position: number, event: React.MouseEvent<Element, MouseEvent>) => void;
  getFrameStatus: (round: number, position: number) => FrameStatus;
  error: string;
  handleLockRoundScores: (roundIndex: number) => void;
  gameState: string;
  showFinalLockButton?: boolean;
  showConfirmMatchResult?: boolean;
  loading: boolean;
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
  isHomeTeamBreaking,
  handleFrameClick,
  handleResetFrame,
  getFrameStatus,
  error,
  handleLockRoundScores,
  gameState,
  showFinalLockButton,
  showConfirmMatchResult,
  loading
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
  const isFutureRound = roundIndex + 1 > (match?.currentRound ?? 1) && 
         !isRoundActive &&
         roundIndex + 1 !== activeRound &&
         !isLocked;
  
  // Current round number (1-indexed for display)
  const roundNumber = roundIndex + 1;
  
  // Check if this round has pending confirmations
  const isPendingConfirmations = isLocked && (!homeTeamConfirmed[roundIndex] || !awayTeamConfirmed[roundIndex]);
  
  // Determine the round status text and color
  let roundStatusText: string;
  let roundStatusColor: "default" | "success" | "error" | "primary";
  if (isFutureRound) {
    roundStatusText = "Upcoming";
    roundStatusColor = "default";
  } else if (isLocked) {
    roundStatusText = "LOCKED";
    roundStatusColor = "success";
  } else if (isRoundActive) {
    roundStatusText = "ACTIVE";
    roundStatusColor = "error";
  } else if (isRoundComplete) {
    roundStatusText = "COMPLETED";
    roundStatusColor = "primary";
  } else {
    roundStatusText = "PENDING";
    roundStatusColor = "default";
  }

  // Handler for locking the round
  const handleLockRound = useCallback(() => {
    handleLockRoundScores(roundIndex);
  }, [handleLockRoundScores, roundIndex]);

  // Instead of mapping by position, just filter and sort frames for this round
  const roundFrames = match?.frames
    ? Object.values(match.frames).filter(f => f.round === roundIndex + 1).sort((a, b) => a.frameNumber - b.frameNumber)
    : [];

  const frameGrid = roundFrames.map((frame) => {
    // --- Get data directly from the frame --- 
    const homePlayerId = frame.homePlayerId;
    const awayPlayerId = frame.awayPlayerId;
    const winnerPlayerId = frame.winnerPlayerId ?? null;
    const isComplete = frame.isComplete ?? false;
    const fixedHomePosLabel = frame.homePlayerPosition.toString(); 
    const fixedAwayPosLabel = frame.awayPlayerPosition;
    // Use frameNumber-1 as position for status, breaking, click handlers etc.
    const position = frame.frameNumber - 1;
    const status = getFrameStatus(roundIndex, position);
    const isBreaking = isHomeTeamBreaking(roundIndex, position);
    const canEdit = isUserHomeTeamCaptain && isRoundActive && !isLocked && isComplete;
    const isClickableForScore = isUserHomeTeamCaptain && isRoundActive && !isLocked && !isComplete;
    const homePlayerName = getPlayerName(homePlayerId, true);
    const awayPlayerName = getPlayerName(awayPlayerId, false);
    return (
      <Grid item xs={12} sm={6} md={3} key={`frame-${frame.frameId}`}>
        <FrameCard
          round={roundIndex}
          position={position}
          frameNumber={frame.frameNumber}
          status={status}
          isBreaking={isBreaking}
          isClickable={isClickableForScore}
          canEdit={canEdit}
          homePlayerName={homePlayerName}
          awayPlayerName={awayPlayerName}
          homePlayerId={homePlayerId}
          awayPlayerId={awayPlayerId}
          winnerPlayerId={winnerPlayerId}
          onClick={(event) => {
            if (isLocked) return;
            if (isComplete || isClickableForScore) {
              handleFrameClick(roundIndex, position, event);
            }
          }}
          onReset={(event) => handleResetFrame(roundIndex, position, event)}
          cueBallImage={cueBallImage}
          cueBallDarkImage={cueBallDarkImage}
          isUserHomeTeamCaptain={isUserHomeTeamCaptain}
          isUserAwayTeamCaptain={isUserAwayTeamCaptain}
          homePositionLabel={fixedHomePosLabel}
          awayPositionLabel={fixedAwayPosLabel}
          isRoundLocked={isLocked}
        />
      </Grid>
    );
  });

  // Show lock button if round is complete, not locked, and user is home captain, and gameState is scoring_round or round_completed
  const isCurrentRound = (roundIndex + 1) === (match?.currentRound ?? 1);
  const showLockButton = isCurrentRound && isRoundComplete && !isLocked && isUserHomeTeamCaptain && (gameState === 'scoring_round' || gameState === 'round_completed');

  // Deep debug log for lock button logic
  const DEBUG_LOCKS = true; // Enable debug logging
  if (DEBUG_LOCKS && typeof window !== 'undefined') {
    console.log('[LockButtonDeepDebug][RoundDisplay]', JSON.stringify({
      roundIndex,
      roundNumber: roundIndex + 1,
      matchCurrentRound: match?.currentRound,
      isCurrentRound,
      isRoundComplete,
      isLocked,
      isUserHomeTeamCaptain,
      gameState,
      showLockButton,
      // Break down each condition
      conditions: {
        isCurrentRound,
        isRoundComplete,
        notLocked: !isLocked,
        isUserHomeTeamCaptain,
        gameStateMatch: (gameState === 'scoring_round' || gameState === 'round_completed')
      }
    }, null, 2));
  }

  // Show spinner if loading
  if (loading) {
    return <Box sx={{ textAlign: 'center', mt: 2 }}><CircularProgress /><Typography>Updating...</Typography></Box>;
  }

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
              variant={isFutureRound || roundStatusText === 'PENDING' ? "outlined" : "filled"}
              sx={{ ml: 2 }} 
              icon={isLocked ? <CheckCircleIcon /> : undefined}
            />
            {isRoundComplete && !isLocked && !isRoundActive && (
              <Chip 
                size="small" 
                label="Needs Lock" 
                color="warning" 
                sx={{ ml: 1 }} 
              />
            )}
            {isRoundActive && (
              <Chip 
                size="small" 
                label="Current" 
                color="primary" 
                sx={{ ml: 1 }} 
              />
            )}
          </Typography>
          
          {showLockButton && (
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
          {frameGrid}
        </Grid>
      </Paper>
    </Box>
  );
};

export default RoundDisplay; 