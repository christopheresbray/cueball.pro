// src/components/team/MatchDetails.tsx
import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Chip, 
  Divider, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow 
} from '@mui/material';
import { format } from 'date-fns';
import { Match, Team, Player, Venue, Frame } from '../../services/databaseService';

interface MatchDetailsProps {
  match: Match;
  homeTeam: Team | null;
  awayTeam: Team | null;
  venue: Venue | null;
  frames: Frame[];
  homePlayers: Player[];
  awayPlayers: Player[];
}

const MatchDetails: React.FC<MatchDetailsProps> = ({
  match,
  homeTeam,
  awayTeam,
  venue,
  frames,
  homePlayers,
  awayPlayers
}) => {
  const homeWins = frames.filter(f => f.winnerId === f.homePlayerId).length;
  const awayWins = frames.filter(f => f.winnerId === f.awayPlayerId).length;
  
  const getPlayerName = (playerId: string, isHomeTeam: boolean): string => {
    const players = isHomeTeam ? homePlayers : awayPlayers;
    const player = players.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown Player';
  };

  const renderMatchStatus = () => {
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
    let label: string;
    
    switch (match.status) {
      case 'scheduled':
        color = 'info';
        label = 'Scheduled';
        break;
      case 'in_progress':
        color = 'warning';
        label = 'In Progress';
        break;
      case 'completed':
        color = 'success';
        label = 'Completed';
        break;
      default:
        label = 'Unknown';
    }
    
    return (
      <Chip 
        label={label} 
        color={color}
        variant="outlined"
      />
    );
  };

  const renderResults = () => {
    if (!frames.length) {
      return <Typography variant="body2">No frames played yet</Typography>;
    }
    
    // Group frames by round
    const roundFrames: Record<number, Frame[]> = {};
    
    frames.forEach(frame => {
      if (!roundFrames[frame.round]) {
        roundFrames[frame.round] = [];
      }
      roundFrames[frame.round].push(frame);
    });
    
    return (
      <Box mt={2}>
        {Object.keys(roundFrames).map(roundKey => {
          const round = parseInt(roundKey);
          const roundFramesList = roundFrames[round];
          const homeWins = roundFramesList.filter(f => f.winnerId === f.homePlayerId).length;
          const awayWins = roundFramesList.filter(f => f.winnerId === f.awayPlayerId).length;
          
          return (
            <Box key={`round-${round}`} mb={3}>
              <Typography variant="subtitle1" gutterBottom>
                Round {round} {homeWins > 0 || awayWins > 0 ? `(${homeWins}-${awayWins})` : ''}
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Home Player</TableCell>
                      <TableCell>Away Player</TableCell>
                      <TableCell align="center">Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roundFramesList.sort((a, b) => a.position - b.position).map(frame => (
                      <TableRow key={frame.id}>
                        <TableCell>
                          {getPlayerName(frame.homePlayerId, true)}
                        </TableCell>
                        <TableCell>
                          {getPlayerName(frame.awayPlayerId, false)}
                        </TableCell>
                        <TableCell align="center">
                          {frame.winnerId ? (
                            <Chip 
                              size="small"
                              label={frame.winnerId === frame.homePlayerId ? 'Home Win' : 'Away Win'} 
                              color={frame.winnerId === frame.homePlayerId ? 'primary' : 'secondary'}
                              variant="outlined"
                            />
                          ) : 'Not played'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            {homeTeam?.name || 'Home Team'} vs {awayTeam?.name || 'Away Team'}
          </Typography>
          
          <Box display="flex" alignItems="center" mb={1}>
            {renderMatchStatus()}
            <Typography variant="body2" sx={{ ml: 2 }}>
              {match.scheduledDate 
                ? format(match.scheduledDate.toDate(), 'EEEE, MMMM d, yyyy h:mm a') 
                : 'Date not scheduled'}
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Venue: {venue?.name || 'Unknown'}
            {venue?.address && ` (${venue.address})`}
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="h6" gutterBottom>
              Match Score
            </Typography>
            <Typography variant="h4">
              {homeWins} - {awayWins}
            </Typography>
            {match.status === 'completed' && (
              <Chip 
                label={
                  homeWins > awayWins 
                    ? `${homeTeam?.name || 'Home'} Win` 
                    : homeWins < awayWins 
                      ? `${awayTeam?.name || 'Away'} Win` 
                      : 'Draw'
                }
                color={homeWins > awayWins ? 'primary' : homeWins < awayWins ? 'secondary' : 'default'}
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Match Results
      </Typography>
      
      {renderResults()}
    </Paper>
  );
};

export default MatchDetails;
