// src/pages/admin/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  EmojiEvents as TrophyIcon,
  LocationOn as VenueIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  CalendarMonth as CalendarMonthIcon,
  EmojiEvents as EmojiEventsIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import MenuCard from '../../components/admin/MenuCard';

const AdminDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    // Verify admin status
    if (!isAdmin) {
      setError('You do not have admin privileges to access this page');
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        
        {/* Admin Overview */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" gutterBottom>
              League Administration
            </Typography>
            <DashboardIcon color="primary" fontSize="large" />
          </Box>
          
          <Typography variant="body1" paragraph>
            Welcome to the Cueball.pro administrator dashboard. From here, you can manage leagues, seasons, teams, players, venues, and schedule matches.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <MenuCard
                title="Teams"
                description="Manage teams and players"
                icon={<GroupsIcon fontSize="large" />}
                onClick={() => navigate('/admin/teams')}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <MenuCard
                title="Schedule"
                description="Create and manage match schedules"
                icon={<CalendarMonthIcon fontSize="large" />}
                onClick={() => navigate('/admin/schedule-matches')}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <MenuCard
                title="Seasons"
                description="Configure league seasons"
                icon={<EmojiEventsIcon fontSize="large" />}
                onClick={() => navigate('/admin/seasons')}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <MenuCard
                title="Venues"
                description="Add and edit venue information"
                icon={<LocationOnIcon fontSize="large" />}
                onClick={() => navigate('/admin/venues')}
              />
            </Grid>
          </Grid>
        </Paper>
        
        {/* Quick Actions */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                component={RouterLink} 
                to="/admin/schedule-matches"
                sx={{ py: 2 }}
              >
                Schedule Matches
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button variant="contained" color="secondary" fullWidth sx={{ py: 2 }}>
                Add New Team
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button variant="contained" color="info" fullWidth sx={{ py: 2 }}>
                Add New Player
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button variant="contained" color="success" fullWidth sx={{ py: 2 }}>
                Create New Season
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Recent Activity */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <List>
            <ListItem>
              <ListItemText 
                primary="Scheduled matches for Spring 2025 Season" 
                secondary="Today, 2:30 PM" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Added 2 new players to BSSC Raiders" 
                secondary="Yesterday, 4:15 PM" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Updated venue information for The Cue Club" 
                secondary="March 13, 2025, 10:00 AM" 
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Created Spring 2025 Season" 
                secondary="March 10, 2025, 1:45 PM" 
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminDashboard;