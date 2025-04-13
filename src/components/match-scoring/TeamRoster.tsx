import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip
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
  // Display all players on the team, not just those in lineups
  // This ensures that eligible substitutes are shown even if they haven't been selected yet
  
  // Helper function to find which rounds a player appears in
  const getPlayerRounds = (playerId: string) => {
    if (!match || !team || !playerId) return [];
    
    const isHomeTeam = team.id === match.homeTeamId;
    const rounds: number[] = [];
    
    // Check if player is in initial lineup (Round 1)
    const initialLineup = isHomeTeam ? match.homeLineup : match.awayLineup;
    if (initialLineup && initialLineup.includes(playerId)) {
      rounds.push(1);
    }
    
    // Check rounds in lineup history
    if (match.lineupHistory) {
      Object.entries(match.lineupHistory).forEach(([roundKey, roundLineup]) => {
        const roundNumber = parseInt(roundKey);
        if (isNaN(roundNumber)) return;
        
        const lineup = isHomeTeam ? roundLineup.homeLineup : roundLineup.awayLineup;
        if (lineup && lineup.includes(playerId)) {
          rounds.push(roundNumber);
        }
      });
    }
    
    return rounds.sort((a, b) => a - b);
  };
  
  // Check if a player is in initial lineup
  const isPlayerInInitialLineup = (playerId: string) => {
    if (!match || !team) return false;
    const initialLineup = team.id === match.homeTeamId ? match.homeLineup : match.awayLineup;
    return initialLineup?.includes(playerId) || false;
  };
  
  // Check if there's any lineup history (substitutions)
  const hasSubstitutions = match?.lineupHistory && Object.keys(match.lineupHistory).length > 0;
  
  return (
    <Paper elevation={1} sx={{ flex: 1, p: 2 }}>
      <Box 
        sx={{ 
          pr: 1
        }}
      >
        {players
          .sort((a, b) => {
            // Captain always comes first
            if (team?.captainUserId === a.userId) return -1;
            if (team?.captainUserId === b.userId) return 1;
            
            // Initial lineup players come before substitutes
            const aInInitialLineup = isPlayerInInitialLineup(a.id!);
            const bInInitialLineup = isPlayerInInitialLineup(b.id!);
            
            if (aInInitialLineup && !bInInitialLineup) return -1;
            if (!aInInitialLineup && bInInitialLineup) return 1;
            
            // Then sort by first name
            return a.firstName.localeCompare(b.firstName);
          })
          .map(player => {
            const isInInitialLineup = isPlayerInInitialLineup(player.id!);
            const isCaptain = team?.captainUserId === player.userId;
            const playerRounds = getPlayerRounds(player.id!);
            const isSubstitute = !isInInitialLineup && playerRounds.length > 0;
            const roundsDisplay = playerRounds.length > 1 ? 
              `Rounds ${playerRounds.join(', ')}` : 
              playerRounds.length === 1 ? `Round ${playerRounds[0]}` : '';
            
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
                {isSubstitute && (
                  <Tooltip title={roundsDisplay} arrow placement="top">
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
                  </Tooltip>
                )}
              </Box>
            );
          })}
      </Box>
    </Paper>
  );
};

export default TeamRoster; 