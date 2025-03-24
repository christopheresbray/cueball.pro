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
  SportsBar as SportsBarIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Team, getCurrentSeason, getTeams } from '../../services/databaseService';
import logo from '../../assets/Hills8BallLogo.png';

const Header: React.FC = () => {
  const { user, userRole, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
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
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Typography variant="h6" noWrap component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                <SportsBarIcon sx={{ mr: 1 }} />
                Cueball.pro
              </Typography>
            </RouterLink>
          </Box>

          {!isMobile && (
            <Box sx={{ ml: 4, display: 'flex', gap: 2 }}>
              <Button color="inherit" component={RouterLink} to="/">
                HOME
              </Button>
              <Button color="inherit" component={RouterLink} to="/standings">
                STANDINGS
              </Button>
              <Button color="inherit" component={RouterLink} to="/fixtures">
                FIXTURES
              </Button>
              <Button color="inherit" component={RouterLink} to="/players">
                PLAYERS
              </Button>
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

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
                  {user.email} ({userRole})
                </MenuItem>
                
                {userRole === 'captain' && (
                  <MenuItem onClick={() => navigate('/team')}>
                    <ListItemIcon>
                      <SportsIcon fontSize="small" />
                    </ListItemIcon>
                    My Team
                  </MenuItem>
                )}

                {userRole === 'admin' && (
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
