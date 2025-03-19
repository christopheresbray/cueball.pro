import React, { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import { updateTeamCaptain } from '../../scripts/updateTeamCaptain';

interface FixCaptainButtonProps {
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

const FixCaptainButton: React.FC<FixCaptainButtonProps> = ({ 
  variant = 'contained', 
  color = 'primary' 
}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const handleFixCaptain = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      const result = await updateTeamCaptain();
      if (result) {
        setSuccess(true);
        setOpen(true);
      } else {
        setError('Failed to update team captain');
        setOpen(true);
      }
    } catch (err) {
      console.error('Error fixing captain:', err);
      setError('An unexpected error occurred');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        color={color}
        onClick={handleFixCaptain}
        disabled={loading}
      >
        {loading ? 'Updating...' : 'Fix Team Captain'}
      </Button>
      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert 
          onClose={handleClose} 
          severity={success ? 'success' : 'error'} 
          sx={{ width: '100%' }}
        >
          {success 
            ? 'Captain updated successfully! Your account should now be recognized as the team captain.' 
            : `Error: ${error}`}
        </Alert>
      </Snackbar>
    </>
  );
};

export default FixCaptainButton; 