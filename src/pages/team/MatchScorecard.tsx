// src/pages/team/MatchScorecard.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material';
import { format } from 'date-fns';

import {
  Match,
  Team,
  Player,
  Frame,
  getMatches,
  getTeams,
  getPlayers,
  getFrames,
  updateMatch,
  createFrame,
  updateFrame
} from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';

const MatchScorecard = () => {
  const { matchId } = useParams();
  const { user } = useAuth();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  
  const [isHomeTeamCaptain, setIsHomeTeamCaptain] = useState(false);
  const [isAwayTeamCaptain, setIsAwayTeamCaptain] = useState(false);
  
  const [homeLineup, setHomeLineup] = useState<string[]>(['', '', '', '']);
  const [awayLineup, setAwayLineup] = useState<string[]>(['', '', '', '']);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (matchId) {
      fetchMatchData(matchId);
    }
  }, [matchId]);

  useEffect(() => {
    if (match) {
      fetchTeamsAndPlayers();
      fetchFrames();
    }
  }, [match]);

  useEffect(() => {
    if (user && homeTeam && awayTeam) {
      setIsHomeTeamCaptain(homeTeam.captainId === user.uid);
      setIsAwayTeamCaptain(awayTeam.captainId === user.uid);
    }
  }, [user, homeTeam, awayTeam]);

  const fetchMatchData = async (id: string) => {
    try {
      const matchesData = await getMatches('');
      const matchData = matchesData.find(m => m.id === id);
      
      if (matchData) {
        setMatch(matchData);
      } else {
        setError('Match not found');
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      setError('Failed to fetch match data');
    }
  };

  const fetchTeamsAndPlayers = async () => {
    if (!match) return;
    
    try {
      const teamsData = await getTeams(match.seasonId);
      const home = teamsData.find(team => team.id === match.homeTeamId) || null;
      const away = teamsData.find(team => team.id === match.awayTeamId) || null;
      
      setHomeTeam(home);
      setAwayTeam(away);
      
      if (home) {
        const homePlayersData = await getPlayers(home.id!);
        setHomePlayers(homePlayersData);
      }
      
      if (away) {
        const awayPlayersData = await getPlayers(away.id!);
        setAwayPlayers(awayPlayersData);
      }
    } catch (error) {
      console.error('Error fetching teams and players:', error);
      setError('Failed to fetch teams and players');
    }
  };

  const fetchFrames = async () => {
    if (!matchId) return;
    
    try {
      const framesData = await getFrames(matchId);
      setFrames(framesData);
    } catch (error) {
      console.error('Error fetching frames:', error);
      setError('Failed to fetch frames');
    }
  };

  const calculateScores = () => {
    const homeWins = frames.filter(f => f.winnerId === f.homePlayerId).length;
    const awayWins = frames.filter(f => f.winnerId === f.awayPlayerId).length;
    
    return { homeWins, awayWins };
  };

  const { homeWins, awayWins } = calculateScores();

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Match Scorecard
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">
                {homeTeam?.name || 'Home Team'} vs {awayTeam?.name || 'Away Team'}
              </Typography>
              <Typography variant="body1">
              {match?.scheduledDate ? format(match.scheduledDate.toDate(), 'EEEE, MMMM d, yyyy h:mm a') : 'TBD'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6">
                  Score: {homeWins} - {awayWins}
                </Typography>
                <Typography variant="body2">
                  Status: {match?.status}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default MatchScorecard;
