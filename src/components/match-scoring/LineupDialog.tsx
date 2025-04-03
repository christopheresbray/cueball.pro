import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
  Box
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { Player } from '../../services/databaseService';

interface LineupDialogProps {
  open: boolean;
  onClose: () => void;
  editingHomeTeam: boolean;
  selectedPlayers: string[];
  onPlayerSelection: (playerId: string) => void;
  onSaveLineup: () => void;
  availablePlayers: Player[];
}

/**
 * Dialog component for setting team lineups
 */
const LineupDialog: React.FC<LineupDialogProps> = ({
  open,
  onClose,
  editingHomeTeam,
  selectedPlayers,
  onPlayerSelection,
  onSaveLineup,
  availablePlayers
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="lineup-dialog-title"
    >
      <DialogTitle id="lineup-dialog-title" sx={{ bgcolor: editingHomeTeam ? 'primary.light' : 'secondary.light', color: 'white' }}>
        {editingHomeTeam ? 'Edit Home Team Lineup' : 'Edit Away Team Lineup'}
      </DialogTitle>
      
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Important</AlertTitle>
          <Typography variant="body2">
            • You must select exactly 4 players for your lineup before the match can start.<br />
            • Once the match starts, lineups cannot be changed.<br />
            • Player positions determine matchups for each round.
          </Typography>
        </Alert>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Select 4 players for the {editingHomeTeam ? 'home' : 'away'} team lineup. 
          {editingHomeTeam 
            ? ' Home positions remain fixed throughout the match.' 
            : ' Away positions rotate each round according to the rotation pattern.'}
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" gutterBottom>
                Available Players
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.paper' }}>
                {availablePlayers
                  .filter(player => !selectedPlayers.includes(player.id!))
                  .map((player) => (
                    <ListItem key={player.id} disablePadding>
                      <ListItemButton 
                        onClick={() => onPlayerSelection(player.id!)}
                        sx={{
                          py: 1,
                          '&:hover': {
                            bgcolor: 'action.hover',
                          }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: editingHomeTeam ? 'primary.main' : 'secondary.main' }}>
                            {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={`${player.firstName} ${player.lastName}`} 
                        />
                      </ListItemButton>
                    </ListItem>
                ))}
                {availablePlayers.filter(player => !selectedPlayers.includes(player.id!)).length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="No more available players" 
                      sx={{ color: 'text.secondary', fontStyle: 'italic' }} 
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: editingHomeTeam ? 'primary.light' : 'secondary.light', color: '#fff' }}>
              <Typography variant="subtitle1" gutterBottom>
                Selected Players ({selectedPlayers.length}/4)
              </Typography>
              <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
              
              <List sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                {Array.from({ length: 4 }).map((_, index) => {
                  const playerId = selectedPlayers[index];
                  const player = playerId ? 
                    availablePlayers.find(p => p.id === playerId) : 
                    null;
                  
                  return (
                    <ListItem 
                      key={index}
                      secondaryAction={
                        player && (
                          <IconButton 
                            edge="end" 
                            onClick={() => onPlayerSelection(playerId)}
                            sx={{ color: 'inherit' }}
                          >
                            <ClearIcon />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: player ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}>
                          {player ? `${index + 1}` : '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={player ? `${player.firstName} ${player.lastName}` : `Player ${index + 1} (click to select)`} 
                        secondary={editingHomeTeam ? `Plays position ${index + 1}` : `Plays position ${String.fromCharCode(65 + index)}`}
                        secondaryTypographyProps={{ color: 'inherit', sx: { opacity: 0.7 } }}
                      />
                    </ListItem>
                  );
                })}
              </List>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {editingHomeTeam ? 
                    'Home team positions (1,2,3,4) stay fixed each round.' : 
                    'Away team positions (A,B,C,D) rotate each round according to the rotation pattern.'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
    
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onSaveLineup}
          variant="contained"
          color={editingHomeTeam ? 'primary' : 'secondary'}
          disabled={selectedPlayers.length !== 4}
        >
          Save Lineup
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LineupDialog; 