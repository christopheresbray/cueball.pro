import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import FrameCard from './FrameCard';
import SubstitutionPanel from './SubstitutionPanel';

import { FrameStatus, getPositionLetter } from '../../utils/matchUtils';
import { Match } from '../../services/databaseService';

interface RoundDisplayProps {
  roundIndex: number;
  match: Match | null;
  activeRound: number;
  isRoundComplete: boolean;
  isRoundActive: boolean;
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
  homeTeamConfirmed: { [round: number]: boolean };
  awayTeamConfirmed: { [round: number]: boolean };
  hoveredFrame: { round: number, position: number } | null;
  setHoveredFrame: React.Dispatch<React.SetStateAction<{ round: number, position: number } | null>>;
  cueBallImage: string;
  cueBallDarkImage: string;
  getPlayerName: (playerId: string, isHomeTeam: boolean) => string;
  getPlayerForRound: (round: number, position: number, isHomeTeam: boolean) => string;
  getFrameWinner: (round: number, position: number) => string | null;
  isFrameScored: (round: number, position: number) => boolean;
  isHomeTeamBreaking: (round: number, position: number) => boolean;
  handleFrameClick: (round: number, position: number, event?: React.MouseEvent) => void;
  handleResetFrame: (round: number, position: number, event: React.MouseEvent) => void;
  handleHomeTeamConfirm: (roundIndex: number) => void;
  handleAwayTeamConfirm: (roundIndex: number) => void;
  handleHomeTeamEdit: (roundIndex: number) => void;
  handleAwayTeamEdit: (roundIndex: number) => void;
  getFrameStatus: (round: number, position: number) => FrameStatus;
  error: string;
}

/**
 * Component that displays a complete round with its frames
 */
const RoundDisplay: React.FC<RoundDisplayProps> = ({
  roundIndex,
  match,
  activeRound,
  isRoundComplete,
  isRoundActive,
  isUserHomeTeamCaptain,
  isUserAwayTeamCaptain,
  homeTeamConfirmed,
  awayTeamConfirmed,
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
  handleHomeTeamConfirm,
  handleAwayTeamConfirm,
  handleHomeTeamEdit,
  handleAwayTeamEdit,
  getFrameStatus,
  error
}) => {
  return (
    <Box key={`round-${roundIndex}`} sx={{ mb: 4 }}>
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: isRoundActive ? 'rgba(144, 202, 249, 0.08)' : 'inherit' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Round {roundIndex + 1}
            {isRoundComplete && !isRoundActive && (
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
            const homePlayerId = getPlayerForRound(roundIndex + 1, position, true);
            const awayPlayerId = getPlayerForRound(roundIndex + 1, position, false);
            const homePlayerName = getPlayerName(homePlayerId, true);
            const awayPlayerName = getPlayerName(awayPlayerId, false);
            const isScored = isFrameScored(roundIndex, position);
            const isActive = isRoundActive;
            const winnerId = getFrameWinner(roundIndex, position);
            const homeWon = winnerId === homePlayerId;
            const awayWon = winnerId === awayPlayerId;
            const isBreaking = isHomeTeamBreaking(roundIndex, position);
            const frameStatus = getFrameStatus(roundIndex, position);
            const positionLetter = getPositionLetter(roundIndex, position);

            return (
              <FrameCard
                key={`frame-${roundIndex}-${position}`}
                roundIndex={roundIndex}
                position={position}
                homePlayerName={homePlayerName}
                awayPlayerName={awayPlayerName}
                positionLetter={positionLetter}
                isScored={isScored}
                isActive={isActive}
                frameStatus={frameStatus}
                homeWon={homeWon}
                awayWon={awayWon}
                isBreaking={isBreaking}
                isUserHomeTeamCaptain={isUserHomeTeamCaptain}
                onFrameClick={handleFrameClick}
                onResetFrame={handleResetFrame}
                cueBallImage={cueBallImage}
                cueBallDarkImage={cueBallDarkImage}
                onMouseEnter={() => setHoveredFrame({round: roundIndex, position})}
                onMouseLeave={() => setHoveredFrame(null)}
              />
            );
          })}
        </Box>
      </Paper>

      {/* Substitution Panel for Next Round */}
      {isRoundComplete && roundIndex + 1 < 4 && (
        <SubstitutionPanel
          roundIndex={roundIndex}
          match={match}
          getPlayerForRound={getPlayerForRound}
          getPlayerName={getPlayerName}
          isHomeTeamBreaking={isHomeTeamBreaking}
          isUserHomeTeamCaptain={isUserHomeTeamCaptain}
          isUserAwayTeamCaptain={isUserAwayTeamCaptain}
          homeTeamConfirmed={homeTeamConfirmed}
          awayTeamConfirmed={awayTeamConfirmed}
          handleHomeTeamConfirm={handleHomeTeamConfirm}
          handleAwayTeamConfirm={handleAwayTeamConfirm}
          handleHomeTeamEdit={handleHomeTeamEdit}
          handleAwayTeamEdit={handleAwayTeamEdit}
          error={error}
          cueBallImage={cueBallImage}
          cueBallDarkImage={cueBallDarkImage}
        />
      )}
    </Box>
  );
};

export default RoundDisplay; 