// src/components/layout/QuickAccessFooter.tsx
import React from 'react';
import { Paper, Button, Box, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import SportsIcon from '@mui/icons-material/Sports';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';

/**
 * A footer with quick navigation buttons that integrates with your authentication system
 */
const QuickAccessFooter: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // Determine which buttons to show based on screen size and user role
  const getButtonsToDisplay = () => {
    const buttons = [];
    
    // Home button is always visible
    buttons.push(
      <Button 
        key="home"
        variant="outlined"
        size={isMobile ? "small" : "medium"}
        startIcon={<HomeIcon />}
        onClick={() => navigate('/')}
      >
        {!isMobile && "Home"}
      </Button>
    );
    
    // Standings button
    if (!isMobile || !user) {
      buttons.push(
        <Button 
          key="standings"
          variant="outlined"
          size={isMobile ? "small" : "medium"}
          startIcon={<LeaderboardIcon />}
          onClick={() => navigate('/standings')}
        >
          {!isMobile && "Standings"}
        </Button>
      );
    }
    
    // Login/Logout button
    if (!user) {
      buttons.push(
        <Button 
          key="login"
          variant="contained" 
          color="primary"
          size={isMobile ? "small" : "medium"}
          startIcon={<LoginIcon />}
          onClick={() => navigate('/login')}
        >
          {!isMobile ? "Login" : ""}
        </Button>
      );
    } else {
      buttons.push(
        <Button 
          key="logout"
          variant="outlined"
          color="error"
          size={isMobile ? "small" : "medium"}
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          {!isMobile && "Logout"}
        </Button>
      );
    }
    
    // Admin Dashboard - Only visible to admins
    if (user && userRole === 'admin') {
      buttons.push(
        <Button 
          key="admin"
          variant="contained"
          color="primary"
          size={isMobile ? "small" : "medium"}
          startIcon={<DashboardIcon />}
          onClick={() => navigate('/admin')}
        >
          {!isMobile && "Admin"}
        </Button>
      );
    }
    
    // Match Entry - Only visible to captains and admins
    if (user && (userRole === 'captain' || userRole === 'admin')) {
      buttons.push(
        <Button 
          key="results"
          variant="contained"
          color="secondary"
          size={isMobile ? "small" : "medium"}
          startIcon={<SportsIcon />}
          onClick={() => navigate('/team/matches')}
        >
          {!isMobile && "Enter Results"}
        </Button>
      );
    }
    
    return buttons;
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: isMobile ? 1 : 2,
        zIndex: 1000,
        borderTop: '1px solid rgba(0,0,0,0.1)',
        backgroundColor: 'rgba(30,30,30,0.9)',
        backdropFilter: 'blur(10px)'
      }}
      elevation={3}
    >
      <Box sx={{ 
        display: 'flex', 
        gap: isMobile ? 1 : 2, 
        maxWidth: 800, 
        width: '100%', 
        justifyContent: 'space-around' 
      }}>
        {getButtonsToDisplay()}
      </Box>
    </Paper>
  );
};

export default QuickAccessFooter;