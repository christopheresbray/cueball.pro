import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip
} from '@mui/material';
import { Player, Team, Match } from '../../services/databaseService';

interface TeamRosterProps {
  team: Team | null;
  players: Player[];
  match: Match | null;
  isInitialLineup?: boolean;
}

/**
 * Component that displays the roster of players for a team
 */
const TeamRoster: React.FC<TeamRosterProps> = ({
  team,
  players,
  match,
  isInitialLineup = true
}) => {
  return (
    <Paper elevation={1} sx={{ flex: 1, p: 2 }}>
      <Box>
        {players
          .filter(player => match?.[team?.id === match?.homeTeamId ? 'homeLineup' : 'awayLineup']?.includes(player.id!))
          .sort((a, b) => {
            // Captain always comes first
            if (team?.captainUserId === a.userId) return -1;
            if (team?.captainUserId === b.userId) return 1;
            // Then sort by first name
            return a.firstName.localeCompare(b.firstName);
          })
          .map(player => {
            const isInFirstRound = isInitialLineup 
              ? match?.[team?.id === match?.homeTeamId ? 'homeLineup' : 'awayLineup']?.slice(0, 4).includes(player.id!)
              : false;
            const isCaptain = team?.captainUserId === player.userId;
            return (
              <Box key={player.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography>
                  {player.firstName} {player.lastName}
                </Typography>
                {isCaptain && (
                  <Chip 
                    label="Captain" 
                    size="small" 
                    color={team?.id === match?.homeTeamId ? "primary" : "secondary"}
                    variant="outlined"
                    sx={{ 
                      height: 20,
                      '& .MuiChip-label': { 
                        px: 1,
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                )}
                {!isInFirstRound && (
                  <Chip 
                    label="Sub" 
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ 
                      height: 20,
                      '& .MuiChip-label': { 
                        px: 1,
                        fontSize: '0.7rem'
                      }
                    }}
                  />
                )}
              </Box>
            );
          })}
      </Box>
    </Paper>
  );
};

export default TeamRoster; 