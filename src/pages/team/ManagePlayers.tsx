// src/pages/admin/ManagePlayers.tsx
import React, { useState, useEffect } from 'react';
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
  SelectChangeEvent,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';

import {
  Player,
  Team,
  Season,
  getSeasons,
  getTeams,
  getPlayers,
  createPlayer,
  updatePlayer
} from '../../services/databaseService';

const ManagePlayers: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player>({
    id: '',
    name: '',
    email: '',
    phone: '',
    teamIds: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchTeams(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchPlayers(selectedTeamId);
    }
  }, [selectedTeamId]);

  const fetchSeasons = async () => {
    setLoading(true);
    try {
      const seasonsData = await getSeasons('');
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

  const fetchTeams = async (seasonId: string) => {
    setLoading(true);
    try {
      const teamsData = await getTeams(seasonId);
      setTeams(teamsData);
      
      if (teamsData.length > 0) {
        setSelectedTeamId(teamsData[0].id!);
      } else {
        setSelectedTeamId('');
        setPlayers([]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async (teamId: string) => {
    setLoading(true);
    try {
      const playersData = await getPlayers(teamId);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonChange = (e: SelectChangeEvent) => {
    setSelectedSeasonId(e.target.value);
  };

  const handleTeamChange = (e: SelectChangeEvent) => {
    setSelectedTeamId(e.target.value);
  };

  const handleOpenAddDialog = () => {
    setCurrentPlayer({
      id: '',
      name: '',
      email: '',
      phone: '',
      teamIds: [selectedTeamId]
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

  const handleDeletePlayer = async (player: Player) => {
    if (!window.confirm('Are you sure you want to remove this player from the team?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Remove the current team ID from the player's teamIds array
      const updatedTeamIds = player.teamIds.filter(id => id !== selectedTeamId);
      
      // Update the player with the new teamIds
      await updatePlayer(player.id!, { teamIds: updatedTeamIds });
      
      // Refresh the players list
      fetchPlayers(selectedTeamId);
    } catch (error) {
      console.error('Error removing player from team:', error);
      setError('Failed to remove player from team');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlayer = async () => {
    if (!currentPlayer.name) {
      setError('Player name is required');
      return;
    }
    
    if (selectedTeamId && !currentPlayer.teamIds.includes(selectedTeamId)) {
      currentPlayer.teamIds.push(selectedTeamId);
    }
    
    try {
      setLoading(true);
      if (isEditing && currentPlayer.id) {
        await updatePlayer(currentPlayer.id, currentPlayer);
      } else {
        await createPlayer(currentPlayer);
      }
      
      handleCloseDialog();
      fetchPlayers(selectedTeamId);
    } catch (error) {
      console.error('Error saving player:', error);
      setError('Failed to save player');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Players
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
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
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={teams.length === 0}>
                <InputLabel id="team-select-label">Select Team</InputLabel>
                <Select
                  labelId="team-select-label"
                  value={selectedTeamId}
                  onChange={handleTeamChange}
                  label="Select Team"
                >
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
        
        {teams.length > 0 && selectedTeamId && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              {teams.find(t => t.id === selectedTeamId)?.name} Players
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
        )}
        
        {loading && !openDialog ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error && !openDialog ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : teams.length === 0 ? (
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No teams found in this season. Add teams first.</Typography>
          </Paper>
        ) : !selectedTeamId ? (
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Please select a team to manage its players.</Typography>
          </Paper>
        ) : players.length === 0 ? (
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No players found in this team. Add players to get started.</Typography>
          </Paper>
        ) : (
          <Paper elevation={3}>
            <List>
              {players.map((player) => (
                <ListItem
                  key={player.id}
                  secondaryAction={
                    <Box>
                      <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditDialog(player)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDeletePlayer(player)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                  divider
                >
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
                        {player.teamIds.length > 1 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Also plays for:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {player.teamIds
                                .filter(id => id !== selectedTeamId)
                                .map(teamId => {
                                  const team = teams.find(t => t.id === teamId);
                                  return team ? (
                                    <Chip 
                                      key={teamId} 
                                      label={team.name} 
                                      size="small" 
                                      variant="outlined" 
                                    />
                                  ) : null;
                                })}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
        
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {isEditing ? 'Edit Player' : 'Add New Player'}
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
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  fullWidth
                  value={currentPlayer.phone}
                  onChange={handleInputChange}
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

export default ManagePlayers;