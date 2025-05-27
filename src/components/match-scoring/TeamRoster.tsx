import React, { useMemo } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, Avatar, Tooltip } from '@mui/material';
import { Player, Team, Match } from '../../services/databaseService';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import StarIcon from '@mui/icons-material/Star'; // Captain icon
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'; // Substituted icon

interface MatchParticipantsProps {
  team: Team;
  players: Player[]; // Roster for the team
  match: Match;
  captainUserId: string | null; // Added captainUserId prop
  isHomeTeam: boolean; // Added isHomeTeam prop
}

const MatchParticipants: React.FC<MatchParticipantsProps> = ({
  team,
  players,
  match,
  captainUserId, // Use prop
  isHomeTeam, // Use prop
}) => {

  // Helper to check if a player was in the initial lineup for this team
  const isPlayerInInitialLineup = (playerId: string): boolean => {
    if (!match?.lineupHistory || !match.lineupHistory[1]) {
      return false;
    }
    const initialLineup = isHomeTeam ? match.lineupHistory[1].homeLineup : match.lineupHistory[1].awayLineup;
    return initialLineup?.some(p => p === playerId) ?? false;
  };

  // Helper to determine rounds played by a player
  const getPlayerRounds = (playerId: string): number[] => {
    const roundsPlayed: number[] = [];
    if (!match?.lineupHistory) return roundsPlayed;

    for (const roundStr in match.lineupHistory) {
      const round = parseInt(roundStr, 10);
      if (isNaN(round)) continue;

      const lineup = match.lineupHistory[round];
      const teamLineup = isHomeTeam ? lineup.homeLineup : lineup.awayLineup;

      if (teamLineup?.some(p => p === playerId)) {
        roundsPlayed.push(round);
      }
    }
    return roundsPlayed;
  };

  // Inline the sorting logic for sortedPlayers:
  const sortedPlayers = [...players].sort((a, b) => {
    const aIsCaptain = a.userId === captainUserId;
    const bIsCaptain = b.userId === captainUserId;
    if (aIsCaptain && !bIsCaptain) return -1;
    if (!aIsCaptain && bIsCaptain) return 1;
    const nameA = (a.firstName || '') + ' ' + (a.lastName || '');
    const nameB = (b.firstName || '') + ' ' + (b.lastName || '');
    return nameA.localeCompare(nameB);
  });

  return (
    <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 1 }}>
        {team.name} ({isHomeTeam ? 'Home' : 'Away'}) Roster
      </Typography>
      <List dense>
        {sortedPlayers.map((player) => {
          // Ensure player ID exists before proceeding
          if (!player.id) {
            console.warn('Player missing ID in TeamRoster:', player);
            return null; // Skip rendering this player
          }

          const roundsPlayed = getPlayerRounds(player.id); // ID is guaranteed here
          const wasInInitialLineup = isPlayerInInitialLineup(player.id); // ID is guaranteed here
          const isCaptain = player.userId === captainUserId; // Check against prop

          return (
            <ListItem key={player.id} disablePadding sx={{ mb: 0.5 }}>
              <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'grey.300' }}>
                <AccountCircleIcon fontSize="small" />
              </Avatar>
              <ListItemText
                primary={`${player.firstName} ${player.lastName}`}
                secondary={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    {isCaptain && (
                      <Tooltip title="Team Captain">
                        <Chip
                          icon={<StarIcon />}
                          label="C"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ height: '18px', fontSize: '0.7rem' }}
                        />
                      </Tooltip>
                    )}
                    {!wasInInitialLineup && roundsPlayed.length > 0 && (
                       <Tooltip title={`Substituted in Round ${Math.min(...roundsPlayed)}`}>
                         <Chip
                          icon={<SwapHorizIcon />}
                          label="Sub"
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ height: '18px', fontSize: '0.7rem' }}
                        />
                      </Tooltip>
                    )}
                    {roundsPlayed.length > 0 ? (
                       <Tooltip title={`Played in round(s): ${roundsPlayed.join(', ')}`}>
                         <Chip label={`R: ${roundsPlayed.join(',')}`} size="small" sx={{ height: '18px', fontSize: '0.7rem' }} />
                       </Tooltip>
                    ): (
                       <Chip label="Bench" size="small" variant="outlined" sx={{ height: '18px', fontSize: '0.7rem' }} />
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default MatchParticipants;