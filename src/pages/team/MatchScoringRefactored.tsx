import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Alert,
  CircularProgress,
  Button,
  Typography,
  Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

// Custom hooks
import { useMatchData } from '../../hooks/useMatchData';
import { useFrameScoring } from '../../hooks/useFrameScoring';
import { useSubstitutions } from '../../hooks/useSubstitutions';
import { useTeamConfirmation } from '../../hooks/useTeamConfirmation';
import { useAuth } from '../../context/AuthContext';
import { useGameFlowActions } from '../../hooks/useGameFlowActions';

// Components
import MatchHeader from '../../components/match-scoring/MatchHeader';
import TeamRoster from '../../components/match-scoring/TeamRoster';
import RoundDisplay from '../../components/match-scoring/RoundDisplay';
import WinnerSelectionDialog from '../../components/match-scoring/WinnerSelectionDialog';
import LineupDialog from '../../components/match-scoring/LineupDialog';
import ResetConfirmationDialog from '../../components/match-scoring/ResetConfirmationDialog';
import SubstitutionPanel from '../../components/match-scoring/SubstitutionPanel';

// Utilities
import { FrameStatus } from '../../utils/matchUtils';

// Assets
import cueBallImage from '../../assets/images/cue-ball.png';
import cueBallDarkImage from '../../assets/images/cue-ball-darkmode.png';

// Add to GameState enum
export enum GameState {
  // Existing states
  SETUP = 'setup',
  SCORING_ROUND = 'scoring_round',
  ROUND_COMPLETED = 'round_completed',
  SUBSTITUTION_PHASE = 'substitution_phase',
  AWAITING_CONFIRMATIONS = 'awaiting_confirmations',
  TRANSITIONING_TO_NEXT_ROUND = 'transitioning_to_next_round',
  // New state
  GAME_COMPLETE = 'game_complete',
}

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
    handleLockRoundScores
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
  
  // When match data is loaded, set it in our game flow state
  useEffect(() => {
    if (match) {
      gameFlowActions.setMatchData(match);
    }
  }, [match, gameFlowActions]);

  // Use the game flow actions for locking rounds instead of local state
  const handleLockRoundFromGameFlow = useCallback((roundIndex: number) => {
    gameFlowActions.lockRound(roundIndex);
  }, [gameFlowActions]);

  // Use the game flow actions for starting the match instead of local state
  const handleStartMatchFromGameFlow = useCallback(() => {
    gameFlowActions.startMatch();
  }, [gameFlowActions]);

  // Wrapper function to get frame status
  const getFrameStatus = useCallback((round: number, position: number): FrameStatus => {
    return match 
      ? (isFrameScored(round, position) 
        ? FrameStatus.COMPLETED 
        : (editingFrame?.round === round && editingFrame?.position === position)
          ? FrameStatus.EDITING
          : (round + 1 === activeRound)
            ? FrameStatus.ACTIVE
            : FrameStatus.PENDING)
      : FrameStatus.PENDING;
  }, [match, isFrameScored, editingFrame, activeRound]);

  // Handle selection of winner
  const handleWinnerSelectionSubmit = useCallback((winnerId: string) => {
    if (editingFrame) {
      console.log(`Submitting winner for Round ${editingFrame.round + 1}, Position ${editingFrame.position}, Winner ID: ${winnerId}`);
      
      // Get player IDs to confirm they're correct
      const homePlayerId = getPlayerForRound(editingFrame.round + 1, editingFrame.position, true);
      const awayPlayerId = getPlayerForRound(editingFrame.round + 1, editingFrame.position, false);
      
      console.log(`Confirming player IDs - Home: ${homePlayerId} (${getPlayerName(homePlayerId, true)}), Away: ${awayPlayerId} (${getPlayerName(awayPlayerId, false)})`);
      
      handleSelectWinner(editingFrame.round, editingFrame.position, winnerId);
    }
  }, [editingFrame, handleSelectWinner, getPlayerForRound, getPlayerName]);

  // Determine if a round is active
  const isRoundActive = useCallback((roundIndex: number): boolean => {
    return roundIndex + 1 === activeRound;
  }, [activeRound]);

  // Memoized current score calculation
  const currentScore = useMemo(() => getMatchScore(), [getMatchScore]);
  
  // Define these outside the render function to prevent recreating on each render
  const memoizedRenderRoundsFunction = useCallback(() => {
    if (!match) return null;
    
    return Array.from({ length: 4 }).map((_, roundIndex) => {
      // Check if this round is locked
      const isLocked = !!match?.roundLockedStatus?.[roundIndex];
      
      // Determine if the substitution panel should be shown *after* this round
      const showSubAfterRound = 
        roundIndex < 3 && 
        isLocked &&
        (!homeTeamConfirmed[roundIndex] || !awayTeamConfirmed[roundIndex]) &&
        // Don't show if we're already in or beyond the next round
        (match?.currentRound || 1) <= roundIndex + 1;

      // Determine if this round's display should be hidden because the *previous* round's sub panel is active
      const isLockedPrevRound = roundIndex > 0 && !!match?.roundLockedStatus?.[roundIndex - 1];
      const prevSubConfirmationPending = roundIndex > 0 && (!homeTeamConfirmed[roundIndex - 1] || !awayTeamConfirmed[roundIndex - 1]);

      // MODIFIED: Only hide a round if ALL of these conditions are true:
      // 1. It's not round 1
      // 2. The previous round is locked
      // 3. The previous round's substitutions are still pending confirmation
      // 4. This round is not the active round
      // 5. This round is not already completed
      const shouldHideRoundDisplay = 
        roundIndex > 0 && 
        isLockedPrevRound && 
        prevSubConfirmationPending &&
        roundIndex + 1 !== match?.currentRound && // Don't hide the active round
        !isRoundComplete(roundIndex);            // Don't hide completed rounds

      // FIX: Make sure to show the active round even during substitution phase
      // This prevents rounds from being skipped in the UI
      const forcedShow = match?.currentRound === roundIndex + 1;

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
              getPlayerForRound={getPlayerForRound}
              getFrameWinner={getFrameWinner}
              isFrameScored={isFrameScored}
              isHomeTeamBreaking={isHomeTeamBreaking}
              handleFrameClick={handleFrameClick}
              handleResetFrame={handleResetFrame}
              handleLockRoundScores={handleLockRoundFromGameFlow}
              getFrameStatus={getFrameStatus}
              error={error}
            />
          )}
          
          {/* Add substitution panel after the round if needed */}
          {showSubAfterRound && (
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
          )}
        </React.Fragment>
      );
    });
  }, [
    match,
    activeRound,
    homeTeamConfirmed,
    awayTeamConfirmed,
    isRoundComplete,
    isRoundActive,
    isUserHomeTeamCaptain,
    isUserAwayTeamCaptain,
    hoveredFrame,
    setHoveredFrame,
    cueBallImage,
    cueBallDarkImage,
    getPlayerName,
    getPlayerForRound,
    getFrameWinner,
    isFrameScored,
    isHomeTeamBreaking,
    handleFrameClick,
    handleResetFrame,
    handleLockRoundFromGameFlow,
    getFrameStatus,
    error,
    homePlayers,
    awayPlayers
  ]);

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
                          match.homeLineup?.length < 4 || match.awayLineup?.length < 4}
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
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {/* Home Team */}
        <TeamRoster
          team={homeTeam}
          players={homePlayers}
          match={match}
        />

        {/* Away Team */}
        <TeamRoster
          team={awayTeam}
          players={awayPlayers}
          match={match}
        />
      </Box>

      {/* Match Actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center', mb: 4 }}>
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

      {/* Render all rounds and substitution panels */}
      {memoizedRenderRoundsFunction()}

      {/* Winner Selection Dialog */}
      {editingFrame && (
        <WinnerSelectionDialog
          open={!!editingFrame}
          onClose={() => setEditingFrame(null)}
          homePlayerName={getPlayerName(getPlayerForRound(editingFrame.round + 1, editingFrame.position, true), true)}
          awayPlayerName={getPlayerName(getPlayerForRound(editingFrame.round + 1, editingFrame.position, false), false)}
          homePlayerId={getPlayerForRound(editingFrame.round + 1, editingFrame.position, true)}
          awayPlayerId={getPlayerForRound(editingFrame.round + 1, editingFrame.position, false)}
          onSelectWinner={handleWinnerSelectionSubmit}
          loading={loading}
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