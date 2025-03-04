// src/pages/team/TeamRoster.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import {
  Team,
  Player,
  getTeams,
  getPlayers,
  createPlayer,
  updatePlayer
} from '../../services/databaseService';

const TeamRoster: React.FC = () => {
  const { user } = useAuth();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player>({
    id: '',
    name: '',
    email: '',
    phone: '',
    teamIds: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchCaptainTeams();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamPlayers(selectedTeam.id!);
    }
  }, [selectedTeam]);

  const fetchCaptainTeams = async () => {
    setLoading(true);
    try {
      // Get all teams where the current user is captain
      const allTeams = await getTeams('');
      const userCaptainTeams = allTeams.filter(team => team.captainId === user?.uid);
      
      setTeams(userCaptainTeams);
      
      // If user is captain of at least one team, select the first one
      if (userCaptainTeams.length > 0) {
        setSelectedTeam(userCaptainTeams[0]);
      } else {
        setLoading(false);
        setError('You are not registered as a captain for any team');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to fetch team data');
      setLoading(false);
    }
  };

  const fetchTeamPlayers = async (teamId: string) => {
    setLoading(true);
    try {
      const playersData = await getPlayers(teamId);
      setPlayers(playersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to fetch players');
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentPlayer({
      id: '',
      name: '',
      email: '',
      phone: '',
      teamIds: selectedTeam ? [selectedTeam.id!] : []
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (player: Player) => {
    setCurrentPlayer({...player});
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentPlayer(prev => ({ ...prev, [name]: value }));
  };

  const handleRemovePlayer = async (player: Player) => {
    if (!selectedTeam || !window.confirm(`Are you sure you want to remove ${player.name} from your team?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Remove the current team ID from the player's teamIds array
      const updatedTeamIds = player.teamIds.filter(id => id !== selectedTeam.id);
      
      // Update the player with the new teamIds
      await updatePlayer(player.id!, { teamIds: updatedTeamIds });
      
      // Refresh the players list
      await fetchTeamPlayers(selectedTeam.id!);
    } catch (error) {
      console.error('Error removing player from team:', error);
      setError('Failed to remove player from team');
      setLoading(false);
    }
  };

  const handleSavePlayer = async () => {
    if (!selectedTeam) {
      setError('No team selected');
      return;
    }
    
    if (!currentPlayer.name.trim()) {
      setError('Player name is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Ensure the player is assigned to the current team
      if (!currentPlayer.teamIds.includes(selectedTeam.id!)) {
        currentPlayer.teamIds.push(selectedTeam.id!);
      }
      
      if (isEditing && currentPlayer.id) {
        await updatePlayer(currentPlayer.id, currentPlayer);
      } else {
        await createPlayer(currentPlayer);
      }
      
      setOpenDialog(false);
      await fetchTeamPlayers(selectedTeam.id!);
    } catch (error) {
      console.error('Error saving player:', error);
      setError('Failed to save player');
      setLoading(false);
    }
  };

  const getPlayerStats = (player: Player) => {
    // In a real implementation, you would fetch the player's statistics
    // For now, we'll return placeholder data
    return {
      played: 0,
      won: 0,
      winPercentage: 0
    };
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Team Roster
        </Typography>
        
        {loading && !openDialog ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : !selectedTeam ? (
          <Alert severity="info">
            You are not registered as a captain for any team. Please contact the league administrator.
          </Alert>
        ) : (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" gutterBottom>
                  {selectedTeam.name}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddDialog}
                >
                  Add Player
                </Button>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Players: {players.length}
              </Typography>
            </Paper>
            
            {players.length === 0 ? (
              <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
                <Typography>No players in your team roster yet. Add players to get started.</Typography>
              </Paper>
            ) : (
              <Paper elevation={3}>
                <List sx={{ width: '100%' }}>
                  {players.map((player) => {
                    const stats = getPlayerStats(player);
                    
                    return (
                      <React.Fragment key={player.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar>
                              <PersonIcon />
                            </Avatar>
                          </ListItemAvatar>
                          
                          <ListItemText
                            primary={player.name}
                            secondary={
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                                {player.email && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <EmailIcon fontSize="small" color="action" />
                                    <Typography variant="body2">{player.email}</Typography>
                                  </Box>
                                )}
                                {player.phone && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PhoneIcon fontSize="small" color="action" />
                                    <Typography variant="body2">{player.phone}</Typography>
                                  </Box>
                                )}
                                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                  <Chip 
                                    label={`Played: ${stats.played}`} 
                                    size="small" 
                                    variant="outlined" 
                                  />
                                  <Chip 
                                    label={`Won: ${stats.won}`} 
                                    size="small" 
                                    variant="outlined" 
                                  />
                                  <Chip 
                                    label={`Win rate: ${stats.winPercentage}%`} 
                                    size="small" 
                                    variant="outlined" 
                                  />
                                </Box>
                              </Box>
                            }
                          />
                          
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditDialog(player)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemovePlayer(player)}>
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        <Divider variant="inset" component="li" />
                      </React.Fragment>
                    );
                  })}
                </List>
              </Paper>
            )}
          </>
        )}
        
        {/* Add/Edit Player Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {isEditing ? 'Edit Player Information' : 'Add New Player'}
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
                  label="Player Name"
                  fullWidth
                  value={currentPlayer.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter player's full name"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="email"
                  label="Email Address"
                  fullWidth
                  value={currentPlayer.email}
                  onChange={handleInputChange}
                  type="email"
                  placeholder="player@example.com"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  fullWidth
                  value={currentPlayer.phone}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSavePlayer} 
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

export default TeamRoster;