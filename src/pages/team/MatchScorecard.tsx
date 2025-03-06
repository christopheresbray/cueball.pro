// src/pages/team/MatchScorecard.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Divider,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  SwapHoriz as SwapHorizIcon,
  EmojiEvents as TrophyIcon,
  Sports as SportsIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { SelectChangeEvent } from '@mui/material/Select';

import { useAuth } from '../../context/AuthContext';
import {
  Match,
  Team,
  Player,
  Frame,
  Venue,
  getMatch,
  getTeam,
  getPlayers,
  getFrames,
  getVenue,
  updateMatch,
  createFrame,
  updateFrame
} from '../../services/databaseService';

// Define match steps
const steps = ['Team Lineup', 'Round 1', 'Round 2', 'Round 3', 'Round 4', 'Match Summary'];

// Define the substitution interface
interface Substitution {
  position: number;
  newPlayerId: string;
}

// Interface for match pairings
interface Pairing {
  homePosition: number;
  awayPosition: number;
}

// Define match round structure with pairings
const roundPairings: Record<number, Pairing[]> = {
  1: [
    { homePosition: 0, awayPosition: 0 }, // 1 vs A
    { homePosition: 1, awayPosition: 1 }, // 2 vs B
    { homePosition: 2, awayPosition: 2 }, // 3 vs C
    { homePosition: 3, awayPosition: 3 }  // 4 vs D
  ],
  2: [
    { homePosition: 0, awayPosition: 1 }, // 1 vs B
    { homePosition: 1, awayPosition: 2 }, // 2 vs C
    { homePosition: 2, awayPosition: 3 }, // 3 vs D
    { homePosition: 3, awayPosition: 0 }  // 4 vs A
  ],
  3: [
    { homePosition: 0, awayPosition: 2 }, // 1 vs C
    { homePosition: 1, awayPosition: 3 }, // 2 vs D
    { homePosition: 2, awayPosition: 0 }, // 3 vs A
    { homePosition: 3, awayPosition: 1 }  // 4 vs B
  ],
  4: [
    { homePosition: 0, awayPosition: 3 }, // 1 vs D
    { homePosition: 1, awayPosition: 0 }, // 2 vs A
    { homePosition: 2, awayPosition: 1 }, // 3 vs B
    { homePosition: 3, awayPosition: 2 }  // 4 vs C
  ]
};

const MatchScorecard: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Match data
  const [match, setMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  
  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingLineup, setIsEditingLineup] = useState(false);
  const [isSubstituting, setIsSubstituting] = useState(false);
  const [isUserCaptain, setIsUserCaptain] = useState(false);
  const [isHomeTeamCaptain, setIsHomeTeamCaptain] = useState(false);

  // Team lineup state
  const [homeLineup, setHomeLineup] = useState<string[]>([]);
  const [awayLineup, setAwayLineup] = useState<string[]>([]);
  const [substitutingTeam, setSubstitutingTeam] = useState<'home' | 'away' | null>(null);
  const [substitutionRound, setSubstitutionRound] = useState(0);
  const [substitutionPosition, setSubstitutionPosition] = useState(0);
  const [substitutionPlayer, setSubstitutionPlayer] = useState('');
  
  // Match progress state
  const [matchProgress, setMatchProgress] = useState<{
    currentRound: number;
    roundsCompleted: number[];
    homeScore: number;
    awayScore: number;
  }>({
    currentRound: 1,
    roundsCompleted: [],
    homeScore: 0,
    awayScore: 0
  });

  // Fetch match data
  useEffect(() => {
    if (matchId) {
      fetchMatchData(matchId);
    }
  }, [matchId]);

  // Determine if user is captain and set UI accordingly
  useEffect(() => {
    if (match && user && (homeTeam || awayTeam)) {
      const isHomeCaptain = homeTeam?.captainId === user.uid;
      const isAwayCaptain = awayTeam?.captainId === user.uid;
      
      setIsUserCaptain(isHomeCaptain || isAwayCaptain);
      setIsHomeTeamCaptain(isHomeCaptain);
      
      // Auto-navigate to appropriate step based on match status
      if (match.status === 'scheduled' && (isHomeCaptain || isAwayCaptain)) {
        setActiveStep(0); // Team Lineup
      } else if (match.status === 'in_progress') {
        // Find current round from existing frames
        const completedRounds = [...new Set(frames
          .filter(frame => frame.winnerId) // Only completed frames
          .map(frame => frame.round))];
        
        const roundsCompleted = completedRounds.sort((a, b) => a - b);
        const currentRound = (roundsCompleted.length >= 4) ? 5 : roundsCompleted.length + 1;
        
        setMatchProgress({
          currentRound,
          roundsCompleted,
          homeScore: frames.filter(f => f.winnerId === f.homePlayerId).length,
          awayScore: frames.filter(f => f.winnerId === f.awayPlayerId).length
        });
        
        setActiveStep(currentRound); // Set step to current round or match summary
      } else if (match.status === 'completed') {
        setActiveStep(5); // Match Summary
      }
    }
  }, [match, user, homeTeam, awayTeam, frames]);

  // When lineup is initialized from match data, update local state
  useEffect(() => {
    if (match) {
      setHomeLineup(match.homeLineup || []);
      setAwayLineup(match.awayLineup || []);
    }
  }, [match]);

  // When frames change, update match progress
  useEffect(() => {
    if (frames.length > 0) {
      const homeWins = frames.filter(f => f.winnerId === f.homePlayerId).length;
      const awayWins = frames.filter(f => f.winnerId === f.awayPlayerId).length;
      
      setMatchProgress(prev => ({
        ...prev,
        homeScore: homeWins,
        awayScore: awayWins
      }));
    }
  }, [frames]);

  const fetchMatchData = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch the match
      const matchData = await getMatch(id);
      if (!matchData) {
        setError('Match not found');
        setLoading(false);
        return;
      }
      
      setMatch(matchData);
      
      // Fetch teams
      const homeTeamData = await getTeam(matchData.homeTeamId);
      const awayTeamData = await getTeam(matchData.awayTeamId);
      setHomeTeam(homeTeamData);
      setAwayTeam(awayTeamData);
      
      // Fetch venue
      const venueData = await getVenue(matchData.venueId);
      setVenue(venueData);
      
      // Fetch players for both teams
      if (homeTeamData) {
        const homePlayersData = await getPlayers(homeTeamData.id!);
        setHomePlayers(homePlayersData);
      }
      
      if (awayTeamData) {
        const awayPlayersData = await getPlayers(awayTeamData.id!);
        setAwayPlayers(awayPlayersData);
      }
      
      // Fetch frames
      const framesData = await getFrames(id);
      setFrames(framesData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching match data:', error);
      setError('Failed to fetch match data');
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate lineup before proceeding
      if (homeLineup.length !== 4 || homeLineup.some(p => !p) || 
          awayLineup.length !== 4 || awayLineup.some(p => !p)) {
        setError('Please select complete lineups for both teams');
        return;
      }
      
      // Save lineups to the match
      saveLineups();
    }
    
    // If at a round step, check if all frames are complete
    if (activeStep >= 1 && activeStep <= 4) {
      const roundFrames = frames.filter(f => f.round === activeStep);
      const allFramesComplete = roundFrames.length === 4 && roundFrames.every(f => f.winnerId);
      
      if (!allFramesComplete) {
        setError(`Please complete all frames for Round ${activeStep}`);
        return;
      }
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const saveLineups = async () => {
    if (!match || !matchId) return;
    
    try {
      // Update match with lineups
      await updateMatch(matchId, {
        homeLineup,
        awayLineup,
        status: 'in_progress' // Change status to in_progress
      });
      
      // Create frame entries for round 1
      if (frames.length === 0) {
        await createFramesForRound(1);
      }
      
      // Refresh match data
      fetchMatchData(matchId);
    } catch (error) {
      console.error('Error saving lineups:', error);
      setError('Failed to save lineups');
    }
  };

  const createFramesForRound = async (round: number) => {
    if (!match || !matchId) return;
    
    try {
      // Get current lineups with any substitutions applied
      const currentHomeLineup = getCurrentLineup('home', round);
      const currentAwayLineup = getCurrentLineup('away', round);
      
      // Create frames for the round based on the pairing pattern
      const framePromises = roundPairings[round].map(async (pairing, index) => {
        const frameData: Frame = {
          matchId,
          round,
          position: index + 1,
          homePlayerId: currentHomeLineup[pairing.homePosition],
          awayPlayerId: currentAwayLineup[pairing.awayPosition]
        };
        
        return await createFrame(frameData);
      });
      
      await Promise.all(framePromises);
    } catch (error) {
      console.error(`Error creating frames for round ${round}:`, error);
      throw error;
    }
  };

  const handleEditLineup = () => {
    setIsEditingLineup(true);
  };

  const handleSaveLineup = async () => {
    if (!match || !matchId) return;
    
    try {
      await updateMatch(matchId, {
        homeLineup,
        awayLineup
      });
      
      setIsEditingLineup(false);
      // Refresh match data
      fetchMatchData(matchId);
    } catch (error) {
      console.error('Error saving lineup:', error);
      setError('Failed to save lineup');
    }
  };

  const handleCancelEditLineup = () => {
    // Reset to original values
    if (match) {
      setHomeLineup(match.homeLineup || []);
      setAwayLineup(match.awayLineup || []);
    }
    setIsEditingLineup(false);
  };

  const handleHomeLineupChange = (index: number, playerId: string) => {
    const newLineup = [...homeLineup];
    newLineup[index] = playerId;
    setHomeLineup(newLineup);
  };

  const handleAwayLineupChange = (index: number, playerId: string) => {
    const newLineup = [...awayLineup];
    newLineup[index] = playerId;
    setAwayLineup(newLineup);
  };

  const handleOpenSubstitution = (team: 'home' | 'away', round: number) => {
    if (round <= 1) {
      setError('Substitutions are not allowed in Round 1');
      return;
    }
    
    // Check if this team has already made a substitution
    const existingSubstitutions = match?.[team === 'home' ? 'homeSubstitutes' : 'awaySubstitutes'] || {};
    const roundKey = `round${round}`;
    
    if (existingSubstitutions[roundKey]) {
      setError(`${team === 'home' ? 'Home' : 'Away'} team has already made a substitution for Round ${round}`);
      return;
    }
    
    setSubstitutingTeam(team);
    setSubstitutionRound(round);
    setSubstitutionPosition(0);
    setSubstitutionPlayer('');
    setIsSubstituting(true);
  };

  const handleSubstitutionChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    
    if (name === 'position') {
      setSubstitutionPosition(Number(value));
    } else if (name === 'player') {
      setSubstitutionPlayer(value);
    }
  };

  const handleSaveSubstitution = async () => {
    if (!match || !matchId || !substitutingTeam || substitutionRound <= 1 || !substitutionPlayer) {
      setError('Invalid substitution data');
      return;
    }
    
    try {
      // Update match with substitution
      const field = substitutingTeam === 'home' ? 'homeSubstitutes' : 'awaySubstitutes';
      const roundKey = `round${substitutionRound}`;
      
      const substitutes = match[field] || {};
      substitutes[roundKey] = {
        position: substitutionPosition,
        player: substitutionPlayer
      };
      
      await updateMatch(matchId, {
        [field]: substitutes
      });
      
      // Close dialog
      setIsSubstituting(false);
      
      // Create frames for the next round with updated lineup
      await createFramesForRound(substitutionRound);
      
      // Refresh match data
      fetchMatchData(matchId);
    } catch (error) {
      console.error('Error saving substitution:', error);
      setError('Failed to save substitution');
    }
  };

  const handleCancelSubstitution = () => {
    setIsSubstituting(false);
  };

  const getCurrentLineup = (team: 'home' | 'away', round: number): string[] => {
    if (!match) return [];
    
    const baseLineup = team === 'home' ? match.homeLineup : match.awayLineup;
    if (!baseLineup) return [];
    
    // Copy the lineup
    const currentLineup = [...baseLineup];
    
    // Apply substitutions for rounds up to the current round
    const substitutes = match[team === 'home' ? 'homeSubstitutes' : 'awaySubstitutes'] || {};
    
    for (let r = 2; r <= round; r++) {
      const roundKey = `round${r}`;
      if (substitutes[roundKey]) {
        const sub = substitutes[roundKey];
        currentLineup[sub.position] = sub.player;
      }
    }
    
    return currentLineup;
  };

  const getPlayerName = (playerId: string | undefined, team: 'home' | 'away'): string => {
    if (!playerId) return 'Not selected';
    
    const players = team === 'home' ? homePlayers : awayPlayers;
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  };
  
  const getFramesForRound = (round: number): Frame[] => {
    return frames.filter(f => f.round === round).sort((a, b) => a.position - b.position);
  };

  const handleSetFrameWinner = async (frame: Frame, winnerId: string) => {
    if (!frame.id) return;
    
    try {
      await updateFrame(frame.id, { winnerId });
      
      // Check if this completes the round
      const roundFrames = frames.filter(f => f.round === frame.round);
      const updatedFrames = roundFrames.map(f => {
        if (f.id === frame.id) {
          return { ...f, winnerId };
        }
        return f;
      });
      
      const allFramesComplete = updatedFrames.length === 4 && updatedFrames.every(f => f.winnerId);
      
      // If all frames complete and not last round, create frames for next round
      if (allFramesComplete && frame.round < 4) {
        await createFramesForRound(frame.round + 1);
      }
      
      // If all rounds are complete, mark match as completed
      if (allFramesComplete && frame.round === 4 && matchId) {
        await updateMatch(matchId, { status: 'completed' });
      }
      
      // Refresh match data
      fetchMatchData(matchId);
    } catch (error) {
      console.error('Error updating frame winner:', error);
      setError('Failed to update frame winner');
    }
  };

  const renderTeamLineup = () => {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Team Lineups</Typography>
          {isUserCaptain && (
            isEditingLineup ? (
              <Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleSaveLineup}
                  sx={{ mr: 1 }}
                >
                  Save
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleCancelEditLineup}
                >
                  Cancel
                </Button>
              </Box>
            ) : (
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />}
                onClick={handleEditLineup}
                disabled={match?.status === 'completed'}
              >
                Edit Lineup
              </Button>
            )
          )}
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              {homeTeam?.name || 'Home Team'} (Players 1-4)
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Position</TableCell>
                    <TableCell>Player</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[0, 1, 2, 3].map((index) => (
                    <TableRow key={`home-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {isEditingLineup && isHomeTeamCaptain ? (
                          <FormControl fullWidth size="small">
                            <Select
                              value={homeLineup[index] || ''}
                              onChange={(e) => handleHomeLineupChange(index, e.target.value)}
                            >
                              <MenuItem value="">
                                <em>Select Player</em>
                              </MenuItem>
                              {homePlayers.map((player) => (
                                <MenuItem 
                                  key={player.id} 
                                  value={player.id!}
                                  disabled={homeLineup.includes(player.id!)}
                                >
                                  {player.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          homeLineup[index] ? getPlayerName(homeLineup[index], 'home') : 'Not selected'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              {awayTeam?.name || 'Away Team'} (Players A-D)
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Position</TableCell>
                    <TableCell>Player</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[0, 1, 2, 3].map((index) => (
                    <TableRow key={`away-${index}`}>
                      <TableCell>{String.fromCharCode(65 + index)}</TableCell>
                      <TableCell>
                        {isEditingLineup && !isHomeTeamCaptain && isUserCaptain ? (
                          <FormControl fullWidth size="small">
                            <Select
                              value={awayLineup[index] || ''}
                              onChange={(e) => handleAwayLineupChange(index, e.target.value)}
                            >
                              <MenuItem value="">
                                <em>Select Player</em>
                              </MenuItem>
                              {awayPlayers.map((player) => (
                                <MenuItem 
                                  key={player.id} 
                                  value={player.id!}
                                  disabled={awayLineup.includes(player.id!)}
                                >
                                  {player.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          awayLineup[index] ? getPlayerName(awayLineup[index], 'away') : 'Not selected'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderRound = (round: number) => {
    const roundFrames = getFramesForRound(round);
    const homeLineupForRound = getCurrentLineup('home', round);
    const awayLineupForRound = getCurrentLineup('away', round);
    
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Round {round}</Typography>
          <Box>
            {isUserCaptain && round > 1 && (
              <Button
                variant="outlined"
                startIcon={<SwapHorizIcon />}
                onClick={() => handleOpenSubstitution(isHomeTeamCaptain ? 'home' : 'away', round)}
                disabled={match?.status === 'completed' || round in matchProgress.roundsCompleted}
                sx={{ mr: 1 }}
              >
                Substitution
              </Button>
            )}
          </Box>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Frame</TableCell>
                <TableCell>Home Player</TableCell>
                <TableCell>Away Player</TableCell>
                <TableCell>Winner</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roundPairings[round].map((pairing, index) => {
                const frame = roundFrames.find(f => f.position === index + 1);
                const homePlayerId = homeLineupForRound[pairing.homePosition];
                const awayPlayerId = awayLineupForRound[pairing.awayPosition];
                
                return (
                  <TableRow key={`round-${round}-frame-${index}`}>
                    <TableCell>{`${index + 1}`}</TableCell>
                    <TableCell>
                      {`${pairing.homePosition + 1}: ${getPlayerName(homePlayerId, 'home')}`}
                    </TableCell>
                    <TableCell>
                      {`${String.fromCharCode(65 + pairing.awayPosition)}: ${getPlayerName(awayPlayerId, 'away')}`}
                    </TableCell>
                    <TableCell>
                      {isUserCaptain && frame && !frame.winnerId && match?.status !== 'completed' ? (
                        <Box>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleSetFrameWinner(frame, homePlayerId)}
                            sx={{ mr: 1 }}
                          >
                            Home Win
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleSetFrameWinner(frame, awayPlayerId)}
                          >
                            Away Win
                          </Button>
                        </Box>
                      ) : frame && frame.winnerId ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label={frame.winnerId === homePlayerId ? 'Home Win' : 'Away Win'}
                          color={frame.winnerId === homePlayerId ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      ) : (
                        'Not played'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderMatchSummary = () => {
    const homeWins = frames.filter(f => f.winnerId === f.homePlayerId).length;
    const awayWins = frames.filter(f => f.winnerId === f.awayPlayerId).length;
    
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Match Summary</Typography>
        
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5">
            {homeTeam?.name || 'Home Team'} {homeWins} - {awayWins} {awayTeam?.name || 'Away Team'}
          </Typography>
          <Chip
            icon={homeWins > awayWins ? <CheckCircleIcon /> : (homeWins < awayWins ? <CancelIcon /> : <SwapHorizIcon />)}
            label={homeWins > awayWins ? 'Home Win' : (homeWins < awayWins ? 'Away Win' : 'Draw')}
            color={homeWins > awayWins ? 'primary' : (homeWins < awayWins ? 'secondary' : 'default')}
            sx={{ mt: 1 }}
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              {homeTeam?.name || 'Home Team'} Player Performance
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
                    <TableCell align="center">Played</TableCell>
                    <TableCell align="center">Won</TableCell>
                    <TableCell align="center">Win %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {homePlayers
                    .filter(player => frames.some(f => f.homePlayerId === player.id))
                    .map(player => {
                      const playerFrames = frames.filter(f => f.homePlayerId === player.id);
                      const played = playerFrames.length;
                      const won = playerFrames.filter(f => f.winnerId === player.id).length;
                      const winPercentage = played > 0 ? Math.round((won / played) * 100) : 0;
                      
                      return (
                        <TableRow key={player.id}>
                          <TableCell>{player.name}</TableCell>
                          <TableCell align="center">{played}</TableCell>
                          <TableCell align="center">{won}</TableCell>
                          <TableCell align="center">{winPercentage}%</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              {awayTeam?.name || 'Away Team'} Player Performance
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
                    <TableCell align="center">Played</TableCell>
                    <TableCell align="center">Won</TableCell>
                    <TableCell align="center">Win %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {awayPlayers
                    .filter(player => frames.some(f => f.awayPlayerId === player.id))
                    .map(player => {
                      const playerFrames = frames.filter(f => f.awayPlayerId === player.id);
                      const played = playerFrames.length;
                      const won = playerFrames.filter(f => f.winnerId === player.id).length;
                      const winPercentage = played > 0 ? Math.round((won / played) * 100) : 0;
                      
                      return (
                        <TableRow key={player.id}>
                          <TableCell>{player.name}</TableCell>
                          <TableCell align="center">{played}</TableCell>
                          <TableCell align="center">{won}</TableCell>
                          <TableCell align="center">{winPercentage}%</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
        
        <Box mt={3}>
          <Typography variant="subtitle1" gutterBottom>Round Results</Typography>
          
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map(round => {
              const roundFrames = frames.filter(f => f.round === round);
              const homeWins = roundFrames.filter(f => f.winnerId === f.homePlayerId).length;
              const awayWins = roundFrames.filter(f => f.winnerId === f.awayPlayerId).length;
              
              return (
                <Grid item xs={6} sm={3} key={round}>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      backgroundColor: homeWins > awayWins ? '#e3f2fd' : (homeWins < awayWins ? '#fce4ec' : '#ffffff')
                    }}
                  >
                    <Typography variant="subtitle2">Round {round}</Typography>
                    <Typography variant="h6">
                      {homeWins} - {awayWins}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/team')}
            sx={{ mr: 2 }}
          >
            Back to Dashboard
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={() => setActiveStep(0)}
          >
            View Match Details
          </Button>
        </Box>
      </Paper>
    );
  };

  const renderSubstitutionDialog = () => {
    const team = substitutingTeam === 'home' ? homeTeam : awayTeam;
    const players = substitutingTeam === 'home' ? homePlayers : awayPlayers;
    const lineup = substitutingTeam === 'home' ? homeLineup : awayLineup;
    
    // Get players who are not in the current lineup
    const benchPlayers = players.filter(player => !lineup.includes(player.id!));
    
    return (
      <Dialog open={isSubstituting} onClose={handleCancelSubstitution}>
        <DialogTitle>Make Substitution for Round {substitutionRound}</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="position-label">Replace Player</InputLabel>
              <Select
                labelId="position-label"
                name="position"
                value={substitutionPosition.toString()}
                label="Replace Player"
                onChange={handleSubstitutionChange}
              >
                {[0, 1, 2, 3].map(index => (
                  <MenuItem key={`pos-${index}`} value={index.toString()}>
                    {substitutingTeam === 'home' 
                      ? `${index + 1}: ${getPlayerName(lineup[index], substitutingTeam)}` 
                      : `${String.fromCharCode(65 + index)}: ${getPlayerName(lineup[index], substitutingTeam)}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel id="player-label">Substitute Player</InputLabel>
              <Select
                labelId="player-label"
                name="player"
                value={substitutionPlayer}
                label="Substitute Player"
                onChange={handleSubstitutionChange}
              >
                {benchPlayers.map(player => (
                  <MenuItem key={player.id} value={player.id!}>
                    {player.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSubstitution}>Cancel</Button>
          <Button 
            onClick={handleSaveSubstitution} 
            variant="contained" 
            disabled={!substitutionPlayer}
          >
            Make Substitution
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Main render
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4, mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/team')}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!match) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ mt: 4, mb: 2 }}>
          Match not found
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/team')}>
          Back to Dashboard
        </Button>
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
              <Typography variant="body2" color="text.secondary">
                Venue: {venue?.name || 'Unknown'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="h6">
                  Score: {matchProgress.homeScore} - {matchProgress.awayScore}
                </Typography>
                <Chip 
                  label={match.status.charAt(0).toUpperCase() + match.status.slice(1)} 
                  color={match.status === 'completed' ? 'success' : (match.status === 'in_progress' ? 'warning' : 'default')}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {activeStep === 0 && renderTeamLineup()}
        {activeStep >= 1 && activeStep <= 4 && renderRound(activeStep)}
        {activeStep === 5 && renderMatchSummary()}
        
        {activeStep !== 5 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={match.status === 'completed'}
            >
              {activeStep === steps.length - 2 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        )}
        
        {renderSubstitutionDialog()}
      </Box>
    </Container>
  );
};

export default MatchScorecard;
