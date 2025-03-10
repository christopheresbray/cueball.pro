// src/components/SimpleNavigation.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Stack } from '@mui/material';

const SimpleNavigation: React.FC = () => {
  return (
    <Box 
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
    >
      <Stack 
        direction="row" 
        spacing={2} 
        justifyContent="center"
      >
        <Button 
          variant="contained" 
          color="primary" 
          component={Link} 
          to="/login"
        >
          Login
        </Button>
        
        <Button 
          variant="contained" 
          color="secondary" 
          component={Link} 
          to="/team/matches"
        >
          Captain Area
        </Button>
        
        <Button 
          variant="outlined" 
          component={Link} 
          to="/"
        >
          Home
        </Button>
      </Stack>
    </Box>
  );
};

export default SimpleNavigation;