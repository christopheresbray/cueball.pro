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
  isHomeTeamBreaking,
  handleFrameClick,
  handleResetFrame,
  getFrameStatus,
  error,
  handleLockRoundScores,
  gameState
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
  const isFutureRound = useMemo(() => {
    // Show as future round if:
    // 1. It's beyond the current round
    // 2. Not currently being scored
    // 3. Not the active round
    // 4. Not locked (locked rounds should show normally)
    return roundIndex + 1 > (match?.currentRound ?? 1) && 
           !isRoundActive &&
           roundIndex + 1 !== activeRound &&
           !isLocked;
  }, [roundIndex, match?.currentRound, activeRound, isRoundActive, isLocked]);
  
  // Current round number (1-indexed for display)
  const roundNumber = roundIndex + 1;
  
  // Check if this round has pending confirmations
  const isPendingConfirmations = useMemo(() => 
    isLocked && (!homeTeamConfirmed[roundIndex] || !awayTeamConfirmed[roundIndex]),
    [isLocked, homeTeamConfirmed, awayTeamConfirmed, roundIndex]
  );
  
  // Determine the round status text and color
  const { roundStatusText, roundStatusColor } = useMemo(() => {
    // PRIORITIZE Future/Active/Locked states
    if (isFutureRound) {
      return { roundStatusText: "Upcoming", roundStatusColor: "default" as const };
    } else if (isLocked) {
      return { roundStatusText: "LOCKED", roundStatusColor: "success" as const };
    } else if (isRoundActive) {
      // Only show completed status if the round is NOT active but is finished
      return { roundStatusText: "ACTIVE", roundStatusColor: "error" as const };
    } else if (isRoundComplete) {
      // This case should only be hit for past, completed but somehow not locked rounds
      return { roundStatusText: "COMPLETED", roundStatusColor: "primary" as const };
    } else {
      // Default for past, incomplete rounds (shouldn't happen in normal flow)
      return { roundStatusText: "PENDING", roundStatusColor: "default" as const };
    }
  }, [isLocked, isRoundComplete, isRoundActive, isFutureRound]);

  // Handler for locking the round
  const handleLockRound = useCallback(() => {
    handleLockRoundScores(roundIndex);
  }, [handleLockRoundScores, roundIndex]);

  const renderFrame = (homePositionIndex: number) => {
    if (!match?.frames || match.frames.length === 0) {
      return (
          <Grid item xs={12} sm={6} md={3} key={`frame-placeholder-${homePositionIndex}`}>
             <Paper sx={{ p: 2, height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <Typography variant="caption">Frame {homePositionIndex + 1}</Typography>
             </Paper>
          </Grid>
      );
    }

    const currentRoundNumber = roundIndex + 1;
    const targetHomePosition = homePositionIndex + 1; // UI slot corresponds to home position 1-4

    // --- CRITICAL: Find the correct Frame Object --- 
    // We look up the specific frame based on the round number and the *fixed* home player position (1-4)
    // associated with this UI slot. This ensures we get the correct pre-calculated matchup and player data.
    const frame = match.frames.find(f =>
      f.round === currentRoundNumber &&
      f.homePlayerPosition === targetHomePosition
    );

    if (!frame) {
      return (
          <Grid item xs={12} sm={6} md={3} key={`frame-error-${homePositionIndex}`}>
             <Paper sx={{ p: 2, height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid red' }}>
                <Typography variant="caption" color="error">Error loading frame {targetHomePosition}</Typography>
             </Paper>
          </Grid>
      );
    }

    // --- Get data directly from the found frame --- 
    const homePlayerId = frame.homePlayerId;
    const awayPlayerId = frame.awayPlayerId;
    const winnerPlayerId = frame.winnerPlayerId ?? null;
    const isComplete = frame.isComplete ?? false;
    // Use the fixed position labels stored *within* the frame object. These do not rotate.
    const fixedHomePosLabel = frame.homePlayerPosition.toString(); 
    const fixedAwayPosLabel = frame.awayPlayerPosition;

    // Use the 0-based homePositionIndex for status, breaking, click handlers etc.
    const status = getFrameStatus(roundIndex, homePositionIndex);
    const isBreaking = isHomeTeamBreaking(roundIndex, homePositionIndex); // Pass 0-based index
    
    // FIXED: Ensure editability/clickability respects round state and lock status
    const canEdit = isUserHomeTeamCaptain && isRoundActive && !isLocked && isComplete;
    const isClickableForScore = isUserHomeTeamCaptain && isRoundActive && !isLocked && !isComplete;

    const homePlayerName = getPlayerName(homePlayerId, true);
    const awayPlayerName = getPlayerName(awayPlayerId, false);

    return (
      <Grid item xs={12} sm={6} md={3} key={`frame-${frame.id || homePositionIndex}`}>
        <FrameCard
          round={roundIndex}
          position={homePositionIndex} // Pass the 0-based index for internal logic if needed
          frameNumber={targetHomePosition} // Display 1-4
          status={status}
          isHovered={hoveredFrame?.roundIndex === roundIndex && hoveredFrame?.position === homePositionIndex}
          isBreaking={isBreaking}
          isClickable={isClickableForScore}
          canEdit={canEdit}
          homePlayerName={homePlayerName}
          awayPlayerName={awayPlayerName}
          homePlayerId={homePlayerId}
          awayPlayerId={awayPlayerId}
          winnerPlayerId={winnerPlayerId}
          onMouseEnter={() => setHoveredFrame({ roundIndex, position: homePositionIndex })}
          onMouseLeave={() => setHoveredFrame(null)}
          onClick={(event) => {
            if (isLocked) return;
            if (isComplete || isClickableForScore) {
              handleFrameClick(roundIndex, homePositionIndex, event);
            }
          }}
          onReset={(event) => handleResetFrame(roundIndex, homePositionIndex, event)}
          cueBallImage={cueBallImage}
          cueBallDarkImage={cueBallDarkImage}
          isUserHomeTeamCaptain={isUserHomeTeamCaptain}
          isUserAwayTeamCaptain={isUserAwayTeamCaptain}
          homePositionLabel={fixedHomePosLabel} // Use the correct fixed label from frame
          awayPositionLabel={fixedAwayPosLabel} // Use the correct fixed label from frame
          isRoundLocked={isLocked} // Pass round lock status
        />
      </Grid>
    );
  };

  // Show lock button if round is complete, not locked, and user is home captain, and gameState is scoring_round or round_completed
  const showLockButton = isCompletePendingLock && isUserHomeTeamCaptain && (gameState === 'scoring_round' || gameState === 'round_completed');

  // Debug log to confirm re-rendering
  console.log('RoundDisplay render', { roundIndex, gameState, isCompletePendingLock, isUserHomeTeamCaptain, showLockButton });

  // Move this useMemo outside the component definition
  const frameGrid = useMemo(() =>
    Array.from({ length: 4 }).map((_, position) => renderFrame(position)),
    [roundIndex, match, activeRound, isRoundComplete, isRoundActive, homeTeamConfirmed, awayTeamConfirmed, hoveredFrame, getPlayerName, isHomeTeamBreaking, handleFrameClick, handleResetFrame, getFrameStatus, gameState]
  );

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
});

export default RoundDisplay; 