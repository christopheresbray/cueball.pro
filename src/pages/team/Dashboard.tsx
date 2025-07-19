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
  getCurrentSeason
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
  console.log("TeamDashboard: Current user:", user?.uid);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const [captainTeams, setCaptainTeams] = useState<Team[]>([]);
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
      if (teamPlayers.length > 0) {
        calculatePlayerStats();
      }
    }
  }, [teamMatches, teamPlayers]);

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
        debugText += `Team ${index + 1}: id=${team.id}, name=${team.name}\n`;
        console.log(`Team ${index + 1}:`, team);
      });
      
      // Filter based on isUserTeamCaptain for the *first* season found (assuming only one season matters here)
      // TODO: Refine this if captaincy needs checking across multiple seasons?
      const currentSeason = await getCurrentSeason(); // Assuming we need a season context
      if (!currentSeason) {
        setError("Could not determine active season to check captaincy.");
        setLoading(false);
        return;
      }

      const userCaptainTeams = [];
      if (user) {
        for (const team of allTeams) {
          if (team.id && await isUserTeamCaptain(user.uid, team.id, currentSeason.id!)) {
            userCaptainTeams.push(team);
          }
        }
      }
      
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
      const sortedTeamMatchList = teamMatchList.sort((a, b) => {
        const dateA = a.scheduledDate?.toDate?.() || new Date(0);
        const dateB = b.scheduledDate?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  
      setTeamMatches(sortedTeamMatchList);
  
      // Fetch all teams for this season (important step!)
      const allTeams = await getTeams(selectedTeam.seasonId);
      setCaptainTeams(allTeams);
  
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
      const matchFrames = match.frames || [];
      
      if (matchFrames.length === 0) continue;
      
      const isHomeTeam = match.homeTeamId === selectedTeam.id;
      
      // Count frame wins/losses
      for (const frame of matchFrames) {
        if (!frame.winnerPlayerId) continue;
        
        const homePlayerWon = frame.winnerPlayerId === frame.homePlayerId;
        
        if ((isHomeTeam && homePlayerWon) || (!isHomeTeam && !homePlayerWon)) {
          framesWon++;
        } else {
          framesLost++;
        }
      }
      
      // Determine match result
      const homeFrameWins = matchFrames.filter(f => f.winnerPlayerId === f.homePlayerId).length;
      const awayFrameWins = matchFrames.filter(f => f.winnerPlayerId === f.awayPlayerId).length;
      
      if ((isHomeTeam && homeFrameWins > awayFrameWins) || (!isHomeTeam && awayFrameWins > homeFrameWins)) {
        wins++;
      } else if ((isHomeTeam && homeFrameWins < awayFrameWins) || (!isHomeTeam && awayFrameWins < homeFrameWins)) {
        losses++;
      } else {
        draws++;
      }
    }
    
    setTeamRecord({ wins, losses, draws });
    setFrameRecord({ won: framesWon, lost: framesLost });
  };

  const calculatePlayerStats = async () => {
    if (!selectedTeam || teamPlayers.length === 0 || teamMatches.length === 0) {
      setPlayerStats([]);
      return;
    }
    
    console.log("Calculating player stats for team:", selectedTeam.name);
    setCalculatingStats(true);

    try {
      const stats: Record<string, { wins: number; losses: number }> = {};
      teamPlayers.forEach(p => { stats[p.id!] = { wins: 0, losses: 0 }; });

      // Iterate through completed matches and their frames
      teamMatches
        .filter(match => match.status === 'completed')
        .forEach(match => {
          (match.frames || []).forEach(frame => {
            const homePlayerId = frame.homePlayerId;
            const awayPlayerId = frame.awayPlayerId;
            const winnerPlayerId = frame.winnerPlayerId;

            // Check if home player is from the selected team
            if (homePlayerId && stats[homePlayerId]) {
              if (winnerPlayerId === homePlayerId) {
                stats[homePlayerId].wins += 1;
              } else if (winnerPlayerId) {
                stats[homePlayerId].losses += 1;
              }
            }

            // Check if away player is from the selected team
            if (awayPlayerId && stats[awayPlayerId]) {
              if (winnerPlayerId === awayPlayerId) {
                stats[awayPlayerId].wins += 1;
              } else if (winnerPlayerId) {
                stats[awayPlayerId].losses += 1;
              }
            }
          });
        });

      // Create the final stats array
      const finalStats: TeamPlayerStat[] = teamPlayers
        .map(player => {
          const playerStat = stats[player.id!];
          if (!playerStat) return null; // Should not happen if initialized correctly
          
          const played = playerStat.wins + playerStat.losses;
          const winPercentage = played > 0 ? Math.round((playerStat.wins / played) * 100) : 0;
          
          return {
            id: player.id!,
            name: `${player.firstName} ${player.lastName}`,
            played,
            wins: playerStat.wins,
            losses: playerStat.losses,
            winPercentage
          };
        })
        .filter((stat): stat is TeamPlayerStat => stat !== null && stat.played > 0)
        .sort((a, b) => b.winPercentage - a.winPercentage || b.wins - a.wins || a.name.localeCompare(b.name));

      setPlayerStats(finalStats);
      console.log("Player stats calculation complete.");

    } catch (error) {
      console.error("Error calculating player stats:", error);
      setError("Failed to calculate player stats");
    } finally {
      setCalculatingStats(false);
    }
  };

  const getOpponentTeamName = (match: Match): string => {
    if (!selectedTeam) return '';
    const isHomeTeam = match.homeTeamId === selectedTeam.id;
    const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
    const opponentTeam = captainTeams.find(team => team.id === opponentTeamId);
    return opponentTeam?.name || 'Unknown Team';
  };

  const getNextMatch = (): Match | null => {
    const now = new Date();
    const upcomingMatches = teamMatches
      .filter(match => 
        match.status !== 'completed' && 
        match.scheduledDate && 
        match.scheduledDate.toDate() > now
      )
      .sort((a, b) => {
        const dateA = a.scheduledDate?.toDate?.() || new Date(0);
        const dateB = b.scheduledDate?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    
    return upcomingMatches.length > 0 ? upcomingMatches[0] : null;
  };

  const nextMatch = getNextMatch();

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
        {debugInfo && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Debug Information</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
              {debugInfo}
            </pre>
          </Box>
        )}
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Team Dashboard
      </Typography>
      
      {selectedTeam && (
        <>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" gutterBottom>
                  {selectedTeam.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip 
                    icon={<TrophyIcon />} 
                    label={`Record: ${teamRecord.wins}-${teamRecord.losses}${teamRecord.draws > 0 ? `-${teamRecord.draws}` : ''}`} 
                    color="primary" 
                  />
                  <Chip 
                    icon={<GameIcon />} 
                    label={`Frames: ${frameRecord.won}-${frameRecord.lost}`} 
                    color="secondary" 
                  />
                  <Chip 
                    icon={<PeopleIcon />} 
                    label={`Players: ${teamPlayers.length}`} 
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ textAlign: { md: 'right' } }}>
                  <Typography variant="h6" gutterBottom>
                    Next Match
                  </Typography>
                  {nextMatch ? (
                    <>
                      <Typography variant="body1">
                        vs {getOpponentTeamName(nextMatch)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {nextMatch.scheduledDate && 
                          format(nextMatch.scheduledDate.toDate(), 'MMMM dd, yyyy h:mm a')}
                      </Typography>
                      <Button 
                        component={RouterLink} 
                        to={`/team/match/${nextMatch.id}`}
                        variant="outlined" 
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{ mt: 1 }}
                      >
                        View Details
                      </Button>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No upcoming matches scheduled
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Typography variant="h5" gutterBottom>
                Player Statistics
              </Typography>
              
              <TableContainer component={Paper}>
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
                    {playerStats.map((stat) => (
                      <TableRow key={stat.id}>
                        <TableCell>{stat.name}</TableCell>
                        <TableCell align="center">{stat.played}</TableCell>
                        <TableCell align="center">{stat.wins}</TableCell>
                        <TableCell align="center">{stat.losses}</TableCell>
                        <TableCell align="center">{stat.winPercentage}%</TableCell>
                      </TableRow>
                    ))}
                    {playerStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          {calculatingStats ? (
                            <CircularProgress size={24} sx={{ my: 2 }} />
                          ) : (
                            "No player statistics available yet"
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h5" gutterBottom>
                Top Performers
              </Typography>
              
              {playerStats.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No player statistics available
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3} mt={2}>
                  {playerStats.slice(0, 3).map((stat, index) => (
                    <Grid item xs={12} key={stat.id}>
                      <Box
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          boxShadow: 1
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze',
                              color: 'black',
                              fontWeight: 'bold'
                            }}
                          >
                            {index + 1}
                          </Avatar>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {stat.name}
                          </Typography>
                        </Box>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          {stat.wins} wins, {stat.losses} losses
                        </Typography>
                        <Typography variant="h5" color="primary" fontWeight="bold">
                          {stat.winPercentage}%
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>
          </Grid>
          
          <Box mt={4}>
            <Typography variant="h5" gutterBottom>
              Upcoming Matches
            </Typography>
            
            <Grid container spacing={2}>
              {teamMatches
                .filter(match => match.status !== 'completed')
                .sort((a, b) => {
                  const dateA = a.scheduledDate?.toDate?.() || new Date(0);
                  const dateB = b.scheduledDate?.toDate?.() || new Date(0);
                  return dateB.getTime() - dateA.getTime();
                })
                .map(match => {
                  const isHomeTeam = match.homeTeamId === selectedTeam.id;
                  const opponentName = getOpponentTeamName(match);
                  const hasSubmittedLineup = isHomeTeam ? 
                    (match.lineupHistory?.[1]?.homeLineup?.length ?? 0) >= 4 : 
                    (match.lineupHistory?.[1]?.awayLineup?.length ?? 0) >= 4;
                  const isScheduled = match.status === 'scheduled';
                  const isInProgress = match.status === 'in_progress';
                  
                  return (
                    <Grid item xs={12} key={match.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="h6">
                                {isHomeTeam ? 'vs' : '@'} {opponentName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {match.scheduledDate && 
                                  format(match.scheduledDate.toDate(), 'MMMM dd, yyyy h:mm a')}
                              </Typography>
                            </Box>
                            <Box>
                              {isScheduled ? (
                                <>
                                  {hasSubmittedLineup ? (
                                    <Chip 
                                      label="Lineup Submitted" 
                                      color="success" 
                                      variant="outlined"
                                      sx={{ mr: 2 }}
                                    />
                                  ) : (
                                    <Chip 
                                      label="Lineup Needed" 
                                      color="warning" 
                                      variant="outlined"
                                      sx={{ mr: 2 }}
                                    />
                                  )}
                                  <Button
                                    variant={hasSubmittedLineup ? "outlined" : "contained"}
                                    color="primary"
                                    component={RouterLink}
                                    to={`/team/match/${match.id}/score-v2`}
                                  >
                                    {hasSubmittedLineup ? 'Edit Lineup' : 'Set Lineup'}
                                  </Button>
                                </>
                              ) : isInProgress ? (
                                <>
                                  <Chip 
                                    label="LIVE" 
                                    color="error"
                                    sx={{ 
                                      mr: 2,
                                      animation: 'pulse 2s infinite',
                                      '@keyframes pulse': {
                                        '0%': {
                                          opacity: 1,
                                        },
                                        '50%': {
                                          opacity: 0.5,
                                        },
                                        '100%': {
                                          opacity: 1,
                                        },
                                      },
                                    }}
                                  />
                                  <Button
                                    variant="contained"
                                    color="error"
                                    component={RouterLink}
                                    to={`/team/match/${match.id}/score-v2`}
                                    startIcon={<PlayArrowIcon />}
                                    sx={{ 
                                      fontWeight: 'bold',
                                      '&:hover': {
                                        backgroundColor: 'error.dark',
                                      }
                                    }}
                                  >
                                    Return to Live Scoring
                                  </Button>
                                </>
                              ) : null}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
                
              {teamMatches.filter(match => match.status !== 'completed').length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No upcoming matches
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
          
          <Box mt={4}>
            <Typography variant="h5" gutterBottom>
              Recent Matches
            </Typography>
            
            <Grid container spacing={2}>
              {teamMatches
                .filter(match => match.status === 'completed')
                .slice(0, 3)
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
                    <Grid item xs={12} md={4} key={match.id}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            {isHomeTeam ? 'vs' : '@'} {opponentName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {match.scheduledDate && 
                              format(match.scheduledDate.toDate(), 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="h6" color={resultColor} sx={{ fontWeight: 'bold', mt: 2 }}>
                            {result} ({isHomeTeam ? `${homeWins}-${awayWins}` : `${awayWins}-${homeWins}`})
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button 
                            component={RouterLink} 
                            to={`/team/match/${match.id}`} 
                            size="small"
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
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
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