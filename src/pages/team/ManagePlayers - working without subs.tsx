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
import { collection, getDocs, query, where, addDoc, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Create an extended player interface for our component's internal use
interface ExtendedPlayer extends Player {
  teamIds: string[];
}

const ManagePlayers: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<ExtendedPlayer[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<ExtendedPlayer>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    userId: '',
    joinDate: Timestamp.now(),
    isActive: true,
    teamIds: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playerTeamMap, setPlayerTeamMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchSeasons();
    fetchPlayerTeamMap();
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

  const fetchPlayerTeamMap = async () => {
    try {
      const teamPlayersSnapshot = await getDocs(collection(db, 'team_players'));
      const tempMap: Record<string, string[]> = {};
      
      teamPlayersSnapshot.forEach(doc => {
        const data = doc.data();
        const playerId = data.playerId;
        const teamId = data.teamId;
        
        if (!tempMap[playerId]) {
          tempMap[playerId] = [];
        }
        
        if (!tempMap[playerId].includes(teamId)) {
          tempMap[playerId].push(teamId);
        }
      });
      
      setPlayerTeamMap(tempMap);
    } catch (error) {
      console.error('Error fetching player team map:', error);
    }
  };

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
      
      // Enhance players with teamIds from our map
      const enhancedPlayers = playersData.map(player => {
        return {
          ...player,
          teamIds: playerTeamMap[player.id || ''] || [teamId]
        } as ExtendedPlayer;
      });
      
      setPlayers(enhancedPlayers);
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
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      userId: '',
      joinDate: Timestamp.now(),
      isActive: true,
      teamIds: [selectedTeamId]
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (player: ExtendedPlayer) => {
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
    
    // For name field, split into firstName and lastName
    if (name === "name") {
      const nameParts = value.trim().split(" ");
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setCurrentPlayer(prev => ({ 
        ...prev, 
        firstName, 
        lastName
      }));
    } else {
      setCurrentPlayer(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDeletePlayer = async (player: ExtendedPlayer) => {
    if (!window.confirm('Are you sure you want to remove this player from the team?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Find the team_player document to delete
      const q = query(
        collection(db, 'team_players'),
        where('playerId', '==', player.id),
        where('teamId', '==', selectedTeamId)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
      }
      
      // Update our player-team map
      const updatedMap = {...playerTeamMap};
      if (updatedMap[player.id || '']) {
        updatedMap[player.id || ''] = updatedMap[player.id || ''].filter(id => id !== selectedTeamId);
        setPlayerTeamMap(updatedMap);
      }
      
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
    // Check if firstName is available, if we're using name for display
    if (!currentPlayer.firstName) {
      setError('Player name is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Extract just the Player data without teamIds
      const playerData: Player = {
        firstName: currentPlayer.firstName,
        lastName: currentPlayer.lastName || '',
        email: currentPlayer.email,
        phone: currentPlayer.phone,
        userId: currentPlayer.userId,
        joinDate: currentPlayer.joinDate,
        isActive: true
      };
      
      if (isEditing && currentPlayer.id) {
        // Only update the player data, not teamIds
        await updatePlayer(currentPlayer.id, playerData);
        
        // Handle team association separately if needed
        if (selectedTeamId && !currentPlayer.teamIds.includes(selectedTeamId)) {
          await addDoc(collection(db, 'team_players'), {
            teamId: selectedTeamId,
            playerId: currentPlayer.id,
            seasonId: selectedSeasonId,
            joinDate: serverTimestamp(),
            isActive: true
          });
          
          // Update our local player-team map
          const updatedMap = {...playerTeamMap};
          if (!updatedMap[currentPlayer.id]) {
            updatedMap[currentPlayer.id] = [];
          }
          updatedMap[currentPlayer.id].push(selectedTeamId);
          setPlayerTeamMap(updatedMap);
        }
      } else {
        // Create new player
        const playerRef = await createPlayer(playerData);
        const playerId = typeof playerRef === 'string' ? playerRef : playerRef.id;
        
        // Create team association
        if (selectedTeamId) {
          await addDoc(collection(db, 'team_players'), {
            teamId: selectedTeamId,
            playerId: playerId,
            seasonId: selectedSeasonId,
            joinDate: serverTimestamp(),
            isActive: true
          });
          
          // Update our local player-team map
          const updatedMap = {...playerTeamMap};
          updatedMap[playerId] = [selectedTeamId];
          setPlayerTeamMap(updatedMap);
        }
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

  // Helper function to display player name
  const getPlayerName = (player: Player | ExtendedPlayer): string => {
    return `${player.firstName} ${player.lastName}`.trim();
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
                    primary={getPlayerName(player)}
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
                  value={`${currentPlayer.firstName} ${currentPlayer.lastName}`.trim()}
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