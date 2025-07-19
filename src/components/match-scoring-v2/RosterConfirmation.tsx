import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Button,
  Box,
  Chip,
  Avatar,
  CircularProgress
} from '@mui/material';
import { CheckCircle, Schedule, Error } from '@mui/icons-material';
import { Player } from '../../types/match';

interface RosterConfirmationProps {
  teamName: string;
  teamPlayers: Player[];
  isHomeTeam: boolean;
  availabilityStatus: Record<string, boolean>; // playerId -> available
  isConfirmed: boolean;
  isLoading?: boolean;
  onToggleAvailability: (playerId: string, available: boolean) => void;
  onConfirmRoster: () => void;
  onEditRoster?: () => void; // Allow editing confirmed roster
}

const RosterConfirmation: React.FC<RosterConfirmationProps> = ({
  teamName,
  teamPlayers,
  isHomeTeam,
  availabilityStatus,
  isConfirmed,
  isLoading = false,
  onToggleAvailability,
  onConfirmRoster,
  onEditRoster
}) => {
  const availablePlayers = teamPlayers.filter(player => 
    player.id && availabilityStatus[player.id] !== false
  );

  const canConfirm = availablePlayers.length >= 4; // Minimum 4 players needed

  const getStatusIcon = () => {
    if (isConfirmed) return <CheckCircle color="success" />;
    if (canConfirm) return <Schedule color="warning" />;
    return <Error color="error" />;
  };

  const getStatusText = () => {
    if (isConfirmed) return 'Roster Confirmed';
    if (canConfirm) return 'Ready to Confirm';
    return `Need ${4 - availablePlayers.length} more players`;
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
        title={teamName}
        subheader={`${availablePlayers.length}/${teamPlayers.length} players available`}
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
        {/* All Players in Single List */}
        {teamPlayers.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Team Roster ({availablePlayers.length}/{teamPlayers.length} available)
            </Typography>
            <List dense>
              {teamPlayers.map((player) => {
                const isAvailable = player.id ? availabilityStatus[player.id] !== false : false;
                return (
                  <ListItem key={player.id} disabled={isConfirmed}>
                    <ListItemText 
                      primary={
                        <Typography 
                          variant="body2" 
                          color={isAvailable ? 'text.primary' : 'text.disabled'}
                        >
                          {player.name || `${player.firstName} ${player.lastName}`}
                        </Typography>
                      }
                      secondary={player.email || undefined}
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={isAvailable}
                        onChange={(e) => player.id && onToggleAvailability(player.id, e.target.checked)}
                        disabled={isConfirmed}
                        color={isAvailable ? "success" : "default"}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {availablePlayers.length} of {teamPlayers.length} players available
          </Typography>
          
          {isConfirmed ? (
            <Chip 
              icon={<CheckCircle />}
              label="Roster Confirmed" 
              color="success" 
              variant="filled"
            />
          ) : (
            <Button
              variant="contained"
              onClick={onConfirmRoster}
              disabled={isLoading || availablePlayers.length === 0}
              startIcon={isLoading ? <CircularProgress size={16} /> : <CheckCircle />}
              color={isHomeTeam ? 'primary' : 'secondary'}
              sx={{ minWidth: 140 }}
            >
              {isLoading ? 'Confirming...' : 'Confirm Roster'}
            </Button>
          )}
        </Box>

        {/* Warning if insufficient players */}
        {!canConfirm && !isConfirmed && (
          <Box mt={2}>
            <Typography variant="caption" color="error">
              ⚠️ Minimum 4 available players required to start the match
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RosterConfirmation; 