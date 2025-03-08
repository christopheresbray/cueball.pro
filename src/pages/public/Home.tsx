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

import {
  League,
  Season,
  Team,
  Match,
  Frame,
  getLeagues,
  getSeasons,
  getTeams,
  getMatches,
  getFrames
} from '../../services/databaseService';

const Home: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [frames, setFrames] = useState<Frame[]>([]);
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
      
      // Fetch active league
      const leagues = await getLeagues();
      // Just use the first league since we don't have an 'active' property
      const activeLeague = leagues[0];
      setActiveLeague(activeLeague);
      
      if (activeLeague) {
        // Fetch active season
        const seasons = await getSeasons(activeLeague.id!);
        const activeSeason = seasons.find(season => season.status === 'active') || seasons[0];
        setActiveSeason(activeSeason);
        
        if (activeSeason) {
          // Fetch teams and matches
          const [teamsData, matchesData] = await Promise.all([
            getTeams(activeSeason.id!),
            getMatches(activeSeason.id!)
          ]);
          
          setTeams(teamsData);
          
          // Sort matches by date (upcoming first)
          const sortedMatches = matchesData.sort((a, b) => {
            if (!a.scheduledDate || !b.scheduledDate) return 0;
            return a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime();
          });
          
          setMatches(sortedMatches);
          
          // Fetch frames for all matches
          const allFrames: Frame[] = [];
          for (const match of matchesData) {
            if (match.id) {
              const matchFrames = await getFrames(match.id);
              allFrames.push(...matchFrames);
            }
          }
          setFrames(allFrames);
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
        match.scheduledDate && 
        match.scheduledDate.toDate() > now
      )
      .slice(0, 5); // Get next 5 matches
  };
  
  // Get recent results (completed matches)
  const getRecentResults = (): Match[] => {
    return matches
      .filter(match => match.status === 'completed')
      .sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        // Sort in descending order (most recent first)
        return b.scheduledDate.toDate().getTime() - a.scheduledDate.toDate().getTime();
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
        const homeTeamId = match.homeTeamId;
        const awayTeamId = match.awayTeamId;
        
        if (standings[homeTeamId] && standings[awayTeamId]) {
          // Increment played matches
          standings[homeTeamId].played += 1;
          standings[awayTeamId].played += 1;
          
          // Calculate home/away wins based on frames
          // We need to calculate scores from frames since Match doesn't have homeScore/awayScore properties
          const matchFrames: Frame[] = [];  // You would need to fetch frames for this match
          const homeFrameWins = matchFrames.filter(f => f.winnerId === f.homePlayerId).length;
          const awayFrameWins = matchFrames.filter(f => f.winnerId === f.awayPlayerId).length;
          
          if (homeFrameWins > awayFrameWins) {
            // Home team won
            standings[homeTeamId].won += 1;
            standings[awayTeamId].lost += 1;
            standings[homeTeamId].points += 2; // 2 points for a win
          } else if (awayFrameWins > homeFrameWins) {
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
            background: 'linear-gradient(135deg, #1e3a8a 0%, #10b981 100%)',
            color: 'white'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box>
                <Typography variant="h3" component="h1" gutterBottom>
                  Hills 8-Ball League
                </Typography>
                <Typography variant="h5" gutterBottom>
                  {activeSeason ? activeSeason.name : 'Current Season'}
                </Typography>
                <Typography variant="body1" paragraph>
                  Welcome to the official website of the Hills 8-Ball League. 
                  Check out the latest standings, upcoming fixtures, and player statistics.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    component={RouterLink} 
                    to="/standings"
                    sx={{ mr: 2, mb: 1 }}
                  >
                    View Standings
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="inherit" 
                    component={RouterLink} 
                    to="/fixtures"
                    sx={{ mr: 2, mb: 1 }}
                  >
                    Match Schedule
                  </Button>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Box
                component="img"
                src="/api/placeholder/300/300"
                alt="8-Ball Pool League"
                sx={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '50%',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                }}
              />
            </Grid>
          </Grid>
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
                          match.scheduledDate 
                            ? format(match.scheduledDate.toDate(), 'EEEE, MMMM d, yyyy h:mm a')
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
                            <Typography variant="body1" fontWeight="bold">
                              {frames.filter(f => f.matchId === match.id && f.winnerId === f.homePlayerId).length} - 
                              {frames.filter(f => f.matchId === match.id && f.winnerId === f.awayPlayerId).length}
                            </Typography>
                            </Typography>
                          </Box>
                        }
                        secondary={
                          match.scheduledDate 
                            ? format(match.scheduledDate.toDate(), 'MMMM d, yyyy')
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