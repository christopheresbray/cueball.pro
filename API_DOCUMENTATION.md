# CueBall Pro API Documentation

## Table of Contents

1. [Database Service API](#database-service-api)
2. [React Hooks API](#react-hooks-api)
3. [Context Providers API](#context-providers-api)
4. [Components API](#components-api)
5. [Utility Functions API](#utility-functions-api)
6. [Data Models & Types](#data-models--types)
7. [Game State Management](#game-state-management)
8. [Usage Examples](#usage-examples)

---

## Database Service API

The `databaseService.ts` provides the core data access layer for CueBall Pro.

### Core Entity Operations

#### League Management

```typescript
// Get all leagues
getLeagues(): Promise<League[]>

// Create a new league
createDocument<League>('leagues', league): Promise<DocumentReference>
```

**Example:**
```typescript
import { getLeagues, createDocument } from '../services/databaseService';

// Get all leagues
const leagues = await getLeagues();

// Create new league
const newLeague = await createDocument('leagues', {
  name: 'Metro Pool League',
  description: 'Weekly 8-ball competition',
  adminIds: ['user123']
});
```

#### Season Management

```typescript
// Get seasons for a league
getSeasons(leagueId: string): Promise<Season[]>

// Get current active season
getCurrentSeason(): Promise<Season | null>

// Set a season as current
setCurrentSeason(seasonId: string): Promise<void>

// Create new season
createSeason(season: Season): Promise<DocumentReference>

// Check if season has played matches
seasonHasPlayedMatches(seasonId: string): Promise<boolean>

// Delete unplayed season
deleteUnplayedSeason(seasonId: string): Promise<boolean>
```

**Example:**
```typescript
// Get current season
const currentSeason = await getCurrentSeason();

// Create new season
const newSeason = await createSeason({
  leagueId: 'league123',
  name: 'Spring 2024',
  startDate: Timestamp.fromDate(new Date('2024-03-01')),
  endDate: Timestamp.fromDate(new Date('2024-06-01')),
  matchDay: 'Wednesday',
  status: 'active',
  teamIds: [],
  isCurrent: true
});
```

#### Team Management

```typescript
// Create team
createTeam(team: Team): Promise<DocumentReference>

// Get teams for season
getTeams(seasonId?: string): Promise<Team[]>

// Get specific team
getTeam(teamId: string): Promise<Team | null>

// Update team
updateTeam(teamId: string, data: Partial<Team>): Promise<void>

// Delete team
deleteTeam(teamId: string): Promise<void>

// Get team by player ID
getTeamByPlayerId(playerId: string): Promise<Team | null>
```

#### Player Management

```typescript
// Get players for a team
getPlayersForTeam(teamId: string, seasonId: string): Promise<Player[]>

// Get all players
getAllPlayers(): Promise<Player[]>

// Get players for season with team info
getPlayersForSeason(seasonId: string): Promise<PlayerWithTeam[]>

// Create player
createPlayer(player: Player): Promise<DocumentReference>

// Update player
updatePlayer(playerId: string, data: Partial<Player>): Promise<void>

// Add player to team
addPlayerToTeam(
  teamId: string,
  playerData: { firstName: string; lastName: string; email?: string; userId?: string },
  seasonId: string,
  role: 'player' | 'captain'
): Promise<string>

// Team captain management
assignTeamCaptain(teamId: string, userId: string, seasonId: string): Promise<void>
removeTeamCaptain(teamId: string, userId: string, seasonId: string): Promise<void>
isUserTeamCaptain(userId: string, teamId: string, seasonId: string): Promise<boolean>
```

#### Match Management

```typescript
// Get matches for season
getMatches(seasonId: string): Promise<Match[]>

// Get matches for team
getTeamMatches(teamId: string): Promise<Match[]>

// Get specific match
getMatch(matchId: string): Promise<Match | null>

// Create match
createMatch(match: Match): Promise<DocumentReference>

// Update match
updateMatch(matchId: string, data: Partial<Match>): Promise<void>

// Delete match
deleteMatch(matchId: string): Promise<void>

// Real-time match listener
onMatchSnapshot(matchId: string, callback: (match: Match | null) => void): () => void

// Initialize match frames
initializeMatchFrames(
  match: Match,
  homePlayers: string[],  // Player IDs for positions 1-4
  awayPlayers: string[]   // Player IDs for positions A-D
): Frame[]

// Start match with lineups
startMatch(
  matchId: string,
  homePlayers: string[], // 4 player IDs in positions 1-4
  awayPlayers: string[]  // 4 player IDs in positions A-D
): Promise<void>

// Update match frames
updateMatchFrames(
  matchId: string,
  updatedFrames: Frame[],
  options?: { reason?: string; performedBy?: string; extraData?: Partial<Match> }
): Promise<void>

// Update match participants
updateMatchParticipants(
  matchId: string,
  updatedParticipants: { homeTeam: string[]; awayTeam: string[] },
  options?: { reason?: string; performedBy?: string; extraData?: Partial<Match> }
): Promise<void>
```

#### Venue Management

```typescript
// Create venue
createVenue(venue: Venue): Promise<DocumentReference>

// Get all venues
getVenues(): Promise<Venue[]>

// Get specific venue
getVenue(venueId: string): Promise<Venue | null>

// Update venue
updateVenue(venueId: string, data: Partial<Venue>): Promise<void>

// Delete venue
deleteVenue(venueId: string): Promise<void>
```

### Utility Functions

```typescript
// Generic document operations
getDocumentById<T>(collectionName: string, docId: string): Promise<(T & { id: string }) | null>
getCollectionDocs<T>(collectionName: string, queryConstraints?: any[]): Promise<(T & { id: string })[]>
createDocument<T>(collectionName: string, data: WithFieldValue<T>): Promise<DocumentReference>
updateDocument<T>(collectionName: string, docId: string, data: Partial<WithFieldValue<T>>): Promise<void>
deleteDocument(collectionName: string, docId: string): Promise<void>

// Team player management
getTeamPlayersForSeason(seasonId: string): Promise<TeamPlayer[]>
cleanupDuplicateTeamPlayers(teamId?: string, seasonId?: string): Promise<number>

// Bulk operations
deleteUnplayedMatchesInSeason(seasonId: string): Promise<number>
deleteFramesForMatch(matchId: string): Promise<number>
```

---

## React Hooks API

### useMatchData

Manages match data loading and real-time updates.

```typescript
const useMatchData = (matchId: string | undefined, user: any, isAdmin: boolean) => {
  // Returns object with match data and methods
}
```

**Return Values:**
```typescript
{
  match: Match | null,
  setMatch: (match: Match | null) => void,
  homeTeam: Team | null,
  awayTeam: Team | null,
  venue: Venue | null,
  homePlayers: Player[],
  awayPlayers: Player[],
  homeCaptainUserId: string | null,
  awayCaptainUserId: string | null,
  userTeam: Team | null,
  isUserHomeTeamCaptain: boolean,
  isUserAwayTeamCaptain: boolean,
  loading: boolean,
  setLoading: (loading: boolean) => void,
  error: string,
  setError: (error: string) => void,
  activeRound: number,
  setActiveRound: (round: number) => void,
  completedRounds: number[],
  setCompletedRounds: (rounds: number[]) => void,
  getMatchScore: () => { home: number, away: number }
}
```

**Example:**
```typescript
import { useMatchData } from '../hooks/useMatchData';

function MatchComponent({ matchId }: { matchId: string }) {
  const { user } = useAuth();
  const {
    match,
    homeTeam,
    awayTeam,
    loading,
    error,
    getMatchScore
  } = useMatchData(matchId, user, false);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const score = getMatchScore();
  return (
    <div>
      <h1>{homeTeam?.name} vs {awayTeam?.name}</h1>
      <p>Score: {score.home} - {score.away}</p>
    </div>
  );
}
```

### useAuth

Manages user authentication state.

```typescript
const useAuth = () => {
  // Returns authentication state and methods
}
```

**Return Values:**
```typescript
{
  user: User | null,
  loading: boolean,
  signIn: (email: string, password: string) => Promise<void>,
  signUp: (email: string, password: string, displayName: string) => Promise<void>,
  signOut: () => Promise<void>,
  resetPassword: (email: string) => Promise<void>
}
```

### useFrameScoring

Manages frame scoring operations.

```typescript
const useFrameScoring = (match: Match | null, setMatch: (match: Match) => void) => {
  // Returns frame scoring state and methods
}
```

**Return Values:**
```typescript
{
  editingFrame: { round: number, position: number } | null,
  setEditingFrame: (frame: { round: number, position: number } | null) => void,
  scoreFrame: (roundIndex: number, position: number, winnerPlayerId: string) => Promise<void>,
  resetFrame: (roundIndex: number, position: number) => Promise<void>,
  isProcessing: boolean
}
```

### useSubstitutions

Manages player substitutions between rounds.

```typescript
const useSubstitutions = (
  match: Match | null,
  homePlayers: Player[],
  awayPlayers: Player[],
  userTeam: Team | null
) => {
  // Returns substitution state and methods
}
```

### useGameFlowActions

Manages game flow state transitions.

```typescript
const useGameFlowActions = (matchId: string | null) => {
  // Returns game flow actions
}
```

### useTeamConfirmation

Manages team lineup confirmations.

```typescript
const useTeamConfirmation = (
  match: Match | null,
  userTeam: Team | null,
  isAdmin: boolean
) => {
  // Returns confirmation state and methods
}
```

---

## Context Providers API

### GameFlowContext

Manages the overall game state machine for matches.

```typescript
interface GameFlowState {
  state: GameState;
  currentRound: number;
  matchId: string | null;
  match: Match | null;
  homeTeamConfirmed: { [round: number]: boolean };
  awayTeamConfirmed: { [round: number]: boolean };
  lineupHistory: { [round: number]: { homeLineup: string[], awayLineup: string[] } };
  isLoading: boolean;
  error: string | null;
}

// Game States
enum GameState {
  SETUP = 'setup',
  SCORING_ROUND = 'scoring_round',
  ROUND_COMPLETED = 'round_completed',
  SUBSTITUTION_PHASE = 'substitution_phase',
  AWAITING_CONFIRMATIONS = 'awaiting_confirmations',
  TRANSITIONING_TO_NEXT_ROUND = 'transitioning_to_next_round',
  MATCH_COMPLETED = 'match_completed'
}

// Game Events
enum GameEvent {
  START_MATCH = 'start_match',
  SCORE_FRAME = 'score_frame',
  COMPLETE_ROUND = 'complete_round',
  LOCK_ROUND = 'lock_round',
  MAKE_SUBSTITUTION = 'make_substitution',
  CONFIRM_HOME_LINEUP = 'confirm_home_lineup',
  CONFIRM_AWAY_LINEUP = 'confirm_away_lineup',
  EDIT_HOME_LINEUP = 'edit_home_lineup',
  EDIT_AWAY_LINEUP = 'edit_away_lineup',
  ADVANCE_ROUND = 'advance_round',
  RESET_GAME_FLOW = 'reset_game_flow'
}
```

**Usage:**
```typescript
import { useGameFlow, GameEvent } from '../context/GameFlowContext';

function GameComponent() {
  const { state, dispatch } = useGameFlow();

  const handleStartMatch = () => {
    dispatch({ type: GameEvent.START_MATCH });
  };

  const handleLockRound = (roundIndex: number) => {
    dispatch({ 
      type: GameEvent.LOCK_ROUND, 
      payload: { roundIndex } 
    });
  };

  return (
    <div>
      <p>Current State: {state.state}</p>
      {state.state === 'setup' && (
        <button onClick={handleStartMatch}>Start Match</button>
      )}
    </div>
  );
}
```

### AuthContext

Provides authentication state throughout the application.

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

### ToastContext

Provides toast notification functionality.

```typescript
interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}
```

---

## Components API

### Match Scoring Components

#### FrameCard

Displays and manages individual frame scoring.

```typescript
interface FrameCardProps {
  round: number;
  position: number;
  match: Match;
  homePlayers: Player[];
  awayPlayers: Player[];
  userTeam: Team | null;
  isUserHomeTeamCaptain: boolean;
  editingFrame: { round: number, position: number } | null;
  onFrameClick: (round: number, position: number) => void;
  onScoreFrame: (roundIndex: number, position: number, winnerPlayerId: string) => void;
  onResetFrame: (roundIndex: number, position: number) => void;
  activeRound: number;
  completedRounds: number[];
}
```

#### MatchHeader

Displays match information header.

```typescript
interface MatchHeaderProps {
  match: Match;
  homeTeam: Team | null;
  awayTeam: Team | null;
  venue: Venue | null;
  homeScore: number;
  awayScore: number;
}
```

#### RoundDisplay

Displays frames for a specific round.

```typescript
interface RoundDisplayProps {
  round: number;
  match: Match;
  homePlayers: Player[];
  awayPlayers: Player[];
  userTeam: Team | null;
  isUserHomeTeamCaptain: boolean;
  editingFrame: { round: number, position: number } | null;
  onFrameClick: (round: number, position: number) => void;
  onScoreFrame: (roundIndex: number, position: number, winnerPlayerId: string) => void;
  onResetFrame: (roundIndex: number, position: number) => void;
  activeRound: number;
  completedRounds: number[];
  isRoundLocked: boolean;
}
```

#### SubstitutionPanel

Manages player substitutions between rounds.

```typescript
interface SubstitutionPanelProps {
  match: Match;
  homePlayers: Player[];
  awayPlayers: Player[];
  userTeam: Team | null;
  isAdmin: boolean;
  currentRoundIndex: number;
}
```

### Lineup Components

#### LineupDialog

Modal for setting initial match lineups.

```typescript
interface LineupDialogProps {
  open: boolean;
  onClose: () => void;
  match: Match;
  homePlayers: Player[];
  awayPlayers: Player[];
  onSubmitLineups: (homeLineup: string[], awayLineup: string[]) => void;
  userTeam: Team | null;
  isUserHomeTeamCaptain: boolean;
  isUserAwayTeamCaptain: boolean;
}
```

#### LineupAssignmentPanel

Panel for assigning players to positions.

```typescript
interface LineupAssignmentPanelProps {
  players: Player[];
  positions: (string | null)[];
  onPlayerAssign: (position: number, playerId: string | null) => void;
  teamName: string;
  isEditable: boolean;
}
```

### Team Management Components

#### MatchDetails

Displays comprehensive match information.

```typescript
interface MatchDetailsProps {
  match: Match;
  homeTeam: Team | null;
  awayTeam: Team | null;
  venue: Venue | null;
}
```

#### PlayerSubstitution

Interface for making player substitutions.

```typescript
interface PlayerSubstitutionProps {
  availablePlayers: Player[];
  currentPlayerId: string;
  onSubstitute: (newPlayerId: string) => void;
  position: number;
  isHomeTeam: boolean;
}
```

### Admin Components

#### AdminActionCard

Card component for admin actions.

```typescript
interface AdminActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}
```

#### MenuCard

Reusable card component for navigation menus.

```typescript
interface MenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}
```

### Common Components

#### ProtectedRoute

Route wrapper that requires authentication.

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'captain' | 'player';
}
```

#### CaptainActionButton

Button component for captain-specific actions.

```typescript
interface CaptainActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}
```

---

## Utility Functions API

### Match Utilities (`matchUtils.ts`)

#### Score Calculation

```typescript
// Calculate match score from frames
calculateMatchScore(match: Match | null): { home: number, away: number }

// Check if frame is scored
isFrameScored(match: Match | null, roundIndex: number, position: number): boolean

// Get frame winner
getFrameWinner(match: Match | null, roundIndex: number, position: number): string | null

// Check if round is complete
isRoundComplete(match: Match | null, roundIndex: number): boolean
```

#### Round Management

```typescript
// Check if round is active
isRoundActive(activeRound: number, roundIndex: number): boolean

// Check if round can be played
isRoundPlayable(completedRounds: number[], roundIndex: number): boolean
```

#### Position and Matchup Logic

```typescript
// Determine who breaks
isHomeTeamBreaking(round: number, position: number): boolean

// Get opponent position for rotation
getOpponentPosition(round: number, position: number, isHome: boolean): number

// Get position letter for away team
getPositionLetter(roundIndex: number, position: number): string
```

#### Frame Status

```typescript
enum FrameStatus {
  COMPLETED = 'completed',
  EDITING = 'editing',
  ACTIVE = 'active',
  PENDING = 'pending'
}

// Get frame status
getFrameStatus(
  match: Match | null,
  round: number,
  position: number,
  activeRound: number,
  editingFrame: { round: number, position: number } | null
): FrameStatus

// Get frame status color
getFrameStatusColor(status: FrameStatus, theme: Theme): string

// Get frame tooltip text
getFrameTooltip(
  round: number,
  position: number,
  isScored: boolean,
  isActive: boolean,
  homePlayerName: string,
  awayPlayerName: string,
  isHomeTeamBreaking: boolean,
  winnerPlayerId: string | null,
  homePlayerId: string,
  isUserHomeTeamCaptain: boolean
): string
```

#### Player Management

```typescript
// Get all participating players
getAllParticipatingPlayers(match: Match, isHomeTeam: boolean): Set<string>
```

### Scheduling Utilities (`schedulingUtils.ts`)

Functions for match scheduling and calendar management.

### Debug Utilities (`debugHelper.ts`)

Development and debugging utility functions.

---

## Data Models & Types

### Core Interfaces

#### League
```typescript
interface League {
  id?: string;
  name: string;
  description?: string;
  adminIds: string[];
}
```

#### Season
```typescript
interface Season {
  id?: string;
  leagueId: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  matchDay: string;
  status: 'active' | 'completed' | 'scheduled';
  teamIds: string[];
  isCurrent: boolean;
}
```

#### Team
```typescript
interface Team {
  id?: string;
  name: string;
  homeVenueId: string;
  seasonId: string;
  captainUserId: string;
}
```

#### Player
```typescript
interface Player {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  userId?: string;
  teamIds?: string[];
  name?: string;
  joinDate: Timestamp;
  isActive: boolean;
  ignored?: boolean;
}
```

#### Match
```typescript
interface Match {
  id?: string;
  seasonId: string;
  divisionId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  fixtureId?: string;
  date: Timestamp;
  scheduledDate: Timestamp;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  homeTeamScore?: number;
  awayTeamScore?: number;
  completed?: boolean;
  submittedBy?: string;
  approvedBy?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  matchParticipants?: {
    homeTeam: string[];
    awayTeam: string[];
  };
  lineupHistory?: LineupHistory;
  currentRound?: number;
  roundLockedStatus?: { [roundIndex: number]: boolean };
  homeConfirmedRounds?: { [roundIndex: number]: boolean };
  awayConfirmedRounds?: { [roundIndex: number]: boolean };
  frames: Frame[];
  notes?: string;
  homeLineup: string[];
  awayLineup: string[];
  venueName?: string;
  matchDate: Date | Timestamp;
}
```

#### Frame
```typescript
interface Frame {
  frameId: string;
  matchId: string;
  round: number; // 1-4
  frameNumber: number; // 1-4 within round
  homePlayerPosition: number; // 1-4 (immutable)
  awayPlayerPosition: string; // 'A'-'D' (immutable)
  homePlayerId: string;
  awayPlayerId: string;
  winnerPlayerId?: string | null;
  seasonId: string;
  homeScore?: number;
  awayScore?: number;
  isComplete?: boolean;
  substitutionHistory?: Array<{
    timestamp: number;
    team: 'home' | 'away';
    position: number | string;
    oldPlayerId: string;
    newPlayerId: string;
    reason?: string;
    performedBy: string;
  }>;
}
```

#### Venue
```typescript
interface Venue {
  id?: string;
  name: string;
  address: string;
  contact: string;
}
```

#### TeamPlayer
```typescript
interface TeamPlayer {
  id?: string;
  teamId: string;
  playerId: string;
  seasonId: string;
  joinDate: Timestamp;
  role: 'player' | 'captain';
  isActive: boolean;
}
```

---

## Game State Management

### Game State Flow

The match progresses through these states:

1. **SETUP** - Initial state, lineups being set
2. **SCORING_ROUND** - Active round in progress
3. **ROUND_COMPLETED** - Round finished, waiting for lock
4. **SUBSTITUTION_PHASE** - Making substitutions for next round
5. **AWAITING_CONFIRMATIONS** - Waiting for both teams to confirm
6. **TRANSITIONING_TO_NEXT_ROUND** - Moving to next round
7. **MATCH_COMPLETED** - All rounds finished

### State Transitions

```typescript
// Start match from setup
dispatch({ type: GameEvent.START_MATCH });

// Complete current round
dispatch({ type: GameEvent.COMPLETE_ROUND });

// Lock round scores
dispatch({ 
  type: GameEvent.LOCK_ROUND, 
  payload: { roundIndex: 0 } 
});

// Make substitution
dispatch({
  type: GameEvent.MAKE_SUBSTITUTION,
  payload: {
    position: 0,
    isHomeTeam: true,
    playerId: 'player123',
    roundIndex: 1
  }
});

// Confirm lineup
dispatch({
  type: GameEvent.CONFIRM_HOME_LINEUP,
  payload: { roundIndex: 1 }
});
```

### Rules and Constraints

1. **Frame Position Immutability**: `homePlayerPosition` and `awayPlayerPosition` in Frame objects are set once during match initialization and never change.

2. **Substitution Rules**:
   - Only between rounds
   - Players must be in original match participants
   - Cannot substitute into multiple positions
   - Cannot substitute out and then back in different position

3. **Round Progression**:
   - Rounds must be completed sequentially
   - All frames in a round must be scored before locking
   - Both teams must confirm lineups before advancing

---

## Usage Examples

### Complete Match Workflow

```typescript
import React from 'react';
import { useMatchData } from '../hooks/useMatchData';
import { useGameFlow, GameEvent } from '../context/GameFlowContext';
import { useAuth } from '../hooks/useAuth';

function MatchScoringPage({ matchId }: { matchId: string }) {
  const { user } = useAuth();
  const { state, dispatch } = useGameFlow();
  const {
    match,
    homeTeam,
    awayTeam,
    homePlayers,
    awayPlayers,
    userTeam,
    isUserHomeTeamCaptain,
    loading,
    error,
    getMatchScore
  } = useMatchData(matchId, user, false);

  if (loading) return <div>Loading match...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!match) return <div>Match not found</div>;

  const handleStartMatch = () => {
    dispatch({ type: GameEvent.START_MATCH });
  };

  const handleScoreFrame = async (roundIndex: number, position: number, winnerPlayerId: string) => {
    // Implementation would call frame scoring hook
    console.log('Scoring frame:', { roundIndex, position, winnerPlayerId });
  };

  const score = getMatchScore();

  return (
    <div>
      <h1>{homeTeam?.name} vs {awayTeam?.name}</h1>
      <p>Score: {score.home} - {score.away}</p>
      <p>Current State: {state.state}</p>
      
      {state.state === 'setup' && (
        <button onClick={handleStartMatch}>
          Start Match
        </button>
      )}
      
      {state.state === 'scoring_round' && (
        <div>
          <h2>Round {state.currentRound}</h2>
          {/* Render frame components */}
        </div>
      )}
      
      {/* Additional state-specific UI */}
    </div>
  );
}
```

### Creating a New Season

```typescript
import { createSeason, getCurrentSeason, setCurrentSeason } from '../services/databaseService';
import { Timestamp } from 'firebase/firestore';

async function createNewSeason() {
  try {
    // Create the season
    const seasonRef = await createSeason({
      leagueId: 'league123',
      name: 'Fall 2024',
      startDate: Timestamp.fromDate(new Date('2024-09-01')),
      endDate: Timestamp.fromDate(new Date('2024-12-01')),
      matchDay: 'Thursday',
      status: 'scheduled',
      teamIds: [],
      isCurrent: false
    });

    console.log('Season created:', seasonRef.id);

    // Optionally set as current season
    await setCurrentSeason(seasonRef.id);
    console.log('Season set as current');

  } catch (error) {
    console.error('Error creating season:', error);
  }
}
```

### Team Registration Workflow

```typescript
import { 
  createTeam, 
  addPlayerToTeam, 
  assignTeamCaptain, 
  getCurrentSeason 
} from '../services/databaseService';

async function registerTeam() {
  try {
    const currentSeason = await getCurrentSeason();
    if (!currentSeason) throw new Error('No active season');

    // Create team
    const teamRef = await createTeam({
      name: 'The Breakers',
      homeVenueId: 'venue123',
      seasonId: currentSeason.id!,
      captainUserId: 'user123'
    });

    // Add players
    const captainPlayerId = await addPlayerToTeam(
      teamRef.id,
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        userId: 'user123'
      },
      currentSeason.id!,
      'captain'
    );

    const player2Id = await addPlayerToTeam(
      teamRef.id,
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com'
      },
      currentSeason.id!,
      'player'
    );

    console.log('Team registered successfully');

  } catch (error) {
    console.error('Error registering team:', error);
  }
}
```

### Real-time Match Updates

```typescript
import { onMatchSnapshot } from '../services/databaseService';

function useRealtimeMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = onMatchSnapshot(matchId, (updatedMatch) => {
      setMatch(updatedMatch);
      console.log('Match updated:', updatedMatch?.id);
    });

    return unsubscribe;
  }, [matchId]);

  return match;
}
```

---

This documentation covers all public APIs, components, and usage patterns in the CueBall Pro system. For specific implementation details, refer to the individual source files in the codebase.