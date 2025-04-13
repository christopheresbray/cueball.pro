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
          </Typography>
          <ul>
            <li>Clear all frame results and match progress</li>
            <li>Reset the current round to 1</li>
            <li>Restore the initial player lineups</li>
            <li>Remove all substitutions and lineup confirmations</li>
            <li>Unlock all rounds</li>
            <li>Reset the match state to "in progress"</li>
          </ul>
        </Alert>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>
          This action will permanently delete all scores and substitutions.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Players will need to replay all frames. Use this option only if there has been a serious scoring error that cannot be fixed by resetting individual frames.
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