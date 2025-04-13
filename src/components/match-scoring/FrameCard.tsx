import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon
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
  winnerId: string | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: (event: React.MouseEvent) => void;
  onReset: (event: React.MouseEvent) => void;
  cueBallImage: string;
  cueBallDarkImage: string;
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
  positionLetter?: string;
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
  winnerId,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onReset,
  cueBallImage,
  cueBallDarkImage,
  isUserHomeTeamCaptain,
  isUserAwayTeamCaptain,
  positionLetter
}) => {
  const theme = useTheme();
  const isScored = !!winnerId;
  const homeWon = winnerId === homePlayerId;
  const awayWon = winnerId === awayPlayerId;
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
        }),
      }}
    >
      {/* Players Row */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        {/* Frame Number */}
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            minWidth: { xs: '24px', md: '40px' },
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}
        >
          {position + 1}
        </Typography>
        
        {/* Home Player */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flex: 1
        }}>
          <Box sx={{
            ...(homeWon && { 
              bgcolor: 'success.main',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 1
            })
          }}>
            <Typography 
              noWrap 
              sx={{ 
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {homePlayerName}
            </Typography>
          </Box>
          {isBreaking && (
            <Box
              component="img"
              src={theme.palette.mode === 'dark' ? cueBallDarkImage : cueBallImage}
              alt="Break"
              sx={{
                width: { xs: 16, md: 20 },
                height: { xs: 16, md: 20 },
                objectFit: 'contain',
                flexShrink: 0,
                ml: 1
              }}
            />
          )}
        </Box>
        
        {/* Score/Reset Buttons - Both Mobile and Desktop */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          width: { xs: 'auto', md: '100px' }
        }}>
          {isScored && status !== FrameStatus.COMPLETED ? (
            <>
              {/* Mobile Reset Icon */}
              <IconButton
                size="small"
                color="success"
                onClick={onReset}
                disabled={!isUserHomeTeamCaptain}
                sx={{ 
                  display: { xs: 'flex', md: 'none' },
                  '&:hover': {
                    bgcolor: 'success.light'
                  }
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
              {/* Desktop Reset Button */}
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={onReset}
                disabled={!isUserHomeTeamCaptain}
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                Reset
              </Button>
            </>
          ) : isActive ? (
            <>
              {/* Mobile Score Icon */}
              <IconButton
                size="small"
                color="primary"
                onClick={onClick}
                disabled={!isUserHomeTeamCaptain}
                sx={{ 
                  display: { xs: 'flex', md: 'none' },
                  '&:hover': {
                    bgcolor: 'primary.light'
                  }
                }}
              >
                <RadioButtonUncheckedIcon fontSize="small" />
              </IconButton>
              {/* Desktop Score Button */}
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={onClick}
                disabled={!isUserHomeTeamCaptain}
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                Score
              </Button>
            </>
          ) : isScored && status === FrameStatus.COMPLETED ? (
            <>
              {/* Mobile Locked Indicator */}
              <Typography
                variant="caption"
                sx={{ 
                  display: { xs: 'flex', md: 'none' },
                  color: 'text.secondary',
                  fontSize: '0.75rem'
                }}
              >
                Locked
              </Typography>
              {/* Desktop Locked Button */}
              <Button
                variant="text"
                size="small"
                disabled
                sx={{ 
                  display: { xs: 'none', md: 'flex' },
                  color: 'text.secondary',
                  fontSize: '0.75rem'
                }}
              >
                Locked
              </Button>
            </>
          ) : (
            <>
              {/* Mobile Pending Icon */}
              <IconButton
                size="small"
                disabled
                sx={{ 
                  display: { xs: 'flex', md: 'none' }
                }}
              >
                <RadioButtonUncheckedIcon fontSize="small" />
              </IconButton>
              {/* Desktop Pending Button */}
              <Button
                variant="outlined"
                size="small"
                disabled
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                Pending
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
          <Box sx={{
            ...(awayWon && { 
              bgcolor: 'success.main',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 1
            })
          }}>
            <Typography 
              noWrap 
              sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
            >
              {awayPlayerName}
            </Typography>
          </Box>
          {/* Position Letter */}
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.875rem', md: '1rem' },
              ml: 1,
              minWidth: '1.5em',
              textAlign: 'right'
            }}
          >
            {positionLetter || String.fromCharCode(65 + position)}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default FrameCard; 