// src/pages/admin/CreateSeason.tsx
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
  Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Timestamp } from 'firebase/firestore';

import { 
  League, 
  Season, 
  getLeagues, 
  createSeason 
} from '../../services/databaseService';

const CreateSeason = () => {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [formData, setFormData] = useState({
    leagueId: '',
    name: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    matchDay: 'wednesday',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const leaguesData = await getLeagues();
        setLeagues(leaguesData);
        if (leaguesData.length > 0) {
          setFormData(prev => ({ ...prev, leagueId: leaguesData[0].id! }));
        }
      } catch (error) {
        console.error('Error fetching leagues:', error);
        setError('Failed to fetch leagues');
      }
    };

    fetchLeagues();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (field) => (date) => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.leagueId || !formData.name || !formData.startDate || !formData.endDate || !formData.matchDay) {
        throw new Error('All fields are required');
      }

      const newSeason: Season = {
        leagueId: formData.leagueId,
        name: formData.name,
        startDate: Timestamp.fromDate(formData.startDate),
        endDate: Timestamp.fromDate(formData.endDate),
        matchDay: formData.matchDay,
        status: 'scheduled',
        teamIds: []
      };

      await createSeason(newSeason);
      navigate('/admin/teams');
    } catch (error) {
      console.error('Error creating season:', error);
      setError(error.message || 'Failed to create season');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Season
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="league-select-label">League</InputLabel>
                  <Select
                    labelId="league-select-label"
                    id="leagueId"
                    name="leagueId"
                    value={formData.leagueId}
                    onChange={handleChange}
                    required
                  >
                    {leagues.map(league => (
                      <MenuItem key={league.id} value={league.id}>
                        {league.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Season Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Summer 2025"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={formData.startDate}
                    onChange={handleDateChange('startDate')}
                    renderInput={(params) => <TextField {...params} fullWidth required />}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={formData.endDate}
                    onChange={handleDateChange('endDate')}
                    renderInput={(params) => <TextField {...params} fullWidth required />}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="match-day-select-label">Match Day</InputLabel>
                  <Select
                    labelId="match-day-select-label"
                    id="matchDay"
                    name="matchDay"
                    value={formData.matchDay}
                    onChange={handleChange}
                    required
                  >
                    <MenuItem value="monday">Monday</MenuItem>
                    <MenuItem value="tuesday">Tuesday</MenuItem>
                    <MenuItem value="wednesday">Wednesday</MenuItem>
                    <MenuItem value="thursday">Thursday</MenuItem>
                    <MenuItem value="friday">Friday</MenuItem>
                    <MenuItem value="saturday">Saturday</MenuItem>
                    <MenuItem value="sunday">Sunday</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Season'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateSeason;