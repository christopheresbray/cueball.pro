// src/pages/team/Dashboard.tsx
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
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  People as PeopleIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as GameIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

import { useAuth } from '../../context/AuthContext';
import {
  Team,
  Match,
  Player,
  getTeam,
  getTeams,
  getMatches,
  getTeamMatches,
  getPlayers,
  isUserTeamCaptain,
  getCurrentSeason,
  getTeamsUserIsCaptainOf,
  getMatchesForTeam
} from '../../services/databaseService';
import cacheService from '../../services/cacheService';

// Simple player stats interface for team dashboard
interface TeamPlayerStat {
  id: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  winPercentage: number;
}

// Add note at top
// Note: Changes to be made to MatchScoring.tsx:
// 1. Remove the Instructions Panel with messages like "As the home team captain, click on a frame..."
// 2. Remove the "Match is in progress. Lineups are locked..." message
// These changes will provide more vertical space for viewing match frames.

const TeamDashboard: React.FC = () => {
  console.log("TeamDashboard: Component mounting");
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  console.log("TeamDashboard: Current user:", user?.uid);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const [captainTeams, setCaptainTeams] = useState<Team[]>([]);
  const [allSeasonTeams, setAllSeasonTeams] = useState<Team[]>([]); // All teams in season for opponent lookup
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [teamMatches, setTeamMatches] = useState<Match[]>([]);
  const [playerStats, setPlayerStats] = useState<TeamPlayerStat[]>([]);
  
  // Stats
  const [teamRecord, setTeamRecord] = useState({ wins: 0, losses: 0, draws: 0 });
  const [frameRecord, setFrameRecord] = useState({ won: 0, lost: 0 });
  const [calculatingStats, setCalculatingStats] = useState(false);

  useEffect(() => {
    console.log("TeamDashboard: useEffect[user] triggered, user:", user?.uid);
    if (user) {
      fetchTeamData();
    } else {
      console.log("TeamDashboard: No user logged in");
      setDebugInfo("No user is logged in.");
    }
  }, [user]);

  useEffect(() => {
    console.log("TeamDashboard: useEffect[selectedTeam] triggered, selectedTeam:", selectedTeam?.id);
    if (selectedTeam) {
      fetchTeamDetails(selectedTeam.id!);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (teamMatches.length > 0) {
      calculateTeamStats();
      calculatePlayerStats();
    }
  }, [teamMatches]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      console.log("TeamDashboard: Fetching team data for user:", user?.uid);
      
      // Get current season
      const currentSeason = await getCurrentSeason();
      if (!currentSeason) {
        setError('No current season found');
        return;
      }
      
      // Get teams where user is captain
      const userTeams = await getTeamsUserIsCaptainOf(user!.uid, currentSeason.id!);
      console.log("TeamDashboard: User teams:", userTeams);
      
      if (userTeams.length === 0) {
        setError('You are not a captain of any teams');
        return;
      }
      
      setCaptainTeams(userTeams);
      
      // Get all teams in season for opponent lookup
      const allTeams = await getTeams(currentSeason.id!);
      setAllSeasonTeams(allTeams);
      
      // Set first team as selected
      if (userTeams.length > 0) {
        setSelectedTeam(userTeams[0]);
      }
      
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamDetails = async (teamId: string) => {
    try {
      console.log("TeamDashboard: Fetching team details for team:", teamId);
      
      if (!selectedTeam?.seasonId) {
        setError('Season ID missing from selected team');
        return;
      }
      
      // Get team players
      const players = await getPlayers(teamId);
      setTeamPlayers(players);
      
      // Get team matches
      const matches = await getMatchesForTeam(teamId, selectedTeam.seasonId);
      setTeamMatches(matches);
      
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError('Failed to load team details');
    }
  };

  const calculateTeamStats = () => {
    setCalculatingStats(true);
    
    let wins = 0, losses = 0, draws = 0;
    let framesWon = 0, framesLost = 0;
    
    teamMatches.forEach(match => {
      if (match.status === 'completed' && match.frames) {
        const homeWins = match.frames.filter(f => f.winnerPlayerId === f.homePlayerId).length;
        const awayWins = match.frames.filter(f => f.winnerPlayerId === f.awayPlayerId).length;
        
        const isHomeTeam = match.homeTeamId === selectedTeam?.id;
        const teamWins = isHomeTeam ? homeWins : awayWins;
        const teamLosses = isHomeTeam ? awayWins : homeWins;
        
        framesWon += teamWins;
        framesLost += teamLosses;
        
        if (teamWins > teamLosses) {
          wins++;
        } else if (teamLosses > teamWins) {
          losses++;
        } else {
          draws++;
        }
      }
    });
    
    setTeamRecord({ wins, losses, draws });
    setFrameRecord({ won: framesWon, lost: framesLost });
    setCalculatingStats(false);
  };

  const calculatePlayerStats = async () => {
    try {
      const stats: TeamPlayerStat[] = [];
      
      for (const player of teamPlayers) {
        let played = 0, wins = 0, losses = 0;
        
        teamMatches.forEach(match => {
          if (match.status === 'completed' && match.frames) {
            match.frames.forEach(frame => {
              if (frame.homePlayerId === player.id || frame.awayPlayerId === player.id) {
                played++;
                if (frame.winnerPlayerId === player.id) {
                  wins++;
                } else if (frame.winnerPlayerId) {
                  losses++;
                }
              }
            });
          }
        });
        
        const winPercentage = played > 0 ? (wins / played) * 100 : 0;
        
        stats.push({
          id: player.id!,
          name: player.name || 'Unknown Player',
          played,
          wins,
          losses,
          winPercentage
        });
      }
      
      // Sort by win percentage, then by games played
      stats.sort((a, b) => {
        if (Math.abs(a.winPercentage - b.winPercentage) < 0.1) {
          return b.played - a.played;
        }
        return b.winPercentage - a.winPercentage;
      });
      
      setPlayerStats(stats);
    } catch (err) {
      console.error('Error calculating player stats:', err);
    }
  };

  const getOpponentTeamName = (match: Match): string => {
    const isHomeTeam = match.homeTeamId === selectedTeam?.id;
    const opponentId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
    const opponent = allSeasonTeams.find(team => team.id === opponentId);
    return opponent?.name || 'Unknown Team';
  };

  const getNextMatch = (): Match | null => {
    const upcomingMatches = teamMatches.filter(match => match.status !== 'completed');
    if (upcomingMatches.length === 0) return null;
    
    return upcomingMatches.sort((a, b) => {
      if (!a.scheduledDate || !b.scheduledDate) return 0;
      return a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime();
    })[0];
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        {debugInfo && (
          <Typography variant="body2" color="text.secondary">
            Debug: {debugInfo}
          </Typography>
        )}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ 
        fontSize: { xs: '1.5rem', md: '2.125rem' },
        mb: { xs: 2, md: 3 }
      }}>
        Team Dashboard
      </Typography>
      
      {selectedTeam && (
        <>
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: { xs: 3, md: 4 } }}>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" gutterBottom sx={{ 
                  fontSize: { xs: '1.25rem', md: '1.5rem' }
                }}>
                  {selectedTeam.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip 
                    icon={<TrophyIcon />} 
                    label={`Record: ${teamRecord.wins}-${teamRecord.losses}${teamRecord.draws > 0 ? `-${teamRecord.draws}` : ''}`} 
                    color="primary" 
                    size={isMobile ? "small" : "medium"}
                  />
                  <Chip 
                    icon={<GameIcon />} 
                    label={`Frames: ${frameRecord.won}-${frameRecord.lost}`} 
                    color="secondary" 
                    size={isMobile ? "small" : "medium"}
                  />
                  <Chip 
                    icon={<PeopleIcon />} 
                    label={`Players: ${teamPlayers.length}`} 
                    size={isMobile ? "small" : "medium"}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                {calculatingStats ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Team Stats
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Typography variant="h4" color="success.main">
                            {teamRecord.wins}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Wins
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Typography variant="h4" color="error.main">
                            {teamRecord.losses}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Losses
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Typography variant="h4" color="text.secondary">
                            {teamRecord.draws}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Draws
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>
          
          <Box mt={{ xs: 3, md: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ 
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              mb: { xs: 2, md: 3 }
            }}>
              Player Statistics
            </Typography>
            
            <Grid container spacing={{ xs: 1, md: 2 }}>
              {playerStats.slice(0, isMobile ? 3 : 6).map((player) => (
                <Grid item xs={12} sm={6} md={4} key={player.id}>
                  <Card>
                    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {player.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {player.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {player.played} games played
                          </Typography>
                        </Box>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="h6" color="success.main">
                            {player.wins}W
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Wins
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="h6" color="error.main">
                            {player.losses}L
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Losses
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="h6" color="primary.main">
                            {player.winPercentage.toFixed(1)}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Win %
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
          
          <Box mt={{ xs: 3, md: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ 
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              mb: { xs: 2, md: 3 }
            }}>
              Upcoming Matches
            </Typography>
            
            <Grid container spacing={{ xs: 1, md: 2 }}>
              {teamMatches
                .filter(match => match.status !== 'completed')
                .slice(0, isMobile ? 2 : 3)
                .map(match => {
                  const isHomeTeam = match.homeTeamId === selectedTeam.id;
                  const opponentName = getOpponentTeamName(match);
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={match.id}>
                      <Card>
                        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            {isHomeTeam ? 'vs' : '@'} {opponentName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {match.scheduledDate && 
                              format(match.scheduledDate.toDate(), 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Venue TBD
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ p: { xs: 1, md: 2 } }}>
                          <Button 
                            component={RouterLink} 
                            to={`/team/match/${match.id}`} 
                            size="small"
                            variant="outlined"
                            fullWidth={isMobile}
                          >
                            View Details
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
                
              {teamMatches.filter(match => match.status !== 'completed').length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: { xs: 2, md: 3 }, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No upcoming matches
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
          
          <Box mt={{ xs: 3, md: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ 
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              mb: { xs: 2, md: 3 }
            }}>
              Recent Matches
            </Typography>
            
            <Grid container spacing={{ xs: 1, md: 2 }}>
              {teamMatches
                .filter(match => match.status === 'completed')
                .slice(0, isMobile ? 2 : 3)
                .map(match => {
                  const isHomeTeam = match.homeTeamId === selectedTeam.id;
                  const opponentName = getOpponentTeamName(match);
                  
                  // Get match result
                  const matchFrames = match.frames || [];
                  const homeWins = matchFrames.filter(f => f.winnerPlayerId === f.homePlayerId).length;
                  const awayWins = matchFrames.filter(f => f.winnerPlayerId === f.awayPlayerId).length;
                  
                  let result = '';
                  let resultColor = '';
                  
                  if ((isHomeTeam && homeWins > awayWins) || (!isHomeTeam && awayWins > homeWins)) {
                    result = 'Win';
                    resultColor = 'success.main';
                  } else if ((isHomeTeam && homeWins < awayWins) || (!isHomeTeam && awayWins < homeWins)) {
                    result = 'Loss';
                    resultColor = 'error.main';
                  } else {
                    result = 'Draw';
                    resultColor = 'text.secondary';
                  }
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={match.id}>
                      <Card>
                        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                            {isHomeTeam ? 'vs' : '@'} {opponentName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {match.scheduledDate && 
                              format(match.scheduledDate.toDate(), 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="h6" color={resultColor} sx={{ fontWeight: 'bold', mt: 2 }}>
                            {result} ({isHomeTeam ? `${homeWins}-${awayWins}` : `${awayWins}-${homeWins}`})
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ p: { xs: 1, md: 2 } }}>
                          <Button 
                            component={RouterLink} 
                            to={`/team/match/${match.id}`} 
                            size="small"
                            variant="outlined"
                            fullWidth={isMobile}
                          >
                            View Details
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
                
              {teamMatches.filter(match => match.status === 'completed').length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: { xs: 2, md: 3 }, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No completed matches yet
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </>
      )}
    </Container>
  );
};

export default TeamDashboard;