import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { getFirestore, collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Season, getSeasons, League, getLeagues } from '../../services/databaseService';

const SeasonManager: React.FC = () => {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

  useEffect(() => {
    fetchLeagues();
  }, []);

  useEffect(() => {
    if (selectedLeagueId) {
      fetchSeasons();
    }
  }, [selectedLeagueId]);

  const fetchLeagues = async () => {
    try {
      const leaguesData = await getLeagues();
      setLeagues(leaguesData);
      if (leaguesData.length > 0) {
        setSelectedLeagueId(leaguesData[0].id!);
      }
    } catch (err) {
      console.error('Error fetching leagues:', err);
      setError('Failed to fetch leagues');
    }
  };

  const fetchSeasons = async () => {
    if (!selectedLeagueId) return;
    
    try {
      const seasonsData = await getSeasons(selectedLeagueId);
      setSeasons(seasonsData);
    } catch (err) {
      console.error('Error fetching seasons:', err);
      setError('Failed to fetch seasons');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueChange = (event: SelectChangeEvent<string>) => {
    setSelectedLeagueId(event.target.value);
    setLoading(true);
  };

  const handleDeleteClick = (season: Season) => {
    setSelectedSeason(season);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSeason?.id) return;
    
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, 'seasons', selectedSeason.id));
      setSeasons(seasons.filter(s => s.id !== selectedSeason.id));
      setDeleteDialogOpen(false);
      setSelectedSeason(null);
    } catch (err) {
      console.error('Error deleting season:', err);
      setError('Failed to delete season');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Manage Seasons
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/seasons/create')}
          >
            Create New Season
          </Button>
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="league-select-label">Select League</InputLabel>
          <Select
            labelId="league-select-label"
            id="league-select"
            value={selectedLeagueId}
            label="Select League"
            onChange={handleLeagueChange}
          >
            {leagues.map((league) => (
              <MenuItem key={league.id} value={league.id}>
                {league.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3}>
          <List>
            {seasons.map((season) => (
              <ListItem key={season.id} divider>
                <ListItemText
                  primary={season.name}
                  secondary={`Start: ${season.startDate?.toDate().toLocaleDateString()} | End: ${season.endDate?.toDate().toLocaleDateString()} | Status: ${season.status}`}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    onClick={() => navigate(`/admin/seasons/edit/${season.id}`)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDeleteClick(season)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Season</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this season? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SeasonManager; 