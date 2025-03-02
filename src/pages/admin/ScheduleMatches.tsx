// src/pages/admin/ScheduleMatches.tsx
import { useState, useEffect } from 'react';
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
  TextField
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

import {
  Season,
  Team,
  Match,
  Venue,
  getSeasons,
  getTeams,
  getVenues,
  getMatches,
  createMatch,
  updateMatch
} from '../../services/databaseService';
import { generateSchedule } from '../../utils/schedulingUtils';

const ScheduleMatches = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editVenueId, setEditVenueId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const seasonsData = await getSeasons(''); // Fetch all seasons initially
        const venuesData = await getVenues();
        
        setSeasons(seasonsData);
        setVenues(venuesData);
        
        if (seasonsData.length > 0) {
          setSelectedSeasonId(seasonsData[0].id!);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Failed to fetch data');
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchSeasonData(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchSeasonData = async (seasonId: string) => {
    try {
      const [teamsData, matchesData, seasonsData] = await Promise.all([
        getTeams(seasonId),
        getMatches(seasonId),
        getSeasons('')
      ]);
      
      setTeams(teamsData);
      setMatches(matchesData);
      setSelectedSeason(seasonsData.find(s => s.id === seasonId) || null);
    } catch (error) {
      console.error('Error fetching season data:', error);
      setError('Failed to fetch season data');
    }
  };

  const handleSeasonChange = (e) => {
    setSelectedSeasonId(e.target.value);
  };

  const handleGenerateSchedule = async () => {
    setLoading(true);
    setError('');

    try {
      if (!selectedSeason || !selectedSeason.startDate) {
        throw new Error('Season start date is required');
      }

      // Generate match schedule
      const generatedMatches = generateSchedule(
        teams,
        selectedSeason.startDate.toDate(),
        selectedSeason.matchDay,
        selectedSeasonId
      );

      // Save matches to database
      await Promise.all(generatedMatches.map(match => createMatch(match as Match)));
      
      // Refresh matches
      fetchSeasonData(selectedSeasonId);
    } catch (error) {
      console.error('Error generating schedule:', error);
      setError(error.message || 'Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (match: Match) => {
    setSelectedMatch(match);
    setEditDate(match.scheduledDate.toDate());
    setEditVenueId(match.venueId);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedMatch(null);
    setEditDate(null);
    setEditVenueId('');
  };

  const handleUpdateMatch = async () => {
    if (!selectedMatch || !editDate) return;
    
    setLoading(true);
    try {
      await updateMatch(selectedMatch.id!, {
        scheduledDate: Timestamp.fromDate(editDate),
        venueId: editVenueId
      });
      
      // Refresh matches
      fetchSeasonData(selectedSeasonId);
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating match:', error);
      setError('Failed to update match');
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId: string) => {
    return teams.find(team => team.id === teamId)?.name || 'Unknown Team';
  };

  const getVenueName = (venueId: string) => {
    return venues.find(venue => venue.id === venueId)?.name || 'Unknown Venue';
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Schedule Matches
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="season-select-label">Select Season</InputLabel>
            <Select
              labelId="season-select-label"
              value={selectedSeasonId}
              onChange={handleSeasonChange}
              label="Select Season"
            >
              {seasons.map(season => (
                <MenuItem key={season.id} value={season.id}>
                  {season.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {teams.length >= 2 && matches.length === 0 && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleGenerateSchedule}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Schedule'}
            </Button>
          )}
          
          {matches.length > 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Home Team</TableCell>
                    <TableCell>Away Team</TableCell>
                    <TableCell>Venue</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matches.map(match => (
                    <TableRow key={match.id}>
                      <TableCell>
                        {format(match.scheduledDate.toDate(), 'MM/dd/yyyy hh:mm a')}
                      </TableCell>
                      <TableCell>{getTeamName(match.homeTeamId)}</TableCell>
                      <TableCell>{getTeamName(match.awayTeamId)}</TableCell>
                      <TableCell>{getVenueName(match.venueId)}</TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenEditDialog(match)}
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {matches.length === 0 && teams.length >= 2 && (
            <Typography align="center" sx={{ mt: 2 }}>
              Click "Generate Schedule" to create the match fixtures
            </Typography>
          )}
          
          {teams.length < 2 && (
            <Typography align="center" color="error">
              At least 2 teams are required to generate a schedule
            </Typography>
          )}
        </Paper>
      </Box>
      
      {/* Edit Match Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit Match Details</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          {selectedMatch && (
            <Box>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                {getTeamName(selectedMatch.homeTeamId)} vs {getTeamName(selectedMatch.awayTeamId)}
              </Typography>
              
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Match Date & Time"
                  value={editDate}
                  onChange={(newDate) => setEditDate(newDate)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth sx={{ mb: 2 }} />
                  )}
                />
              </LocalizationProvider>
              
              <FormControl fullWidth>
                <InputLabel id="edit-venue-select-label">Venue</InputLabel>
                <Select
                  labelId="edit-venue-select-label"
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            onClick={handleUpdateMatch}
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Match'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ScheduleMatches;