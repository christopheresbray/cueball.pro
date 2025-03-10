// src/components/layout/BottomNavigation.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Paper } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

/**
 * A simple bottom navigation bar for Cueball.pro
 * Provides access to Login page and Team Matches
 */
const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  
  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: '#fff', 
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        padding: 2,
        zIndex: 1000
      }}
      elevation={3}
    >
      <Stack 
        direction="row" 
        spacing={2} 
        justifyContent="center"
      >
        <Button 
          variant="outlined" 
          component={Link} 
          to="/"
        >
          Home
        </Button>
        
        {!user ? (
          <Button 
            variant="contained" 
            color="primary" 
            component={Link} 
            to="/login"
          >
            Login
          </Button>
        ) : (
          <>
            {/* Only show for captains and admins */}
            {(userRole === 'captain' || userRole === 'admin') && (
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={() => navigate('/team')}
              >
                Team Dashboard
              </Button>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default BottomNavigation;