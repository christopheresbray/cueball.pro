import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  CircularProgress,
  ListItemButton
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Event as EventIcon,
  Sports as SportsIcon,
  Place as PlaceIcon,
  CalendarMonth as CalendarMonthIcon
} from '@mui/icons-material';

import {
  getLeagues,
  getSeasons,
  getTeams,
  getPlayers,
  getVenues,
  getMatches
} from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    leagues: 0,
    activeSeasons: 0,
    teams: 0,
    players: 0,
    venues: 0,
    matches: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const leagues = await getLeagues();
        const seasons = await getSeasons('');
        const activeSeasons = seasons.filter(s => s.status === 'active');
        const teams = await getTeams('');
        const players = await getPlayers('');
        const venues = await getVenues();
        const matches = await getMatches('');
        
        setStats({
          leagues: leagues.length,
          activeSeasons: activeSeasons.length,
          teams: teams.length,
          players: players.length,
          venues: venues.length,
          matches: matches.length
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setError('Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const quickActions = [
    { text: 'Create Season', path: '/admin/seasons/create', icon: <AddIcon /> },
    { text: 'Manage Teams', path: '/admin/teams', icon: <GroupIcon /> },
    { text: 'Manage Players', path: '/admin/players', icon: <SportsIcon /> },
    { text: 'Manage Venues', path: '/admin/venues', icon: <PlaceIcon /> },
    { text: 'Schedule Matches', path: '/admin/schedule', icon: <CalendarMonthIcon /> }
  ];

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                {quickActions.map((action, index) => (
                  <React.Fragment key={action.text}>
                    <ListItem disablePadding>
                      <ListItemButton component={RouterLink} to={action.path}>
                        <ListItemIcon>{action.icon}</ListItemIcon>
                        <ListItemText primary={action.text} />
                      </ListItemButton>
                    </ListItem>
                    {index < quickActions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </>
        )}
      </Box>
    </Container>
  );
};

export default AdminDashboard;
