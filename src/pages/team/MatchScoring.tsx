import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Alert,
  AlertTitle,
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
  Tooltip,
  Chip,
  Divider,
  useTheme,
  IconButton,
  Badge,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  ButtonBase,
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
  deleteFramesForMatch,
} from '../../services/databaseService';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  PlayArrow as PlayArrowIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  SwapHoriz as SwapHorizIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { onSnapshot, doc, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import cueBallImage from '../../assets/images/cue-ball.png';
import cueBallDarkImage from '../../assets/images/cue-ball-darkmode.png';
import { useLongPress } from 'react-use'; // Add this import at the top

// Add this new component before the MatchScoring component
const PlayerRow: React.FC<{
  position: number;
  playerId: string;
  playerName: string;
  isHomeTeam: boolean;
  isCaptain: boolean;
  isConfirmed: boolean;
  onLongPress: () => void;
}> = ({ position, playerId, playerName, isHomeTeam, isCaptain, isConfirmed, onLongPress }) => {
  const theme = useTheme();
  const longPress = useLongPress(onLongPress, { delay: 500 });

  return (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 1.5, md: 2 },
        position: 'relative',
        borderLeft: '4px solid',
        borderColor: isHomeTeam ? theme.palette.primary.main : theme.palette.secondary.main,
        transition: 'all 0.2s ease',
      }}
      {...longPress}
    >
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            minWidth: { xs: '24px', md: '40px' },
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}
        >
          {isHomeTeam ? position + 1 : String.fromCharCode(65 + position)}
        </Typography>
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flex: 1
        }}>
          <Typography 
            noWrap 
            sx={{ 
              fontSize: { xs: '0.875rem', md: '1rem' }
            }}
          >
            {playerName}
          </Typography>
          {isCaptain && !isConfirmed && (
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ ml: 1 }}
            >
              (Long press to substitute)
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

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
  const [isConfirmingRound, setIsConfirmingRound] = useState<number | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const isUserHomeTeamCaptain = userTeam?.id === match?.homeTeamId;
  const isUserAwayTeamCaptain = userTeam?.id === match?.awayTeamId;
  const [editingFrame, setEditingFrame] = useState<{round: number, position: number} | null>(null);

  // Add new state to track lineup history
  const [lineupHistory, setLineupHistory] = useState<{
    [round: number]: {
      homeLineup: string[];
      awayLineup: string[];
    };
  }>({});

  // Add new state for UI enhancements
  const [hoveredFrame, setHoveredFrame] = useState<{round: number, position: number} | null>(null);
  const theme = useTheme();

  // Add new state for the confirmation dialog
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  // Add new state variables near the top with other state declarations
  const [homeTeamConfirmed, setHomeTeamConfirmed] = useState<{[round: number]: boolean}>({});
  const [awayTeamConfirmed, setAwayTeamConfirmed] = useState<{[round: number]: boolean}>({});

  // Add handleBothTeamsConfirmed before the other handlers
  const handleBothTeamsConfirmed = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      console.log('Both teams have confirmed, advancing to next round...');
      console.log('Current match state:', match);
      
      // IMPORTANT: Check that both flags are still true before advancing
      // This prevents race conditions where one flag was reset
      if (!match.homeTeamConfirmedNextRound || !match.awayTeamConfirmedNextRound) {
        console.log('One or both teams no longer confirmed, not advancing round');
        return;
      }
      
      // Update match with new round and lineups
      const updateData: Partial<Match> = {
        currentRound: roundIndex + 2,
        roundScored: true,
        // Store the confirmed lineups
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup,
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup,
        // Reset confirmation flags
        homeTeamConfirmedNextRound: false,
        awayTeamConfirmedNextRound: false
      };

      console.log('Updating match with data:', updateData);
      await updateMatch(match.id, updateData);
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        const updatedMatch = {
          ...prevMatch,
          ...updateData
        };
        console.log('Updated match state:', updatedMatch);
        return updatedMatch;
      });
      
      // Reset confirmation states
      setHomeTeamConfirmed(prev => ({ ...prev, [roundIndex]: false }));
      setAwayTeamConfirmed(prev => ({ ...prev, [roundIndex]: false }));
      
      // Update round state
      setCompletedRounds(prev => [...prev, roundIndex]);
      setActiveRound(roundIndex + 2);
      
      // Clear any errors
      setError('');
    } catch (err: any) {
      console.error('Error advancing round:', err);
      setError(err.message || 'Failed to advance round');
    }
  };

  // Fix the handleFrameClick function to avoid blocking all interactions
  const handleFrameClick = (round: number, position: number, event?: React.MouseEvent | React.TouchEvent) => {
    // Don't call preventDefault or stopPropagation here as it blocks other interactions
    if (event) {
      event.preventDefault();
    }
    
    console.log('Frame clicked:', { round, position });
    
    // Only home team captain can edit frames
    if (!isUserHomeTeamCaptain) {
      console.log('User is not home team captain, returning');
      return;
    }

    // Check if this frame is already scored
    const isScored = isFrameScored(round, position);
    
    if (isScored) {
      // For already scored frames, ask if the user wants to reset the frame
      if (window.confirm('This frame already has a result. Do you want to reset it?')) {
        handleResetFrame(round, position);
      }
      return;
    }
    
    // If we're already editing this frame, cancel the edit
    if (editingFrame?.round === round && editingFrame?.position === position) {
      console.log('Already editing this frame, canceling edit');
      setEditingFrame(null);
      return;
    }

    // For unscored frames, proceed with editing
    setEditingFrame({ round, position });
    setSelectedWinner('');
  };

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

  const handleSelectWinner = async (round: number, position: number, winnerId: string) => {
    console.log('handleSelectWinner called:', { round, position, winnerId });
    if (!match?.id) {
      console.log('No match ID found');
      setError('Match ID not found. Please refresh the page.');
      return;
    }

    if (!winnerId) {
      console.log('No winner selected');
      setError('Please select a winner.');
      return;
    }

    try {
      // Set loading state first, before any async operations
      setLoading(true);
      
      // Immediately clear the editing state for better mobile UX
      // This will dismiss the popup right away
      setLoading(true); // Set loading state while processing
      const frameId = `${round}-${position}`;
      console.log('Creating frame with ID:', frameId);
      const existingFrameResults = match.frameResults || {};
      
      // Directly get the player IDs from the match lineup data
      // This addresses the TypeScript error about getPlayerForRound
      let homePlayerId: string;
      let awayPlayerId: string;
      
      // Get the player IDs using the existing match data
      if (match.homeLineup && match.awayLineup) {
        homePlayerId = match.homeLineup[position] || '';
        awayPlayerId = match.awayLineup[position] || '';
      } else {
        homePlayerId = '';
        awayPlayerId = '';
      }
      
      if (!homePlayerId || !awayPlayerId) {
        throw new Error('Missing player information. Please check the lineup.');
      }
      
      console.log('Player IDs:', { homePlayerId, awayPlayerId });

      // Create the frame document with complete data
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
      console.log('Frame data to be created:', frameData);

      // Create the frame document in the database
      const frameRef = await createDocument('frames', frameData);
      console.log('Frame document created:', frameRef);
      
      // Prepare data for updating the match
      const updateData: Partial<Match> = {
        frameResults: {
          ...existingFrameResults,
          [frameId]: {
            winnerId: winnerId,
            homeScore: winnerId === homePlayerId ? 1 : 0,
            awayScore: winnerId === awayPlayerId ? 1 : 0,
          },
        },
        // Set match status to in_progress if it was scheduled
        status: match.status === 'scheduled' ? 'in_progress' : match.status
      };
      console.log('Match update data:', updateData);

      // Check if all frames in the round are completed
      const allFramesInRound = Array.from({ length: 4 }, (_, i) => `${round}-${i}`);
      const roundFrames = allFramesInRound.map(id => {
        // Get frame result from the update data or existing match data
        return updateData.frameResults![id] || match.frameResults?.[id];
      });
      const isRoundComplete = roundFrames.every(frame => frame?.winnerId);
      console.log('Round completion check:', { allFramesInRound, roundFrames, isRoundComplete });

      // If round is complete, update the currentRound and roundScored flags
      if (isRoundComplete) {
        updateData.currentRound = round + 1;
        updateData.roundScored = true;
        
        // Check if the entire match is complete (all 16 frames)
        if (round === 3) {
          const allFrames = Array.from({ length: 4 }, (_, r) => 
            Array.from({ length: 4 }, (_, p) => `${r}-${p}`)
          ).flat();
          
          const allFrameResults = allFrames.map(id => 
            updateData.frameResults![id] || match.frameResults?.[id]
          );
          
          const isMatchComplete = allFrameResults.every(frame => frame?.winnerId);
          
          if (isMatchComplete) {
            updateData.status = 'completed';
          }
        }
      }

      // Update the match in the database
      await updateMatch(match.id, updateData);
      console.log('Match updated successfully');
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: {
            ...(prevMatch.frameResults || {}),
            ...updateData.frameResults
          },
          currentRound: updateData.currentRound || prevMatch.currentRound,
          roundScored: updateData.roundScored || prevMatch.roundScored,
          status: updateData.status || prevMatch.status
        };
      });

      // Reset UI state
      setEditingFrame(null);
      setSelectedWinner('');
      console.log('Editing frame cleared');
      
      // Show success message
      setError(''); // Clear any previous errors
    } catch (err: any) {
      console.error('Error submitting frame result:', err);
      setError(err.message || 'Failed to submit frame result. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRound = async (roundIndex: number) => {
    if (!match?.id) return;

    try {
      // Find all frames in this round
      const roundFrameIds = Array.from({ length: 4 }, (_, position) => `${roundIndex}-${position}`);
      const existingFrameResults = { ...match.frameResults };
      
      // Remove all frames in this round
      roundFrameIds.forEach(frameId => {
        if (existingFrameResults[frameId]) {
          delete existingFrameResults[frameId];
        }
      });

      const updateData: Partial<Match> = {
        frameResults: existingFrameResults,
        // Reset current round if needed
        ...(match.currentRound && match.currentRound > roundIndex + 1 ? { currentRound: roundIndex + 1 } : {})
      };

      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: existingFrameResults,
          ...(prevMatch.currentRound && prevMatch.currentRound > roundIndex + 1 ? { currentRound: roundIndex + 1 } : {})
        };
      });

      // Reset editing state
      setEditingFrame(null);
    } catch (err: any) {
      console.error('Error resetting round:', err);
      setError(err.message || 'Failed to reset round');
    }
  };

  const handleResetFrame = async (round: number, position: number) => {
    if (!match?.id) return;

    try {
      setLoading(true);
      setError('');
      
      const frameId = `${round}-${position}`;
      console.log(`Resetting frame ${frameId}`);
      
      // Make a copy of the existing frame results
      const existingFrameResults = { ...match.frameResults };
      
      // Remove the frame result
      delete existingFrameResults[frameId];

      const updateData: Partial<Match> = {
        frameResults: existingFrameResults
      };

      // Update the match in the database
      await updateMatch(match.id, updateData);
      console.log(`Frame ${frameId} reset successfully`);
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          frameResults: existingFrameResults
        };
      });

      // Make sure any dialogs are closed
      setEditingFrame(null);
      setSelectedWinner('');
    } catch (err: any) {
      console.error('Error resetting frame:', err);
      setError(`Failed to reset frame: ${err.message || 'Unknown error'}`);
      
      // Show an alert to make the error more visible
      alert(`Error resetting frame: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
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
  const handleRoundConfirmation = async (roundIndex: number) => {
    if (!match?.id) return;

    try {
      setLoading(true);
      
      // Update match to mark the round as completed and move to next round
      const updateData: Partial<Match> = {
        currentRound: roundIndex + 2,
        roundScored: true
      };

      // Update the match in the database
      await updateMatch(match.id, updateData);
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          ...updateData
        };
      });
      
      // Update round state
    setCompletedRounds([...completedRounds, roundIndex]);
      setActiveRound(roundIndex + 2);
      
      // Clear any errors
      setError('');
    } catch (err: any) {
      console.error('Error confirming round:', err);
      setError(err.message || 'Failed to confirm round');
    } finally {
      setLoading(false);
    }
  };

  const handleResetMatch = async () => {
    if (!match?.id || !isUserHomeTeamCaptain) return;

    try {
      setLoading(true);
      // Get the original lineups from the first round
      const originalHomeLineup = match.homeLineup?.filter((_, i) => i < 4) || [];
      const originalAwayLineup = match.awayLineup?.filter((_, i) => i < 4) || [];

      // Delete all frames from the database for this match
      await deleteFramesForMatch(match.id);
      console.log(`Deleted frames for match ${match.id}`);

      // Update match to clear frame results and reset round state
      const updateData: Partial<Match> = {
        frameResults: {},
        currentRound: 1,
        roundScored: false,
        status: 'in_progress',
        homeLineup: originalHomeLineup,
        awayLineup: originalAwayLineup,
        // Reset ALL confirmation states, both legacy and new
        homeTeamConfirmedNextRound: false,
        awayTeamConfirmedNextRound: false,
        homeConfirmedRounds: {},
        awayConfirmedRounds: {}
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
      
      // Clear lineup history
      setLineupHistory({});
      
      // Reset confirmation states in local state
      setHomeTeamConfirmed({});
      setAwayTeamConfirmed({});
      setIsConfirmingRound(null);
      setError('');
      
      // Close the confirmation dialog
      setShowResetConfirmation(false);
    } catch (err: any) {
      console.error('Error resetting match:', err);
      setError(err.message || 'Failed to reset match');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLineupDialog = (isHomeTeam: boolean) => {
    // Only allow lineup editing if match is still in scheduled status
    if (match?.status !== 'scheduled') {
      setError('Lineup can only be edited before the match has started.');
      return;
    }
    
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

      // If both teams have submitted their lineups, update the match status
      if (
        (editingHomeTeam && match.awayLineup && match.awayLineup.length > 0) ||
        (!editingHomeTeam && match.homeLineup && match.homeLineup.length > 0)
      ) {
        updateData.status = 'in_progress';
      }

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

  // Modify getPlayerForRound to ensure past frames show original players
  const getPlayerForRound = (round: number, position: number, isHomeTeam: boolean): string => {
    // For frames that have already been played, we need to return the players who actually played them
    if (match?.frameResults) {
      const frameId = `${round-1}-${position}`;
      const frameResult = match.frameResults[frameId];
      
      if (frameResult) {
        // This frame has been played
        // We need to get the players from our lineup history
        // Since frameResults don't store the actual player IDs directly
        const homePlayer = getHomePreviousRoundPlayer(round-1, position);
        const awayPlayer = getAwayPreviousRoundPlayer(round-1, position);
        return isHomeTeam ? homePlayer : awayPlayer;
      }
    }
    
    // For current and future rounds
    
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

  // Helper functions to get the actual players that played in previous rounds
  const getHomePreviousRoundPlayer = (round: number, position: number): string => {
    if (!match) return '';
    
    // If this is a later round, check lineup history first
    if (round > 0 && lineupHistory[round]) {
      return lineupHistory[round].homeLineup[position];
    }
    
    // Otherwise, use the initial lineup
    return match.homeLineup?.[position] || '';
  };
  
  const getAwayPreviousRoundPlayer = (round: number, position: number): string => {
    if (!match) return '';
    
    // If this is a later round, check lineup history first
    if (round > 0 && lineupHistory[round]) {
      return lineupHistory[round].awayLineup[position];
    }
    
    // Otherwise, use the initial lineup
    return match.awayLineup?.[position] || '';
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

  // Enhanced UI helper functions
  const getFrameStatus = (round: number, position: number) => {
    const isScored = isFrameScored(round, position);
    const isActive = isRoundActive(round);
    const isEditing = editingFrame?.round === round && editingFrame?.position === position;
    
    if (isScored) return 'completed';
    if (isEditing) return 'editing';
    if (isActive) return 'active';
    return 'pending';
  };
  
  const getFrameStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.palette.success.main;
      case 'editing': return theme.palette.primary.main;
      case 'active': return theme.palette.info.main;
      default: return theme.palette.text.disabled;
    }
  };
  
  const getFrameTooltip = (round: number, position: number) => {
    const homePlayerName = getPlayerName(getPlayerForRound(round + 1, position, true), true);
    const awayPlayerName = getPlayerName(getPlayerForRound(round + 1, position, false), false);
    const isScored = isFrameScored(round, position);
    const isActive = isRoundActive(round);
    const breaksFirst = isHomeTeamBreaking(round, position) ? homePlayerName : awayPlayerName;
    
    // Base information about the frame
    let info = `${homePlayerName} vs ${awayPlayerName}\nBreak: ${breaksFirst}`;
    
    // Status information
    if (isScored) {
      const winnerId = getFrameWinner(round, position);
      const winnerName = winnerId === getPlayerForRound(round + 1, position, true) ? homePlayerName : awayPlayerName;
      info += `\nWinner: ${winnerName}`;
      
      // Actions for home team captain
      if (isUserHomeTeamCaptain) {
        info += '\n(Click to reset frame result)';
      }
    } else if (isActive) {
      // For active, unscored frames
      if (isUserHomeTeamCaptain) {
        info += '\nClick to score this frame';
      } else {
        info += '\nWaiting for home team to score';
      }
    } else {
      // For inactive, unscored frames
      if (isUserHomeTeamCaptain) {
        info += '\nNot yet active (click to score out of sequence)';
      } else {
        info += '\nNot yet available';
      }
    }
    
    return info;
  };

  // Add a function to start the match
  const handleStartMatch = async () => {
    if (!match?.id || !isUserHomeTeamCaptain) return;
    
    // Verify both teams have valid lineups
    if (!match?.homeLineup || match.homeLineup.length < 4 || !match?.awayLineup || match.awayLineup.length < 4) {
      setError('Both teams must set their lineup before starting the match.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Update match status to in_progress
      const updateData: Partial<Match> = {
        status: 'in_progress',
        currentRound: 1
      };
      
      await updateMatch(match.id, updateData);
      
      // Update local state
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          status: 'in_progress',
          currentRound: 1
        };
      });
      
      setError(''); // Clear any errors
    } catch (err: any) {
      console.error('Error starting match:', err);
      setError(err.message || 'Failed to start match');
    } finally {
      setLoading(false);
    }
  };

  // Handle substitutions for the next round
  const handleConfirmSubstitution = async (position: number, isHomeTeam: boolean, playerId: string) => {
    if (!match?.id || !playerId) return;

    try {
      const nextRound = (isConfirmingRound || 0) + 2;
      
      // Get the current lineup for this round
      let currentHomeLineup = [...(match.homeLineup || [])];
      let currentAwayLineup = [...(match.awayLineup || [])];
      
      // If we have history for the current round, use that instead
      if (lineupHistory[nextRound]) {
        currentHomeLineup = [...lineupHistory[nextRound].homeLineup];
        currentAwayLineup = [...lineupHistory[nextRound].awayLineup];
      } else {
        // If this is the first substitution for this round, 
        // we need to copy the previous round's lineup or the initial lineup
        for (let r = nextRound - 1; r >= 1; r--) {
          if (lineupHistory[r]) {
            currentHomeLineup = [...lineupHistory[r].homeLineup];
            currentAwayLineup = [...lineupHistory[r].awayLineup];
            break;
          }
        }
      }
      
      // Update the appropriate lineup
      if (isHomeTeam) {
        // Store the player being replaced but keep them in the overall lineup
        const replacedPlayer = currentHomeLineup[position];
        currentHomeLineup[position] = playerId;
        
        // Make sure the substituted player isn't lost from the overall lineup
        if (replacedPlayer && !currentHomeLineup.includes(replacedPlayer)) {
          if (match.homeLineup && !match.homeLineup.includes(replacedPlayer)) {
            const updatedHomeLineup = [...match.homeLineup, replacedPlayer];
            await updateMatch(match.id, { homeLineup: updatedHomeLineup });
            setMatch(prevMatch => {
              if (!prevMatch) return null;
              return {
                ...prevMatch,
                homeLineup: updatedHomeLineup
              };
            });
          }
        }
      } else {
        // Store the player being replaced but keep them in the overall lineup
        const replacedPlayer = currentAwayLineup[position];
        currentAwayLineup[position] = playerId;
        
        // Make sure the substituted player isn't lost from the overall lineup
        if (replacedPlayer && !currentAwayLineup.includes(replacedPlayer)) {
          if (match.awayLineup && !match.awayLineup.includes(replacedPlayer)) {
            const updatedAwayLineup = [...match.awayLineup, replacedPlayer];
            await updateMatch(match.id, { awayLineup: updatedAwayLineup });
            setMatch(prevMatch => {
              if (!prevMatch) return null;
              return {
                ...prevMatch,
                awayLineup: updatedAwayLineup
              };
            });
          }
        }
      }

      // Record the lineup for this round in history
      setLineupHistory(prev => ({
        ...prev,
        [nextRound]: {
          homeLineup: currentHomeLineup,
          awayLineup: currentAwayLineup
        }
      }));

    } catch (err: any) {
      console.error('Error making substitution:', err);
      setError(err.message || 'Failed to make substitution');
    }
  };

  // Update the main data fetching useEffect
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const fetchMatchData = async () => {
      if (!matchId || !user) return;

      try {
        setLoading(true);
        setError('');

        // Initial fetch
        const initialMatchData = await getMatch(matchId);
        if (!initialMatchData) {
          setError('Match not found');
          return;
        }

        // Set up a real-time listener for match changes
        const matchRef = doc(db, 'matches', matchId);
        unsubscribe = onSnapshot(matchRef, (docSnapshot: DocumentSnapshot) => {
          if (docSnapshot.exists()) {
            const matchData = { 
              id: docSnapshot.id, 
              ...docSnapshot.data() 
            } as Match;
            
            console.log('Real-time match update:', matchData);
            
            // Set match data
            setMatch(matchData);
            
            // Set confirmation states based on database values
            const currentRoundIndex = (matchData.currentRound || 1) - 1;
            
            console.log('Setting confirmation states for round:', currentRoundIndex);
            
            // IMPORTANT: First check for the per-round confirmation fields (new approach)
            const homeConfirmedRounds = matchData.homeConfirmedRounds || {};
            const awayConfirmedRounds = matchData.awayConfirmedRounds || {};
            
            // LEGACY: Also check the old confirmation fields for backwards compatibility
            const isHomeConfirmed = !!homeConfirmedRounds[currentRoundIndex] || matchData.homeTeamConfirmedNextRound || false;
            const isAwayConfirmed = !!awayConfirmedRounds[currentRoundIndex] || matchData.awayTeamConfirmedNextRound || false;
            
            console.log('Confirmation states:', {
              homeConfirmed: isHomeConfirmed,
              awayConfirmed: isAwayConfirmed,
              fromRounds: {
                home: !!homeConfirmedRounds[currentRoundIndex],
                away: !!awayConfirmedRounds[currentRoundIndex]
              },
              fromLegacy: {
                home: matchData.homeTeamConfirmedNextRound,
                away: matchData.awayTeamConfirmedNextRound
              }
            });
            
            // Set local state with combined confirmation status
            setHomeTeamConfirmed(prev => ({
              ...prev,
              [currentRoundIndex]: isHomeConfirmed
            }));
            
            setAwayTeamConfirmed(prev => ({
              ...prev,
              [currentRoundIndex]: isAwayConfirmed
            }));
            
            // Check if both teams have confirmed this round and we haven't advanced yet
            if (isHomeConfirmed && isAwayConfirmed && 
                matchData.currentRound === currentRoundIndex + 1) {
              console.log('Both teams confirmed in listener, advancing round...');
              advanceToNextRound(currentRoundIndex);
            }
            
            // Set the active round
            if (matchData.currentRound) {
              setActiveRound(matchData.currentRound);
            }
            
            // Set completed rounds
            const completed: number[] = [];
            for (let i = 0; i < (matchData.currentRound || 1) - 1; i++) {
              completed.push(i);
            }
            setCompletedRounds(completed);
          } else {
            setError('Match not found');
          }
        }, (error: Error) => {
          console.error('Error listening to match updates:', error);
          setError(`Error listening to match updates: ${error.message}`);
        });

        // Load the home and away teams
        const [homeTeamData, awayTeamData, venueData] = await Promise.all([
          getTeam(initialMatchData.homeTeamId),
          getTeam(initialMatchData.awayTeamId),
          initialMatchData.venueId ? getVenue(initialMatchData.venueId) : null,
        ]);

        // Find which team the user is captain of
        let userTeamData = null;
        if (homeTeamData && homeTeamData.captainUserId === user.uid) {
          userTeamData = homeTeamData;
        } else if (awayTeamData && awayTeamData.captainUserId === user.uid) {
          userTeamData = awayTeamData;
        }

        // If not found directly, try team_players
        if (!userTeamData) {
          const teamByPlayer = await getTeamByPlayerId(user.uid);
          if (teamByPlayer && (teamByPlayer.id === initialMatchData.homeTeamId || teamByPlayer.id === initialMatchData.awayTeamId)) {
            userTeamData = teamByPlayer.id === initialMatchData.homeTeamId ? homeTeamData : awayTeamData;
          }
        }

        // Set the user's team
        setUserTeam(userTeamData);

        // If user is not a captain of either team and not an admin, restrict access
        if (!userTeamData && !isAdmin) {
          setError('You are not authorized to view this match');
          return;
        }

        const currentSeason = await getCurrentSeason();
        if (!currentSeason) {
          setError('No active season found');
          return;
        }

        const [homePlayersData, awayPlayersData] = await Promise.all([
          getPlayersForTeam(initialMatchData.homeTeamId, currentSeason.id!),
          getPlayersForTeam(initialMatchData.awayTeamId, currentSeason.id!),
        ]);

        setHomeTeam(homeTeamData);
        setAwayTeam(awayTeamData);
        setVenue(venueData);
        setHomePlayers(homePlayersData);
        setAwayPlayers(awayPlayersData);
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading match data:', err);
        setError(err.message || 'Failed to load match data');
        setLoading(false);
      }
    };

    fetchMatchData();
    
    // Clean up the subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [matchId, user, isAdmin]);

  // Update the handleHomeTeamConfirm function to save both the new and legacy fields
  const handleHomeTeamConfirm = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      setLoading(true);
      console.log('Confirming home team lineup for round:', roundIndex);
      
      // Create a new field that stores confirmation by round number
      const homeConfirmedRounds = { ...(match.homeConfirmedRounds || {}) };
      homeConfirmedRounds[roundIndex] = true;
      
      // Save both the new field and the legacy field
      const updateData: Partial<Match> = {
        homeConfirmedRounds,
        homeTeamConfirmedNextRound: true,  // Keep the legacy field for compatibility
        // Save the lineup for the next round
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup
      };
      
      console.log('Updating match with data:', updateData);
      await updateMatch(match.id, updateData);
      
      // Update local state for immediate UI feedback
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          homeConfirmedRounds,
          homeTeamConfirmedNextRound: true
        };
      });
      
      setHomeTeamConfirmed(prev => ({
        ...prev,
        [roundIndex]: true
      }));
      
      // Check if both teams have confirmed this round
      const awayConfirmedRounds = match.awayConfirmedRounds || {};
      const isAwayConfirmed = !!awayConfirmedRounds[roundIndex] || match.awayTeamConfirmedNextRound || false;
      
      if (isAwayConfirmed) {
        console.log('Both teams have confirmed, advancing round...');
        await advanceToNextRound(roundIndex);
      }
    } catch (err: any) {
      console.error('Error confirming home team lineup:', err);
      setError(err.message || 'Failed to confirm lineup');
    } finally {
      setLoading(false);
    }
  };

  // Update the handleAwayTeamConfirm function to save both the new and legacy fields
  const handleAwayTeamConfirm = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      setLoading(true);
      console.log('Confirming away team lineup for round:', roundIndex);
      
      // Create a new field that stores confirmation by round number
      const awayConfirmedRounds = { ...(match.awayConfirmedRounds || {}) };
      awayConfirmedRounds[roundIndex] = true;
      
      // Save both the new field and the legacy field
      const updateData: Partial<Match> = {
        awayConfirmedRounds,
        awayTeamConfirmedNextRound: true,  // Keep the legacy field for compatibility
        // Save the lineup for the next round
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup
      };
      
      console.log('Updating match with data:', updateData);
      await updateMatch(match.id, updateData);
      
      // Update local state for immediate UI feedback
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          awayConfirmedRounds,
          awayTeamConfirmedNextRound: true
        };
      });
      
      setAwayTeamConfirmed(prev => ({
        ...prev,
        [roundIndex]: true
      }));
      
      // Check if both teams have confirmed this round
      const homeConfirmedRounds = match.homeConfirmedRounds || {};
      const isHomeConfirmed = !!homeConfirmedRounds[roundIndex] || match.homeTeamConfirmedNextRound || false;
      
      if (isHomeConfirmed) {
        console.log('Both teams have confirmed, advancing round...');
        await advanceToNextRound(roundIndex);
      }
    } catch (err: any) {
      console.error('Error confirming away team lineup:', err);
      setError(err.message || 'Failed to confirm lineup');
    } finally {
      setLoading(false);
    }
  };

  // Update the handleHomeTeamEdit function to clear both the new and legacy fields
  const handleHomeTeamEdit = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      setLoading(true);
      
      // Remove this round's confirmation
      const homeConfirmedRounds = { ...(match.homeConfirmedRounds || {}) };
      delete homeConfirmedRounds[roundIndex];
      
      const updateData: Partial<Match> = {
        homeConfirmedRounds,
        homeTeamConfirmedNextRound: false  // Clear the legacy field too
      };
      
      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          homeConfirmedRounds,
          homeTeamConfirmedNextRound: false
        };
      });
      
      setHomeTeamConfirmed(prev => ({
        ...prev,
        [roundIndex]: false
      }));
    } catch (err: any) {
      console.error('Error editing home team lineup:', err);
      setError(err.message || 'Failed to edit lineup');
    } finally {
      setLoading(false);
    }
  };

  // Update the handleAwayTeamEdit function to clear both the new and legacy fields
  const handleAwayTeamEdit = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      setLoading(true);
      
      // Remove this round's confirmation
      const awayConfirmedRounds = { ...(match.awayConfirmedRounds || {}) };
      delete awayConfirmedRounds[roundIndex];
      
      const updateData: Partial<Match> = {
        awayConfirmedRounds,
        awayTeamConfirmedNextRound: false  // Clear the legacy field too
      };
      
      await updateMatch(match.id, updateData);
      
      setMatch(prevMatch => {
        if (!prevMatch) return null;
        return {
          ...prevMatch,
          awayConfirmedRounds,
          awayTeamConfirmedNextRound: false
        };
      });
      
      setAwayTeamConfirmed(prev => ({
        ...prev,
        [roundIndex]: false
      }));
    } catch (err: any) {
      console.error('Error editing away team lineup:', err);
      setError(err.message || 'Failed to edit lineup');
    } finally {
      setLoading(false);
    }
  };

  // Update the advanceToNextRound function to handle the round advancement properly
  const advanceToNextRound = async (roundIndex: number) => {
    if (!match?.id) return;
    
    try {
      console.log('Advancing to next round...');
      
      // First step: Update match with new round and lineups
      // IMPORTANT: Don't reset confirmation flags yet - this will allow them to persist correctly
      const updateData: Partial<Match> = {
        currentRound: roundIndex + 2,
        roundScored: true,
        // Store the confirmed lineups
        homeLineup: lineupHistory[roundIndex + 2]?.homeLineup || match.homeLineup,
        awayLineup: lineupHistory[roundIndex + 2]?.awayLineup || match.awayLineup
      };

      console.log('Updating match to advance round:', updateData);
      await updateMatch(match.id, updateData);
      
      // Second step (delayed): Only after the round is advanced, reset the confirmation flags
      // This second update ensures confirmation states don't get lost due to race conditions
      const resetConfirmationData: Partial<Match> = {
        homeTeamConfirmedNextRound: false,
        awayTeamConfirmedNextRound: false,
        homeConfirmedRounds: { 
          ...(match.homeConfirmedRounds || {}),
          [roundIndex]: false 
        },
        awayConfirmedRounds: { 
          ...(match.awayConfirmedRounds || {}),
          [roundIndex]: false 
        }
      };
      
      console.log('Resetting confirmation flags:', resetConfirmationData);
      await updateMatch(match.id, resetConfirmationData);
      
    } catch (err: any) {
      console.error('Error advancing round:', err);
      setError(err.message || 'Failed to advance round');
    }
  };

  // Add a separate button handler function at the component level
  const handleResetButtonClick = (round: number, position: number, e: React.MouseEvent) => {
    // Use stopPropagation but not preventDefault to ensure button works on mobile
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to reset this frame result?')) {
      handleResetFrame(round, position);
    }
  };

  // Update the round confirmation button click handler
  const handleConfirmRoundClick = (roundIndex: number) => {
    console.log('Confirming round:', roundIndex);
    setIsConfirmingRound(roundIndex);
  };

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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {loading && !match ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      ) : (
        <>
          {/* Match Score - Pinned to top */}
          <Box sx={{ 
            position: 'fixed',
            top: 64, // Height of the main navbar
            left: 0,
            right: 0,
            zIndex: 1100,
            bgcolor: 'background.paper',
            boxShadow: 2,
            py: 2
          }}>
            <Container maxWidth="sm">
            <Box sx={{ 
              display: 'flex',
                  alignItems: 'center', 
                justifyContent: 'center',
                gap: 3
            }}>
              {/* Home Team */}
              <Box sx={{ 
                  flex: 1,
                display: 'flex',
                flexDirection: 'column',
                  alignItems: 'center'
              }}>
                <Typography 
                    variant="subtitle1" 
                  sx={{ 
                    fontWeight: 'bold',
                        color: isUserHomeTeamCaptain ? 'primary.main' : 'text.primary',
                      mb: 0.5
                    }}
                  >
                    {homeTeam?.name}
                </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {matchScore.home}
                </Typography>
              </Box>

                  {/* VS */}
                <Typography variant="h6" color="text.secondary">
                  vs
                </Typography>

              {/* Away Team */}
              <Box sx={{ 
                  flex: 1,
                display: 'flex',
                flexDirection: 'column',
                  alignItems: 'center'
              }}>
                <Typography 
                    variant="subtitle1" 
                  sx={{ 
                    fontWeight: 'bold',
                        color: isUserAwayTeamCaptain ? 'secondary.main' : 'text.primary',
                      mb: 0.5
                    }}
                  >
                    {awayTeam?.name}
                </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {matchScore.away}
                </Typography>
              </Box>
            </Box>
            </Container>
          </Box>

          {/* Add spacing to account for fixed score panel */}
          <Box sx={{ mt: 8 }} />

          {/* Team Rosters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {/* Home Team */}
            <Paper elevation={1} sx={{ flex: 1, p: 2 }}>
              <Box>
                {homePlayers
                  .filter(player => match?.homeLineup?.includes(player.id!))
                  .sort((a, b) => {
                    // Captain always comes first
                    if (homeTeam?.captainUserId === a.userId) return -1;
                    if (homeTeam?.captainUserId === b.userId) return 1;
                    // Then sort by first name
                    return a.firstName.localeCompare(b.firstName);
                  })
                  .map(player => {
                    const isInFirstRound = match?.homeLineup?.slice(0, 4).includes(player.id!);
                    const isCaptain = homeTeam?.captainUserId === player.userId;
                    return (
                      <Box key={player.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography>
                          {player.firstName} {player.lastName}
                    </Typography>
                        {isCaptain && (
                          <Chip 
                            label="Captain" 
                            size="small" 
                            color="primary"
                            variant="outlined"
                            sx={{ 
                              height: 20,
                              '& .MuiChip-label': { 
                                px: 1,
                                fontSize: '0.7rem',
                                fontWeight: 'bold'
                              }
                            }}
                          />
                        )}
                        {!isInFirstRound && (
                          <Chip 
                            label="Sub" 
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ 
                              height: 20,
                              '& .MuiChip-label': { 
                                px: 1,
                                fontSize: '0.7rem'
                              }
                            }}
                          />
                  )}
                </Box>
                    );
                  })}
              </Box>
            </Paper>

            {/* Away Team */}
            <Paper elevation={1} sx={{ flex: 1, p: 2 }}>
              <Box>
                {awayPlayers
                  .filter(player => match?.awayLineup?.includes(player.id!))
                  .sort((a, b) => {
                    // Captain always comes first
                    if (awayTeam?.captainUserId === a.userId) return -1;
                    if (awayTeam?.captainUserId === b.userId) return 1;
                    // Then sort by first name
                    return a.firstName.localeCompare(b.firstName);
                  })
                  .map(player => {
                    const isInFirstRound = match?.awayLineup?.slice(0, 4).includes(player.id!);
                    const isCaptain = awayTeam?.captainUserId === player.userId;
                    return (
                      <Box key={player.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography>
                          {player.firstName} {player.lastName}
                </Typography>
                        {isCaptain && (
                          <Chip 
                            label="Captain" 
                            size="small" 
                  color="secondary"
                            variant="outlined"
                            sx={{ 
                              height: 20,
                              '& .MuiChip-label': { 
                                px: 1,
                                fontSize: '0.7rem',
                                fontWeight: 'bold'
                              }
                            }}
                          />
                        )}
                        {!isInFirstRound && (
                          <Chip 
                            label="Sub" 
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ 
                              height: 20,
                              '& .MuiChip-label': { 
                                px: 1,
                                fontSize: '0.7rem'
                              }
                            }}
                          />
                        )}
              </Box>
                    );
                  })}
                </Box>
          </Paper>
          </Box>
          
          {/* Status Alert - Only show for scheduled matches */}
          {match?.status === 'scheduled' && (
            <Alert 
              severity="warning" 
              variant="outlined"
              sx={{ mb: 4 }}
              action={
                isUserHomeTeamCaptain && (
                  <Button 
                    color="inherit" 
                    size="small"
                    disabled={!match?.homeLineup || !match?.awayLineup || 
                             match.homeLineup?.length < 4 || match.awayLineup?.length < 4}
                    onClick={handleStartMatch}
                  >
                    Start Match
                  </Button>
                )
              }
            >
              <AlertTitle>Match Not Started</AlertTitle>
              {isUserHomeTeamCaptain ? (
                <>
                  As the home team captain, you need to:
                  <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Ensure both teams have set their lineups (4 players each)</li>
                    <li>Click "Start Match" when both teams are ready</li>
                  </ol>
                </>
              ) : isUserAwayTeamCaptain ? (
                <>
                  Please set your lineup. The home team captain will start the match when both teams are ready.
                </>
              ) : (
                <>
                  This match has not started yet. Both teams need to set their lineups before the match can begin.
                </>
              )}
            </Alert>
          )}
          
          {/* Match Actions */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
            {/* Reset Match button - only for home team captain */}
            {isUserHomeTeamCaptain && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowResetConfirmation(true)}
                startIcon={<RefreshIcon />}
              >
                Reset Match
              </Button>
            )}
            </Box>

          {/* Rounds display */}
          {Array.from({ length: 4 }).map((_, roundIndex) => (
            <Box key={`round-${roundIndex}`} sx={{ mb: 4 }}>
              <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: isRoundActive(roundIndex) ? 'rgba(144, 202, 249, 0.08)' : 'inherit' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    Round {roundIndex + 1}
                    {isRoundComplete(roundIndex) && !isRoundActive(roundIndex) && (
                      <Chip 
                        size="small" 
                        label="Completed" 
                        color="success" 
                        sx={{ ml: 2 }} 
                        icon={<CheckCircleIcon />} 
                      />
                    )}
                    {activeRound === roundIndex + 1 && (
                      <Chip 
                        size="small" 
                        label="Current" 
                        color="primary" 
                        sx={{ ml: 2 }} 
                      />
                    )}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Array.from({ length: 4 }).map((_, position) => {
                  const frameId = `${roundIndex}-${position}`;
                  const homePlayerId = getPlayerForRound(roundIndex + 1, position, true);
                  const awayPlayerId = getPlayerForRound(roundIndex + 1, position, false);
                    const homePlayerName = getPlayerName(homePlayerId, true);
                    const awayPlayerName = getPlayerName(awayPlayerId, false);
                    const isScored = isFrameScored(roundIndex, position);
                    const isActive = isRoundActive(roundIndex);
                    const winnerId = getFrameWinner(roundIndex, position);
                    const homeWon = winnerId === homePlayerId;
                    const awayWon = winnerId === awayPlayerId;
                    const isEditing = editingFrame?.round === roundIndex && editingFrame?.position === position;
                    const isBreaking = isHomeTeamBreaking(roundIndex, position);
                    const frameStatus = getFrameStatus(roundIndex, position);

                  return (
                      <Paper
                        key={frameId}
                            onMouseEnter={() => setHoveredFrame({round: roundIndex, position})}
                            onMouseLeave={() => setHoveredFrame(null)}
                        sx={{
                              p: { xs: 1.5, md: 2 },
                              position: 'relative',
                              borderLeft: '4px solid',
                              borderColor: getFrameStatusColor(frameStatus),
                              transition: 'all 0.2s ease',
                              opacity: isActive || isScored ? 1 : 0.7,
                            }}
                          >
                            {/* Players Row */}
                            <Box sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              {/* Frame Number */}
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  minWidth: { xs: '24px', md: '40px' },
                                  fontSize: { xs: '0.875rem', md: '1rem' }
                                }}
                              >
                                {position + 1}
                            </Typography>
                            
                              {/* Home Player */}
                              <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                flex: 1
                              }}>
                                <Box sx={{
                                ...(homeWon && { 
                                    bgcolor: 'success.main',
                                  color: 'white',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1
                                })
                              }}>
                                <Typography 
                                    noWrap 
                                  sx={{ 
                                      fontSize: { xs: '0.875rem', md: '1rem' }
                                  }}
                                >
                                    {homePlayerName}
                                </Typography>
                                </Box>
                                {isBreaking && (
                                  <Box
                                    component="img"
                                    src={theme.palette.mode === 'dark' ? cueBallDarkImage : cueBallImage}
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
                              </Box>
                              
                              {/* Score/Reset Buttons - Both Mobile and Desktop */}
                              <Box sx={{ 
                                display: 'flex',
                                justifyContent: 'center',
                                width: { xs: 'auto', md: '100px' }
                              }}>
                                {isScored ? (
                                  <>
                                    {/* Mobile Reset Icon */}
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isUserHomeTeamCaptain && window.confirm('Reset this frame result?')) {
                                          handleResetFrame(roundIndex, position);
                                        }
                                      }}
                                      disabled={!isUserHomeTeamCaptain}
                                      sx={{ 
                                        display: { xs: 'flex', md: 'none' },
                                        '&:hover': {
                                          bgcolor: 'success.light'
                                        }
                                      }}
                                    >
                                      <RefreshIcon fontSize="small" />
                                    </IconButton>
                                    {/* Desktop Reset Button */}
                                    <Button
                                      variant="contained"
                                      color="success"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isUserHomeTeamCaptain && window.confirm('Reset this frame result?')) {
                                          handleResetFrame(roundIndex, position);
                                        }
                                      }}
                                      disabled={!isUserHomeTeamCaptain}
                                      sx={{ display: { xs: 'none', md: 'flex' } }}
                                    >
                                      Reset
                                    </Button>
                                  </>
                                ) : isActive ? (
                                  <>
                                    {/* Mobile Score Icon */}
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isUserHomeTeamCaptain) {
                                          handleFrameClick(roundIndex, position);
                                        }
                                      }}
                                      disabled={!isUserHomeTeamCaptain}
                                      sx={{ 
                                        display: { xs: 'flex', md: 'none' },
                                        '&:hover': {
                                          bgcolor: 'primary.light'
                                        }
                                      }}
                                    >
                                      <RadioButtonUncheckedIcon fontSize="small" />
                                    </IconButton>
                                    {/* Desktop Score Button */}
                                    <Button
                                      variant="contained"
                                      color="primary"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isUserHomeTeamCaptain) {
                                          handleFrameClick(roundIndex, position);
                                        }
                                      }}
                                      disabled={!isUserHomeTeamCaptain}
                                      sx={{ display: { xs: 'none', md: 'flex' } }}
                                    >
                                      Score
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    {/* Mobile Pending Icon */}
                                    <IconButton
                                      size="small"
                                      disabled
                                      sx={{ 
                                        display: { xs: 'flex', md: 'none' }
                                      }}
                                    >
                                      <RadioButtonUncheckedIcon fontSize="small" />
                                    </IconButton>
                                    {/* Desktop Pending Button */}
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      disabled
                                      sx={{ display: { xs: 'none', md: 'flex' } }}
                                    >
                                      Pending
                                    </Button>
                                  </>
                                )}
                              </Box>

                              {/* Away Player with Position Letter and Sub Button */}
                              <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                flex: 1,
                                justifyContent: 'flex-end'
                              }}>
                                {/* Removed substitution arrow */}
                                {!isBreaking && (
                                  <Box
                                    component="img"
                                    src={theme.palette.mode === 'dark' ? cueBallDarkImage : cueBallImage}
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
                                  noWrap 
                                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                                >
                                  {awayPlayerName}
                                </Typography>
                                {/* Position Letter */}
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    ml: 1,
                                    minWidth: '1.5em',
                                    textAlign: 'right'
                                  }}
                                >
                                  {/* Hardcoded position letters by round */}
                                  {roundIndex === 0 ? 
                                    String.fromCharCode(65 + position) : // Round 1: A,B,C,D
                                   roundIndex === 1 ?
                                    String.fromCharCode(65 + ((position + 1) % 4)) : // Round 2: B,C,D,A
                                   roundIndex === 2 ?
                                    String.fromCharCode(65 + ((position + 2) % 4)) : // Round 3: C,D,A,B
                                    String.fromCharCode(65 + ((position + 3) % 4))   // Round 4: D,A,B,C
                                  }
                                </Typography>
                                {/* Substitution Button */}
                                {isUserAwayTeamCaptain && !awayTeamConfirmed[roundIndex] && (
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setEditingHomeTeam(false);
                                      setSelectedPlayers([awayPlayerId]);
                                      setOpenLineupDialog(true);
                                    }}
                                    sx={{ 
                                      p: 0.5,
                                      ml: 1,
                                      color: 'secondary.main',
                                      '&:hover': {
                                        color: 'secondary.light'
                                      }
                                    }}
                                  >
                                    <SwapHorizIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            </Box>
                          </Paper>
                  );
                })}
                            </Box>
                            
                {/* Round completion and substitution UI */}
                {isRoundComplete(roundIndex) && roundIndex + 1 < 4 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                      Round {roundIndex + 2}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Array.from({ length: 4 }).map((_, position) => {
                        const homePlayerId = getPlayerForRound(roundIndex + 2, position, true);
                        const awayPlayerId = getPlayerForRound(roundIndex + 2, position, false);
                        const homePlayerName = getPlayerName(homePlayerId, true);
                        const awayPlayerName = getPlayerName(awayPlayerId, false);
                        const isBreaking = isHomeTeamBreaking(roundIndex + 1, position);
                        // Calculate the correct letter based on the upcoming round
                        const nextRoundIndex = roundIndex + 1; // This is for the next round (Round 2, 3, or 4)
                        const positionLetter = nextRoundIndex === 0 ? 
                                                String.fromCharCode(65 + position) : // Round 1: A,B,C,D
                                              nextRoundIndex === 1 ?
                                                String.fromCharCode(65 + ((position + 1) % 4)) : // Round 2: B,C,D,A
                                              nextRoundIndex === 2 ?
                                                String.fromCharCode(65 + ((position + 2) % 4)) : // Round 3: C,D,A,B
                                                String.fromCharCode(65 + ((position + 3) % 4));   // Round 4: D,A,B,C

                        return (
                          <Paper
                            key={`frame-${position}`}
                            sx={{
                              p: { xs: 1.5, md: 2 },
                              position: 'relative',
                              borderLeft: '4px solid',
                              borderColor: 'text.disabled',
                              transition: 'all 0.2s ease',
                              bgcolor: 'background.paper',
                              '&:hover': {
                                bgcolor: 'background.default'
                              }
                            }}
                          >
                            <Box sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              {/* Frame Number with Switch Icon */}
                              <Box sx={{ 
                                minWidth: { xs: '24px', md: '40px' },
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                                >
                                  {position + 1}
                                </Typography>
                                {isUserHomeTeamCaptain && !homeTeamConfirmed[roundIndex] && (
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setEditingHomeTeam(true);
                                      setSelectedPlayers([homePlayerId]);
                                      setOpenLineupDialog(true);
                                    }}
                                    sx={{ 
                                      p: 0.5,
                                      color: 'primary.main',
                                      '&:hover': {
                                        color: 'primary.light'
                                      }
                                    }}
                                  >
                                    <SwapHorizIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>

                              {/* Home Player */}
                              <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                flex: 1
                              }}>
                                <Typography 
                                  noWrap 
                                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                                >
                                  {homePlayerName}
                                </Typography>
                                {isBreaking && (
                                  <Box
                                    component="img"
                                    src={theme.palette.mode === 'dark' ? cueBallDarkImage : cueBallImage}
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
                              </Box>

                              {/* Empty Score Circle */}
                              <Box sx={{ 
                                width: { xs: 'auto', md: '100px' },
                                display: 'flex',
                                justifyContent: 'center'
                              }}>
                                <Box sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  border: '2px solid',
                                  borderColor: 'text.disabled'
                                }} />
                              </Box>

                              {/* Away Player with Position Letter and Sub Button */}
                              <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                flex: 1,
                                justifyContent: 'flex-end'
                              }}>
                                {/* Removed substitution arrow */}
                                {!isBreaking && (
                                  <Box
                                    component="img"
                                    src={theme.palette.mode === 'dark' ? cueBallDarkImage : cueBallImage}
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
                                  noWrap 
                                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                                >
                                  {awayPlayerName}
                                </Typography>
                                {/* Position Letter */}
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    ml: 1,
                                    minWidth: '1.5em',
                                    textAlign: 'right'
                                  }}
                                >
                                  {/* Display position letter for next round */}
                                  {positionLetter}
                                </Typography>
                                {/* Substitution Button */}
                                {isUserAwayTeamCaptain && !awayTeamConfirmed[roundIndex] && (
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setEditingHomeTeam(false);
                                      setSelectedPlayers([awayPlayerId]);
                                      setOpenLineupDialog(true);
                                    }}
                                    sx={{ 
                                      p: 0.5,
                                      ml: 1,
                                      color: 'secondary.main',
                                      '&:hover': {
                                        color: 'secondary.light'
                                      }
                                    }}
                                  >
                                    <SwapHorizIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            </Box>
                      </Paper>
                  );
                })}
                    </Box>

                    {/* Team confirmation buttons */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                      {isUserHomeTeamCaptain && !homeTeamConfirmed[roundIndex] && (
                    <Button
                      variant="contained"
                      color="primary"
                          onClick={() => handleHomeTeamConfirm(roundIndex)}
                          disabled={loading}
                    >
                          Confirm Home Team Lineup
                    </Button>
                      )}
                      {isUserAwayTeamCaptain && !awayTeamConfirmed[roundIndex] && (
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => handleAwayTeamConfirm(roundIndex)}
                          disabled={loading}
                        >
                          Confirm Away Team Lineup
                        </Button>
                      )}
                    </Box>

                    {/* Status messages */}
                    {error && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                      </Alert>
                    )}
                    
                    {(!homeTeamConfirmed[roundIndex] || !awayTeamConfirmed[roundIndex]) && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        {!homeTeamConfirmed[roundIndex] && !awayTeamConfirmed[roundIndex] ? (
                          'Waiting for both teams to confirm their lineups'
                        ) : !homeTeamConfirmed[roundIndex] ? (
                          'Waiting for home team to confirm their lineup'
                        ) : (
                          'Waiting for away team to confirm their lineup'
                        )}
                      </Alert>
                    )}
                    {homeTeamConfirmed[roundIndex] && awayTeamConfirmed[roundIndex] && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Both teams have confirmed their lineups. Advancing to Round {roundIndex + 2}...
                      </Alert>
                    )}
                  </Box>
                )}
              </Paper>
            </Box>
          ))}
        </>
      )}

        {/* Lineup Edit Dialog */}
        <Dialog
          open={openLineupDialog}
          onClose={handleCloseLineupDialog}
          fullWidth
          maxWidth="md"
          aria-labelledby="lineup-dialog-title"
        >
          <DialogTitle id="lineup-dialog-title" sx={{ bgcolor: editingHomeTeam ? 'primary.light' : 'secondary.light', color: 'white' }}>
            {editingHomeTeam ? 'Edit Home Team Lineup' : 'Edit Away Team Lineup'}
          </DialogTitle>
          
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Important</AlertTitle>
              <Typography variant="body2">
                • You must select exactly 4 players for your lineup before the match can start.<br />
                • Once the match starts, lineups cannot be changed.<br />
                • Player positions determine matchups for each round.
              </Typography>
            </Alert>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Select 4 players for the {editingHomeTeam ? 'home' : 'away'} team lineup. 
              {editingHomeTeam 
                ? ' Home positions remain fixed throughout the match.' 
                : ' Away positions rotate each round according to the rotation pattern.'}
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Available Players
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <List dense sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.paper' }}>
                    {(editingHomeTeam ? homePlayers : awayPlayers)
                      .filter(player => !selectedPlayers.includes(player.id!))
                      .map((player) => (
                        <ListItem key={player.id} disablePadding>
                          <ListItemButton 
                            onClick={() => handlePlayerSelection(player.id!)}
                    sx={{
                              py: 1,
                              '&:hover': {
                                bgcolor: 'action.hover',
                              }
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: editingHomeTeam ? 'primary.main' : 'secondary.main' }}>
                                {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={`${player.firstName} ${player.lastName}`} 
                            />
                          </ListItemButton>
                        </ListItem>
                    ))}
                    {(editingHomeTeam ? homePlayers : awayPlayers).filter(player => !selectedPlayers.includes(player.id!)).length === 0 && (
                      <ListItem>
                        <ListItemText 
                          primary="No more available players" 
                          sx={{ color: 'text.secondary', fontStyle: 'italic' }} 
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: editingHomeTeam ? 'primary.light' : 'secondary.light', color: '#fff' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Selected Players ({selectedPlayers.length}/4)
                  </Typography>
                  <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                  
                  <List sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                    {Array.from({ length: 4 }).map((_, index) => {
                      const playerId = selectedPlayers[index];
                      const player = playerId ? 
                        (editingHomeTeam ? homePlayers : awayPlayers).find(p => p.id === playerId) : 
                        null;
                      
                      return (
                        <ListItem 
                          key={index}
                          secondaryAction={
                            player && (
                              <IconButton 
                                edge="end" 
                                onClick={() => {
                                  setSelectedPlayers(prev => prev.filter(id => id !== playerId));
                                }}
                                sx={{ color: 'inherit' }}
                              >
                                <ClearIcon />
                              </IconButton>
                            )
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: player ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}>
                              {player ? `${index + 1}` : '?'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={player ? `${player.firstName} ${player.lastName}` : `Player ${index + 1} (click to select)`} 
                            secondary={editingHomeTeam ? `Plays position ${index + 1}` : `Plays position ${String.fromCharCode(65 + index)}`}
                            secondaryTypographyProps={{ color: 'inherit', sx: { opacity: 0.7 } }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {editingHomeTeam ? 
                        'Home team positions (1,2,3,4) stay fixed each round.' : 
                        'Away team positions (A,B,C,D) rotate each round according to the rotation pattern.'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseLineupDialog} color="inherit">
            Cancel
          </Button>
            <Button
              onClick={handleSaveLineup}
              variant="contained"
            color={editingHomeTeam ? 'primary' : 'secondary'}
            disabled={selectedPlayers.length !== 4}
            >
              Save Lineup
            </Button>
          </DialogActions>
        </Dialog>

        {/* Winner selection dialog - simplified to single tap */}
        <Dialog
          open={!!editingFrame}
          onClose={() => setEditingFrame(null)}
          aria-labelledby="winner-dialog-title"
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle id="winner-dialog-title" sx={{ textAlign: 'center', pb: 0 }}>
            Select Winner
          </DialogTitle>
          
          <DialogContent sx={{ pt: 2 }}>
            {editingFrame && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(() => {
                  const homePlayerId = getPlayerForRound(editingFrame.round + 1, editingFrame.position, true);
                  const awayPlayerId = getPlayerForRound(editingFrame.round + 1, editingFrame.position, false);
                  const homePlayerName = getPlayerName(homePlayerId, true);
                  const awayPlayerName = getPlayerName(awayPlayerId, false);
                  
                  return (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={() => {
                          if (editingFrame) {
                            handleSelectWinner(editingFrame.round, editingFrame.position, homePlayerId);
                          }
                        }}
                        disabled={loading}
                        sx={{ 
                          py: 3,
                          fontSize: '1.1rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {homePlayerName}
                      </Button>
                      
                      <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        onClick={() => {
                          if (editingFrame) {
                            handleSelectWinner(editingFrame.round, editingFrame.position, awayPlayerId);
                          }
                        }}
                        disabled={loading}
                        sx={{ 
                          py: 3,
                          fontSize: '1.1rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {awayPlayerName}
                      </Button>
                    </>
                  );
                })()}
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
            <Button
              onClick={() => setEditingFrame(null)}
              variant="outlined"
              disabled={loading}
              sx={{ minWidth: 100 }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reset Match Confirmation Dialog */}
        <Dialog
          open={showResetConfirmation}
          onClose={() => setShowResetConfirmation(false)}
          aria-labelledby="reset-match-dialog-title"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="reset-match-dialog-title" sx={{ bgcolor: 'error.main', color: 'white' }}>
            Reset Match Results
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Warning: This action cannot be undone</AlertTitle>
              <Typography variant="body2">
                Resetting the match will:
                <ul>
                  <li>Clear all frame results</li>
                  <li>Reset the round to 1</li>
                  <li>Keep the initial lineups intact</li>
                  <li>Remove all substitutions</li>
                </ul>
              </Typography>
            </Alert>
            <Typography>
              Are you sure you want to reset all match results?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setShowResetConfirmation(false)} color="inherit">
              Cancel
            </Button>
            <Button 
              onClick={handleResetMatch} 
              variant="contained" 
              color="error"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Resetting...' : 'Reset Match'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
};

export default MatchScoring; 