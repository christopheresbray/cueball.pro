// src/pages/admin/ManageTeams.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  SelectChangeEvent
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { 
  Team, 
  Season, 
  Venue, 
  Player,
  getTeams, 
  getSeasons, 
  getVenues,
  getPlayersForTeam,
  updateTeam,
  deleteTeam,
  createTeam,
  getCurrentSeason,
  assignTeamCaptain,
  removeTeamCaptain,
  getTeamPlayersForSeason
} from '../../services/databaseService';
import type { TeamPlayer } from '../../services/databaseService'; // Import TeamPlayer type
import { useNavigate } from 'react-router-dom';

interface EditTeamData {
  id?: string;
  name: string;
  homeVenueId: string;
  seasonId: string;
}

const ManageTeams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [players, setPlayers] = useState<Record<string, Player[]>>({});
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<EditTeamData | null>(null);
  const [playersDialogOpen, setPlayersDialogOpen] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string>('');
  const [currentCaptainUserId, setCurrentCaptainUserId] = useState<string>('');

  const [newTeam, setNewTeam] = useState<Partial<Team>>({
    name: '',
    seasonId: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const currentSeason = await getCurrentSeason();
        if (currentSeason) {
          setSelectedSeason(currentSeason);
          const [fetchedTeams, fetchedVenues, fetchedSeasons] = await Promise.all([
            getTeams(currentSeason.id!),
            getVenues(),
            getSeasons('')
          ]);

          setTeams(fetchedTeams);
          setVenues(fetchedVenues);
          setSeasons(fetchedSeasons);

          // Fetch players for each team
          const playersMap: Record<string, Player[]> = {};
          for (const team of fetchedTeams) {
            if (team.id) {
              const teamPlayers = await getPlayersForTeam(team.id, currentSeason.id!);
              playersMap[team.id] = teamPlayers;
            }
          }
          setPlayers(playersMap);
        }
      } catch (err) {
        setError('Failed to load teams data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleEditTeam = (team: Team) => {
    setSelectedTeam({
      id: team.id,
      name: team.name,
      homeVenueId: team.homeVenueId,
      seasonId: team.seasonId || selectedSeason?.id || ''
    });
    setEditDialogOpen(true);
  };

  const handleDeleteTeam = (team: Team) => {
    setSelectedTeam({
      id: team.id,
      name: team.name,
      homeVenueId: team.homeVenueId,
      seasonId: team.seasonId || selectedSeason?.id || ''
    });
    setDeleteDialogOpen(true);
  };

  const handleViewPlayers = async (teamId: string) => {
    setCurrentTeamId(teamId);
    if (selectedSeason?.id) {
      try {
        const teamPlayers = await getTeamPlayersForSeason(selectedSeason.id);
        const captainEntry = teamPlayers.find(
          tp => tp.teamId === teamId && tp.role === 'captain' && tp.isActive
        );
        if (captainEntry) {
          const captainPlayer = players[teamId]?.find(p => p.id === captainEntry.playerId);
          setCurrentCaptainUserId(captainPlayer?.userId || '');
        } else {
          setCurrentCaptainUserId('');
        }
      } catch (err) {
        console.error("Error fetching team players for captain:", err);
        setCurrentCaptainUserId(''); 
        setError("Could not determine team captain.");
      }
    }
    setPlayersDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!selectedTeam) return;

    try {
      setLoading(true);
      
      if (selectedTeam.id) {
        // Only update the fields that are changing
        const updateData: Partial<Team> = {
          name: selectedTeam.name,
          homeVenueId: selectedTeam.homeVenueId || '',
        };
        await updateTeam(selectedTeam.id, updateData);
      } else {
        // For new teams, create with required fields
        const newTeamData: Partial<Team> = {
          name: selectedTeam.name,
          homeVenueId: selectedTeam.homeVenueId || '',
          seasonId: selectedTeam.seasonId,
        };
        await createTeam(newTeamData as Team);
      }
      
      // Refresh teams list
      if (selectedSeason) {
        const updatedTeams = await getTeams(selectedSeason.id!);
        setTeams(updatedTeams);
      }
      
      setEditDialogOpen(false);
      setSelectedTeam(null);
    } catch (err) {
      setError('Failed to save team');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTeam?.id) return;

    try {
      setLoading(true);
      await deleteTeam(selectedTeam.id);
      
      // Refresh teams list
      if (selectedSeason) {
        const updatedTeams = await getTeams(selectedSeason.id!);
        setTeams(updatedTeams);
      }
      
      setDeleteDialogOpen(false);
      setSelectedTeam(null);
    } catch (err) {
      setError('Failed to delete team');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewTeam = () => {
    setSelectedTeam({
      name: '',
      homeVenueId: venues[0]?.id || '',
      seasonId: selectedSeason?.id || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCaptain = async (teamId: string, newCaptainUserId: string) => {
    if (!selectedSeason?.id) {
      setError("Cannot update captain without a selected season.");
      return;
    }
    const seasonId = selectedSeason.id;
    
    try {
      setLoading(true);
      const teamPlayers = await getTeamPlayersForSeason(seasonId);
      const currentCaptainEntry = teamPlayers.find(
        tp => tp.teamId === teamId && tp.role === 'captain' && tp.isActive
      );
      const currentCaptainPlayerId = currentCaptainEntry?.playerId;
      
      const newCaptainPlayer = players[teamId]?.find(p => p.userId === newCaptainUserId);
      const newCaptainPlayerId = newCaptainPlayer?.id;

      if (currentCaptainPlayerId && currentCaptainPlayerId !== newCaptainPlayerId) {
        const oldCaptainPlayer = players[teamId]?.find(p => p.id === currentCaptainPlayerId);
        if (oldCaptainPlayer?.userId) {
            await removeTeamCaptain(teamId, oldCaptainPlayer.userId, seasonId);
        }
      }
      
      if (newCaptainUserId && newCaptainPlayerId !== currentCaptainPlayerId) {
        await assignTeamCaptain(teamId, newCaptainUserId, seasonId); 
      } else if (!newCaptainUserId && currentCaptainEntry) {
        const oldCaptainPlayer = players[teamId]?.find(p => p.id === currentCaptainEntry.playerId);
        if (oldCaptainPlayer?.userId) {
            await removeTeamCaptain(teamId, oldCaptainPlayer.userId, seasonId);
        }      
      }

      setCurrentCaptainUserId(newCaptainUserId);
      console.log("Captain updated successfully via team_players");
    } catch (error) {
      console.error('Error updating team captain:', error);
      setError('Failed to update team captain');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (teamId: string, updates: Partial<Team>) => {
    try {
      // Remove captainUserId from updates if present
      const { captainUserId, ...validUpdates } = updates as any;
      
      await updateTeam(teamId, validUpdates);

      // Refresh teams list
      const updatedTeams = await getTeams('');
      setTeams(updatedTeams);
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team');
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
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
            Manage Teams
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddNewTeam}
          >
            Add New Team
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Paper elevation={3}>
          <List>
            {teams.map((team) => (
              <React.Fragment key={team.id}>
                <ListItem>
                  <ListItemText
                    primary={team.name}
                    secondary={
                      <>
                        Home Venue: {venues.find(v => v.id === team.homeVenueId)?.name || 'Not set'}
                        <br />
                        Players: {players[team.id!]?.length || 0}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="view players"
                      onClick={() => handleViewPlayers(team.id!)}
                      sx={{ mr: 1 }}
                    >
                      <PersonIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="edit"
                      onClick={() => handleEditTeam(team)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleDeleteTeam(team)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {/* Edit Team Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedTeam?.id ? 'Edit Team' : 'Add New Team'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Team Name"
                  value={selectedTeam?.name || ''}
                  onChange={(e) => setSelectedTeam(prev => prev ? {...prev, name: e.target.value} : null)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Home Venue</InputLabel>
                  <Select
                    value={selectedTeam?.homeVenueId || ''}
                    label="Home Venue"
                    onChange={(e: SelectChangeEvent<string>) => {
                      const value = e.target.value;
                      setSelectedTeam(prev => prev ? {...prev, homeVenueId: value} : null);
                    }}
                  >
                    {venues.map((venue) => (
                      <MenuItem key={venue.id} value={venue.id || ''}>
                        {venue.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveTeam} 
              variant="contained" 
              color="primary"
              disabled={!selectedTeam?.name || !selectedTeam?.homeVenueId}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Team</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {selectedTeam?.name}? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Players Dialog */}
        <Dialog open={playersDialogOpen} onClose={() => setPlayersDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Team Players</DialogTitle>
          <DialogContent>
            {currentTeamId && players[currentTeamId] && (
              <>
                <Box sx={{ mb: 3, mt: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Team Captain</InputLabel>
                    <Select
                      value={currentCaptainUserId}
                      label="Team Captain"
                      onChange={(e) => handleUpdateCaptain(currentTeamId, e.target.value)}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {players[currentTeamId]?.map((player) => (
                        <MenuItem key={player.id} value={player.userId || ''}>
                          {player.firstName} {player.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <List>
                  {players[currentTeamId].map((player) => (
                    <ListItem key={player.id}>
                      <ListItemText
                        primary={`${player.firstName} ${player.lastName}`}
                        secondary={
                          <>
                            {player.email}
                            {currentCaptainUserId === player.userId && (
                              <Typography component="span" sx={{ ml: 1, color: 'primary.main' }}>
                                (Captain)
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPlayersDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ManageTeams;
