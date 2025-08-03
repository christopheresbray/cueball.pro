// src/components/match-scoring-v2/MatchScoringPageV2.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Typography,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';

import { MatchScoringPageV2Props, MatchPhase } from '../../types/matchV2';
import { Match, Player } from '../../types/match';
import { getMatch, getPlayersForTeam, getCurrentSeason, getTeam } from '../../services/databaseService';

// Import the hook we'll create next
import { useMatchScoringV2 } from './hooks/useMatchScoringV2';

// Import components we'll create
import PreMatchPanel from './PreMatchPanel';
import RoundComponent from './RoundComponent';
import FrameScoringDialog from './FrameScoringDialog';
import Scoreboard from './Scoreboard';


/**
 * Main Match Scoring V2 Page
 * Manages overall match state and coordinates child components
 */
const MatchScoringPageV2: React.FC<MatchScoringPageV2Props> = ({ matchId }) => {
  const navigate = useNavigate();
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

  // Calculate current scores from frames
  const calculateScores = () => {
    if (!state.frames || state.frames.length === 0) return { home: 0, away: 0 };
    
    return state.frames.reduce((acc, frame) => {
      if (frame.isComplete && frame.winnerPlayerId) {
        // Determine if winner is home or away team
        const homeTeamPlayerIds = homeTeamPlayers.map(p => p.id);
        const awayTeamPlayerIds = awayTeamPlayers.map(p => p.id);
        
        if (homeTeamPlayerIds.includes(frame.winnerPlayerId)) {
          acc.home += 1;
        } else if (awayTeamPlayerIds.includes(frame.winnerPlayerId)) {
          acc.away += 1;
        }
      }
      return acc;
    }, { home: 0, away: 0 });
  };

  // Calculate player statistics (wins/total frames)
  const calculatePlayerStats = () => {
    if (!state.frames || state.frames.length === 0) {
      return { homeStats: {}, awayStats: {} };
    }

    const homeStats: Record<string, { wins: number; total: number }> = {};
    const awayStats: Record<string, { wins: number; total: number }> = {};

    // Initialize stats for all players
    homeTeamPlayers.forEach(player => {
      homeStats[player.id!] = { wins: 0, total: 0 };
    });
    awayTeamPlayers.forEach(player => {
      awayStats[player.id!] = { wins: 0, total: 0 };
    });

    // Calculate stats from frames
    state.frames.forEach(frame => {
      if (frame.isComplete) {
        // Count total frames for both players
        if (frame.homePlayerId && frame.homePlayerId !== 'vacant') {
          homeStats[frame.homePlayerId].total += 1;
        }
        if (frame.awayPlayerId && frame.awayPlayerId !== 'vacant') {
          awayStats[frame.awayPlayerId].total += 1;
        }

        // Count wins
        if (frame.winnerPlayerId) {
          if (homeStats[frame.winnerPlayerId]) {
            homeStats[frame.winnerPlayerId].wins += 1;
          } else if (awayStats[frame.winnerPlayerId]) {
            awayStats[frame.winnerPlayerId].wins += 1;
          }
        }
      }
    });

    return { homeStats, awayStats };
  };

  const scores = calculateScores();
  const playerStats = calculatePlayerStats();

  return (
    <>
      {/* Fixed Scoreboard */}
      <Scoreboard
        homeTeamName={teamNames.homeTeamName}
        awayTeamName={teamNames.awayTeamName}
        homeScore={scores.home}
        awayScore={scores.away}
        currentRound={match?.currentRound || 1}
        totalRounds={4}
        homeTeamPlayers={homeTeamPlayers}
        awayTeamPlayers={awayTeamPlayers}
        homePlayerStats={playerStats.homeStats}
        awayPlayerStats={playerStats.awayStats}
      />
      
      {/* Main Content with top margin to account for navbar + fixed scoreboard */}
      <Container maxWidth="lg" sx={{ py: 4, mt: 16 }}>
        <Paper elevation={3} sx={{ overflow: 'hidden' }}>

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
                    matchPhase={matchPhase}
                  />
                ))}
              </Box>
            )}

            {/* Match completion message */}
            {matchPhase === 'completed' && (
              <Box sx={{ 
                mt: 4, 
                p: 4, 
                textAlign: 'center',
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                borderRadius: 3,
                color: 'white',
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)'
              }}>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
                  🏆 Match Completed! 🏆
                </Typography>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Final scores and results have been recorded.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<HomeIcon />}
                  onClick={() => navigate('/')}
                  sx={{
                    backgroundColor: 'white',
                    color: '#4caf50',
                    fontWeight: 'bold',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    }
                  }}
                >
                  Return to Home
                </Button>
              </Box>
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
    </>
  );
};

export default MatchScoringPageV2; 