import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Lock as LockIcon,
  Edit as EditIcon
} from '@mui/icons-material';

import { FrameStatus, getFrameStatusColor } from '../../utils/matchUtils';

interface FrameCardProps {
  round: number;
  position: number;
  frameNumber: number;
  status: FrameStatus;
  isHovered: boolean;
  isBreaking: boolean;
  isClickable: boolean;
  homePlayerName: string;
  awayPlayerName: string;
  homePlayerId: string;
  awayPlayerId: string;
  winnerPlayerId: string | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: (event: React.MouseEvent<Element, MouseEvent>) => void;
  onReset: (event: React.MouseEvent<Element, MouseEvent>) => void;
  cueBallImage: string;
  cueBallDarkImage: string;
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
  positionLetter?: string;
  homePositionLabel?: string;
  awayPositionLabel?: string;
  isRoundLocked?: boolean;
  canEdit?: boolean;
}

/**
 * Component that displays a single frame matchup
 */
const FrameCard: React.FC<FrameCardProps> = ({
  round,
  position,
  frameNumber,
  status,
  isHovered,
  isBreaking,
  isClickable,
  homePlayerName,
  awayPlayerName,
  homePlayerId,
  awayPlayerId,
  winnerPlayerId,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onReset,
  cueBallImage,
  cueBallDarkImage,
  isUserHomeTeamCaptain,
  isUserAwayTeamCaptain,
  positionLetter,
  homePositionLabel,
  awayPositionLabel,
  isRoundLocked = false,
  canEdit = false
}) => {
  // Debug log to trace captaincy prop flow
  console.log('FrameCard:', { isUserHomeTeamCaptain, isUserAwayTeamCaptain, homePlayerName, awayPlayerName });

  const theme = useTheme();
  const isScored = !!winnerPlayerId;
  const homeWon = winnerPlayerId === homePlayerId;
  const awayWon = winnerPlayerId === awayPlayerId;
  const isActive = isClickable && status === FrameStatus.ACTIVE;
  
  return (
    <Paper
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        p: { xs: 1.5, md: 2 },
        position: 'relative',
        borderLeft: '4px solid',
        borderColor: getFrameStatusColor(status, theme),
        transition: 'all 0.2s ease',
        opacity: isActive || isScored ? 1 : 0.7,
        ...(isHovered && {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        })
      }}
    >
      {/* Players Row */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        {/* Frame Number - Now displays the FIXED home position label */}
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            minWidth: { xs: '24px', md: '40px' },
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}
        >
          {homePositionLabel}
        </Typography>
        
        {/* Home Player */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flex: 1
        }}>
          <Box sx={winnerPlayerId === homePlayerId ? {
            bgcolor: 'success.main',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1
          } : {}}>
            <Typography noWrap sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>{homePlayerName}</Typography>
          </Box>
          {isBreaking && (
            <Box
              component="img"
              src={theme.palette.mode === 'dark' ? cueBallDarkImage : cueBallImage}
              alt="Break"
              sx={{ width: { xs: 16, md: 20 }, height: { xs: 16, md: 20 }, objectFit: 'contain', flexShrink: 0, ml: 1 }}
            />
          )}
        </Box>
        
        {/* Score/Reset Buttons - Both Mobile and Desktop */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          width: { xs: 'auto', md: '100px' }
        }}>
          {isRoundLocked ? (
            <>
              <IconButton size="small" disabled sx={{ display: { xs: 'flex', md: 'none' }, color: 'text.secondary' }}>
                <LockIcon fontSize="small" />
              </IconButton>
              <Button
                variant="text"
                size="small"
                disabled
                startIcon={<LockIcon fontSize="small" />}
                sx={{ display: { xs: 'none', md: 'flex' }, color: 'text.secondary' }}
              >
                {/* Empty label for lock */}
              </Button>
            </>
          ) : isScored ? (
            canEdit && (
              <>
                {/* Edit button for scored frames if round is not locked */}
                <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                  <Tooltip title="Edit result">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={onClick}
                      sx={{ '&:hover': { bgcolor: 'primary.light' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={onClick}
                    startIcon={<EditIcon fontSize="small" />}
                  >
                    Edit
                  </Button>
                </Box>
              </>
            )
          ) : isActive ? (
            isClickable ? (
              <>
                {/* Score button for unscored frames if round is not locked */}
                <IconButton
                  size="small"
                  color="primary"
                  onClick={onClick}
                  sx={{ 
                    display: { xs: 'flex', md: 'none' },
                    '&:hover': { bgcolor: 'primary.light' }
                  }}
                >
                  <RadioButtonUncheckedIcon fontSize="small" />
                </IconButton>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={onClick}
                  sx={{ display: { xs: 'none', md: 'flex' } }}
                >
                  Score
                </Button>
              </>
            ) : (
              // Show VS label for non-home-captain when frame is active
              <>
                <Typography
                  variant="subtitle2"
                  sx={{ 
                    display: { xs: 'flex', md: 'none' },
                    fontWeight: 'bold',
                    color: 'text.secondary',
                    fontSize: '0.9rem',
                    letterSpacing: '1px'
                  }}
                >
                  VS
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled
                  sx={{ 
                    display: { xs: 'none', md: 'flex' },
                    minWidth: '60px',
                    border: '1px dashed',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    '&.Mui-disabled': {
                      borderColor: 'divider',
                      color: 'text.secondary'
                    }
                  }}
                >
                  VS
                </Button>
              </>
            )
          ) : (
            <>
              {/* Show VS if not active, not scored, not locked */}
              <Typography
                variant="subtitle2"
                sx={{ 
                  display: { xs: 'flex', md: 'none' },
                  fontWeight: 'bold',
                  color: 'text.secondary',
                  fontSize: '0.9rem',
                  letterSpacing: '1px'
                }}
              >
                VS
              </Typography>
              <Button
                variant="outlined"
                size="small"
                disabled
                sx={{ 
                  display: { xs: 'none', md: 'flex' },
                  minWidth: '60px',
                  border: '1px dashed',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  '&.Mui-disabled': {
                    borderColor: 'divider',
                    color: 'text.secondary'
                  }
                }}
              >
                VS
              </Button>
            </>
          )}
        </Box>

        {/* Away Player with Position Letter */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flex: 1,
          justifyContent: 'flex-end'
        }}>
          {!isBreaking && (
            <Box
              component="img"
              src={theme.palette.mode === 'dark' ? cueBallDarkImage : cueBallImage}
              alt="Break"
              sx={{
                width: { xs: 16, md: 20 },
                height: { xs: 16, md: 20 },
                objectFit: 'contain',
                flexShrink: 0,
                mr: 1
              }}
            />
          )}
          <Box sx={winnerPlayerId === awayPlayerId ? {
            bgcolor: 'success.main',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1
          } : {}}>
            <Typography 
              noWrap 
              sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
            >
              {awayPlayerName}
            </Typography>
          </Box>
          {/* Show away position label */}
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' }, ml: 1, minWidth: '1.5em', textAlign: 'right' }}>
            {awayPositionLabel}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default FrameCard; 