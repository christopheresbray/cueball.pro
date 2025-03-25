import React, { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Button
} from '@mui/material';
import { format, isBefore, isAfter, addDays, parseISO } from 'date-fns';
import { SelectChangeEvent } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import ClearIcon from '@mui/icons-material/Clear';

import {
  League,
  Season,
  Team,
  Match,
  Venue,
  getLeagues,
  getSeasons,
  getTeams,
  getMatches,
  getVenues
} from '../../services/databaseService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`fixtures-tabpanel-${index}`}
      aria-labelledby={`fixtures-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Group matches by date for better display
const groupMatchesByDate = (matches: Match[]) => {
  const grouped: { [key: string]: Match[] } = {};
  
  matches.forEach(match => {
    if (match.scheduledDate) {
      const dateKey = format(match.scheduledDate.toDate(), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(match);
    }
  });
  
  return Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, matches]) => ({
      date: parseISO(date),
      matches
    }));
};

const Fixtures = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Grouped matches
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  
  // Grouped match displays
  const [upcomingGrouped, setUpcomingGrouped] = useState<{ date: Date; matches: Match[] }[]>([]);
  const [recentGrouped, setRecentGrouped] = useState<{ date: Date; matches: Match[] }[]>([]);
  const [allGrouped, setAllGrouped] = useState<{ date: Date; matches: Match[] }[]>([]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const leaguesData = await getLeagues();
        const venuesData = await getVenues();
        
        setLeagues(leaguesData);
        setVenues(venuesData);
        
        if (leaguesData.length > 0) {
          setSelectedLeagueId(leaguesData[0].id!);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
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
    // Group and filter matches whenever the full matches list changes
    if (matches.length > 0) {
      const now = new Date();
      const twoWeeksAgo = addDays(now, -14);

      // Filter matches by team first if a team is selected
      const filteredMatches = filterMatchesByTeam(matches);

      // Upcoming matches (future)
      const upcoming = filteredMatches
        .filter(match => match.scheduledDate && isAfter(match.scheduledDate.toDate(), now))
        .sort((a, b) => a.scheduledDate!.toDate().getTime() - b.scheduledDate!.toDate().getTime());
      setUpcomingMatches(upcoming);
      setUpcomingGrouped(groupMatchesByDate(upcoming));

      // Recent matches (past two weeks)
      const recent = filteredMatches
        .filter(match => 
          match.scheduledDate && 
          isBefore(match.scheduledDate.toDate(), now) && 
          isAfter(match.scheduledDate.toDate(), twoWeeksAgo)
        )
        .sort((a, b) => b.scheduledDate!.toDate().getTime() - a.scheduledDate!.toDate().getTime());
      setRecentMatches(recent);
      setRecentGrouped(groupMatchesByDate(recent));

      // All matches
      const all = [...filteredMatches].sort((a, b) => {
        if (!a.scheduledDate || !b.scheduledDate) return 0;
        return a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime();
      });
      setAllMatches(all);
      setAllGrouped(groupMatchesByDate(all));
    } else {
      // Reset when no matches
      setUpcomingMatches([]);
      setRecentMatches([]);
      setAllMatches([]);
      setUpcomingGrouped([]);
      setRecentGrouped([]);
      setAllGrouped([]);
    }
  }, [matches, selectedTeamId]);

  const fetchSeasons = async (leagueId: string) => {
    setLoading(true);
    try {
      const seasonsData = await getSeasons(leagueId);
      setSeasons(seasonsData);
      
      if (seasonsData.length > 0) {
        // Find the current season if any
        const currentSeason = seasonsData.find(s => s.isCurrent);
        if (currentSeason) {
          setSelectedSeasonId(currentSeason.id!);
        } else {
          setSelectedSeasonId(seasonsData[0].id!);
        }
      } else {
        setSelectedSeasonId('');
        setTeams([]);
        setMatches([]);
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
      const [teamsData, matchesData] = await Promise.all([
        getTeams(seasonId),
        getMatches(seasonId)
      ]);
      
      setTeams(teamsData);
      setMatches(matchesData);
    } catch (error) {
      console.error('Error fetching season data:', error);
      setError('Failed to fetch season data');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueChange = (e: SelectChangeEvent) => {
    setSelectedLeagueId(e.target.value);
    setSelectedTeamId('all');
  };
  
  const handleSeasonChange = (e: SelectChangeEvent) => {
    setSelectedSeasonId(e.target.value);
    setSelectedTeamId('all');
  };

  const handleTeamChange = (e: SelectChangeEvent) => {
    setSelectedTeamId(e.target.value);
  };

  const handleClearFilters = () => {
    setSelectedTeamId('all');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getTeamNameById = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getVenueNameById = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId);
    return venue ? venue.name : 'Unknown Venue';
  };

  const getStatusChip = (status: string) => {
    let color;
    let label;
    
    switch (status) {
      case 'completed':
        color = 'success';
        label = 'Completed';
        break;
      case 'in_progress':
        color = 'warning';
        label = 'In Progress';
        break;
      default:
        color = 'default';
        label = status.charAt(0).toUpperCase() + status.slice(1); // For other statuses
    }
    
    return (
      <Chip 
        label={label} 
        color={color as any} 
        size="small" 
      />
    );
  };

  const renderMatchTable = (matches: Match[]) => (
    <TableContainer component={Paper} elevation={0}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Home Team</TableCell>
            <TableCell>Away Team</TableCell>
            <TableCell>Venue</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matches.map(match => (
            <TableRow key={match.id}>
              <TableCell>
                {match.scheduledDate ? 
                  format(match.scheduledDate.toDate(), 'dd/MM/yyyy hh:mm a') : 
                  'TBD'}
              </TableCell>
              <TableCell 
                sx={selectedTeamId !== 'all' && match.homeTeamId === selectedTeamId ? {
                  fontWeight: 'bold',
                  color: 'primary.main'
                } : {}}
              >
                {getTeamNameById(match.homeTeamId)}
              </TableCell>
              <TableCell 
                sx={selectedTeamId !== 'all' && match.awayTeamId === selectedTeamId ? {
                  fontWeight: 'bold',
                  color: 'primary.main'
                } : {}}
              >
                {getTeamNameById(match.awayTeamId)}
              </TableCell>
              <TableCell>{getVenueNameById(match.venueId)}</TableCell>
              <TableCell>{getStatusChip(match.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGroupedMatches = (groupedMatches: { date: Date; matches: Match[] }[]) => (
    <>
      {groupedMatches.map((group, index) => (
        <Box key={index} sx={{ mb: 4 }}>
          <Paper sx={{ p: 2, backgroundColor: 'primary.light', color: 'white', mb: 1 }}>
            <Typography variant="h6">
              {format(group.date, 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Paper>
          {renderMatchTable(group.matches)}
        </Box>
      ))}
      
      {groupedMatches.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No matches found</Typography>
        </Paper>
      )}
    </>
  );

  const filterMatchesByTeam = (matches: Match[]) => {
    if (selectedTeamId === 'all') return matches;
    
    return matches.filter(match => 
      match.homeTeamId === selectedTeamId || match.awayTeamId === selectedTeamId
    );
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Fixtures and Results
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

            {teams.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FormControl sx={{ minWidth: 250 }}>
                    <InputLabel id="team-filter-label">Filter by Team</InputLabel>
                    <Select
                      labelId="team-filter-label"
                      value={selectedTeamId}
                      onChange={handleTeamChange}
                      label="Filter by Team"
                      size="small"
                    >
                      <MenuItem value="all">All Teams</MenuItem>
                      {teams.map(team => (
                        <MenuItem key={team.id} value={team.id}>
                          {team.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {selectedTeamId !== 'all' && (
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleClearFilters}
                      startIcon={<ClearIcon />}
                    >
                      Clear Team Filter
                    </Button>
                  )}
                </Box>
                
                {selectedTeamId !== 'all' && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="primary">
                      Showing matches for {teams.find(t => t.id === selectedTeamId)?.name}
                    </Typography>
                  </Box>
                )}
              </Grid>
            )}
          </Grid>
        </Paper>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : matches.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No matches scheduled for this season</Typography>
          </Paper>
        ) : (
          <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                variant="fullWidth"
                centered
              >
                <Tab label={`Upcoming (${upcomingMatches.length})`} icon={<CalendarTodayIcon />} iconPosition="start" />
                <Tab label={`Recent Results (${recentMatches.length})`} icon={<SportsCricketIcon />} iconPosition="start" />
                <Tab label={`All Matches (${allMatches.length})`} />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              {upcomingMatches.length > 0 && selectedTeamId !== 'all' && (
                <Box sx={{ mb: 2 }}>
                  <Paper sx={{ p: 2, backgroundColor: 'info.light', color: 'white' }}>
                    <Typography>
                      Showing {upcomingMatches.length} upcoming {upcomingMatches.length === 1 ? 'match' : 'matches'} for {teams.find(t => t.id === selectedTeamId)?.name}
                    </Typography>
                  </Paper>
                </Box>
              )}
              {renderGroupedMatches(upcomingGrouped)}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              {recentMatches.length > 0 && selectedTeamId !== 'all' && (
                <Box sx={{ mb: 2 }}>
                  <Paper sx={{ p: 2, backgroundColor: 'info.light', color: 'white' }}>
                    <Typography>
                      Showing {recentMatches.length} recent {recentMatches.length === 1 ? 'match' : 'matches'} for {teams.find(t => t.id === selectedTeamId)?.name}
                    </Typography>
                  </Paper>
                </Box>
              )}
              {renderGroupedMatches(recentGrouped)}
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              {allMatches.length > 0 && selectedTeamId !== 'all' && (
                <Box sx={{ mb: 2 }}>
                  <Paper sx={{ p: 2, backgroundColor: 'info.light', color: 'white' }}>
                    <Typography>
                      Showing {allMatches.length} {allMatches.length === 1 ? 'match' : 'matches'} for {teams.find(t => t.id === selectedTeamId)?.name}
                    </Typography>
                  </Paper>
                </Box>
              )}
              {renderGroupedMatches(allGrouped)}
            </TabPanel>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Fixtures;