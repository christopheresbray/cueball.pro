// src/pages/admin/Dashboard.tsx
import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  EmojiEvents as TrophyIcon,
  Event as EventIcon,
  BarChart as StatsIcon,
  AddCircleOutline as AddIcon, 
  Search as SearchIcon,
  CalendarMonth as CalendarIcon,
  LocationOn as VenueIcon,
  Person as PersonIcon,
  Group as TeamIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { 
  Season, 
  Team, 
  Player, 
  Venue, 
  Match,
  League,
  getLeagues,
  getSeasons,
  getTeams,
  getVenues,
  getPlayers,
  getMatches
} from '../../services/databaseService';

import AdminStatsCard from '../../components/admin/AdminStatsCard';
import AdminActionCard from '../../components/admin/AdminActionCard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Admin Overview Dashboard
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Data states
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  
  // Filter state
  const [activeSeasonId, setActiveSeasonId] = useState<string>('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Show snackbar message
  const showMessage = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };
  
  // Fetch initial data
  useEffect(() => {
    // Redirect if not admin
    if (!currentUser && !isAdmin) {
      navigate('/');
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch leagues
        const leaguesData = await getLeagues();
        setLeagues(leaguesData);
        
        // If we have a league, fetch its active season
        if (leaguesData.length > 0) {
          const seasonsData = await getSeasons(leaguesData[0].id!);
          setSeasons(seasonsData);
          
          // Set active season (prefer active one if available)
          const activeSeason = seasonsData.find(s => s.status === 'active');
          if (activeSeason) {
            setActiveSeasonId(activeSeason.id!);
            
            // Fetch teams for this season
            const teamsData = await getTeams(activeSeason.id!);
            setTeams(teamsData);
            
            // Fetch matches for this season
            const matchesData = await getMatches(activeSeason.id!);
            setMatches(matchesData);
            
            // Get upcoming matches
            const upcoming = matchesData
              .filter(match => match.status === 'scheduled' && match.scheduledDate)
              .sort((a, b) => a.scheduledDate!.toDate().getTime() - b.scheduledDate!.toDate().getTime())
              .slice(0, 5);
            setUpcomingMatches(upcoming);
          }
        }
        
        // Fetch venues
        const venuesData = await getVenues();
        setVenues(venuesData);
        
        // Fetch players
        const playersData = await getPlayers();
        setPlayers(playersData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAdmin, navigate, currentUser]);
  
  // Handle season change
  const handleSeasonChange = async (seasonId: string) => {
    try {
      setLoading(true);
      setActiveSeasonId(seasonId);
      
      // Fetch teams for this season
      const teamsData = await getTeams(seasonId);
      setTeams(teamsData);
      
      // Fetch matches for this season
      const matchesData = await getMatches(seasonId);
      setMatches(matchesData);
      
      // Get upcoming matches
      const upcoming = matchesData
        .filter(match => match.status === 'scheduled' && match.scheduledDate)
        .sort((a, b) => a.scheduledDate!.toDate().getTime() - b.scheduledDate!.toDate().getTime())
        .slice(0, 5);
      setUpcomingMatches(upcoming);
      
      setLoading(false);
    } catch (err) {
      console.error('Error changing season:', err);
      setError('Failed to load season data');
      setLoading(false);
    }
  };
  
  // Get team name by ID
  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };
  
  // Get venue name by ID
  const getVenueName = (venueId: string): string => {
    const venue = venues.find(v => v.id === venueId);
    return venue ? venue.name : 'Unknown Venue';
  };
  
  // Format date for display
  const formatMatchDate = (timestamp: Timestamp): string => {
    if (!timestamp) return 'Date TBD';
    
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Quick Stats for Overview tab
  const stats = [
    { title: 'Teams', value: teams.length, icon: <TeamIcon fontSize="large" color="primary" /> },
    { title: 'Players', value: players.length, icon: <PersonIcon fontSize="large" color="secondary" /> },
    { title: 'Venues', value: venues.length, icon: <VenueIcon fontSize="large" color="success" /> },
    { title: 'Matches', value: matches.length, icon: <EventIcon fontSize="large" color="info" /> }
  ];
  
  // Quick Actions for Overview tab
  const actions = [
    { 
      title: 'Create Season', 
      description: 'Start a new season in the league',
      icon: <CalendarIcon fontSize="large" color="primary" />,
      link: '/admin/create-season'
    },
    { 
      title: 'Manage Teams', 
      description: 'Add, edit or remove teams',
      icon: <TeamIcon fontSize="large" color="secondary" />,
      link: '/admin/manage-teams'
    },
    { 
      title: 'Manage Venues', 
      description: 'Update venue information',
      icon: <VenueIcon fontSize="large" color="success" />,
      link: '/admin/manage-venues'
    },
    { 
      title: 'Schedule Matches', 
      description: 'Create the match calendar',
      icon: <EventIcon fontSize="large" color="info" />,
      link: '/admin/schedule-matches'
    }
  ];
  
  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardIcon sx={{ mr: 1 }} />
          Admin Dashboard
        </Typography>
        
        {loading && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        
        {!loading && !error && (
          <>
            {/* Season Selector */}
            {seasons.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="season-select-label">Active Season</InputLabel>
                  <Select
                    labelId="season-select-label"
                    id="season-select"
                    value={activeSeasonId}
                    onChange={(e) => handleSeasonChange(e.target.value)}
                    label="Active Season"
                  >
                    {seasons.map((season) => (
                      <MenuItem key={season.id} value={season.id}>
                        {season.name} {season.status === 'active' ? '(Active)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="admin dashboard tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab icon={<DashboardIcon />} label="Overview" />
                <Tab icon={<PeopleIcon />} label="Players & Teams" />
                <Tab icon={<EventIcon />} label="Matches" />
                <Tab icon={<VenueIcon />} label="Venues" />
                <Tab icon={<StatsIcon />} label="Statistics" />
              </Tabs>
            </Box>
            
            {/* Overview Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                {/* Quick Stats */}
                {stats.map((stat, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <AdminStatsCard 
                      title={stat.title}
                      value={stat.value}
                      icon={stat.icon}
                    />
                  </Grid>
                ))}
                
                {/* Quick Actions */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                    Quick Actions
                  </Typography>
                </Grid>
                
                {actions.map((action, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <AdminActionCard 
                      title={action.title}
                      description={action.description}
                      icon={action.icon}
                      link={action.link}
                    />
                  </Grid>
                ))}
                
                {/* Upcoming Matches */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <EventIcon sx={{ mr: 1 }} />
                      Upcoming Matches
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {upcomingMatches.length === 0 ? (
                      <Alert severity="info">No upcoming matches scheduled</Alert>
                    ) : (
                      <List>
                        {upcomingMatches.map((match) => (
                          <ListItem 
                            key={match.id}
                            secondaryAction={
                              <IconButton edge="end" aria-label="edit" component={RouterLink} to={`/admin/matches/${match.id}`}>
                                <EditIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText
                              primary={`${getTeamName(match.homeTeamId)} vs ${getTeamName(match.awayTeamId)}`}
                              secondary={
                                <>
                                  {formatMatchDate(match.scheduledDate!)}
                                  <br />
                                  Venue: {getVenueName(match.venueId)}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                    
                    <Box sx={{ mt: 2, textAlign: 'right' }}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        component={RouterLink} 
                        to="/admin/schedule-matches"
                        endIcon={<EventIcon />}
                      >
                        Manage Schedule
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
                
                {/* League Summary */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrophyIcon sx={{ mr: 1 }} />
                      League Summary
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Current Season
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {seasons.find(s => s.id === activeSeasonId)?.name || 'None'}
                        </Typography>
                        
                        <Typography variant="subtitle2" color="text.secondary">
                          Status
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {seasons.find(s => s.id === activeSeasonId)?.status || 'N/A'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Teams Participating
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {teams.length}
                        </Typography>
                        
                        <Typography variant="subtitle2" color="text.secondary">
                          Matches Scheduled
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {matches.length}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2, textAlign: 'right' }}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        component={RouterLink} 
                        to="/admin/create-season"
                        endIcon={<AddIcon />}
                      >
                        Manage Seasons
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Players & Teams Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                {/* Search Bar */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <TextField
                      fullWidth
                      placeholder="Search players or teams..."
                      variant="outlined"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Paper>
                </Grid>
                
                {/* Teams List */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <TeamIcon sx={{ mr: 1 }} />
                        Teams
                      </Typography>
                      
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/admin/manage-teams"
                        size="small"
                      >
                        Add Team
                      </Button>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <List>
                      {teams
                        .filter(team => 
                          team.name.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((team) => (
                          <ListItem 
                            key={team.id}
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                aria-label="edit" 
                                component={RouterLink} 
                                to={`/admin/teams/${team.id}`}
                              >
                                <EditIcon />
                              </IconButton>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {team.name.charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={team.name}
                              secondary={`${team.playerIds?.length || 0} players`}
                            />
                          </ListItem>
                        ))}
                    </List>
                    
                    {teams.length === 0 && (
                      <Alert severity="info">No teams found for this season</Alert>
                    )}
                  </Paper>
                </Grid>
                
                {/* Players List */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1 }} />
                        Players
                      </Typography>
                      
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/admin/manage-players"
                        size="small"
                      >
                        Add Player
                      </Button>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <List>
                      {players
                        .filter(player => 
                          `${player.name}`.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .slice(0, 10) // Limit to 10 players
                        .map((player) => (
                          <ListItem 
                            key={player.id}
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                aria-label="edit" 
                                component={RouterLink} 
                                to={`/admin/players/${player.id}`}
                              >
                                <EditIcon />
                              </IconButton>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar>
                                {player.name.charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={player.name}
                              secondary={
                                player.email
                              }
                            />
                          </ListItem>
                        ))}
                    </List>
                    
                    {players.length === 0 && (
                      <Alert severity="info">No players found</Alert>
                    )}
                    
                    {players.length > 10 && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button 
                          variant="outlined" 
                          component={RouterLink} 
                          to="/admin/manage-players"
                        >
                          View All Players
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Matches Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                {/* Quick Actions */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">Match Management</Typography>
                      
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/admin/schedule-matches"
                      >
                        Schedule Matches
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
                
                {/* Matches List */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">Season Matches</Typography>
                      
                      <TextField
                        placeholder="Search matches..."
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <List>
                      {matches
                        .filter(match => 
                          getTeamName(match.homeTeamId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getTeamName(match.awayTeamId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getVenueName(match.venueId).toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .slice(0, 10) // Limit to 10 matches
                        .map((match) => (
                          <ListItem 
                            key={match.id}
                            secondaryAction={
                              <Box>
                                <IconButton 
                                  edge="end" 
                                  aria-label="edit" 
                                  component={RouterLink} 
                                  to={`/admin/matches/${match.id}`}
                                  sx={{ mr: 1 }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Box>
                            }
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: match.status === 'completed' ? 'success.light' : 'primary.light' }}>
                                {match.status === 'completed' ? <CheckIcon /> : <EventIcon />}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={`${getTeamName(match.homeTeamId)} vs ${getTeamName(match.awayTeamId)}`}
                              secondary={
                                <>
                                  {formatMatchDate(match.scheduledDate!)}
                                  <br />
                                  Venue: {getVenueName(match.venueId)}
                                  <br />
                                  Status: <Chip 
                                    size="small" 
                                    label={match.status.charAt(0).toUpperCase() + match.status.slice(1)} 
                                    color={match.status === 'completed' ? 'success' : 'primary'}
                                    variant="outlined"
                                  />
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                    </List>
                    
                    {matches.length === 0 && (
                      <Alert severity="info">No matches found for this season</Alert>
                    )}
                    
                    {matches.length > 10 && (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button 
                          variant="outlined" 
                          component={RouterLink} 
                          to="/admin/schedule-matches"
                        >
                          View All Matches
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Venues Tab */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                {/* Quick Actions */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">Venue Management</Typography>
                      
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/admin/manage-venues"
                      >
                        Add Venue
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
                
                {/* Venues Grid */}
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    {venues.map((venue) => (
                      <Grid item xs={12} sm={6} md={4} key={venue.id}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {venue.name}
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {venue.address}
                            </Typography>
                            
                            <Typography variant="body2">
                              Contact: {venue.contact || 'Not specified'}
                            </Typography>
                          </CardContent>
                          <CardActions>
                            <Button 
                              size="small" 
                              component={RouterLink} 
                              to={`/admin/venues/${venue.id}`}
                              startIcon={<EditIcon />}
                            >
                              Edit
                            </Button>
                            
                            <Button 
                              size="small" 
                              color="primary"
                              component={RouterLink} 
                              to={`/venues/${venue.id}`}
                            >
                              View
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {venues.length === 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>No venues found</Alert>
                  )}
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Statistics Tab */}
            <TabPanel value={tabValue} index={4}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>League Statistics</Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <AdminStatsCard 
                          title="Total Games Played"
                          value={matches.filter(m => m.status === 'completed').length}
                          icon={<EventIcon fontSize="large" color="primary" />}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <AdminStatsCard 
                          title="Active Players"
                          value={players.filter(p => p.isActive).length}
                          icon={<PersonIcon fontSize="large" color="secondary" />}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <AdminStatsCard 
                          title="Venues Used"
                          value={venues.length}
                          icon={<VenueIcon fontSize="large" color="success" />}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                         <AdminStatsCard 
                          title="Teams Participating"
                          value={teams.length}
                          icon={<TeamIcon fontSize="large" color="info" />}
                          />
                      </Grid>
</Grid>

<Box sx={{ mt: 3 }}>
<Typography variant="subtitle1" gutterBottom>
Additional Analytics
</Typography>

<Button 
variant="outlined" 
color="primary" 
component={RouterLink}
to="/admin/statistics"
startIcon={<StatsIcon />}
sx={{ mr: 2 }}
>
Detailed Statistics
</Button>

<Button 
variant="outlined" 
component={RouterLink}
to="/admin/reports"
startIcon={<StatsIcon />}
>
Generate Reports
</Button>
</Box>
</Paper>
</Grid>
</Grid>
</TabPanel>
</>
)}
</Box>

{/* Success/Error Message Snackbar */}
<Snackbar
open={snackbar.open}
autoHideDuration={6000}
onClose={handleCloseSnackbar}
message={snackbar.message}
/>
</Container>
);
};

export default AdminDashboard;