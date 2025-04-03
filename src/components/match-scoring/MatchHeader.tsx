import React from 'react';
import {
  Box,
  Container,
  Typography
} from '@mui/material';
import { Team } from '../../services/databaseService';

interface MatchHeaderProps {
  homeTeam: Team | null;
  awayTeam: Team | null;
  score: { home: number; away: number };
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
}

/**
 * Component that displays the match score and team names at the top of the page
 */
const MatchHeader: React.FC<MatchHeaderProps> = ({
  homeTeam,
  awayTeam,
  score,
  isUserHomeTeamCaptain,
  isUserAwayTeamCaptain
}) => {
  return (
    <Box sx={{ 
      position: 'fixed',
      top: 64, // Height of the main navbar
      left: 0,
      right: 0,
      zIndex: 1100,
      bgcolor: 'background.paper',
      boxShadow: 2,
      py: 2
    }}>
      <Container maxWidth="sm">
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 3
        }}>
          {/* Home Team */}
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 'bold',
                color: isUserHomeTeamCaptain ? 'primary.main' : 'text.primary',
                mb: 0.5
              }}
            >
              {homeTeam?.name || 'Home Team'}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {score.home}
            </Typography>
          </Box>

          {/* VS */}
          <Typography variant="h6" color="text.secondary">
            vs
          </Typography>

          {/* Away Team */}
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 'bold',
                color: isUserAwayTeamCaptain ? 'secondary.main' : 'text.primary',
                mb: 0.5
              }}
            >
              {awayTeam?.name || 'Away Team'}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {score.away}
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default MatchHeader; 