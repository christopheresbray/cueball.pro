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
  createDocument,
  Frame,
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

  const calculateMatchScore = () => {
    if (!match?.frameResults) return { home: 0, away: 0 };
    
    return Object.values(match.frameResults).reduce(
      (acc, frame) => {
        if (frame.homeScore) acc.home += frame.homeScore;
        if (frame.awayScore) acc.away += frame.awayScore;
        return acc;
      },
      { home: 0, away: 0 }
    );
  };

  const handleWinnerSelection = (value: string) => {
    setSelectedWinner(value);
  };

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
    if (!match || !currentFrame || !selectedWinner) {
      console.error('Missing required data:', { match: !!match, currentFrame: !!currentFrame, selectedWinner: !!selectedWinner });
      setError('Missing required data for frame submission');
      return;
    }

    try {
      console.log('Submitting frame result:', {
        matchId: match.id,
        round: currentFrame.round,
        position: currentFrame.position,
        winner: selectedWinner,
        homePlayer: currentFrame.homePlayerId,
        awayPlayer: currentFrame.awayPlayerId
      });

      const frameId = `${currentFrame.round}-${currentFrame.position}`;
      const existingFrameResults = match.frameResults || {};
      
      // Create the frame document in the frames collection
      const frameData: Frame = {
        matchId: match.id!,
        round: currentFrame.round,
        position: currentFrame.position,
        homePlayerId: currentFrame.homePlayerId,
        awayPlayerId: currentFrame.awayPlayerId,
        winnerId: selectedWinner,
        seasonId: match.seasonId,
        homeScore: selectedWinner === currentFrame.homePlayerId ? 1 : 0,
        awayScore: selectedWinner === currentFrame.awayPlayerId ? 1 : 0
      };

      console.log('Creating frame document:', frameData);

      // Create the frame document
      const frameRef = await createDocument('frames', frameData);
      console.log('Frame document created:', frameRef.id);
      
      const updateData: Partial<Match> = {
        frameResults: {
          ...existingFrameResults,
          [frameId]: {
            winnerId: selectedWinner,
            homeScore: selectedWinner === currentFrame.homePlayerId ? 1 : 0,
            awayScore: selectedWinner === currentFrame.awayPlayerId ? 1 : 0,
          },
        },
      };

      console.log('Updating match with:', updateData);

      // Check if all frames in the current round are completed
      const allFramesInRound = Array.from({ length: 4 }, (_, i) => `${currentFrame.round}-${i}`);
      const roundFrames = allFramesInRound.map(id => updateData.frameResults![id]);
      const isRoundComplete = roundFrames.every(frame => frame?.winnerId);

      if (isRoundComplete) {
        updateData.currentRound = currentFrame.round + 1;
        updateData.roundScored = true;
      }

      await updateMatch(matchId!, updateData);
      console.log('Match updated successfully');
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: {
            ...(prevMatch.frameResults || {}),
            ...updateData.frameResults
          },
          currentRound: updateData.currentRound || prevMatch.currentRound,
          roundScored: updateData.roundScored || prevMatch.roundScored
        };
      });
      
      handleCloseFrameDialog();
    } catch (err: any) {
      console.error('Error submitting frame result:', err);
      setError(err.message || 'Failed to submit frame result. Please try again.');
      // Keep the dialog open if there's an error
      setOpenFrameDialog(true);
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

  useEffect(() => {
    const fetchMatchData = async () => {
      if (!matchId || !user) return;

      try {
        setLoading(true);
        setError('');

        const matchData = await getMatch(matchId);
        if (!matchData) {
          setError('Match not found');
          return;
        }

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

        const [awayTeamData, venueData] = await Promise.all([
          getTeam(matchData.awayTeamId),
          getVenue(matchData.venueId),
        ]);

        const currentSeason = await getCurrentSeason();
        if (!currentSeason) {
          setError('No active season found');
          return;
        }

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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!match || !homeTeam || !awayTeam) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const matchScore = calculateMatchScore();

  return (
    <>
      {/* Sticky Header */}
      <Box 
        sx={{ 
          position: 'sticky',
          top: 64, // Height of the main navbar
          zIndex: 1000,
          bgcolor: 'background.default',
          pb: 2
        }}
      >
        <Container maxWidth="lg">
          <Paper 
            elevation={3}
            sx={{ 
              p: 2,
              mt: 2,
              bgcolor: 'background.paper',
              borderRadius: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                <Typography 
                  variant="h6" 
                  component="div"
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main'
                  }}
                >
                  {homeTeam.name}
                </Typography>
                <Typography 
                  variant="h5" 
                  component="div"
                  sx={{ 
                    fontWeight: 'bold',
                    px: 2
                  }}
                >
                  {matchScore.home} - {matchScore.away}
                </Typography>
                <Typography 
                  variant="h6" 
                  component="div"
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main'
                  }}
                >
                  {awayTeam.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {venue?.name || 'Unknown Venue'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  •
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {match.scheduledDate?.toDate().toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Paper sx={{ p: 3 }}>
          {Array.from({ length: 4 }).map((_, roundIndex) => (
            <Box key={`round-${roundIndex}`} sx={{ mb: 4 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 'bold',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                    pb: 1,
                    mb: 2 
                  }}>
                    Round {roundIndex + 1}
                  </Typography>
                </Grid>

                {Array.from({ length: 4 }).map((_, position) => {
                  const frameId = `${roundIndex}-${position}`;
                  const isScored = isFrameScored(roundIndex, position);
                  const winnerId = getFrameWinner(roundIndex, position);
                  const homePlayerId = match.homeLineup?.[position];
                  const awayPlayerId = match.awayLineup?.[position];
                  const homePlayerName = getPlayerName(homePlayerId || '', true);
                  const awayPlayerName = getPlayerName(awayPlayerId || '', false);

                  return (
                    <Grid item xs={12} key={frameId} sx={{ mb: 1 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                        onClick={() => handleOpenFrameDialog(roundIndex, position)}
                      >
                        <Box sx={{ 
                          width: 30, 
                          textAlign: 'center',
                          fontWeight: 'bold',
                          mr: 2 
                        }}>
                          {position + 1}
                        </Box>

                        <Box sx={{ 
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <Typography>{homePlayerName}</Typography>
                          {isScored && winnerId === homePlayerId && (
                            <Box component="span" sx={{ 
                              bgcolor: 'success.light',
                              color: 'success.contrastText',
                              px: 1,
                              borderRadius: 1
                            }}>
                              W
                            </Box>
                          )}
                        </Box>

                        <Box sx={{ px: 2 }}>
                          {isScored ? (
                            <Typography>
                              {winnerId === homePlayerId ? '1-0' : '0-1'}
                            </Typography>
                          ) : (
                            <Typography color="text.secondary">vs</Typography>
                          )}
                        </Box>

                        <Box sx={{ 
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          justifyContent: 'flex-end'
                        }}>
                          {isScored && winnerId === awayPlayerId && (
                            <Box component="span" sx={{ 
                              bgcolor: 'success.light',
                              color: 'success.contrastText',
                              px: 1,
                              borderRadius: 1
                            }}>
                              W
                            </Box>
                          )}
                          <Typography>{awayPlayerName}</Typography>
                        </Box>

                        <Box sx={{ 
                          width: 30, 
                          textAlign: 'center',
                          fontWeight: 'bold',
                          ml: 2 
                        }}>
                          {String.fromCharCode(65 + position)}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </Paper>

        {/* Winner Selection Dialog */}
        <Dialog 
          open={openFrameDialog} 
          onClose={handleCloseFrameDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {isFrameScored(currentFrame?.round || 0, currentFrame?.position || 0) ? 'Edit Frame Result' : 'Enter Frame Result'}
          </DialogTitle>
          <DialogContent>
            {currentFrame && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Winner</InputLabel>
                <Select
                  value={selectedWinner}
                  label="Winner"
                  onChange={(e) => handleWinnerSelection(e.target.value)}
                >
                  <MenuItem value={currentFrame.homePlayerId}>
                    {getPlayerName(currentFrame.homePlayerId, true)}
                  </MenuItem>
                  <MenuItem value={currentFrame.awayPlayerId}>
                    {getPlayerName(currentFrame.awayPlayerId, false)}
                  </MenuItem>
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFrameDialog}>Cancel</Button>
            <Button
              onClick={handleSubmitFrameResult}
              variant="contained"
              disabled={!selectedWinner}
            >
              {isFrameScored(currentFrame?.round || 0, currentFrame?.position || 0) ? 'Update' : 'Submit'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default MatchScoring; 