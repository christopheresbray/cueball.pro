// src/pages/team/MatchScorecard.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Paper, Button, Grid, Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress, Box } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { getMatch, getPlayersForTeam, updateMatch, addPlayerToTeam, getTeams } from '../../services/databaseService';
import { getCurrentSeason, Season } from '../../services/databaseService';

// Define a type for the player object that your application expects
interface PlayerType {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  userId?: string;
  [key: string]: any;
}

const MatchScorecard: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [lineup, setLineup] = useState<string[]>(Array(4).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [frameCount, setFrameCount] = useState<number>(16); // Total frames in the match

  // Function declarations
  const handleLineupChange = (index: number, playerId: string) => {
    // Check if this player is already selected in another position
    const playerAlreadySelected = lineup.findIndex((id, idx) => id === playerId && idx !== index) !== -1;
    
    if (playerAlreadySelected) {
      setError('This player is already in your lineup. Each player can only play once.');
      return;
    }
    
    // Clear any previous error when making a valid selection
    if (error.includes('already in your lineup')) {
      setError('');
    }
    
    const updatedLineup = [...lineup];
    updatedLineup[index] = playerId;
    setLineup(updatedLineup);
  };

  const handleAddPlayerSlot = () => {
    setLineup([...lineup, '']);
  };

  const handleRemovePlayerSlot = (index: number) => {
    const updatedLineup = [...lineup];
    updatedLineup.splice(index, 1);
    setLineup(updatedLineup);
  };

  const handleAddNewPlayer = async (playerName?: string): Promise<PlayerType | null> => {
    // If playerName isn't provided, we'll use a prompt
    const newPlayerName = playerName || prompt("Enter new player's full name (First Last):");
    if (!newPlayerName || !userTeam || !currentSeason) return null;

    // Split the name into first and last name
    const nameParts = newPlayerName.trim().split(' ');
    const firstName = nameParts[0] || '';
    // Join the rest as lastName in case of multiple last names
    const lastName = nameParts.slice(1).join(' ') || '';
    
    try {
      const result = await addPlayerToTeam(
        userTeam.id, 
        { 
          firstName: firstName,
          lastName: lastName,
          email: '',
          userId: '' 
        }, 
        currentSeason.id!
      );
      
      // Create a new player object with safe defaults
      const newPlayer: PlayerType = {
        id: '',
        firstName: firstName,
        lastName: lastName,
        email: '',
        userId: ''
      };
      
      // Handle different possible return types
      if (result !== null && typeof result === 'object') {
        // Try to safely extract properties if they exist
        const resultObj = result as any;
        if (resultObj.id) newPlayer.id = String(resultObj.id);
        if (resultObj.firstName) newPlayer.firstName = String(resultObj.firstName);
        if (resultObj.lastName) newPlayer.lastName = String(resultObj.lastName);
        if (resultObj.email) newPlayer.email = String(resultObj.email);
        if (resultObj.userId) newPlayer.userId = String(resultObj.userId);
      } else if (typeof result === 'string') {
        // If the result is just a string ID
        newPlayer.id = result;
      }
      
      setPlayers([...players, newPlayer]);
      return newPlayer;
    } catch (err: any) {
      setError(err.message || 'Failed to add new player.');
      return null;
    }
  };

  const handlePlayerSelection = async (index: number, value: string) => {
    // Check if this is the special "Add New Player" option
    if (value === 'add_new_player') {
      const newPlayer = await handleAddNewPlayer();
      if (newPlayer) {
        handleLineupChange(index, newPlayer.id);
      }
      return;
    }
    
    // Otherwise, handle as a normal player selection
    handleLineupChange(index, value);
  };

  const handleStartMatch = async () => {
    if (!matchId || !match || !userTeam || !currentSeason) return;
    
    if (lineup.some(id => !id)) {
      setError('Please select all players before starting the match.');
      return;
    }

    try {
      const isHomeTeam = match.homeTeamId === userTeam.id;
      
      // Update only the user's team lineup and match status
      const updateData = isHomeTeam 
        ? { homeLineup: lineup, status: 'in_progress' as 'scheduled' | 'in_progress' | 'completed' }
        : { awayLineup: lineup, status: 'in_progress' as 'scheduled' | 'in_progress' | 'completed' };

      await updateMatch(matchId, updateData);
      setMatch({ ...match, ...updateData });
    } catch (err: any) {
      setError(err.message || 'Failed to start match.');
    }
  };

  useEffect(() => {
    const fetchSeason = async () => {
      try {
        const season = await getCurrentSeason();
        setCurrentSeason(season);
      } catch (err) {
        setError('Failed to load current season.');
        setLoading(false);
      }
    };
    
    fetchSeason();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!matchId || !currentSeason || !user) return;
      
      setLoading(true);
      setError('');
      
      try {
        // Get the match data
        const matchData = await getMatch(matchId);
        if (!matchData) {
          setError('Match not found.');
          setLoading(false);
          return;
        }
        
        setMatch(matchData);
        
        // Find the user's team
        const userTeams = await getTeams(currentSeason.id!);
        const captainTeam = userTeams.find(team => team.captainId === user.uid);
        
        if (!captainTeam) {
          setError('You are not the captain of any team in this match.');
          setLoading(false);
          return;
        }
        
        setUserTeam(captainTeam);
        
        // Check if the user's team is participating in this match
        const isHomeTeam = matchData.homeTeamId === captainTeam.id;
        const isAwayTeam = matchData.awayTeamId === captainTeam.id;
        
        if (!isHomeTeam && !isAwayTeam) {
          setError('Your team is not participating in this match.');
          setLoading(false);
          return;
        }
        
        // Get the players for the user's team
        const fetchedPlayers = await getPlayersForTeam(captainTeam.id!, currentSeason.id!);
        // Convert to our internal PlayerType
        const typedPlayers = fetchedPlayers.map(p => ({
          id: p.id || '',
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          email: p.email || '',
          userId: p.userId || ''
        }));
        
        setPlayers(typedPlayers);
        
        // Set the lineup based on whether the user is home or away captain
        if (isHomeTeam && matchData.homeLineup) {
          setLineup(matchData.homeLineup);
        } else if (isAwayTeam && matchData.awayLineup) {
          setLineup(matchData.awayLineup);
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to load match data.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [matchId, currentSeason, user]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Team Lineup Selection</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {match && userTeam && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            {/* Match info header */}
            <Typography variant="h6" gutterBottom>
              {match.homeTeamName} vs {match.awayTeamName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {new Date(match.date).toLocaleDateString()} at {new Date(match.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              {match.venue && ` • ${match.venue}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {userTeam.id === match.homeTeamId ? "Your team is playing at home" : "Your team is playing away"}
            </Typography>

            {/* Visual match frames layout */}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>Match Format</Typography>
            <Paper variant="outlined" sx={{ p: 2, background: '#f9f9f9' }}>
              <Grid container spacing={2}>
                {Array.from({ length: 4 }).map((_, roundIdx) => (
                  <Grid item xs={12} key={`round-${roundIdx}`}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: roundIdx > 0 ? 2 : 0, mb: 1 }}>
                      Round {roundIdx + 1}
                    </Typography>
                    <Grid container spacing={2}>
                      {Array.from({ length: 4 }).map((_, frameIdx) => {
                        const globalFrameIdx = roundIdx * 4 + frameIdx;
                        const lineupIdx = globalFrameIdx < lineup.length ? globalFrameIdx : null;
                        
                        // Determine breaking team based on frame number
                        const isHomeBreak = globalFrameIdx % 2 === 0;
                        const isUserTeamBreaking = 
                          (userTeam.id === match.homeTeamId && isHomeBreak) || 
                          (userTeam.id === match.awayTeamId && !isHomeBreak);
                        
                        return (
                          <Grid item xs={12} sm={6} md={3} key={`frame-${globalFrameIdx}`}>
                            <Paper 
                              variant="outlined" 
                              sx={{ 
                                p: 2, 
                                display: 'flex', 
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: '100%',
                                borderLeft: isUserTeamBreaking ? '4px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                                // Gray out frames beyond current lineup size
                                opacity: lineupIdx !== null ? 1 : 0.5
                              }}
                            >
                              <Box>
                                <Typography variant="subtitle2">Frame {globalFrameIdx + 1}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {isUserTeamBreaking ? "Your player breaks" : "Opponent breaks"}
                                </Typography>
                              </Box>
                              <Box sx={{ mt: 1 }}>
                                {lineupIdx !== null ? (
                                  <Typography variant="body2" sx={{ fontWeight: lineup[lineupIdx] ? 'bold' : 'normal' }}>
                                    {lineup[lineupIdx] ? 
                                      players.find(p => p.id === lineup[lineupIdx])?.firstName + ' ' + 
                                      players.find(p => p.id === lineup[lineupIdx])?.lastName : 
                                      "Select player"}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    Add more players
                                  </Typography>
                                )}
                              </Box>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Select Your Players</Typography>
              {match?.status === 'scheduled' && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleAddPlayerSlot} 
                  sx={{ ml: 2 }}
                >
                  Add Player Slot
                </Button>
              )}
            </Box>
            <Grid container spacing={2}>
              {lineup.map((playerId, idx) => (
                <Grid item xs={12} sm={6} key={idx}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControl fullWidth>
                      <InputLabel>{`Player ${idx + 1}`}</InputLabel>
                      <Select
                        value={playerId}
                        label={`Player ${idx + 1}`}
                        onChange={(e) => handlePlayerSelection(idx, e.target.value as string)}
                        disabled={match?.status !== 'scheduled'}
                      >
                        {players.map(player => {
                          // Check if this player is already selected in another position
                          const isDisabled = lineup.includes(player.id) && playerId !== player.id;
                          return (
                            <MenuItem 
                              key={player.id} 
                              value={player.id}
                              disabled={isDisabled}
                              sx={isDisabled ? { opacity: 0.5 } : {}}
                            >
                              {player.firstName} {player.lastName}
                              {isDisabled ? ' (already selected)' : ''}
                            </MenuItem>
                          );
                        })}
                        {/* Special menu item for adding a new player */}
                        <MenuItem 
                          value="add_new_player"
                          sx={{ 
                            fontWeight: 'bold', 
                            borderTop: '1px solid #e0e0e0',
                            color: '#1976d2',
                            mt: 1
                          }}
                        >
                          ++ADD NEW PLAYER TO ROSTER++
                        </MenuItem>
                      </Select>
                    </FormControl>
                    {match?.status === 'scheduled' && lineup.length > 1 && (
                      <Button 
                        color="error" 
                        size="small" 
                        onClick={() => handleRemovePlayerSlot(idx)}
                        sx={{ ml: 1, minWidth: '40px' }}
                      >
                        ✕
                      </Button>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>

            {match?.status === 'scheduled' && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={handleAddPlayerSlot}
                  startIcon={<span>+</span>}
                >
                  Add Player Slot
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleStartMatch}
                  disabled={lineup.some(id => !id)}
                >
                  Submit Lineup
                </Button>
              </Box>
            )}

            {match?.status !== 'scheduled' && (
              <Alert severity="info" sx={{ mt: 2 }}>Match has started. Player selection locked.</Alert>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
};

export default MatchScorecard;