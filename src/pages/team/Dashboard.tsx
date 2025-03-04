// src/pages/team/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as GameIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

import { useAuth } from '../../context/AuthContext';
import {
  Team,
  Player,
  Match,
  Frame,
  Venue,
  getTeams,
  getPlayers,
  getMatches,
  getFrames,
  getVenues
} from '../../services/databaseService';

const TeamDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [captainTeams, setCaptainTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [teamMatches, setTeamMatches] = useState<Match[]>([]);
  const [teamFrames, setTeamFrames] = useState<Frame[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    if (user) {
      fetchTeamData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamDetails(selectedTeam.id!);
    }
  }, [selectedTeam]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // Get all teams where the current user is captain
      const allTeams = await getTeams('');
      const userCaptainTeams = allTeams.filter(team => team.captainId === user?.uid);
      
      setCaptainTeams(userCaptainTeams);
      
      // If user is captain of at least one team, select the first one
      if (userCaptainTeams.length > 0) {
        setSelectedTeam(userCaptainTeams[0]);
      } else {
        setLoading(false);
        setError('You are not registered as a captain for any team');
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      setError('Failed to fetch team data');
      setLoading(false);
    }
  };

  const fetchTeamDetails = async (teamId: string) => {
    setLoading(true);
    try {
      // Fetch team players
      const players = await getPlayers(teamId);
      setTeamPlayers(players);
      
      // Fetch team matches (both home and away)
      const allMatches = await getMatches('');
      const matches = allMatches.filter(match => 
        match.homeTeamId === teamId || match.awayTeamId === teamId
      );
      
      // Sort matches by date
      matches.sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        return a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime();
      });
      
      setTeamMatches(matches);
      
      // Fetch frames for completed matches
      const completedMatches = matches.filter(match => match.status === 'completed');
      let allFrames: Frame[] = [];
      
      for (const match of completedMatches) {
        const matchFrames = await getFrames(match.id!);
        allFrames = [...allFrames, ...matchFrames];
      }
      
      setTeamFrames(allFrames);
      
      // Fetch venues for match locations
      const venuesData = await getVenues();
      setVenues(venuesData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching team details:', error);
      setError('Failed to fetch team details');
      setLoading(false);
    }
  };

  const getPastMatches = () => {
    const now = new Date();
    return teamMatches
      .filter(match => match.scheduledDate && match.scheduledDate.toDate() < now)
      .sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        // Sort in descending order (most recent first)
        return b.scheduledDate.toDate().getTime() - a.scheduledDate.toDate().getTime();
      })
      .slice(0, 5); // Get only the last 5 matches
  };

  const getUpcomingMatches = () => {
    const now = new Date();
    return teamMatches
      .filter(match => match.scheduledDate && match.scheduledDate.toDate() >= now)
      .sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        // Sort in ascending order (soonest first)
        return a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime();
      })
      .slice(0, 5); // Get only the next 5 matches
  };

  const getTeamStats = () => {
    if (!selectedTeam) return { wins: 0, losses: 0, framesWon: 0, framesLost: 0 };
    
    const completedMatches = teamMatches.filter(match => match.status === 'completed');
    let wins = 0;
    let losses = 0;
    let framesWon = 0;
    let framesLost = 0;
    
    for (const match of completedMatches) {
      const matchFrames = teamFrames.filter(frame => frame.matchId === match.id);
      
      const isHomeTeam = match.homeTeamId === selectedTeam.id;
      
      // Count frames won/lost
      for (const frame of matchFrames) {
        const homeWon = frame.winnerId === frame.homePlayerId;
        
        if ((isHomeTeam && homeWon) || (!isHomeTeam && !homeWon)) {
          framesWon++;
        } else {
          framesLost++;
        }
      }
      
      // Determine match win/loss
      if (matchFrames.length > 0) {
        const homeWins = matchFrames.filter(f => f.winnerId === f.homePlayerId).length;
        const awayWins = matchFrames.filter(f => f.winnerId === f.awayPlayerId).length;
        
        if ((isHomeTeam && homeWins > awayWins) || (!isHomeTeam && awayWins > homeWins)) {
          wins++;
        } else if ((isHomeTeam && homeWins < awayWins) || (!isHomeTeam && awayWins < homeWins)) {
          losses++;
        }
        // Draws are possible but not counted separately
      }
    }
    
    return { wins, losses, framesWon, framesLost };
  };

  const getPlayerStats = () => {
    if (!selectedTeam) return [];
    
    const playerStats = teamPlayers.map(player => {
      const playerFrames = teamFrames.filter(frame => 
        frame.homePlayerId === player.id || frame.awayPlayerId === player.id
      );
      
      const played = playerFrames.length;
      const won = playerFrames.filter(frame => frame.winnerId === player.id).length;
      const lost = played - won;
      const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
      
      return {
        player,
        played,
        won,
        lost,
        winRate
      };
    });
    
    // Sort by win rate (highest first)
    return playerStats.sort((a, b) => b.winRate - a.winRate);
  };

  const getVenueName = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    return venue ? venue.name : 'Unknown venue';
  };

  const getOpponentTeamId = (match: Match) => {
    if (!selectedTeam) return '';
    return match.homeTeamId === selectedTeam.id ? match.awayTeamId : match.homeTeamId;
  };

  const getOpponentTeamName = (match: Match) => {
    const opponentId = getOpponentTeamId(match);
    const opponents = captainTeams.filter(t => t.id !== selectedTeam?.id);
    const opponent = opponents.find(t => t.id === opponentId);
    return opponent ? opponent.name : 'Unknown team';
  };

  const { wins, losses, framesWon, framesLost } = getTeamStats();
  const pastMatches = getPastMatches();
  const upcomingMatches = getUpcomingMatches();
  const playerStats = getPlayerStats();

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Team Dashboard
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !selectedTeam ? (
          <Alert severity="info">You don't have any teams assigned to you as captain.</Alert>
        ) : (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                {selectedTeam.name}
              </Typography>
              {venues.length > 0 && (
                <Typography variant="body1" gutterBottom>
                  Home Venue: {getVenueName(selectedTeam.homeVenueId)}
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <Chip 
                  icon={<TrophyIcon />} 
                  label={`Record: ${wins}-${losses}`} 
                  color="primary" 
                  sx={{ mr: 1, mb: 1 }} 
                />
                <Chip 
                  icon={<GameIcon />} 
                  label={`Frames: ${framesWon}-${framesLost}`} 
                  color="secondary" 
                  sx={{ mr: 1, mb: 1 }} 
                />
                <Chip 
                  icon={<PeopleIcon />} 
                  label={`${teamPlayers.length} Players`} 
                  sx={{ mr: 1, mb: 1 }} 
                />
              </Box>
            </Paper>

            <Grid container spacing={4}>
              {/* Team Roster Section */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Team Roster
                      </Typography>
                      <PeopleIcon color="primary" />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    {teamPlayers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" align="center">
                        No players found for this team
                      </Typography>
                    ) : (
                      <List>
                        {playerStats.map(({ player, played, won, lost, winRate }) => (
                          <ListItem key={player.id} divider>
                            <ListItemAvatar>
                              <Avatar>{player.name.charAt(0)}</Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={player.name}
                              secondary={played > 0 ? `${won} wins, ${lost} losses (${winRate}%)` : 'No matches played'}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                  <CardActions>