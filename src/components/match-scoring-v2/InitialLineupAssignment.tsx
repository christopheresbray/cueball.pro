import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Button,
  Avatar,
  Chip,
  Grid
} from '@mui/material';
import { CheckCircle, Assignment, Error } from '@mui/icons-material';
import { Player } from '../../types/match';

interface InitialLineupAssignmentProps {
  teamName: string;
  availablePlayers: Player[];
  isHomeTeam: boolean;
  positions: (string | number)[]; // ['A', 'B', 'C', 'D'] or [1, 2, 3, 4]
  currentAssignments: Record<string | number, string | 'vacant'>; // position -> playerId
  isConfirmed: boolean;
  isLoading?: boolean;
  onAssignPosition: (position: string | number, playerId: string | 'vacant') => void;
  onConfirmLineup: () => void;
  onEditLineup?: () => void;
}

const InitialLineupAssignment: React.FC<InitialLineupAssignmentProps> = ({
  teamName,
  availablePlayers,
  isHomeTeam,
  positions,
  currentAssignments,
  isConfirmed,
  isLoading = false,
  onAssignPosition,
  onConfirmLineup,
  onEditLineup
}) => {
  // Check if all positions are assigned
  const assignedPositions = positions.filter(pos => 
    currentAssignments[pos] && currentAssignments[pos] !== 'vacant'
  );
  const canConfirm = assignedPositions.length === positions.length;

  // Get available players for a specific position (excluding already assigned)
  const getAvailablePlayersForPosition = (currentPosition: string | number) => {
    const currentAssignment = currentAssignments[currentPosition];
    
    // Get all used player IDs from OTHER positions (not this one)
    const usedInOtherPositions = Object.entries(currentAssignments)
      .filter(([pos, playerId]) => 
        pos !== String(currentPosition) && // Not this position
        playerId && 
        playerId !== 'vacant'
      )
      .map(([, playerId]) => playerId);

    

    return availablePlayers.filter(player => {
      if (!player.id) return false;
      
      // Player is available if:
      // 1. They're not assigned to any OTHER position, OR
      // 2. They're the current assignment for THIS position
      const isUsedElsewhere = usedInOtherPositions.includes(player.id);
      const isCurrentAssignment = player.id === currentAssignment;
      
      return !isUsedElsewhere || isCurrentAssignment;
    });
  };

  const getPlayerById = (playerId: string) => {
    return availablePlayers.find(p => p.id === playerId);
  };

  const getStatusIcon = () => {
    if (isConfirmed) return <CheckCircle color="success" />;
    if (canConfirm) return <Assignment color="warning" />;
    return <Error color="error" />;
  };

  const getStatusText = () => {
    if (isConfirmed) return 'Lineup Confirmed';
    if (canConfirm) return 'Ready to Confirm';
    return `${assignedPositions.length}/${positions.length} positions assigned`;
  };

  const getStatusColor = () => {
    if (isConfirmed) return 'success';
    if (canConfirm) return 'warning'; 
    return 'error';
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        avatar={
          <Avatar sx={{ 
            bgcolor: isHomeTeam ? 'primary.main' : 'secondary.main' 
          }}>
            {teamName.charAt(0)}
          </Avatar>
        }
        title={`${teamName} - Initial Lineup`}
        subheader={`${availablePlayers.length} players available`}
        action={
          <Box display="flex" alignItems="center" gap={1}>
            {getStatusIcon()}
            <Chip 
              label={getStatusText()}
              color={getStatusColor() as any}
              variant={isConfirmed ? 'filled' : 'outlined'}
            />
          </Box>
        }
      />
      
      <CardContent>
        <Grid container spacing={2}>
          {positions.map((position) => {
            const currentPlayerId = currentAssignments[position];
            const currentPlayer = currentPlayerId && currentPlayerId !== 'vacant' 
              ? getPlayerById(currentPlayerId) 
              : null;
            const availablePlayersForPosition = getAvailablePlayersForPosition(position);

            return (
              <Grid item xs={12} sm={6} key={position}>
                <FormControl fullWidth disabled={isConfirmed}>
                  <InputLabel>
                    Position {position} {isHomeTeam ? '(Home)' : '(Away)'}
                  </InputLabel>
                  <Select
                    value={currentPlayerId || 'vacant'}
                    onChange={(e) => onAssignPosition(position, e.target.value)}
                    label={`Position ${position} ${isHomeTeam ? '(Home)' : '(Away)'}`}
                    sx={{
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }
                    }}
                  >
                    <MenuItem value="vacant">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.400' }}>
                          -
                        </Avatar>
                        <Typography color="text.secondary">Vacant</Typography>
                      </Box>
                    </MenuItem>
                    {availablePlayersForPosition.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', bgcolor: isHomeTeam ? 'primary.main' : 'secondary.main' }}>
                            {(player.name || player.firstName).charAt(0)}
                          </Avatar>
                          {player.name || `${player.firstName} ${player.lastName}`}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Show current assignment with better styling */}
                {currentPlayer && (
                  <Box mt={1} display="flex" alignItems="center" gap={1}>
                    <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="success.main" fontWeight="medium">
                      {currentPlayer.name || `${currentPlayer.firstName} ${currentPlayer.lastName}`}
                    </Typography>
                  </Box>
                )}
              </Grid>
            );
          })}
        </Grid>

        {/* Action Buttons */}
        <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
          {isConfirmed ? (
            <Button
              variant="outlined"
              onClick={onEditLineup}
              disabled={isLoading}
            >
              Edit Lineup
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={onConfirmLineup}
              disabled={!canConfirm || isLoading}
              color={isHomeTeam ? 'primary' : 'secondary'}
            >
              {isLoading ? 'Confirming...' : 'Confirm Lineup'}
            </Button>
          )}
        </Box>

        {/* Warning if incomplete lineup */}
        {!canConfirm && !isConfirmed && (
          <Box mt={2}>
            <Typography variant="caption" color="error">
              ⚠️ All {positions.length} positions must be assigned to start the match
            </Typography>
          </Box>
        )}

        {/* Help text */}
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            💡 {isHomeTeam 
              ? 'Home team positions: A, B, C, D' 
              : 'Away team positions: 1, 2, 3, 4'
            }
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InitialLineupAssignment; 