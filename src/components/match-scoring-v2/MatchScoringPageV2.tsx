// src/components/match-scoring-v2/MatchScoringPageV2.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';

import { MatchScoringPageV2Props, MatchPhase } from '../../types/matchV2';
import { Match, Player } from '../../types/match';
import { getMatch, getPlayersForTeam, getCurrentSeason, getTeam, getMatches } from '../../services/databaseService';
import { getPlayerDisplayName } from '../../utils/playerNameUtils';

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
  const [playerStats, setPlayerStats] = useState<{ homeStats: Record<string, { wins: number; total: number }>; awayStats: Record<string, { wins: number; total: number }> }>({ homeStats: {}, awayStats: {} });
  const [seasonPlayerStats, setSeasonPlayerStats] = useState<{ homeStats: Record<string, { wins: number; total: number }>; awayStats: Record<string, { wins: number; total: number }> }>({ homeStats: {}, awayStats: {} });

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

  // Load player statistics when teams change
  useEffect(() => {
    const loadPlayerStats = async () => {
      if (homeTeamPlayers.length > 0 || awayTeamPlayers.length > 0) {
        const stats = await calculatePlayerStats();
        setPlayerStats(stats);
      }
    };

    loadPlayerStats();
  }, [homeTeamPlayers, awayTeamPlayers, state.match?.id]);

  // Load season player statistics when teams change
  useEffect(() => {
    const loadSeasonPlayerStats = async () => {
      if (homeTeamPlayers.length > 0 || awayTeamPlayers.length > 0) {
        const stats = await calculateSeasonPlayerStats();
        setSeasonPlayerStats(stats);
      }
    };

    loadSeasonPlayerStats();
  }, [homeTeamPlayers, awayTeamPlayers, state.match?.seasonId]);

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

  // Calculate player statistics (wins/total frames) - Current match only
  const calculatePlayerStats = async () => {
    if (!state.match?.id) {
      return { homeStats: {}, awayStats: {} };
    }

    try {
      // Initialize stats for all players in the current match
      const homeStats: Record<string, { wins: number; total: number }> = {};
      const awayStats: Record<string, { wins: number; total: number }> = {};

      // Initialize stats for current match players
      homeTeamPlayers.forEach(player => {
        homeStats[player.id!] = { wins: 0, total: 0 };
      });
      awayTeamPlayers.forEach(player => {
        awayStats[player.id!] = { wins: 0, total: 0 };
      });

      // Calculate stats from the current match frames only
      if (state.frames) {
        state.frames.forEach(frame => {
          if (frame.isComplete) {
            // Count total frames for both players
            if (frame.homePlayerId && frame.homePlayerId !== 'vacant') {
              if (homeStats[frame.homePlayerId]) {
                homeStats[frame.homePlayerId].total += 1;
              } else if (awayStats[frame.homePlayerId]) {
                awayStats[frame.homePlayerId].total += 1;
              }
            }
            if (frame.awayPlayerId && frame.awayPlayerId !== 'vacant') {
              if (homeStats[frame.awayPlayerId]) {
                homeStats[frame.awayPlayerId].total += 1;
              } else if (awayStats[frame.awayPlayerId]) {
                awayStats[frame.awayPlayerId].total += 1;
              }
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
      }

      console.log('🔍 Current match stats calculation:', {
        totalFrames: state.frames?.length || 0,
        completedFrames: state.frames?.filter(f => f.isComplete).length || 0,
        homeTeamPlayers: homeTeamPlayers.length,
        awayTeamPlayers: awayTeamPlayers.length,
        homeStats: Object.keys(homeStats).length,
        awayStats: Object.keys(awayStats).length
      });

      return { homeStats, awayStats };
    } catch (error) {
      console.error('Error calculating current match player stats:', error);
      return { homeStats: {}, awayStats: {} };
    }
  };

  // Calculate season-wide player statistics (for the bottom table)
  const calculateSeasonPlayerStats = async () => {
    if (!state.match?.seasonId) {
      return { homeStats: {}, awayStats: {} };
    }

    try {
      // Get current season
      const currentSeason = await getCurrentSeason();
      if (!currentSeason?.id) {
        console.error('No current season found');
        return { homeStats: {}, awayStats: {} };
      }

      // Fetch all matches for the season
      const seasonMatches = await getMatches(currentSeason.id);
      
      // Initialize stats for all players - track ALL players from ALL matches
      const allPlayerStats: Record<string, { wins: number; total: number }> = {};

      // Calculate stats from all completed matches in the season
      seasonMatches
        .filter(match => match.status === 'completed')
        .forEach(match => {
          (match.frames || []).forEach(frame => {
            if (frame.isComplete) {
              // Count total frames for both players
              if (frame.homePlayerId && frame.homePlayerId !== 'vacant') {
                if (!allPlayerStats[frame.homePlayerId]) {
                  allPlayerStats[frame.homePlayerId] = { wins: 0, total: 0 };
                }
                allPlayerStats[frame.homePlayerId].total += 1;
              }
              if (frame.awayPlayerId && frame.awayPlayerId !== 'vacant') {
                if (!allPlayerStats[frame.awayPlayerId]) {
                  allPlayerStats[frame.awayPlayerId] = { wins: 0, total: 0 };
                }
                allPlayerStats[frame.awayPlayerId].total += 1;
              }

              // Count wins
              if (frame.winnerPlayerId) {
                if (!allPlayerStats[frame.winnerPlayerId]) {
                  allPlayerStats[frame.winnerPlayerId] = { wins: 0, total: 0 };
                }
                allPlayerStats[frame.winnerPlayerId].wins += 1;
              }
            }
          });
        });

      // Now separate stats by current match teams
      const homeStats: Record<string, { wins: number; total: number }> = {};
      const awayStats: Record<string, { wins: number; total: number }> = {};

      // Initialize stats for current match players (even if they have no stats yet)
      homeTeamPlayers.forEach(player => {
        homeStats[player.id!] = allPlayerStats[player.id!] || { wins: 0, total: 0 };
      });
      awayTeamPlayers.forEach(player => {
        awayStats[player.id!] = allPlayerStats[player.id!] || { wins: 0, total: 0 };
      });

      console.log('🔍 Season stats calculation for bottom table:', {
        totalMatches: seasonMatches.length,
        completedMatches: seasonMatches.filter(m => m.status === 'completed').length,
        allPlayerStats: Object.keys(allPlayerStats).length,
        homeTeamPlayers: homeTeamPlayers.length,
        awayTeamPlayers: awayTeamPlayers.length,
        homeStats: Object.keys(homeStats).length,
        awayStats: Object.keys(awayStats).length
      });

      return { homeStats, awayStats };
    } catch (error) {
      console.error('Error calculating season-wide player stats:', error);
      return { homeStats: {}, awayStats: {} };
    }
  };

  const scores = calculateScores();

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
      <Container maxWidth="lg" sx={{ py: 4, mt: 28 }}>
        <Paper elevation={3} sx={{ overflow: 'hidden', backgroundColor: '#1e1e1e' }}>

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
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
        <Box sx={{ p: 0.0625 }}>
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
                    backgroundColor: '#1e1e1e',
                    color: '#4caf50',
                    fontWeight: 'bold',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    border: '1px solid #333',
                    '&:hover': {
                      backgroundColor: '#2a2a2a',
                    }
                  }}
                >
                  Return to Home
                </Button>
              </Box>
            )}

            {/* Player Statistics Section - Show when match has frames */}
            {state.frames && state.frames.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 2, 
                    mb: 2,
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                    Season Statistics
                  </Typography>
                </Paper>
                
                {(() => {
                  // Get all participating players and their season stats
                  const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
                  const playerStatsMap = { ...seasonPlayerStats.homeStats, ...seasonPlayerStats.awayStats };
                  
                  console.log('🔍 Season player stats debugging:', {
                    homeTeamPlayers: homeTeamPlayers.length,
                    awayTeamPlayers: awayTeamPlayers.length,
                    allPlayers: allPlayers.length,
                    homeStats: Object.keys(seasonPlayerStats.homeStats).length,
                    awayStats: Object.keys(seasonPlayerStats.awayStats).length,
                    playerStatsMap: Object.keys(playerStatsMap).length
                  });
                  
                  // Create player stats array - include ALL players, even those with no stats
                  const playerStatsArray = allPlayers
                    .map(player => {
                      const stats = playerStatsMap[player.id!] || { wins: 0, total: 0 };
                      const team = homeTeamPlayers.find(p => p.id === player.id) ? 'Home' : 'Away';
                      
                      return {
                        id: player.id!,
                        name: getPlayerDisplayName(player),
                        team: team,
                        wins: stats.wins,
                        total: stats.total,
                        losses: stats.total - stats.wins,
                        winPercentage: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
                      };
                    })
                    .sort((a, b) => {
                      // Sort by win percentage (descending), then by wins (descending), then by name
                      if (a.winPercentage !== b.winPercentage) {
                        return b.winPercentage - a.winPercentage;
                      }
                      if (a.wins !== b.wins) {
                        return b.wins - a.wins;
                      }
                      return a.name.localeCompare(b.name);
                    });

                  return (
                    <Paper elevation={3} sx={{ p: 2, backgroundColor: '#1e1e1e' }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', textAlign: 'center', verticalAlign: 'middle' }}>Rank</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Player</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Team</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Stats</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {playerStatsArray.map((stat, index) => (
                              <TableRow 
                                key={stat.id}
                                hover
                                sx={{ 
                                  backgroundColor: 'inherit'
                                }}
                              >
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem', textAlign: 'center', verticalAlign: 'middle' }}>
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{stat.name}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{stat.team}</TableCell>
                                <TableCell align="center" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                  {stat.total > 0 ? `${stat.wins}/${stat.total} = ${stat.winPercentage.toFixed(0)}%` : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                            {playerStatsArray.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ fontSize: '0.8rem' }}>
                                  No player statistics available yet
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  );
                })()}
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