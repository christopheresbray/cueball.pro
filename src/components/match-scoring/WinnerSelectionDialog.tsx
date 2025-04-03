import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box
} from '@mui/material';

interface WinnerSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  homePlayerName: string;
  awayPlayerName: string;
  homePlayerId: string;
  awayPlayerId: string;
  onSelectWinner: (id: string) => void;
  loading: boolean;
}

/**
 * Dialog component for selecting the winner of a frame
 */
const WinnerSelectionDialog: React.FC<WinnerSelectionDialogProps> = ({
  open,
  onClose,
  homePlayerName,
  awayPlayerName,
  homePlayerId,
  awayPlayerId,
  onSelectWinner,
  loading
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="winner-dialog-title"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="winner-dialog-title" sx={{ textAlign: 'center', pb: 0 }}>
        Select Winner
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => onSelectWinner(homePlayerId)}
            disabled={loading}
            sx={{ 
              py: 3,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {homePlayerName}
          </Button>
          
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => onSelectWinner(awayPlayerId)}
            disabled={loading}
            sx={{ 
              py: 3,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {awayPlayerName}
          </Button>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WinnerSelectionDialog; 