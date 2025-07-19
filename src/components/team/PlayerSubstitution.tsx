// src/components/team/PlayerSubstitution.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  SelectChangeEvent,
  Alert
} from '@mui/material';
import { Player } from '../../services/databaseService';

interface PlayerSubstitutionProps {
  open: boolean;
  onClose: () => void;
  onSave: (position: number, playerId: string) => void;
  currentLineup: string[];
  availablePlayers: Player[];
  round: number;
}

const PlayerSubstitution: React.FC<PlayerSubstitutionProps> = ({
  open,
  onClose,
  onSave,
  currentLineup,
  availablePlayers,
  round
}) => {
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Players who are not in the current lineup
  const benchPlayers = availablePlayers.filter(
    player => !currentLineup.includes(player.id!)
  );

  const handlePositionChange = (event: SelectChangeEvent) => {
    setSelectedPosition(Number(event.target.value));
  };

  const handlePlayerChange = (event: SelectChangeEvent) => {
    setSelectedPlayerId(event.target.value);
  };

  const handleSave = () => {
    if (!selectedPlayerId) {
      setError('Please select a player to substitute in');
      return;
    }

    onSave(selectedPosition, selectedPlayerId);
  };

  const getPlayerName = (playerId: string): string => {
    const player = availablePlayers.find(p => p.id === playerId);
    return player ? (player.name || `${player.firstName} ${player.lastName}`) : 'Unknown Player';
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Player Substitution (Round {round})
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            You can make one substitution per round. The player you choose will replace the selected position for all remaining frames in this round.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Replace Player</InputLabel>
            <Select
              value={selectedPosition.toString()}
              onChange={handlePositionChange}
              label="Replace Player"
            >
              {currentLineup.map((playerId, index) => (
                <MenuItem key={`pos-${index}`} value={index.toString()}>
                  Position {index + 1}: {getPlayerName(playerId)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Substitute In</InputLabel>
            <Select
              value={selectedPlayerId}
              onChange={handlePlayerChange}
              label="Substitute In"
              displayEmpty
            >
              <MenuItem value="">
                <em>Select a player</em>
              </MenuItem>
              {benchPlayers.map((player) => (
                <MenuItem key={player.id} value={player.id!}>
                  {player.name || `${player.firstName} ${player.lastName}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {benchPlayers.length === 0 && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              No players available for substitution. Make sure you have more than 4 players on your team.
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={!selectedPlayerId || benchPlayers.length === 0}
        >
          Make Substitution
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlayerSubstitution;
