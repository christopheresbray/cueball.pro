// src/types/match.ts

import { Timestamp } from 'firebase/firestore';

// Match format configuration
export interface MatchFormat {
  roundsPerMatch: number; // e.g., 4 for 4-round matches
  framesPerRound: number; // e.g., 4 for 4 frames per round  
  positionsPerTeam: number; // e.g., 4 for 4v4 format
  name?: string; // e.g., "4v4 Standard", "2v2 Doubles"
}

// Match state enum for better state tracking
export type MatchState = 'pre-match' | 'ready' | 'in-progress' | 'completed' | 'cancelled';

// Frame state enum for granular frame tracking
export type FrameState = 'future' | 'unplayed' | 'resulted' | 'locked';

// Pre-match state management
export interface PreMatchState {
  homeRosterConfirmed: boolean;
  awayRosterConfirmed: boolean;
  homeAvailablePlayers: string[];
  awayAvailablePlayers: string[];
  homeRound1Assignments?: Record<string, string | 'vacant'>; // position -> playerId  
  awayRound1Assignments?: Record<number, string | 'vacant'>; // position -> playerId
  homeLineupLocked?: boolean;
  awayLineupLocked?: boolean;
  round1Assignments?: {
    home: Record<string, string | 'vacant'>; // position -> playerId
    away: Record<number, string | 'vacant'>; // position -> playerId
  };
}

// Audit entry for tracking changes
export interface AuditEntry {
  id?: string;
  timestamp: Timestamp;
  userId: string;
  action: string;
  changes: Record<string, any>;
  reason?: string;
}

// Frame interface for individual games within a match
export interface Frame {
  id?: string; // Alias for frameId for compatibility
  frameId: string; // Unique ID for this frame (immutable)
  matchId: string;
  round: number; // 1-4 (immutable)
  frameNumber: number; // 1-4 within the round (immutable)
  
  // FIXED: Position identifiers (immutable after match creation)
  homePosition: string;    // 'A', 'B', 'C', 'D' (immutable)
  awayPosition: number;    // 1, 2, 3, 4 (immutable)
  
  // Player assignments (mutable via substitutions)
  homePlayerId: string | 'vacant'; // Set at lineup, updated by substitution
  awayPlayerId: string | 'vacant'; // Set at lineup, updated by substitution
  
  winnerPlayerId?: string | null;
  seasonId: string;
  homeScore?: number;
  awayScore?: number;
  isComplete?: boolean;
  
  // NEW: Enhanced frame tracking
  state?: FrameState;
  breakerSide?: 'home' | 'away';
  
  // Audit fields
  scoredAt?: Timestamp;
  scoredBy?: string;
  lastEditedAt?: Timestamp;
  lastEditedBy?: string;
  
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

  // NEW: Match format and state management
  format?: MatchFormat;
  state?: MatchState;
  preMatchState?: PreMatchState;
  version?: number; // For migration tracking

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