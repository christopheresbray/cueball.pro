// src/components/layout/NavigationButtons.tsx
import React from 'react';
import { Button, Box, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginIcon from '@mui/icons-material/Login';
import SportsIcon from '@mui/icons-material/Sports';
import SportsBarIcon from '@mui/icons-material/SportsBar';

/**
 * Component that provides navigation buttons to key functionality
 * - Login button for non-authenticated users
 * - Match Entry button for captains
 */
const NavigationButtons: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {/* Login Button - Only visible when not logged in */}
      {!user && (
        <Tooltip title="Sign in to your account">
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<LoginIcon />}
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        </Tooltip>
      )}

      {/* Match Results Button - Only visible to captains and admins */}
      {user && (userRole === 'captain' || userRole === 'admin') && (
        <Tooltip title="Enter match results">
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<SportsIcon />}
            onClick={() => navigate('/team/matches')}
          >
            Enter Results
          </Button>
        </Tooltip>
      )}

      {/* My Team Button - Only visible to captains, admins, and players */}
      {user && (userRole === 'captain' || userRole === 'admin' || userRole === 'player') && (
        <Tooltip title="View your team">
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<SportsBarIcon />}
            onClick={() => navigate('/team')}
          >
            My Team
          </Button>
        </Tooltip>
      )}
    </Box>
  );
};

export default NavigationButtons;