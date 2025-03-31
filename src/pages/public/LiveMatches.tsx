import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Match,
  Team,
  getMatches,
  getTeams,
  getCurrentSeason,
} from '../../services/databaseService';
import { SportsScore as SportsScoreIcon } from '@mui/icons-material';

const LiveMatches: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('LiveMatches: Starting data fetch...');
        console.log('LiveMatches: User agent:', navigator.userAgent);

        // Get current season
        console.log('LiveMatches: Fetching current season...');
        const currentSeason = await getCurrentSeason();
        console.log('LiveMatches: Current season result:', currentSeason);

        if (!currentSeason || !currentSeason.id) {
          const errorMsg = 'No active season found';
          console.error('LiveMatches:', errorMsg);
          setError(errorMsg);
          return;
        }

        // Get all teams for the current season
        console.log('LiveMatches: Fetching teams for season:', currentSeason.id);
        const allTeams = await getTeams(currentSeason.id);
        console.log('LiveMatches: Teams fetched:', allTeams.length);

        if (!allTeams || allTeams.length === 0) {
          const errorMsg = 'No teams found for the current season';
          console.error('LiveMatches:', errorMsg);
          setError(errorMsg);
          return;
        }

        const teamsMap = allTeams.reduce((acc, team) => {
          if (team.id) {
            acc[team.id] = team;
          }
          return acc;
        }, {} as Record<string, Team>);
        setTeams(teamsMap);

        // Get all matches and filter for in-progress ones
        console.log('LiveMatches: Fetching matches for season:', currentSeason.id);
        const allMatches = await getMatches(currentSeason.id);
        console.log('LiveMatches: All matches fetched:', allMatches.length);

        const liveMatches = allMatches.filter(match => match.status === 'in_progress');
        console.log('LiveMatches: Live matches found:', liveMatches.length);

        setMatches(liveMatches);

      } catch (err: any) {
        const errorMsg = err.message || 'Failed to load live matches';
        console.error('LiveMatches: Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateMatchScore = (match: Match) => {
    if (!match.frameResults) return { home: 0, away: 0 };
    
    return Object.values(match.frameResults).reduce(
      (acc, frame) => {
        if (frame.homeScore) acc.home += frame.homeScore;
        if (frame.awayScore) acc.away += frame.awayScore;
        return acc;
      },
      { home: 0, away: 0 }
    );
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SportsScoreIcon fontSize="large" />
          Live Matches
        </Typography>

        {matches.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
            <Typography color="text.secondary">
              No matches currently in progress
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {matches.map((match) => {
              const homeTeam = teams[match.homeTeamId];
              const awayTeam = teams[match.awayTeamId];
              const score = calculateMatchScore(match);

              return (
                <Grid item xs={12} md={6} key={match.id}>
                  <Card sx={{ 
                    position: 'relative',
                    overflow: 'visible',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      transition: 'transform 0.2s ease-in-out',
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Chip 
                          label="LIVE" 
                          color="error"
                          sx={{ 
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                              '100%': { opacity: 1 },
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Round {match.currentRound || 1} of 4
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                          {homeTeam?.name || 'Unknown Team'}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mx: 2 }}>
                          {score.home}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                          {awayTeam?.name || 'Unknown Team'}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mx: 2 }}>
                          {score.away}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button 
                        component={RouterLink}
                        to={`/team/match/${match.id}/score`}
                        size="small"
                        color="primary"
                      >
                        View Match
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default LiveMatches; 