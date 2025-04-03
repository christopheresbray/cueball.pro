import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
  Typography,
  CircularProgress
} from '@mui/material';

interface ResetConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

/**
 * Dialog component for confirming match reset
 */
const ResetConfirmationDialog: React.FC<ResetConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="reset-match-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="reset-match-dialog-title" sx={{ bgcolor: 'error.main', color: 'white' }}>
        Reset Match Results
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Warning: This action cannot be undone</AlertTitle>
          <Typography variant="body2">
            Resetting the match will:
            <ul>
              <li>Clear all frame results</li>
              <li>Reset the round to 1</li>
              <li>Keep the initial lineups intact</li>
              <li>Remove all substitutions</li>
            </ul>
          </Typography>
        </Alert>
        <Typography>
          Are you sure you want to reset all match results?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color="error"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Resetting...' : 'Reset Match'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResetConfirmationDialog; 