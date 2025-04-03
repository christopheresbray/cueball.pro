import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert
} from '@mui/material';
import { Match } from '../../services/databaseService';
import { getPositionLetter } from '../../utils/matchUtils';

interface SubstitutionPanelProps {
  roundIndex: number;
  match: Match | null;
  getPlayerForRound: (round: number, position: number, isHomeTeam: boolean) => string;
  getPlayerName: (playerId: string, isHomeTeam: boolean) => string;
  isHomeTeamBreaking: (round: number, position: number) => boolean;
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
  homeTeamConfirmed: { [round: number]: boolean };
  awayTeamConfirmed: { [round: number]: boolean };
  handleHomeTeamConfirm: (roundIndex: number) => void;
  handleAwayTeamConfirm: (roundIndex: number) => void;
  handleHomeTeamEdit: (roundIndex: number) => void;
  handleAwayTeamEdit: (roundIndex: number) => void;
  error: string;
  cueBallImage: string;
  cueBallDarkImage: string;
}

/**
 * Component that displays the substitution panel for the next round
 */
const SubstitutionPanel: React.FC<SubstitutionPanelProps> = ({
  roundIndex,
  match,
  getPlayerForRound,
  getPlayerName,
  isHomeTeamBreaking,
  isUserHomeTeamCaptain,
  isUserAwayTeamCaptain,
  homeTeamConfirmed,
  awayTeamConfirmed,
  handleHomeTeamConfirm,
  handleAwayTeamConfirm,
  handleHomeTeamEdit,
  handleAwayTeamEdit,
  error,
  cueBallImage,
  cueBallDarkImage
}) => {
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
        Round {roundIndex + 2}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: 4 }).map((_, position) => {
          const homePlayerId = getPlayerForRound(roundIndex + 2, position, true);
          const awayPlayerId = getPlayerForRound(roundIndex + 2, position, false);
          const homePlayerName = getPlayerName(homePlayerId, true);
          const awayPlayerName = getPlayerName(awayPlayerId, false);
          const isBreaking = isHomeTeamBreaking(roundIndex + 1, position);
          const nextRoundIndex = roundIndex + 1;
          const positionLetter = getPositionLetter(nextRoundIndex, position);

          return (
            <Paper
              key={`upcoming-frame-${position}`}
              sx={{
                p: { xs: 1.5, md: 2 },
                position: 'relative',
                borderLeft: '4px solid',
                borderColor: 'text.disabled',
                transition: 'all 0.2s ease',
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'background.default'
                }
              }}
            >
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
                  <Typography 
                    noWrap 
                    sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                  >
                    {homePlayerName}
                  </Typography>
                  {isBreaking && (
                    <Box
                      component="img"
                      src={cueBallImage}
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

                {/* Empty Space for Score */}
                <Box sx={{ 
                  width: { xs: 'auto', md: '100px' },
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: 'text.disabled'
                  }} />
                </Box>

                {/* Away Player */}
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
                      src={cueBallImage}
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
                  <Typography 
                    noWrap 
                    sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                  >
                    {awayPlayerName}
                  </Typography>
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
        })}
      </Box>

      {/* Team confirmation buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        {isUserHomeTeamCaptain && !homeTeamConfirmed[roundIndex] && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleHomeTeamConfirm(roundIndex)}
          >
            Confirm Home Team Lineup
          </Button>
        )}
        {isUserHomeTeamCaptain && homeTeamConfirmed[roundIndex] && (
          <Button
            variant="outlined"
            color="primary"
            onClick={() => handleHomeTeamEdit(roundIndex)}
          >
            Edit Home Team Lineup
          </Button>
        )}
        {isUserAwayTeamCaptain && !awayTeamConfirmed[roundIndex] && (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => handleAwayTeamConfirm(roundIndex)}
          >
            Confirm Away Team Lineup
          </Button>
        )}
        {isUserAwayTeamCaptain && awayTeamConfirmed[roundIndex] && (
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => handleAwayTeamEdit(roundIndex)}
          >
            Edit Away Team Lineup
          </Button>
        )}
      </Box>

      {/* Status messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {(!homeTeamConfirmed[roundIndex] || !awayTeamConfirmed[roundIndex]) && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {!homeTeamConfirmed[roundIndex] && !awayTeamConfirmed[roundIndex] ? (
            'Waiting for both teams to confirm their lineups'
          ) : !homeTeamConfirmed[roundIndex] ? (
            'Waiting for home team to confirm their lineup'
          ) : (
            'Waiting for away team to confirm their lineup'
          )}
        </Alert>
      )}
      {homeTeamConfirmed[roundIndex] && awayTeamConfirmed[roundIndex] && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Both teams have confirmed their lineups. Advancing to Round {roundIndex + 2}...
        </Alert>
      )}
    </Box>
  );
};

export default SubstitutionPanel; 