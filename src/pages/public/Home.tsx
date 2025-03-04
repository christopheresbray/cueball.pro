import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { format } from 'date-fns';
import {
  getLeagues,
  getSeasons,
  getMatches,
  getTeams,
} from '../../services/databaseService';

// Type imports
import { Season, Match, Team } from '../../services/databaseService';

const Home: React.FC = () => {
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch leagues
        const leagues = await getLeagues();

        if (leagues.length === 0) {
          setLoading(false);
          return;
        }

        // Get active seasons
        const allSeasons = await getSeasons(leagues[0].id);
        const activeSeasons = allSeasons.filter(season => season.status === 'active');

        if (activeSeasons.length === 0) {
          setLoading(false);
          return;
        }

        const currentSeason = activeSeasons[0];
        setActiveSeason(currentSeason);

        // Get teams for the season
        const teamsData = await getTeams(currentSeason.id);
        setTeams(teamsData);

        // Get matches for the season
        const matches = await getMatches(currentSeason.id);

        // Filter upcoming matches (scheduled date in the future)
        const now = new Date();
        const upcoming = matches
          .filter(match => match.scheduledDate && match.scheduledDate.toDate() > now)
          .sort((a, b) => a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime())
          .slice(0, 5);

        // Filter recent/completed matches
        const recent = matches
          .filter(match => match.status === 'completed')
          .sort((a, b) => b.scheduledDate.toDate().getTime() - a.scheduledDate.toDate().getTime())
          .slice(0, 5);

        setUpcomingMatches(upcoming);
        setRecentMatches(recent);
      } catch (error) {
        console.error('Error fetching home page data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTeamNameById = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Welcome to Hills 8-Ball League
        </Typography>

        <Typography variant="h6" color="textSecondary" paragraph align="center" sx={{ mb: 4 }}>
          Official league management system for 8-ball competitions
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, mb: 4, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : !activeSeason ? (
          <Paper sx={{ p: 3, mb: 4, textAlign: 'center' }}>
            <Typography>No active season found</Typography>
          </Paper>
        ) : (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                {activeSeason.name} Season
              </Typography>
              <Typography variant="body1">
                Season runs from {format(activeSeason.startDate.toDate(), 'MMMM d, yyyy')} to{' '}
                {format(activeSeason.endDate.toDate(), 'MMMM d, yyyy')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Match day: {activeSeason.matchDay.charAt(0).toUpperCase() + activeSeason.matchDay.slice(1)}s
              </Typography>
            </Paper>

            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      Upcoming Matches
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {upcomingMatches.length > 0 ? (
                      <List>
                        {upcomingMatches.map(match => (
                          <ListItem key={match.id} divider>
                            <ListItemText
                              primary={`${getTeamNameById(match.homeTeamId)} vs ${getTeamNameById(match.awayTeamId)}`}
                              secondary={
                                match.scheduledDate
                                  ? format(match.scheduledDate.toDate(), 'EEEE, MMMM d, yyyy h:mm a')
                                  : 'Date TBD'
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                        No upcoming matches scheduled
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button size="small" component={RouterLink} to="/fixtures">
                      View All Fixtures
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      Recent Results
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {recentMatches.length > 0 ? (
                      <List>
                        {recentMatches.map(match => (
                          <ListItem key={match.id} divider>
                            <ListItemText
                              primary={`${getTeamNameById(match.homeTeamId)} vs ${getTeamNameById(match.awayTeamId)}`}
                              secondary={
                                match.scheduledDate
                                  ? format(match.scheduledDate.toDate(), 'MMMM d, yyyy')
                                  : 'Date unknown'
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                        No recent match results
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button size="small" component={RouterLink} to="/standings">
                      View League Standings
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Container>
  );
};

export default Home;
