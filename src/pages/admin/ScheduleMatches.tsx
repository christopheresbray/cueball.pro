// src/pages/admin/ScheduleMatches.tsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
import { Timestamp } from 'firebase/firestore';
import { SelectChangeEvent } from '@mui/material';

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

const ScheduleMatches: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

  const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editVenueId, setEditVenueId] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const seasonsData = await getSeasons('');
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

  const handleSeasonChange = (event: SelectChangeEvent<string>) => {
    setSelectedSeasonId(event.target.value);
  };

  const handleGenerateSchedule = async () => {
    setLoading(true);
    setError('');

    try {
      if (!selectedSeason || !selectedSeason.startDate) {
        throw new Error('Season start date is required');
      }

      const generatedMatches = generateSchedule(
        teams,
        selectedSeason.startDate.toDate(),
        selectedSeason.matchDay,
        selectedSeasonId
      );

      await Promise.all(generatedMatches.map(match => createMatch(match as Match)));

      fetchSeasonData(selectedSeasonId);
    } catch (error) {
      console.error('Error generating schedule:', error);
      setError((error as Error).message || 'Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (match: Match) => {
    setSelectedMatch(match);
    setEditDate(match.scheduledDate?.toDate() || null);
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

      fetchSeasonData(selectedSeasonId);
      handleCloseEditDialog();
    } catch (error) {
      console.error('Error updating match:', error);
      setError('Failed to update match');
    } finally {
      setLoading(false);
    }
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
                        {match.scheduledDate ? format(match.scheduledDate.toDate(), 'MM/dd/yyyy hh:mm a') : 'TBD'}
                      </TableCell>
                      <TableCell>{teams.find(team => team.id === match.homeTeamId)?.name || 'Unknown'}</TableCell>
                      <TableCell>{teams.find(team => team.id === match.awayTeamId)?.name || 'Unknown'}</TableCell>
                      <TableCell>{venues.find(venue => venue.id === match.venueId)?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleOpenEditDialog(match)}>
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ScheduleMatches;
