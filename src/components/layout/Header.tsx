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
  AccountCircle,
  SportsScore as SportsScoreIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Team, getCurrentSeason, getTeams } from '../../services/databaseService';
import logo from '../../assets/8ball.png';

const Header: React.FC = () => {
  const { user, userRole, logout, isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchor(null);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { text: 'Home', path: '/' },
    { text: 'Live Matches', path: '/live', icon: <SportsScoreIcon /> },
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
              <ListItemIcon>{item.icon || null}</ListItemIcon>
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
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ 
              position: { xs: 'absolute', sm: 'relative' },
              left: { xs: 8, sm: 'auto' },
              mr: 2, 
              display: { sm: 'none' } 
            }}
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexGrow: 1,
            justifyContent: { xs: 'center', sm: 'flex-start' },
            width: '100%'
          }}>
            <Box 
              sx={{ 
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <img 
                src={logo}
                alt="8 Ball Logo" 
                style={{ 
                  width: '120%',
                  height: '120%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }} 
              />
            </Box>
            <Typography variant="h6" component="div">
              CueBall Pro
            </Typography>
          </Box>
          
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            {navItems.map((item) => (
              <Button
                key={item.text}
                color="inherit"
                onClick={() => navigate(item.path)}
                startIcon={item.icon || null}
                sx={{
                  borderBottom: isActive(item.path) ? '2px solid white' : 'none',
                  borderRadius: 0,
                  '&:hover': {
                    borderBottom: '2px solid rgba(255,255,255,0.5)',
                  }
                }}
              >
                {item.text}
              </Button>
            ))}

            {/* Admin navigation */}
            {isAdmin && (
              <Button 
                color="inherit" 
                onClick={() => navigate('/admin')}
                sx={{
                  borderBottom: isActive('/admin') ? '2px solid white' : 'none',
                  borderRadius: 0,
                  '&:hover': {
                    borderBottom: '2px solid rgba(255,255,255,0.5)',
                  }
                }}
              >
                Admin
              </Button>
            )}

            {/* Team navigation */}
            {(userRole === 'captain' || userRole === 'player') && (
              <Button 
                color="inherit" 
                onClick={() => navigate('/team')}
                sx={{
                  borderBottom: isActive('/team') ? '2px solid white' : 'none',
                  borderRadius: 0,
                  '&:hover': {
                    borderBottom: '2px solid rgba(255,255,255,0.5)',
                  }
                }}
              >
                Team
              </Button>
            )}

            {/* User menu */}
            {user ? (
              <>
                <IconButton
                  color="inherit"
                  onClick={handleMenuClick}
                  sx={{ ml: 2 }}
                >
                  <AccountCircle />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                    Profile
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                color="inherit"
                onClick={() => navigate('/login')}
                startIcon={<LockPersonIcon />}
                sx={{
                  borderBottom: isActive('/login') ? '2px solid white' : 'none',
                  borderRadius: 0,
                  '&:hover': {
                    borderBottom: '2px solid rgba(255,255,255,0.5)',
                  }
                }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      {renderMobileMenu()}
      <Toolbar />
    </>
  );
};

export default Header;
