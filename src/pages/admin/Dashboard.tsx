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
  Dashboard as DashboardIcon
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
          
          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PeopleIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Teams</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Manage teams and players participating in the league
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary"
                    component={RouterLink}
                    to="/admin/teams"
                  >
                    Manage Teams
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <CalendarIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Schedule</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Create and manage match schedules for seasons
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary" 
                    component={RouterLink} 
                    to="/admin/schedule-matches"
                  >
                    Schedule Matches
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TrophyIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Seasons</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Create and configure league seasons
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary">
                    Manage Seasons
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <VenueIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Venues</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Add and edit venue information
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary"
                    component={RouterLink}
                    to="/admin/venues"
                  >
                    Manage Venues
                  </Button>
                </CardActions>
              </Card>
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