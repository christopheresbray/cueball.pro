import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper
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
  // Comment out debug logging
  // useEffect(() => {
  //   console.log(`MatchHeader: Score updated - Home: ${score.home}, Away: ${score.away}`);
  // }, [score]);

  if (!homeTeam || !awayTeam) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: { xs: 56, sm: 64 }, // Navbar height
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'background.paper',
        boxShadow: 3,
        mx: 'auto',
        width: '100%',
        maxWidth: 'lg',
      }}
    >
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
    </Paper>
  );
};

export default MatchHeader; 