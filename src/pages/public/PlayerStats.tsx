// src/pages/public/PlayerStats.tsx
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
  Frame,
  Player,
  PlayerWithTeam,
  getLeagues,
  getSeasons,
  getTeams,
  getMatches,
  getFrames,
  getPlayersForSeason
} from '../../services/databaseService';

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

const PlayerStats = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
  
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [filteredPlayerStats, setFilteredPlayerStats] = useState<PlayerStat[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
  
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
    if (teams && players && players.length > 0) {
      calculatePlayerStats();
    }
  }, [teams, matches, frames, players]);

  useEffect(() => {
    // Apply filters when playerStats, selectedTeamId, or searchTerm changes
    applyFilters();
  }, [playerStats, selectedTeamId, searchTerm]);

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
        // Find active season or use most recent one
        const activeSeason = seasonsData.find(s => s.status === 'active');
        setSelectedSeasonId(activeSeason?.id || seasonsData[0].id!);
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
        if (match.id) {
          const matchFrames = await getFrames(match.id);
          allFrames.push(...matchFrames);
        }
      }
      setFrames(allFrames);
      
      // Fetch all players for the season
      const seasonPlayers = await getPlayersForSeason(seasonId);
      setPlayers(seasonPlayers);
    } catch (error) {
      console.error('Error fetching season data:', error);
      setError('Failed to fetch season data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePlayerStats = () => {
    if (!teams || !players || !matches || !frames) {
      console.warn('Missing required data for calculating player stats');
      return;
    }

    // First, let's track which teams each player has played for
    const playerTeamStats: Record<string, Record<string, PlayerStat>> = {};
    
    // Initialize stats for each player's registered team
    for (const player of players) {
      if (!player?.id) {
        console.warn('Found player without ID:', player);
        continue;
      }
      
      const playerId = player.id;
      
      // Initialize the player's stats map if it doesn't exist
      if (!playerTeamStats[playerId]) {
        playerTeamStats[playerId] = {};
      }
      
      // Initialize stats for their registered team
      if (player.teamId && player.teamName) {
        playerTeamStats[playerId][player.teamId] = {
          playerId,
          playerName: `${player.firstName} ${player.lastName}`,
          teamName: player.teamName,
          played: 0,
          won: 0,
          lost: 0,
          winPercentage: 0,
          opponents: {}
        };
      }
    }
    
    // Calculate player stats from frames
    for (const frame of frames) {
      if (!frame?.winnerId || !frame?.homePlayerId || !frame?.awayPlayerId || !frame?.matchId) {
        console.warn('Invalid frame data:', frame);
        continue;
      }
      
      // Find the match for this frame to get context (home/away teams)
      const match = matches.find(m => m?.id === frame.matchId);
      if (!match) {
        console.warn('Match not found for frame:', frame);
        continue;
      }
      
      // Get player info
      const homePlayer = players.find(p => p.id === frame.homePlayerId);
      const awayPlayer = players.find(p => p.id === frame.awayPlayerId);
      
      if (!homePlayer || !awayPlayer) {
        console.warn('Player not found for frame:', frame);
        continue;
      }
      
      // Initialize stats for this team if the player hasn't played for it yet
      // For home player
      if (!playerTeamStats[frame.homePlayerId][match.homeTeamId]) {
        const homeTeam = teams.find(t => t.id === match.homeTeamId);
        if (homeTeam) {
          playerTeamStats[frame.homePlayerId][match.homeTeamId] = {
            playerId: frame.homePlayerId,
            playerName: `${homePlayer.firstName} ${homePlayer.lastName}`,
            teamName: homeTeam.name,
            played: 0,
            won: 0,
            lost: 0,
            winPercentage: 0,
            opponents: {}
          };
        }
      }
      
      // For away player
      if (!playerTeamStats[frame.awayPlayerId][match.awayTeamId]) {
        const awayTeam = teams.find(t => t.id === match.awayTeamId);
        if (awayTeam) {
          playerTeamStats[frame.awayPlayerId][match.awayTeamId] = {
            playerId: frame.awayPlayerId,
            playerName: `${awayPlayer.firstName} ${awayPlayer.lastName}`,
            teamName: awayTeam.name,
            played: 0,
            won: 0,
            lost: 0,
            winPercentage: 0,
            opponents: {}
          };
        }
      }
      
      // Update home player stats
      const homePlayerTeamStats = playerTeamStats[frame.homePlayerId][match.homeTeamId];
      if (homePlayerTeamStats) {
        homePlayerTeamStats.played += 1;
        
        if (frame.winnerId === frame.homePlayerId) {
          homePlayerTeamStats.won += 1;
        } else {
          homePlayerTeamStats.lost += 1;
        }
        
        // Track opponent data
        if (!homePlayerTeamStats.opponents[frame.awayPlayerId]) {
          homePlayerTeamStats.opponents[frame.awayPlayerId] = {
            opponentName: `${awayPlayer.firstName} ${awayPlayer.lastName}`,
            played: 0,
            won: 0,
            lost: 0
          };
        }
        
        homePlayerTeamStats.opponents[frame.awayPlayerId].played += 1;
        if (frame.winnerId === frame.homePlayerId) {
          homePlayerTeamStats.opponents[frame.awayPlayerId].won += 1;
        } else {
          homePlayerTeamStats.opponents[frame.awayPlayerId].lost += 1;
        }
      }
      
      // Update away player stats
      const awayPlayerTeamStats = playerTeamStats[frame.awayPlayerId][match.awayTeamId];
      if (awayPlayerTeamStats) {
        awayPlayerTeamStats.played += 1;
        
        if (frame.winnerId === frame.awayPlayerId) {
          awayPlayerTeamStats.won += 1;
        } else {
          awayPlayerTeamStats.lost += 1;
        }
        
        // Track opponent data
        if (!awayPlayerTeamStats.opponents[frame.homePlayerId]) {
          awayPlayerTeamStats.opponents[frame.homePlayerId] = {
            opponentName: `${homePlayer.firstName} ${homePlayer.lastName}`,
            played: 0,
            won: 0,
            lost: 0
          };
        }
        
        awayPlayerTeamStats.opponents[frame.homePlayerId].played += 1;
        if (frame.winnerId === frame.awayPlayerId) {
          awayPlayerTeamStats.opponents[frame.homePlayerId].won += 1;
        } else {
          awayPlayerTeamStats.opponents[frame.homePlayerId].lost += 1;
        }
      }
    }
    
    // Flatten the stats and calculate win percentages
    const playerStatsArray: PlayerStat[] = [];
    
    Object.values(playerTeamStats).forEach(teamStats => {
      Object.values(teamStats).forEach(stat => {
        // Split the player name into first name and last name
        const [firstName, ...lastNameParts] = stat.playerName.split(' ');
        const lastName = lastNameParts.join(' ');
        
        playerStatsArray.push({
          ...stat,
          winPercentage: stat.played > 0 
            ? Math.round((stat.won / stat.played) * 100 * 10) / 10
            : 0,
          // Add these properties for sorting
          _firstName: firstName,
          _lastName: lastName
        });
      });
    });
    
    // Sort by win percentage (descending), then surname (ascending), then firstname (ascending)
    playerStatsArray.sort((a, b) => {
      // First sort by win percentage (descending)
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      
      // Then sort by surname (ascending)
      const lastNameCompare = (a._lastName || '').localeCompare(b._lastName || '');
      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }
      
      // Finally sort by firstname (ascending)
      return (a._firstName || '').localeCompare(b._firstName || '');
    });
    
    // Remove the temporary sorting properties before setting state
    const cleanedStats = playerStatsArray.map(({ _firstName, _lastName, ...stat }) => stat);
    
    setPlayerStats(cleanedStats);
  };

  const applyFilters = () => {
    let filtered = [...playerStats];
    
    // Filter by team if not "all"
    if (selectedTeamId !== 'all') {
      filtered = filtered.filter(player => {
        const playerData = players.find(p => p.id === player.playerId);
        return playerData?.teamId === selectedTeamId;
      });
    }
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(player => 
        player.playerName.toLowerCase().includes(term) || 
        player.teamName.toLowerCase().includes(term)
      );
    }
    
    setFilteredPlayerStats(filtered);
  };

  const handleLeagueChange = (e: SelectChangeEvent) => {
    setSelectedLeagueId(e.target.value);
  };
  
  const handleSeasonChange = (e: SelectChangeEvent) => {
    setSelectedSeasonId(e.target.value);
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
  
  const handlePlayerSelect = (player: PlayerStat) => {
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
                  value={selectedSeasonId}
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
                      key={stat.playerId}
                      hover
                      onClick={() => handlePlayerSelect(stat)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{stat.playerName}</TableCell>
                      <TableCell>{stat.teamName}</TableCell>
                      <TableCell align="center">{stat.played}</TableCell>
                      <TableCell align="center">{stat.won}</TableCell>
                      <TableCell align="center">{stat.lost}</TableCell>
                      <TableCell align="center">{stat.played > 0 ? `${stat.winPercentage}%` : '-'}</TableCell>
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
                {selectedPlayer.playerName}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                {selectedPlayer.teamName}
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPlayer.played}</Typography>
                    <Typography variant="body2" color="text.secondary">Matches Played</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPlayer.won}</Typography>
                    <Typography variant="body2" color="text.secondary">Wins</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPlayer.lost}</Typography>
                    <Typography variant="body2" color="text.secondary">Losses</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedPlayer.played > 0 ? `${selectedPlayer.winPercentage}%` : '-'}</Typography>
                    <Typography variant="body2" color="text.secondary">Win Percentage</Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Head-to-Head Record
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Opponent</TableCell>
                      <TableCell align="center">Played</TableCell>
                      <TableCell align="center">Won</TableCell>
                      <TableCell align="center">Lost</TableCell>
                      <TableCell align="center">Win %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(selectedPlayer.opponents).map(([opponentId, data]) => {
                      const winPercentage = data.played > 0 
                        ? Math.round((data.won / data.played) * 100 * 10) / 10
                        : 0;
                      
                      return (
                        <TableRow key={opponentId}>
                          <TableCell>{data.opponentName}</TableCell>
                          <TableCell align="center">{data.played}</TableCell>
                          <TableCell align="center">{data.won}</TableCell>
                          <TableCell align="center">{data.lost}</TableCell>
                          <TableCell align="center">{data.played > 0 ? `${winPercentage}%` : '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                    {Object.keys(selectedPlayer.opponents).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No opponent data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )
        )}
      </Box>
    </Container>
  );
};

export default PlayerStats;