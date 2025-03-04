// src/pages/admin/ManageVenues.tsx
import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

import {
  Venue,
  getVenues,
  createVenue,
  updateVenue,
  deleteVenue
} from '../../services/databaseService';

const ManageVenues: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVenue, setCurrentVenue] = useState<Venue>({
    id: '',
    name: '',
    address: '',
    contact: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const venuesData = await getVenues();
      setVenues(venuesData);
    } catch (error) {
      console.error('Error fetching venues:', error);
      setError('Failed to fetch venues');
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
    if (!window.confirm('Are you sure you want to delete this venue?')) {
      return;
    }
    
    try {
      setLoading(true);
      await deleteVenue(id);
      fetchVenues();
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
      fetchVenues();
    } catch (error) {
      console.error('Error saving venue:', error);
      setError('Failed to save venue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Manage Venues
          </Typography>
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
              {venues.map((venue) => (
                <ListItem
                  key={venue.id}
                  secondaryAction={
                    <Box>
                      <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditDialog(venue)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteVenue(venue.id!)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                  divider
                >
                  <ListItemText
                    primary={venue.name}
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
              ))}
            </List>
          </Paper>
        )}
        
        <Dialog open={openDialog} onClose={