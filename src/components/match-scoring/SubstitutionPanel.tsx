import React, { useState } from 'react';
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
const SubstitutionPanel: React.FC<SubstitutionPanelProps> = ({
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
  const getLineupForNextRound = () => {
    // First check if we have it in our state manager
    if (lineupHistory[nextRoundNumber]) {
      // Convert to home/away structure for consistency
      return {
        home: lineupHistory[nextRoundNumber].homeLineup,
        away: lineupHistory[nextRoundNumber].awayLineup
      };
    }
    
    // Otherwise derive it like before
    let baseHomeLineup: string[] = match?.homeLineup?.slice(0, 4) || [];
    let baseAwayLineup: string[] = match?.awayLineup?.slice(0, 4) || [];
    
    for (let r = nextRoundNumber; r >= 1; r--) {
      if (match?.lineupHistory?.[r]) {
        baseHomeLineup = match.lineupHistory[r].homeLineup;
        baseAwayLineup = match.lineupHistory[r].awayLineup;
        break;
      }
    }
    
    while (baseHomeLineup.length < 4) baseHomeLineup.push('');
    while (baseAwayLineup.length < 4) baseAwayLineup.push('');
    
    return { home: baseHomeLineup, away: baseAwayLineup };
  };

  const nextRoundLineup = getLineupForNextRound();

  const handleSwapClick = (event: React.MouseEvent<HTMLElement>, position: number, isHomeTeam: boolean) => {
    // Prevent default to avoid page jump
    event.preventDefault();
    
    const currentLineup = isHomeTeam ? nextRoundLineup.home : nextRoundLineup.away;
    const currentPlayerId = currentLineup[position];
    setPlayerBeingReplaced(currentPlayerId);
    setSelectingSubFor({ position, isHomeTeam, anchorEl: event.currentTarget });
  };

  const handleCloseSubMenu = () => {
    setSelectingSubFor(null);
    setPlayerBeingReplaced(null);
  };

  const handleSubstituteSelect = (selectedPlayerId: string) => {
    if (!selectingSubFor) return;
    
    // Use the centralized action to handle the substitution
    makeSubstitution(
      selectingSubFor.position,
      selectingSubFor.isHomeTeam,
      selectedPlayerId,
      roundIndex
    );
    
    handleCloseSubMenu();
  };
  
  // Handlers with preventDefault for team confirmation/edit buttons
  const handleConfirmHomeTeam = (event: React.MouseEvent) => {
    event.preventDefault();
    console.log("HOME TEAM CONFIRMED for round:", roundIndex);
    confirmHomeLineup(roundIndex);
  };
  
  const handleEditHomeTeam = (event: React.MouseEvent) => {
    event.preventDefault();
    console.log("HOME TEAM EDIT for round:", roundIndex);
    editHomeLineup(roundIndex);
  };
  
  const handleConfirmAwayTeam = (event: React.MouseEvent) => {
    event.preventDefault();
    console.log("AWAY TEAM CONFIRMED for round:", roundIndex);
    confirmAwayLineup(roundIndex);
  };
  
  const handleEditAwayTeam = (event: React.MouseEvent) => {
    event.preventDefault();
    console.log("AWAY TEAM EDIT for round:", roundIndex);
    editAwayLineup(roundIndex);
  };

  const renderPlayerMatchup = (position: number) => {
    const homePlayerId = nextRoundLineup.home[position];
    const awayPlayerId = nextRoundLineup.away[position];
    
    const homePlayerName = getPlayerNameFromProp(homePlayerId, true);
    const awayPlayerName = getPlayerNameFromProp(awayPlayerId, false);
    
    const canEditHome = isUserHomeTeamCaptain && !homeTeamConfirmed[roundIndex];
    const canEditAway = isUserAwayTeamCaptain && !awayTeamConfirmed[roundIndex];
    
    const positionLetter = getPositionLetter(nextRoundNumber - 1, position);
    const isBreaking = isHomeTeamBreaking(nextRoundNumber - 1, position);

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
          {/* Frame Number */}
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              minWidth: { xs: '24px', md: '40px' },
              fontSize: { xs: '0.875rem', md: '1rem' }
            }}
          >
            {position + 1}
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
              <IconButton size="small" onClick={(event) => handleSwapClick(event, position, true)}>
                <SwapIcon />
              </IconButton>
            )}
          </Box>
          
          {/* Center - Substitution or Action Space */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            width: { xs: 'auto', md: '100px' }
          }}>
            <Chip 
              size="small"
              label="PENDING"
              color="default" 
              variant="outlined"
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
              <IconButton size="small" onClick={(event) => handleSwapClick(event, position, false)}>
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
            
            {/* Position Letter */}
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
              {positionLetter}
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
            <ListSubheader>Select Substitute</ListSubheader>
            {(selectingSubFor.isHomeTeam ? homePlayers : awayPlayers)
              .filter(p => p.id && p.id !== playerBeingReplaced)
              .map(player => {
                const eligibility = canSubstitute(position, selectingSubFor.isHomeTeam, player.id!, roundIndex);
                const subPlayerName = getPlayerNameFromProp(player.id!, selectingSubFor.isHomeTeam);
                const tooltipReason = !eligibility ? 'Player is not eligible for this position' : '';
                
                return (
                  <MenuItem 
                    key={player.id}
                    disabled={!eligibility}
                    onClick={() => handleSubstituteSelect(player.id!)}
                  >
                    <Tooltip title={tooltipReason} placement="right" arrow disableHoverListener={eligibility}>
                      <ListItemText primary={subPlayerName} />
                    </Tooltip>
                    {!eligibility && <CancelIcon color="error" sx={{ ml: 1 }} />}
                    {eligibility && <CheckCircleIcon color="success" sx={{ ml: 1 }} />} 
                  </MenuItem>
                );
            })}
          </Menu>
        )}
      </Paper>
    );
  };

  // Determine the current state of the game flow
  const isSubstitutionPhase = state.state === GameState.SUBSTITUTION_PHASE;
  const isAwaitingConfirmations = state.state === GameState.AWAITING_CONFIRMATIONS;
  const isTransitioning = state.state === GameState.TRANSITIONING_TO_NEXT_ROUND;

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
        {Array.from({ length: 4 }).map((_, position) => renderPlayerMatchup(position))}
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
              >
                Confirm Home Team Lineup
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={handleEditHomeTeam}
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
              >
                Confirm Away Team Lineup
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={handleEditAwayTeam}
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
};

export default SubstitutionPanel; 