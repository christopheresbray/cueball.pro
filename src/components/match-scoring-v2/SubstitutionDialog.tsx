// src/components/match-scoring-v2/SubstitutionDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import { FrameWithPlayers } from '../../types/matchV2';
import { Player } from '../../types/match';

interface SubstitutionDialogProps {
  open: boolean;
  round: number;
  isHomeCaptain: boolean;
  isAwayCaptain: boolean;
  homeTeamPlayers: Player[];
  awayTeamPlayers: Player[];
  roundFrames: FrameWithPlayers[];
  onClose: () => void;
  onSubstitute: (round: number, position: string | number, playerId: string) => Promise<void>;
}

const SubstitutionDialog: React.FC<SubstitutionDialogProps> = ({
  open,
  round,
  isHomeCaptain,
  isAwayCaptain,
  homeTeamPlayers,
  awayTeamPlayers,
  roundFrames,
  onClose,
  onSubstitute
}) => {
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>(isHomeCaptain ? 'home' : 'away');
  const [selectedPosition, setSelectedPosition] = useState<string | number>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [substituting, setSubstituting] = useState(false);

  // Reset dialog state when it opens
  useEffect(() => {
    if (open) {
      setSelectedTeam(isHomeCaptain ? 'home' : 'away');
      setSelectedPosition('');
      setSelectedPlayer('');
      setSubstituting(false);
    }
  }, [open, isHomeCaptain]);

  // Helper to get player name by ID
  const getPlayerName = (playerId: string, isHomeTeam: boolean): string => {
    if (!playerId || playerId === 'vacant') return 'Vacant';
    
    const players = isHomeTeam ? homeTeamPlayers : awayTeamPlayers;
    const player = players.find(p => p.id === playerId);
    
    if (player) {
      return player.name || `${player.firstName} ${player.lastName}` || 'Unknown Player';
    }
    
    return playerId;
  };

  // Always show consistent base positions regardless of round
  const getAvailablePositions = () => {
    if (selectedTeam === 'home') {
      return ['A', 'B', 'C', 'D']; // Always show base home positions
    } else {
      return [1, 2, 3, 4]; // Always show base away positions
    }
  };

  // Get current player in selected base position (map to rotated frame position)
  const getCurrentPlayer = () => {
    if (!selectedPosition) return null;
    
    // Find the frame that contains this base position for this round
    const frame = roundFrames.find(f => {
      if (selectedTeam === 'home') {
        // For home team, find frame where homePosition matches the selected base position
        return f.homePosition === selectedPosition;
      } else {
        // For away team, find frame where awayPosition matches the selected base position
        return f.awayPosition === selectedPosition;
      }
    });
    
    if (!frame) return null;
    
    const playerId = selectedTeam === 'home' ? frame.homePlayerId : frame.awayPlayerId;
    return playerId;
  };

  // Get available substitute players (exclude current player and players already assigned in this round)
  const getAvailableSubstitutes = () => {
    const currentPlayerId = getCurrentPlayer();
    const players = selectedTeam === 'home' ? homeTeamPlayers : awayTeamPlayers;
    
    // Get all players currently assigned in this round for this team
    const assignedPlayerIds = roundFrames
      .map(f => selectedTeam === 'home' ? f.homePlayerId : f.awayPlayerId)
      .filter(id => id && id !== 'vacant' && id !== currentPlayerId); // Exclude current position
    
    // Return players not currently assigned
    return players.filter(p => 
      p.id && 
      p.id !== currentPlayerId && 
      !assignedPlayerIds.includes(p.id)
    );
  };

  const handleSubstitute = async () => {
    if (!selectedPosition || !selectedPlayer) return;

    setSubstituting(true);
    try {
      // The onSubstitute function expects the base position, which it will map to the correct frame
      await onSubstitute(round, selectedPosition, selectedPlayer);
      handleClose();
    } catch (error) {
      console.error('Error making substitution:', error);
    } finally {
      setSubstituting(false);
    }
  };

  const handleClose = () => {
    if (!substituting) {
      setSelectedTeam(isHomeCaptain ? 'home' : 'away');
      setSelectedPosition('');
      setSelectedPlayer('');
      onClose();
    }
  };

  const currentPlayer = getCurrentPlayer();
  const currentPlayerName = currentPlayer ? getPlayerName(currentPlayer, selectedTeam === 'home') : '';
  const availableSubstitutes = getAvailableSubstitutes();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          🔄 Make Substitution - Round {round}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* Team Selection */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Select Team to Substitute
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {isHomeCaptain && (
                <Button
                  variant={selectedTeam === 'home' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSelectedTeam('home');
                    setSelectedPosition('');
                    setSelectedPlayer('');
                  }}
                  disabled={substituting}
                >
                  Home Team
                </Button>
              )}
              {isAwayCaptain && (
                <Button
                  variant={selectedTeam === 'away' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSelectedTeam('away');
                    setSelectedPosition('');
                    setSelectedPlayer('');
                  }}
                  disabled={substituting}
                >
                  Away Team
                </Button>
              )}
            </Box>
          </Grid>

          {/* Position Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Position</InputLabel>
              <Select
                value={selectedPosition}
                label="Position"
                onChange={(e) => {
                  setSelectedPosition(e.target.value);
                  setSelectedPlayer(''); // Reset player selection
                }}
                disabled={substituting}
              >
                {getAvailablePositions().map(position => (
                  <MenuItem key={position} value={position}>
                    Position {position}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedPosition && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Current player: {currentPlayerName || 'Vacant'}
              </Typography>
            )}
          </Grid>

          {/* Player Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!selectedPosition}>
              <InputLabel>New Player</InputLabel>
              <Select
                value={selectedPlayer}
                label="New Player"
                onChange={(e) => setSelectedPlayer(e.target.value)}
                disabled={!selectedPosition || substituting}
              >
                <MenuItem value="vacant">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.400' }}>?</Avatar>
                    <Typography>Vacant</Typography>
                  </Box>
                </MenuItem>
                {availableSubstitutes.map(player => (
                  <MenuItem key={player.id} value={player.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                        {(player.name || player.firstName || '?')[0].toUpperCase()}
                      </Avatar>
                      <Typography>
                        {player.name || `${player.firstName} ${player.lastName}`}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Current Round Overview */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Round {round} Current Lineup ({selectedTeam === 'home' ? 'Home' : 'Away'} Team)
            </Typography>
            <Card variant="outlined">
              <CardContent sx={{ py: 1 }}>
                <Grid container spacing={1}>
                  {getAvailablePositions().map(position => {
                    // Find the frame for this position in this round
                    const frame = roundFrames.find(f => 
                      selectedTeam === 'home' 
                        ? f.homePosition === position
                        : f.awayPosition === position
                    );
                    const playerId = frame ? (selectedTeam === 'home' ? frame.homePlayerId : frame.awayPlayerId) : null;
                    const playerName = playerId ? getPlayerName(playerId, selectedTeam === 'home') : 'Vacant';
                    
                    return (
                      <Grid item xs={6} sm={3} key={position}>
                        <Chip
                          label={`${position}: ${playerName}`}
                          size="small"
                          color={selectedPosition === position ? 'primary' : 'default'}
                          variant={selectedPosition === position ? 'filled' : 'outlined'}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Substitution Preview */}
          {selectedPosition && selectedPlayer && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Substitution Preview:</strong> Position {selectedPosition} will change from 
                  "{currentPlayerName || 'Vacant'}" to "{getPlayerName(selectedPlayer, selectedTeam === 'home')}"
                  {round === 1 ? ' for this round and all future rounds.' : ' for this round only.'}
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={substituting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubstitute}
          variant="contained"
          disabled={!selectedPosition || !selectedPlayer || substituting}
          startIcon={substituting ? <CircularProgress size={16} /> : null}
        >
          {substituting ? 'Making Substitution...' : 'Make Substitution'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubstitutionDialog; 