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
  Player,
  getLeagues,
  getSeasons,
  getTeams,
  getMatches,
  getPlayers,
  getPlayersForSeason,
  PlayerWithTeam,
} from '../../services/databaseService';

import cacheService from '../../services/cacheService';

// Interface for standings table data
interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  draws: number;
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
  const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
  
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

  // Calculate team standings whenever teams or matches change
  useEffect(() => {
    if (teams.length > 0 && matches.length > 0) {
      console.log("Teams or matches changed, calculating team standings");
      calculateTeamStandings();
      // Also recalculate player stats if the tab is active
      if (tabValue === 1 && players.length > 0) {
        calculatePlayerStats();
      }
    }
  }, [teams, matches, players, tabValue]);

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
      
      // --- Removed separate frame fetching logic ---
      // Frame data is available in matchesData via match.frames
      // No need to fetch or cache frames separately.
      // setFrames([]); // State removed
      // --- End of removed frame fetching logic ---
      
      // Fetch player data if the player stats tab is active
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
    
    const completedMatches = matches.filter(match => match.status === 'completed');
    
    // Sort teams alphabetically by name
    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
    console.log("Teams sorted alphabetically:", sortedTeams);
    
    const standings: TeamStanding[] = sortedTeams.map(team => ({
      teamId: team.id!,
      teamName: team.name,
      played: 0,
      won: 0,
      lost: 0,
      draws: 0,
      frameWon: 0,
      frameLost: 0,
      points: 0
    }));
    
    // Process each completed match
    completedMatches.forEach(match => {
      const homeTeamId = match.homeTeamId;
      const awayTeamId = match.awayTeamId;
      const homeTeamIndex = standings.findIndex(s => s.teamId === homeTeamId);
      const awayTeamIndex = standings.findIndex(s => s.teamId === awayTeamId);

      // Ensure both teams exist in standings
      if (homeTeamIndex === -1 || awayTeamIndex === -1) {
        console.warn(`Skipping match ${match.id}, team not found in standings.`);
        return;
      }
      
      standings[homeTeamIndex].played += 1;
      standings[awayTeamIndex].played += 1;

      // Calculate scores from embedded frames
      let homeScore = 0;
      let awayScore = 0;
      (match.frames || []).forEach(frame => {
        if (frame.winnerPlayerId === frame.homePlayerId) {
          homeScore++;
          standings[homeTeamIndex].frameWon += 1;
          standings[awayTeamIndex].frameLost += 1;
        } else if (frame.winnerPlayerId === frame.awayPlayerId) {
          awayScore++;
          standings[awayTeamIndex].frameWon += 1;
          standings[homeTeamIndex].frameLost += 1;
        }
      });

      // Assign points based on match score
      if (homeScore > awayScore) {
        standings[homeTeamIndex].won += 1;
        standings[awayTeamIndex].lost += 1;
        standings[homeTeamIndex].points += 2; // 2 points for a win
      } else if (awayScore > homeScore) {
        standings[awayTeamIndex].won += 1;
        standings[homeTeamIndex].lost += 1;
        standings[awayTeamIndex].points += 2;
      } else if (homeScore > 0 || awayScore > 0) { // Draw case (only if frames played)
        standings[homeTeamIndex].points += 1;
        standings[awayTeamIndex].points += 1;
        standings[homeTeamIndex].draws += 1;
        standings[awayTeamIndex].draws += 1;
      }
    });

    // Sort standings by points (desc), then frame difference (desc), then name (asc)
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
  
  const fetchPlayerData = async () => {
    if (!selectedSeasonId) return;
    setCalculatingStats(true);
    console.log("Fetching player data for season:", selectedSeasonId);
    try {
      // Try getting players from cache
      let playersData = cacheService.getPlayersForSeason(selectedSeasonId);
      if (!playersData) {
        // Fetch players specifically for the season
        playersData = await getPlayersForSeason(selectedSeasonId);
        // Cache the result (which should be PlayerWithTeam[])
        cacheService.setPlayersForSeason(selectedSeasonId, playersData);
      }
      console.log("Players fetched:", playersData);
      // Set the state with the correct type
      setPlayers(playersData || []); 
      
      // Player stats will be calculated in the useEffect based on fetched players and matches
      
    } catch (error) {
      console.error('Error fetching player data:', error);
      setError('Failed to fetch player data');
    } finally {
      setCalculatingStats(false);
    }
  };

  // Function to calculate player statistics
  const calculatePlayerStats = () => {
    if (!players.length || !matches.length || !teams.length) {
      setPlayerStats([]);
      return;
    }
    
    console.log("Calculating player stats...");
    setCalculatingStats(true);
    
    // Create a map to track player-team combinations
    const playerTeamStats: { [key: string]: TeamPlayerStat } = {};
    
    // Create a map of team IDs to team names for quick lookup
    const teamNameMap: { [teamId: string]: string } = {};
    teams.forEach(team => {
      if (team.id) {
        teamNameMap[team.id] = team.name;
      }
    });
    
    console.log("Team name map:", teamNameMap);
    
    // Process each match to build player-team statistics
    matches.forEach(match => {
      if (!match.frames || match.frames.length === 0) return;

      // Get team names from the team map
      const homeTeamName = teamNameMap[match.homeTeamId] || 'Unknown Team';
      const awayTeamName = teamNameMap[match.awayTeamId] || 'Unknown Team';
      
      console.log(`Processing match ${match.id}: ${homeTeamName} vs ${awayTeamName}`);

      match.frames.forEach(frame => {
        const homePlayerId = frame.homePlayerId;
        const awayPlayerId = frame.awayPlayerId;

        // Process home player
        if (homePlayerId && frame.isComplete) {
          const playerKey = `${homePlayerId}-${homeTeamName}`;
          if (!playerTeamStats[playerKey]) {
            // Find the player to get their name
            const player = players.find(p => p.id === homePlayerId);
            playerTeamStats[playerKey] = {
              id: playerKey,
              name: player ? `${player.firstName} ${player.lastName}` : 'Unknown Player',
              teamName: homeTeamName,
              played: 0,
              wins: 0,
              losses: 0,
              winPercentage: 0
            };
          }
          
          playerTeamStats[playerKey].played++;
          if (frame.winnerPlayerId === homePlayerId) {
            playerTeamStats[playerKey].wins++;
          } else {
            playerTeamStats[playerKey].losses++;
          }
        }

        // Process away player
        if (awayPlayerId && frame.isComplete) {
          const playerKey = `${awayPlayerId}-${awayTeamName}`;
          if (!playerTeamStats[playerKey]) {
            // Find the player to get their name
            const player = players.find(p => p.id === awayPlayerId);
            playerTeamStats[playerKey] = {
              id: playerKey,
              name: player ? `${player.firstName} ${player.lastName}` : 'Unknown Player',
              teamName: awayTeamName,
              played: 0,
              wins: 0,
              losses: 0,
              winPercentage: 0
            };
          }
          
          playerTeamStats[playerKey].played++;
          if (frame.winnerPlayerId === awayPlayerId) {
            playerTeamStats[playerKey].wins++;
          } else {
            playerTeamStats[playerKey].losses++;
          }
        }
      });
    });

    // Calculate win percentages and filter out entries with no games played
    const playerStatsArray = Object.values(playerTeamStats)
      .map(stat => {
        stat.winPercentage = stat.played > 0 ? Math.round((stat.wins / stat.played) * 10000) / 100 : 0;
        return stat;
      })
      .filter(stat => stat.played > 0)
      .sort((a, b) => b.winPercentage - a.winPercentage);

    setPlayerStats(playerStatsArray);
    setCalculatingStats(false);
    console.log("Player stats calculated:", playerStatsArray);
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
                    <TableCell align="center">Draws</TableCell>
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
                        <TableCell align="center">{standing.draws}</TableCell>
                        <TableCell align="center">{standing.frameWon}</TableCell>
                        <TableCell align="center">{standing.frameLost}</TableCell>
                        <TableCell align="center">{standing.points}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
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