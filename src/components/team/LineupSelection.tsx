// src/components/team/LineupSelection.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Avatar, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Alert,
  Paper,
  Grid,
  Divider
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
  isHomeTeam?: boolean;
}

const LineupSelection: React.FC<LineupSelectionProps> = ({ 
  teamPlayers = [], 
  selectedLineup = [], 
  onLineupChange, 
  readOnly = false,
  teamName = "Your Team",
  isHomeTeam = true
}) => {
  const [lineup, setLineup] = useState<string[]>(Array(4).fill(''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);

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
    
    // Reset selection state
    setSelectedPlayerIndex(null);
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

  const handleSelectPositionClick = (index: number) => {
    if (readOnly) return;
    setSelectedPlayerIndex(selectedPlayerIndex === index ? null : index);
  };

  return (
    <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ p: 3, bgcolor: isHomeTeam ? 'primary.light' : 'secondary.light', color: 'white' }}>
          <Typography variant="h6">
            {teamName} Lineup
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ p: 3 }}>
          {/* Position Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const positionLabel = isHomeTeam 
                ? (idx + 1).toString() 
                : String.fromCharCode(65 + idx);
              const playerId = lineup[idx];
              const player = teamPlayers.find(p => p.id === playerId);
              const isSelected = selectedPlayerIndex === idx;
              
              return (
                <Grid item xs={12} sm={6} md={3} key={idx}>
                  <Card 
                    sx={{ 
                      cursor: readOnly ? 'default' : 'pointer',
                      height: '100%',
                      bgcolor: isSelected ? (isHomeTeam ? 'primary.light' : 'secondary.light') : 
                               player ? 'background.paper' : 'action.hover',
                      color: isSelected ? '#fff' : 'text.primary',
                      border: isSelected ? '2px solid' : playerId ? '1px solid' : '1px dashed',
                      borderColor: isSelected 
                        ? (isHomeTeam ? 'primary.main' : 'secondary.main')
                        : playerId ? 'divider' : 'action.disabledBackground',
                      transition: 'all 0.2s',
                      '&:hover': readOnly ? {} : {
                        borderColor: isHomeTeam ? 'primary.main' : 'secondary.main',
                        boxShadow: 2
                      }
                    }}
                    onClick={() => handleSelectPositionClick(idx)}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <Avatar 
                        sx={{ 
                          width: 50, 
                          height: 50, 
                          margin: '0 auto 12px', 
                          bgcolor: isSelected ? '#fff' : 
                                   (isHomeTeam ? 'primary.main' : 'secondary.main'),
                          color: isSelected 
                            ? (isHomeTeam ? 'primary.main' : 'secondary.main') 
                            : '#fff',
                          fontSize: '1.25rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {positionLabel}
                      </Avatar>
                      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
                        Position {positionLabel}
                      </Typography>
                      <Box sx={{ mt: 1, minHeight: 45 }}>
                        {player ? (
                          <Typography variant="body1">
                            {player.name}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color={isSelected ? 'inherit' : 'text.secondary'} sx={{ fontStyle: 'italic' }}>
                            {readOnly ? 'Not selected' : 'Click to select player'}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          
          {/* Player Selection */}
          {selectedPlayerIndex !== null && !readOnly && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Select player for Position {isHomeTeam 
                  ? selectedPlayerIndex + 1 
                  : String.fromCharCode(65 + selectedPlayerIndex)}:
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {teamPlayers.map(player => {
                  const isAlreadySelected = lineup.includes(player.id);
                  const isInCurrentPosition = lineup[selectedPlayerIndex] === player.id;
                  
                  return (
                    <ListItem 
                      key={player.id}
                      sx={{ 
                        mb: 1,
                        borderRadius: 1,
                        bgcolor: isInCurrentPosition ? (isHomeTeam ? 'primary.light' : 'secondary.light') : 'background.paper',
                        color: isInCurrentPosition ? 'white' : 'inherit',
                        opacity: isAlreadySelected && !isInCurrentPosition ? 0.5 : 1,
                        cursor: isAlreadySelected && !isInCurrentPosition ? 'not-allowed' : 'pointer',
                        '&:hover': {
                          bgcolor: isAlreadySelected && !isInCurrentPosition 
                            ? 'background.paper' 
                            : isInCurrentPosition 
                              ? (isHomeTeam ? 'primary.main' : 'secondary.main') 
                              : 'action.hover'
                        }
                      }}
                      onClick={() => {
                        if (!isAlreadySelected || isInCurrentPosition) {
                          handlePlayerSelect(selectedPlayerIndex, player.id);
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: isInCurrentPosition ? 'white' : (isHomeTeam ? 'primary.main' : 'secondary.main'),
                            color: isInCurrentPosition ? (isHomeTeam ? 'primary.main' : 'secondary.main') : 'white'
                          }}
                        >
                          {player.name.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={player.name}
                        secondary={isAlreadySelected && !isInCurrentPosition 
                          ? 'Already selected in another position' 
                          : isInCurrentPosition 
                            ? 'Currently selected' 
                            : 'Available'
                        }
                        secondaryTypographyProps={{
                          color: isInCurrentPosition ? 'inherit' : 'text.secondary',
                          sx: { opacity: isInCurrentPosition ? 0.9 : 0.7 }
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
              <Button 
                variant="outlined" 
                color={isHomeTeam ? 'primary' : 'secondary'} 
                sx={{ mt: 2 }}
                onClick={() => setSelectedPlayerIndex(null)}
              >
                Cancel Selection
              </Button>
            </Paper>
          )}
          
          {!readOnly && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color={isHomeTeam ? 'primary' : 'secondary'}
                onClick={handleSaveLineup}
                disabled={saving || lineup.some(position => !position)}
              >
                {saving ? 'Saving...' : 'Save Lineup'}
              </Button>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default LineupSelection;
