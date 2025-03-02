// src/pages/team/MatchScorecard.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material';
import { format } from 'date-fns';

import {
  Match,
  Team,
  Player,
  Frame,
  getMatches,
  getTeams,
  getPlayers,
  getFrames,
  updateMatch,
  createFrame,
  updateFrame
} from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';

const MatchScorecard = () => {
  const { matchId } = useParams();
  const { user } = useAuth();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  
  const [isHomeTeamCaptain, setIsHomeTeamCaptain] = useState(false);
  const [isAwayTeamCaptain, setIsAwayTeamCaptain] = useState(false);
  
  const [homeLineup, setHomeLineup] = useState<string[]>(['', '', '', '']);
  const [awayLineup, setAwayLineup] = useState<string[]>(['', '', '', '']);
  
  const [openSubstituteDialog, setOpenSubstituteDialog] = useState(false);
  const [substituteDetails, setSubstituteDetails] = useState({
    round: 0,
    position: 0,
    currentPlayerId: '',
    newPlayerId: ''
  });
  
  const [openScoreDialog, setOpenScoreDialog] = useState(false);
  const [scoreDetails, setScoreDetails] = useState({
    frameId: '',
    round: 0,
    position: 0,
    homePlayerId: '',
    awayPlayerId: '',
    winnerId: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (matchId) {
      fetchMatchData(matchId);
    }
  }, [matchId]);

  useEffect(() => {
    if (match) {
      fetchTeamsAndPlayers();
      fetchFrames();
      
      // Set lineups from match data if they exist
      if (match.homeLineup && match.homeLineup.length > 0) {
        setHomeLineup(match.homeLineup);
      }
      if (match.awayLineup && match.awayLineup.length > 0) {
        setAwayLineup(match.awayLineup);
      }
    }
  }, [match]);

  useEffect(() => {
    if (user && homeTeam && awayTeam) {
      setIsHomeTeamCaptain(homeTeam.captainId === user.uid);
      setIsAwayTeamCaptain(awayTeam.captainId === user.uid);
    }
  }, [user, homeTeam, awayTeam]);

  const fetchMatchData = async (id: string) => {
    try {
      const matchesData = await getMatches('');
      const matchData = matchesData.find(m => m.id === id);
      
      if (matchData) {
        setMatch(matchData);
      } else {
        setError('Match not found');
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      setError('Failed to fetch match data');
    }
  };

  const fetchTeamsAndPlayers = async () => {
    if (!match) return;
    
    try {
      const teamsData = await getTeams(match.seasonId);
      const home = teamsData.find(team => team.id === match.homeTeamId) || null;
      const away = teamsData.find(team => team.id === match.awayTeamId) || null;
      
      setHomeTeam(home);
      setAwayTeam(away);
      
      if (home) {
        const homePlayersData = await getPlayers(home.id!);
        setHomePlayers(homePlayersData);
      }
      
      if (away) {
        const awayPlayersData = await getPlayers(away.id!);
        setAwayPlayers(awayPlayersData);
      }
    } catch (error) {
      console.error('Error fetching teams and players:', error);
      setError('Failed to fetch teams and players');
    }
  };

  const fetchFrames = async () => {
    if (!matchId) return;
    
    try {
      const framesData = await getFrames(matchId);
      setFrames(framesData);
    } catch (error) {
      console.error('Error fetching frames:', error);
      setError('Failed to fetch frames');
    }
  };

  const handleLineupChange = (team: 'home' | 'away', position: number, playerId: string) => {
    if (team === 'home') {
      const newLineup = [...homeLineup];
      newLineup[position] = playerId;
      setHomeLineup(newLineup);
    } else {
      const newLineup = [...awayLineup];
      newLineup[position] = playerId;
      setAwayLineup(newLineup);
    }
  };

  const handleSubmitLineups = async () => {
    if (!match) return;
    
    setLoading(true);
    try {
      await updateMatch(match.id!, {
        homeLineup,
        awayLineup,
        status: 'in_progress'
      });
      
      // Generate all 16 frames based on lineups
      const framePromises = [];
      
      // Generate frames for all 4 rounds
      for (let round = 1; round <= 4; round++) {
        for (let position = 0; position < 4; position++) {
          // Calculate the away player position based on the rotation pattern
          let awayPosition = (position + round - 1) % 4;
          
          const frame: Frame = {
            matchId,
            round,
            position: position + 1,
            homePlayerId: homeLineup[position],
            awayPlayerId: awayLineup[awayPosition],
          };
          
          framePromises.push(createFrame(frame));
        }
      }
      
      await Promise.all(framePromises);
      fetchFrames();
    } catch (error) {
      console.error('Error submitting lineups:', error);
      setError('Failed to submit lineups');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubstituteDialog = (round: number, position: number, currentPlayerId: string) => {
    setSubstituteDetails({
      round,
      position,
      currentPlayerId,
      newPlayerId: ''
    });
    setOpenSubstituteDialog(true);
  };

  const handleCloseSubstituteDialog = () => {
    setOpenSubstituteDialog(false);
  };

  const handleSubstitute = async () => {
    if (!match || !substituteDetails.newPlayerId) return;
    
    setLoading(true);
    try {
      const { round, position, newPlayerId } = substituteDetails;
      const isHomeSubstitution = isHomeTeamCaptain;
      
      const substitutes = isHomeSubstitution 
        ? { ...(match.homeSubstitutes || {}), [`round${round}`]: { position, player: newPlayerId } }
        : { ...(match.awaySubstitutes || {}), [`round${round}`]: { position, player: newPlayerId } };
      
      // Update match with substitution
      await updateMatch(match.id!, isHomeSubstitution 
        ? { homeSubstitutes: substitutes }
        : { awaySubstitutes: substitutes }
      );
      
      // Update affected frames
      const affectedFrames = frames.filter(f => 
        f.round === round && 
        (isHomeSubstitution 
          ? f.homePlayerId === substituteDetails.currentPlayerId
          : f.awayPlayerId === substituteDetails.currentPlayerId
        )
      );
      
      for (const frame of affectedFrames) {
        await updateFrame(frame.id!, isHomeSubstitution
          ? { homePlayerId: newPlayerId }
          : { awayPlayerId: newPlayerId }
        );
      }
      
      fetchFrames();
      handleCloseSubstituteDialog();
    } catch (error) {
      console.error('Error making substitution:', error);
      setError('Failed to make substitution');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScoreDialog = (frame: Frame) => {
    setScoreDetails({
      frameId: frame.id!,
      round: frame.round,
      position: frame.position,
      homePlayerId: frame.homePlayerId,
      awayPlayerId: frame.awayPlayerId,
      winnerId: frame.winnerId || ''
    });
    setOpenScoreDialog(true);
  };

  const handleCloseScoreDialog = () => {
    setOpenScoreDialog(false);
  };

  const handleSubmitScore = async () => {
    if (!scoreDetails.frameId || !scoreDetails.winnerId) return;
    
    setLoading(true);
    try {
      await updateFrame(scoreDetails.frameId, {
        winnerId: scoreDetails.winnerId
      });
      
      fetchFrames();
      handleCloseScoreDialog();
      
      // Check if all frames are scored and update match status if needed
      const allFrames = await getFrames(matchId!);
      const allScored = allFrames.every(frame => frame.winnerId);
      
      if (allScored) {
        await updateMatch(matchId!, { status: 'completed' });
        fetchMatchData(matchId!);
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      setError('Failed to submit score');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerName = (playerId: string, team: 'home' | 'away') => {
    const players = team === 'home' ? homePlayers : awayPlayers;
    return players.find(p => p.id === playerId)?.name || 'Unknown Player';
  };

  const getWinnerChip = (frame: Frame) => {
    if (!frame.winnerId) return null;
    
    const isHomeWin = frame.winnerId === frame.homePlayerId;
    
    return (
      <Chip 
        label={isHomeWin ? 'HOME WIN' : 'AWAY WIN'} 
        color={isHomeWin ? 'primary' : 'secondary'}
        size="small"
      />
    );
  };

  const calculateScores = () => {
    const homeWins = frames.filter(f => f.winnerId === f.homePlayerId).length;
    const awayWins = frames.filter(f => f.winnerId === f.awayPlayerId).length;
    
    return { homeWins, awayWins };
  };

  const { homeWins, awayWins } = calculateScores();

  // Group frames by round
  const framesByRound = frames.reduce((acc, frame) => {
    if (!acc[frame.round]) {
      acc[frame.round] = [];
    }
    acc[frame.round].push(frame);
    return acc;
  }, {} as Record<number, Frame[]>);

  const isLineupComplete = () => {
    return (
      homeLineup.every(player => player) && 
      awayLineup.every(player => player)
    );
  };

  const canEnterLineup = () => {
    return (
      (isHomeTeamCaptain || isAwayTeamCaptain) && 
      match && 
      match.status === 'scheduled'
    );
  };

  if (!match) {
    return (
      <Container>
        <Typography>Loading match...</Typography>
        {error && <Typography color="error">{error}</Typography>}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Match Scorecard
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">
                {homeTeam?.name || 'Home Team'} vs {awayTeam?.name || 'Away Team'}
              </Typography>
              <Typography variant="body1">
                {match.scheduledDate ? format(match.scheduledDate.toDate(), 'EEEE, MMMM d, yyyy h:mm a') : 'TBD'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6">
                  Score: {homeWins} - {awayWins}
                </Typography>
                <Typography variant="body2">
                  Status: {match.status}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Lineup Selection Section */}
        {canEnterLineup() && (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Enter Lineups
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  {homeTeam?.name} Lineup
                </Typography>
                
                {[0, 1, 2, 3].map(position => (
                  <FormControl 
                    key={`home-${position}`}
                    fullWidth 
                    sx={{ mb: 2 }}
                    disabled={!isHomeTeamCaptain}
                  >
                    <InputLabel>Position {position + 1}</InputLabel>
                    <Select
                      value={homeLineup[position]}
                      onChange={(e) => handleLineupChange('home', position, e.target.value)}
                      label={`Position ${position + 1}`}
                    >
                      <MenuItem value="">Select Player</MenuItem>
                      {homePlayers.map(player => (
                        <MenuItem 
                          key={player.id} 
                          value={player.id}
                          disabled={homeLineup.includes(player.id!)}
                        >
                          {player.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  {awayTeam?.name} Lineup
                </Typography>
                
                {[0, 1, 2, 3].map(position => (
                  <FormControl 
                    key={`away-${position}`}
                    fullWidth 
                    sx={{ mb: 2 }}
                    disabled={!isAwayTeamCaptain}
                  >
                    <InputLabel>Position {String.fromCharCode(65 + position)}</InputLabel>
                    <Select
                      value={awayLineup[position]}
                      onChange={(e) => handleLineupChange('away', position, e.target.value)}
                      label={`Position ${String.fromCharCode(65 + position)}`}
                    >
                      <MenuItem value="">Select Player</MenuItem>
                      {awayPlayers.map(player => (
                        <MenuItem 
                          key={player.id} 
                          value={player.id}
                          disabled={awayLineup.includes(player.id!)}
                        >
                          {player.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={!isLineupComplete() || loading}
                  onClick={handleSubmitLineups}
                >
                  {loading ? 'Submitting...' : 'Submit Lineups'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}
        
        {/* Match Frames Section */}
        {match.status !== 'scheduled' && (
          <Box>
            {[1, 2, 3, 4].map(round => (
              <Paper key={`round-${round}`} elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Round {round}
                </Typography>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Match</TableCell>
                        <TableCell>{homeTeam?.name} Player</TableCell>
                        <TableCell>{awayTeam?.name} Player</TableCell>
                        <TableCell>Result</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {framesByRound[round]?.map(frame => (
                        <TableRow key={frame.id}>
                          <TableCell>
                            {frame.position}
                          </TableCell>
                          <TableCell>
                            {getPlayerName(frame.homePlayerId, 'home')}
                          </TableCell>
                          <TableCell>
                            {getPlayerName(frame.awayPlayerId, 'away')}
                          </TableCell>
                          <TableCell>
                            {getWinnerChip(frame)}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {!frame.winnerId && (
                                <Button
                                  size="small// src/pages/team/MatchScorecard.tsx (continued)
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleOpenScoreDialog(frame)}
                                >
                                  Enter Score
                                </Button>
                              )}
                              
                              {/* Substitution buttons */}
                              {(isHomeTeamCaptain || isAwayTeamCaptain) && 
                               round < 4 && // No substitutions in final round
                               !frames.some(f => f.round > round && f.winnerId) && // Can't substitute if later rounds have scores
                              (
                                <>
                                  {isHomeTeamCaptain && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      onClick={() => handleOpenSubstituteDialog(
                                        round + 1, 
                                        frame.position - 1,
                                        frame.homePlayerId
                                      )}
                                    >
                                      Sub Home
                                    </Button>
                                  )}
                                  
                                  {isAwayTeamCaptain && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      onClick={() => handleOpenSubstituteDialog(
                                        round + 1,
                                        frame.position - 1,
                                        frame.awayPlayerId
                                      )}
                                    >
                                      Sub Away
                                    </Button>
                                  )}
                                </>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
      
      {/* Substitute Dialog */}
      <Dialog open={openSubstituteDialog} onClose={handleCloseSubstituteDialog}>
        <DialogTitle>Substitute Player for Round {substituteDetails.round}</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <Typography variant="body1" sx={{ my: 2 }}>
            Current Player: {getPlayerName(
              substituteDetails.currentPlayerId, 
              isHomeTeamCaptain ? 'home' : 'away'
            )}
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>New Player</InputLabel>
            <Select
              value={substituteDetails.newPlayerId}
              onChange={(e) => setSubstituteDetails(prev => ({ ...prev, newPlayerId: e.target.value }))}
              label="New Player"
            >
              <MenuItem value="">Select Player</MenuItem>
              {(isHomeTeamCaptain ? homePlayers : awayPlayers)
                .filter(player => !homeLineup.includes(player.id!) && !awayLineup.includes(player.id!))
                .map(player => (
                  <MenuItem key={player.id} value={player.id}>
                    {player.name}
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubstituteDialog}>Cancel</Button>
          <Button 
            onClick={handleSubstitute}
            variant="contained" 
            color="primary"
            disabled={!substituteDetails.newPlayerId || loading}
          >
            {loading ? 'Substituting...' : 'Substitute Player'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Score Dialog */}
      <Dialog open={openScoreDialog} onClose={handleCloseScoreDialog}>
        <DialogTitle>Enter Frame Result</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Round {scoreDetails.round}, Position {scoreDetails.position}
            </Typography>
            
            <Typography variant="body1">
              {getPlayerName(scoreDetails.homePlayerId, 'home')} vs {getPlayerName(scoreDetails.awayPlayerId, 'away')}
            </Typography>
          </Box>
          
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <RadioGroup
              value={scoreDetails.winnerId}
              onChange={(e) => setScoreDetails(prev => ({ ...prev, winnerId: e.target.value }))}
            >
              <FormControlLabel 
                value={scoreDetails.homePlayerId} 
                control={<Radio />} 
                label={`${getPlayerName(scoreDetails.homePlayerId, 'home')} (Home) Wins`} 
              />
              <FormControlLabel 
                value={scoreDetails.awayPlayerId} 
                control={<Radio />} 
                label={`${getPlayerName(scoreDetails.awayPlayerId, 'away')} (Away) Wins`} 
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScoreDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitScore}
            variant="contained" 
            color="primary"
            disabled={!scoreDetails.winnerId || loading}
          >
            {loading ? 'Submitting...' : 'Submit Result'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MatchScorecard;