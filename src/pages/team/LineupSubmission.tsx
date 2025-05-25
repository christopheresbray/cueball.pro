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
  isUserTeamCaptain,
  startMatch
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
    // Ensure we have at least 4 players selected
    if (playingPlayersCount < 4) {
      setError('You must select at least 4 players for the match.');
      return;
    }
    // Instead of showing confirm dialog and submitting, go to position assignment stage
    setStage(LineupStage.POSITION_ASSIGNMENT);
  };

  const handleConfirmLockIn = async () => {
    if (!match || !matchId) return;
    
    try {
      setLoading(true);
      
      // Get all players marked as playing
      const allPlayingPlayers = players
        .filter(p => p.isPlaying)
        .map(p => p.id)
        .filter((id): id is string => id !== undefined);

      // Get the first 4 players for the initial lineup
      const initialLineup = allPlayingPlayers.slice(0, 4);
      while (initialLineup.length < 4) initialLineup.push('');

      // Determine if we're home or away team
      const isHomeTeam = match.homeTeamId === userTeam?.id;
      
      // Initialize or update matchParticipants with ALL playing players
      const existingParticipants = match.matchParticipants || { homeTeam: [], awayTeam: [] };
      const updatedParticipants = {
        ...existingParticipants,
        [isHomeTeam ? 'homeTeam' : 'awayTeam']: allPlayingPlayers
      };
      
      // Create/Update lineup history for round 1
      const lineupHistoryUpdate = { ...(match.lineupHistory || {}) };
      if (!lineupHistoryUpdate[1]) {
        lineupHistoryUpdate[1] = { homeLineup: [], awayLineup: [] };
      }
      if (isHomeTeam) {
        lineupHistoryUpdate[1].homeLineup = initialLineup;
        // Preserve opponent lineup if it exists
        lineupHistoryUpdate[1].awayLineup = lineupHistoryUpdate[1].awayLineup || []; 
      } else {
        lineupHistoryUpdate[1].awayLineup = initialLineup;
        // Preserve opponent lineup if it exists
        lineupHistoryUpdate[1].homeLineup = lineupHistoryUpdate[1].homeLineup || [];
      }

      // Update data including both lineup history and participants
      const updateData: Partial<Match> = {
        matchParticipants: updatedParticipants,
        lineupHistory: lineupHistoryUpdate
      };

      console.log('Update data (Confirm Lock In):', updateData);

      // Check if opponent has submitted their lineup (using history)
      const opponentLineup = isHomeTeam 
        ? lineupHistoryUpdate[1]?.awayLineup 
        : lineupHistoryUpdate[1]?.homeLineup;
      
      // Only update participants and history at this stage
      await updateMatch(matchId, updateData);
      setShowConfirmDialog(false);
      setStage(LineupStage.POSITION_ASSIGNMENT);
      
      // Check if opponent is ready after update (might have submitted while we were here)
      // Fetch the latest match data again to get the most recent opponent lineup history
      const latestMatchData = await getMatch(matchId);
      if (latestMatchData) {
          const latestLineupHistory = latestMatchData.lineupHistory?.[1];
          const latestOpponentLineup = isHomeTeam 
            ? latestLineupHistory?.awayLineup
            : latestLineupHistory?.homeLineup;
            
          if (latestOpponentLineup && latestOpponentLineup.length >= 4) {
             // If opponent is ready now, don't set awaiting state
             setAwaitingOpponent(false);
             console.log('Opponent lineup found after update, proceeding to position assignment.');
          } else {
             setAwaitingOpponent(true);
             console.log('Still waiting for opponent after update.');
          }
      } else {
          // Handle case where match couldn't be re-fetched (optional)
          console.warn("Could not re-fetch match data after confirming players.");
          setAwaitingOpponent(true); // Assume waiting if re-fetch fails
      }
      
    } catch (err: any) {
      console.error('Error submitting lineup:', err);
      setError(err.message || 'Failed to submit lineup');
    } finally {
      setLoading(false);
    }
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

  const handleConfirmAndStartMatch = async () => {
    if (!matchId || !match || !userTeam || !currentSeason?.id) {
      console.log('Submission validation failed:', {
        matchId: !!matchId,
        match: !!match,
        userTeam: !!userTeam,
        currentSeason: !!currentSeason
      });
      return;
    }
    
    // Convert positions to lineup array (for starting lineup)
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
      
      // Get ALL players marked as playing (including subs)
      const allPlayingPlayers = players
        .filter(p => p.isPlaying)
        .map(p => p.id)
        .filter(Boolean) as string[];

      // Ensure all playing players are added to the team_players collection
      for (const playerId of allPlayingPlayers) {
        const player = players.find(p => p.id === playerId);
        if (player) {
          try {
            // Add player to team if not already in team_players collection
            await addPlayerToTeam(
              userTeam.id,
              {
                firstName: player.firstName,
                lastName: player.lastName,
                email: player.email || '',
                userId: player.userId || ''
              },
              currentSeason.id,
              'player'
            );
          } catch (err: any) {
            // If error is because player already exists, continue
            if (!err.message?.includes('already exists')) {
              throw err;
            }
          }
        }
      }
      
      // Initialize or update matchParticipants with ALL playing players
      const existingParticipants = match.matchParticipants || { homeTeam: [], awayTeam: [] };
      const updatedParticipants = {
        ...existingParticipants,
        [isHomeTeam ? 'homeTeam' : 'awayTeam']: allPlayingPlayers
      };

      // Create/Update lineup history for round 1
      const lineupHistoryUpdate = { ...(match.lineupHistory || {}) };
      if (!lineupHistoryUpdate[1]) {
        lineupHistoryUpdate[1] = { homeLineup: [], awayLineup: [] };
      }
      if (isHomeTeam) {
        lineupHistoryUpdate[1].homeLineup = finalLineup;
        // Preserve opponent lineup if it exists
        lineupHistoryUpdate[1].awayLineup = lineupHistoryUpdate[1].awayLineup || [];
      } else {
        lineupHistoryUpdate[1].awayLineup = finalLineup;
        // Preserve opponent lineup if it exists
        lineupHistoryUpdate[1].homeLineup = lineupHistoryUpdate[1].homeLineup || [];
      }

      // Update data including both lineup history and participants
      const updateData: Partial<Match> = {
        matchParticipants: updatedParticipants,
        lineupHistory: lineupHistoryUpdate
      };

      console.log('Update data (Start Match / Final Submit):', updateData);

      // Check if opponent has submitted their lineup (using history)
      const opponentLineup = isHomeTeam 
        ? lineupHistoryUpdate[1]?.awayLineup
        : lineupHistoryUpdate[1]?.homeLineup;
      
      // Prepare data for updating participants and history (always needed)
      const participantAndHistoryUpdate: Partial<Match> = {
        matchParticipants: updatedParticipants,
        lineupHistory: lineupHistoryUpdate
      };

      // If both teams have submitted their lineups, call startMatch
      if (opponentLineup && opponentLineup.length >= 4) {
        // Ensure we have the correct full lineups for startMatch
        const homeFinalLineup = isHomeTeam ? finalLineup : opponentLineup;
        const awayFinalLineup = isHomeTeam ? opponentLineup : finalLineup;
        
        console.log('Both lineups confirmed, calling startMatch...');
        // Call startMatch to initialize frames and set status to in_progress
        await startMatch(matchId, homeFinalLineup.slice(0, 4), awayFinalLineup.slice(0, 4));

        // Also update participants and history separately
        // (startMatch only handles frames and status)
        await updateMatch(matchId, participantAndHistoryUpdate);
        
        // The real-time listener will handle the redirect when status changes
        // No need to set awaitingOpponent here
        
      } else {
        // Opponent hasn't submitted yet, just update this team's data
        // including their participants and lineup history
        await updateMatch(matchId, participantAndHistoryUpdate);
        setAwaitingOpponent(true);
        console.log('Waiting for opponent to submit lineup');
      }
      
    } catch (err: any) {
      console.error('Error submitting lineup:', err);
      setError(err.message || 'Failed to submit lineup');
    } finally {
       setLoading(false); // Ensure loading is always turned off
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
          isUserTeamCaptain(user.uid, matchData.homeTeamId, matchData.seasonId),
          isUserTeamCaptain(user.uid, matchData.awayTeamId, matchData.seasonId)
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
        
        // Deduplicate players by ID and map them with default playing state
        const uniquePlayers = Array.from(
          new Map(teamPlayers.map(player => [player.id, player])).values()
        );
        
        // Default all fetched players to 'isPlaying' initially
        // We will update based on matchParticipants later if available
        let initialPlayerStates = uniquePlayers.map(player => ({
          id: player.id || '',
          firstName: player.firstName || '',
          lastName: player.lastName || '',
          email: player.email || '',
          userId: player.userId || '',
          isPlaying: true // Default to playing
        }));
        
        const isHomeTeam = matchData.homeTeamId === userTeamData.id;

        // Only use matchParticipants if there are participants for this team
        const participantsExist = matchData.matchParticipants && (
          (isHomeTeam && matchData.matchParticipants?.homeTeam && matchData.matchParticipants?.homeTeam.length > 0) ||
          (!isHomeTeam && matchData.matchParticipants?.awayTeam && matchData.matchParticipants?.awayTeam.length > 0)
        );

        if (participantsExist) {
          const participantIds = new Set(
            isHomeTeam 
              ? (matchData.matchParticipants?.homeTeam || [])
              : (matchData.matchParticipants?.awayTeam || [])
          );
          initialPlayerStates = initialPlayerStates.map(player => ({
            ...player,
            isPlaying: participantIds.has(player.id)
          }));
        } else {
          // Default all to playing if no participants yet
          initialPlayerStates = initialPlayerStates.map(player => ({
            ...player,
            isPlaying: true
          }));
        }
        
        setPlayers(initialPlayerStates);
        
        // Initialize lineup from match lineupHistory[1] data if available
        const round1History = matchData.lineupHistory?.[1];
        const existingLineup = isHomeTeam ? round1History?.homeLineup : round1History?.awayLineup;
        const opponentLineupHistory = isHomeTeam ? round1History?.awayLineup : round1History?.homeLineup;
        
        if (existingLineup && existingLineup.length >= 4) {
          // If we already have a lineup, go straight to the position assignment stage
          // and set up the positions
          const positions: Record<number, string> = {};
          existingLineup.forEach((playerId, index) => {
            if (playerId) positions[index] = playerId;
          });
          
          setSelectedPositions(positions);
          setStage(LineupStage.POSITION_ASSIGNMENT);
          
          // Check if we are waiting for the opponent
          if (existingLineup.length > 0 && (!opponentLineupHistory || opponentLineupHistory.length === 0)) {
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

  // Update the getTeamName function to handle null matches
  const getTeamName = (matchData: Match | null, teamsData: Record<string, any>, isHome: boolean) => {
    if (!matchData) return isHome ? 'Home Team' : 'Away Team';
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
                  {match && match.frames && match.frames.filter(f => f.round === round).map(frame => {
                    const isHomeTeam = userTeam?.id === match?.homeTeamId;
                    // For home team, use homePlayerPosition (1-4); for away, use awayPlayerPosition ('A'-'D')
                    const positionIndex = isHomeTeam
                      ? frame.homePlayerPosition - 1
                      : frame.awayPlayerPosition.charCodeAt(0) - 65;
                    const playerId = selectedPositions[positionIndex];
                    const player = playerId ? getPlayerById(playerId) : null;
                    return (
                      <Paper key={`frame-preview-${frame.frameId}`} sx={{ p: 2, mb: 1, opacity: 0.7 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 24 }}>
                            {isHomeTeam ? frame.homePlayerPosition : frame.awayPlayerPosition}
                          </Typography>
                          <Typography sx={{ flex: 1 }}>
                            {player ? `${player.firstName} ${player.lastName}` : 'Select Player'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', minWidth: 60 }}>
                            vs
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 24 }}>
                            {isHomeTeam ? frame.awayPlayerPosition : frame.homePlayerPosition}
                          </Typography>
                        </Box>
                      </Paper>
                    );
                  })}
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
                onClick={handleConfirmAndStartMatch}
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
          <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom>
              {userTeam?.id === match?.homeTeamId ? 
                `${getTeamName(match, teams, true)} (Home) vs ${getTeamName(match, teams, false)} (Away)` : 
                `${getTeamName(match, teams, true)} (Home) vs ${getTeamName(match, teams, false)} (Away)`
              }
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {formatMatchDate(match?.date)}
              {venue ? ` • ${venue.name}` : match?.venueId ? ` • ${match.venueId}` : ''}
            </Typography>
          </Paper>
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
                    <Chip 
                      label={players.find(p => p.id === selectedPositions[index])?.firstName || 'Unknown Player'}
                      onDelete={() => handleRemovePlayerFromPosition(index)}
                      color="primary"
                      variant="outlined"
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
            onClick={handleConfirmAndStartMatch}
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
                You are about to lock in the following players for this match:
              </DialogContentText>
              <List>
                {getPlayingPlayers().map((player) => (
                  <ListItem key={player.id}>
                    <ListItemText primary={`${player.firstName} ${player.lastName}`} />
                  </ListItem>
                ))}
              </List>
              <DialogContentText>
                Only these players will be eligible for substitutions during the match. 
                Are you sure you want to proceed?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelLockIn}>Cancel</Button>
              <Button onClick={handleConfirmLockIn} color="primary">
                Confirm
              </Button>
            </DialogActions>
          </Dialog>

          {/* Add debug info for full frame lineup below the previews */}
          {match && match.frames && (
            <Box sx={{ mt: 4, p: 2, bgcolor: '#222', color: '#fff', borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Debug: Full Frame Lineup</Typography>
              {match.frames.map(frame => {
                // Lookup home and away player names from selectedPositions and players array
                const homeIndex = frame.homePlayerPosition - 1;
                const awayIndex = frame.awayPlayerPosition.charCodeAt(0) - 65;
                const homePlayerId = selectedPositions[homeIndex];
                const awayPlayerId = selectedPositions[awayIndex];
                const homePlayer = players.find(p => p.id === homePlayerId);
                const awayPlayer = players.find(p => p.id === awayPlayerId);
                return (
                  <Typography key={frame.frameId} variant="body2">
                    Round {frame.round} Game {frame.frameNumber}: {homePlayer ? `${homePlayer.firstName} ${homePlayer.lastName}` : '—'} vs {awayPlayer ? `${awayPlayer.firstName} ${awayPlayer.lastName}` : '—'}
                  </Typography>
                );
              })}
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default LineupSubmission;