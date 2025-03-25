// src/pages/public/Standings.tsx
import { useState, useEffect } from 'react';
import { SelectChangeEvent } from '@mui/material';
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
  CircularProgress,
  TextField,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

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
  getPlayers,
  getFramesForMatches,
  getPlayersForSeason,
  getFramesByPlayers
} from '../../services/databaseService';

import cacheService from '../../services/cacheService';

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
interface TeamPlayerStat {
  id: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  winPercentage: number;
  teamName: string;
}

const Standings = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([]);
  const [playerStats, setPlayerStats] = useState<TeamPlayerStat[]>([]);
  
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('All Teams');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calculatingStats, setCalculatingStats] = useState(false);

  // Calculate team standings whenever teams, matches, or frames change
  useEffect(() => {
    if (teams.length > 0) {
      console.log("Teams changed, calculating team standings");
      calculateTeamStandings();
    }
  }, [teams, matches, frames]);

  // Initial data loading
  useEffect(() => {
    fetchLeagues();
  }, []);

  // Fetch seasons when league changes
  useEffect(() => {
    if (selectedLeagueId) {
      fetchSeasons(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  // Fetch season data when season changes
  useEffect(() => {
    if (selectedSeasonId) {
      fetchSeasonData(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  // Add new useEffect to handle player data loading
  useEffect(() => {
    if (selectedSeasonId && tabValue === 1) {
      fetchPlayerData();
    }
  }, [selectedSeasonId, tabValue]);

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      // Try to get leagues from cache first
      let leaguesData = cacheService.getLeagues();
      if (!leaguesData) {
        leaguesData = await getLeagues();
        cacheService.setLeagues(leaguesData);
      }
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
      console.log("Fetching season data for seasonId:", seasonId);
      
      // Clear cache for this season's data to ensure fresh calculations
      cacheService.clearCache(`teams_${seasonId}`);
      cacheService.clearCache(`matches_${seasonId}`);
      cacheService.clearCache(`frames_${seasonId}`);
      cacheService.clearCache(`playersForSeason_${seasonId}`);
      cacheService.clearCache(`playerStats_${seasonId}_false`);
      cacheService.clearCache(`playerStats_${seasonId}_true`);
      
      // Try to get teams from cache first
      let teamsData = await getTeams(seasonId);
      cacheService.setTeams(seasonId, teamsData);
      console.log("Teams fetched:", teamsData);
      setTeams(teamsData);
      
      // Try to get matches from cache first
      let matchesData = await getMatches(seasonId);
      cacheService.setMatches(seasonId, matchesData);
      console.log("Matches fetched:", matchesData);
      setMatches(matchesData);
      
      // Only fetch frames for completed matches to reduce data load
      const completedMatches = matchesData.filter(match => match.status === 'completed');
      const completedMatchIds = completedMatches.map(match => match.id!);
      
      let allFrames: Frame[] = [];
      if (completedMatchIds.length > 0) {
        // Check if any frames are already in cache
        const cachedFramesMap = cacheService.getFramesForMatches(completedMatchIds);
        const cachedMatchIds = Object.keys(cachedFramesMap);
        const missingMatchIds = completedMatchIds.filter(id => !cachedMatchIds.includes(id));
        
        // Use cached frames
        if (cachedMatchIds.length > 0) {
          allFrames = Object.values(cachedFramesMap).flat();
        }
        
        // Fetch only the missing frames
        if (missingMatchIds.length > 0) {
          const fetchedFrames = await getFramesForMatches(missingMatchIds);
          
          // Cache the newly fetched frames
          const framesMap: Record<string, Frame[]> = {};
          fetchedFrames.forEach(frame => {
            if (!framesMap[frame.matchId]) {
              framesMap[frame.matchId] = [];
            }
            framesMap[frame.matchId].push(frame);
          });
          cacheService.setFramesForMatches(framesMap);
          
          // Add to our total frames
          allFrames = [...allFrames, ...fetchedFrames];
        }
      }
      
      console.log("All frames fetched:", allFrames);
      setFrames(allFrames);
      
      // Don't clear player data anymore, just fetch if needed
      if (tabValue === 1) {
        fetchPlayerData();
      }
      
    } catch (error) {
      console.error('Error fetching season data:', error);
      setError('Failed to fetch season data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamStandings = () => {
    console.log("Calculating team standings with teams:", teams);
    
    // Sort teams alphabetically by name
    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
    console.log("Teams sorted alphabetically:", sortedTeams);
    
    const standings: TeamStanding[] = sortedTeams.map(team => ({
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
      
      // Count frames using scores instead of winnerId
      const homeWins = matchFrames.filter(f => 
        f.homeScore !== undefined && 
        f.awayScore !== undefined && 
        f.homeScore > f.awayScore
      ).length;
      
      const awayWins = matchFrames.filter(f => 
        f.homeScore !== undefined && 
        f.awayScore !== undefined && 
        f.awayScore > f.homeScore
      ).length;
      
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
      if (bFrameDiff !== aFrameDiff) return bFrameDiff - aFrameDiff;
      // If frame difference is equal, sort alphabetically by team name
      return a.teamName.localeCompare(b.teamName);
    });
    
    console.log("Final sorted standings:", standings);
    setTeamStandings(standings);
  };

  const handleLeagueChange = (e: SelectChangeEvent) => {
    setSelectedLeagueId(e.target.value);
  };
  
  const handleSeasonChange = (e: SelectChangeEvent) => {
    setSelectedSeasonId(e.target.value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Load player data when switching to player statistics tab
    if (newValue === 1 && !loading) {
      // Only fetch player data if we haven't already
      if (playerStats.length === 0 && teams.length > 0) {
        fetchPlayerData();
      }
    }
  };
  
  // Replace fetchPlayerData with the dashboard's calculatePlayerStats
  const fetchPlayerData = async () => {
    if (!selectedSeasonId || teams.length === 0) return;
    
    setCalculatingStats(true);
    try {
      console.log("Fetching player data for player statistics...");
      
      // Use getPlayersForSeason which includes team information
      const seasonPlayers = await getPlayersForSeason(selectedSeasonId);
      console.log("All players fetched:", seasonPlayers.length);
      
      if (seasonPlayers.length === 0) {
        setPlayerStats([]);
        setCalculatingStats(false);
        return;
      }
      
      setPlayers(seasonPlayers);
      
      // Get player IDs
      const playerIds = seasonPlayers.map(player => player.id!);
      
      // Fetch all frames for all players in a single batch
      const framesByPlayer = await getFramesByPlayers(playerIds);
      
      // Calculate stats for each player
      const stats = seasonPlayers.map(player => {
        const playerFrames = framesByPlayer[player.id!] || [];
        
        // Filter frames by season
        const seasonFrames = playerFrames.filter(frame => frame.seasonId === selectedSeasonId);
        
        let wins = 0;
        let losses = 0;
        
        // Calculate stats
        seasonFrames.forEach(frame => {
          if (frame.homePlayerId === player.id && frame.homeScore! > frame.awayScore!) {
            wins++;
          } else if (frame.awayPlayerId === player.id && frame.awayScore! > frame.homeScore!) {
            wins++;
          } else if (frame.homeScore !== undefined && frame.awayScore !== undefined) {
            losses++;
          }
        });
        
        const played = wins + losses;
        const winPercentage = played > 0 ? Math.round((wins / played) * 100) : 0;
        
        return {
          id: player.id!,
          name: `${player.firstName} ${player.lastName}`,
          played,
          wins,
          losses,
          winPercentage,
          teamName: player.teamName || 'Unknown Team'
        };
      });
      
      // Sort by win percentage (highest first)
      stats.sort((a, b) => {
        // Primary sort by win percentage
        if (b.winPercentage !== a.winPercentage) {
          return b.winPercentage - a.winPercentage;
        }
        
        // Secondary sort by games played
        if (b.played !== a.played) {
          return b.played - a.played;
        }
        
        // Tertiary sort by name
        return a.name.localeCompare(b.name);
      });
      
      setPlayerStats(stats);
    } catch (error) {
      console.error("Error calculating player stats:", error);
    } finally {
      setCalculatingStats(false);
    }
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
                  {teamStandings.length > 0 ? (
                    teamStandings.map((standing: TeamStanding, index: number) => (
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No teams to display. {loading ? 'Loading...' : ''}
                      </TableCell>
                    </TableRow>
                  )}
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
            
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Team</InputLabel>
                  <Select
                    value={selectedTeamFilter}
                    onChange={(e) => setSelectedTeamFilter(e.target.value)}
                    label="Team"
                  >
                    <MenuItem value="All Teams">All Teams</MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.name}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <TableContainer component={Paper}>
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
                  {playerStats
                    .filter(stat => 
                      (selectedTeamFilter === 'All Teams' || stat.teamName === selectedTeamFilter) &&
                      stat.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((stat, index) => (
                      <TableRow key={stat.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{stat.name}</TableCell>
                        <TableCell>{stat.teamName}</TableCell>
                        <TableCell align="center">{stat.played}</TableCell>
                        <TableCell align="center">{stat.wins}</TableCell>
                        <TableCell align="center">{stat.losses}</TableCell>
                        <TableCell align="center">{stat.played > 0 ? `${stat.winPercentage}%` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  {playerStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
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
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Standings;