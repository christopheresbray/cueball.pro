// @jest-environment node
// Jest unit tests for CueBall Pro frame logic

import { initializeMatchFrames } from '../services/databaseService';
import type { Frame, Match } from '../types/match';

describe('CueBall Pro Frame Logic', () => {
  const mockMatch: Match = {
    id: 'match1',
    seasonId: 'season1',
    divisionId: 'div1',
    homeTeamId: 'home1',
    awayTeamId: 'away1',
    venueId: 'venue1',
    date: { seconds: 0, nanoseconds: 0 } as any,
    scheduledDate: { seconds: 0, nanoseconds: 0 } as any,
    status: 'scheduled',
    homeLineup: ['h1', 'h2', 'h3', 'h4'],
    awayLineup: ['a1', 'a2', 'a3', 'a4'],
    frames: [],
    matchDate: new Date(),
  };
  const homePlayers = ['h1', 'h2', 'h3', 'h4'];
  const awayPlayers = ['a1', 'a2', 'a3', 'a4'];

  it('should initialize 16 unique frames with correct positions and IDs', () => {
    const frames = initializeMatchFrames(mockMatch, homePlayers, awayPlayers);
    expect(frames).toHaveLength(16);
    // All frameIds should be unique
    const frameIds = new Set(frames.map(f => f.frameId));
    expect(frameIds.size).toBe(16);
    // All homePlayerPosition and awayPlayerPosition should be immutable and correct
    frames.forEach(frame => {
      expect([1, 2, 3, 4]).toContain(frame.homePlayerPosition);
      expect(['A', 'B', 'C', 'D']).toContain(frame.awayPlayerPosition);
    });
  });

  it('should only allow lineup submission for round 1', () => {
    // Simulate lineup submission for round 1
    const frames = initializeMatchFrames(mockMatch, homePlayers, awayPlayers);
    // Only round 1 frames should have player IDs set from lineup
    const round1 = frames.filter(f => f.round === 1);
    expect(round1.every(f => homePlayers.includes(f.homePlayerId))).toBe(true);
    expect(round1.every(f => awayPlayers.includes(f.awayPlayerId))).toBe(true);
  });

  it('should not mutate homePlayerPosition or awayPlayerPosition on substitution', () => {
    // Simulate a substitution for home position 2 in round 2+
    let frames = initializeMatchFrames(mockMatch, homePlayers, awayPlayers);
    // Mark round 1 frames as complete
    frames = frames.map(f => f.round === 1 ? { ...f, isComplete: true } : f);
    // Apply substitution (mock logic)
    const newPlayerId = 'h5';
    const position = 2; // home position 2
    const updatedFrames = frames.map(f => {
      if (!f.isComplete && f.homePlayerPosition === position) {
        return { ...f, homePlayerId: newPlayerId };
      }
      return f;
    });
    // No homePlayerPosition or awayPlayerPosition should change
    updatedFrames.forEach((f, i) => {
      expect(f.homePlayerPosition).toBe(frames[i].homePlayerPosition);
      expect(f.awayPlayerPosition).toBe(frames[i].awayPlayerPosition);
    });
  });

  it('should only update unplayed frames and append to substitutionHistory', () => {
    // Simulate a substitution for away position 3 in round 3+
    let frames = initializeMatchFrames(mockMatch, homePlayers, awayPlayers);
    // Mark rounds 1 and 2 as complete
    frames = frames.map(f => f.round <= 2 ? { ...f, isComplete: true } : f);
    // Apply substitution (mock logic)
    const newPlayerId = 'a5';
    const position = 3; // away position 'C' (A=1, B=2, C=3, D=4)
    const updatedFrames = frames.map(f => {
      if (!f.isComplete && (f.awayPlayerPosition.charCodeAt(0) - 64) === position) {
        return {
          ...f,
          awayPlayerId: newPlayerId,
          substitutionHistory: [
            ...(f.substitutionHistory || []),
            {
              timestamp: Date.now(),
              team: 'away',
              position: f.awayPlayerPosition,
              oldPlayerId: f.awayPlayerId,
              newPlayerId,
              reason: 'substitution',
              performedBy: 'user1',
            },
          ],
        };
      }
      return f;
    });
    // Only unplayed frames should be updated
    updatedFrames.forEach((f, i) => {
      if (f.round > 2 && (f.awayPlayerPosition.charCodeAt(0) - 64) === position) {
        expect(f.awayPlayerId).toBe(newPlayerId);
        expect(f.substitutionHistory?.length).toBe(1);
      } else {
        expect(f.awayPlayerId).toBe(frames[i].awayPlayerId);
      }
    });
  });
}); 