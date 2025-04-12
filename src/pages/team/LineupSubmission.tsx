// src/pages/team/LineupSubmission.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Paper, Button, Grid, Alert, CircularProgress, Box,
  Card, CardContent, Divider, Avatar, List, ListItem, ListItemText, ListItemAvatar
} from '@mui/material';
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
  Match,
  isUserTeamCaptain
} from '../../services/databaseService';
import { Timestamp } from 'firebase/firestore';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

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
const formatMatchDate = (matchDate: Timestamp | null | undefined) => {
  if (!matchDate) return 'Date not available';
  
  try {
    const dateObj = matchDate.toDate();
    return `${dateObj.toLocaleDateString()} at ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  } catch (err) {
    return 'Date not available';
  }
};

const LineupSubmission: React.FC = () => {
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
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);
  const navigate = useNavigate();

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
    setSelectedPlayerIndex(null); // Close the selection after choosing a player
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

  const handleSelectPositionClick = (index: number) => {
    setSelectedPlayerIndex(selectedPlayerIndex === index ? null : index);
  };

  const handleStartMatch = async () => {
    if (!matchId || !match || !userTeam || !currentSeason) {
      console.log('Submission validation failed:', {
        matchId: !!matchId,
        match: !!match,
        userTeam: !!userTeam,
        currentSeason: !!currentSeason
      });
      return;
    }
    
    if (lineup.some(id => !id)) {
      console.log('Lineup validation failed:', lineup);
      setError('Please select all players before starting the match.');
      return;
    }

    try {
      setLoading(true);
      const isHomeTeam = match.homeTeamId === userTeam.id;
      console.log('Submitting lineup:', {
        isHomeTeam,
        lineup,
        matchId,
        userTeamId: userTeam.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId
      });
      
      // Only update the lineup for the user's team
      const updateData: Partial<Match> = isHomeTeam 
        ? { homeLineup: lineup }
        : { awayLineup: lineup };

      console.log('Update data:', updateData);

      // If both teams have submitted their lineups, update the match status
      if (
        (isHomeTeam && match.awayLineup && match.awayLineup.length > 0) ||
        (!isHomeTeam && match.homeLineup && match.homeLineup.length > 0)
      ) {
        updateData.status = 'in_progress';
        console.log('Setting match to in_progress');
      }

      await updateMatch(matchId, updateData);
      
      // No need to navigate here - the real-time listener will handle it
      // The navigation will happen automatically when the match status changes
      
    } catch (err: any) {
      console.error('Error submitting lineup:', err);
      setError(err.message || 'Failed to submit lineup');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerById = (playerId: string) => {
    return players.find(player => player.id === playerId);
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
        // Get the match data first
        const matchData = await getMatch(matchId);
        if (!matchData) {
          setError('Match not found.');
          setLoading(false);
          return;
        }
        
        console.log('Match data:', {
          id: matchData.id,
          homeTeamId: matchData.homeTeamId,
          awayTeamId: matchData.awayTeamId,
          status: matchData.status,
        });
        
        // Ensure match is in a valid state for lineup submission
        if (matchData.status !== 'scheduled') {
          setError(`Match is ${matchData.status}. Lineups can only be submitted for scheduled matches.`);
          setLoading(false);
          return;
        }
        
        // Fetch both teams to determine which one the user is captain of
        const [homeTeamData, awayTeamData] = await Promise.all([
          getTeam(matchData.homeTeamId),
          getTeam(matchData.awayTeamId)
        ]);

        if (!homeTeamData || !awayTeamData) {
          setError('Failed to load team data.');
          setLoading(false);
          return;
        }
        
        // Check if user is captain for either team
        const [isHomeCaptain, isAwayCaptain] = await Promise.all([
          isUserTeamCaptain(user.uid, matchData.homeTeamId),
          isUserTeamCaptain(user.uid, matchData.awayTeamId)
        ]);
        
        if (!isHomeCaptain && !isAwayCaptain) {
          setError('You must be a team captain to submit a lineup.');
          setLoading(false);
          return;
        }
        
        // Set the user's team based on which team they are captain of
        const userTeamData = isHomeCaptain ? homeTeamData : awayTeamData;
        setUserTeam(userTeamData);
        
        // Update the teams state
        const teamsData: Record<string, any> = {};
        teamsData[matchData.homeTeamId] = homeTeamData;
        teamsData[matchData.awayTeamId] = awayTeamData;
        setTeams(teamsData);
        
        // Fetch venue if available
        const venueData = matchData.venueId ? await getVenue(matchData.venueId) : null;
        setVenue(venueData);
        
        // Set the match after all the checks
        setMatch(matchData);
        
        // Get players for the user's team using userTeamData
        const teamPlayers = await getPlayersForTeam(userTeamData.id, currentSeason.id!);
        setPlayers(teamPlayers.map(player => ({
          id: player.id || '',
          firstName: player.firstName || '',
          lastName: player.lastName || '',
          email: player.email || '',
          userId: player.userId || ''
        })));
        
        // Initialize lineup from match data if available
        const isHomeTeam = matchData.homeTeamId === userTeamData.id;
        const existingLineup = isHomeTeam ? matchData.homeLineup : matchData.awayLineup;
        
        if (existingLineup && existingLineup.length > 0) {
          setLineup(existingLineup);
        }
      } catch (err: any) {
        console.error('Error in fetchData:', err);
        setError(err.message || 'Failed to load match data.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [matchId, currentSeason, user]);

  // Add real-time match status monitoring
  useEffect(() => {
    if (!matchId) return;

    // Set up real-time listener for match changes
    const unsubscribe = onSnapshot(
      doc(db, 'matches', matchId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const matchData = { id: docSnapshot.id, ...docSnapshot.data() } as Match;
          setMatch(matchData);
          
          // If match status is 'in_progress', redirect to scoring page
          if (matchData.status === 'in_progress') {
            console.log('Match started, redirecting to scoring page...');
            navigate(`/team/match/${matchId}/score`, { replace: true });
          }
        }
      },
      (error) => {
        console.error('Error listening to match updates:', error);
        setError('Failed to monitor match status. Please refresh the page.');
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [matchId, navigate]);

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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {match && userTeam && (
        <>
          {/* Match header information */}
          <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom>
              {userTeam.id === match.homeTeamId ? 
                `${getTeamName(match, teams, true)} (Home) vs ${getTeamName(match, teams, false)} (Away)` : 
                `${getTeamName(match, teams, true)} (Home) vs ${getTeamName(match, teams, false)} (Away)`
              }
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {formatMatchDate(match.date)}
              {venue ? ` • ${venue.name}` : match.venueId ? ` • ${match.venueId}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {userTeam.id === match.homeTeamId ? "Your team is playing at home" : "Your team is playing away"}
            </Typography>
          </Paper>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Grid container spacing={3}>
            {/* Left side - Team Roster */}
            <Grid item xs={12} md={4}>
              <Paper 
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  bgcolor: userTeam.id === match.homeTeamId ? 'primary.light' : 'secondary.light',
                  color: 'white',
                  borderRadius: 2
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Your Team Roster
                </Typography>
                <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {players.map(player => {
                    const isSelected = lineup.includes(player.id);
                    const position = lineup.findIndex(id => id === player.id);
                    const positionLabel = userTeam.id === match.homeTeamId 
                      ? position > -1 ? `Position ${position + 1}` : '' 
                      : position > -1 ? `Position ${String.fromCharCode(65 + position)}` : '';
                    
                    return (
                      <ListItem 
                        key={player.id}
                        sx={{ 
                          mb: 1, 
                          bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                          borderRadius: 1,
                          opacity: selectedPlayerIndex !== null && lineup[selectedPlayerIndex] === player.id ? 1 : 
                                   selectedPlayerIndex !== null ? 0.6 : 1
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              bgcolor: isSelected ? '#fff' : 'rgba(255,255,255,0.3)',
                              color: isSelected ? (userTeam.id === match.homeTeamId ? 'primary.main' : 'secondary.main') : '#fff'
                            }}
                          >
                            {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={`${player.firstName} ${player.lastName}`}
                          secondary={positionLabel}
                          secondaryTypographyProps={{ 
                            sx: { color: '#fff', opacity: 0.8, fontWeight: isSelected ? 'bold' : 'normal' } 
                          }}
                        />
                        {selectedPlayerIndex !== null && !isSelected && (
                          <Button 
                            variant="contained" 
                            size="small"
                            color="inherit"
                            onClick={() => handleLineupChange(selectedPlayerIndex, player.id)}
                            sx={{ 
                              ml: 1, 
                              color: userTeam.id === match.homeTeamId ? 'primary.main' : 'secondary.main',
                              bgcolor: '#fff'
                            }}
                          >
                            Select
                          </Button>
                        )}
                      </ListItem>
                    );
                  })}
                  {players.length === 0 && (
                    <ListItem sx={{ opacity: 0.7 }}>
                      <ListItemText primary="No players available" />
                    </ListItem>
                  )}
                </List>
                
                <Button 
                  variant="outlined" 
                  color="inherit" 
                  fullWidth 
                  sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.5)' }}
                  onClick={() => handleAddNewPlayer()}
                >
                  + Add New Player
                </Button>
              </Paper>
            </Grid>
            
            {/* Right side - Lineup Selection */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>Team Lineup Selection</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Select 4 players for your team. Click on a position card below, then select a player from your roster.
                </Typography>
                
                {/* Position Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const positionLabel = userTeam.id === match.homeTeamId 
                      ? (idx + 1).toString() 
                      : String.fromCharCode(65 + idx);
                    const playerId = lineup[idx];
                    const player = getPlayerById(playerId);
                    const isSelected = selectedPlayerIndex === idx;
                    
                    return (
                      <Grid item xs={12} sm={6} md={3} key={idx}>
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            height: '100%',
                            bgcolor: isSelected ? (userTeam.id === match.homeTeamId ? 'primary.light' : 'secondary.light') : 
                                     player ? 'background.paper' : 'action.hover',
                            color: isSelected ? '#fff' : 'text.primary',
                            border: isSelected ? '2px solid' : playerId ? '1px solid' : '1px dashed',
                            borderColor: isSelected 
                              ? (userTeam.id === match.homeTeamId ? 'primary.main' : 'secondary.main')
                              : playerId ? 'divider' : 'action.disabledBackground',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: userTeam.id === match.homeTeamId ? 'primary.main' : 'secondary.main',
                              boxShadow: 2
                            }
                          }}
                          onClick={() => handleSelectPositionClick(idx)}
                        >
                          <CardContent sx={{ textAlign: 'center', p: 2 }}>
                            <Avatar 
                              sx={{ 
                                width: 50, 
                                height: 50, 
                                margin: '0 auto 12px', 
                                bgcolor: isSelected ? '#fff' : 
                                         (userTeam.id === match.homeTeamId ? 'primary.main' : 'secondary.main'),
                                color: isSelected 
                                  ? (userTeam.id === match.homeTeamId ? 'primary.main' : 'secondary.main') 
                                  : '#fff',
                                fontSize: '1.25rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {positionLabel}
                            </Avatar>
                            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
                              Position {positionLabel}
                            </Typography>
                            <Box sx={{ mt: 1, minHeight: 45 }}>
                              {player ? (
                                <Typography variant="body1">
                                  {player.firstName} {player.lastName}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color={isSelected ? 'inherit' : 'text.secondary'} sx={{ fontStyle: 'italic' }}>
                                  Click to select player
                                </Typography>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    disabled={lineup.some(id => !id) || loading}
                    onClick={handleStartMatch}
                    sx={{ minWidth: 150 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Submit Lineup'}
                  </Button>
                </Box>
              </Paper>
              
              {/* Match Overview */}
              <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>Match Overview</Typography>
                
                <Grid container spacing={1}>
                  {Array.from({ length: 4 }).map((_, roundIdx) => (
                    <Grid item xs={12} key={roundIdx}>
                      <Paper 
                        variant="outlined" 
                        sx={{ p: 2, my: 1, bgcolor: 'background.default' }}
                      >
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                          Round {roundIdx + 1}
                        </Typography>
                        <Grid container spacing={1}>
                          {Array.from({ length: 4 }).map((_, frameIdx) => {
                            // Determine players for this frame based on rotation pattern
                            let homePlayerIdx = frameIdx;
                            // For away team, use rotation pattern
                            let awayPlayerIdx = (homePlayerIdx + roundIdx) % 4;
                            
                            // Get labels based on team
                            const homeLabel = (homePlayerIdx + 1).toString();
                            const awayLabel = String.fromCharCode(65 + awayPlayerIdx);
                            
                            const isUserHome = userTeam.id === match.homeTeamId;
                            const userPlayerIdx = isUserHome ? homePlayerIdx : awayPlayerIdx;
                            const playerId = lineup[userPlayerIdx];
                            const player = getPlayerById(playerId);
                            
                            // Determine the breaking player (alternating pattern)
                            const frameNumber = roundIdx * 4 + frameIdx;
                            const isHomeBreak = frameNumber % 2 === 0;
                            const userBreaking = (isUserHome && isHomeBreak) || (!isUserHome && !isHomeBreak);
                            
                            return (
                              <Grid item xs={6} sm={3} key={frameIdx}>
                                <Paper 
                                  variant="outlined" 
                                  sx={{ 
                                    p: 1, 
                                    textAlign: 'center',
                                    borderLeft: userBreaking ? '4px solid' : '1px solid rgba(0, 0, 0, 0.12)',
                                    borderColor: userBreaking 
                                      ? (isUserHome ? 'primary.main' : 'secondary.main') 
                                      : 'divider',
                                    opacity: player ? 1 : 0.6
                                  }}
                                >
                                  <Typography variant="caption" sx={{ display: 'block', textDecoration: 'underline' }}>
                                    Frame {roundIdx * 4 + frameIdx + 1}
                                  </Typography>
                                  
                                  {isUserHome ? (
                                    <>
                                      <Typography variant="body2" sx={{ fontWeight: 'bold', my: 0.5 }}>
                                        {player ? `${player.firstName} ${player.lastName}` : `Player ${homeLabel}`}
                                        {userBreaking && " (B)"}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block' }}>vs</Typography>
                                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Away Player {awayLabel}
                                      </Typography>
                                    </>
                                  ) : (
                                    <>
                                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        Home Player {homeLabel}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: 'block' }}>vs</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 'bold', my: 0.5 }}>
                                        {player ? `${player.firstName} ${player.lastName}` : `Player ${awayLabel}`}
                                        {userBreaking && " (B)"}
                                      </Typography>
                                    </>
                                  )}
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default LineupSubmission;