import React, { useState, MouseEvent, useEffect } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  ListItemButton,
  FormControl,
  Select,
  InputLabel,
  SelectChangeEvent
} from '@mui/material';
import {
  Menu as MenuIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  LockPerson as LockPersonIcon,
  Sports as SportsIcon,
  BarChart as BarChartIcon,
  Event as EventIcon,
  ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Team, getCurrentSeason, getTeams } from '../../services/databaseService';
import logo from '../../assets/Hills8BallLogo.png';

const Header: React.FC = () => {
  const { user, userRole, logout, isAdmin, setImpersonatedTeam, impersonatedTeam } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  useEffect(() => {
    const loadTeams = async () => {
      if (isAdmin) {
        try {
          const currentSeason = await getCurrentSeason();
          if (currentSeason) {
            const fetchedTeams = await getTeams(currentSeason.id);
            console.log('Fetched teams:', fetchedTeams);
            setTeams(fetchedTeams);
          }
        } catch (error) {
          console.error('Error loading teams:', error);
        }
      }
    };
    loadTeams();
  }, [isAdmin]);

  useEffect(() => {
    setSelectedTeamId(impersonatedTeam?.id || '');
  }, [impersonatedTeam]);

  const handleTeamChange = (event: SelectChangeEvent<string>) => {
    const teamId = event.target.value;
    console.log('Team selected:', teamId);
    if (teamId === '') {
      setImpersonatedTeam(null);
    } else {
      const selectedTeam = teams.find(team => team.id === teamId);
      if (selectedTeam) {
        console.log('Setting impersonated team:', selectedTeam);
        setImpersonatedTeam(selectedTeam);
      }
    }
  };

  const handleMenuOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { text: 'Home', path: '/' },
    { text: 'Standings', path: '/standings' },
    { text: 'Fixtures', path: '/fixtures' },
    { text: 'Players', path: '/players' },
  ];

  const adminItems = [
    { text: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
    { text: 'Teams', path: '/admin/teams', icon: <SportsIcon /> },
    { text: 'Players', path: '/admin/players', icon: <PersonIcon /> },
    { text: 'Venues', path: '/admin/venues', icon: <EventIcon /> },
    { text: 'Schedule', path: '/admin/schedule', icon: <BarChartIcon /> },
  ];

  const teamItems = [
    { text: 'Team Dashboard', path: '/team', icon: <DashboardIcon /> },
    { text: 'Team Roster', path: '/team/roster', icon: <PersonIcon /> },
  ];

  const renderMobileMenu = () => (
    <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerToggle}>
      <Box sx={{ width: 250 }} role="presentation" onClick={handleDrawerToggle}>
        <List>
          {navItems.map((item) => (
            <ListItemButton key={item.text} component={RouterLink} to={item.path} selected={isActive(item.path)}>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>

        <Divider />

        {user ? (
          <>
            <List>
              <ListItem>
                <ListItemText primary={`Hello, ${user.email || "Guest"}`} secondary={`Role: ${userRole}`} />
              </ListItem>

              {userRole === 'admin' && (
                <>
                  <ListItem><ListItemText primary="Admin" sx={{ fontWeight: 'bold' }} /></ListItem>
                  {adminItems.map((item) => (
                    <ListItemButton key={item.text} component={RouterLink} to={item.path} selected={isActive(item.path)}>
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  ))}
                </>
              )}

              <Divider />
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon><ExitToAppIcon /></ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </List>
          </>
        ) : (
          <List>
            <ListItemButton component={RouterLink} to="/login">
              <ListItemIcon><LockPersonIcon /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItemButton>
          </List>
        )}
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}

          <Box
            component="img"
            src={logo}
            alt="Hills 8 Ball Logo"
            sx={{
              height: 40,
              cursor: 'pointer',
              mr: 2
            }}
            onClick={() => navigate('/')}
          />

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {navItems.map((item) => (
                <Button
                  key={item.text}
                  component={RouterLink}
                  to={item.path}
                  color="inherit"
                  sx={{
                    backgroundColor: isActive(item.path)
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'transparent',
                  }}
                >
                  {item.text}
                </Button>
              ))}

              {isAdmin && (
                <FormControl 
                  variant="outlined" 
                  size="small" 
                  sx={{ 
                    minWidth: 200,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'white',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                    '& .MuiSelect-icon': {
                      color: 'white',
                    },
                  }}
                >
                  <InputLabel id="team-select-label" sx={{ color: 'white' }}>
                    Impersonate Team
                  </InputLabel>
                  <Select
                    labelId="team-select-label"
                    value={selectedTeamId}
                    onChange={handleTeamChange}
                    label="Impersonate Team"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          )}

          {user ? (
            <>
              <Button
                color="inherit"
                onClick={handleMenuOpen}
                startIcon={<PersonIcon />}
              >
                {user.email}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem disabled>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  {user.email} ({impersonatedTeam ? `Captain of ${impersonatedTeam.name}` : userRole})
                </MenuItem>
                
                {(impersonatedTeam || userRole === 'captain') && (
                  <MenuItem onClick={() => navigate('/team')}>
                    <ListItemIcon>
                      <SportsIcon fontSize="small" />
                    </ListItemIcon>
                    My Team
                  </MenuItem>
                )}

                {userRole === 'admin' && !impersonatedTeam && (
                  <MenuItem onClick={() => navigate('/admin')}>
                    <ListItemIcon>
                      <DashboardIcon fontSize="small" />
                    </ListItemIcon>
                    Admin Dashboard
                  </MenuItem>
                )}

                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <ExitToAppIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              component={RouterLink}
              to="/login"
              startIcon={<LockPersonIcon />}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
      {renderMobileMenu()}
    </>
  );
};

export default Header;
