// src/pages/public/PlayerStats.tsx
import { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Tabs,
  Tab,
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
  PlayerWithTeam,
  getLeagues,
  getSeasons,
  getTeams,
  getMatches,
  getPlayersForSeason,
  getAllPlayers
} from '../../services/databaseService';
import cacheService from '../../services/cacheService';

// Interface for player statistics
interface PlayerStat {
  playerId: string;
  playerName: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  winPercentage: number;
  opponents: {
    [opponentId: string]: {
      opponentName: string;
      played: number;
      won: number;
      lost: number;
    }
  };
  // Temporary properties for sorting
  _firstName?: string;
  _lastName?: string;
}

interface SimplePlayerStat {
  id: string;
  name: string;
  wins: number;
  losses: number;
  winPercentage: number;
  numMatches: number;
  teamId?: string;
  teamName?: string;
}

const PlayerStats = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
  const [showIgnoredPlayers, setShowIgnoredPlayers] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [playerStats, setPlayerStats] = useState<SimplePlayerStat[]>([]);
  const [filteredPlayerStats, setFilteredPlayerStats] = useState<SimplePlayerStat[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<SimplePlayerStat | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);

  // Fetch leagues
  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const leaguesData = await getLeagues();
      // Sort leagues alphabetically by name
      const sortedLeagues = [...leaguesData].sort((a, b) => a.name.localeCompare(b.name));
      setLeagues(sortedLeagues);
      
      if (sortedLeagues.length > 0) {
        setSelectedLeagueId(sortedLeagues[0].id!);
      }
    } catch (error) {
      console.error('Error fetching leagues:', error);
      setError('Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };

  // Fetch seasons for a league
  const fetchSeasons = async (leagueId: string) => {
    setLoading(true);
    try {
      const seasonsData = await getSeasons(leagueId);
      // Sort seasons alphabetically by name
      const sortedSeasons = [...seasonsData].sort((a, b) => a.name.localeCompare(b.name));
      setSeasons(sortedSeasons);
      
      if (sortedSeasons.length > 0) {
        // Find active season or use most recent one
        const activeSeason = sortedSeasons.find(s => s.status === 'active');
        setSelectedSeason(activeSeason?.id || sortedSeasons[0].id!);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      setError('Failed to fetch seasons');
    } finally {
      setLoading(false);
    }
  };

  // Fetch teams for a season
  const fetchTeams = async (seasonId: string) => {
    setLoading(true);
    try {
      // Only fetch teams as they're needed for team name lookups
      const cachedTeams = cacheService.getTeams(seasonId);
      if (cachedTeams) {
        console.log('Using cached teams data for season:', seasonId, cachedTeams.length, 'teams');
        // Sort teams alphabetically by name
        const sortedTeams = [...cachedTeams].sort((a, b) => a.name.localeCompare(b.name));
        setTeams(sortedTeams);
      } else {
        console.log('Fetching teams data for season:', seasonId);
        const teamsData = await getTeams(seasonId);
        console.log('Retrieved', teamsData.length, 'teams');
        cacheService.setTeams(seasonId, teamsData);
        // Sort teams alphabetically by name
        const sortedTeams = [...teamsData].sort((a, b) => a.name.localeCompare(b.name));
        setTeams(sortedTeams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  const calculatePlayerStats = useCallback(async (season: string, isIgnoredPlayers: boolean) => {
    // Prevent duplicate calculations if already in progress
    if (calculating) {
      console.log('Calculation already in progress, skipping...');
      return;
    }

    setCalculating(true);
    setLoading(true);
    console.log('Calculating player stats for season:', season);
    
    try {
      // Get cached stats if available
      const cachedStats = cacheService.getPlayerStatsBySeason(season, isIgnoredPlayers);
      if (cachedStats && cachedStats.length > 0) {
        console.log('Using cached player stats');
        setPlayerStats(cachedStats);
        setCalculating(false);
        setLoading(false);
        return;
      }

      // Fetch teams if we don't have them yet
      let teamsData = teams;
      if (teams.length === 0) {
        console.log('Fetching teams for player stats calculation');
        teamsData = await getTeams(season);
        setTeams(teamsData);
      }

      // Get a map of teams for quick lookup
      const teamsById = new Map(teamsData.map(team => [team.id, team]));

      // Fetch players with team information
      console.log('Fetching players with team information');
      const playersWithTeam = await getPlayersForSeason(season);
      
      if (playersWithTeam.length === 0) {
        console.log('No players found for this season');
        setPlayerStats([]);
        setCalculating(false);
        setLoading(false);
        return;
      }
      
      // Log team info for debugging
      console.log('DEBUG - Players fetched:', playersWithTeam.length);
      console.log('DEBUG - Players without team info:', 
        playersWithTeam.filter(p => !p.teamId).map(p => `${p.firstName} ${p.lastName}`).join(', '));
      
      // Filter ignored players
      const filteredPlayers = isIgnoredPlayers
        ? playersWithTeam
        : playersWithTeam.filter(player => !player.ignored);

      if (filteredPlayers.length === 0) {
        console.log('No players found after filtering');
        setPlayerStats([]);
        setCalculating(false);
        setLoading(false);
        return;
      }

      const playerIds = filteredPlayers.map(player => player.id!);
      console.log('Fetching frames for', playerIds.length, 'players');
      
      // Fetch all matches for the season
      let seasonMatches = cacheService.getMatches(season);
      if (!seasonMatches) {
        console.log('Fetching matches for player stats calculation');
        seasonMatches = await getMatches(season);
        cacheService.setMatches(season, seasonMatches);
      }
      
      // Create a map for faster player lookup
      const playersById = new Map(filteredPlayers.map(p => [p.id, p]));

      // Initialize stats object
      const stats: Record<string, { 
        wins: number; 
        losses: number; 
        numMatches: number;
        matchIds: Set<string>; // Track unique matches played
      }> = {};
      
      playerIds.forEach(id => {
        if (id) { // Ensure id is not undefined
          stats[id] = { wins: 0, losses: 0, numMatches: 0, matchIds: new Set() };
        }
      });

      // Iterate through completed matches and their frames
      seasonMatches
        .filter(match => match.status === 'completed')
        .forEach(match => {
          (match.frames || []).forEach(frame => {
            const homePlayerId = frame.homePlayerId;
            const awayPlayerId = frame.awayPlayerId;
            const winnerPlayerId = frame.winnerPlayerId;

            // Process home player if they are in our filtered list
            if (homePlayerId && stats[homePlayerId]) {
              if (!stats[homePlayerId].matchIds.has(match.id!)) {
                stats[homePlayerId].numMatches += 1;
                stats[homePlayerId].matchIds.add(match.id!);
              }
              if (winnerPlayerId === homePlayerId) {
                stats[homePlayerId].wins += 1;
              } else if (winnerPlayerId) { // Only count loss if there was a winner
                stats[homePlayerId].losses += 1;
              }
            }

            // Process away player if they are in our filtered list
            if (awayPlayerId && stats[awayPlayerId]) {
              if (!stats[awayPlayerId].matchIds.has(match.id!)) {
                stats[awayPlayerId].numMatches += 1;
                stats[awayPlayerId].matchIds.add(match.id!);
              }
              if (winnerPlayerId === awayPlayerId) {
                stats[awayPlayerId].wins += 1;
              } else if (winnerPlayerId) { // Only count loss if there was a winner
                stats[awayPlayerId].losses += 1;
              }
            }
          });
        });

      // Create the final stats array
      const finalStats: SimplePlayerStat[] = playerIds
        .map(playerId => {
          const player = playersById.get(playerId!);
          const playerStat = stats[playerId!];
          // If player or stats don't exist, return null early
          if (!player || !playerStat) return null;
          
          const played = playerStat.wins + playerStat.losses;
          // Avoid division by zero if played is 0
          const winPercentage = played > 0 ? Math.round((playerStat.wins / played) * 100) : 0;
          
          // Construct the stat object
          const statResult: SimplePlayerStat = {
            id: playerId!,
            name: `${player.firstName} ${player.lastName}`,
            wins: playerStat.wins,
            losses: playerStat.losses,
            winPercentage,
            numMatches: playerStat.numMatches,
            teamId: player.teamId,
            teamName: player.teamName || 'Unknown Team'
          };
          return statResult;
        })
        // Filter out null values AND players with no frames played
        .filter((stat): stat is SimplePlayerStat => stat !== null)
        // Sort the valid stats
        .sort((a, b) => { 
          // Primary sort by win percentage (desc)
          if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
          // Secondary sort by wins (desc)
          if (b.wins !== a.wins) return b.wins - a.wins;
          // Tertiary sort by matches played (desc)
          if (b.numMatches !== a.numMatches) return b.numMatches - a.numMatches;
          // Quaternary sort by name (asc)
          return a.name.localeCompare(b.name);
        });

      setPlayerStats(finalStats);
      cacheService.setPlayerStatsBySeason(season, isIgnoredPlayers, finalStats);
      console.log('Player stats calculation complete.', finalStats.length, 'players processed.');
      
    } catch (error) {
      console.error('Error calculating player stats:', error);
      setError('Failed to calculate player statistics');
    } finally {
      setCalculating(false);
      setLoading(false);
    }
  }, [calculating]);

  // Apply filters to player stats
  const applyFilters = useCallback(() => {
    if (!playerStats.length) {
      console.log('No player stats to filter');
      return [];
    }
    
    const filtered = playerStats.filter(stat => {
      // Team filter - if selectedTeamId is 'all', don't filter by team
      if (selectedTeamId !== 'all') {
        // Find the team by ID
        const selectedTeam = teams.find(team => team.id === selectedTeamId);
        if (selectedTeam) {
          // Compare by team name since the player stats may not have teamId
          return stat.teamName === selectedTeam.name;
        }
      }
      
      // Search filter
      if (searchTerm && !stat.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    console.log('Filtered from', playerStats.length, 'to', filtered.length, 'players');
    return filtered;
  }, [playerStats, selectedTeamId, searchTerm, teams]);

  // Initial fetch of leagues
  useEffect(() => {
    fetchLeagues();
  }, []);

  // Fetch seasons when league changes
  useEffect(() => {
    if (selectedLeagueId) {
      fetchSeasons(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  // Fetch teams when season changes
  useEffect(() => {
    if (selectedSeason) {
      fetchTeams(selectedSeason);
    }
  }, [selectedSeason]);

  // Calculate stats when season, teams, or showIgnoredPlayers changes
  useEffect(() => {
    if (selectedSeason && teams.length > 0 && !calculating) {
      console.log('Triggering stats calculation due to dependency change');
      calculatePlayerStats(selectedSeason, showIgnoredPlayers);
    }
  }, [selectedSeason, teams.length, showIgnoredPlayers]);

  // Apply filters when dependencies change
  useEffect(() => {
    console.log('Applying filters to player stats');
    const filtered = applyFilters();
    setFilteredPlayerStats(filtered);
  }, [playerStats, selectedTeamId, searchTerm, applyFilters]);

  const handleLeagueChange = (e: SelectChangeEvent) => {
    setSelectedLeagueId(e.target.value);
  };
  
  const handleSeasonChange = (e: SelectChangeEvent) => {
    setSelectedSeason(e.target.value);
  };
  
  const handleTeamChange = (e: SelectChangeEvent) => {
    setSelectedTeamId(e.target.value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Reset selected player when going back to main stats
    if (newValue === 0) {
      setSelectedPlayer(null);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handlePlayerSelect = (player: SimplePlayerStat) => {
    setSelectedPlayer(player);
    setTabValue(1); // Switch to player detail tab
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Player Statistics
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
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
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="season-select-label">Season</InputLabel>
                <Select
                  labelId="season-select-label"
                  value={selectedSeason}
                  onChange={handleSeasonChange}
                  label="Season"
                  disabled={seasons.length === 0}
                >
                  {seasons.map(season => (
                    <MenuItem key={season.id} value={season.id}>
                      {season.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="team-select-label">Team</InputLabel>
                <Select
                  labelId="team-select-label"
                  value={selectedTeamId}
                  onChange={handleTeamChange}
                  label="Team"
                  disabled={teams.length === 0}
                >
                  <MenuItem value="all">All Teams</MenuItem>
                  {teams.map(team => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
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
            aria-label="player stats tabs"
          >
            <Tab label="Player Rankings" />
            <Tab label="Player Details" disabled={!selectedPlayer} />
          </Tabs>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : tabValue === 0 ? (
          // Player Rankings Tab
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Search players..."
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
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
                  {filteredPlayerStats.map((stat, index) => (
                    <TableRow 
                      key={stat.id}
                      hover
                      onClick={() => handlePlayerSelect(stat)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{stat.name}</TableCell>
                      <TableCell>{stat.teamName}</TableCell>
                      <TableCell align="center">{stat.numMatches}</TableCell>
                      <TableCell align="center">{stat.wins}</TableCell>
                      <TableCell align="center">{stat.losses}</TableCell>
                      <TableCell align="center">{stat.numMatches > 0 ? `${stat.winPercentage.toFixed(1)}%` : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {filteredPlayerStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No players match your filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          // Player Details Tab
          selectedPlayer && (
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                {selectedPlayer.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {selectedPlayer.teamName || 'Team Unknown'}
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPlayer.numMatches}</Typography>
                    <Typography variant="body2" color="text.secondary">Matches Played</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPlayer.wins}</Typography>
                    <Typography variant="body2" color="text.secondary">Wins</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPlayer.losses}</Typography>
                    <Typography variant="body2" color="text.secondary">Losses</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPlayer.winPercentage.toFixed(1)}%</Typography>
                    <Typography variant="body2" color="text.secondary">Win Percentage</Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Box mt={4}>
                <Typography variant="h6" gutterBottom>
                  Performance Details
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Statistic</TableCell>
                        <TableCell align="right">Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Total Matches</TableCell>
                        <TableCell align="right">{selectedPlayer.numMatches}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Wins</TableCell>
                        <TableCell align="right">{selectedPlayer.wins}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Losses</TableCell>
                        <TableCell align="right">{selectedPlayer.losses}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Win Percentage</TableCell>
                        <TableCell align="right">{selectedPlayer.winPercentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Paper>
          )
        )}
      </Box>
    </Container>
  );
};

export default PlayerStats;