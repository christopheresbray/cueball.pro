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
  TableRow
} from '@mui/material';
import {
  People as PeopleIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as GameIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

import { useAuth } from '../../context/AuthContext';
import {
  Team,
  Match,
  Player,
  Frame,
  getTeam,
  getTeams,
  getMatches,
  getTeamMatches,
  getPlayers,
  getFrames
} from '../../services/databaseService';
import FixCaptainButton from '../../components/admin/FixCaptainButton';

// Define interface for player statistics
interface PlayerStat {
  player: Player;
  played: number;
  won: number;
  lost: number;
  winRate: number;
}

const TeamDashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const [captainTeams, setCaptainTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [teamMatches, setTeamMatches] = useState<Match[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  
  // Stats
  const [teamRecord, setTeamRecord] = useState({ wins: 0, losses: 0, draws: 0 });
  const [frameRecord, setFrameRecord] = useState({ won: 0, lost: 0 });

  useEffect(() => {
    if (user) {
      fetchTeamData();
    } else {
      setDebugInfo("No user is logged in.");
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamDetails(selectedTeam.id!);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (teamMatches.length > 0 && frames.length > 0) {
      calculateTeamStats();
      calculatePlayerStats();
    }
  }, [teamMatches, frames, teamPlayers]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      // Debug user info
      let debugText = `Current user: ${user?.uid}\n`;
      debugText += `User email: ${user?.email}\n`;
      console.log("Current user:", user);
      
      // Get all teams where the current user is captain
      const allTeams = await getTeams('');
      console.log("All teams fetched:", allTeams);
      debugText += `All teams fetched: ${allTeams.length}\n`;
      
      // Debug team data
      allTeams.forEach((team, index) => {
        debugText += `Team ${index + 1}: id=${team.id}, name=${team.name}, captainId=${team.captainId}\n`;
        console.log(`Team ${index + 1}:`, team);
      });
      
      const userCaptainTeams = allTeams.filter(team => {
        const isMatch = team.captainId === user?.uid;
        console.log(`Team ${team.name}: captainId=${team.captainId}, user.uid=${user?.uid}, match=${isMatch}`);
        return isMatch;
      });
      
      debugText += `User captain teams: ${userCaptainTeams.length}\n`;
      console.log("User captain teams:", userCaptainTeams);
      
      setCaptainTeams(userCaptainTeams);
      setDebugInfo(debugText);
      
      // If user is captain of at least one team, select the first one
      if (userCaptainTeams.length > 0) {
        setSelectedTeam(userCaptainTeams[0]);
      } else {
        setLoading(false);
        setError('You are not registered as a captain for any team');
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      setError(`Failed to fetch team data: ${error instanceof Error ? error.message : String(error)}`);
      setLoading(false);
    }
  };

  const fetchTeamDetails = async (teamId: string) => {
    try {
      setLoading(true);
  
      // Fetch team players
      const players = await getPlayers(teamId);
      setTeamPlayers(players);
  
      if (!selectedTeam?.seasonId) {
        setError("Season ID missing from selected team.");
        setLoading(false);
        return;
      }
  
      // Fetch all matches for the current season
      const allMatches = await getMatches(selectedTeam.seasonId);
  
      // Filter matches for this team (home and away)
      const teamMatchList = allMatches.filter(match =>
        match.homeTeamId === teamId || match.awayTeamId === teamId
      );
  
      // Sort by date
      teamMatchList.sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        return a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime();
      });
  
      setTeamMatches(teamMatchList);
  
      // Fetch all teams for this season (important step!)
      const allTeams = await getTeams(selectedTeam.seasonId);
      setCaptainTeams(allTeams); // store all teams for name referencing
  
      // Fetch frames from completed matches
      const completedMatches = teamMatchList.filter(m => m.status === 'completed');
      let allFrames: Frame[] = [];
  
      for (const match of completedMatches) {
        if (match.id) {
          const matchFrames = await getFrames(match.id);
          allFrames = [...allFrames, ...matchFrames];
        }
      }
  
      setFrames(allFrames);
      setLoading(false);
  
    } catch (error) {
      console.error('Error fetching team details:', error);
      setError('Failed to fetch team details');
      setLoading(false);
    }
  };
  
  const calculateTeamStats = () => {
    if (!selectedTeam) return;
    
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let framesWon = 0;
    let framesLost = 0;
    
    // Go through completed matches to calculate record
    const completedMatches = teamMatches.filter(m => m.status === 'completed');
    
    for (const match of completedMatches) {
      const matchFrames = frames.filter(f => f.matchId === match.id);
      
      if (matchFrames.length === 0) continue;
      
      const isHomeTeam = match.homeTeamId === selectedTeam.id;
      
      // Count frame wins/losses
      for (const frame of matchFrames) {
        if (!frame.winnerId) continue;
        
        const homePlayerWon = frame.winnerId === frame.homePlayerId;
        
        if ((isHomeTeam && homePlayerWon) || (!isHomeTeam && !homePlayerWon)) {
          framesWon++;
        } else {
          framesLost++;
        }
      }
      
      // Determine match result
      const homeFrameWins = matchFrames.filter(f => f.winnerId === f.homePlayerId).length;
      const awayFrameWins = matchFrames.filter(f => f.winnerId === f.awayPlayerId).length;
      
      if (homeFrameWins === awayFrameWins) {
        draws++;
      } else if ((isHomeTeam && homeFrameWins > awayFrameWins) || 
                (!isHomeTeam && awayFrameWins > homeFrameWins)) {
        wins++;
      } else {
        losses++;
      }
    }
    
    setTeamRecord({ wins, losses, draws });
    setFrameRecord({ won: framesWon, lost: framesLost });
  };

  const calculatePlayerStats = () => {
    if (!selectedTeam || teamPlayers.length === 0 || frames.length === 0) return;
    
    const stats: PlayerStat[] = [];
    
    for (const player of teamPlayers) {
      // Find frames where this player participated
      const playerFrames = frames.filter(f => 
        f.homePlayerId === player.id || f.awayPlayerId === player.id
      );
      
      const played = playerFrames.length;
      const won = playerFrames.filter(f => f.winnerId === player.id).length;
      const lost = played - won;
      const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
      
      stats.push({
        player,
        played,
        won,
        lost,
        winRate
      });
    }
    
    // Sort by win rate (highest first)
    stats.sort((a, b) => b.winRate - a.winRate);
    setPlayerStats(stats);
  };

  const getUpcomingMatches = () => {
    console.log("Getting upcoming matches, total matches:", teamMatches.length);
  
    if (teamMatches.length === 0) return [];
  
    const now = new Date();
    console.log("Current date:", now);
  
    const upcomingMatches = teamMatches
      .filter((match: Match) => {
        const isNotCompleted = match.status !== 'completed';
        const hasDate = !!match.scheduledDate;
        const isFutureDate = hasDate && match.scheduledDate!.toDate() > now;
  
        console.log(
          `Match ${match.id} filtering: not completed=${isNotCompleted}, has date=${hasDate}, future date=${isFutureDate}`
        );
  
        return isNotCompleted && hasDate && isFutureDate;
      })
      .sort((a: Match, b: Match) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        return a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime();
      })
      .slice(0, 3);
  
    console.log("Upcoming matches:", upcomingMatches);
  
    return upcomingMatches;
  };
    

  const getRecentMatches = () => {
    if (teamMatches.length === 0) return [];
    
    return teamMatches
      .filter(match => match.status === 'completed')
      .sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        // Sort in descending order (most recent first)
        return b.scheduledDate.toDate().getTime() - a.scheduledDate.toDate().getTime();
      })
      .slice(0, 3); // Get last 3 matches
  };

  const getOpponentName = (match: Match) => {
    if (!selectedTeam) return 'Unknown';
    
    const isHomeTeam = match.homeTeamId === selectedTeam.id;
    const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
    
    const opponentTeam = captainTeams.find(t => t.id === opponentTeamId);
    return opponentTeam ? opponentTeam.name : 'Unknown Team';
  };

  const getMatchResult = (match: Match) => {
    if (!selectedTeam || match.status !== 'completed') return null;
    
    const matchFrames = frames.filter(f => f.matchId === match.id);
    if (matchFrames.length === 0) return null;
    
    const isHomeTeam = match.homeTeamId === selectedTeam.id;
    const homeWins = matchFrames.filter(f => f.winnerId === f.homePlayerId).length;
    const awayWins = matchFrames.filter(f => f.winnerId === f.awayPlayerId).length;
    
    let result;
    let color;
    
    if (homeWins === awayWins) {
      result = `Draw (${homeWins}-${awayWins})`;
      color = 'default';
    } else if ((isHomeTeam && homeWins > awayWins) || (!isHomeTeam && awayWins > homeWins)) {
      result = `Win (${isHomeTeam ? homeWins : awayWins}-${isHomeTeam ? awayWins : homeWins})`;
      color = 'success';
    } else {
      result = `Loss (${isHomeTeam ? homeWins : awayWins}-${isHomeTeam ? awayWins : homeWins})`;
      color = 'error';
    }
    
    return { result, color };
  };

  const upcomingMatches = getUpcomingMatches();
  const recentMatches = getRecentMatches();

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
        {error.includes('not registered as a captain') && (
          <Box my={2} display="flex" justifyContent="center">
            <FixCaptainButton />
          </Box>
        )}
        {debugInfo && (
          <Paper sx={{ mt: 2, p: 2 }}>
            <Typography variant="h6">Debug Information</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '300px' }}>
              {debugInfo}
            </pre>
          </Paper>
        )}
      </Container>
    );
  }

  if (!selectedTeam) {
    return (
      <Container maxWidth="lg">
        <Alert severity="info" sx={{ mt: 4 }}>
          You are not registered as a captain for any team. Please contact the league administrator.
        </Alert>
        {debugInfo && (
          <Paper sx={{ mt: 2, p: 2 }}>
            <Typography variant="h6">Debug Information</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '300px' }}>
              {debugInfo}
            </pre>
          </Paper>
        )}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Team Dashboard
        </Typography>
        
        {/* Team Overview Card */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" gutterBottom>
              {selectedTeam.name}
            </Typography>
            
            <Box>
              <Button 
                component={RouterLink} 
                to="/team/roster" 
                variant="outlined" 
                startIcon={<PeopleIcon />}
                sx={{ mr: 2 }}
              >
                Manage Roster
              </Button>
            </Box>
          </Box>
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6} sm={3}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">{teamRecord.wins}-{teamRecord.losses}{teamRecord.draws > 0 ? `-${teamRecord.draws}` : ''}</Typography>
                <Typography variant="body2" color="text.secondary">Team Record</Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">{frameRecord.won}-{frameRecord.lost}</Typography>
                <Typography variant="body2" color="text.secondary">Frame Record</Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {frameRecord.won + frameRecord.lost > 0 ? 
                    `${Math.round((frameRecord.won / (frameRecord.won + frameRecord.lost)) * 100)}%` : 
                    '0%'}
                </Typography>
                <Typography variant="body2" color="text.secondary">Win Rate</Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6} sm={3}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">{teamPlayers.length}</Typography>
                <Typography variant="body2" color="text.secondary">Players</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
        
        <Grid container spacing={4}>
          {/* Upcoming Matches */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Upcoming Matches
                  </Typography>
                  <CalendarIcon color="primary" />
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {upcomingMatches.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No upcoming matches scheduled
                  </Typography>
                ) : (
                  <List>
                    {upcomingMatches.map(match => (
                      <ListItem key={match.id}>
                        <ListItemText
                          primary={`vs ${getOpponentName(match)}`}
                          secondary={match.scheduledDate ? 
                            format(match.scheduledDate.toDate(), 'EEEE, MMMM d, yyyy h:mm a') : 
                            'Date TBD'
                          }
                        />
                        {match.id && (
                          <Button
                            size="small"
                            variant="outlined"
                            component={RouterLink}
                            to={`/team/match/${match.id}`}
                            endIcon={<ArrowForwardIcon />}
                          >
                            View
                          </Button>
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <Button 
                  size="small" 
                  color="primary" 
                  component={RouterLink} 
                  to="/team/matches"
                >
                  View All Matches
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          {/* Recent Results */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Recent Results
                  </Typography>
                  <TrophyIcon color="primary" />
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {recentMatches.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No completed matches yet
                  </Typography>
                ) : (
                  <List>
                    {recentMatches.map(match => {
                      const result = getMatchResult(match);
                      return (
                        <ListItem key={match.id}>
                          <ListItemText
                            primary={`vs ${getOpponentName(match)}`}
                            secondary={match.scheduledDate ? 
                              format(match.scheduledDate.toDate(), 'MMMM d, yyyy') : 
                              'Date unknown'
                            }
                          />
                          {result && (
                            <Chip 
                              label={result.result} 
                              color={result.color as any} 
                              size="small" 
                            />
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                <Button 
                  size="small" 
                  color="primary" 
                  component={RouterLink} 
                  to="/team/matches"
                >
                  View All Results
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
        
        {/* Player Performance */}
        <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Player Performance
            </Typography>
            <GameIcon color="primary" />
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {playerStats.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No player statistics available yet
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
                    <TableCell align="center">Played</TableCell>
                    <TableCell align="center">Won</TableCell>
                    <TableCell align="center">Lost</TableCell>
                    <TableCell align="center">Win %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {playerStats.map(stat => (
                    <TableRow key={stat.player.id}>
                      <TableCell>{stat.player.firstName} {stat.player.lastName}</TableCell>
                      <TableCell align="center">{stat.played}</TableCell>
                      <TableCell align="center">{stat.won}</TableCell>
                      <TableCell align="center">{stat.lost}</TableCell>
                      <TableCell align="center">{stat.winRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              component={RouterLink}
              to="/team/roster"
              color="primary"
            >
              Manage Players
            </Button>
          </Box>
        </Paper>
        
        {/* Best Performing Players */}
        <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Top Performers
            </Typography>
            <PeopleIcon color="primary" />
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {playerStats.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No player statistics available yet
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {playerStats.slice(0, Math.min(3, playerStats.length)).map((stat, index) => (
                <Grid item xs={12} sm={4} key={stat.player.id}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                    <Avatar 
                      sx={{ 
                        width: 64, 
                        height: 64, 
                        bgcolor: index === 0 ? 'success.main' : index === 1 ? 'info.main' : 'secondary.main',
                        mx: 'auto',
                        mb: 2
                      }}
                    >
                      {stat.player.firstName.charAt(0)}
                    </Avatar>
                    <Typography variant="h6" gutterBottom>
                      {stat.player.firstName} {stat.player.lastName}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {stat.won} wins, {stat.lost} losses
                    </Typography>
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      {stat.winRate}%
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
        
        {/* Team Progress */}
        <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Season Progress
            </Typography>
            <TrophyIcon color="primary" />
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Matches</TableCell>
                      <TableCell align="right">{teamMatches.length}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Completed Matches</TableCell>
                      <TableCell align="right">{teamMatches.filter(m => m.status === 'completed').length}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Upcoming Matches</TableCell>
                      <TableCell align="right">{teamMatches.filter(m => m.status !== 'completed').length}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Frames Played</TableCell>
                      <TableCell align="right">{frameRecord.won + frameRecord.lost}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Home Matches Win %</TableCell>
                      <TableCell align="right">
                        {(() => {
                          const homeMatches = teamMatches.filter(m => m.status === 'completed' && m.homeTeamId === selectedTeam.id);
                          if (homeMatches.length === 0) return '0%';
                          
                          const homeWins = homeMatches.filter(m => {
                            const matchFrames = frames.filter(f => f.matchId === m.id);
                            const homeWins = matchFrames.filter(f => f.winnerId === f.homePlayerId).length;
                            const awayWins = matchFrames.filter(f => f.winnerId === f.awayPlayerId).length;
                            return homeWins > awayWins;
                          }).length;
                          
                          return `${Math.round((homeWins / homeMatches.length) * 100)}%`;
                        })()}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Away Matches Win %</TableCell>
                      <TableCell align="right">
                        {(() => {
                          const awayMatches = teamMatches.filter(m => m.status === 'completed' && m.awayTeamId === selectedTeam.id);
                          if (awayMatches.length === 0) return '0%';
                          
                          const awayWins = awayMatches.filter(m => {
                            const matchFrames = frames.filter(f => f.matchId === m.id);
                            const homeWins = matchFrames.filter(f => f.winnerId === f.homePlayerId).length;
                            const awayWins = matchFrames.filter(f => f.winnerId === f.awayPlayerId).length;
                            return awayWins > homeWins;
                          }).length;
                          
                          return `${Math.round((awayWins / awayMatches.length) * 100)}%`;
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="h5" align="center" gutterBottom>
                  Team Standing
                </Typography>
                
                {(() => {
                  // This would ideally be calculated from standings data
                  // For now, we'll use a placeholder
                  const totalTeams = 8; // Placeholder
                  const currentPosition = 3; // Placeholder
                  
                  return (
                    <>
                      <Typography variant="h2" align="center" fontWeight="bold" color="primary">
                        {currentPosition}/{totalTeams}
                      </Typography>
                      <Typography variant="body1" align="center" color="text.secondary">
                        Current League Position
                      </Typography>
                    </>
                  );
                })()}
                
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    component={RouterLink} 
                    to="/standings"
                  >
                    View Full Standings
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default TeamDashboard;