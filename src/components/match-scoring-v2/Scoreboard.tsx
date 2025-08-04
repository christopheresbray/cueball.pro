// src/components/match-scoring-v2/Scoreboard.tsx

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  useTheme
} from '@mui/material';
import { getCompactPlayerName } from '../../utils/playerNameUtils';

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
  const getPlayerDisplayName = (player: { name?: string; firstName?: string; lastName?: string }) => {
    return getCompactPlayerName(player);
  };

  // Sort players with captain first
  const sortPlayersWithCaptainFirst = (players: Array<{ id?: string; name?: string; firstName?: string; lastName?: string; isCaptain?: boolean }>) => {
    return [...players].sort((a, b) => {
      if (a.isCaptain && !b.isCaptain) return -1;
      if (!a.isCaptain && b.isCaptain) return 1;
      return getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b));
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
        alignItems="center"
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
           <Box display="flex" alignItems="center" gap={1}>
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
           </Box>
           {sortedHomePlayers.length > 0 && (
             <Box sx={{ pl: 3 }}>
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
                                             {player.isCaptain ? '👑 ' : ''}{getPlayerDisplayName(player)} ({homePlayerStats[player.id || '']?.wins || 0}/{homePlayerStats[player.id || '']?.total || 0})
                 </Typography>
               ))}
             </Box>
           )}
         </Box>

        {/* Score Display */}
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          sx={{
            flex: 1,
            justifyContent: 'center'
          }}
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
           <Box display="flex" alignItems="center" gap={1}>
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
           {sortedAwayPlayers.length > 0 && (
             <Box sx={{ pr: 3, textAlign: 'right' }}>
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
                                             {getPlayerDisplayName(player)}{player.isCaptain ? ' 👑' : ''} ({awayPlayerStats[player.id || '']?.wins || 0}/{awayPlayerStats[player.id || '']?.total || 0})
                 </Typography>
               ))}
             </Box>
           )}
         </Box>
      </Box>

      {/* Round Indicator */}
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        sx={{ mt: 0.5 }}
      >
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
    </Paper>
  );
};

export default Scoreboard; 