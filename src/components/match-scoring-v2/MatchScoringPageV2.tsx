// src/components/match-scoring-v2/MatchScoringPageV2.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Typography
} from '@mui/material';

import { MatchScoringPageV2Props, MatchPhase } from '../../types/matchV2';
import { Match, Player } from '../../types/match';
import { getMatch, getPlayersForTeam, getCurrentSeason, getTeam } from '../../services/databaseService';

// Import the hook we'll create next
import { useMatchScoringV2 } from './hooks/useMatchScoringV2';

// Import components we'll create
import PreMatchPanel from './PreMatchPanel';
import MatchHeader from './MatchHeader';
import RoundComponent from './RoundComponent';
import FrameScoringDialog from './FrameScoringDialog';


/**
 * Main Match Scoring V2 Page
 * Manages overall match state and coordinates child components
 */
const MatchScoringPageV2: React.FC<MatchScoringPageV2Props> = ({ matchId }) => {
  const {
    state,
    actions,
    loading,
    error
  } = useMatchScoringV2(matchId);

  // State for team players and names
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [teamNames, setTeamNames] = useState({ homeTeamName: 'Home Team', awayTeamName: 'Away Team' });

  // Track if we've initialized default availability to prevent infinite loop
  const initializedRef = useRef(false);

  // Auto-start match when both teams are ready
  useEffect(() => {
    if (state.preMatch?.canStartMatch && state.match?.state === 'pre-match') {
      console.log('🚀 Auto-starting match - both teams ready!');
      actions.startMatch();
    }
  }, [state.preMatch?.canStartMatch, state.match?.state, actions]);

  // Load team players when match is available
  useEffect(() => {
    const loadTeamPlayers = async () => {
      if (!state.match) return;

      try {
        setPlayersLoading(true);
        
        // Get current season
        const currentSeason = await getCurrentSeason();
        if (!currentSeason?.id) {
          console.error('No current season found');
          return;
        }

        // Get team data and players for both teams
        const [homeTeam, awayTeam, homeTeamPlayers, awayTeamPlayers] = await Promise.all([
          getTeam(state.match.homeTeamId),
          getTeam(state.match.awayTeamId),
          getPlayersForTeam(state.match.homeTeamId, currentSeason.id),
          getPlayersForTeam(state.match.awayTeamId, currentSeason.id)
        ]);

        console.log('Loaded team data and players:', {
          homeTeam: homeTeam?.name || 'Unknown',
          awayTeam: awayTeam?.name || 'Unknown',
          homeTeamPlayers: homeTeamPlayers.length,
          awayTeamPlayers: awayTeamPlayers.length
        });

        setHomeTeamPlayers(homeTeamPlayers);
        setAwayTeamPlayers(awayTeamPlayers);

        // Store team names for use in components that need them
        setTeamNames({
          homeTeamName: homeTeam?.name || 'Home Team',
          awayTeamName: awayTeam?.name || 'Away Team'
        });

        // Initialize all players as available by default if not already set
        // Only do this once to prevent infinite loop AND only if team actually has no availability set
        if (!initializedRef.current && state.match && state.preMatch) {
          console.log('🔧 Setting default availability...', {
            homePlayersLength: homeTeamPlayers.length,
            awayPlayersLength: awayTeamPlayers.length,
            homeAvailableLength: state.preMatch.home.availablePlayers.length,
            awayAvailableLength: state.preMatch.away.availablePlayers.length
          });

          // Only set defaults if team has players but NO availability set yet
          const homeNeedsDefaults = homeTeamPlayers.length > 0 && state.preMatch.home.availablePlayers.length === 0;
          const awayNeedsDefaults = awayTeamPlayers.length > 0 && state.preMatch.away.availablePlayers.length === 0;
          
          console.log('🔍 DEBUGGING default availability check:', {
            homePlayersLength: homeTeamPlayers.length,
            homeAvailableLength: state.preMatch.home.availablePlayers.length,
            homeNeedsDefaults,
            awayPlayersLength: awayTeamPlayers.length,
            awayAvailableLength: state.preMatch.away.availablePlayers.length,
            awayNeedsDefaults,
            fullPreMatchState: state.preMatch
          });
          
          // Set defaults for both teams in parallel if needed
          const promises: Promise<void>[] = [];
          
          if (homeNeedsDefaults) {
            const allHomePlayerIds = homeTeamPlayers.map(p => p.id!).filter(Boolean);
            console.log('✅ Setting home team default availability:', allHomePlayerIds);
            promises.push(actions.setDefaultAvailability('home', allHomePlayerIds));
          }
          
          if (awayNeedsDefaults) {
            const allAwayPlayerIds = awayTeamPlayers.map(p => p.id!).filter(Boolean);
            console.log('✅ Setting away team default availability:', allAwayPlayerIds);
            promises.push(actions.setDefaultAvailability('away', allAwayPlayerIds));
          }
          
          // Execute all default availability sets in parallel
          if (promises.length > 0) {
            Promise.all(promises).then(() => {
              console.log('🎉 All default availability settings completed');
            }).catch((error) => {
              console.error('❌ Error setting default availability:', error);
            });
          }
          
          initializedRef.current = true;
        }
      } catch (err) {
        console.error('Failed to load team players:', err);
        actions.setError('Failed to load team players');
      } finally {
        setPlayersLoading(false);
      }
    };

    loadTeamPlayers();
  }, [state.match?.id]); // Only depend on match ID to prevent infinite loop

  // Early loading state
  if (loading && !state.match) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  // Players loading skeleton
  if (playersLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Box textAlign="center">
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Loading team players...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  // No match found
  if (!state.match) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Match not found. Please check the match ID and try again.
        </Alert>
      </Container>
    );
  }

  const { match, matchPhase, rounds, preMatch } = state;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        {/* Match Header - Always shown */}
        <MatchHeader 
          match={{
            ...match,
            homeTeamName: teamNames.homeTeamName,
            awayTeamName: teamNames.awayTeamName
          }}
          matchPhase={matchPhase}
          loading={loading}
        />

        {/* Loading overlay for actions */}
        {loading && (
          <Box 
            sx={{ 
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }
            }}
          >
            <CircularProgress 
              sx={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2
              }} 
            />
          </Box>
        )}

        {/* Main Content based on match phase */}
        <Box sx={{ p: 3 }}>
          {/* Always show pre-match panel when in pre-match phase */}
          {matchPhase === 'pre-match' && (
            <PreMatchPanel
              match={{
                ...match,
                homeTeamName: teamNames.homeTeamName,
                awayTeamName: teamNames.awayTeamName
              }}
              homeTeamPlayers={homeTeamPlayers}
              awayTeamPlayers={awayTeamPlayers}
              isHomeCaptain={state.isHomeCaptain}
              isAwayCaptain={state.isAwayCaptain}
              preMatchState={preMatch}
              actions={actions}
            />
          )}

          {/* Always show rounds/frames for reference (even during pre-match) */}
          <Box>
            {rounds.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                No rounds configured for this match. Please check the match format.
              </Alert>
            ) : (
              <Box>
                {matchPhase === 'pre-match' && (
                  <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                    📋 Match Preview - See how your position assignments will affect the games:
                  </Typography>
                )}
                {rounds.map((round: any, index: number) => (
                  <RoundComponent
                    key={round.roundNumber}
                    round={round}
                    frames={state.frames}
                    isHomeCaptain={state.isHomeCaptain}
                    isAwayCaptain={state.isAwayCaptain}
                    actions={actions}
                    homeTeamPlayers={homeTeamPlayers}
                    awayTeamPlayers={awayTeamPlayers}
                    homeTeamName={teamNames.homeTeamName}
                    awayTeamName={teamNames.awayTeamName}

                  />
                ))}
              </Box>
            )}

            {/* Match completion message */}
            {matchPhase === 'completed' && (
              <Alert severity="success" sx={{ mt: 3 }}>
                🎉 Match completed! Final scores and results have been recorded.
              </Alert>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Global error display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          onClose={() => actions.setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Frame Scoring Dialog */}
      <FrameScoringDialog
        open={Boolean(state.editingFrame)}
        frame={state.editingFrame}
        homeTeamPlayers={homeTeamPlayers}
        awayTeamPlayers={awayTeamPlayers}
        onClose={() => actions.editFrame(null)}
        onScore={actions.scoreFrame}
      />


    </Container>
  );
};

export default MatchScoringPageV2; 