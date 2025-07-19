// src/components/match-scoring-v2/PreMatchPanel.tsx

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  Button
} from '@mui/material';

import { PreMatchPanelProps } from '../../types/matchV2';
import RosterConfirmation from './RosterConfirmation';
import InitialLineupAssignment from './InitialLineupAssignment';

/**
 * Pre-Match Panel Component
 * Handles roster confirmation and initial lineup assignment
 */
const PreMatchPanel: React.FC<PreMatchPanelProps> = ({
  match,
  homeTeamPlayers,
  awayTeamPlayers,
  isHomeCaptain,
  isAwayCaptain,
  preMatchState,
  actions
}) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Pre-Match Setup
      </Typography>
      
      {/* Debug info */}
      <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', fontSize: '0.8rem' }}>
        <strong>Debug Info:</strong><br/>
        Home Captain: {isHomeCaptain ? '✅ Yes' : '❌ No'} | 
        Away Captain: {isAwayCaptain ? '✅ Yes' : '❌ No'}<br/>
        Home Team: {match.homeTeamName} | Away Team: {match.awayTeamName}<br/>
        <strong style={{color: 'red'}}>⚠️ TESTING MODE: Home captain can edit both teams</strong>
      </Box>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Captains must confirm their roster and assign players to Round 1 positions before the match can begin.
      </Alert>

      <Grid container spacing={3}>
        {/* Home Team */}
        <Grid item xs={12} md={6}>
          <Box sx={{ 
            border: '2px solid #e0e0e0',
            borderRadius: 2,
            p: 2,
            height: '100%'
          }}>
            <Typography variant="h6" gutterBottom>
              {match.homeTeamName || 'Home Team'}
            </Typography>
            
            {/* Roster Confirmation Status */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Roster Status: {preMatchState.home.rosterConfirmed ? '✅ Confirmed' : '⏳ Pending'}
              </Typography>
              {/* TEMPORARY FOR TESTING: Allow home captain to edit both teams */}
              {isHomeCaptain && !preMatchState.home.rosterConfirmed && (
                <Typography variant="body2" color="primary">
                  You can confirm available players below
                </Typography>
              )}
            </Box>

            {/* Roster Confirmation Component */}
            <RosterConfirmation
              teamName={match.homeTeamName || 'Home Team'}
              teamPlayers={homeTeamPlayers}
              isHomeTeam={true}
              availabilityStatus={(() => {
                const status = Object.fromEntries(
                  homeTeamPlayers.map(p => [
                    p.id!,
                    preMatchState.home.availablePlayers.includes(p.id!)
                  ])
                );
                console.log('🏠 Home team availability status:', {
                  homeTeamPlayers: homeTeamPlayers.map(p => ({ id: p.id, name: p.firstName + ' ' + p.lastName })),
                  availablePlayers: preMatchState.home.availablePlayers,
                  calculatedStatus: status
                });
                return status;
              })()}
              isConfirmed={preMatchState.home.rosterConfirmed}
              onToggleAvailability={(playerId, available) => 
                actions.togglePlayerAvailability('home', playerId)
              }
              onConfirmRoster={() => actions.confirmRoster('home')}
              onEditRoster={() => {
                // TEMPORARY FOR TESTING: Allow home captain to edit both teams
                if (isHomeCaptain) {
                  console.log('Edit home roster');
                }
              }}
            />

            {/* Initial Lineup Assignment (only after roster confirmed) */}
            {preMatchState.home.rosterConfirmed && (
              <InitialLineupAssignment
                teamName={match.homeTeamName || 'Home Team'}
                availablePlayers={homeTeamPlayers.filter(p => 
                  p.id && preMatchState.home.availablePlayers.includes(p.id)
                )}
                isHomeTeam={true}
                positions={['A', 'B', 'C', 'D']}
                currentAssignments={Object.fromEntries(preMatchState.home.round1Assignments)}
                isConfirmed={preMatchState.home.lineupLocked}
                onAssignPosition={(position, playerId) =>
                  actions.assignPosition('home', position, playerId)
                }
                onConfirmLineup={() => actions.lockInitialLineup('home')}
                onEditLineup={() => {
                  console.log('Edit Lineup clicked for home team!', {
                    isHomeCaptain,
                    currentState: preMatchState.home,
                    otherTeamState: preMatchState.away
                  });
                  // TEMPORARY FOR TESTING: Allow home captain to edit both teams
                  if (isHomeCaptain) {
                    console.log('Calling unlockInitialLineup for home team...');
                    actions.unlockInitialLineup('home');
                  } else {
                    console.log('Not home captain, cannot edit');
                  }
                }}
              />
            )}
          </Box>
        </Grid>

        {/* Away Team */}
        <Grid item xs={12} md={6}>
          <Box sx={{ 
            border: '2px solid #e0e0e0',
            borderRadius: 2,
            p: 2,
            height: '100%'
          }}>
            <Typography variant="h6" gutterBottom>
              {match.awayTeamName || 'Away Team'}
            </Typography>
            
            {/* Roster Confirmation Status */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Roster Status: {preMatchState.away.rosterConfirmed ? '✅ Confirmed' : '⏳ Pending'}
              </Typography>
              {/* TEMPORARY FOR TESTING: Allow home captain to edit both teams */}
              {(isAwayCaptain || isHomeCaptain) && !preMatchState.away.rosterConfirmed && (
                <Typography variant="body2" color="primary">
                  You can confirm available players below
                </Typography>
              )}
            </Box>

            {/* Roster Confirmation Component */}
            <RosterConfirmation
              teamName={match.awayTeamName || 'Away Team'}
              teamPlayers={awayTeamPlayers}
              isHomeTeam={false}
              availabilityStatus={Object.fromEntries(
                awayTeamPlayers.map(p => [
                  p.id!,
                  preMatchState.away.availablePlayers.includes(p.id!)
                ])
              )}
              isConfirmed={preMatchState.away.rosterConfirmed}
              onToggleAvailability={(playerId, available) => 
                actions.togglePlayerAvailability('away', playerId)
              }
              onConfirmRoster={() => actions.confirmRoster('away')}
              onEditRoster={() => {
                // TEMPORARY FOR TESTING: Allow home captain to edit both teams
                if (isAwayCaptain || isHomeCaptain) {
                  console.log('Edit away roster');
                }
              }}
            />

            {/* Initial Lineup Assignment (only after roster confirmed) */}
            {preMatchState.away.rosterConfirmed && (
              <InitialLineupAssignment
                teamName={match.awayTeamName || 'Away Team'}
                availablePlayers={awayTeamPlayers.filter(p => 
                  p.id && preMatchState.away.availablePlayers.includes(p.id)
                )}
                isHomeTeam={false}
                positions={[1, 2, 3, 4]}
                currentAssignments={Object.fromEntries(preMatchState.away.round1Assignments)}
                isConfirmed={preMatchState.away.lineupLocked}
                onAssignPosition={(position, playerId) =>
                  actions.assignPosition('away', position, playerId)
                }
                onConfirmLineup={() => actions.lockInitialLineup('away')}
                onEditLineup={() => {
                  console.log('Edit Lineup clicked for away team!', {
                    isAwayCaptain,
                    currentState: preMatchState.away,
                    otherTeamState: preMatchState.home
                  });
                  // TEMPORARY FOR TESTING: Allow home captain to edit both teams
                  if (isAwayCaptain || isHomeCaptain) {
                    console.log('Calling unlockInitialLineup for away team...');
                    actions.unlockInitialLineup('away');
                  } else {
                    console.log('Not away captain, cannot edit');
                  }
                }}
              />
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Start Match Button Area */}
      {preMatchState.canStartMatch && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            🎱 Both teams are ready! The match can now begin.
            <br/><strong style={{color: 'red'}}>⚠️ TESTING MODE: Home captain controls both teams</strong>
          </Alert>
          <Button
            variant="contained"
            size="large"
            color="success"
            onClick={actions.startMatch}
            sx={{ 
              minWidth: 200,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            🎱 Start Match
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PreMatchPanel; 