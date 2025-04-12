// src/pages/team/LineupSubmission.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Paper, Button, Grid, Alert, CircularProgress, Box,
  Card, CardContent, Divider, Avatar, List, ListItem, ListItemText, ListItemAvatar,
  Switch, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Chip, IconButton
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
import SwapIcon from '@mui/icons-material/SwapHoriz';

// Define a type for the player object that your application expects
interface PlayerType {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  userId?: string;
  isPlaying?: boolean; // Add this property to track if player is selected to play
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

// Enum for the lineup selection stages
enum LineupStage {
  PLAYER_SELECTION = 'player_selection',
  POSITION_ASSIGNMENT = 'position_assignment',
  POSITION_CONFIRMATION = 'position_confirmation',
}

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [stage, setStage] = useState<LineupStage>(LineupStage.PLAYER_SELECTION);
  const [selectedPositions, setSelectedPositions] = useState<Record<number, string>>({});
  const [awaitingOpponent, setAwaitingOpponent] = useState(false);
  const navigate = useNavigate();

  // Get count of players marked as playing
  const playingPlayersCount = players.filter(p => p.isPlaying).length;
  
  // Check if we have at least 4 players selected to play
  const hasEnoughPlayers = playingPlayersCount >= 4;
  
  // Get the list of playing players
  const getPlayingPlayers = () => players.filter(p => p.isPlaying);

  // Function declarations
  const handlePlayerToggle = (playerId: string) => {
    setPlayers(prevPlayers => 
      prevPlayers.map(player => 
        player.id === playerId 
          ? { ...player, isPlaying: !player.isPlaying } 
          : player
      )
    );
  };

  const handleLockInPlayers = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmLockIn = () => {
    setShowConfirmDialog(false);
    
    // Get the first 4 playing players to auto-assign to positions
    const playingPlayers = getPlayingPlayers().slice(0, 4);
    
    // Create position assignments
    const positions: Record<number, string> = {};
    playingPlayers.forEach((player, index) => {
      positions[index] = player.id;
    });
    
    setSelectedPositions(positions);
    setStage(LineupStage.POSITION_ASSIGNMENT);
  };

  const handleCancelLockIn = () => {
    setShowConfirmDialog(false);
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
        userId: '',
        isPlaying: true // Default to playing
      };
      
      setPlayers([...players, newPlayer]);
      return newPlayer;
    } catch (err: any) {
      setError(err.message || 'Failed to add new player.');
      return null;
    }
  };

  const handleAssignPlayerToPosition = (positionIndex: number, playerId: string) => {
    // Check if this player is already in another position
    const existingPositionEntry = Object.entries(selectedPositions).find(
      ([pos, id]) => id === playerId && Number(pos) !== positionIndex
    );
    
    if (existingPositionEntry) {
      // Swap players
      const existingPosition = Number(existingPositionEntry[0]);
      const currentPositionPlayer = selectedPositions[positionIndex];
      
      setSelectedPositions(prev => ({
        ...prev,
        [existingPosition]: currentPositionPlayer,
        [positionIndex]: playerId
      }));
    } else {
      // Assign player to position
      setSelectedPositions(prev => ({
        ...prev,
        [positionIndex]: playerId
      }));
    }
  };

  const handleRemovePlayerFromPosition = (positionIndex: number) => {
    const newPositions = { ...selectedPositions };
    delete newPositions[positionIndex];
    setSelectedPositions(newPositions);
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
    
    // Convert positions to lineup array
    const finalLineup = Array(4).fill('');
    Object.entries(selectedPositions).forEach(([posIndex, playerId]) => {
      finalLineup[Number(posIndex)] = playerId;
    });
    
    if (finalLineup.some(id => !id)) {
      setError('Please assign players to all positions.');
      return;
    }

    try {
      setLoading(true);
      const isHomeTeam = match.homeTeamId === userTeam.id;
      console.log('Submitting lineup:', {
        isHomeTeam,
        lineup: finalLineup,
        matchId,
        userTeamId: userTeam.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId
      });
      
      // Only update the lineup for the user's team
      const updateData: Partial<Match> = isHomeTeam 
        ? { homeLineup: finalLineup }
        : { awayLineup: finalLineup };

      console.log('Update data:', updateData);

      // Check if opponent has submitted their lineup
      const opponentLineup = isHomeTeam ? match.awayLineup : match.homeLineup;
      
      // If both teams have submitted their lineups, update the match status
      if (opponentLineup && opponentLineup.length > 0) {
        updateData.status = 'in_progress';
        console.log('Setting match to in_progress');
      } else {
        // Set the awaitingOpponent state to true if the opponent hasn't submitted
        setAwaitingOpponent(true);
        console.log('Waiting for opponent to submit lineup');
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
        
        // Map players and set all to playing by default
        setPlayers(teamPlayers.map(player => ({
          id: player.id || '',
          firstName: player.firstName || '',
          lastName: player.lastName || '',
          email: player.email || '',
          userId: player.userId || '',
          isPlaying: true // Default to playing
        })));
        
        // Initialize lineup from match data if available
        const isHomeTeam = matchData.homeTeamId === userTeamData.id;
        const existingLineup = isHomeTeam ? matchData.homeLineup : matchData.awayLineup;
        const opponentLineup = isHomeTeam ? matchData.awayLineup : matchData.homeLineup;
        
        if (existingLineup && existingLineup.length > 0) {
          // If we already have a lineup, go straight to the position assignment stage
          // and set up the positions
          const positions: Record<number, string> = {};
          existingLineup.forEach((playerId, index) => {
            if (playerId) positions[index] = playerId;
          });
          
          setSelectedPositions(positions);
          setStage(LineupStage.POSITION_ASSIGNMENT);
          
          // Check if we are waiting for the opponent
          if (existingLineup.length > 0 && (!opponentLineup || opponentLineup.length === 0)) {
            setAwaitingOpponent(true);
          }
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

  // Render the player selection stage
  const renderPlayerSelectionStage = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Select Players for Match</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Toggle players to indicate who will be participating in this match. You need at least 4 players.
          </Typography>
          
          <List>
            {players.map(player => (
              <ListItem 
                key={player.id}
                sx={{ 
                  mb: 1,
                  borderRadius: 1,
                  bgcolor: player.isPlaying ? 'background.paper' : 'action.hover',
                  border: player.isPlaying ? '1px solid' : '1px dashed',
                  borderColor: player.isPlaying ? 
                    (userTeam.id === match?.homeTeamId ? 'primary.main' : 'secondary.main') : 
                    'divider'
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ mr: 1, minWidth: 80, textAlign: 'right' }}>
                      {player.isPlaying ? 'Playing' : 'Not Playing'}
                    </Typography>
                    <Switch 
                      checked={player.isPlaying} 
                      onChange={() => handlePlayerToggle(player.id)}
                      color={userTeam?.id === match?.homeTeamId ? 'primary' : 'secondary'}
                    />
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar 
                    sx={{ 
                      bgcolor: player.isPlaying ? 
                        (userTeam?.id === match?.homeTeamId ? 'primary.main' : 'secondary.main') : 
                        'action.disabledBackground'
                    }}
                  >
                    {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={`${player.firstName} ${player.lastName}`}
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => handleAddNewPlayer()}
            >
              + Add New Player
            </Button>
            <Button
              variant="contained"
              onClick={handleLockInPlayers}
              disabled={!hasEnoughPlayers}
              color={userTeam?.id === match?.homeTeamId ? 'primary' : 'secondary'}
            >
              Lock In {playingPlayersCount} Players
            </Button>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  // Render the position assignment stage
  const renderPositionAssignmentStage = () => {
    const isHomeTeam = userTeam?.id === match?.homeTeamId;
    const playingPlayers = getPlayingPlayers();
    
    // Helper to render player matchup for any round
    const renderPlayerMatchup = (position: number, round: number, isActive: boolean = true) => {
      // Get position label based on home/away
      const positionLetter = isHomeTeam 
        ? (position + 1).toString() 
        : String.fromCharCode(65 + position);
      
      // Get player ID for this position - for future rounds, use rotation pattern
      let playerPosition = position;
      let opponentPosition = position;
      
      // For away team in future rounds, apply rotation pattern
      if (!isHomeTeam && round > 1) {
        // Rotation pattern from first round position
        // Round 2: positions rotate +1 (A→B, B→C, C→D, D→A)
        // Round 3: positions rotate +2 (A→C, B→D, C→A, D→B)
        // Round 4: positions rotate +3 (A→D, B→A, C→B, D→C)
        const rotationOffset = (round - 1) % 4;
        playerPosition = (position + rotationOffset) % 4;
      }
      
      // For home team positions, they stay fixed
      const playerId = selectedPositions[playerPosition];
      const player = playerId ? getPlayerById(playerId) : null;
      
      // For away opponent in future rounds, apply rotation pattern
      if (isHomeTeam && round > 1) {
        // Similar rotation for opponent positions
        const rotationOffset = (round - 1) % 4;
        opponentPosition = (position + rotationOffset) % 4;
      }
      
      // Get opponent label
      const opponentLabel = isHomeTeam 
        ? String.fromCharCode(65 + opponentPosition) // If home, opponent is A, B, C, D
        : (opponentPosition + 1).toString(); // If away, opponent is 1, 2, 3, 4
      
      // Determine breaking based on alternating pattern
      // Even frames in odd rounds, odd frames in even rounds
      const frameNumber = (round - 1) * 4 + position;
      const isBreaking = frameNumber % 2 === 0;
      const playerBreaking = (isHomeTeam && isBreaking) || (!isHomeTeam && !isBreaking);
      
      return (
        <Paper
          key={`r${round}-p${position}`}
          sx={{
            p: { xs: 1.5, md: 2 },
            position: 'relative',
            borderLeft: '4px solid',
            borderColor: playerBreaking 
              ? (isHomeTeam ? 'primary.main' : 'secondary.main') 
              : 'action.disabled',
            transition: 'all 0.2s ease',
            mb: 1,
            opacity: isActive ? 1 : 0.7,
            filter: isActive ? 'none' : 'grayscale(30%)'
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            {/* Position Number (for home) or empty space (for away) */}
            {isHomeTeam && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  minWidth: { xs: '24px', md: '40px' },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 'bold'
                }}
              >
                {position + 1}
              </Typography>
            )}
            
            {/* Home Side */}
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flex: 1,
              justifyContent: isHomeTeam ? 'flex-start' : 'flex-end'
            }}>
              {isHomeTeam ? (
                // Home Team Player
                <>
                  <Box>
                    <Typography 
                      noWrap 
                      sx={{ 
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        fontWeight: player ? 'bold' : 'normal',
                        color: player ? 'text.primary' : 'text.secondary'
                      }}
                    >
                      {player 
                        ? `${player.firstName} ${player.lastName}` 
                        : 'Select Player'}
                    </Typography>
                  </Box>
                  {playerBreaking && (
                    <Box
                      component="img"
                      src="/src/assets/images/cue-ball.png" // Using relative path
                      alt="Break"
                      sx={{
                        width: { xs: 16, md: 20 },
                        height: { xs: 16, md: 20 },
                        objectFit: 'contain',
                        flexShrink: 0,
                        ml: 1
                      }}
                    />
                  )}
                  {isActive && (
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        // Show menu/popup to select player
                        const menu = document.getElementById(`player-menu-${position}`);
                        if (menu) {
                          menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                      sx={{ ml: 1 }}
                    >
                      <SwapIcon />
                    </IconButton>
                  )}
                </>
              ) : (
                // Away Team Player (right side)
                <>
                  {isActive && (
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        // Show menu/popup to select player
                        const menu = document.getElementById(`player-menu-${position}`);
                        if (menu) {
                          menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                      sx={{ mr: 1 }}
                    >
                      <SwapIcon />
                    </IconButton>
                  )}
                  {playerBreaking && (
                    <Box
                      component="img"
                      src="/src/assets/images/cue-ball.png" // Using relative path
                      alt="Break"
                      sx={{
                        width: { xs: 16, md: 20 },
                        height: { xs: 16, md: 20 },
                        objectFit: 'contain',
                        flexShrink: 0,
                        mr: 1
                      }}
                    />
                  )}
                  <Box>
                    <Typography 
                      noWrap 
                      sx={{ 
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        fontWeight: player ? 'bold' : 'normal',
                        color: player ? 'text.primary' : 'text.secondary',
                        textAlign: 'right'
                      }}
                    >
                      {player 
                        ? `${player.firstName} ${player.lastName}` 
                        : 'Select Player'}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
            
            {/* Center - VS or Status */}
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'center',
              width: { xs: 'auto', md: '100px' }
            }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontWeight: 'bold' }}
              >
                VS
              </Typography>
            </Box>
            
            {/* Opponent Side */}
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flex: 1,
              justifyContent: isHomeTeam ? 'flex-end' : 'flex-start'
            }}>
              {isHomeTeam ? (
                // Away Team Opponent (right side)
                <>
                  {!playerBreaking && (
                    <Box
                      component="img"
                      src="/src/assets/images/cue-ball.png" // Using relative path
                      alt="Break"
                      sx={{
                        width: { xs: 16, md: 20 },
                        height: { xs: 16, md: 20 },
                        objectFit: 'contain',
                        flexShrink: 0,
                        mr: 1
                      }}
                    />
                  )}
                  <Typography 
                    sx={{ 
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      color: 'text.secondary',
                      fontStyle: 'italic'
                    }}
                  >
                    Opponent {opponentLabel}
                  </Typography>
                </>
              ) : (
                // Home Team Opponent (left side)
                <>
                  <Typography 
                    sx={{ 
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      color: 'text.secondary',
                      fontStyle: 'italic'
                    }}
                  >
                    Opponent {opponentLabel}
                  </Typography>
                  {!playerBreaking && (
                    <Box
                      component="img"
                      src="/src/assets/images/cue-ball.png" // Using relative path
                      alt="Break"
                      sx={{
                        width: { xs: 16, md: 20 },
                        height: { xs: 16, md: 20 },
                        objectFit: 'contain',
                        flexShrink: 0,
                        ml: 1
                      }}
                    />
                  )}
                </>
              )}
            </Box>
            
            {/* Position Letter (for away) */}
            {!isHomeTeam && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  minWidth: { xs: '24px', md: '40px' },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 'bold',
                  textAlign: 'right'
                }}
              >
                {positionLetter}
              </Typography>
            )}
          </Box>
          
          {/* Player Selection dropdown (hidden by default) - only for active round */}
          {isActive && (
            <Box 
              id={`player-menu-${position}`} 
              sx={{ 
                display: 'none', 
                position: 'absolute', 
                zIndex: 1200, 
                mt: 2, 
                left: 0, 
                right: 0, 
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                boxShadow: 3,
                p: 1
              }}
            >
              <Typography variant="subtitle2" sx={{ p: 1, mb: 1 }}>
                Select player for Position {positionLetter}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 200, overflow: 'auto' }}>
                {playingPlayers.map(player => {
                  // Check if already assigned to another position
                  const isAssigned = Object.entries(selectedPositions)
                    .some(([pos, id]) => id === player.id && Number(pos) !== position);
                  
                  return (
                    <Chip
                      key={player.id}
                      label={`${player.firstName} ${player.lastName}`}
                      onClick={() => {
                        // Assign player to this position
                        handleAssignPlayerToPosition(position, player.id);
                        // Hide menu
                        const menu = document.getElementById(`player-menu-${position}`);
                        if (menu) menu.style.display = 'none';
                      }}
                      color={isAssigned ? 'default' : (isHomeTeam ? 'primary' : 'secondary')}
                      variant={selectedPositions[position] === player.id ? 'filled' : 'outlined'}
                      disabled={isAssigned}
                      sx={{ m: 0.5 }}
                    />
                  );
                })}
              </Box>
              <Box sx={{ textAlign: 'right', mt: 1 }}>
                <Button 
                  size="small" 
                  onClick={() => {
                    const menu = document.getElementById(`player-menu-${position}`);
                    if (menu) menu.style.display = 'none';
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      );
    };
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Starting Lineup & Match Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Assign your players to starting positions. You can change player positions by clicking the swap icon.
              {isHomeTeam 
                ? ' Home team positions remain fixed, with opponents rotating each round.' 
                : ' Away team positions rotate each round to play different home opponents.'}
            </Typography>
            
            {/* Round 1 - Active */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Round 1
                  <Chip 
                    size="small" 
                    label="Starting Lineup" 
                    color="primary" 
                    variant="outlined"
                    sx={{ ml: 2 }} 
                  />
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Array.from({ length: 4 }).map((_, position) => 
                  renderPlayerMatchup(position, 1, true)
                )}
              </Box>
            </Box>
            
            {/* Future Rounds - Previews */}
            {[2, 3, 4].map(round => (
              <Box key={`round-${round}`} sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    Round {round}
                    <Chip 
                      size="small" 
                      label="Preview" 
                      color="default" 
                      variant="outlined"
                      sx={{ ml: 2 }} 
                    />
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Array.from({ length: 4 }).map((_, position) => 
                    renderPlayerMatchup(position, round, false)
                  )}
                </Box>
              </Box>
            ))}
            
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 1 }}>
              Available Players
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {playingPlayers.map(player => {
                  // Check if this player is already assigned to a position
                  const isAssigned = Object.values(selectedPositions).includes(player.id);
                  const assignedPosition = Object.entries(selectedPositions)
                    .find(([_, id]) => id === player.id);
                  
                  const positionLabel = assignedPosition 
                    ? (isHomeTeam 
                        ? `Position ${Number(assignedPosition[0]) + 1}` 
                        : `Position ${String.fromCharCode(65 + Number(assignedPosition[0]))}`)
                    : null;
                  
                  return (
                    <Chip
                      key={player.id}
                      avatar={
                        <Avatar sx={{ bgcolor: isAssigned ? 'rgba(0,0,0,0.1)' : (isHomeTeam ? 'primary.main' : 'secondary.main') }}>
                          {player.firstName.charAt(0)}
                        </Avatar>
                      }
                      label={`${player.firstName} ${player.lastName}${positionLabel ? ` (${positionLabel})` : ''}`}
                      onClick={isAssigned ? undefined : () => {
                        // Find first empty position
                        for (let i = 0; i < 4; i++) {
                          if (!selectedPositions[i]) {
                            handleAssignPlayerToPosition(i, player.id);
                            break;
                          }
                        }
                      }}
                      sx={{ 
                        m: 0.5, 
                        opacity: isAssigned ? 0.7 : 1,
                        cursor: isAssigned ? 'default' : 'pointer',
                        '&:hover': {
                          bgcolor: isAssigned ? '' : 'action.hover'
                        }
                      }}
                    />
                  );
                })}
              </Box>
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => setStage(LineupStage.PLAYER_SELECTION)}
              >
                Back to Player Selection
              </Button>
              <Button
                variant="contained"
                onClick={handleStartMatch}
                disabled={Object.keys(selectedPositions).length !== 4 || loading}
                color={isHomeTeam ? 'primary' : 'secondary'}
              >
                {loading ? <CircularProgress size={24} /> : 'Submit Lineup'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // Position Confirmation Stage UI
  if (stage === LineupStage.POSITION_CONFIRMATION) {
    return (
      <div className="lineup-submission">
        <div className="match-header">
          <h2>Assign Players to Positions</h2>
          <MatchHeader match={match} teams={teams} venue={venue} />
        </div>
        
        {error && <Alert severity="error">{error}</Alert>}
        
        {awaitingOpponent ? (
          <Alert severity="info">
            Your lineup has been submitted. Waiting for the opposing team to lock in their lineup.
          </Alert>
        ) : null}
        
        <Grid container spacing={2} className="player-positions">
          {Array(4).fill(0).map((_, index) => (
            <Grid item xs={12} key={index}>
              <Paper className="position-card">
                <Typography variant="h6" component="div">
                  Position {index + 1}
                </Typography>
                <div className="position-player">
                  {selectedPositions[index] ? (
                    <PlayerChip 
                      player={players.find(p => p.id === selectedPositions[index])} 
                      onDelete={() => handlePlayerRemoveFromPosition(index)} 
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No player assigned
                    </Typography>
                  )}
                </div>
              </Paper>
            </Grid>
          ))}
        </Grid>
        
        <div className="button-container">
          <Button
            variant="outlined"
            onClick={() => setStage(LineupStage.PLAYER_SELECTION)}
            disabled={loading}
          >
            Back to Player Selection
          </Button>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleStartMatch}
            disabled={loading || awaitingOpponent}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Lineup'}
          </Button>
        </div>
      </div>
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
          
          {awaitingOpponent && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1">
                Your lineup has been submitted! Waiting for the opposing team to lock in their lineup...
              </Typography>
            </Alert>
          )}
          
          {/* Render the appropriate stage */}
          {!awaitingOpponent && (
            <>
              {stage === LineupStage.PLAYER_SELECTION ? renderPlayerSelectionStage() : renderPositionAssignmentStage()}
            </>
          )}
          
          {/* Confirmation Dialog */}
          <Dialog
            open={showConfirmDialog}
            onClose={handleCancelLockIn}
          >
            <DialogTitle>Confirm Player Selection</DialogTitle>
            <DialogContent>
              <DialogContentText>
                You've selected {playingPlayersCount} players for this match. 
                The first 4 players will be automatically assigned to positions, but you can adjust them in the next step.
              </DialogContentText>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Players selected:</Typography>
                <List dense>
                  {players.filter(p => p.isPlaying).map((player, index) => (
                    <ListItem key={player.id}>
                      <ListItemText 
                        primary={`${player.firstName} ${player.lastName}`} 
                        secondary={index < 4 ? `Will be assigned to position ${index + 1}` : ''}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelLockIn}>Cancel</Button>
              <Button onClick={handleConfirmLockIn} variant="contained" color="primary">
                Confirm
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Container>
  );
};

export default LineupSubmission;