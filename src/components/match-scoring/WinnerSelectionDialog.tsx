import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Typography,
  Box
} from '@mui/material';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import Edit from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import { Player } from '../../services/databaseService';

interface WinnerSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  homePlayer: Player;
  awayPlayer: Player;
  round: number;
  position: number;
  onSelectWinner: (winnerPlayerId: string) => void;
  onClearFrame?: () => void; // Optional callback to clear the frame
  loading: boolean;
  isEditing?: boolean;
}

/**
 * Dialog for selecting the winner of a frame
 */
const WinnerSelectionDialog: React.FC<WinnerSelectionDialogProps> = ({
  open,
  onClose,
  homePlayer,
  awayPlayer,
  round,
  position,
  onSelectWinner,
  onClearFrame,
  loading,
  isEditing = false
}) => {
  // No need for internal state since we're directly submitting on click

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isEditing ? <Edit color="primary" /> : <EmojiEvents color="primary" />}
          <Typography variant="h6">
            {isEditing ? 'Edit Frame Result' : 'Select Frame Winner'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click on the player who won this frame
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <Paper 
              elevation={1}
              sx={{ 
                p: 3, 
                textAlign: 'center', 
                cursor: 'pointer',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'primary.light',
                  color: 'white',
                  boxShadow: 3
                }
              }}
              onClick={() => {
                if (!loading && homePlayer.id) {
                  onSelectWinner(homePlayer.id);
                }
              }}
            >
              <Typography variant="subtitle1">{homePlayer.firstName} {homePlayer.lastName}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Home Team</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper 
              elevation={1}
              sx={{ 
                p: 3, 
                textAlign: 'center', 
                cursor: 'pointer',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'secondary.light',
                  color: 'white',
                  boxShadow: 3
                }
              }}
              onClick={() => {
                if (!loading && awayPlayer.id) {
                  onSelectWinner(awayPlayer.id);
                }
              }}
            >
              <Typography variant="subtitle1">{awayPlayer.firstName} {awayPlayer.lastName}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Away Team</Typography>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {onClearFrame && (
          <Button 
            onClick={onClearFrame} 
            color="error" 
            disabled={loading}
            startIcon={<ClearIcon />}
          >
            Clear
          </Button>
        )}
        <Button onClick={onClose} color="inherit">Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WinnerSelectionDialog; 