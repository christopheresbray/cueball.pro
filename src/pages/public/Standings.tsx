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
  getPlayers,
  getFramesForMatches,
  getPlayersForSeason
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
interface PlayerStat {
  playerId: string;
  playerName: string;
  teamId: string;
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
  
  const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      
      // Try to get teams from cache first
      let teamsData = cacheService.getTeams(seasonId);
      if (!teamsData) {
        teamsData = await getTeams(seasonId);
        cacheService.setTeams(seasonId, teamsData);
      }
      console.log("Teams fetched:", teamsData);
      setTeams(teamsData);
      
      // Try to get matches from cache first
      let matchesData = cacheService.getMatches(seasonId);
      if (!matchesData) {
        matchesData = await getMatches(seasonId);
        cacheService.setMatches(seasonId, matchesData);
      }
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
      
      // Don't fetch player data here automatically
      // Instead, we'll load players only when needed (when the player tab is selected)
      if (tabValue === 1) {
        // If already on player stats tab, fetch player data
        fetchPlayerData();
      } else {
        // Otherwise, just clear any existing player data to free up memory
        setPlayers([]);
        setPlayerStats([]);
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
      if (bFrameDiff !== aFrameDiff) return bFrameDiff - aFrameDiff;
      // If frame difference is equal, sort alphabetically by team name
      return a.teamName.localeCompare(b.teamName);
    });
    
    console.log("Final sorted standings:", standings);
    setTeamStandings(standings);
  };

  const calculatePlayerStats = () => {
    // Now just a stub, as we calculate player stats directly in fetchPlayerData
    console.log("calculatePlayerStats is now a no-op, stats are calculated in fetchPlayerData");
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
  
  // Add a separate function to fetch player data
  const fetchPlayerData = async () => {
    if (!selectedSeasonId || teams.length === 0) return;
    
    setLoading(true);
    try {
      console.log("Fetching player data for player statistics...");
      
      // Use getPlayersForSeason which includes team information
      const seasonPlayers = await getPlayersForSeason(selectedSeasonId);
      console.log("All players fetched:", seasonPlayers.length);
      
      if (seasonPlayers.length === 0) {
        setPlayerStats([]);
        setLoading(false);
        return;
      }
      
      setPlayers(seasonPlayers);
      
      // Calculate player stats with team information already included
      const stats: Record<string, PlayerStat> = {};
      
      // Initialize player stats for each player
      seasonPlayers.forEach(player => {
        stats[player.id!] = {
          playerId: player.id!,
          playerName: `${player.firstName} ${player.lastName}`,
          teamId: player.teamId || '',
          teamName: player.teamName || 'Unknown Team',
          played: 0,
          won: 0,
          lost: 0,
          winPercentage: 0
        };
      });
      
      // Calculate player stats from frames
      frames.forEach(frame => {
        // Skip frames without winners
        if (!frame.winnerId) return;
        
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
      });
      
      // Calculate win percentages and convert to array
      const playerStatsArray = Object.values(stats)
        .map(stat => {
          const winPercentage = stat.played > 0 
            ? (stat.won / stat.played) * 100 
            : 0;
          
          return {
            ...stat,
            winPercentage: Math.round(winPercentage)
          };
        });
      
      // Sort by win percentage (highest first), then by games played, then by name
      playerStatsArray.sort((a, b) => {
        // First sort by win percentage
        if (b.winPercentage !== a.winPercentage) {
          return b.winPercentage - a.winPercentage;
        }
        
        // Then by games played
        if (b.played !== a.played) {
          return b.played - a.played;
        }
        
        // Finally by name
        return a.playerName.localeCompare(b.playerName);
      });
      
      console.log("Player statistics calculated:", playerStatsArray.length);
      setPlayerStats(playerStatsArray);
      
    } catch (error) {
      console.error('Error fetching player data:', error);
    } finally {
      setLoading(false);
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Loading player statistics...
                      </TableCell>
                    </TableRow>
                  ) : playerStats.length > 0 ? (
                    playerStats.map((stat: PlayerStat, index: number) => (
                      <TableRow key={stat.playerId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{stat.playerName}</TableCell>
                        <TableCell>{stat.teamName}</TableCell>
                        <TableCell align="center">{stat.played}</TableCell>
                        <TableCell align="center">{stat.won}</TableCell>
                        <TableCell align="center">{stat.lost}</TableCell>
                        <TableCell align="center">{stat.played > 0 ? `${stat.winPercentage}%` : '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No players found in this league.
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