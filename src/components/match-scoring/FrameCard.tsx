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
  roundIndex: number;
  position: number;
  homePlayerName: string;
  awayPlayerName: string;
  positionLetter: string;
  isScored: boolean;
  isActive: boolean;
  frameStatus: FrameStatus;
  homeWon: boolean;
  awayWon: boolean;
  isBreaking: boolean;
  isUserHomeTeamCaptain: boolean;
  onFrameClick: (round: number, position: number, event?: React.MouseEvent) => void;
  onResetFrame: (round: number, position: number, event: React.MouseEvent) => void;
  cueBallImage: string;
  cueBallDarkImage: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Component that displays a single frame matchup
 */
const FrameCard: React.FC<FrameCardProps> = ({
  roundIndex,
  position,
  homePlayerName,
  awayPlayerName,
  positionLetter,
  isScored,
  isActive,
  frameStatus,
  homeWon,
  awayWon,
  isBreaking,
  isUserHomeTeamCaptain,
  onFrameClick,
  onResetFrame,
  cueBallImage,
  cueBallDarkImage,
  onMouseEnter,
  onMouseLeave
}) => {
  const theme = useTheme();

  return (
    <Paper
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        p: { xs: 1.5, md: 2 },
        position: 'relative',
        borderLeft: '4px solid',
        borderColor: getFrameStatusColor(frameStatus, theme),
        transition: 'all 0.2s ease',
        opacity: isActive || isScored ? 1 : 0.7,
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
          {isScored ? (
            <>
              {/* Mobile Reset Icon */}
              <IconButton
                size="small"
                color="success"
                onClick={(e) => onResetFrame(roundIndex, position, e)}
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
                onClick={(e) => onResetFrame(roundIndex, position, e)}
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
                onClick={(e) => onFrameClick(roundIndex, position, e)}
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
                onClick={(e) => onFrameClick(roundIndex, position, e)}
                disabled={!isUserHomeTeamCaptain}
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                Score
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
            {positionLetter}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default FrameCard; 