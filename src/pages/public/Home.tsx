// src/pages/public/Home.tsx
import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  SportsBar as BilliardsIcon,
  EmojiEvents as TrophyIcon,
  Event as EventIcon,
  BarChart as StatsIcon,
  Group as TeamIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import Hills8BallLogo from '../../assets/Hills8BallLogo.png';

import {
  League,
  Season,
  Team,
  Match,
  Player,
  getLeagues,
  getSeasons,
  getTeams,
  getMatches,
} from '../../services/databaseService';
import cacheService from '../../services/cacheService';

const Home: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeLeague, setActiveLeague] = useState<League | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Try to get leagues from cache first
      let leagues = cacheService.getLeagues();
      if (!leagues) {
        console.log("Fetching leagues...");
        leagues = await getLeagues();
        cacheService.setLeagues(leagues);
      } else {
        console.log("Using cached leagues data");
      }

      // Just use the first league since we don't have an 'active' property
      const activeLeague = leagues[0];
      setActiveLeague(activeLeague);
      cacheService.setActiveLeague(activeLeague);
      
      if (activeLeague) {
        // Try to get seasons from cache first
        let seasons = cacheService.getSeasons(activeLeague.id!);
        if (!seasons) {
          seasons = await getSeasons(activeLeague.id!);
          cacheService.setSeasons(activeLeague.id!, seasons);
        }
        
        const activeSeason = seasons.find(season => season.status === 'active') || seasons[0];
        setActiveSeason(activeSeason);
        cacheService.setActiveSeason(activeSeason);
        
        if (activeSeason) {
          // Try to get teams and matches from cache first
          let teamsData = cacheService.getTeams(activeSeason.id!);
          let matchesData = cacheService.getMatches(activeSeason.id!);
          
          // Fetch data if not in cache
          const promises = [];
          if (!teamsData) {
            promises.push(getTeams(activeSeason.id!).then(data => {
              teamsData = data;
              cacheService.setTeams(activeSeason.id!, data);
            }));
          }
          
          if (!matchesData) {
            promises.push(getMatches(activeSeason.id!).then(data => {
              matchesData = data;
              cacheService.setMatches(activeSeason.id!, data);
            }));
          }
          
          // Wait for any needed fetches to complete
          if (promises.length > 0) {
            await Promise.all(promises);
          }
          
          // Update component state with data (from cache or newly fetched)
          setTeams(teamsData!);
          
          // Sort matches by date (upcoming first)
          const sortedMatches = [...matchesData!].sort((a, b) => {
            if (!a.date || !b.date) return 0;
            return a.date.toDate().getTime() - b.date.toDate().getTime();
          });
          
          setMatches(sortedMatches);
          
          // Frame data is now directly available in the `matches` state via `match.frames`
          // No need to fetch or cache frames separately.
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch league data');
      setLoading(false);
    }
  };
  
  // Helper to get team name by ID
  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };
  
  // Get upcoming matches (scheduled matches with dates in the future)
  const getUpcomingMatches = (): Match[] => {
    const now = new Date();
    return matches
      .filter(match => 
        match.status === 'scheduled' && 
        match.date && 
        match.date.toDate() > now
      )
      .slice(0, 5); // Get next 5 matches
  };
  
  // Get recent results (completed matches)
  const getRecentResults = (): Match[] => {
    return matches
      .filter(match => match.status === 'completed')
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        // Sort in descending order (most recent first)
        return b.date.toDate().getTime() - a.date.toDate().getTime();
      })
      .slice(0, 5); // Get last 5 results
  };
  
  // Calculate standings from match results
  const calculateStandings = (): {
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    lost: number;
    points: number;
  }[] => {
    const standings: Record<string, {
      teamId: string;
      teamName: string;
      played: number;
      won: number;
      lost: number;
      points: number;
    }> = {};
    
    // Initialize standings for all teams
    teams.forEach(team => {
      standings[team.id!] = {
        teamId: team.id!,
        teamName: team.name,
        played: 0,
        won: 0,
        lost: 0,
        points: 0
      };
    });
    
    // Calculate standings from completed matches
    matches
      .filter(match => match.status === 'completed')
      .forEach(match => {
        // Use embedded frames directly from the match object
        const matchFrames = match.frames || [];
        
        const homeTeamId = match.homeTeamId;
        const awayTeamId = match.awayTeamId;

        // Calculate score from frames
        let homeScore = 0;
        let awayScore = 0;
        
        matchFrames.forEach(frame => {
          if (frame.winnerPlayerId === frame.homePlayerId) {
            homeScore++;
          } else if (frame.winnerPlayerId === frame.awayPlayerId) {
            awayScore++;
          }
        });

        // Update standings based on match result
        if (standings[homeTeamId] && standings[awayTeamId]) {
          // Increment played matches
          standings[homeTeamId].played += 1;
          standings[awayTeamId].played += 1;
          
          if (homeScore > awayScore) {
            // Home team won
            standings[homeTeamId].won += 1;
            standings[awayTeamId].lost += 1;
            standings[homeTeamId].points += 2; // 2 points for a win
          } else if (awayScore > homeScore) {
            // Away team won
            standings[awayTeamId].won += 1;
            standings[homeTeamId].lost += 1;
            standings[awayTeamId].points += 2; // 2 points for a win
          } else {
            // Draw
            standings[homeTeamId].points += 1; // 1 point for a draw
            standings[awayTeamId].points += 1; // 1 point for a draw
          }
        }
      });
    
    // Convert to array and sort by points (highest first)
    return Object.values(standings)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5); // Return top 5 teams
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ my: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }
  
  const upcomingMatches = getUpcomingMatches();
  const recentResults = getRecentResults();
  const topTeams = calculateStandings();
  
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        {/* Hero Banner */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(45deg, #1a237e 30%, #0d47a1 90%)',
            color: 'white',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4
          }}
        >
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Hills 8 Ball Association
            </Typography>
            <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
              Premier Pool Competition of the Adelaide Hills
            </Typography>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              color="secondary"
              size="large"
              sx={{ 
                fontWeight: 'bold',
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s'
                }
              }}
            >
              Join the League
            </Button>
          </Box>
          <Box 
            sx={{ 
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxWidth: { xs: '50%', md: '25%' }
            }}
          >
            <img 
              src={Hills8BallLogo} 
              alt="Hills District 8-Ball Logo" 
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
              }}
            />
          </Box>
        </Paper>
        
        <Grid container spacing={4}>
          {/* Upcoming Matches */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <EventIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2">
                  Upcoming Matches
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {upcomingMatches.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No upcoming matches scheduled
                </Typography>
              ) : (
                <List>
                  {upcomingMatches.map((match) => (
                    <ListItem key={match.id} divider sx={{ px: 1 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">
                              {getTeamName(match.homeTeamId)} vs {getTeamName(match.awayTeamId)}
                            </Typography>
                            <Chip 
                              size="small" 
                              label="Upcoming" 
                              color="primary" 
                              variant="outlined" 
                            />
                          </Box>
                        }
                        secondary={
                          match.date 
                            ? format(match.date.toDate(), 'EEEE, MMMM d, yyyy h:mm a')
                            : 'Date TBD'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button 
                  variant="text" 
                  color="primary" 
                  component={RouterLink} 
                  to="/fixtures"
                  endIcon={<EventIcon />}
                >
                  View All Fixtures
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Recent Results */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <TrophyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2">
                  Recent Results
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {recentResults.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No match results available yet
                </Typography>
              ) : (
                <List>
                  {recentResults.map((match) => (
                    <ListItem key={match.id} divider sx={{ px: 1 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1">
                              {getTeamName(match.homeTeamId)} vs {getTeamName(match.awayTeamId)}
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {match.frames?.filter(f => f.winnerPlayerId === f.homePlayerId).length} - 
                              {match.frames?.filter(f => f.winnerPlayerId === f.awayPlayerId).length}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          match.date 
                            ? format(match.date.toDate(), 'MMMM d, yyyy')
                            : 'Date unknown'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button 
                  variant="text" 
                  color="primary" 
                  component={RouterLink} 
                  to="/fixtures"
                  endIcon={<EventIcon />}
                >
                  View All Results
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* League Standings */}
        <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <StatsIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h5" component="h2">
              Current Standings
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pos</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="center">P</TableCell>
                  <TableCell align="center">W</TableCell>
                  <TableCell align="center">L</TableCell>
                  <TableCell align="center">Pts</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topTeams.map((team, index) => (
                  <TableRow key={team.teamId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{team.teamName}</TableCell>
                    <TableCell align="center">{team.played}</TableCell>
                    <TableCell align="center">{team.won}</TableCell>
                    <TableCell align="center">{team.lost}</TableCell>
                    <TableCell align="center">{team.points}</TableCell>
                  </TableRow>
                ))}
                
                {topTeams.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No standings data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Button 
              variant="text" 
              color="primary" 
              component={RouterLink} 
              to="/standings"
              endIcon={<StatsIcon />}
            >
              View Full Standings
            </Button>
          </Box>
        </Paper>
        
        {/* Information Cards */}
        <Box mt={4}>
          <Typography variant="h5" component="h2" gutterBottom>
            League Information
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    backgroundColor: '#1e3a8a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TeamIcon sx={{ fontSize: 64, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    Teams
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View all teams participating in the current season
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" component={RouterLink} to="/teams">Learn More</Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    backgroundColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <BilliardsIcon sx={{ fontSize: 64, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    Players
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Explore player profiles and statistics
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" component={RouterLink} to="/players">Learn More</Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    backgroundColor: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <EventIcon sx={{ fontSize: 64, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    Schedule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View the complete match schedule
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" component={RouterLink} to="/fixtures">Learn More</Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    backgroundColor: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <StatsIcon sx={{ fontSize: 64, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    Statistics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dive into detailed league statistics
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" component={RouterLink} to="/players">Learn More</Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default Home;