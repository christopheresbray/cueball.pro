import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Alert,
  CircularProgress,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

// Custom hooks
import { useMatchData } from '../../hooks/useMatchData';
import { useFrameScoring } from '../../hooks/useFrameScoring';
import { useSubstitutions } from '../../hooks/useSubstitutions';
import { useTeamConfirmation } from '../../hooks/useTeamConfirmation';
import { useAuth } from '../../context/AuthContext';

// Components
import MatchHeader from '../../components/match-scoring/MatchHeader';
import TeamRoster from '../../components/match-scoring/TeamRoster';
import RoundDisplay from '../../components/match-scoring/RoundDisplay';
import WinnerSelectionDialog from '../../components/match-scoring/WinnerSelectionDialog';
import LineupDialog from '../../components/match-scoring/LineupDialog';
import ResetConfirmationDialog from '../../components/match-scoring/ResetConfirmationDialog';

// Utilities
import { FrameStatus } from '../../utils/matchUtils';

// Assets
import cueBallImage from '../../assets/images/cue-ball.png';
import cueBallDarkImage from '../../assets/images/cue-ball-darkmode.png';

/**
 * MatchScoring container component
 */
const MatchScoringRefactored: React.FC = () => {
  console.log('MatchScoringRefactored: Component rendering');
  const { matchId } = useParams<{ matchId: string }>();
  console.log('MatchScoringRefactored: matchId =', matchId);
  const { user, isAdmin } = useAuth();
  console.log('MatchScoringRefactored: user =', user?.uid);

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
    handleResetMatch
  } = useFrameScoring(match, setMatch, setLoading, setError);

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

  // Additional local state
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Wrapper function to get frame status
  const getFrameStatus = (round: number, position: number): FrameStatus => {
    return match 
      ? (isFrameScored(round, position) 
        ? FrameStatus.COMPLETED 
        : (editingFrame?.round === round && editingFrame?.position === position)
          ? FrameStatus.EDITING
          : (round + 1 === activeRound)
            ? FrameStatus.ACTIVE
            : FrameStatus.PENDING)
      : FrameStatus.PENDING;
  };

  // Handle selection of winner
  const handleWinnerSelectionSubmit = (winnerId: string) => {
    if (editingFrame) {
      handleSelectWinner(editingFrame.round, editingFrame.position, winnerId);
    }
  };

  // Determine if a round is active
  const isRoundActive = (roundIndex: number): boolean => {
    return roundIndex + 1 === activeRound;
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

  const currentScore = getMatchScore();

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
                onClick={() => handleStartMatch(isUserHomeTeamCaptain)}
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

      {/* Rounds display */}
      {Array.from({ length: 4 }).map((_, roundIndex) => (
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
          handleHomeTeamConfirm={handleHomeTeamConfirm}
          handleAwayTeamConfirm={handleAwayTeamConfirm}
          handleHomeTeamEdit={handleHomeTeamEdit}
          handleAwayTeamEdit={handleAwayTeamEdit}
          getFrameStatus={getFrameStatus}
          error={error}
        />
      ))}

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