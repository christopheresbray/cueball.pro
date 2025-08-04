// src/types/matchV2.ts
// Extended types for Match Scoring V2 with pre-match support

import { Timestamp } from 'firebase/firestore';
import { Match, Frame, Player, MatchFormat } from './match';

// ============================================================================
// PRE-MATCH TYPES
// ============================================================================

export interface PlayerAvailability {
  playerId: string;
  player: Player;
  isAvailable: boolean;
  isCaptain: boolean;
}

export interface PositionAssignment {
  position: string | number;
  playerId: string | 'vacant';
  player?: Player | null;
}

export interface TeamPreMatchState {
  rosterConfirmed: boolean;
  availablePlayers: string[];
  round1Assignments: Map<string | number, string>; // position -> playerId or 'vacant'
  lineupLocked: boolean;
}

export interface PreMatchState {
  home: TeamPreMatchState;
  away: TeamPreMatchState;
  canStartMatch: boolean;
}

// ============================================================================
// ROUND AND FRAME TYPES
// ============================================================================

export type RoundState = 
  | 'future'              // Not yet reached
  | 'substitution'        // Substitution phase active
  | 'current-unresulted'  // Active round, can score frames
  | 'locked';             // Round completed and locked

export interface Round {
  roundNumber: number;
  roundState: RoundState;
  frames: FrameWithPlayers[];
  // Team substitution states
  homeSubState: 'pending' | 'locked';
  awaySubState: 'pending' | 'locked';
  // Audit trail
  lockedAt?: Timestamp;
  lockedBy?: string;
}

export interface FrameTemplate {
  roundNumber: number;
  frameNumber: number;
  homePosition: string;    // A, B, C, D, AA, AB, etc.
  awayPosition: number;    // 1, 2, 3, 4, etc.
  breakerSide: 'home' | 'away';
}

export interface FrameWithPlayers extends Frame {
  homePlayer?: Player | null;
  awayPlayer?: Player | null;
  homePosition: string;
  awayPosition: number;
  isVacantFrame: boolean;  // true if either position is vacant
  // Ensure frameState is always defined (from base Frame interface)
  frameState: 'future' | 'unplayed' | 'resulted' | 'locked';
}

// ============================================================================
// MATCH SCORING STATE
// ============================================================================

export type MatchPhase = 
  | 'pre-match'    // Roster confirmation and initial lineup
  | 'ready'        // Ready to start match
  | 'in-progress'  // Match is being played
  | 'completed';   // Match finished

export interface MatchScoringState {
  // Core data
  match: Match | null;
  matchPhase: MatchPhase;
  rounds: Round[];
  frames: FrameWithPlayers[];
  players: Map<string, Player>;
  
  // Pre-match state
  preMatch: PreMatchState;
  
  // Current state
  currentRoundIndex: number;
  loading: boolean;
  error: string | null;
  
  // Modal states
  scoringFrame: FrameWithPlayers | null;
  editingFrame: FrameWithPlayers | null;
  substitutionFrame: FrameWithPlayers | null;
  
  // Permissions
  isHomeCaptain: boolean;
  isAwayCaptain: boolean;
  canEdit: boolean;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface PreMatchActions {
  togglePlayerAvailability: (team: 'home' | 'away', playerId: string) => Promise<void>;
  confirmRoster: (team: 'home' | 'away') => Promise<void>;
  assignPosition: (team: 'home' | 'away', position: string | number, playerId: string | 'vacant') => void;
  lockInitialLineup: (team: 'home' | 'away') => Promise<void>;
  unlockInitialLineup: (team: 'home' | 'away') => Promise<void>;
  startMatch: () => Promise<void>;
}

export interface MatchActions {
  scoreFrame: (frame: FrameWithPlayers, winnerId: string) => Promise<void>;
  editFrame: (frame: FrameWithPlayers | null) => void;
  resetFrame: (frame: FrameWithPlayers) => Promise<void>;
  makeSubstitution: (round: number, position: string | number, playerId: string) => Promise<void>;
  lockTeamLineup: (round: number, team: 'home' | 'away') => Promise<void>;
  lockRound: (round: number) => Promise<void>;
  // New round progression functions (per specifications)
  lockTeamSubstitutions: (team: 'home' | 'away', roundNumber: number) => Promise<void>;
  startRoundScoring: (roundNumber: number) => Promise<void>;
}

export interface MatchScoringActions extends PreMatchActions, MatchActions {
  refreshMatch: () => Promise<void>;
  setError: (error: string | null) => void;
  setDefaultAvailability: (team: 'home' | 'away', playerIds: string[]) => Promise<void>;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

export interface MatchScoringPageV2Props {
  matchId: string;
}

export interface PreMatchPanelProps {
  match: Match;
  homeTeamPlayers: Player[];
  awayTeamPlayers: Player[];
  isHomeCaptain: boolean;
  isAwayCaptain: boolean;
  preMatchState: PreMatchState;
  actions: PreMatchActions;
}

export interface RosterConfirmationProps {
  teamPlayers: Player[];
  teamSide: 'home' | 'away';
  teamName: string;
  isCaptain: boolean;
  isConfirmed: boolean;
  availablePlayers: Set<string>;
  onToggleAvailability: (playerId: string) => void;
  onConfirm: () => void;
}

export interface InitialLineupAssignmentProps {
  teamSide: 'home' | 'away';
  teamName: string;
  availablePlayers: Player[];
  positions: (string | number)[];
  assignments: Map<string | number, string>;
  isCaptain: boolean;
  isLocked: boolean;
  onAssignPosition: (position: string | number, playerId: string | 'vacant') => void;
  onLockLineup: () => void;
}

export interface RoundComponentProps {
  round: Round;
  frames: FrameWithPlayers[];
  isHomeCaptain: boolean;
  isAwayCaptain: boolean;
  actions: MatchActions;
}

export interface FrameComponentProps {
  frame: FrameWithPlayers;
  homePosition: string;
  awayPosition: number;
  isEditable: boolean;
  onScore: () => void;
  onEdit?: () => void;
  onSubstitute?: (position: 'home' | 'away') => void;
}

export interface SubstitutionPanelProps {
  frame: FrameWithPlayers;
  position: 'home' | 'away';
  eligiblePlayers: Player[];
  onSelect: (playerId: string) => void;
  onCancel: () => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PositionLabels {
  homePositions: string[];
  awayPositions: number[];
}

export interface MatchFormatHelper {
  format: MatchFormat;
  totalFrames: number;
  positionLabels: PositionLabels;
  generateFrameTemplates: () => FrameTemplate[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MATCH_PHASES: Record<MatchPhase, string> = {
  'pre-match': 'Pre-Match Setup',
  'ready': 'Ready to Start',
  'in-progress': 'Match in Progress',
  'completed': 'Match Completed'
};

export const ROUND_STATES: Record<RoundState, string> = {
  'future': 'Future',
  'substitution': 'Substitution Phase',
  'current-unresulted': 'Active',
  'locked': 'Completed'
};

export const COLORS = {
  primary: '#10B981',
  secondary: '#3B82F6',
  danger: '#EF4444',
  warning: '#F59E0B',
  
  // State colors
  future: '#E5E5E5',
  substitution: '#FFA500',
  active: '#000000',
  
  // Result colors
  winner: '#10B981',
  loser: '#EF4444',
  
  // Background
  background: '#F3F4F6',
  surface: '#FFFFFF',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF'
} as const; 

// New substitution list system
export interface SubstitutionListEntry {
  position: string | number; // A, B, C, D or 1, 2, 3, 4
  originalPlayer: string | null; // Player from previous round, null for round 1
  currentPlayer: string | null; // Current player in this position
  eligibleSubs: string[]; // Array of player IDs who can substitute in
}

export interface TeamSubstitutionList {
  entries: SubstitutionListEntry[];
}

export interface RoundSubstitutionState {
  home: TeamSubstitutionList;
  away: TeamSubstitutionList;
} 