// src/components/match-scoring-v2/MatchHeader.tsx

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid
} from '@mui/material';

import { Match } from '../../types/match';
import { MatchPhase, MATCH_PHASES, COLORS } from '../../types/matchV2';

interface MatchHeaderProps {
  match: Match;
  matchPhase: MatchPhase;
  loading: boolean;
}

/**
 * Match Header Component
 * Shows match information and current phase
 */
const MatchHeader: React.FC<MatchHeaderProps> = ({ match, matchPhase, loading }) => {
  const getPhaseColor = (phase: MatchPhase): string => {
    switch (phase) {
      case 'pre-match': return COLORS.warning;
      case 'ready': return COLORS.secondary;
      case 'in-progress': return COLORS.primary;
      case 'completed': return COLORS.primary;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <Box 
      sx={{ 
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
        color: COLORS.textInverse,
        p: 3
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <Typography variant="h4" component="h1" gutterBottom>
            {match.homeTeamName || 'Home Team'} vs {match.awayTeamName || 'Away Team'}
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
            {match.venueName && `📍 ${match.venueName}`}
            {match.matchDate && ` • ${
              match.matchDate instanceof Date 
                ? match.matchDate.toLocaleDateString()
                : match.matchDate.toDate().toLocaleDateString()
            }`}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box display="flex" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} gap={1}>
            <Chip
              label={MATCH_PHASES[matchPhase]}
              sx={{ 
                backgroundColor: getPhaseColor(matchPhase),
                color: 'white',
                fontWeight: 'bold'
              }}
            />
            {match.format && (
              <Chip
                label={match.format.name || `${match.format.roundsPerMatch}x${match.format.framesPerRound}`}
                variant="outlined"
                sx={{ 
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: 'white'
                }}
              />
            )}
          </Box>
        </Grid>
      </Grid>

      {loading && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Updating...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MatchHeader; 