import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Alert,
  CircularProgress,
  Button,
  Typography,
  Grid,
  Paper
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Timestamp } from 'firebase/firestore';

// Custom hooks
import { useMatchData } from '../../hooks/useMatchData';
import { useFrameScoring } from '../../hooks/useFrameScoring';
import { useSubstitutions } from '../../hooks/useSubstitutions';
import { useTeamConfirmation } from '../../hooks/useTeamConfirmation';
import { useAuth } from '../../context/AuthContext';
import { useGameFlowActions } from '../../hooks/useGameFlowActions';
import { useGameFlow } from '../../context/GameFlowContext';

// Components
import MatchHeader from '../../components/match-scoring/MatchHeader';
import MatchParticipants from '../../components/match-scoring/MatchParticipants';
import RoundDisplay from '../../components/match-scoring/RoundDisplay';
import WinnerSelectionDialog from '../../components/match-scoring/WinnerSelectionDialog';
import LineupDialog from '../../components/match-scoring/LineupDialog';
import ResetConfirmationDialog from '../../components/match-scoring/ResetConfirmationDialog';
import SubstitutionPanel from '../../components/match-scoring/SubstitutionPanel';

// Utilities
import { FrameStatus, getAllParticipatingPlayers } from '../../utils/matchUtils';

// Assets
import cueBallImage from '../../assets/images/cue-ball.png';
import cueBallDarkImage from '../../assets/images/cue-ball-darkmode.png';

// Types
import { Match, Team, Player } from '../../types/match';
import { GameState } from '../../types/gameState';

// Define GameFlowState type
interface GameFlowState {
  state: GameState;
  currentRound: number;
  homeTeamConfirmed: { [round: number]: boolean };
  awayTeamConfirmed: { [round: number]: boolean };
  isLoading: boolean;
  error: string | null;
}

interface EditingFrame {
  round: number;
  position: number;
  homePlayerId?: string;
  awayPlayerId?: string;
}

// Debug component to show state information for captains
interface DebugStatePanelProps {
  gameFlowState: GameFlowState;
  match: Match;
  homeTeamConfirmed: { [round: number]: boolean };
  awayTeamConfirmed: { [round: number]: boolean };
  activeRound: number;
}

const DebugStatePanel: React.FC<DebugStatePanelProps> = ({ 
  gameFlowState, 
  match, 
  homeTeamConfirmed, 
  awayTeamConfirmed,
  activeRound
}) => {
  const panelStyle = {
    position: 'fixed' as const,
    right: '20px',
    bottom: '20px',
    zIndex: 1000,
    padding: '10px',
    maxWidth: '400px',
    opacity: 0.9,
    fontSize: '12px',
    maxHeight: '50vh',
    overflowY: 'auto' as const
  };
  
  // Calculate participant counts using the utility function
  const homeParticipants = match ? getAllParticipatingPlayers(match, true) : new Set();
  const awayParticipants = match ? getAllParticipatingPlayers(match, false) : new Set();

  // Calculate the most recently locked round
  const mostRecentLockedRound = match?.roundLockedStatus ? 
    Object.entries(match.roundLockedStatus)
      .reduce((latest, [round, isLocked]) => {
        return isLocked && Number(round) > latest ? Number(round) : latest;
      }, -1) : -1;

  // Calculate if we should be showing substitution panel
  const shouldShowSubstitutionPanel = match?.currentRound != null && 
    match.roundLockedStatus?.[match.currentRound - 1] && 
    (gameFlowState.state === GameState.SUBSTITUTION_PHASE || 
     gameFlowState.state === GameState.AWAITING_CONFIRMATIONS);

  // Get current round lineup safely
  const currentRoundLineup = match?.homeLineup;
  const nextRoundLineup = match?.awayLineup;
  
  return (
    <Paper elevation={3} sx={panelStyle}>
      <Typography variant="subtitle2" fontWeight="bold">Debug Info</Typography>
      <pre style={{ margin: 0, overflow: 'auto', maxHeight: '400px' }}>
        {JSON.stringify({
          gameState: gameFlowState.state,
          currentRound: match?.currentRound,
          activeRound,
          mostRecentLockedRound,
          roundLockedStatus: match?.roundLockedStatus || {},
          substitutionPhaseInfo: {
            isSubstitutionPhase: gameFlowState.state === GameState.SUBSTITUTION_PHASE,
            isAwaitingConfirmations: gameFlowState.state === GameState.AWAITING_CONFIRMATIONS,
            shouldShowSubstitutionPanel,
            currentRoundLocked: match?.roundLockedStatus?.[match?.currentRound ?? 0 - 1],
            homeTeamConfirmed: gameFlowState.homeTeamConfirmed || {},
            awayTeamConfirmed: gameFlowState.awayTeamConfirmed || {},
            currentRoundLineup: currentRoundLineup || 'Not set',
            nextRoundLineup: nextRoundLineup || 'Not set'
          },
          matchState: {
            status: match?.status,
            currentRound: match?.currentRound,
            roundLockedStatus: match?.roundLockedStatus
          },
          participants: {
            home: homeParticipants.size,
            away: awayParticipants.size,
            homeIds: Array.from(homeParticipants),
            awayIds: Array.from(awayParticipants)
          }
        }, null, 2)}
      </pre>
    </Paper>
  );
};

/**
 * MatchScoring container component
 */
const MatchScoringRefactored: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, isAdmin } = useAuth();

  // Additional local state
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Use all custom hooks
  const {
    match, setMatch,
    homeTeam, awayTeam, venue,
    homePlayers, awayPlayers,
    userTeam,
    isUserHomeTeamCaptain,
    isUserAwayTeamCaptain,
    loading, setLoading,
    error, setError,
    activeRound, setActiveRound,
    completedRounds, setCompletedRounds,
    getMatchScore
  } = useMatchData(matchId, user, isAdmin);

  const {
    editingFrame, setEditingFrame,
    selectedWinner, setSelectedWinner,
    hoveredFrame, setHoveredFrame,
    showResetConfirmation, setShowResetConfirmation,
    isFrameScored,
    getFrameWinner,
    isRoundComplete,
    handleFrameClick,
    handleSelectWinner,
    handleResetFrame,
    handleResetRound,
    handleResetMatch,
    handleLockRoundScores,
    clearFrame
  } = useFrameScoring(
    match, 
    setMatch, 
    setLoading, 
    setError, 
    isUserHomeTeamCaptain
  );

  const {
    lineupHistory, setLineupHistory,
    openLineupDialog, setOpenLineupDialog,
    editingHomeTeam, setEditingHomeTeam,
    selectedPlayers, setSelectedPlayers,
    isConfirmingRound, setIsConfirmingRound,
    getPlayerName,
    isHomeTeamBreaking,
    getSubstitutesForRound,
    getPlayerForRound,
    getHomePreviousRoundPlayer,
    getAwayPreviousRoundPlayer,
    handleConfirmSubstitution,
    handleOpenLineupDialog,
    handleCloseLineupDialog,
    handlePlayerSelection,
    handleSaveLineup,
    handleStartMatch
  } = useSubstitutions(match, homePlayers, awayPlayers, setMatch, setError);

  const {
    homeTeamConfirmed, setHomeTeamConfirmed,
    awayTeamConfirmed, setAwayTeamConfirmed,
    updateConfirmationStates,
    handleHomeTeamConfirm,
    handleAwayTeamConfirm,
    handleHomeTeamEdit,
    handleAwayTeamEdit,
    advanceToNextRound,
    handleTeamConfirm,
    handleTeamEdit
  } = useTeamConfirmation(match, setMatch, lineupHistory, setLoading, setError);

  // Connect to our game flow state machine
  const gameFlowActions = useGameFlowActions(matchId);
  const { state: gameFlowState, isRoundLocked } = useGameFlow();
  
  // When match data is loaded, set it in our game flow state
  useEffect(() => {
    if (match) {
      gameFlowActions.setMatchData(match);
    }
  }, [match, gameFlowActions]);

  // Add effect to log state changes
  useEffect(() => {
    if (match && match.frames) {
      // Log all frames for round 1 (index 0) after reset or match update
      const round1Frames = match.frames.filter(f => f.round === 1);
      console.log('DEBUG: Frames for Round 1 after match update/reset:', round1Frames);
    }
  }, [gameFlowState, match]);

  // Use the game flow actions for locking rounds instead of local state
  const handleLockRoundFromGameFlow = useCallback((roundIndex: number) => {
    gameFlowActions.lockRound(roundIndex);
  }, [gameFlowActions]);

  // Use the game flow actions for starting the match instead of local state
  const handleStartMatchFromGameFlow = useCallback(() => {
    gameFlowActions.startMatch();
  }, [gameFlowActions]);

  // Wrapper function to get frame status
  const getFrameStatus = useCallback((roundIndex: number, position: number): FrameStatus => {
    // First check if this frame is currently being edited - highest priority
    if (editingFrame?.roundIndex === roundIndex && editingFrame?.position === position) {
      return FrameStatus.EDITING;
    }
    
    // Then check if the frame is scored and in what state
    return match 
      ? (isFrameScored(roundIndex, position) 
        ? FrameStatus.COMPLETED 
        : (roundIndex + 1 === activeRound)
          ? FrameStatus.ACTIVE
          : FrameStatus.PENDING)
      : FrameStatus.PENDING;
  }, [match, isFrameScored, editingFrame, activeRound]);

  // Handle selection of winner
  const handleWinnerSelectionSubmit = useCallback((winnerPlayerId: string) => {
    if (editingFrame) {
      // Removed console.log statement
      
      // Get player IDs to confirm they're correct
      const homePlayerId = getPlayerForRound(editingFrame.roundIndex + 1, editingFrame.position, true);
      const awayPlayerId = getPlayerForRound(editingFrame.roundIndex + 1, editingFrame.position, false);
      
      // Removed console.log statement
      
      handleSelectWinner(editingFrame.roundIndex, editingFrame.position, winnerPlayerId);
    }
  }, [editingFrame, handleSelectWinner, getPlayerForRound, getPlayerName]);

  // Determine if a round is active
  const isRoundActive = useCallback((roundIndex: number): boolean => {
    return roundIndex + 1 === activeRound;
  }, [activeRound]);

  // Memoized current score calculation
  const currentScore = useMemo(() => getMatchScore(), [getMatchScore]);
  
  // Define these outside the render function to prevent recreating on each render
  const memoizedRenderRoundsFunction = useCallback(
    (
      match: Match,
      activeRound: number,
      gameFlowState: GameFlowState,
      homePlayers: Player[],
      awayPlayers: Player[],
      clearFrame: (roundIndex: number, frameIndex: number) => void
    ) => {
      if (!match) return null;
      
      return Array.from({ length: 4 }).map((_, roundIndex) => {
        // Check if this round is locked
        const isLocked = !!match?.roundLockedStatus?.[roundIndex];
        
        // FIXED: Determine if the substitution panel should be shown *after* this round
        const showSubAfterRound = (roundIdx: number) => {
          if (!match?.currentRound || !gameFlowState) return false;
          
          // Show substitution panel if:
          // 1. This round is locked
          // 2. We're in the SUBSTITUTION_PHASE or AWAITING_CONFIRMATIONS state
          // 3. This is the most recently completed round
          const isThisRoundLocked = !!match?.roundLockedStatus?.[roundIdx];
          const isInSubstitutionState = gameFlowState.state === GameState.SUBSTITUTION_PHASE || 
                                      gameFlowState.state === GameState.AWAITING_CONFIRMATIONS;
          
          // Find the most recently locked round
          let mostRecentLockedRound = -1;
          for (let i = 0; i <= match.currentRound; i++) {
            if (match?.roundLockedStatus?.[i]) {
              mostRecentLockedRound = i;
            }
          }
          
          // Show panel if this is the most recently locked round and we're in substitution phase
          const shouldShow = isThisRoundLocked && 
                           isInSubstitutionState && 
                           roundIdx === mostRecentLockedRound;
          
          // Enhanced debug logging
          if (shouldShow) {
            // Removed console.log statement
          }
          
          return shouldShow;
        };

        // NEW DIRECT APPROACH: Determine if this specific round display should be hidden
        const shouldHideRoundDisplay = (() => {
          // Don't hide round 1
          if (roundIndex === 0) return false;
          
          // Hide subsequent rounds during substitution phase
          if (gameFlowState.state === GameState.SUBSTITUTION_PHASE || 
              gameFlowState.state === GameState.AWAITING_CONFIRMATIONS) {
            // Find the most recent locked round
            let mostRecentLockedRound = -1;
            for (let i = 0; i < roundIndex; i++) {
              if (match?.roundLockedStatus?.[i]) {
                mostRecentLockedRound = i;
              }
            }
            
            // Hide this round if we're in substitution phase after the previous round
            return roundIndex > mostRecentLockedRound;
          }
          
          return false;
        })();

        // FIX: Don't force show rounds during substitution phase
        const forcedShow = false;

        return (
          <React.Fragment key={`round-container-${roundIndex}`}>
            {/* Display the round (only if not hidden or forced to show) */}
            {(!shouldHideRoundDisplay || forcedShow) && (
              <RoundDisplay
                key={`round-${roundIndex}`}
                roundIndex={roundIndex}
                match={match}
                activeRound={activeRound}
                isRoundComplete={isRoundComplete(roundIndex)}
                isRoundActive={isRoundActive(roundIndex)}
                isUserHomeTeamCaptain={isUserHomeTeamCaptain}
                isUserAwayTeamCaptain={isUserAwayTeamCaptain}
                homeTeamConfirmed={homeTeamConfirmed} 
                awayTeamConfirmed={awayTeamConfirmed} 
                hoveredFrame={hoveredFrame}
                setHoveredFrame={setHoveredFrame}
                cueBallImage={cueBallImage}
                cueBallDarkImage={cueBallDarkImage}
                getPlayerName={getPlayerName}
                isHomeTeamBreaking={isHomeTeamBreaking}
                handleFrameClick={handleFrameClick}
                handleResetFrame={handleResetFrame}
                getFrameStatus={getFrameStatus}
                error={error}
                handleLockRoundScores={handleLockRoundScores}
                gameState={gameFlowState.state}
              />
            )}
            
            {/* Add substitution panel after the round if needed */}
            {(() => {
              const shouldShowPanel = showSubAfterRound(roundIndex);
              // Removed console.log statement
              return shouldShowPanel && (
                <Box key={`sub-panel-${roundIndex}`} sx={{ mb: 4 }}>
                  <SubstitutionPanel
                    roundIndex={roundIndex}
                    match={match}
                    homePlayers={homePlayers}
                    awayPlayers={awayPlayers}
                    getPlayerForRound={getPlayerForRound}
                    getPlayerName={getPlayerName}
                    isHomeTeamBreaking={isHomeTeamBreaking}
                    isUserHomeTeamCaptain={isUserHomeTeamCaptain}
                    isUserAwayTeamCaptain={isUserAwayTeamCaptain}
                    cueBallImage={cueBallImage}
                    cueBallDarkImage={cueBallDarkImage}
                  />
                </Box>
              );
            })()}
          </React.Fragment>
        );
      });
    },
    [homePlayers, awayPlayers]
  );

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Match Header - Fixed at top */}
      <MatchHeader
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        score={currentScore}
        isUserHomeTeamCaptain={isUserHomeTeamCaptain}
        isUserAwayTeamCaptain={isUserAwayTeamCaptain}
      />

      {/* Add spacing to account for fixed header */}
      <Box sx={{ mt: 8 }} />

      {/* Debug Panel (only visible to captains) */}
      {(isUserHomeTeamCaptain || isUserAwayTeamCaptain) && (
        <DebugStatePanel
          gameFlowState={{
            state: gameFlowState.state,
            currentRound: gameFlowState.currentRound,
            homeTeamConfirmed: gameFlowState.homeTeamConfirmed,
            awayTeamConfirmed: gameFlowState.awayTeamConfirmed,
            isLoading: gameFlowState.isLoading,
            error: gameFlowState.error
          }}
          match={match}
          homeTeamConfirmed={homeTeamConfirmed}
          awayTeamConfirmed={awayTeamConfirmed}
          activeRound={activeRound}
        />
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Status Alert - For scheduled matches */}
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
                          match.homeLineup.length < 4 || match.awayLineup.length < 4}
                onClick={handleStartMatchFromGameFlow}
              >
                Start Match
              </Button>
            )
          }
        >
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

      {/* Team Rosters */}
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <MatchParticipants
            team={homeTeam}
            players={homePlayers}
            match={match}
            captainUserId={homeTeam?.captainUserId || null}
            isHomeTeam={true}
          />
        </Grid>
        <Grid item xs={6}>
          <MatchParticipants
            team={awayTeam}
            players={awayPlayers}
            match={match}
            captainUserId={awayTeam?.captainUserId || null}
            isHomeTeam={false}
          />
        </Grid>
      </Grid>

      {/* Match Actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center', mb: 4 }}>
        {/* Reset Match button - only for home team captain */}
        {isUserHomeTeamCaptain && (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setShowResetConfirmation(true)}
            disabled={!match?.homeLineup || !match?.awayLineup ||
                     match.homeLineup.length < 4 || match.awayLineup.length < 4}
          >
            Reset Match
          </Button>
        )}
      </Box>

      {/* Render all rounds and substitution panels only if frames exist */}
      {match && match.frames && match.frames.length > 0 ? (
        memoizedRenderRoundsFunction(match, activeRound, gameFlowState, homePlayers, awayPlayers, clearFrame)
      ) : (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography>Loading match frames...</Typography>
          <CircularProgress sx={{ mt: 2 }} />
        </Box>
      )}

      {/* Winner Selection Dialog */}
      {editingFrame && (
        <WinnerSelectionDialog
          open={true}
          onClose={() => setEditingFrame(null)}
          homePlayer={{
            id: editingFrame.homePlayerId || '',
            firstName: getPlayerName(editingFrame.homePlayerId || '', true),
            lastName: '',
            joinDate: Timestamp.now(),
            isActive: true
          }}
          awayPlayer={{
            id: editingFrame.awayPlayerId || '',
            firstName: getPlayerName(editingFrame.awayPlayerId || '', false),
            lastName: '',
            joinDate: Timestamp.now(),
            isActive: true
          }}
          round={editingFrame.roundIndex}
          position={editingFrame.position}
          onSelectWinner={handleWinnerSelectionSubmit}
          loading={loading}
          isEditing={isFrameScored(editingFrame.roundIndex, editingFrame.position)}
        />
      )}

      {/* Lineup Dialog */}
      <LineupDialog
        open={openLineupDialog}
        onClose={handleCloseLineupDialog}
        editingHomeTeam={editingHomeTeam}
        selectedPlayers={selectedPlayers}
        onPlayerSelection={handlePlayerSelection}
        onSaveLineup={handleSaveLineup}
        availablePlayers={editingHomeTeam ? homePlayers : awayPlayers}
      />

      {/* Reset Confirmation Dialog */}
      <ResetConfirmationDialog
        open={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={() => handleResetMatch(isUserHomeTeamCaptain)}
        loading={loading}
      />
    </Container>
  );
};

export default MatchScoringRefactored; 