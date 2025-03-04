// src/components/layout/Header.jsx
import React, { useState } from 'react';
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

const Header = () => {
  const { user, userRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const handleMenuOpen = (event) => {
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
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const renderMobileMenu = () => (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={handleDrawerToggle}
    >
      <Box
        sx={{ width: 250 }}
        role="presentation"
        onClick={handleDrawerToggle}
      >
        <List>
          {navItems.map((item) => (
            <ListItem button key={item.text} component={RouterLink} to={item.path} selected={isActive(item.path)}>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
        
        <Divider />
        
        {user ? (
          <>
            <List>
              <ListItem>
                <ListItemText primary={`Hello, ${user.email}`} secondary={`Role: ${userRole}`} />
              </ListItem>
              
              {userRole === 'admin' && (
                <>
                  <ListItem>
                    <ListItemText primary="Admin" sx={{ fontWeight: 'bold' }} />
                  </ListItem>
                  {adminItems.map((item) => (
                    <ListItem button key={item.text} component={RouterLink} to={item.path} selected={isActive(item.path)}>
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItem>
                  ))}
                </>
              )}
              
              {(userRole === 'admin' || userRole === 'captain') && (
                <>
                  <ListItem>
                    <ListItemText primary="Team" sx={{ fontWeight: 'bold' }} />
                  </ListItem>
                  {teamItems.map((item) => (
                    <ListItem button key={item.text} component={RouterLink} to={item.path} selected={isActive(item.path)}>
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItem>
                  ))}
                </>
              )}
              
              <Divider />
              
              <ListItem button onClick={handleLogout}>
                <ListItemIcon><ExitToAppIcon /></ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItem>
            </List>
          </>
        ) : (
          <List>
            <ListItem button component={RouterLink} to="/login">
              <ListItemIcon><LockPersonIcon /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItem>
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
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
            Hills 8-Ball League
          </Typography>
          
          {!isMobile && (
            <Box sx={{ display: 'flex' }}>
              {navItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  component={RouterLink}
                  to={item.path}
                  sx={{ mx: 1, fontWeight: isActive(item.path) ? 'bold' : 'normal' }}
                >
                  {item.text}
                </Button>
              ))}
              
              {user ? (
                <>
                  <Button
                    color="inherit"
                    onClick={handleMenuOpen}
                    endIcon={<PersonIcon />}
                    sx={{ ml: 2 }}
                  >
                    {user.email.split('@')[0]}
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    {userRole === 'admin' && adminItems.map((item) => (
                      <MenuItem
                        key={item.text}
                        component={RouterLink}
                        to={item.path}
                        onClick={handleMenuClose}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText>{item.text}</ListItemText>
                      </MenuItem>
                    ))}
                    
                    {(userRole === 'admin' || userRole === 'captain') && teamItems.map((item) => (
                      <MenuItem
                        key={item.text}
                        component={RouterLink}
                        to={item.path}
                        onClick={handleMenuClose}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText>{item.text}</ListItemText>
                      </MenuItem>
                    ))}
                    
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                      <ListItemIcon><ExitToAppIcon /></ListItemIcon>
                      <ListItemText>Logout</ListItemText>
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/login"
                  sx={{ ml: 2 }}
                  startIcon={<LockPersonIcon />}
                >
                  Login
                </Button>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {renderMobileMenu()}
    </>
  );
};

export default Header;