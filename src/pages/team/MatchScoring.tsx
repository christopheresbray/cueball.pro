import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import {
  getMatch,
  getTeam,
  getVenue,
  getPlayersForTeam,
  updateMatch,
  getCurrentSeason,
  Match,
  Player,
  Team,
  Venue,
} from '../../services/databaseService';

const MatchScoring: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openFrameDialog, setOpenFrameDialog] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<{
    round: number;
    position: number;
    homePlayerId: string;
    awayPlayerId: string;
  } | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string>('');

  useEffect(() => {
    const fetchMatchData = async () => {
      if (!matchId || !user) return;

      try {
        setLoading(true);
        setError('');

        // Get match data
        const matchData = await getMatch(matchId);
        if (!matchData) {
          setError('Match not found');
          return;
        }

        // Verify user is the home team captain
        const homeTeamData = await getTeam(matchData.homeTeamId);
        if (!homeTeamData) {
          setError('Home team not found');
          return;
        }
        
        if (!homeTeamData.captainUserId) {
          setError('Home team captain not set. Please contact the administrator.');
          return;
        }

        if (homeTeamData.captainUserId !== user.uid) {
          setError('Only the home team captain can score this match');
          return;
        }

        // Get away team and venue
        const [awayTeamData, venueData] = await Promise.all([
          getTeam(matchData.awayTeamId),
          getVenue(matchData.venueId),
        ]);

        // Get current season
        const currentSeason = await getCurrentSeason();
        if (!currentSeason) {
          setError('No active season found');
          return;
        }

        // Get players for both teams
        const [homePlayersData, awayPlayersData] = await Promise.all([
          getPlayersForTeam(matchData.homeTeamId, currentSeason.id!),
          getPlayersForTeam(matchData.awayTeamId, currentSeason.id!),
        ]);

        setMatch(matchData);
        setHomeTeam(homeTeamData);
        setAwayTeam(awayTeamData);
        setVenue(venueData);
        setHomePlayers(homePlayersData);
        setAwayPlayers(awayPlayersData);
      } catch (err: any) {
        setError(err.message || 'Failed to load match data');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchData();
  }, [matchId, user]);

  const handleOpenFrameDialog = (round: number, position: number) => {
    if (!match?.homeLineup || !match?.awayLineup) return;

    const homePlayerId = match.homeLineup[position];
    const awayPlayerId = match.awayLineup[position];

    setCurrentFrame({
      round,
      position,
      homePlayerId,
      awayPlayerId,
    });
    setOpenFrameDialog(true);
  };

  const handleCloseFrameDialog = () => {
    setOpenFrameDialog(false);
    setCurrentFrame(null);
    setSelectedWinner('');
  };

  const handleSubmitFrameResult = async () => {
    if (!match || !currentFrame || !selectedWinner) return;

    try {
      const frameId = `${currentFrame.round}-${currentFrame.position}`;
      const updateData: Partial<Match> = {
        frameResults: {
          ...match.frameResults,
          [frameId]: {
            winnerId: selectedWinner,
            homeScore: selectedWinner === currentFrame.homePlayerId ? 1 : 0,
            awayScore: selectedWinner === currentFrame.awayPlayerId ? 1 : 0,
          },
        },
      };

      // Check if all frames in the current round are completed
      const allFramesInRound = Array.from({ length: 4 }, (_, i) => `${currentFrame.round}-${i}`);
      const roundFrames = allFramesInRound.map(id => updateData.frameResults?.[id]);
      const isRoundComplete = roundFrames.every(frame => frame?.winnerId);

      if (isRoundComplete) {
        updateData.currentRound = currentFrame.round + 1;
        updateData.roundScored = true;
      }

      await updateMatch(matchId!, updateData);
      setMatch({ ...match, ...updateData });
      handleCloseFrameDialog();
    } catch (err: any) {
      setError(err.message || 'Failed to submit frame result');
    }
  };

  const getPlayerName = (playerId: string, isHomeTeam: boolean): string => {
    const players = isHomeTeam ? homePlayers : awayPlayers;
    const player = players.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown Player';
  };

  const isFrameScored = (round: number, position: number): boolean => {
    if (!match?.frameResults) return false;
    const frameId = `${round}-${position}`;
    return !!match.frameResults[frameId]?.winnerId;
  };

  const getFrameWinner = (round: number, position: number): string | null => {
    if (!match?.frameResults) return null;
    const frameId = `${round}-${position}`;
    return match.frameResults[frameId]?.winnerId || null;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!match || !homeTeam || !awayTeam) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {homeTeam.name} vs {awayTeam.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Venue: {venue?.name || 'Unknown'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Date: {match.scheduledDate?.toDate().toLocaleDateString()}
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Match Scoring</Typography>
        
        {Array.from({ length: 4 }).map((_, roundIndex) => (
          <Box key={`round-${roundIndex}`} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Round {roundIndex + 1}
            </Typography>
            <Grid container spacing={2}>
              {Array.from({ length: 4 }).map((_, positionIndex) => {
                const frameId = `${roundIndex}-${positionIndex}`;
                const isScored = isFrameScored(roundIndex, positionIndex);
                const winnerId = getFrameWinner(roundIndex, positionIndex);
                const homePlayerId = match.homeLineup?.[positionIndex];
                const awayPlayerId = match.awayLineup?.[positionIndex];

                return (
                  <Grid item xs={12} sm={6} md={3} key={frameId}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: isScored ? 'default' : 'pointer',
                        bgcolor: isScored ? 'action.hover' : 'background.paper',
                        '&:hover': {
                          bgcolor: isScored ? 'action.hover' : 'action.hover',
                        },
                      }}
                      onClick={() => !isScored && handleOpenFrameDialog(roundIndex, positionIndex)}
                    >
                      <Typography variant="subtitle2" gutterBottom>
                        Frame {positionIndex + 1}
                      </Typography>
                      <Typography variant="body2">
                        {getPlayerName(homePlayerId || '', true)} vs {getPlayerName(awayPlayerId || '', false)}
                      </Typography>
                      {isScored && winnerId && (
                        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                          Winner: {getPlayerName(winnerId, winnerId === homePlayerId)}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Paper>

      <Dialog open={openFrameDialog} onClose={handleCloseFrameDialog}>
        <DialogTitle>Enter Frame Result</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Winner</InputLabel>
            <Select
              value={selectedWinner}
              label="Winner"
              onChange={(e) => setSelectedWinner(e.target.value)}
            >
              {currentFrame && (
                <>
                  <MenuItem value={currentFrame.homePlayerId}>
                    {getPlayerName(currentFrame.homePlayerId, true)}
                  </MenuItem>
                  <MenuItem value={currentFrame.awayPlayerId}>
                    {getPlayerName(currentFrame.awayPlayerId, false)}
                  </MenuItem>
                </>
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFrameDialog}>Cancel</Button>
          <Button
            onClick={handleSubmitFrameResult}
            variant="contained"
            disabled={!selectedWinner}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MatchScoring; 