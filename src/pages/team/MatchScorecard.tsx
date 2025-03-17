// src/pages/team/MatchScorecard.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Paper, Button, Grid, Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress, Box } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { 
  getMatch, 
  getPlayersForTeam, 
  updateMatch, 
  addPlayerToTeam, 
  getTeams, 
  getTeam, 
  getVenue,
  getCurrentSeason,
  Season,
  Match
} from '../../services/databaseService';
import { Timestamp } from 'firebase/firestore';

// Define a type for the player object that your application expects
interface PlayerType {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  userId?: string;
  [key: string]: any;
}

// Helper function to get the proper opponent letter for each round
// This implements the correct rotation pattern: 
// Round 1: 1vA, 2vB, 3vC, 4vD
// Round 2: 1vB, 2vC, 3vD, 4vA
// Round 3: 1vC, 2vD, 3vA, 4vB
// Round 4: 1vD, 2vA, 3vB, 4vC
const getAwayOpponentForRound = (position: number, round: number): string => {
  // Calculate the letter index (0-3 for A-D)
  const letterIdx = (position + round) % 4;
  return String.fromCharCode(65 + letterIdx); // Convert to A, B, C, D
};

// Helper function to get the proper home opponent number for each round
const getHomeOpponentForRound = (position: number, round: number): number => {
  // Calculate the position (0-3 for positions 1-4)
  return ((position - round + 4) % 4) + 1; // Add 1 to convert from 0-3 to 1-4
};

// Function to safely format a Firestore timestamp or Date
const formatMatchDate = (scheduledDate: Timestamp | null | undefined) => {
  if (!scheduledDate) return 'Date not available';
  
  try {
    const dateObj = scheduledDate.toDate();
    return `${dateObj.toLocaleDateString()} at ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  } catch (err) {
    return 'Date not available';
  }
};

const MatchScorecard: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [lineup, setLineup] = useState<string[]>(Array(4).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [teams, setTeams] = useState<Record<string, any>>({});
  const [venue, setVenue] = useState<any>(null);

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
          lastName: lastName
        }, 
        currentSeason.id!
      );
      
      // Create a new player object with safe defaults
      const newPlayer: PlayerType = {
        id: result,
        firstName: firstName,
        lastName: lastName,
        email: '',
        userId: ''
      };
      
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
      
      // Only update the lineup for the user's team
      const updateData: Partial<Match> = isHomeTeam 
        ? { homeLineup: lineup }
        : { awayLineup: lineup };

      // If both teams have submitted their lineups, update the match status
      if (
        (isHomeTeam && match.awayLineup && match.awayLineup.length > 0) ||
        (!isHomeTeam && match.homeLineup && match.homeLineup.length > 0)
      ) {
        updateData.status = 'in_progress';
      }

      await updateMatch(matchId, updateData);
      setMatch({ ...match, ...updateData });

      // Show appropriate message based on whether both teams have submitted lineups
      if (updateData.status === 'in_progress') {
        setError(''); // Clear any existing errors
      } else {
        setError('Lineup submitted. Waiting for the other team to submit their lineup.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit lineup.');
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
        
        // Debug logging
        console.log('Match data received:', matchData);
        
        // We'll use the match data as-is without trying to add fields that don't exist
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
        
        // Fetch the home and away team details
        try {
          const homeTeam = await getTeam(matchData.homeTeamId);
          const awayTeam = await getTeam(matchData.awayTeamId);
          
          // Store teams in the state
          setTeams({
            [matchData.homeTeamId]: homeTeam,
            [matchData.awayTeamId]: awayTeam
          });
          
          // Fetch venue details if available
          if (matchData.venueId) {
            const venueData = await getVenue(matchData.venueId);
            setVenue(venueData);
          }
        } catch (err) {
          console.error('Error fetching team or venue details:', err);
          // Continue even if team/venue fetching fails
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

  // Function to safely get team names from the database schema
  const getTeamName = (matchData: Match, teamsData: Record<string, any>, isHome: boolean) => {
    if (isHome) {
      return teamsData[matchData.homeTeamId]?.name || matchData.homeTeamId || 'Home Team';
    } else {
      return teamsData[matchData.awayTeamId]?.name || matchData.awayTeamId || 'Away Team';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {match && userTeam && (
        <>
          {/* Match header information - moved to the top and centered */}
          <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              {userTeam.id === match.homeTeamId ? 
                `${getTeamName(match, teams, true)} (Home) vs ${getTeamName(match, teams, false)} (Away)` : 
                `${getTeamName(match, teams, true)} (Home) vs ${getTeamName(match, teams, false)} (Away)`
              }
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {formatMatchDate(match.scheduledDate)}
              {venue ? ` • ${venue.name}` : match.venueId ? ` • ${match.venueId}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {userTeam.id === match.homeTeamId ? "Your team is playing at home" : "Your team is playing away"}
            </Typography>
          </Paper>

          <Typography variant="h5" gutterBottom>Team Lineup Selection</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Player selection section */}
          <Paper sx={{ p: 3, mb: 3 }}>
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

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Match Format</Typography>
            <Paper variant="outlined" sx={{ p: 2, background: '#f9f9f9' }}>
              {Array.from({ length: 4 }).map((_, roundIndex) => (
                <Grid item xs={12} key={`round-${roundIndex}`}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: roundIndex > 0 ? 2 : 0, mb: 1 }}>
                    Round {roundIndex + 1}
                  </Typography>
                  <Grid container spacing={2}>
                    {Array.from({ length: 4 }).map((_, frameIndex) => {
                      const globalFrameIndex = roundIndex * 4 + frameIndex;
                      
                      // Determine which player breaks based on alternating pattern
                      const isHomeBreak = globalFrameIndex % 2 === 0;
                      const isUserTeamBreaking = 
                        (userTeam.id === match.homeTeamId && isHomeBreak) || 
                        (userTeam.id === match.awayTeamId && !isHomeBreak);
                      
                      // Get the correct player index based on position and rotation pattern
                      let playerIdx = frameIndex;  // Default for home team
                      
                      if (userTeam.id === match.awayTeamId) {
                        // Away team uses a rotation pattern
                        const awayRotationPatterns = [
                          [0, 1, 2, 3], // Round 1: positions A,B,C,D play in slots 0,1,2,3
                          [3, 0, 1, 2], // Round 2: positions D,A,B,C play in slots 0,1,2,3
                          [2, 3, 0, 1], // Round 3: positions C,D,A,B play in slots 0,1,2,3
                          [1, 2, 3, 0]  // Round 4: positions B,C,D,A play in slots 0,1,2,3
                        ];
                        playerIdx = awayRotationPatterns[roundIndex][frameIndex];
                      }
                      
                      return (
                        <Grid item xs={12} sm={6} md={3} key={`frame-${globalFrameIndex}`}>
                          <Paper 
                            variant="outlined" 
                            sx={{ 
                              p: 2, 
                              display: 'flex', 
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              height: '100%',
                              borderLeft: isUserTeamBreaking ? '4px solid #1976d2' : '1px solid rgba(0, 0, 0, 0.12)',
                              opacity: playerIdx < lineup.length ? 1 : 0.5,
                              textAlign: 'center'
                            }}
                          >
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                textAlign: 'center', 
                                mb: 1,
                                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                                pb: 1,
                                textDecoration: 'underline'  // Add underline to the Frame title
                              }}
                            >
                              Frame {globalFrameIndex + 1}
                            </Typography>
                            
                            {userTeam.id === match.homeTeamId ? (
                              // Home team view
                              <Box sx={{ my: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Player {frameIndex + 1}
                                </Typography>
                                <Typography variant="body2" sx={{ my: 0.5 }}>
                                  vs
                                </Typography>
                              </Box>
                            ) : (
                              // Away team view
                              <Box sx={{ my: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Player {String.fromCharCode(65 + frameIndex)}
                                </Typography>
                                <Typography variant="body2" sx={{ my: 0.5 }}>
                                  vs
                                </Typography>
                              </Box>
                            )}
                            
                            <Typography variant="body2" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                              {(() => {
                                // Get the player assigned to this position
                                const playerId = lineup[playerIdx];
                                
                                if (!playerId) return "Select player";
                                
                                const player = players.find(p => p.id === playerId);
                                let playerName = player ? `${player.firstName || ''} ${player.lastName || ''}`.trim() : "Unknown player";
                                
                                // Add (B) for the breaking player
                                if (isUserTeamBreaking) {
                                  playerName += " (B)";
                                }
                                
                                return playerName;
                              })()}
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
              ))}
            </Paper>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default MatchScorecard;