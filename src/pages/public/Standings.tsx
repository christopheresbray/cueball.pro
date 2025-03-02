// src/pages/public/Standings.tsx
import React, { useState, useEffect, SyntheticEvent } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  SelectChangeEvent
} from '@mui/material';

import {
  League,
  Season,
  Team,
  Match,
  Frame,
  Player,
  getLeagues,
  getSeasons,
  getTeams,
  getMatches,
  getFrames,
  getPlayers
} from '../../services/databaseService';

interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  frameWon: number;
  frameLost: number;
  points: number;
}

interface PlayerStat {
  playerId: string;
  playerName: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  winPercentage: number;
}

const Standings = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeagues();
  }, []);

  useEffect(() => {
    if (selectedLeagueId) {
      fetchSeasons(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchSeasonData(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  useEffect(() => {
    if (teams.length > 0 && matches.length > 0 && frames.length > 0) {
      calculateTeamStandings();
      calculatePlayerStats();
    }
  }, [teams, matches, frames, players]);

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const leaguesData = await getLeagues();
      setLeagues(leaguesData);
      if (leaguesData.length > 0) {
        setSelectedLeagueId(leaguesData[0].id!);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setError('Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasons = async (leagueId: string) => {
    setLoading(true);
    try {
      const seasonsData = await getSeasons(leagueId);
      setSeasons(seasonsData);
      if (seasonsData.length > 0) {
        setSelectedSeasonId(seasonsData[0].id!);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      setError('Failed to fetch seasons');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonData = async (seasonId: string) => {
    setLoading(true);
    try {
      const teamsData = await getTeams(seasonId);
      setTeams(teamsData);
      const matchesData = await getMatches(seasonId);
      setMatches(matchesData);

      const allFrames: Frame[] = [];
      for (const match of matchesData) {
        const matchFrames = await getFrames(match.id!);
        allFrames.push(...matchFrames);
      }
      setFrames(allFrames);

      const allPlayers: Player[] = [];
      for (const team of teamsData) {
        const teamPlayers = await getPlayers(team.id!);
        allPlayers.push(...teamPlayers);
      }
      setPlayers(allPlayers);
    } catch (error) {
      console.error('Error fetching season data:', error);
      setError('Failed to fetch season data');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueChange = (e: SelectChangeEvent<string>) => {
    setSelectedLeagueId(e.target.value);
  };

  const handleSeasonChange = (e: SelectChangeEvent<string>) => {
    setSelectedSeasonId(e.target.value);
  };

  const handleTabChange = (event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          League Standings
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="league-select-label">League</InputLabel>
                <Select
                  labelId="league-select-label"
                  value={selectedLeagueId}
                  onChange={handleLeagueChange}
                  label="League"
                >
                  {leagues.map((league) => (
                    <MenuItem key={league.id} value={league.id}>
                      {league.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="season-select-label">Season</InputLabel>
                <Select
                  labelId="season-select-label"
                  value={selectedSeasonId}
                  onChange={handleSeasonChange}
                  label="Season"
                >
                  {seasons.map((season) => (
                    <MenuItem key={season.id} value={season.id}>
                      {season.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Standings;
