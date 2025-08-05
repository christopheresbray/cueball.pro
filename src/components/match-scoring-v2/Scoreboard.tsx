// src/components/match-scoring-v2/Scoreboard.tsx

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  useTheme
} from '@mui/material';
import { getPlayerDisplayName } from '../../utils/playerNameUtils';

interface ScoreboardProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  currentRound?: number;
  totalRounds?: number;
  homeTeamPlayers?: Array<{ id?: string; name?: string; firstName?: string; lastName?: string; isCaptain?: boolean }>;
  awayTeamPlayers?: Array<{ id?: string; name?: string; firstName?: string; lastName?: string; isCaptain?: boolean }>;
  homePlayerStats?: Record<string, { wins: number; total: number }>;
  awayPlayerStats?: Record<string, { wins: number; total: number }>;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  currentRound = 1,
  totalRounds = 4,
  homeTeamPlayers = [],
  awayTeamPlayers = [],
  homePlayerStats = {},
  awayPlayerStats = {}
}) => {
  const theme = useTheme();

  // Helper function to get player display name
  const getPlayerName = (player: { name?: string; firstName?: string; lastName?: string }) => {
    return getPlayerDisplayName(player);
  };

  // Sort players with captain first
  const sortPlayersWithCaptainFirst = (players: Array<{ id?: string; name?: string; firstName?: string; lastName?: string; isCaptain?: boolean }>) => {
    return [...players].sort((a, b) => {
      if (a.isCaptain && !b.isCaptain) return -1;
      if (!a.isCaptain && b.isCaptain) return 1;
      return getPlayerName(a).localeCompare(getPlayerName(b));
    });
  };

  const sortedHomePlayers = sortPlayersWithCaptainFirst(homeTeamPlayers);
  const sortedAwayPlayers = sortPlayersWithCaptainFirst(awayTeamPlayers);

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'fixed',
        top: 64, // Position below the navbar
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#1a1a1a',
        borderBottom: '2px solid #333',
        py: 1,
        px: 2
      }}
    >
      <Box
        display="flex"
        flexDirection="column"
        gap={1}
        sx={{ minHeight: 48 }}
      >
        {/* Team Names Row */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
                      <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: '#fff',
                fontSize: '1.1rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                WebkitTextStroke: '0.3px rgba(0,0,0,0.5)',
                filter: 'none'
              }}
            >
              {homeTeamName}
            </Typography>
          
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: '#fff',
              fontSize: '1.1rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              WebkitTextStroke: '0.3px rgba(0,0,0,0.5)',
              filter: 'none'
            }}
          >
            {awayTeamName}
          </Typography>
        </Box>

        {/* HOME/AWAY Chips Row */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box
            sx={{
              px: 1.5,
              py: 0.25,
              borderRadius: 1,
              backgroundColor: '#333',
              border: '1px solid #555'
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: '#fff'
              }}
            >
              HOME
            </Typography>
          </Box>
          
          <Box
            sx={{
              px: 1.5,
              py: 0.25,
              borderRadius: 1,
              backgroundColor: '#333',
              border: '1px solid #555'
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: '#fff'
              }}
            >
              AWAY
            </Typography>
          </Box>
        </Box>

        {/* Players and Scores Row */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          {/* Home Side */}
          <Box sx={{ flex: 1 }}>
            {sortedHomePlayers.map((player, index) => (
              <Box
                key={player.id}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#ccc',
                    fontSize: '0.7rem',
                    fontWeight: player.isCaptain ? 'bold' : 'normal'
                  }}
                >
                  {getPlayerName(player)}
                </Typography>
                
                <Typography
                  variant="caption"
                  sx={{
                    color: '#ccc',
                    fontSize: '0.7rem',
                    fontWeight: player.isCaptain ? 'bold' : 'normal',
                    ml: 2
                  }}
                >
                  ({homePlayerStats[player.id || '']?.wins || 0}/{homePlayerStats[player.id || '']?.total || 0})
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Center Score */}
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap={1}
            sx={{
              minWidth: '120px',
              mx: 2
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={0.5}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: homeScore > awayScore ? '#FFD700' : '#fff',
                  fontSize: '1.8rem',
                  minWidth: 40,
                  textAlign: 'center',
                  textShadow: homeScore > awayScore ? '0 0 8px rgba(255,215,0,0.5)' : 'none'
                }}
              >
                {homeScore}
              </Typography>
              
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  color: '#ccc',
                  fontSize: '1.2rem'
                }}
              >
                -
              </Typography>
              
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: awayScore > homeScore ? '#FFD700' : '#fff',
                  fontSize: '1.8rem',
                  minWidth: 40,
                  textAlign: 'center',
                  textShadow: awayScore > homeScore ? '0 0 8px rgba(255,215,0,0.5)' : 'none'
                }}
              >
                {awayScore}
              </Typography>
            </Box>
            
            <Chip
              label={`Round ${currentRound} of ${totalRounds}`}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 20,
                color: '#ccc',
                borderColor: '#444'
              }}
            />
          </Box>

          {/* Away Side */}
          <Box sx={{ flex: 1 }}>
            {sortedAwayPlayers.map((player, index) => (
              <Box
                key={player.id}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#ccc',
                    fontSize: '0.7rem',
                    fontWeight: player.isCaptain ? 'bold' : 'normal',
                    textAlign: 'right'
                  }}
                >
                  ({awayPlayerStats[player.id || '']?.wins || 0}/{awayPlayerStats[player.id || '']?.total || 0})
                </Typography>
                
                <Typography
                  variant="caption"
                  sx={{
                    color: '#ccc',
                    fontSize: '0.7rem',
                    fontWeight: player.isCaptain ? 'bold' : 'normal',
                    ml: 2,
                    textAlign: 'right'
                  }}
                >
                  {getPlayerName(player)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default Scoreboard; 