import React, { useMemo } from 'react';
import { Grid, Paper, Typography } from '@mui/material';

// Import Frame type if available, otherwise define a minimal one here
type Frame = {
  frameId: string;
  round: number;
  frameNumber: number;
  homePlayerId: string;
  awayPlayerId: string;
  homePlayerPosition: number;
  awayPlayerPosition: string;
};

type LineupAssignmentPanelProps = {
  match: { frames: Record<string, Frame> } | null;
  roundIndex: number;
};

const LineupAssignmentPanel: React.FC<LineupAssignmentPanelProps> = ({ match, roundIndex }) => {
  // Instead of mapping by position, just filter and sort frames for this round
  const roundFrames = match?.frames
    ? Object.values(match.frames).filter((f: Frame) => f.round === roundIndex + 1).sort((a: Frame, b: Frame) => a.frameNumber - b.frameNumber)
    : [];

  const frameGrid = useMemo(() =>
    roundFrames.map((frame: Frame) => {
      // --- Get data directly from the frame --- 
      const homePlayerId = frame.homePlayerId;
      const awayPlayerId = frame.awayPlayerId;
      const fixedHomePosLabel = frame.homePlayerPosition.toString(); 
      const fixedAwayPosLabel = frame.awayPlayerPosition;
      const position = frame.frameNumber - 1;
      // Render your assignment UI here, e.g. dropdowns for player assignment, etc.
      return (
        <Grid item xs={12} sm={6} md={3} key={`frame-${frame.frameId}`}>
          <Paper sx={{ p: 1, mb: 1, bgcolor: '#222', color: '#fff' }}>
            <Typography variant="caption">
              Debug: Round {frame.round} Frame {frame.frameNumber} (ID: {frame.frameId})<br/>
              HomePos: {fixedHomePosLabel} AwayPos: {fixedAwayPosLabel}
            </Typography>
            {/* Render assignment controls here, e.g. player select for this frame/position */}
          </Paper>
        </Grid>
      );
    }),
    [roundFrames, roundIndex]
  );

  return (
    <Grid container spacing={2}>
      {frameGrid}
    </Grid>
  );
};

export default LineupAssignmentPanel; 