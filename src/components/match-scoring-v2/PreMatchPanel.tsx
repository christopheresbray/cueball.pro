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
        Captains must confirm their roster before the match can begin. Initial lineup will be selected in Round 1 substitution phase.
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


          </Box>
        </Grid>
      </Grid>

      {/* Start Match Button Area */}
      {preMatchState.canStartMatch && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            🎱 Both teams are ready! The match will start in Round 1 substitution phase where you can select your initial lineup.
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
            🎱 Start Match - Round 1 Substitution
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PreMatchPanel; 