// src/pages/admin/ManageTeams.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import {
  Team,
  Season,
  Venue,
  getSeasons,
  getVenues,
  createTeam,
  getTeams
} from '../../services/databaseService';

const ManageTeams = () => {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    homeVenueId: '',
    captainId: '',
    captainEmail: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const seasonsData = await getSeasons(''); // Fetch all seasons initially
        setSeasons(seasonsData);
        
        const venuesData = await getVenues();
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
      fetchTeams(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchTeams = async (seasonId: string) => {
    try {
      const teamsData = await getTeams(seasonId);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to fetch teams');
    }
  };

  const handleSeasonChange = (e) => {
    setSelectedSeasonId(e.target.value);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewTeam({
      name: '',
      homeVenueId: '',
      captainId: '',
      captainEmail: '',
    });
    setError('');
  };

  const handleTeamInputChange = (e) => {
    const { name, value } = e.target;
    setNewTeam(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateTeam = async () => {
    setLoading(true);
    setError('');

    try {
      if (!newTeam.name || !newTeam.homeVenueId) {
        throw new Error('Team name and venue are required');
      }

      // Here you would actually create the captain user account
      // and get the captainId, but for simplicity:
      const captainId = Math.random().toString(36).substring(2, 15);

      const teamData: Team = {
        name: newTeam.name,
        homeVenueId: newTeam.homeVenueId,
        captainId,
        playerIds: [],
        seasonId: selectedSeasonId
      };

      await createTeam(teamData);
      handleCloseDialog();
      fetchTeams(selectedSeasonId);
    } catch (error) {
      console.error('Error creating team:', error);
      setError(error.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleGames = () => {
    navigate('/admin/schedule');
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Teams
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
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{ mb: 2 }}
          >
            Add Team
          </Button>
          
          {teams.length > 0 ? (
            <List>
              {teams.map(team => (
                <ListItem 
                  key={team.id}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete">
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText 
                    primary={team.name}
                    secondary={venues.find(v => v.id === team.homeVenueId)?.name || 'Unknown Venue'}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="textSecondary" align="center">
              No teams added to this season yet
            </Typography>
          )}
          
          {teams.length >= 2 && (
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleScheduleGames}
            >
              Generate Schedule
            </Button>
          )}
        </Paper>
      </Box>
      
      {/* Add Team Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Team</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            id="name"
            name="name"
            label="Team Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newTeam.name}
            onChange={handleTeamInputChange}
            sx={{ mb:
                // src/pages/admin/ManageTeams.tsx (continued)
            sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="venue-select-label">Home Venue</InputLabel>
              <Select
                labelId="venue-select-label"
                id="homeVenueId"
                name="homeVenueId"
                value={newTeam.homeVenueId}
                onChange={handleTeamInputChange}
                label="Home Venue"
              >
                {venues.map(venue => (
                  <MenuItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              margin="dense"
              id="captainEmail"
              name="captainEmail"
              label="Team Captain Email"
              type="email"
              fullWidth
              variant="outlined"
              value={newTeam.captainEmail}
              onChange={handleTeamInputChange}
              helperText="An invitation will be sent to this email"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleCreateTeam}
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Team'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  };
  
  export default ManageTeams;