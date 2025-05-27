import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  Alert,
  Stack,
  Divider
} from '@mui/material';
import { Player, Team, Match } from '../../services/databaseService';
import { getAllParticipatingPlayers } from '../../utils/matchUtils';

interface MatchParticipantsProps {
  team: Team;
  players: Player[];
  match: Match | null;
  captainUserId: string | null;
  isHomeTeam: boolean;
}

/**
 * Component that displays the roster of players participating in a match.
 * matchParticipants must be set during lineup submission and cannot change after match starts.
 */
export const MatchParticipants: React.FC<MatchParticipantsProps> = ({ team, players, match, captainUserId, isHomeTeam }) => {
  // Early return if no match or team
  if (!match || !team) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, flex: 1 }}>
        <Alert severity="error">Missing match or team data</Alert>
      </Paper>
    );
  }

  // Get participating player IDs
  const participatingPlayerIds = getAllParticipatingPlayers(match, isHomeTeam);

  // Get the current lineup
  const initialRoundLineup = match.lineupHistory?.[1]?.[isHomeTeam ? 'homeLineup' : 'awayLineup'] || [];

  // Filter and prepare players
  const matchPlayers = players
    .filter(player => player.id && participatingPlayerIds.has(player.id))
    .map(player => ({
      ...player,
      isStarting: initialRoundLineup.includes(player.id || ''),
      isCaptain: captainUserId === player.userId,
      // Get rounds this player participated in
      rounds: Object.entries(match.lineupHistory || {})
        .filter(([_, roundData]) => {
          const lineup = isHomeTeam ? roundData.homeLineup : roundData.awayLineup;
          return lineup?.includes(player.id || '');
        })
        .map(([round]) => parseInt(round))
        .sort((a, b) => a - b)
    }))
    .sort((a, b) => {
      // Sort: Captain first, then starting players, then alphabetically
      if (a.isCaptain && !b.isCaptain) return -1;
      if (!a.isCaptain && b.isCaptain) return 1;
      if (a.isStarting && !b.isStarting) return -1;
      if (!a.isStarting && b.isStarting) return 1;
      return (a.firstName || '').localeCompare(b.firstName || '');
    });

  // Error state if no participants found for in-progress match
  if (match.status === 'in_progress' && matchPlayers.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2, flex: 1 }}>
        <Typography variant="h6" gutterBottom>{team.name}</Typography>
        <Alert severity="error">No participants found for this team</Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, flex: 1, minWidth: '300px' }}>
      {/* Team Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom color="primary">
          {team.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {matchPlayers.length} Players
        </Typography>
      </Box>

      <Divider />

      {/* Players List */}
      <Stack spacing={1} sx={{ mt: 2 }}>
        {matchPlayers.map((player) => (
          <Box
            key={player.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            {/* Player Name */}
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: player.isCaptain ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                {player.firstName} {player.lastName}
              </Typography>
            </Box>

            {/* Player Status Chips */}
            <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
              {player.isCaptain && (
                <Chip
                  label="Captain"
                  size="small"
                  color="primary"
                  sx={{ height: 24 }}
                />
              )}
              {player.isStarting && (
                <Chip
                  label="Starting"
                  size="small"
                  color="info"
                  sx={{ height: 24 }}
                />
              )}
              {player.rounds.length > 0 && !player.isStarting && (
                <Tooltip title={`Played in rounds: ${player.rounds.join(', ')}`}>
                  <Chip
                    label="Sub"
                    size="small"
                    color="secondary"
                    sx={{ height: 24 }}
                  />
                </Tooltip>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* Show message if no players */}
      {matchPlayers.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No players have been assigned to this match yet.
        </Alert>
      )}
    </Paper>
  );
};

export default MatchParticipants; 