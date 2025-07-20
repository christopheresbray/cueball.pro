// src/components/match-scoring-v2/SubstitutionDialog.tsx

import React, { useState } from 'react';
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
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [selectedPosition, setSelectedPosition] = useState<string | number>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [substituting, setSubstituting] = useState(false);

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

  // Get available positions for the selected team
  const getAvailablePositions = () => {
    if (selectedTeam === 'home') {
      return Array.from(new Set(roundFrames.map(f => f.homePosition))).sort();
    } else {
      return Array.from(new Set(roundFrames.map(f => f.awayPosition))).sort();
    }
  };

  // Get current player in selected position
  const getCurrentPlayer = () => {
    if (!selectedPosition) return null;
    
    const frame = roundFrames.find(f => 
      selectedTeam === 'home' 
        ? f.homePosition === selectedPosition
        : f.awayPosition === selectedPosition
    );
    
    if (!frame) return null;
    
    const playerId = selectedTeam === 'home' ? frame.homePlayerId : frame.awayPlayerId;
    return playerId;
  };

  // Get available substitute players (exclude current player)
  const getAvailableSubstitutes = () => {
    const currentPlayerId = getCurrentPlayer();
    const players = selectedTeam === 'home' ? homeTeamPlayers : awayTeamPlayers;
    
    // For now, simple logic: all team players except current player
    return players.filter(p => p.id && p.id !== currentPlayerId);
  };

  const handleSubstitute = async () => {
    if (!selectedPosition || !selectedPlayer) return;

    setSubstituting(true);
    try {
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
      setSelectedTeam('home');
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
                  onClick={() => setSelectedTeam('home')}
                  disabled={substituting}
                >
                  Home Team
                </Button>
              )}
              {isAwayCaptain && (
                <Button
                  variant={selectedTeam === 'away' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedTeam('away')}
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
                {availableSubstitutes.map(player => (
                  <MenuItem key={player.id} value={player.id}>
                    {getPlayerName(player.id!, selectedTeam === 'home')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Current Player Info */}
          {selectedPosition && currentPlayer && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Current player in Position {selectedPosition}:</strong> {currentPlayerName}
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Substitution Preview */}
          {selectedPosition && selectedPlayer && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Substitution Preview
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      avatar={
                        <Avatar sx={{ 
                          bgcolor: selectedTeam === 'home' ? '#1976d2' : '#d32f2f',
                          color: 'white',
                          fontSize: '0.8rem'
                        }}>
                          {selectedPosition}
                        </Avatar>
                      }
                      label={currentPlayerName}
                      variant="outlined"
                    />
                    <Typography>→</Typography>
                    <Chip 
                      avatar={
                        <Avatar sx={{ 
                          bgcolor: selectedTeam === 'home' ? '#1976d2' : '#d32f2f',
                          color: 'white',
                          fontSize: '0.8rem'
                        }}>
                          {selectedPosition}
                        </Avatar>
                      }
                      label={getPlayerName(selectedPlayer, selectedTeam === 'home')}
                      color="primary"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={substituting}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubstitute}
          disabled={!selectedPosition || !selectedPlayer || substituting}
          startIcon={substituting ? <CircularProgress size={16} /> : null}
        >
          {substituting ? 'Substituting...' : 'Make Substitution'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubstitutionDialog; 