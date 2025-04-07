import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListSubheader,
  Grid
} from '@mui/material';
import { 
  SwapHoriz as SwapIcon,
  InfoOutlined as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Match, Player } from '../../services/databaseService';
import { getPositionLetter, getOpponentPosition } from '../../utils/matchUtils';

interface SubstitutionPanelProps {
  roundIndex: number;
  match: Match | null;
  homePlayers: Player[];
  awayPlayers: Player[];
  getPlayerForRound: (round: number, position: number, isHomeTeam: boolean) => string;
  getPlayerName: (playerId: string, isHomeTeam: boolean) => string;
  getSubstitutesForRound: (round: number, isHomeTeam: boolean) => string[];
  isHomeTeamBreaking: (round: number, position: number) => boolean;
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
  homeTeamConfirmed: { [round: number]: boolean };
  awayTeamConfirmed: { [round: number]: boolean };
  handleHomeTeamConfirm: (roundIndex: number) => void;
  handleAwayTeamConfirm: (roundIndex: number) => void;
  handleHomeTeamEdit: (roundIndex: number) => void;
  handleAwayTeamEdit: (roundIndex: number) => void;
  handleConfirmSubstitution: (position: number, isHomeTeam: boolean, newPlayerId: string, roundIndexCompleted: number) => void;
  error: string;
  cueBallImage: string;
  cueBallDarkImage: string;
}

/**
 * Component that displays the substitution panel for the next round
 */
const SubstitutionPanel: React.FC<SubstitutionPanelProps> = ({
  roundIndex,
  match,
  homePlayers,
  awayPlayers,
  getPlayerForRound,
  getPlayerName: getPlayerNameFromProp,
  getSubstitutesForRound,
  isHomeTeamBreaking,
  isUserHomeTeamCaptain,
  isUserAwayTeamCaptain,
  homeTeamConfirmed,
  awayTeamConfirmed,
  handleHomeTeamConfirm,
  handleAwayTeamConfirm,
  handleHomeTeamEdit,
  handleAwayTeamEdit,
  handleConfirmSubstitution,
  error,
  cueBallImage,
  cueBallDarkImage
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [selectingSubFor, setSelectingSubFor] = useState<{ position: number; isHomeTeam: boolean; anchorEl: HTMLElement | null } | null>(null);
  const [playerBeingReplaced, setPlayerBeingReplaced] = useState<string | null>(null);
  
  const nextRoundNumber = roundIndex + 2;
  const lineupForNextRound = useMemo(() => {
    let baseHomeLineup: string[] = match?.homeLineup?.slice(0, 4) || [];
    let baseAwayLineup: string[] = match?.awayLineup?.slice(0, 4) || [];
    
    for (let r = nextRoundNumber; r >= 1; r--) {
        if (match?.lineupHistory?.[r]) {
            baseHomeLineup = match.lineupHistory[r].homeLineup;
            baseAwayLineup = match.lineupHistory[r].awayLineup;
            break;
        }
    }
    if (nextRoundNumber === 1 && match) {
         baseHomeLineup = match.homeLineup?.slice(0,4) || [];
         baseAwayLineup = match.awayLineup?.slice(0,4) || [];
     }

    while (baseHomeLineup.length < 4) baseHomeLineup.push('');
    while (baseAwayLineup.length < 4) baseAwayLineup.push('');

    return { home: baseHomeLineup, away: baseAwayLineup };
  }, [match, nextRoundNumber]);

  const getEligibility = (substitutePlayerId: string | undefined, targetIsHomeTeam: boolean, targetPosition: number | null): { eligible: boolean; reason: string } => {
    if (!substitutePlayerId) {
        return { eligible: false, reason: 'Invalid player ID' };
    }
    
    if (targetPosition === null) return { eligible: false, reason: 'No target selected' };
    if (!match) return { eligible: false, reason: 'Match data not loaded' };

    const playersLastRound = new Set<string>();
    for (let pos = 0; pos < 4; pos++) {
        playersLastRound.add(getPlayerForRound(roundIndex, pos, true)); 
        playersLastRound.add(getPlayerForRound(roundIndex, pos, false));
    }
    playersLastRound.delete('');

    const nextRoundLineup = targetIsHomeTeam ? lineupForNextRound.home : lineupForNextRound.away;

    const allTeamPlayers = targetIsHomeTeam ? homePlayers.map(p => p.id) : awayPlayers.map(p => p.id);

    const currentPositionOfSub = nextRoundLineup.indexOf(substitutePlayerId);
    if (currentPositionOfSub !== -1 && currentPositionOfSub !== targetPosition) {
        // Use numbers for home team positions, letters for away team positions
        const positionDisplay = targetIsHomeTeam 
            ? (currentPositionOfSub + 1).toString() 
            : String.fromCharCode(65 + currentPositionOfSub);
        return { eligible: false, reason: `Already playing in position ${positionDisplay} next round.` };
    }

    if (playersLastRound.has(substitutePlayerId)) {
         return { eligible: false, reason: 'Played in the previous round. Must sit out this round.' };
    }

    if (substitutePlayerId === playerBeingReplaced && targetPosition === selectingSubFor?.position && targetIsHomeTeam === selectingSubFor?.isHomeTeam) {
        return { eligible: false, reason: 'Cannot sub player back into the same position immediately.' };
    }

    return { eligible: true, reason: '' };
  };

  const handleSwapClick = (event: React.MouseEvent<HTMLElement>, position: number, isHomeTeam: boolean) => {
    const currentLineup = isHomeTeam ? lineupForNextRound.home : lineupForNextRound.away;
    const currentPlayerId = currentLineup[position];
    setPlayerBeingReplaced(currentPlayerId);
    setSelectingSubFor({ position, isHomeTeam, anchorEl: event.currentTarget });
  };

  const handleCloseSubMenu = () => {
    setSelectingSubFor(null);
    setPlayerBeingReplaced(null);
  };

  const handleSubstituteSelect = (selectedPlayerId: string) => {
    if (!selectingSubFor) return;
    handleConfirmSubstitution(
      selectingSubFor.position,
      selectingSubFor.isHomeTeam,
      selectedPlayerId,
      roundIndex
    );
    handleCloseSubMenu();
  };

  const renderPlayerSubstitute = (position: number, isHomeTeam: boolean) => {
    const currentLineup = isHomeTeam ? lineupForNextRound.home : lineupForNextRound.away;
    const playerId = currentLineup[position];
    const playerName = getPlayerNameFromProp(playerId, isHomeTeam);
    const canEdit = isHomeTeam ? isUserHomeTeamCaptain : isUserAwayTeamCaptain;
    const teamConfirmed = isHomeTeam ? homeTeamConfirmed[roundIndex] : awayTeamConfirmed[roundIndex];

    const opponentPosition = getOpponentPosition(nextRoundNumber, position, !isHomeTeam);
    const opponentPlayerId = getPlayerForRound(nextRoundNumber, opponentPosition, !isHomeTeam);
    const opponentName = opponentPlayerId ? getPlayerNameFromProp(opponentPlayerId, !isHomeTeam) : 'TBD';

    const futureMatchups = [];
    for (let r = nextRoundNumber + 1; r <= 4; r++) {
      const futureOpponentPos = getOpponentPosition(r, position, !isHomeTeam);
      const futureOpponentId = getPlayerForRound(r, futureOpponentPos, !isHomeTeam);
      const futureOpponentName = futureOpponentId ? getPlayerNameFromProp(futureOpponentId, !isHomeTeam) : 'TBD';
      futureMatchups.push(`R${r} vs ${futureOpponentName}`);
    }
    
    // Generate position label - numbers for home team, letters for away team
    const positionLabel = isHomeTeam 
      ? `Position ${position + 1}` 
      : `Position ${String.fromCharCode(65 + position)}`; // A=65, B=66, etc.
    
    const tooltipTitle = (
        <Box>
            <Typography variant="body2">
              Playing as: {isHomeTeam ? (position + 1).toString() : String.fromCharCode(65 + position)}
            </Typography>
            <Typography variant="body2">Next: vs {opponentName}</Typography>
            {futureMatchups.length > 0 && (
                <Typography variant="caption">Future: {futureMatchups.join(', ')}</Typography>
            )}
        </Box>
    );

    return (
      <ListItem key={`${isHomeTeam ? 'home' : 'away'}-${position}`}>
        <ListItemText 
          primaryTypographyProps={{ variant: 'body1' }} 
          primary={
            <Tooltip title={tooltipTitle} placement="top" arrow>
              <Typography component="span" sx={{ textDecoration: 'underline dotted', cursor: 'help' }}>
                {playerName || 'Empty Slot'}
              </Typography>
            </Tooltip>
          }
          secondary={positionLabel}
        />
        {canEdit && !teamConfirmed && (
          <IconButton size="small" onClick={(event) => handleSwapClick(event, position, isHomeTeam)}>
            <SwapIcon />
          </IconButton>
        )}
        {selectingSubFor?.position === position && selectingSubFor?.isHomeTeam === isHomeTeam && (
            <Menu
                anchorEl={selectingSubFor.anchorEl} 
                open={true} 
                onClose={handleCloseSubMenu}
            >
                <ListSubheader>Select Substitute</ListSubheader>
                {(isHomeTeam ? homePlayers : awayPlayers)
                    .filter(p => p.id && p.id !== playerBeingReplaced)
                    .map(player => {
                        const eligibility = getEligibility(player.id, isHomeTeam, position);
                        const subPlayerName = getPlayerNameFromProp(player.id!, isHomeTeam);
                        return (
                            <MenuItem 
                                key={player.id}
                                disabled={!eligibility.eligible}
                                onClick={() => handleSubstituteSelect(player.id!)}
                            >
                                <Tooltip title={eligibility.reason} placement="right" arrow disableHoverListener={eligibility.eligible}>
                                    <ListItemText primary={subPlayerName} />
                                </Tooltip>
                                {!eligibility.eligible && <CancelIcon color="error" sx={{ ml: 1 }} />}
                                {eligibility.eligible && <CheckCircleIcon color="success" sx={{ ml: 1 }} />} 
                            </MenuItem>
                        );
                })}
            </Menu>
        )}
      </ListItem>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2, mb: 4, border: '1px dashed grey' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
        Round {nextRoundNumber} Lineup
        <Tooltip title="After completing all frames, you can make substitutions for the next round. Rules: A player can't play in two positions in the same round, and must sit out at least one round before playing in a different position.">
          <IconButton size="small" sx={{ ml: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>
            Home Team Lineup
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            {Array.from({ length: 4 }).map((_, i) => renderPlayerSubstitute(i, true))}
          </List>
          {isUserHomeTeamCaptain && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              {!homeTeamConfirmed[roundIndex] ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleHomeTeamConfirm(roundIndex)}
                >
                  Confirm Home Team Lineup
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleHomeTeamEdit(roundIndex)}
                >
                  Edit Home Team Lineup
                </Button>
              )}
            </Box>
          )}
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" gutterBottom>
            Away Team Lineup
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            {Array.from({ length: 4 }).map((_, i) => renderPlayerSubstitute(i, false))}
          </List>
          {isUserAwayTeamCaptain && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              {!awayTeamConfirmed[roundIndex] ? (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => handleAwayTeamConfirm(roundIndex)}
                >
                  Confirm Away Team Lineup
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => handleAwayTeamEdit(roundIndex)}
                >
                  Edit Away Team Lineup
                </Button>
              )}
            </Box>
          )}
        </Grid>
      </Grid>
      
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
          Both teams have confirmed their lineups. Advancing to Round {nextRoundNumber}...
        </Alert>
      )}
    </Paper>
  );
};

export default SubstitutionPanel; 