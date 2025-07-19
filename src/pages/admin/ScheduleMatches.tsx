// src/pages/admin/ScheduleMatches.tsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Grid,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Timestamp } from 'firebase/firestore';
import { SelectChangeEvent } from '@mui/material';

import {
  League,
  Season,
  Team,
  Match,
  Venue,
  getLeagues,
  getSeasons,
  getTeams,
  getVenues,
  getMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  deleteUnplayedMatchesInSeason,
  getPlayersForTeam
} from '../../services/databaseService';
import { generateSchedule } from '../../utils/schedulingUtils';

const ScheduleMatches: React.FC = () => {
  const navigate = useNavigate();
  // State variables
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Edit dialog state
  const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editVenueId, setEditVenueId] = useState<string>('');
  const [editHomeLineup, setEditHomeLineup] = useState<string[]>([]);
  const [editAwayLineup, setEditAwayLineup] = useState<string[]>([]);
  const [homePlayers, setHomePlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);

  // Add match dialog state
  const [openAddDialog, setOpenAddDialog] = useState<boolean>(false);
  const [newMatchData, setNewMatchData] = useState<{
    homeTeamId: string;
    awayTeamId: string;
    venueId: string;
    scheduledDate: Date | null;
  }>({
    homeTeamId: '',
    awayTeamId: '',
    venueId: '',
    scheduledDate: new Date()
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleStatusFilterChange = (event: React.SyntheticEvent, newValue: string) => {
    setStatusFilter(newValue);
  };

  const handleTeamFilterChange = (event: SelectChangeEvent<string>) => {
    setTeamFilter(event.target.value);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setTeamFilter('all');
  };

  // Fetch leagues on component mount
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoading(true);
        const leaguesData = await getLeagues();
        setLeagues(leaguesData);
        
        // Also fetch venues as they don't depend on league/season
        const venuesData = await getVenues();
        setVenues(venuesData);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leagues:', error);
        setError('Failed to fetch leagues');
        setLoading(false);
      }
    };

    fetchLeagues();
  }, []);

  // Fetch seasons when league is selected
  useEffect(() => {
    if (selectedLeagueId) {
      const fetchSeasons = async () => {
        try {
          setLoading(true);
          const seasonsData = await getSeasons(selectedLeagueId);
          setSeasons(seasonsData);
          
          // Reset season selection when league changes
          setSelectedSeasonId('');
          setSelectedSeason(null);
          setTeams([]);
          setMatches([]);
          
          setLoading(false);
        } catch (error) {
          console.error('Error fetching seasons:', error);
          setError('Failed to fetch seasons for this league');
          setLoading(false);
        }
      };

      fetchSeasons();
    }
  }, [selectedLeagueId]);

  // Fetch teams and matches when season is selected
  useEffect(() => {
    if (selectedSeasonId) {
      fetchSeasonData(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchSeasonData = async (seasonId: string) => {
    try {
      setLoading(true);
      const [teamsData, matchesData] = await Promise.all([
        getTeams(seasonId),
        getMatches(seasonId)
      ]);

      setTeams(teamsData);
      setMatches(matchesData);
      
      // Find the selected season object
      const selectedSeasonObj = seasons.find(s => s.id === seasonId) || null;
      setSelectedSeason(selectedSeasonObj);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching season data:', error);
      setError('Failed to fetch season data');
      setLoading(false);
    }
  };

  const handleLeagueChange = (event: SelectChangeEvent<string>) => {
    setSelectedLeagueId(event.target.value);
    setTeamFilter('all');
  };

  const handleSeasonChange = (event: SelectChangeEvent<string>) => {
    setSelectedSeasonId(event.target.value);
    setTeamFilter('all');
  };

  const handleGenerateSchedule = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!selectedSeason || !selectedSeason.startDate) {
        throw new Error('Season start date is required');
      }

      // Check if matches already exist
      if (matches.length > 0) {
        if (!window.confirm('This will replace all existing matches. Are you sure you want to continue?')) {
          setLoading(false);
          return;
        }
      }

      // Ensure the start date is a proper Date object
      let startDate: Date;
      if (selectedSeason.startDate.toDate && typeof selectedSeason.startDate.toDate === 'function') {
        startDate = selectedSeason.startDate.toDate();
      } else {
        startDate = new Date(selectedSeason.startDate as any);
      }
      
      const generatedMatches = generateSchedule(
        teams,
        selectedSeasonId,
        startDate,
        selectedSeason.matchDay || 'Monday',
        1 // Default to 1 week between matches
      );

      await Promise.all(generatedMatches.map(match => createMatch(match as Match)));

      await fetchSeasonData(selectedSeasonId);
      setSuccess('Schedule generated successfully!');
    } catch (error) {
      console.error('Error generating schedule:', error);
      setError((error as Error).message || 'Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = async (match: Match) => {
    setSelectedMatch(match);
    setEditDate(match.scheduledDate?.toDate() || null);
    setEditVenueId(match.venueId || '');
    setEditHomeLineup(match.homeLineup || []);
    setEditAwayLineup(match.awayLineup || []);
    setOpenEditDialog(true);

    // Fetch players for both teams
    try {
      const [homeTeamPlayers, awayTeamPlayers] = await Promise.all([
        getPlayersForTeam(match.homeTeamId, match.seasonId),
        getPlayersForTeam(match.awayTeamId, match.seasonId)
      ]);
      setHomePlayers(homeTeamPlayers);
      setAwayPlayers(awayTeamPlayers);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to fetch players');
    }
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedMatch(null);
    setEditDate(null);
    setEditVenueId('');
    setEditHomeLineup([]);
    setEditAwayLineup([]);
    setHomePlayers([]);
    setAwayPlayers([]);
  };

  const handleUpdateMatch = async () => {
    if (!selectedMatch || !editDate) return;

    setLoading(true);
    setError('');
    try {
      const matchTimestamp = Timestamp.fromDate(editDate);
      
      await updateMatch(selectedMatch.id!, {
        date: matchTimestamp,
        scheduledDate: matchTimestamp,
        venueId: editVenueId || '',
        homeLineup: editHomeLineup,
        awayLineup: editAwayLineup
      });

      await fetchSeasonData(selectedSeasonId);
      setSuccess('Match updated successfully!');
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating match:', error);
      setError('Failed to update match');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;

    setLoading(true);
    setError('');
    try {
      await deleteMatch(matchId);
      await fetchSeasonData(selectedSeasonId);
      setSuccess('Match deleted successfully!');
    } catch (error) {
      console.error('Error deleting match:', error);
      setError('Failed to delete match');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
    setNewMatchData({
      homeTeamId: teams.length > 0 ? teams[0].id! : '',
      awayTeamId: teams.length > 1 ? teams[1].id! : '',
      venueId: venues.length > 0 ? venues[0].id! : '',
      scheduledDate: new Date()
    });
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };

  const handleCreateMatch = async () => {
    if (!newMatchData.homeTeamId || !newMatchData.awayTeamId || !newMatchData.venueId || !newMatchData.scheduledDate) {
      setError('All fields are required');
      return;
    }

    if (newMatchData.homeTeamId === newMatchData.awayTeamId) {
      setError('Home team and away team cannot be the same');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Create a single timestamp to use for both date and scheduledDate
      const matchTimestamp = Timestamp.fromDate(newMatchData.scheduledDate);

      // Generate a temporary match ID for frame generation
      const tempMatchId = `${selectedSeasonId}-${newMatchData.homeTeamId}-${newMatchData.awayTeamId}-${newMatchData.scheduledDate.getTime()}`;
      
      // Generate complete frame structure with position rotation
      const matchFormat = {
        roundsPerMatch: 4,
        framesPerRound: 4,
        positionsPerTeam: 4,
        name: '4v4 Standard'
      };
      
      const matchFrames: any[] = [];
      
      // Generate complete frame structure for all rounds
      for (let round = 1; round <= matchFormat.roundsPerMatch; round++) {
        for (let frameNum = 1; frameNum <= matchFormat.framesPerRound; frameNum++) {
          // Calculate position rotation (A,B,C,D vs 1,2,3,4)
          const homePositionIndex = (frameNum - 1) % matchFormat.positionsPerTeam;
          const awayPositionIndex = (frameNum - 1 + round - 1) % matchFormat.positionsPerTeam;
          
          const homePosition = String.fromCharCode(65 + homePositionIndex); // A, B, C, D
          const awayPosition = awayPositionIndex + 1; // 1, 2, 3, 4
          
          const frameId = `${tempMatchId}-R${round}-F${frameNum}`;
          
          matchFrames.push({
            frameId,
            matchId: tempMatchId,
            round,
            frameNumber: frameNum,
            homePosition,
            awayPosition,
            homePlayerId: 'vacant',
            awayPlayerId: 'vacant', 
            winnerPlayerId: null,
            homeScore: 0,
            awayScore: 0,
            isComplete: false,
            seasonId: selectedSeasonId
          });
        }
      }

      await createMatch({
        seasonId: selectedSeasonId,
        divisionId: '', // Add required field
        homeTeamId: newMatchData.homeTeamId,
        awayTeamId: newMatchData.awayTeamId,
        venueId: newMatchData.venueId,
        date: matchTimestamp,
        scheduledDate: matchTimestamp,
        matchDate: matchTimestamp,
        status: 'scheduled',
        frames: matchFrames,
        format: matchFormat,
        state: 'pre-match', // Set initial state for V2 system
        homeLineup: [],
        awayLineup: [],
      } as Match);

      await fetchSeasonData(selectedSeasonId);
      setSuccess('Match created successfully!');
      handleCloseAddDialog();
    } catch (error) {
      console.error('Error creating match:', error);
      setError('Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllUnplayedMatches = async () => {
    if (!selectedSeasonId) return;
    
    if (window.confirm('Are you sure you want to delete all unplayed matches in this season? This action cannot be undone.')) {
      try {
        setLoading(true);
        setError('');
        
        const deletedCount = await deleteUnplayedMatchesInSeason(selectedSeasonId);
        
        setSuccess(`Successfully deleted ${deletedCount} unplayed match${deletedCount === 1 ? '' : 'es'}.`);
        await fetchSeasonData(selectedSeasonId);
      } catch (error) {
        console.error('Error deleting unplayed matches:', error);
        setError('Failed to delete unplayed matches');
      } finally {
        setLoading(false);
      }
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'scheduled':
        return 'Scheduled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box my={4}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin')}
              sx={{ minWidth: 100 }}
            >
              Back
            </Button>
            <Typography variant="h4" component="h1">
              Schedule Matches
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ my: 2 }}>{success}</Alert>}

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              {/* League Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="league-select-label">Select League</InputLabel>
                  <Select
                    labelId="league-select-label"
                    value={selectedLeagueId}
                    onChange={handleLeagueChange}
                    label="Select League"
                    disabled={loading || leagues.length === 0}
                  >
                    {leagues.map(league => (
                      <MenuItem key={league.id} value={league.id}>
                        {league.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Season Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="season-select-label">Select Season</InputLabel>
                  <Select
                    labelId="season-select-label"
                    value={selectedSeasonId}
                    onChange={handleSeasonChange}
                    label="Select Season"
                    disabled={loading || !selectedLeagueId || seasons.length === 0}
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

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Button
                  variant="contained"
                  onClick={handleGenerateSchedule}
                  disabled={!selectedSeasonId || loading || teams.length < 2}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                  sx={{ mr: 2 }}
                >
                  Generate Full Schedule
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleOpenAddDialog}
                  disabled={!selectedSeasonId || loading}
                  startIcon={<AddIcon />}
                >
                  Add Single Match
                </Button>
              </Box>
              
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteAllUnplayedMatches}
                disabled={!selectedSeasonId || loading}
                startIcon={<CleaningServicesIcon />}
              >
                Delete All Unplayed Matches
              </Button>
            </Box>
            
            {selectedSeasonId && !loading && (
              <>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs value={statusFilter} onChange={handleStatusFilterChange}>
                    <Tab label="All Matches" value="all" />
                    <Tab label="Scheduled" value="scheduled" />
                    <Tab label="In Progress" value="in_progress" />
                    <Tab label="Completed" value="completed" />
                  </Tabs>
                </Box>
                
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Additional filters:
                  </Typography>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel id="team-filter-label">Filter by Team</InputLabel>
                    <Select
                      labelId="team-filter-label"
                      value={teamFilter}
                      onChange={handleTeamFilterChange}
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
                  
                  {(statusFilter !== 'all' || teamFilter !== 'all') && (
                    <Button 
                      size="small" 
                      onClick={clearFilters}
                      startIcon={<CleaningServicesIcon fontSize="small" />}
                    >
                      Clear Filters
                    </Button>
                  )}
                  
                  {teamFilter !== 'all' && matches.length === 0 && (
                    <Typography variant="body2" color="warning.main">
                      No matches found with the current filters
                    </Typography>
                  )}
                </Box>
              </>
            )}

            {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}

            {!loading && matches.length > 0 && (
              <>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                    {teamFilter !== 'all' && ` for ${teams.find(t => t.id === teamFilter)?.name || 'selected team'}`}
                    {statusFilter !== 'all' && ` with status "${statusFilter}"`}
                  </Typography>
                </Box>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Home Team</TableCell>
                        <TableCell>Away Team</TableCell>
                        <TableCell>Venue</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {matches.map(match => (
                        <TableRow key={match.id}>
                          <TableCell>
                            {match.scheduledDate 
                              ? format(match.scheduledDate.toDate(), 'dd/MM/yyyy hh:mm a') 
                              : 'TBD'}
                          </TableCell>
                          <TableCell>{teams.find(team => team.id === match.homeTeamId)?.name || 'Unknown'}</TableCell>
                          <TableCell>{teams.find(team => team.id === match.awayTeamId)?.name || 'Unknown'}</TableCell>
                          <TableCell>{venues.find(venue => venue.id === match.venueId)?.name || 'Unknown'}</TableCell>
                          <TableCell>{formatStatus(match.status || 'scheduled')}</TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenEditDialog(match)}
                              disabled={match.status === 'completed'}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteMatch(match.id!)}
                              disabled={match.status === 'completed' || match.status === 'in_progress'}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {!loading && selectedLeagueId && !selectedSeasonId && (
              <Alert severity="info">
                Please select a season to view or create matches.
              </Alert>
            )}

            {!loading && !selectedLeagueId && (
              <Alert severity="info">
                Please select a league first.
              </Alert>
            )}

            {!loading && matches.length === 0 && selectedSeasonId && (
              <Alert severity="info">
                No matches scheduled for this season. Click 'Generate Full Schedule' to create a complete round-robin schedule, or 'Add Single Match' to add matches individually.
              </Alert>
            )}
          </Paper>
        </Box>

        {/* Edit Match Dialog */}
        <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
          <DialogTitle>Edit Match</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">
                  {teams.find(team => team.id === selectedMatch?.homeTeamId)?.name || 'Home Team'} vs {teams.find(team => team.id === selectedMatch?.awayTeamId)?.name || 'Away Team'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <DateTimePicker
                  label="Match Date & Time"
                  value={editDate}
                  onChange={(newValue) => setEditDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="edit-venue-label">Venue</InputLabel>
                  <Select
                    labelId="edit-venue-label"
                    value={editVenueId}
                    onChange={(e) => setEditVenueId(e.target.value)}
                    label="Venue"
                  >
                    {venues.map(venue => (
                      <MenuItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Home Team Lineup */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Home Team Lineup
                </Typography>
                <FormControl fullWidth>
                  <InputLabel id="home-lineup-label">Select Players</InputLabel>
                  <Select
                    labelId="home-lineup-label"
                    multiple
                    value={editHomeLineup}
                    onChange={(e) => setEditHomeLineup(typeof e.target.value === 'string' ? [] : e.target.value)}
                    label="Select Players"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((playerId) => (
                          <Chip
                            key={playerId}
                            label={homePlayers.find(p => p.id === playerId)?.firstName + ' ' + homePlayers.find(p => p.id === playerId)?.lastName}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {homePlayers.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        {player.firstName} {player.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Away Team Lineup */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Away Team Lineup
                </Typography>
                <FormControl fullWidth>
                  <InputLabel id="away-lineup-label">Select Players</InputLabel>
                  <Select
                    labelId="away-lineup-label"
                    multiple
                    value={editAwayLineup}
                    onChange={(e) => setEditAwayLineup(typeof e.target.value === 'string' ? [] : e.target.value)}
                    label="Select Players"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((playerId) => (
                          <Chip
                            key={playerId}
                            label={awayPlayers.find(p => p.id === playerId)?.firstName + ' ' + awayPlayers.find(p => p.id === playerId)?.lastName}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {awayPlayers.map((player) => (
                      <MenuItem key={player.id} value={player.id}>
                        {player.firstName} {player.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button 
              onClick={handleUpdateMatch} 
              variant="contained" 
              disabled={!editDate || !editVenueId || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Match Dialog */}
        <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Match</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="home-team-label">Home Team</InputLabel>
                  <Select
                    labelId="home-team-label"
                    value={newMatchData.homeTeamId}
                    onChange={(e) => setNewMatchData({...newMatchData, homeTeamId: e.target.value})}
                    label="Home Team"
                  >
                    {teams.map(team => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="away-team-label">Away Team</InputLabel>
                  <Select
                    labelId="away-team-label"
                    value={newMatchData.awayTeamId}
                    onChange={(e) => setNewMatchData({...newMatchData, awayTeamId: e.target.value})}
                    label="Away Team"
                  >
                    {teams.map(team => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Match Date & Time"
                  value={newMatchData.scheduledDate}
                  onChange={(newValue) => setNewMatchData({...newMatchData, scheduledDate: newValue})}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="venue-label">Venue</InputLabel>
                  <Select
                    labelId="venue-label"
                    value={newMatchData.venueId}
                    onChange={(e) => setNewMatchData({...newMatchData, venueId: e.target.value})}
                    label="Venue"
                  >
                    {venues.map(venue => (
                      <MenuItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddDialog}>Cancel</Button>
            <Button 
              onClick={handleCreateMatch} 
              variant="contained" 
              disabled={!newMatchData.homeTeamId || !newMatchData.awayTeamId || 
                        !newMatchData.venueId || !newMatchData.scheduledDate || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Match'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default ScheduleMatches;