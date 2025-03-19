import React, { useState } from 'react';
import { Container, Typography, Button, Box, Alert, CircularProgress } from '@mui/material';
import { updateTeamCaptain } from '../../scripts/updateTeamCaptain';

const UpdateCaptain: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateCaptain = async () => {
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const result = await updateTeamCaptain();
      if (result) {
        setSuccess(true);
      } else {
        setError('Failed to update team captain.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Update Team Captain
        </Typography>
        
        <Typography paragraph>
          This page allows you to manually update the team captain for BSSC Raiders to the current user ID.
        </Typography>
        
        <Box mt={3} display="flex" justifyContent="center">
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateCaptain}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Update Captain'}
          </Button>
        </Box>
        
        {success && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Team captain updated successfully! The current user should now be recognized as the team captain.
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default UpdateCaptain; 