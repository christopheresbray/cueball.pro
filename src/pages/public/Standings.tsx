// src/pages/public/Standings.tsx
import { useState, useEffect } from 'react';
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
  Tab
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

// Interface for standings table data
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

// Interface for player statistics
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
      // Fetch teams
      const teamsData = await getTeams(seasonId);
      setTeams(teamsData);
      
      // Fetch matches
      const matchesData = await getMatches(seasonId);
      setMatches(matchesData);
      
      // Fetch all frames for all matches
      const allFrames: Frame[] = [];
      for (const match of matchesData) {
        const matchFrames = await getFrames(match.id!);
        allFrames.push(...matchFrames);
      }
      setFrames(allFrames);
      
      // Fetch all players
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

  const calculateTeamStandings = () => {
    const standings: TeamStanding[] = teams.map(team => ({
      teamId: team.id!,
      teamName: team.name,
      played: 0,
      won: 0,
      lost: 0,
      frameWon: 0,
      frameLost: 0,
      points: 0
    }));
    
    // Calculate match wins and losses
    for (const match of matches) {
      if (match.status !== 'completed') continue;
      
      const matchFrames = frames.filter(frame => frame.matchId === match.id);
      if (matchFrames.length === 0) continue;
      
      const homeTeamIndex = standings.findIndex(s => s.teamId === match.homeTeamId);
      const awayTeamIndex = standings.findIndex(s => s.teamId === match.awayTeamId);
      
      if (homeTeamIndex === -1 || awayTeamIndex === -1) continue;
      
      // Count frames
      const homeWins = matchFrames.filter(f => f.winnerId === f.homePlayerId).length;
      const awayWins = matchFrames.filter(f => f.winnerId === f.awayPlayerId).length;
      
      // Update frame counts
      standings[homeTeamIndex].frameWon += homeWins;
      standings[homeTeamIndex].frameLost += awayWins;
      standings[awayTeamIndex].frameWon += awayWins;
      standings[awayTeamIndex].frameLost += homeWins;
      
      // Update match played count
      standings[homeTeamIndex].played += 1;
      standings[awayTeamIndex].played += 1;
      
      // Determine match winner (team with more frame wins)
      if (homeWins > awayWins) {
        standings[homeTeamIndex].won += 1;
        standings[awayTeamIndex].lost += 1;
        standings[homeTeamIndex].points += 2; // 2 points for a win
      } else if (awayWins > homeWins) {
        standings[awayTeamIndex].won += 1;
        standings[homeTeamIndex].lost += 1;
        standings[awayTeamIndex].points += 2; // 2 points for a win
      } else {
        // Draw (equal frame wins)
        standings[homeTeamIndex].points += 1; // 1 point for a draw
        standings[awayTeamIndex].points += 1; // 1 point for a draw
      }
    }
    
    // Sort standings by points (highest first)
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      // If points are equal, sort by frame difference
      const aFrameDiff = a.frameWon - a.frameLost;
      const bFrameDiff = b.frameWon - b.frameLost;
      return bFrameDiff - aFrameDiff;
    });
    
    setTeamStandings(standings);
  };

  const calculatePlayerStats = () => {
    const stats: Record<string, PlayerStat> = {};
    
    // Initialize player stats
    for (const player of players) {
      const team = teams.find(t => t.playerIds.includes(player.id!));
      
      stats[player.id!] = {
        playerId: player.id!,
        playerName: player.name,
        teamName: team?.name || 'Unknown Team',
        played: 0,
        won: 0,
        lost: 0,
        winPercentage: 0
      };
    }
    
    // Calculate player stats from frames
    for (const frame of frames) {
      if (!frame.winnerId) continue; // Skip frames without a result
      
      // Update home player stats
      if (stats[frame.homePlayerId]) {
        stats[frame.homePlayerId].played += 1;
        if (frame.winnerId === frame.homePlayerId) {
          stats[frame.homePlayerId].won += 1;
        } else {
          stats[frame.homePlayerId].lost += 1;
        }
      }
      
      // Update away player stats
      if (stats[frame.awayPlayerId]) {
        stats[frame.awayPlayerId].played += 1;
        if (frame.winnerId === frame.awayPlayerId) {
          stats[frame.awayPlayerId].won += 1;
        } else {
          stats[frame.awayPlayerId].lost += 1;
        }
      }
    }
    
    // Calculate win percentages and convert to array
    const playerStatsArray = Object.values(stats).map(stat => {
      const winPercentage = stat.played > 0 
        ? (stat.won / stat.played) * 100 
        : 0;
      
      return {
        ...stat,
        winPercentage: Math.round(winPercentage * 10) / 10 // Round to 1 decimal place
      };
    });
    
    // Sort by win percentage (highest first)
    playerStatsArray.sort((a, b) => {
      if (b.played === 0 && a.played === 0) return 0;
      if (b.played === 0) return -1;
      if (a.played === 0) return 1;
      return b.winPercentage - a.winPercentage;
    });
    
    setPlayerStats(playerStatsArray);
  };

  const handleLeagueChange = (e) => {
    setSelectedLeagueId(e.target.value);
  };

  const handleSeasonChange = (e) => {
    setSelectedSeasonId(e.target.value);
  };

  const handleTabChange = (event, newValue) => {
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
                  {leagues.map(league => (
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
                  {seasons.map(season => (
                    <MenuItem key={season.id} value={season.id}>
                      {season.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="standings tabs"
          >
            <Tab label="Team Standings" />
            <Tab label="Player Statistics" />
          </Tabs>
        </Box>
        
        {tabValue === 0 && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Team Standings
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Position</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell align="center">Played</TableCell>
                    <TableCell align="center">Won</TableCell>
                    <TableCell align="center">Lost</TableCell>
                    <TableCell align="center">Frames Won</TableCell>
                    <TableCell align="center">Frames Lost</TableCell>
                    <TableCell align="center">Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamStandings.map((standing, index) => (
                    <TableRow key={standing.teamId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{standing.teamName}</TableCell>
                      <TableCell align="center">{standing.played}</TableCell>
                      <TableCell align="center">{standing.won}</TableCell>
                      <TableCell align="center">{standing.lost}</TableCell>
                      <TableCell align="center">{standing.frameWon}</TableCell>
                      <TableCell align="center">{standing.frameLost}</TableCell>
                      <TableCell align="center">{standing.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
        
        {tabValue === 1 && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Player Statistics
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Player</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell align="center">Played</TableCell>
                    <TableCell align="center">Won</TableCell>
                    <TableCell align="center">Lost</TableCell>
                    <TableCell align="center">Win %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {playerStats.map((stat, index) => (
                    <TableRow key={stat.playerId}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{stat.playerName}</TableCell>
                      <TableCell>{stat.teamName}</TableCell>
                      <TableCell align="center">{stat.played}</TableCell>
                      <TableCell align="center">{stat.won}</TableCell>
                      <TableCell align="center">{stat.lost}</TableCell>
                      <TableCell align="center">{stat.played > 0 ? `${stat.winPercentage}%` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Standings;