// src/pages/admin/ManageVenues.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  Alert,
  Collapse,
  ListItemButton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

import {
  Venue,
  Team,
  getVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  getTeams,
  getCurrentSeason
} from '../../services/databaseService';

const ManageVenues: React.FC = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVenue, setCurrentVenue] = useState<Venue>({
    id: '',
    name: '',
    address: '',
    contact: ''
  });
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [venuesData, currentSeason] = await Promise.all([
        getVenues(),
        getCurrentSeason()
      ]);
      setVenues(venuesData);
      
      if (currentSeason) {
        const teamsData = await getTeams(currentSeason.id);
        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentVenue({
      id: '',
      name: '',
      address: '',
      contact: ''
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (venue: Venue) => {
    setCurrentVenue({...venue});
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentVenue(prev => ({ ...prev, [name]: value }));
  };

  const handleDeleteVenue = async (id: string) => {
    // Check if any teams are using this venue
    const teamsUsingVenue = getTeamsForVenue(id);
    if (teamsUsingVenue.length > 0) {
      setError(`Cannot delete venue. It is currently being used by ${teamsUsingVenue.length} team${teamsUsingVenue.length === 1 ? '' : 's'}. Please reassign or delete these teams first.`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this venue?')) {
      return;
    }
    
    try {
      setLoading(true);
      await deleteVenue(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting venue:', error);
      setError('Failed to delete venue');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVenue = async () => {
    if (!currentVenue.name) {
      setError('Venue name is required');
      return;
    }
    
    try {
      setLoading(true);
      if (isEditing && currentVenue.id) {
        await updateVenue(currentVenue.id, currentVenue);
      } else {
        await createVenue(currentVenue);
      }
      
      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error('Error saving venue:', error);
      setError('Failed to save venue');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (venueId: string) => {
    setExpandedVenue(expandedVenue === venueId ? null : venueId);
  };

  const getTeamsForVenue = (venueId: string) => {
    return teams.filter(team => team.homeVenueId === venueId);
  };

  const handleTeamClick = (teamId: string) => {
    navigate(`/admin/teams?selected=${teamId}`);
  };

  return (
    <Container maxWidth="md">
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
            Manage Venues
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add Venue
          </Button>
        </Box>
        
        {loading && !openDialog ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error && !openDialog ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : venues.length === 0 ? (
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No venues found. Add one to get started.</Typography>
          </Paper>
        ) : (
          <Paper elevation={3}>
            <List>
              {venues.map((venue) => {
                const venueTeams = getTeamsForVenue(venue.id!);
                const isExpanded = expandedVenue === venue.id;
                
                return (
                  <React.Fragment key={venue.id}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <IconButton 
                            edge="end" 
                            aria-label="expand"
                            onClick={() => handleToggleExpand(venue.id!)}
                            sx={{ mr: 1 }}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            aria-label="edit" 
                            onClick={() => handleOpenEditDialog(venue)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            edge="end" 
                            aria-label="delete" 
                            onClick={() => handleDeleteVenue(venue.id!)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                      divider
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center">
                            <Typography variant="subtitle1" component="span">
                              {venue.name}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ ml: 2 }}
                            >
                              ({venueTeams.length} {venueTeams.length === 1 ? 'team' : 'teams'})
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography component="span" variant="body2">
                              {venue.address}
                            </Typography>
                            <br />
                            <Typography component="span" variant="body2">
                              Contact: {venue.contact}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ pl: 4, pr: 2, py: 1, bgcolor: 'background.default' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Teams at this venue:
                        </Typography>
                        {venueTeams.length > 0 ? (
                          <List dense>
                            {venueTeams.map((team) => (
                              <ListItemButton
                                key={team.id}
                                onClick={() => handleTeamClick(team.id!)}
                                sx={{
                                  borderRadius: 1,
                                  '&:hover': {
                                    backgroundColor: 'action.hover',
                                  }
                                }}
                              >
                                <ListItemText 
                                  primary={team.name}
                                  primaryTypographyProps={{
                                    sx: { color: 'primary.main' }
                                  }}
                                />
                                <ChevronRightIcon color="action" fontSize="small" />
                              </ListItemButton>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No teams currently use this venue as their home venue.
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        )}
        
        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>
            {isEditing ? 'Edit Venue' : 'Add New Venue'}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  name="name"
                  label="Venue Name"
                  fullWidth
                  value={currentVenue.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="address"
                  label="Address"
                  fullWidth
                  value={currentVenue.address}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="contact"
                  label="Contact Information"
                  fullWidth
                  value={currentVenue.contact}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSaveVenue} 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ManageVenues;