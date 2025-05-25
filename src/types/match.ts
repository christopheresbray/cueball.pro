// src/types/match.ts

import { Timestamp } from 'firebase/firestore';

// Frame interface for individual games within a match
export interface Frame {
  frameId: string; // Unique ID for this frame (immutable)
  matchId: string;
  round: number; // 1-4 (immutable)
  frameNumber: number; // 1-4 within the round (immutable)
  homePlayerPosition: number; // 1-4 (immutable, set at match creation)
  awayPlayerPosition: string; // 'A'-'D' (immutable, set at match creation)
  homePlayerId: string; // Set at lineup, updated only by substitution
  awayPlayerId: string; // Set at lineup, updated only by substitution
  winnerPlayerId?: string | null;
  seasonId: string;
  homeScore?: number;
  awayScore?: number;
  isComplete?: boolean;
  // Optional audit trail for substitutions
  substitutionHistory?: Array<{
    timestamp: number;
    team: 'home' | 'away';
    position: number | string;
    oldPlayerId: string;
    newPlayerId: string;
    reason?: string;
    performedBy: string; // userId
  }>;
}

// Player interface
export interface Player {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  userId?: string;
  teamIds?: string[];
  name?: string; // Computed property
  joinDate: Timestamp;
  isActive: boolean;
  ignored?: boolean;
}

// Team interface
export interface Team {
  id?: string;
  name: string;
  homeVenueId: string;
  seasonId: string;
  captainUserId: string;
}

// Type for storing lineup history per round
export interface LineupHistory {
  [roundNumber: number]: {
    homeLineup: string[];
    awayLineup: string[];
  };
}

// Interface for Match data coming from Firebase
export interface Match {
  // Core identifiers
  id?: string;
  seasonId: string;
  divisionId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  fixtureId?: string;

  // Dates and scheduling
  date: Timestamp;
  scheduledDate: Timestamp;

  // Match status and scores
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  homeTeamScore?: number;
  awayTeamScore?: number;
  completed?: boolean;
  submittedBy?: string;
  approvedBy?: string;

  // Team names (populated by join operations)
  homeTeamName?: string;
  awayTeamName?: string;

  // Match participants and lineups
  matchParticipants?: {
    homeTeam: string[]; // Array of player IDs for home team
    awayTeam: string[]; // Array of player IDs for away team
  };
  lineupHistory?: LineupHistory;

  // Round management
  currentRound?: number;
  roundLockedStatus?: { [roundIndex: number]: boolean };
  homeConfirmedRounds?: { [roundIndex: number]: boolean };
  awayConfirmedRounds?: { [roundIndex: number]: boolean };

  // Frames (individual games)
  frames: Frame[]; // Flat array of all frames (16 for 4x4)

  // Optional metadata
  notes?: string;

  // New fields
  homeLineup: string[];
  awayLineup: string[];
  venueName?: string;
  matchDate: Date | Timestamp;
}