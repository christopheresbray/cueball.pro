// src/components/common/CaptainActionButton.tsx
import React from 'react';
import { Fab, Tooltip, Zoom } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SportsIcon from '@mui/icons-material/Sports';

/**
 * Floating action button that appears for team captains to quickly
 * navigate to match result entry.
 */
const CaptainActionButton: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  
  // Only show for captains and admins
  if (!user || (userRole !== 'captain' && userRole !== 'admin')) {
    return null;
  }
  
  return (
    <Zoom in={true}>
      <Tooltip title="Enter match results" placement="left">
        <Fab 
          color="secondary" 
          aria-label="enter match results"
          onClick={() => navigate('/team/matches')}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000
          }}
        >
          <SportsIcon />
        </Fab>
      </Tooltip>
    </Zoom>
  );
};

export default CaptainActionButton;