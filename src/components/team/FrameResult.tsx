// src/components/team/FrameResult.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Grid,
  Divider,
  Avatar
} from '@mui/material';
import { Frame, Player } from '../../services/databaseService';
import { awayPositionToChar } from '../../utils/positionUtils';

interface FrameResultProps {
  frame: Frame;
  homePlayer: Player | null;
  awayPlayer: Player | null;
  round: number;
  position: number;
  onWinnerSelect: (frameId: string, winnerPlayerId: string) => Promise<void>;
  canEdit: boolean;
}

const FrameResult: React.FC<FrameResultProps> = ({
  frame,
  homePlayer,
  awayPlayer,
  round,
  position,
  onWinnerSelect,
  canEdit
}) => {
  const getHomeVsAwayLabel = () => {
    const homePosition = position;
    // Convert position to letter (A, B, C, D) for away team using position utilities
    const awayPosition = awayPositionToChar(position);
    
    return `${homePosition} vs ${awayPosition || 'A'}`;
  };
  
  const handleSetWinner = async (winnerPlayerId: string) => {
    if (frame.id && canEdit && !frame.winnerPlayerId) {
      await onWinnerSelect(frame.id, winnerPlayerId);
    }
  };
  
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Round {round} - Frame {position} ({getHomeVsAwayLabel()})
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={5}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                padding: 1,
                borderRadius: 1,
                bgcolor: frame.winnerPlayerId === frame.homePlayerId ? 'success.light' : 'transparent'
              }}
            >
              <Avatar 
                sx={{ 
                  width: 48, 
                  height: 48, 
                  mb: 1,
                  bgcolor: 'primary.main'
                }}
              >
                {position}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                {homePlayer?.name || 'Unknown Player'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Home Player
              </Typography>
              
              {frame.winnerPlayerId === frame.homePlayerId && (
                <Chip 
                  label="Winner" 
                  color="success" 
                  size="small" 
                  sx={{ mt: 1 }} 
                />
              )}
            </Box>
          </Grid>
          
          <Grid item xs={2}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="h6">vs</Typography>
            </Box>
          </Grid>
          
          <Grid item xs={5}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                padding: 1,
                borderRadius: 1,
                bgcolor: frame.winnerPlayerId === frame.awayPlayerId ? 'success.light' : 'transparent'
              }}
            >
              <Avatar 
                sx={{ 
                  width: 48, 
                  height: 48, 
                  mb: 1,
                  bgcolor: 'secondary.main'
                }}
              >
                {awayPositionToChar(position) || 'A'}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                {awayPlayer?.name || 'Unknown Player'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Away Player
              </Typography>
              
              {frame.winnerPlayerId === frame.awayPlayerId && (
                <Chip 
                  label="Winner" 
                  color="success" 
                  size="small" 
                  sx={{ mt: 1 }} 
                />
              )}
            </Box>
          </Grid>
        </Grid>
        
        {canEdit && !frame.winnerPlayerId && (
          <>
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => handleSetWinner(frame.homePlayerId)}
              >
                Home Win
              </Button>
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={() => handleSetWinner(frame.awayPlayerId)}
              >
                Away Win
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FrameResult;
