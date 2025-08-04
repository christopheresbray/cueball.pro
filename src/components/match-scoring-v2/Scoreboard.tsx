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
  const isDarkMode = theme.palette.mode === 'dark';

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
        backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
        borderBottom: `2px solid ${isDarkMode ? '#333' : '#e0e0e0'}`,
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
              color: isDarkMode ? '#fff' : '#000',
              fontSize: '1rem'
            }}
          >
            {homeTeamName}
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: isDarkMode ? '#fff' : '#000',
              fontSize: '1rem'
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
          <Chip
            label="HOME"
            size="small"
            color="primary"
            variant="filled"
            sx={{
              fontSize: '0.7rem',
              height: 20,
              fontWeight: 'bold'
            }}
          />
          
          <Chip
            label="AWAY"
            size="small"
            color="secondary"
            variant="filled"
            sx={{
              fontSize: '0.7rem',
              height: 20,
              fontWeight: 'bold'
            }}
          />
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
                    color: isDarkMode ? '#ccc' : '#666',
                    fontSize: '0.7rem',
                    fontWeight: player.isCaptain ? 'bold' : 'normal'
                  }}
                >
                  {getPlayerName(player)}
                </Typography>
                
                <Typography
                  variant="caption"
                  sx={{
                    color: isDarkMode ? '#ccc' : '#666',
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
                  color: '#1976d2',
                  fontSize: '1.8rem',
                  minWidth: 40,
                  textAlign: 'center'
                }}
              >
                {homeScore}
              </Typography>
              
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold',
                  color: isDarkMode ? '#ccc' : '#666',
                  fontSize: '1.2rem'
                }}
              >
                -
              </Typography>
              
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: '#d32f2f',
                  fontSize: '1.8rem',
                  minWidth: 40,
                  textAlign: 'center'
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
                color: isDarkMode ? '#ccc' : '#666',
                borderColor: isDarkMode ? '#444' : '#ccc'
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
                    color: isDarkMode ? '#ccc' : '#666',
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
                    color: isDarkMode ? '#ccc' : '#666',
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