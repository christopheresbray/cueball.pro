// src/components/match-scoring-v2/RoundComponent.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  Avatar
} from '@mui/material';

import { RoundComponentProps, ROUND_STATES, COLORS } from '../../types/matchV2';
import { Player } from '../../types/match';

/**
 * Round Component
 * Displays a round with its frames and controls
 */
interface RoundComponentPropsWithPlayers extends RoundComponentProps {
  homeTeamPlayers?: Player[];
  awayTeamPlayers?: Player[];
}

const RoundComponent: React.FC<RoundComponentPropsWithPlayers> = ({
  round,
  frames,
  isHomeCaptain,
  isAwayCaptain,
  actions,
  homeTeamPlayers = [],
  awayTeamPlayers = []
  }) => {
  // Helper function to get player name by ID
  const getPlayerName = (playerId: string, isHomeTeam: boolean): string => {
    if (!playerId || playerId === 'vacant') return 'Vacant';
    
    const players = isHomeTeam ? homeTeamPlayers : awayTeamPlayers;
    const player = players.find(p => p.id === playerId);
    
    if (player) {
      return player.name || `${player.firstName} ${player.lastName}` || 'Unknown Player';
    }
    
    return playerId; // Fallback to ID if player not found
  };

  const getRoundBackgroundColor = () => {
    switch (round.roundState) {
      case 'future': return '#f8f9fa';
      case 'substitution': return '#fff8e1';
      case 'current-unresulted': return '#e8f4f8';
      case 'locked': return '#f1f8e9';
      default: return '#ffffff';
    }
  };

  const getRoundBorderColor = () => {
    switch (round.roundState) {
      case 'current-unresulted': return '#1976d2';
      case 'locked': return '#4caf50';
      case 'substitution': return '#ff9800';
      default: return '#e0e0e0';
    }
  };

  return (
    <Paper 
      elevation={2}
      sx={{ 
        mb: 3,
        backgroundColor: 'white',
        border: `1px solid ${getRoundBorderColor()}`,
        borderRadius: 2
      }}
    >
      {/* Round Header */}
      <Box 
        sx={{ 
          p: 2, 
          backgroundColor: getRoundBackgroundColor(),
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#333' }}>
            Round {round.roundNumber}
          </Typography>
          <Chip
            label={ROUND_STATES[round.roundState] || round.roundState}
            size="small"
            color={round.roundState === 'current-unresulted' ? 'primary' : 'default'}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Round Content */}
      <Box sx={{ p: 2, backgroundColor: 'white' }}>
        {/* Always show frames - no hiding for future rounds */}
        <Box>
          {/* Frames Grid */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: '#333' }}>
              Frames ({frames.length})
            </Typography>
            <Box 
              display="grid" 
              gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" 
              gap={2}
            >
              {frames.map((frame, index) => (
                <Paper 
                  key={frame.frameId || index}
                  variant="outlined"
                  sx={{ 
                    p: 2,
                    opacity: round.roundState === 'future' ? 0.8 : 1,
                    border: round.roundState === 'current-unresulted' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    transition: 'all 0.2s ease-in-out',
                    backgroundColor: frame.isVacantFrame ? '#f5f5f5' : '#fafafa',
                    '&:hover': {
                      transform: round.roundState !== 'future' ? 'translateY(-1px)' : 'none',
                      boxShadow: round.roundState !== 'future' ? '0 4px 8px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight="medium" sx={{ color: '#333' }}>
                      Frame {frame.frameNumber}: Position {frame.homePosition} vs {frame.awayPosition}
                    </Typography>
                    {!frame.isVacantFrame && (
                      <Chip 
                        size="small" 
                        label="Ready" 
                        color="success" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: '#1976d2', color: 'white' }}>
                        {frame.homePosition}
                      </Avatar>
                      <Typography variant="caption" sx={{ color: '#333', fontWeight: 500 }}>
                        {getPlayerName(frame.homePlayerId, true)}
                      </Typography>
                    </Box>
                    
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 'bold' }}>
                      VS
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: '#d32f2f', color: 'white' }}>
                        {frame.awayPosition}
                      </Avatar>
                      <Typography variant="caption" sx={{ color: '#333', fontWeight: 500 }}>
                        {getPlayerName(frame.awayPlayerId, false)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box mt={1} display="flex" justifyContent="center">
                    <Chip 
                      size="small"
                      label={frame.isComplete ? '✅ Completed' : '⏳ Pending'}
                      variant="outlined"
                      color={frame.isComplete ? 'success' : 'default'}
                      sx={{ fontSize: '0.65rem', height: 18 }}
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>

          {/* Round Status Messages */}
          {round.roundState === 'future' && (
            <Alert severity="info" sx={{ mb: 2, backgroundColor: '#e8f4f8', color: '#0d47a1', border: '1px solid #bbdefb' }}>
              📅 Future Round - Will become active after previous round is completed
            </Alert>
          )}

          {round.roundState === 'substitution' && (
            <Alert severity="warning" sx={{ mb: 2, backgroundColor: '#fff8e1', color: '#e65100', border: '1px solid #ffcc02' }}>
              🔄 Substitution phase - captains can make player changes for this round.
            </Alert>
          )}

          {round.roundState === 'current-unresulted' && (
            <Alert severity="info" sx={{ backgroundColor: '#e8f4f8', color: '#0d47a1', border: '1px solid #bbdefb' }}>
              🎱 This round is active - frames can be scored.
            </Alert>
          )}

          {round.roundState === 'locked' && (
            <Alert severity="success" sx={{ backgroundColor: '#f1f8e9', color: '#2e7d32', border: '1px solid #c8e6c9' }}>
              🔒 Round completed and locked.
            </Alert>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default RoundComponent; 