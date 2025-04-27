import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListSubheader,
  ListItemText,
  Chip
} from '@mui/material';
import { 
  SwapHoriz as SwapIcon,
  InfoOutlined as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Match, Player } from '../../services/databaseService';
import { getPositionLetter, getOpponentPosition } from '../../utils/matchUtils';
import { useGameFlow, GameState } from '../../context/GameFlowContext';
import { useGameFlowActions } from '../../hooks/useGameFlowActions';

interface SubstitutionPanelProps {
  roundIndex: number;
  match: Match | null;
  homePlayers: Player[];
  awayPlayers: Player[];
  getPlayerForRound: (round: number, position: number, isHomeTeam: boolean) => string;
  getPlayerName: (playerId: string, isHomeTeam: boolean) => string;
  isHomeTeamBreaking: (round: number, position: number) => boolean;
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
  cueBallImage: string;
  cueBallDarkImage: string;
}

/**
 * Component that displays the substitution panel for the next round
 */
const SubstitutionPanel: React.FC<SubstitutionPanelProps> = React.memo(({
  roundIndex,
  match,
  homePlayers,
  awayPlayers,
  getPlayerForRound,
  getPlayerName: getPlayerNameFromProp,
  isHomeTeamBreaking,
  isUserHomeTeamCaptain,
  isUserAwayTeamCaptain,
  cueBallImage,
  cueBallDarkImage
}) => {

  // *** ADD LOGGING HERE ***
  console.log('SubstitutionPanel Props Check:', {
    roundIndex,
    isUserHomeTeamCaptain,
    isUserAwayTeamCaptain
  });
  // ***********************

  const { state } = useGameFlow();
  const { 
    homeTeamConfirmed, 
    awayTeamConfirmed,
    lineupHistory,
    error,
    canSubstitute,
    makeSubstitution,
    confirmHomeLineup,
    confirmAwayLineup,
    editHomeLineup,
    editAwayLineup
  } = useGameFlowActions(match?.id);

  const [selectingSubFor, setSelectingSubFor] = useState<{ position: number; isHomeTeam: boolean; anchorEl: HTMLElement | null } | null>(null);
  const [playerBeingReplaced, setPlayerBeingReplaced] = useState<string | null>(null);
  
  const nextRoundNumber = roundIndex + 2;
  
  // Get the current lineups for the next round, either from state or derived
  const getLineupForNextRound = useCallback(() => {
    // 1. Check GameFlowContext state first
    if (lineupHistory && lineupHistory[nextRoundNumber]) {
      console.log(`SubstitutionPanel: Using lineupHistory from GameFlow state for round ${nextRoundNumber}`);
      return {
        home: lineupHistory[nextRoundNumber].homeLineup,
        away: lineupHistory[nextRoundNumber].awayLineup
      };
    }
    
    // 2. Check Match object's history (might be slightly delayed compared to context)
    if (match?.lineupHistory?.[nextRoundNumber]) {
      console.log(`SubstitutionPanel: Using lineupHistory from Match object for round ${nextRoundNumber}`);
      return {
        home: match.lineupHistory[nextRoundNumber].homeLineup,
        away: match.lineupHistory[nextRoundNumber].awayLineup
      };
    }
    
    // 3. Derive from the most recent *previous* round's lineup history
    let baseHomeLineup: string[] = [];
    let baseAwayLineup: string[] = [];
    let foundPrevious = false;
    if (match?.lineupHistory) {
      // Find the most recent round with lineup data <= current completed round (roundIndex + 1)
      for (let r = roundIndex + 1; r >= 1; r--) {
        if (match.lineupHistory[r]) {
          console.log(`SubstitutionPanel: Deriving next lineup from match history round ${r}`);
          baseHomeLineup = match.lineupHistory[r].homeLineup;
          baseAwayLineup = match.lineupHistory[r].awayLineup;
          foundPrevious = true;
          break;
        }
      }
    }

    // If no history found (shouldn't happen after round 1), default to empty arrays
    if (!foundPrevious) {
       console.warn(`SubstitutionPanel: Could not find previous lineup history to derive from for round ${nextRoundNumber}. Defaulting to empty.`);
    }
    
    // Pad lineups if necessary (should have 4 players)
    while (baseHomeLineup.length < 4) baseHomeLineup.push('');
    while (baseAwayLineup.length < 4) baseAwayLineup.push('');
    
    return { home: baseHomeLineup.slice(0, 4), away: baseAwayLineup.slice(0, 4) };
  }, [match?.lineupHistory, lineupHistory, nextRoundNumber, roundIndex]);

  const nextRoundLineup = useMemo(() => getLineupForNextRound(), [getLineupForNextRound]);

  const handleSwapClick = useCallback((event: React.MouseEvent<HTMLElement>, position: number, isHomeTeam: boolean) => {
    // Prevent default to avoid page jump
    event.preventDefault();
    
    // Get the correct position for the current lineup based on whether it's home or away
    if (isHomeTeam) {
      const currentPlayerId = nextRoundLineup.home[position];
      setPlayerBeingReplaced(currentPlayerId);
      setSelectingSubFor({ position, isHomeTeam, anchorEl: event.currentTarget });
    } else {
      // For away team, we need to get the correct position based on rotation pattern
      const awayPosition = getOpponentPosition(nextRoundNumber, position, true);
      const currentPlayerId = nextRoundLineup.away[awayPosition];
      setPlayerBeingReplaced(currentPlayerId);
      setSelectingSubFor({ position: awayPosition, isHomeTeam, anchorEl: event.currentTarget });
    }
  }, [nextRoundLineup, nextRoundNumber, getOpponentPosition]);

  const handleCloseSubMenu = useCallback(() => {
    setSelectingSubFor(null);
    setPlayerBeingReplaced(null);
  }, []);

  const handleSubstituteSelect = useCallback((selectedPlayerId: string) => {
    if (!selectingSubFor) return;
    
    // Use the centralized action to handle the substitution
    makeSubstitution(
      selectingSubFor.position,
      selectingSubFor.isHomeTeam,
      selectedPlayerId,
      roundIndex
    );
    
    handleCloseSubMenu();
  }, [selectingSubFor, makeSubstitution, roundIndex, handleCloseSubMenu]);
  
  // Handlers with preventDefault for team confirmation/edit buttons
  const handleConfirmHomeTeam = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    console.log('Confirming home team lineup for round:', roundIndex);
    try {
      confirmHomeLineup(roundIndex);
    } catch (error) {
      console.error('Error confirming home team lineup:', error);
    }
  }, [roundIndex, confirmHomeLineup]);
  
  const handleEditHomeTeam = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    console.log('Editing home team lineup for round:', roundIndex);
    try {
      editHomeLineup(roundIndex);
    } catch (error) {
      console.error('Error editing home team lineup:', error);
    }
  }, [roundIndex, editHomeLineup]);
  
  const handleConfirmAwayTeam = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    console.log('Confirming away team lineup for round:', roundIndex);
    try {
      confirmAwayLineup(roundIndex);
    } catch (error) {
      console.error('Error confirming away team lineup:', error);
    }
  }, [roundIndex, confirmAwayLineup]);
  
  const handleEditAwayTeam = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    console.log('Editing away team lineup for round:', roundIndex);
    try {
      editAwayLineup(roundIndex);
    } catch (error) {
      console.error('Error editing away team lineup:', error);
    }
  }, [roundIndex, editAwayLineup]);

  const renderPlayerMatchup = useCallback((position: number) => {
    // Get home player directly from position
    const homePlayerId = nextRoundLineup.home[position];
    
    // CRITICAL FIX: Use getOpponentPosition to maintain correct A-D rotation for away team
    const awayPosition = getOpponentPosition(nextRoundNumber, position, true);
    const awayPlayerId = nextRoundLineup.away[awayPosition];
    
    const homePlayerName = getPlayerNameFromProp(homePlayerId, true);
    const awayPlayerName = getPlayerNameFromProp(awayPlayerId, false);
    
    const canEditHome = isUserHomeTeamCaptain && !homeTeamConfirmed[roundIndex];
    const canEditAway = isUserAwayTeamCaptain && !awayTeamConfirmed[roundIndex];
    
    // Get correct position labels that remain constant
    const homePositionLabel = (position + 1).toString(); // Home team always uses 1-4
    const awayPositionLabel = String.fromCharCode(65 + awayPosition); // Away team always uses A-D
    
    const isBreaking = isHomeTeamBreaking(nextRoundNumber, position);

    return (
      <Paper
        key={`frame-${position}`}
        sx={{
          p: { xs: 1.5, md: 2 },
          position: 'relative',
          borderLeft: '4px solid',
          borderColor: 'action.disabled',
          transition: 'all 0.2s ease',
          mb: 2
        }}
      >
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {/* Frame Position Labels */}
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              minWidth: { xs: '24px', md: '40px' },
              fontSize: { xs: '0.875rem', md: '1rem' }
            }}
          >
            {homePositionLabel}
          </Typography>
          
          {/* Home Player */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flex: 1
          }}>
            <Box>
              <Typography 
                noWrap 
                sx={{ 
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
              >
                {homePlayerName || 'Empty Slot'}
              </Typography>
            </Box>
            {isBreaking && (
              <Box
                component="img"
                src={cueBallImage}
                alt="Break"
                sx={{
                  width: { xs: 16, md: 20 },
                  height: { xs: 16, md: 20 },
                  objectFit: 'contain',
                  flexShrink: 0,
                  ml: 1
                }}
              />
            )}
            {canEditHome && (
              <IconButton 
                size="small" 
                onClick={(event) => handleSwapClick(event, position, true)}
                aria-label={`Substitute player in position ${homePositionLabel}`}
              >
                <SwapIcon />
              </IconButton>
            )}
          </Box>
          
          {/* VS Indicator */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            width: { xs: 'auto', md: '100px' }
          }}>
            <Chip 
              size="small"
              label="VS"
              color="default" 
              variant="outlined"
              sx={{ 
                fontWeight: 'bold',
                letterSpacing: '1px',
                border: '1px dashed',
                borderColor: 'divider',
                color: 'text.secondary',
                '& .MuiChip-label': {
                  px: 2
                }
              }}
            />
          </Box>

          {/* Away Player */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flex: 1,
            justifyContent: 'flex-end'
          }}>
            {canEditAway && (
              <IconButton 
                size="small" 
                onClick={(event) => handleSwapClick(event, awayPosition, false)}
                aria-label={`Substitute player in position ${awayPositionLabel}`}
              >
                <SwapIcon />
              </IconButton>
            )}
            {!isBreaking && (
              <Box
                component="img"
                src={cueBallImage}
                alt="Break"
                sx={{
                  width: { xs: 16, md: 20 },
                  height: { xs: 16, md: 20 },
                  objectFit: 'contain',
                  flexShrink: 0,
                  mr: 1
                }}
              />
            )}
            <Box>
              <Typography 
                noWrap 
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                {awayPlayerName || 'Empty Slot'}
              </Typography>
            </Box>
            
            {/* Away Position Label */}
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.875rem', md: '1rem' },
                ml: 1,
                minWidth: '1.5em',
                textAlign: 'right'
              }}
            >
              {awayPositionLabel}
            </Typography>
          </Box>
        </Box>
        
        {/* Sub Selection Menu */}
        {selectingSubFor?.position === position && (
          <Menu
            anchorEl={selectingSubFor.anchorEl} 
            open={true} 
            onClose={handleCloseSubMenu}
          >
            <ListSubheader>
              Select Substitute for Round {nextRoundNumber}
              {nextRoundNumber === 2 && (
                <Typography variant="caption" color="text.secondary" display="block">
                  All players are eligible for Round 2
                </Typography>  
              )}
              {nextRoundNumber > 2 && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Cannot play in consecutive rounds
                </Typography>  
              )}
            </ListSubheader>
            {(selectingSubFor.isHomeTeam ? homePlayers : awayPlayers)
              .filter(p => p.id && p.id !== playerBeingReplaced)
              .map(player => {
                // Directly check eligibility with the canSubstitute function
                const isEligible = canSubstitute(position, selectingSubFor.isHomeTeam, player.id!, roundIndex);
                const subPlayerName = getPlayerNameFromProp(player.id!, selectingSubFor.isHomeTeam);
                
                // Determine tooltip message based on reason
                let tooltipMessage = "Player is eligible for substitution";
                if (!isEligible) {
                  // For round 2, the only reason is already in lineup
                  if (nextRoundNumber === 2) {
                    tooltipMessage = "Player is already in a different position for this round";
                  } else {
                    // For rounds 3-4, check if played in previous round
                    tooltipMessage = "Player cannot play in consecutive rounds";
                  }
                }
                
                return (
                  <MenuItem 
                    key={player.id}
                    disabled={!isEligible}
                    onClick={() => handleSubstituteSelect(player.id!)}
                    sx={{ 
                      opacity: isEligible ? 1 : 0.7,
                      bgcolor: isEligible ? 'inherit' : 'rgba(0,0,0,0.03)'
                    }}
                  >
                    <Tooltip title={tooltipMessage} placement="right" arrow>
                      <ListItemText 
                        primary={subPlayerName}
                        secondary={!isEligible && tooltipMessage}
                        secondaryTypographyProps={{ color: "error", fontSize: "0.75rem" }}
                      />
                    </Tooltip>
                    {!isEligible && <CancelIcon color="error" sx={{ ml: 1 }} />}
                    {isEligible && <CheckCircleIcon color="success" sx={{ ml: 1 }} />} 
                  </MenuItem>
                );
            })}
          </Menu>
        )}
      </Paper>
    );
  }, [
    nextRoundLineup, 
    getPlayerNameFromProp, 
    isUserHomeTeamCaptain, 
    isUserAwayTeamCaptain, 
    homeTeamConfirmed, 
    awayTeamConfirmed, 
    roundIndex, 
    nextRoundNumber, 
    isHomeTeamBreaking, 
    cueBallImage, 
    handleSwapClick,
    getOpponentPosition
  ]);

  // Determine the current state of the game flow
  const isSubstitutionPhase = state.state === GameState.SUBSTITUTION_PHASE;
  const isAwaitingConfirmations = state.state === GameState.AWAITING_CONFIRMATIONS;
  const isTransitioning = state.state === GameState.TRANSITIONING_TO_NEXT_ROUND;

  // Limit log output - removed console log entirely to improve performance
  const debugInfo = useMemo(() => {
    return {
      isSubstitutionPhase,
      isAwaitingConfirmations,
      isTransitioning,
      homeTeamConfirmed: homeTeamConfirmed[roundIndex],
      awayTeamConfirmed: awayTeamConfirmed[roundIndex]
    };
  }, [isSubstitutionPhase, isAwaitingConfirmations, isTransitioning, homeTeamConfirmed, awayTeamConfirmed, roundIndex]);

  // Inside the component, add useEffect to log state changes
  useEffect(() => {
    console.log('SubstitutionPanel - Current state:', {
      roundIndex,
      nextRoundNumber,
      homeTeamConfirmed: homeTeamConfirmed[roundIndex],
      awayTeamConfirmed: awayTeamConfirmed[roundIndex],
      isUserHomeTeamCaptain,
      isUserAwayTeamCaptain
    });
  }, [roundIndex, nextRoundNumber, homeTeamConfirmed, awayTeamConfirmed, isUserHomeTeamCaptain, isUserAwayTeamCaptain]);

  // Filter available players to only those in original match participants
  const getAvailablePlayers = useCallback((isHomeTeam: boolean) => {
    if (!match?.matchParticipants) return [];
    
    const teamParticipants = isHomeTeam ? 
      match.matchParticipants.homeTeam : 
      match.matchParticipants.awayTeam;
    
    const teamPlayers = isHomeTeam ? homePlayers : awayPlayers;
    
    return teamPlayers.filter(player => 
      player.id && teamParticipants.includes(player.id)
    );
  }, [match?.matchParticipants, homePlayers, awayPlayers]);

  const renderSubstitutionMenu = useCallback(() => {
    if (!selectingSubFor) return null;
    
    const { position, isHomeTeam } = selectingSubFor;
    const availablePlayers = getAvailablePlayers(isHomeTeam);
    
    // Get position label for the menu header
    const positionLabel = isHomeTeam 
      ? `${position + 1}` // Home team uses 1-4
      : String.fromCharCode(65 + position); // Away team uses A-D
    
    // Get current player in this position for the next round
    const currentLineup = isHomeTeam ? nextRoundLineup.home : nextRoundLineup.away;
    const currentPlayerId = currentLineup[position];
    const currentPlayerName = getPlayerNameFromProp(currentPlayerId, isHomeTeam);
    
    // Get current round number (1-indexed)
    const currentRoundNum = roundIndex + 1;
    const nextRoundNum = roundIndex + 2;
    
    return (
      <Menu
        anchorEl={selectingSubFor.anchorEl}
        open={Boolean(selectingSubFor)}
        onClose={handleCloseSubMenu}
      >
        <ListSubheader>
          <Typography variant="subtitle2">
            Select Player for Position {positionLabel} in Round {nextRoundNum}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Current: {currentPlayerName || 'Empty'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Players must be from original match participants and cannot be in multiple positions
          </Typography>
        </ListSubheader>
        
        {availablePlayers.map(player => {
          if (!player.id) return null;
          
          // Check if this would be a valid substitution
          const isEligible = canSubstitute(position, isHomeTeam, player.id, roundIndex);
          
          // Get player's current position in this round (if any)
          const currentRoundLineup = isHomeTeam ? nextRoundLineup.home : nextRoundLineup.away;
          const currentPosition = currentRoundLineup.indexOf(player.id);
          
          // Determine ineligibility reason
          let ineligibilityReason = '';
          if (!isEligible) {
            if (currentPosition !== -1) {
              if (currentPosition === position) {
                // This shouldn't happen as they should be eligible to stay in position
                ineligibilityReason = 'Current player in this position';
              } else if ((isHomeTeam ? nextRoundLineup.home : nextRoundLineup.away)[currentPosition] !== player.id) {
                ineligibilityReason = 'Being substituted out from another position';
              } else {
                ineligibilityReason = `Already in Position ${
                  isHomeTeam ? 
                  currentPosition + 1 : 
                  String.fromCharCode(65 + currentPosition)
                }`;
              }
            }
          }
          
          return (
            <MenuItem
              key={player.id}
              onClick={() => handleSubstituteSelect(player.id!)}
              disabled={!isEligible}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: isEligible ? 1 : 0.7,
                bgcolor: isEligible ? 'inherit' : 'action.hover'
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography>
                  {getPlayerNameFromProp(player.id, isHomeTeam)}
                </Typography>
                {ineligibilityReason && (
                  <Typography variant="caption" color="error">
                    {ineligibilityReason}
                  </Typography>
                )}
              </Box>
              {isEligible ? (
                <CheckCircleIcon color="success" sx={{ ml: 2 }} />
              ) : (
                <CancelIcon color="error" sx={{ ml: 2 }} />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    );
  }, [
    selectingSubFor,
    getAvailablePlayers,
    nextRoundLineup,
    roundIndex,
    handleCloseSubMenu,
    handleSubstituteSelect,
    getPlayerNameFromProp,
    canSubstitute,
    match?.lineupHistory
  ]);

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2, mb: 4, border: '1px dashed grey' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Round {nextRoundNumber}
          <Chip 
            size="small" 
            label="Upcoming" 
            color="default" 
            variant="outlined"
            sx={{ ml: 2 }} 
          />
          <Tooltip title="After completing all frames, you can make substitutions for the next round. Rules: A player can't play in two positions in the same round, and must sit out at least one round before playing in a different position.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {useMemo(() => 
          Array.from({ length: 4 }).map((_, position) => renderPlayerMatchup(position)), 
          [renderPlayerMatchup]
        )}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3, gap: 2 }}>
        {isUserHomeTeamCaptain && (
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            {!homeTeamConfirmed[roundIndex] ? (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleConfirmHomeTeam}
                id="confirm-home-team-button"
              >
                Confirm Home Team Lineup
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={handleEditHomeTeam}
                id="edit-home-team-button"
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                    borderColor: 'primary.main'
                  } 
                }}
              >
                Edit Home Team Lineup
              </Button>
            )}
          </Box>
        )}
        
        {isUserAwayTeamCaptain && (
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            {!awayTeamConfirmed[roundIndex] ? (
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={handleConfirmAwayTeam}
                id="confirm-away-team-button"
              >
                Confirm Away Team Lineup
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={handleEditAwayTeam}
                id="edit-away-team-button"
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'rgba(156, 39, 176, 0.08)',
                    borderColor: 'secondary.main'
                  } 
                }}
              >
                Edit Away Team Lineup
              </Button>
            )}
          </Box>
        )}
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {isAwaitingConfirmations && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {!homeTeamConfirmed[roundIndex] && !awayTeamConfirmed[roundIndex] ? (
            'Waiting for both teams to confirm their lineups'
          ) : !homeTeamConfirmed[roundIndex] ? (
            'Waiting for home team to confirm their lineup'
          ) : (
            'Waiting for away team to confirm their lineup'
          )}
        </Alert>
      )}
      
      {isTransitioning && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Both teams have confirmed their lineups. Advancing to Round {nextRoundNumber}...
        </Alert>
      )}
    </Paper>
  );
});

export default SubstitutionPanel; 