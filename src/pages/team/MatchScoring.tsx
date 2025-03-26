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
  getTeamByPlayerId,
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
  getTeams,
} from '../../services/databaseService';

const MatchScoring: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, isAdmin } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openFrameDialog, setOpenFrameDialog] = useState(false);
  const [openLineupDialog, setOpenLineupDialog] = useState(false);
  const [editingHomeTeam, setEditingHomeTeam] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState<{
    round: number;
    position: number;
    homePlayerId: string;
    awayPlayerId: string;
  } | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [activeRound, setActiveRound] = useState<number>(1);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);
  const [showingSubstitutionDialog, setShowingSubstitutionDialog] = useState<number | null>(null);
  const [isConfirmingRound, setIsConfirmingRound] = useState<number | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const isUserHomeTeamCaptain = userTeam?.id === match?.homeTeamId;
  const [substitutingPosition, setSubstitutingPosition] = useState<number | null>(null);
  const [substitutingHomeTeam, setSubstitutingHomeTeam] = useState(true);
  const [selectedSubstitute, setSelectedSubstitute] = useState<string>('');
  const [editingFrame, setEditingFrame] = useState<{round: number, position: number} | null>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);

  // Add new state to track lineup history
  const [lineupHistory, setLineupHistory] = useState<{
    [round: number]: {
      homeLineup: string[];
      awayLineup: string[];
    };
  }>({});

  // Add click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (frameRef.current && !frameRef.current.contains(event.target as Node)) {
        setEditingFrame(null);
      }
    };

    if (editingFrame) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingFrame]);

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

  const handleFrameClick = (round: number, position: number) => {
    if (!isRoundActive(round)) return;
    
    // If we're already editing this frame, cancel the edit
    if (editingFrame?.round === round && editingFrame?.position === position) {
      setEditingFrame(null);
      return;
    }

    setEditingFrame({ round, position });
  };

  const handleSelectWinner = async (round: number, position: number, winnerId: string) => {
    if (!match?.id) return;

    try {
      const frameId = `${round}-${position}`;
      const existingFrameResults = match.frameResults || {};
      const homePlayerId = getPlayerForRound(round + 1, position, true);
      const awayPlayerId = getPlayerForRound(round + 1, position, false);

      // Create the frame document
      const frameData: Frame = {
        matchId: match.id,
        round: round,
        position: position,
        homePlayerId: homePlayerId,
        awayPlayerId: awayPlayerId,
        winnerId: winnerId,
        seasonId: match.seasonId,
        homeScore: winnerId === homePlayerId ? 1 : 0,
        awayScore: winnerId === awayPlayerId ? 1 : 0
      };

      // Create the frame document
      const frameRef = await createDocument('frames', frameData);
      
      const updateData: Partial<Match> = {
        frameResults: {
          ...existingFrameResults,
          [frameId]: {
            winnerId: winnerId,
            homeScore: winnerId === homePlayerId ? 1 : 0,
            awayScore: winnerId === awayPlayerId ? 1 : 0,
          },
        },
      };

      // Check if all frames in the round are completed
      const allFramesInRound = Array.from({ length: 4 }, (_, i) => `${round}-${i}`);
      const roundFrames = allFramesInRound.map(id => updateData.frameResults![id]);
      const isRoundComplete = roundFrames.every(frame => frame?.winnerId);

      if (isRoundComplete) {
        updateData.currentRound = round + 1;
        updateData.roundScored = true;
      }

      await updateMatch(match.id, updateData);
      
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

      setEditingFrame(null);
    } catch (err: any) {
      console.error('Error submitting frame result:', err);
      setError(err.message || 'Failed to submit frame result');
    }
  };

  const handleResetFrame = async (round: number, position: number) => {
    if (!match?.id) return;

    try {
      const frameId = `${round}-${position}`;
      const existingFrameResults = { ...match.frameResults };
      delete existingFrameResults[frameId];

      const updateData: Partial<Match> = {
        frameResults: existingFrameResults
      };

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: existingFrameResults
        };
      });

      setEditingFrame(null);
    } catch (err: any) {
      console.error('Error resetting frame:', err);
      setError(err.message || 'Failed to reset frame');
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

  // Helper function to check if all frames in a round are scored
  const isRoundComplete = (roundIndex: number) => {
    return Array.from({ length: 4 }).every((_, position) => 
      isFrameScored(roundIndex, position)
    );
  };

  // Helper function to check if a round is active
  const isRoundActive = (roundIndex: number) => {
    return roundIndex + 1 === activeRound;
  };

  // Helper function to check if a round can be played
  const isRoundPlayable = (roundIndex: number) => {
    if (roundIndex + 1 === 1) return true; // First round is always playable
    return completedRounds.includes(roundIndex); // Previous round must be completed
  };

  // Handle round confirmation
  const handleRoundConfirmation = (roundIndex: number) => {
    setCompletedRounds([...completedRounds, roundIndex]);
    setActiveRound(roundIndex + 2); // Move to next round
    setShowingSubstitutionDialog(roundIndex + 1);
  };

  const handleResetMatch = async () => {
    if (!match?.id || !isUserHomeTeamCaptain) return;

    if (window.confirm('Are you sure you want to reset all match results? This will clear all frame results but keep lineups intact.')) {
      try {
        // Get the original lineups from the first round
        const originalHomeLineup = match.homeLineup?.filter((_, i) => i < 4) || [];
        const originalAwayLineup = match.awayLineup?.filter((_, i) => i < 4) || [];

        // Update match to clear frame results and reset round state
        const updateData: Partial<Match> = {
          frameResults: {},
          currentRound: 1,
          roundScored: false,
          status: 'in_progress',
          homeLineup: originalHomeLineup,
          awayLineup: originalAwayLineup
        };

        await updateMatch(match.id, updateData);
        
        // Update local state
        setMatch(prevMatch => {
          if (!prevMatch) return null;
          return {
            ...prevMatch,
            ...updateData
          };
        });
        setActiveRound(1);
        setCompletedRounds([]);
        setShowingSubstitutionDialog(null);
        // Clear lineup history
        setLineupHistory({});
        setError('');
      } catch (err: any) {
        console.error('Error resetting match:', err);
        setError(err.message || 'Failed to reset match');
      }
    }
  };

  const handleOpenLineupDialog = (isHomeTeam: boolean) => {
    setEditingHomeTeam(isHomeTeam);
    setSelectedPlayers(isHomeTeam ? match?.homeLineup || [] : match?.awayLineup || []);
    setOpenLineupDialog(true);
  };

  const handleCloseLineupDialog = () => {
    setOpenLineupDialog(false);
    setSelectedPlayers([]);
  };

  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSelection = [...prev];
      const index = newSelection.indexOf(playerId);
      if (index === -1) {
        newSelection.push(playerId);
      } else {
        newSelection.splice(index, 1);
      }
      return newSelection;
    });
  };

  const handleSaveLineup = async () => {
    if (!match?.id) return;

    try {
      const updateData: Partial<Match> = {
        [editingHomeTeam ? 'homeLineup' : 'awayLineup']: selectedPlayers
      };

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          ...updateData
        };
      });

      handleCloseLineupDialog();
    } catch (err: any) {
      console.error('Error updating lineup:', err);
      setError(err.message || 'Failed to update lineup');
    }
  };

  const handleSubstitution = async (position: number, isHomeTeam: boolean) => {
    setSubstitutingPosition(position);
    setSubstitutingHomeTeam(isHomeTeam);
    setSelectedSubstitute('');
  };

  // Modify getPlayerForRound to use the correct rotation pattern
  const getPlayerForRound = (round: number, position: number, isHomeTeam: boolean): string => {
    // For round 1, use the initial lineup
    if (round === 1) {
      if (isHomeTeam) {
        return match?.homeLineup?.[position] || '';
      } else {
        return match?.awayLineup?.[position] || '';
      }
    }

    // For other rounds, check the lineup history
    if (lineupHistory[round]) {
      if (isHomeTeam) {
        return lineupHistory[round].homeLineup[position];
      } else {
        // Apply the rotation pattern for away team
        const rotatedPosition = getOpponentPosition(round, position, false);
        return lineupHistory[round].awayLineup[rotatedPosition];
      }
    }

    // If we don't have a recorded lineup for this round,
    // look for the most recent recorded lineup before this round
    for (let r = round - 1; r >= 1; r--) {
      if (lineupHistory[r]) {
        if (isHomeTeam) {
          return lineupHistory[r].homeLineup[position];
        } else {
          // Apply the rotation pattern for away team
          const rotatedPosition = getOpponentPosition(round, position, false);
          return lineupHistory[r].awayLineup[rotatedPosition];
        }
      }
    }

    // If no history is found, fall back to the initial lineup
    if (isHomeTeam) {
      return match?.homeLineup?.[position] || '';
    } else {
      // Apply the rotation pattern for away team
      const rotatedPosition = getOpponentPosition(round, position, false);
      return match?.awayLineup?.[rotatedPosition] || '';
    }
  };

  // Add helper function to get substitutes for a specific round
  const getSubstitutesForRound = (round: number, isHomeTeam: boolean): string[] => {
    // Get all players from the initial lineup
    const allPlayers = isHomeTeam ? match?.homeLineup || [] : match?.awayLineup || [];
    
    // Get the current active players for this round
    const activePlayers = Array.from({ length: 4 }, (_, i) => 
      getPlayerForRound(round, i, isHomeTeam)
    );
    
    // Return players who are not currently active
    return allPlayers.filter(playerId => !activePlayers.includes(playerId));
  };

  // Modify handleConfirmSubstitution to properly track substitutes
  const handleConfirmSubstitution = async (position: number, isHomeTeam: boolean, playerId: string) => {
    if (!match?.id || !playerId) return;

    try {
      const nextRound = activeRound;
      
      // Get the current lineup for this round
      let currentHomeLineup = [...(match.homeLineup || [])];
      let currentAwayLineup = [...(match.awayLineup || [])];
      
      // If we have history for the current round, use that instead
      if (lineupHistory[nextRound]) {
        currentHomeLineup = [...lineupHistory[nextRound].homeLineup];
        currentAwayLineup = [...lineupHistory[nextRound].awayLineup];
      }
      
      // Update the appropriate lineup
      if (isHomeTeam) {
        // Store the player being replaced as a substitute
        const replacedPlayer = currentHomeLineup[position];
        currentHomeLineup[position] = playerId;
      } else {
        // Store the player being replaced as a substitute
        const replacedPlayer = currentAwayLineup[position];
        currentAwayLineup[position] = playerId;
      }

      const updateData: Partial<Match> = {
        [isHomeTeam ? 'homeLineup' : 'awayLineup']: isHomeTeam ? currentHomeLineup : currentAwayLineup
      };

      // Record the lineup for this round in history
      setLineupHistory(prev => ({
        ...prev,
        [nextRound]: {
          homeLineup: currentHomeLineup,
          awayLineup: currentAwayLineup
        }
      }));

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          ...updateData
        };
      });

    } catch (err: any) {
      console.error('Error making substitution:', err);
      setError(err.message || 'Failed to make substitution');
    }
  };

  // Add helper function to determine who plays against whom in each round
  const getOpponentPosition = (round: number, position: number, isHome: boolean): number => {
    if (isHome) {
      // Home team positions (1-4) stay fixed, playing A,B,C,D in sequence
      return position;
    } else {
      // Away team positions rotate each round
      // Round 1: A,B,C,D plays against 1,2,3,4
      // Round 2: B,C,D,A plays against 1,2,3,4
      // Round 3: C,D,A,B plays against 1,2,3,4
      // Round 4: D,A,B,C plays against 1,2,3,4
      return (position + (round - 1)) % 4;
    }
  };

  // Add helper function to determine who breaks in each frame
  const isHomeTeamBreaking = (round: number, position: number): boolean => {
    // Home team breaks in odd-numbered frames (0-based index)
    const frameNumber = (round - 1) * 4 + position;
    return frameNumber % 2 === 0;
  };

  useEffect(() => {
    const fetchMatchData = async () => {
      if (!matchId || !user) return;

      try {
        setLoading(true);
        setError('');

        // Get match data first
        const matchData = await getMatch(matchId);
        if (!matchData) {
          setError('Match not found');
          return;
        }

        // Try to find user's team first through team_players
        let userTeamData = await getTeamByPlayerId(user.uid);
        
        // If not found in team_players, check teams directly for captainUserId
        if (!userTeamData) {
          const allTeams = await getTeams('');
          const captainTeam = allTeams.find(team => team.captainUserId === user.uid);
          if (captainTeam) {
            userTeamData = captainTeam;
          }
        }

        if (!userTeamData || !userTeamData.id) {
          setError('User team not found');
          return;
        }

        // Get full team data
        const fullTeamData = await getTeam(userTeamData.id);
        if (!fullTeamData) {
          setError('User team data not found');
          return;
        }
        setUserTeam(fullTeamData);

        // Check if user is home team captain
        if (fullTeamData.id !== matchData.homeTeamId) {
          setError('Only the home team captain can score this match');
          return;
        }

        const [homeTeamData, awayTeamData, venueData] = await Promise.all([
          getTeam(matchData.homeTeamId),
          getTeam(matchData.awayTeamId),
          matchData.venueId ? getVenue(matchData.venueId) : null,
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
          top: 64,
          zIndex: 1000,
          bgcolor: 'background.default',
          pb: 2
        }}
      >
        <Container maxWidth="lg">
          {isUserHomeTeamCaptain && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: -1 }}>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={handleResetMatch}
                sx={{ textTransform: 'none' }}
              >
                Reset Match Results (Testing Only)
              </Button>
            </Box>
          )}
          <Paper 
            elevation={3}
            sx={{ 
              p: 2,
              mt: 2,
              bgcolor: 'background.paper',
              borderRadius: 1
            }}
          >
            <Box sx={{ 
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'space-between',
              gap: 2
            }}>
              {/* Home Team */}
              <Box sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <Typography 
                  variant="h6" 
                  component="div"
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '64px',
                    textAlign: 'center'
                  }}
                >
                  {homeTeam.name.split(' ').map((word, index, array) => (
                    <React.Fragment key={index}>
                      {word}
                      {index < array.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </Typography>
                <Typography 
                  variant="h4" 
                  component="div"
                  sx={{ 
                    fontWeight: 'bold',
                    mt: 1
                  }}
                >
                  {matchScore.home}
                </Typography>
              </Box>

              {/* Divider */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2
              }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 'light'
                  }}
                >
                  -
                </Typography>
              </Box>

              {/* Away Team */}
              <Box sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <Typography 
                  variant="h6" 
                  component="div"
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '64px',
                    textAlign: 'center'
                  }}
                >
                  {awayTeam.name.split(' ').map((word, index, array) => (
                    <React.Fragment key={index}>
                      {word}
                      {index < array.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </Typography>
                <Typography 
                  variant="h4" 
                  component="div"
                  sx={{ 
                    fontWeight: 'bold',
                    mt: 1
                  }}
                >
                  {matchScore.away}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleOpenLineupDialog(true)}
              sx={{ textTransform: 'none' }}
            >
              Edit Home Team Lineup
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleOpenLineupDialog(false)}
              sx={{ textTransform: 'none' }}
            >
              Edit Away Team Lineup
            </Button>
          </Box>
        )}

        <Paper sx={{ p: 3 }}>
          {Array.from({ length: 4 }).map((_, roundIndex) => (
            <Box key={`round-${roundIndex}`} sx={{ mb: 4 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 'bold',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                    pb: 1,
                    mb: 2,
                    textAlign: 'center',
                    color: isRoundActive(roundIndex) ? 'text.primary' : 'text.disabled'
                  }}>
                    Round {roundIndex + 1}
                  </Typography>
                </Grid>

                {Array.from({ length: 4 }).map((_, position) => {
                  const frameId = `${roundIndex}-${position}`;
                  const isScored = isFrameScored(roundIndex, position);
                  const winnerId = getFrameWinner(roundIndex, position);
                  const homePlayerId = getPlayerForRound(roundIndex + 1, position, true);
                  const awayPlayerId = getPlayerForRound(roundIndex + 1, position, false);
                  const homePlayerName = getPlayerName(homePlayerId || '', true);
                  const awayPlayerName = getPlayerName(awayPlayerId || '', false);
                  const isSubstitutionRound = showingSubstitutionDialog === roundIndex;

                  return (
                    <Grid item xs={12} key={frameId} sx={{ mb: 1 }}>
                      <Paper
                        ref={frameRef}
                        variant="outlined"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 1,
                          cursor: isRoundActive(roundIndex) ? 'pointer' : 'default',
                          opacity: isRoundActive(roundIndex) ? 1 : 0.7,
                          bgcolor: editingFrame?.round === roundIndex && editingFrame?.position === position 
                            ? 'action.selected'
                            : isRoundActive(roundIndex) ? 'background.paper' : 'action.disabledBackground',
                          '&:hover': {
                            bgcolor: isRoundActive(roundIndex) ? 'action.hover' : undefined
                          }
                        }}
                        onClick={() => isRoundActive(roundIndex) && !isSubstitutionRound && handleFrameClick(roundIndex, position)}
                      >
                        <Box sx={{ 
                          width: 30, 
                          textAlign: 'center',
                          fontWeight: 'bold',
                          mr: 2 
                        }}>
                          {position + 1}
                        </Box>

                        {/* Home Player Side */}
                        <Box sx={{ 
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          {isSubstitutionRound && isUserHomeTeamCaptain ? (
                            <FormControl fullWidth size="small">
                              <Select
                                value={homePlayerId || ''}
                                onChange={(e) => handleConfirmSubstitution(position, true, e.target.value)}
                                sx={{ minWidth: 150 }}
                              >
                                <MenuItem value={homePlayerId}>{homePlayerName}</MenuItem>
                                {match.homeLineup
                                  ?.filter(pid => !Array.from({ length: 4 }).some((_, pos) => match.homeLineup?.[pos] === pid))
                                  .map((pid) => (
                                    <MenuItem key={pid} value={pid}>
                                      {getPlayerName(pid, true)}
                                    </MenuItem>
                                  ))
                                }
                              </Select>
                            </FormControl>
                          ) : (
                            <>
                              {isScored && winnerId === homePlayerId && (
                                <Box component="span" sx={{ 
                                  bgcolor: 'success.light',
                                  color: 'success.contrastText',
                                  px: 1,
                                  borderRadius: 1,
                                  fontSize: '0.875rem'
                                }}>
                                  W
                                </Box>
                              )}
                              <Box 
                                sx={{ 
                                  cursor: editingFrame?.round === roundIndex && editingFrame?.position === position 
                                    ? 'pointer' 
                                    : 'inherit',
                                  '&:hover': editingFrame?.round === roundIndex && editingFrame?.position === position 
                                    ? { 
                                        bgcolor: 'action.hover',
                                        borderRadius: 1,
                                        px: 1
                                      } 
                                    : {}
                                }}
                                onClick={(e) => {
                                  if (editingFrame?.round === roundIndex && editingFrame?.position === position) {
                                    e.stopPropagation();
                                    if (isScored && winnerId === homePlayerId) {
                                      handleResetFrame(roundIndex, position);
                                    } else {
                                      handleSelectWinner(roundIndex, position, homePlayerId);
                                    }
                                  }
                                }}
                              >
                                <Typography 
                                  sx={{ 
                                    textAlign: 'left',
                                    fontWeight: winnerId === homePlayerId ? 'bold' : 'normal',
                                    display: 'flex',
                                    flexDirection: 'column'
                                  }}
                                >
                                  {homePlayerName}
                                  {isHomeTeamBreaking(roundIndex + 1, position) && (
                                    <Box
                                      component="span"
                                      sx={{
                                        color: 'primary.main',
                                        fontSize: '0.75rem',
                                        fontStyle: 'italic',
                                        mt: 0.5
                                      }}
                                    >
                                      Breaker
                                    </Box>
                                  )}
                                  {editingFrame?.round === roundIndex && editingFrame?.position === position && (
                                    <Box
                                      component="span"
                                      sx={{
                                        color: isScored && winnerId === homePlayerId ? 'error.main' : 'success.main',
                                        fontSize: '0.75rem',
                                        mt: 0.5
                                      }}
                                    >
                                      {isScored && winnerId === homePlayerId ? 'Click to reset' : 'Click to select winner'}
                                    </Box>
                                  )}
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Box>

                        {/* VS Divider */}
                        <Box sx={{ 
                          px: 2,
                          color: 'text.secondary',
                          fontSize: '0.875rem'
                        }}>
                          vs
                        </Box>

                        {/* Away Player Side */}
                        <Box sx={{ 
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          justifyContent: 'flex-end'
                        }}>
                          {isSubstitutionRound && !isUserHomeTeamCaptain ? (
                            <FormControl fullWidth size="small">
                              <Select
                                value={awayPlayerId || ''}
                                onChange={(e) => handleConfirmSubstitution(position, false, e.target.value)}
                                sx={{ minWidth: 150 }}
                              >
                                <MenuItem value={awayPlayerId}>{awayPlayerName}</MenuItem>
                                {match.awayLineup
                                  ?.filter(pid => !Array.from({ length: 4 }).some((_, pos) => match.awayLineup?.[pos] === pid))
                                  .map((pid) => (
                                    <MenuItem key={pid} value={pid}>
                                      {getPlayerName(pid, false)}
                                    </MenuItem>
                                  ))
                                }
                              </Select>
                            </FormControl>
                          ) : (
                            <>
                              <Box 
                                sx={{ 
                                  cursor: editingFrame?.round === roundIndex && editingFrame?.position === position 
                                    ? 'pointer' 
                                    : 'inherit',
                                  '&:hover': editingFrame?.round === roundIndex && editingFrame?.position === position 
                                    ? { 
                                        bgcolor: 'action.hover',
                                        borderRadius: 1,
                                        px: 1
                                      } 
                                    : {}
                                }}
                                onClick={(e) => {
                                  if (editingFrame?.round === roundIndex && editingFrame?.position === position) {
                                    e.stopPropagation();
                                    if (isScored && winnerId === awayPlayerId) {
                                      handleResetFrame(roundIndex, position);
                                    } else {
                                      handleSelectWinner(roundIndex, position, awayPlayerId);
                                    }
                                  }
                                }}
                              >
                                <Typography 
                                  sx={{ 
                                    textAlign: 'right',
                                    fontWeight: winnerId === awayPlayerId ? 'bold' : 'normal',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end'
                                  }}
                                >
                                  {awayPlayerName}
                                  {!isHomeTeamBreaking(roundIndex + 1, position) && (
                                    <Box
                                      component="span"
                                      sx={{
                                        color: 'primary.main',
                                        fontSize: '0.75rem',
                                        fontStyle: 'italic',
                                        mt: 0.5
                                      }}
                                    >
                                      Breaker
                                    </Box>
                                  )}
                                  {editingFrame?.round === roundIndex && editingFrame?.position === position && (
                                    <Box
                                      component="span"
                                      sx={{
                                        color: isScored && winnerId === awayPlayerId ? 'error.main' : 'success.main',
                                        fontSize: '0.75rem',
                                        mt: 0.5
                                      }}
                                    >
                                      {isScored && winnerId === awayPlayerId ? 'Click to reset' : 'Click to select winner'}
                                    </Box>
                                  )}
                                </Typography>
                              </Box>
                              {isScored && winnerId === awayPlayerId && (
                                <Box component="span" sx={{ 
                                  bgcolor: 'success.light',
                                  color: 'success.contrastText',
                                  px: 1,
                                  borderRadius: 1,
                                  fontSize: '0.875rem'
                                }}>
                                  W
                                </Box>
                              )}
                            </>
                          )}
                        </Box>

                        <Box sx={{ 
                          width: 30, 
                          textAlign: 'center',
                          fontWeight: 'bold',
                          ml: 2 
                        }}>
                          {String.fromCharCode(65 + getOpponentPosition(roundIndex + 1, position, false))}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Round Confirmation Button */}
              {isRoundActive(roundIndex) && isRoundComplete(roundIndex) && isUserHomeTeamCaptain && (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    mt: 2, 
                    mb: 3,
                    bgcolor: 'info.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'info.contrastText' }}>
                    Round {roundIndex + 1} is complete. Make any substitutions for the next round using the dropdowns above.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleRoundConfirmation(roundIndex)}
                    sx={{ ml: 2 }}
                  >
                    Continue to Next Round
                  </Button>
                </Paper>
              )}

              {/* Substitutes Display */}
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 'bold', 
                  mb: 2,
                  textAlign: 'center',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  pb: 1
                }}>
                  Substitutes
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  position: 'relative'
                }}>
                  {/* Home Team Subs */}
                  <Box sx={{ 
                    flex: 1,
                    pr: 2,
                    borderRight: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {getSubstitutesForRound(roundIndex + 1, true).map((playerId) => (
                        <Typography key={playerId} variant="body2">
                          (Sub) {getPlayerName(playerId, true)}
                        </Typography>
                      ))}
                      {getSubstitutesForRound(roundIndex + 1, true).length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          No substitutes
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Away Team Subs */}
                  <Box sx={{ 
                    flex: 1,
                    pl: 2
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                      {getSubstitutesForRound(roundIndex + 1, false).map((playerId) => (
                        <Typography key={playerId} variant="body2">
                          {getPlayerName(playerId, false)} (Sub)
                        </Typography>
                      ))}
                      {getSubstitutesForRound(roundIndex + 1, false).length === 0 && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'right' }}>
                          No substitutes
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Box>
          ))}
        </Paper>

        {/* Lineup Edit Dialog */}
        <Dialog
          open={openLineupDialog}
          onClose={handleCloseLineupDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Edit {editingHomeTeam ? 'Home' : 'Away'} Team Lineup
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Select Players (Current lineup will be replaced)
              </Typography>
              {(editingHomeTeam ? homePlayers : awayPlayers).map((player) => (
                <Box
                  key={player.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    bgcolor: selectedPlayers.includes(player.id!) ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    mb: 1
                  }}
                  onClick={() => handlePlayerSelection(player.id!)}
                >
                  <Typography>
                    {player.firstName} {player.lastName}
                  </Typography>
                </Box>
              ))}
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLineupDialog}>Cancel</Button>
            <Button
              onClick={handleSaveLineup}
              variant="contained"
              disabled={selectedPlayers.length === 0}
            >
              Save Lineup
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default MatchScoring; 