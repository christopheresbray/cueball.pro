// src/components/match-scoring-v2/RoundComponent.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  Avatar,
  Button,
  FormControl,
  Select,
  MenuItem,
  useTheme,
  CircularProgress
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

// Import cue ball images for breaker indicator (light and dark mode)
import cueBallLight from '../../assets/images/cue-ball.png';
import cueBallDark from '../../assets/images/cue-ball-darkmode.png';

import { RoundComponentProps, ROUND_STATES, COLORS, FrameWithPlayers } from '../../types/matchV2';
import { Player } from '../../types/match';
import { getPlayerDisplayName } from '../../utils/playerNameUtils';

/**
 * Round Component
 * Displays a round with its frames and controls
 */
interface RoundComponentPropsWithPlayers extends RoundComponentProps {
  homeTeamPlayers?: Player[];
  awayTeamPlayers?: Player[];
  homeTeamName?: string;
  awayTeamName?: string;
  matchPhase?: string; // Add matchPhase prop
}

const RoundComponent: React.FC<RoundComponentPropsWithPlayers> = ({
  round,
  frames,
  isHomeCaptain,
  isAwayCaptain,
  actions,
  homeTeamPlayers = [],
  awayTeamPlayers = [],
  homeTeamName = 'Home Team',
  awayTeamName = 'Away Team',
  matchPhase = 'in-progress'
  }) => {
  const [isLockingRound, setIsLockingRound] = useState(false);

  const handleLockRound = async () => {
    setIsLockingRound(true);
    try {
      await actions.lockRound(round.roundNumber);
    } finally {
      setIsLockingRound(false);
    }
  };
  
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const cueBallImage = isDarkMode ? cueBallDark : cueBallLight;
  

  // Helper function to get player name by ID with smart truncation
  const getPlayerName = (playerId: string, isHomeTeam: boolean): string => {
    if (!playerId || playerId === 'vacant') return 'Sit Out';
    
    const players = isHomeTeam ? homeTeamPlayers : awayTeamPlayers;
    const player = players.find(p => p.id === playerId);
    
    if (player) {
      return getPlayerDisplayName(player);
    }
    
    return playerId; // Fallback to ID if player not found
  };

  // Helper function to calculate round score
  const getRoundScore = () => {
    const roundFrames = frames.filter(f => f.round === round.roundNumber);
    let homeScore = 0;
    let awayScore = 0;
    
    roundFrames.forEach(frame => {
      if (frame.isComplete && frame.winnerPlayerId) {
        // Determine if winner is home or away team
        const homeTeamPlayerIds = homeTeamPlayers.map(p => p.id);
        const awayTeamPlayerIds = awayTeamPlayers.map(p => p.id);
        
        if (homeTeamPlayerIds.includes(frame.winnerPlayerId)) {
          homeScore += 1;
        } else if (awayTeamPlayerIds.includes(frame.winnerPlayerId)) {
          awayScore += 1;
        }
      }
    });
    
    return { home: homeScore, away: awayScore };
  };

  // Helper function to get available players for dropdown
  const getAvailablePlayers = (isHomeTeam: boolean, currentPosition: string | number): Player[] => {
    const players = isHomeTeam ? homeTeamPlayers : awayTeamPlayers;
    
    if (round.roundNumber === 1) {
      // Round 1: Allow any player (original behavior)
      const selectedPlayerIds = frames
        .filter(f => f.round === round.roundNumber)
        .filter(f => {
          if (isHomeTeam) {
            return f.homePosition !== currentPosition;
          } else {
            return f.awayPosition !== currentPosition;
          }
        })
        .map(f => isHomeTeam ? f.homePlayerId : f.awayPlayerId)
        .filter(id => id && id !== 'vacant');
      
      return players.filter(p => 
        p.id && !selectedPlayerIds.includes(p.id)
      );
    }
    
    // Round 2+: Enforce substitution rules
    // 1. Find what player was in this position in the previous round
    const previousRound = round.roundNumber - 1;
    const previousFrame = frames.find(f => 
      f.round === previousRound && 
      (isHomeTeam ? f.homePosition === currentPosition : f.awayPosition === currentPosition)
    );
    const previousPlayerId = previousFrame ? 
      (isHomeTeam ? previousFrame.homePlayerId : previousFrame.awayPlayerId) : null;
    
    // 2. Get players already assigned to OTHER positions in this round
    const playersInOtherPositions = frames
      .filter(f => f.round === round.roundNumber)
      .filter(f => {
        if (isHomeTeam) {
          return f.homePosition !== currentPosition;
        } else {
          return f.awayPosition !== currentPosition;
        }
      })
      .map(f => isHomeTeam ? f.homePlayerId : f.awayPlayerId)
      .filter(id => id && id !== 'vacant');
    
    // 3. Filter available players based on substitution rules
    return players.filter(p => {
      if (!p.id) return false;
      
      // Allow the player who was originally in this position
      if (p.id === previousPlayerId) return true;
      
      // Don't allow players who are already assigned to other positions in this round
      if (playersInOtherPositions.includes(p.id)) return false;
      
      // For other players, check if they were playing in the previous round
      const wasPlayingInPreviousRound = frames
        .filter(f => f.round === previousRound)
        .some(f => (isHomeTeam ? f.homePlayerId : f.awayPlayerId) === p.id);
      
      // If they were playing in the previous round, they can only:
      // 1. Stay in their original position (already handled above)
      // 2. Sit out (be vacant) - which means they can't be selected for ANY position
      if (wasPlayingInPreviousRound) {
        return false; // They must either stay in original position or sit out
      }
      
      // Players who weren't playing in previous round can be subbed in
      return true;
    });
  };

  // Check if this frame should show dropdowns (any round in substitution phase)
  const shouldShowDropdowns = (frame: FrameWithPlayers): boolean => {
    return round.roundState === 'substitution';
  };

  // Check if home captain can edit home player
  const canEditHomePlayer = (): boolean => {
    return shouldShowDropdowns(frames[0]) && isHomeCaptain;
  };

  // Check if away captain can edit away player  
  const canEditAwayPlayer = (): boolean => {
    return shouldShowDropdowns(frames[0]) && isAwayCaptain;
  };

  const getRoundBackgroundColor = () => {
    switch (round.roundState) {
      case 'future': return '#000000';           // Black - same as current and completed
      case 'substitution': return '#FFA500';     // Orange per specifications
      case 'current-unresulted': return '#000000'; // Black per specifications
      case 'locked': return '#000000';           // Black per specifications
      default: return '#ffffff';
    }
  };

  const getRoundTextColor = () => {
    switch (round.roundState) {
      case 'future': return '#ffffff';           // White text on black background
      case 'substitution': return '#000000';     // Black text on orange
      case 'current-unresulted': return '#ffffff'; // White text on black
      case 'locked': return '#ffffff';           // White text on black
      default: return '#333333';
    }
  };



  const getRoundBorderColor = () => {
    return '#000000'; // Always black
  };

  return (
    <Paper 
      elevation={2}
      sx={{ 
        mb: 0.5,
        backgroundColor: 'background.paper',
        border: `1px solid ${getRoundBorderColor()}`,
        borderRadius: 2
      }}
    >
      {/* Round Header */}
      <Box 
        sx={{ 
          px: 0.25, 
          py: 1.5, 
          backgroundColor: getRoundBackgroundColor(),
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" position="relative">
          {/* Left: Round Title */}
          <Typography variant="h6" fontWeight="bold" sx={{ color: getRoundTextColor() }}>
            Round {round.roundNumber}
          </Typography>
          
          {/* Center: Round Score - Absolutely positioned to center in screen */}
          <Box sx={{ 
            position: 'absolute', 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}>
            {(() => {
              const roundScore = getRoundScore();
              const totalFrames = frames.filter(f => f.round === round.roundNumber).length;
              const completedFrames = frames.filter(f => f.round === round.roundNumber && f.isComplete).length;
              
              // Only show score if at least one frame is completed
              if (completedFrames > 0) {
                return (
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    sx={{ 
                      color: getRoundTextColor(),
                      fontSize: '1rem',
                      opacity: 0.9
                    }}
                  >
                    ({roundScore.home} - {roundScore.away})
                  </Typography>
                );
              }
              return null;
            })()}
          </Box>
          
          {/* Right: Status Chip */}
          <Chip
            label={ROUND_STATES[round.roundState] || round.roundState}
            size="small"
            color={round.roundState === 'current-unresulted' ? 'primary' : 'default'}
            variant="outlined"
            sx={{
              color: getRoundTextColor(),
              borderColor: getRoundTextColor(),
              '& .MuiChip-label': {
                color: getRoundTextColor()
              }
            }}
          />
        </Box>
      </Box>

      {/* Round Content */}
      <Box sx={{ px: 0.25, py: 1.5, backgroundColor: 'background.paper' }}>
        {/* Always show frames - no hiding for future rounds */}
                  <Box sx={{ mb: 1 }}>
            <Box 
              display="flex" 
              flexDirection="column"
              gap={1}
            >
              {frames
                .filter((frame) => frame.round === round.roundNumber)
                .sort((a, b) => a.frameNumber - b.frameNumber)
                .map((frame, index) => (
                <Paper 
                  key={frame.frameId || index}
                  variant="outlined"
                  onClick={() => (isHomeCaptain && round.roundState === 'current-unresulted') ? actions.editFrame(frame) : undefined}
                  sx={{ 
                    px: 0.25,
                    py: 0.75,
                    opacity: round.roundState === 'future' ? 0.8 : 1,
                    border: round.roundState === 'current-unresulted' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    transition: 'all 0.2s ease-in-out',
                    backgroundColor: frame.isVacantFrame ? '#f8f9fa' : 'background.default',
                    borderRadius: 1,
                    cursor: (isHomeCaptain && round.roundState === 'current-unresulted') ? 'pointer' : 'default',
                    '&:hover': {
                      transform: round.roundState !== 'future' ? 'translateY(-1px)' : 'none',
                      boxShadow: round.roundState !== 'future' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)'
                    }
                  }}
                >

                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    {/* Home Player Position (Outside Highlight) */}
                    <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: '#000000', color: 'white', mr: 0.25 }}>
                      {frame.homePosition}
                    </Avatar>
                    
                    {/* Home Player */}
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                      gap={0.5} 
                      sx={{ 
                        minWidth: '40%',
                        p: 0.25,
                        borderRadius: 1,
                        backgroundColor: frame.isComplete 
                          ? (frame.winnerPlayerId === frame.homePlayerId ? '#4caf50' : '#f44336')
                          : 'transparent',
                        transition: 'background-color 0.3s ease'
                      }}
                    >
                      {canEditHomePlayer() ? (
                        <FormControl size="small" sx={{ minWidth: 120, maxWidth: 150 }}>
                          <Select
                            value={frame.homePlayerId || 'vacant'}
                            onChange={(e) => actions.makeSubstitution(round.roundNumber, frame.homePosition, e.target.value)}
                            sx={{ 
                              fontSize: '0.8rem', 
                              height: 24,
                              backgroundColor: 'background.paper',
                              '& .MuiSelect-select': {
                                padding: '2px 8px',
                                color: 'text.primary',
                                fontWeight: 500
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#1976d2'
                              }
                            }}
                          >
                            {getAvailablePlayers(true, frame.homePosition).map((player) => (
                              <MenuItem key={player.id} value={player.id} sx={{ py: 0.5 }}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <Avatar sx={{ width: 16, height: 16, fontSize: '0.6rem', bgcolor: '#1976d2' }}>
                                    {(player.name || player.firstName).charAt(0)}
                                  </Avatar>
                                  <Typography sx={{ fontSize: '0.8rem', color: '#000', fontWeight: 500 }}>
                                    {getPlayerDisplayName(player)}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#fff', 
                            fontWeight: 600, 
                            fontSize: '0.8rem'
                          }}
                        >
                          {getPlayerName(frame.homePlayerId, true)}
                        </Typography>
                      )}
                    </Box>
                    
                    {/* Home Team Breaker Space - always present for symmetry */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, mx: 0.125 }}>
                      {frame.breakerSide === 'home' && (
                        <img 
                          src={cueBallImage} 
                          alt="Home Breaks" 
                          style={{ 
                            width: 16, 
                            height: 16,
                            opacity: 0.9
                          }} 
                        />
                      )}
                    </Box>
                    
                    {/* Frame Status Indicator */}
                    {isHomeCaptain ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 20 }}>
                        <Typography variant="h6" sx={{ color: '#666', fontSize: '1.1rem' }}>
                          {frame.isComplete 
                            ? (round.roundState === 'locked' ? '🔒' : '🔄')
                            : '❓'
                          }
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#666', fontWeight: 'bold' }}>
                        VS
                      </Typography>
                    )}
                    
                    {/* Away Team Breaker Space - always present for symmetry */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, mx: 0.125 }}>
                      {frame.breakerSide === 'away' && (
                        <img 
                          src={cueBallImage} 
                          alt="Away Breaks" 
                          style={{ 
                            width: 16, 
                            height: 16,
                            opacity: 0.9
                          }} 
                        />
                      )}
                    </Box>
                    
                    {/* Away Player Container - Fixed width to prevent spillage */}
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                      sx={{ 
                        minWidth: '40%',
                        gap: 0.25
                      }}
                    >
                      {/* Away Player */}
                      <Box 
                        display="flex" 
                        alignItems="center" 
                        justifyContent="center"
                        sx={{ 
                          flex: 1,
                          p: 0.25,
                          borderRadius: 1,
                          backgroundColor: frame.isComplete 
                            ? (frame.winnerPlayerId === frame.awayPlayerId ? '#4caf50' : '#f44336')
                            : 'transparent',
                          transition: 'background-color 0.3s ease',
                          maxWidth: 'calc(100% - 24px)' // Reserve space for position avatar
                        }}
                      >
                        {canEditAwayPlayer() ? (
                          <FormControl size="small" sx={{ minWidth: 120, maxWidth: 150 }}>
                            <Select
                              value={frame.awayPlayerId || 'vacant'}
                              onChange={(e) => actions.makeSubstitution(round.roundNumber, frame.awayPosition, e.target.value)}
                              sx={{ 
                                fontSize: '0.8rem', 
                                height: 24,
                                backgroundColor: 'background.paper',
                                '& .MuiSelect-select': {
                                  padding: '2px 8px',
                                  color: 'text.primary',
                                  fontWeight: 500
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#d32f2f'
                                }
                              }}
                            >
                              {getAvailablePlayers(false, frame.awayPosition).map((player) => (
                                <MenuItem key={player.id} value={player.id} sx={{ py: 0.5 }}>
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <Avatar sx={{ width: 16, height: 16, fontSize: '0.6rem', bgcolor: '#d32f2f' }}>
                                      {(player.name || player.firstName).charAt(0)}
                                    </Avatar>
                                    <Typography sx={{ fontSize: '0.8rem', color: '#000', fontWeight: 500 }}>
                                      {getPlayerDisplayName(player)}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#fff', 
                              fontWeight: 600, 
                              fontSize: '0.8rem'
                            }}
                          >
                            {getPlayerName(frame.awayPlayerId, false)}
                          </Typography>
                        )}
                      </Box>
                      
                      {/* Away Player Position (Outside Highlight) */}
                      <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: '#000000', color: 'white', flexShrink: 0, ml: 0.25 }}>
                        {frame.awayPosition}
                      </Avatar>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>



          {round.roundState === 'substitution' && (
            <>              
              {/* Substitution Controls */}
              <Box sx={{ mt: 1 }}>
                {/* All rounds: Lock buttons only (dropdowns are in frames) */}
                <Box>
                  {/* Home Team Lock Button */}
                  {isHomeCaptain && (
                    <Box sx={{ mb: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => actions.lockTeamSubstitutions('home', round.roundNumber)}
                        disabled={round.homeSubState === 'locked'}
                        size="large"
                      >
                        {round.homeSubState === 'locked' ? '🔒 Home Team Locked' : '🔒 Lock Home Team Lineup'}
                      </Button>
                    </Box>
                  )}
                  
                  {/* Away Team Lock Button */}
                  {isAwayCaptain && (
                    <Box sx={{ mb: 1 }}>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => actions.lockTeamSubstitutions('away', round.roundNumber)}
                        disabled={round.awaySubState === 'locked'}
                        size="large"
                      >
                        {round.awaySubState === 'locked' ? '🔒 Away Team Locked' : '🔒 Lock Away Team Lineup'}
                      </Button>
                    </Box>
                  )}
                </Box>

              </Box>
            </>
          )}

          {round.roundState === 'current-unresulted' && (
            <>
              {/* Lock Round Button - appears when all frames completed */}
              {(() => {
                const roundFrames = frames.filter(f => f.round === round.roundNumber);
                const allFramesCompleted = roundFrames.every(f => f.frameState === 'resulted');
                const canLockRound = allFramesCompleted && (isHomeCaptain || isAwayCaptain) && matchPhase !== 'completed';
                const isLastRound = round.roundNumber === 4;
                
                // Debug logging
                console.log(`🔍 Round ${round.roundNumber} lock button check:`, {
                  roundNumber: round.roundNumber,
                  totalFrames: roundFrames.length,
                  frameStates: roundFrames.map(f => ({ 
                    frameId: f.frameId, 
                    frameState: f.frameState, 
                    isComplete: f.isComplete, 
                    winnerPlayerId: f.winnerPlayerId 
                  })),
                  allFramesCompleted,
                  isHomeCaptain,
                  isAwayCaptain,
                  canLockRound,
                  isLastRound,
                  matchPhase
                });
                
                if (canLockRound) {
                  return (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleLockRound}
                        disabled={isLockingRound}
                        sx={{ 
                          fontSize: '1rem',
                          py: 1.5,
                          px: 4,
                          fontWeight: 'bold',
                          background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                          }
                        }}
                      >
                        {isLockingRound ? '🔒 Locking...' : '🔒 Lock Round'}
                        {isLastRound && ' (Final)'}
                      </Button>
                    </Box>
                  );
                }
                
                return null;
              })()}
            </>
          )}


        </Box>
    </Paper>
  );
};

export default RoundComponent; 