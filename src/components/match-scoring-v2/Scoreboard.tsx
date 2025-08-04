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
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ minHeight: 48 }}
      >
                 {/* Home Team */}
         <Box
           display="flex"
           flexDirection="column"
           alignItems="flex-start"
           gap={0.5}
           sx={{
             flex: 1,
             justifyContent: 'flex-start'
           }}
         >
           {/* Team Name on separate line */}
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
           
           {/* HOME chip */}
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
           {sortedHomePlayers.length > 0 && (
             <Box sx={{ pl: 0 }}>
               {sortedHomePlayers.map((player, index) => (
                 <Typography
                   key={player.id}
                   variant="caption"
                   sx={{
                     color: isDarkMode ? '#ccc' : '#666',
                     fontSize: '0.7rem',
                     display: 'block',
                     fontWeight: player.isCaptain ? 'bold' : 'normal'
                   }}
                 >
                   {player.isCaptain ? '👑 ' : ''}{getPlayerName(player)} ({homePlayerStats[player.id || '']?.wins || 0}/{homePlayerStats[player.id || '']?.total || 0})
                 </Typography>
               ))}
             </Box>
           )}
         </Box>

        {/* Center Column - Score and Round */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={1}
          sx={{
            flex: 1,
            minHeight: 48
          }}
        >
          {/* Score Display */}
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
          
          {/* Round Indicator */}
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

                 {/* Away Team */}
         <Box
           display="flex"
           flexDirection="column"
           alignItems="flex-end"
           gap={0.5}
           sx={{
             flex: 1,
             justifyContent: 'flex-end'
           }}
         >
           {/* Team Name on separate line */}
           <Typography
             variant="h6"
             sx={{
               fontWeight: 'bold',
               color: isDarkMode ? '#fff' : '#000',
               fontSize: '1rem',
               textAlign: 'right'
             }}
           >
             {awayTeamName}
           </Typography>
           
           {/* AWAY chip */}
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
           {sortedAwayPlayers.length > 0 && (
             <Box sx={{ pr: 0, textAlign: 'right' }}>
               {sortedAwayPlayers.map((player, index) => (
                 <Typography
                   key={player.id}
                   variant="caption"
                   sx={{
                     color: isDarkMode ? '#ccc' : '#666',
                     fontSize: '0.7rem',
                     display: 'block',
                     fontWeight: player.isCaptain ? 'bold' : 'normal'
                   }}
                 >
                   {getPlayerName(player)}{player.isCaptain ? ' 👑' : ''} ({awayPlayerStats[player.id || '']?.wins || 0}/{awayPlayerStats[player.id || '']?.total || 0})
                 </Typography>
               ))}
             </Box>
           )}
           
         </Box>
       </Box>
    </Paper>
  );
};

export default Scoreboard; 