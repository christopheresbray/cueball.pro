// src/components/team/LineupSelection.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Select, 
  MenuItem, 
  Avatar, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  FormControl, 
  InputLabel,
  Alert,
  Paper,
  SelectChangeEvent
} from '@mui/material';

interface Player {
  id: string;
  name: string;
}

interface LineupSelectionProps {
  teamPlayers: Player[];
  selectedLineup: string[];
  onLineupChange: (lineup: string[]) => void;
  readOnly?: boolean;
  teamName?: string;
}

const LineupSelection: React.FC<LineupSelectionProps> = ({ 
  teamPlayers = [], 
  selectedLineup = [], 
  onLineupChange, 
  readOnly = false,
  teamName = "Your Team" 
}) => {
  const [lineup, setLineup] = useState<string[]>(Array(4).fill(''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize lineup from props
    if (selectedLineup && selectedLineup.length > 0) {
      setLineup(selectedLineup.slice(0, 4));
    }
  }, [selectedLineup]);

  const handlePlayerSelect = (position: number, playerId: string) => {
    const newLineup = [...lineup];
    
    // Find if player is already in lineup
    const existingIndex = newLineup.findIndex(id => id === playerId);
    
    // If player is already selected in another position, swap them
    if (existingIndex !== -1 && existingIndex !== position) {
      newLineup[existingIndex] = newLineup[position];
    }
    
    // Set the new player
    newLineup[position] = playerId;
    setLineup(newLineup);
  };

  const handleSaveLineup = () => {
    // Validate lineup - all positions must be filled
    if (lineup.some(position => !position)) {
      setError("Please select players for all positions");
      return;
    }
    
    setSaving(true);
    
    // Call the parent component's callback
    if (onLineupChange) {
      onLineupChange(lineup);
    }
    
    setSaving(false);
  };

  const getPlayerName = (playerId: string) => {
    const player = teamPlayers.find(p => p.id === playerId);
    return player ? player.name : 'Select Player';
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 4 }}>
          {teamName} Lineup
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ p: 4, mb: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Selected Players
          </Typography>
          
          <List>
            {[0, 1, 2, 3].map((position) => (
              <ListItem key={position} sx={{ borderBottom: '1px solid #eee' }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {position + 1}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={lineup[position] ? getPlayerName(lineup[position]) : 'Not selected'} 
                  secondary={`Position ${position + 1}`}
                />
                
                {!readOnly && (
                  <FormControl variant="outlined" size="small" sx={{ width: 160 }}>
                    <InputLabel id={`player-select-${position}`}>Player</InputLabel>
                    <Select
                      labelId={`player-select-${position}`}
                      value={lineup[position] || ''}
                      onChange={(e: SelectChangeEvent) => handlePlayerSelect(position, e.target.value)}
                      label="Player"
                    >
                      <MenuItem value="">
                        <em>Select Player</em>
                      </MenuItem>
                      {teamPlayers.map((player) => (
                        <MenuItem key={player.id} value={player.id}>
                          {player.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </ListItem>
            ))}
          </List>
        </Paper>
        
        {!readOnly && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveLineup}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Lineup'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LineupSelection;
