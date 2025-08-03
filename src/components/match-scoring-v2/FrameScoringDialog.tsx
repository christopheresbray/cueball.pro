// src/components/match-scoring-v2/FrameScoringDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from '@mui/material';
import { FrameWithPlayers } from '../../types/matchV2';
import { Player } from '../../types/match';

interface FrameScoringDialogProps {
  open: boolean;
  frame: FrameWithPlayers | null;
  homeTeamPlayers: Player[];
  awayTeamPlayers: Player[];
  onClose: () => void;
  onScore: (frame: FrameWithPlayers, winnerId: string) => Promise<void>;
}

const FrameScoringDialog: React.FC<FrameScoringDialogProps> = ({
  open,
  frame,
  homeTeamPlayers,
  awayTeamPlayers,
  onClose,
  onScore
}) => {
  const [scoring, setScoring] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Helper to get player name by ID
  const getPlayerName = (playerId: string, isHomeTeam: boolean): string => {
    if (!playerId || playerId === 'vacant') return 'Vacant';
    
    const players = isHomeTeam ? homeTeamPlayers : awayTeamPlayers;
    const player = players.find(p => p.id === playerId);
    
    if (player) {
      // Try name first, then firstName + lastName, then fallback
      const name = player.name || `${player.firstName || ''} ${player.lastName || ''}`.trim();
      return name || 'Unknown Player';
    }
    
    // If no player found, return a more user-friendly message
    console.warn(`Player not found for ID: ${playerId}, isHomeTeam: ${isHomeTeam}`);
    return 'Player Not Found';
  };

  // Determine if this is initial scoring or editing
  const isEditing = frame?.isComplete || false;

  // Reset state when dialog opens/closes or frame changes
  useEffect(() => {
    if (open && frame) {
      // Reset state when opening with a new frame
      setScoring(false);
      setSelectedWinner(null);
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
    }
  }, [open, frame?.frameId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [autoCloseTimer]);
  
  const handlePlayerTap = async (playerId: string) => {
    if (!frame || scoring) return;

    if (!isEditing) {
      // Record Initial Result mode - score immediately and auto-close
      setScoring(true);
      setSelectedWinner(playerId);
      
      try {
        await onScore(frame, playerId);
        
        // Auto-close after 0.75 seconds (reduced for faster UX)
        const timer = setTimeout(() => {
          // Double-check that the dialog is still open before closing
          if (open && !isEditing) {
            onClose();
          }
        }, 750);
        setAutoCloseTimer(timer);
        
      } catch (error) {
        console.error('Error scoring frame:', error);
        setScoring(false);
        setSelectedWinner(null);
      }
    } else {
      // Edit mode - save the new winner and auto-close (same as Reverse button)
      setScoring(true);
      setSelectedWinner(playerId); // Update UI immediately to show color change
      
      try {
        await onScore(frame, playerId);
        
        // Auto-close after 0.75 seconds (same as initial scoring and reverse)
        const timer = setTimeout(() => {
          if (open && isEditing) {
            onClose();
          }
        }, 750);
        setAutoCloseTimer(timer);
        
      } catch (error) {
        console.error('Error updating frame winner:', error);
        setScoring(false);
        setSelectedWinner(null);
      }
    }
  };

  const handleReverse = async () => {
    if (!frame || !isEditing || scoring) return;
    
    const currentWinner = frame.winnerPlayerId;
    const newWinner = currentWinner === frame.homePlayerId ? frame.awayPlayerId : frame.homePlayerId;
    
    setScoring(true);
    setSelectedWinner(newWinner); // Update UI immediately to show color change
    
    try {
      await onScore(frame, newWinner);
      
      // Auto-close after 0.75 seconds (same as initial scoring)
      const timer = setTimeout(() => {
        if (open && isEditing) {
          onClose();
        }
      }, 750);
      setAutoCloseTimer(timer);
      
    } catch (error) {
      console.error('Error reversing frame:', error);
      setScoring(false);
      setSelectedWinner(null);
    }
  };

  const handleResetFrame = async () => {
    if (!frame || scoring) return;
    
    setScoring(true);
    try {
      // Create a reset frame (unscored)
      const resetFrame = {
        ...frame,
        winnerPlayerId: null,
        homeScore: 0,
        awayScore: 0,
        isComplete: false
      };
      
      // Use a special "reset" indicator
      await onScore(resetFrame, 'RESET_FRAME');
      onClose();
    } catch (error) {
      console.error('Error resetting frame:', error);
    } finally {
      setScoring(false);
    }
  };

  const handleClose = () => {
    if (!scoring) {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        setAutoCloseTimer(null);
      }
      setSelectedWinner(null);
      onClose();
    }
  };

  if (!frame) return null;

  const homePlayerName = getPlayerName(frame.homePlayerId, true);
  const awayPlayerName = getPlayerName(frame.awayPlayerId, false);

  // Determine colors based on winner (for editing mode)
  const getPlayerButtonColor = (playerId: string) => {
    if (!isEditing) {
      // Initial scoring mode - grey buttons, green when selected
      if (selectedWinner === playerId) {
        return '#4caf50'; // Green for selected winner
      }
      if (selectedWinner && selectedWinner !== playerId) {
        return '#f44336'; // Red for loser
      }
      return '#bdbdbd'; // Grey default
    } else {
      // Edit mode - use selectedWinner if set (during reverse), otherwise use frame winner
      const currentWinner = selectedWinner || frame.winnerPlayerId;
      if (currentWinner === playerId) {
        return '#4caf50'; // Green for winner
      }
      return '#f44336'; // Red for loser
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          {isEditing ? '📝 Edit Result' : '🎱 Record Result'} - Frame {frame.frameNumber}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Round {frame.round} • Position {frame.homePosition} vs {frame.awayPosition}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {frame.isVacantFrame ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This frame has vacant positions and cannot be scored.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {/* Home Player Button */}
            <Button
              variant="contained"
              disabled={scoring}
              onClick={() => handlePlayerTap(frame.homePlayerId)}
              sx={{ 
                flex: 1,
                py: 3,
                flexDirection: 'column',
                bgcolor: getPlayerButtonColor(frame.homePlayerId),
                color: 'white',
                '&:hover': {
                  bgcolor: getPlayerButtonColor(frame.homePlayerId),
                  opacity: 0.9
                },
                '&:disabled': {
                  bgcolor: getPlayerButtonColor(frame.homePlayerId),
                  color: 'white',
                  opacity: 0.8
                }
              }}
            >
              <Avatar sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                mb: 1,
                fontSize: '1.2rem'
              }}>
                {frame.homePosition}
              </Avatar>
              <Typography variant="h6">
                {homePlayerName}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Home Team
              </Typography>
            </Button>

            {/* Away Player Button */}
            <Button
              variant="contained"
              disabled={scoring}
              onClick={() => handlePlayerTap(frame.awayPlayerId)}
              sx={{ 
                flex: 1,
                py: 3,
                flexDirection: 'column',
                bgcolor: getPlayerButtonColor(frame.awayPlayerId),
                color: 'white',
                '&:hover': {
                  bgcolor: getPlayerButtonColor(frame.awayPlayerId),
                  opacity: 0.9
                },
                '&:disabled': {
                  bgcolor: getPlayerButtonColor(frame.awayPlayerId),
                  color: 'white',
                  opacity: 0.8
                }
              }}
            >
              <Avatar sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                mb: 1,
                fontSize: '1.2rem'
              }}>
                {frame.awayPosition}
              </Avatar>
              <Typography variant="h6">
                {awayPlayerName}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Away Team
              </Typography>
            </Button>
          </Box>
        )}

        {/* Status message */}
        {!isEditing && !selectedWinner && !frame.isVacantFrame && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Tap a player to record who won this frame
          </Typography>
        )}

        {!isEditing && selectedWinner && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ✅ <strong>{getPlayerName(selectedWinner, selectedWinner === frame.homePlayerId)}</strong> wins! 
              Saving result...
            </Typography>
          </Alert>
        )}

        {isEditing && selectedWinner && scoring && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              🔄 <strong>{getPlayerName(selectedWinner, selectedWinner === frame.homePlayerId)}</strong> now wins! 
              Saving changes...
            </Typography>
          </Alert>
        )}
      </DialogContent>

      {/* Different actions for editing vs initial scoring */}
      {isEditing && (
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={(e) => { e.stopPropagation(); handleReverse(); }} 
            disabled={scoring}
            color="warning"
            variant="outlined"
          >
            🔄 Reverse
          </Button>
          
          <Button 
            onClick={(e) => { e.stopPropagation(); handleResetFrame(); }} 
            disabled={scoring}
            color="error"
            variant="outlined"
          >
            🗑️ Reset Frame
          </Button>
          
          <Button 
            onClick={(e) => { e.stopPropagation(); handleClose(); }} 
            disabled={scoring}
            variant="contained"
          >
            ← Back
          </Button>
        </DialogActions>
      )}

      {/* Initial scoring mode has no manual action buttons - auto closes */}
      {!isEditing && !selectedWinner && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={scoring}>
            Cancel
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default FrameScoringDialog; 