// src/components/layout/NavigationBar.tsx
import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box, 
  Menu, 
  MenuItem, 
  Avatar,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import LoginIcon from '@mui/icons-material/Login';
import SportsIcon from '@mui/icons-material/Sports';

const NavigationBar: React.FC = () => {
  const { user, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
    handleClose();
  };

  const navigateTo = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
    handleClose();
  };

  // Navigation links for both desktop and mobile
  const navLinks = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Standings', icon: <LeaderboardIcon />, path: '/standings' },
    { text: 'Fixtures', icon: <CalendarMonthIcon />, path: '/fixtures' },
    { text: 'Players', icon: <PeopleIcon />, path: '/players' }
  ];

  // Drawer content for mobile view
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        Cueball.pro
      </Typography>
      <List>
        {navLinks.map((item) => (
          <ListItem button key={item.text} onClick={() => navigateTo(item.path)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        
        {!user && (
          <ListItem button onClick={() => navigateTo('/login')}>
            <ListItemIcon><LoginIcon /></ListItemIcon>
            <ListItemText primary="Login" />
          </ListItem>
        )}
        
        {user && (userRole === 'captain' || userRole === 'admin') && (
          <ListItem button onClick={() => navigateTo('/team/matches')}>
            <ListItemIcon><SportsIcon /></ListItemIcon>
            <ListItemText primary="Enter Results" />
          </ListItem>
        )}
        
        {user && userRole === 'admin' && (
          <ListItem button onClick={() => navigateTo('/admin')}>
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Admin Dashboard" />
          </ListItem>
        )}
        
        {user && (
          <ListItem button onClick={handleLogout}>
            <ListItemIcon><ExitToAppIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
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
          
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigateTo('/')}
          >
            Cueball.pro
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {navLinks.map((link) => (
                <Button
                  key={link.text}
                  color="inherit"
                  startIcon={link.icon}
                  onClick={() => navigateTo(link.path)}
                >
                  {link.text}
                </Button>
              ))}
              
              {!user ? (
                <Button 
                  color="inherit" 
                  startIcon={<LoginIcon />}
                  variant="outlined" 
                  sx={{ ml: 2 }} 
                  onClick={() => navigateTo('/login')}
                >
                  Login
                </Button>
              ) : (
                <>
                  {(userRole === 'captain' || userRole === 'admin') && (
                    <Button 
                      color="inherit"
                      variant="outlined"
                      startIcon={<SportsIcon />}
                      sx={{ ml: 2 }}
                      onClick={() => navigateTo('/team/matches')}
                    >
                      Enter Results
                    </Button>
                  )}
                  
                  <IconButton
                    size="large"
                    onClick={handleMenu}
                    color="inherit"
                    sx={{ ml: 2 }}
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 
                       user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                  </IconButton>
                  <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                  >
                    <MenuItem onClick={() => navigateTo('/team')}>
                      <ListItemIcon>
                        <PersonIcon fontSize="small" />
                      </ListItemIcon>
                      My Team
                    </MenuItem>
                    
                    {userRole === 'admin' && (
                      <MenuItem onClick={() => navigateTo('/admin')}>
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
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Navigation Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default NavigationBar;