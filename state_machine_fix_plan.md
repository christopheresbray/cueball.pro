# State Machine Fix Plan: Single Source of Truth & Race Condition Resolution

## Problem Analysis

After analyzing the codebase, I've identified several critical issues causing race conditions and state inconsistencies:

### 1. Multiple Sources of Truth
- **Match.currentRound** (database field, 1-based)
- **GameFlowState.currentRound** (context state, mixed 0/1-based)
- **activeRound** (useMatchData hook, 1-based)
- **Round indices** (component logic, 0-based for arrays)

### 2. Race Conditions
- Real-time Firestore listeners update match data independently of game flow state
- Multiple hooks (`useMatchData`, `useGameFlowActions`) compete for state updates
- State transitions happen before database updates complete
- Component re-renders trigger cascading state changes

### 3. Index Confusion
- Inconsistent use of 0-based vs 1-based round numbering
- `roundIndex` used for arrays (0-based) vs `currentRound` for display (1-based)
- Database fields mix both conventions

## Solution: Unified State Architecture

### Phase 1: Establish Single Source of Truth

#### 1.1 Database as Primary Source
- **Match.currentRound** becomes the authoritative round number (1-based, rounds 1-4)
- **Match.roundLockedStatus** uses 0-based indices (rounds 0-3) for array access
- **Match.homeConfirmedRounds/awayConfirmedRounds** use 0-based indices

#### 1.2 Game Flow State Simplification
```typescript
interface GameFlowState {
  state: GameState;
  matchId: string | null;
  match: Match | null;  // Single source for all match data
  lineupHistory: { [round: number]: { homeLineup: string[], awayLineup: string[] } };
  isLoading: boolean;
  error: string | null;
  // REMOVE: currentRound, homeTeamConfirmed, awayTeamConfirmed (get from match)
}
```

#### 1.3 Computed Properties
```typescript
// All round-related data computed from match
const getCurrentRound = (match: Match | null): number => match?.currentRound ?? 1;
const getRoundIndex = (match: Match | null): number => getCurrentRound(match) - 1;
const isRoundLocked = (match: Match | null, roundIndex: number): boolean => 
  !!match?.roundLockedStatus?.[roundIndex];
```

### Phase 2: Eliminate Race Conditions

#### 2.1 Single Match Listener
- Remove duplicate Firestore listeners in `useMatchData` and `useGameFlowActions`
- Centralize all match updates through `GameFlowContext`
- Implement optimistic updates with rollback on failure

#### 2.2 Database Update Strategy
```typescript
// Pattern: Update database first, then rely on listener for state sync
const updateMatchWithOptimisticState = async (
  matchId: string, 
  updates: Partial<Match>,
  optimisticState?: Partial<GameFlowState>
) => {
  // 1. Apply optimistic state immediately
  if (optimisticState) {
    dispatch({ type: 'OPTIMISTIC_UPDATE', payload: optimisticState });
  }
  
  try {
    // 2. Update database
    await updateMatch(matchId, updates);
    // 3. Firestore listener will sync actual state
  } catch (error) {
    // 4. Rollback optimistic state on failure
    dispatch({ type: 'ROLLBACK_OPTIMISTIC', payload: { error } });
  }
};
```

#### 2.3 State Transition Guards
```typescript
// Prevent duplicate transitions
const canTransitionTo = (currentState: GameState, targetState: GameState): boolean => {
  if (currentState === targetState) return false;
  
  const validTransitions: Record<GameState, GameState[]> = {
    [GameState.SETUP]: [GameState.SCORING_ROUND],
    [GameState.SCORING_ROUND]: [GameState.ROUND_COMPLETED],
    [GameState.ROUND_COMPLETED]: [GameState.SUBSTITUTION_PHASE, GameState.MATCH_COMPLETED],
    [GameState.SUBSTITUTION_PHASE]: [GameState.AWAITING_CONFIRMATIONS, GameState.TRANSITIONING_TO_NEXT_ROUND],
    [GameState.AWAITING_CONFIRMATIONS]: [GameState.SUBSTITUTION_PHASE, GameState.TRANSITIONING_TO_NEXT_ROUND],
    [GameState.TRANSITIONING_TO_NEXT_ROUND]: [GameState.SCORING_ROUND],
    [GameState.MATCH_COMPLETED]: []
  };
  
  return validTransitions[currentState]?.includes(targetState) ?? false;
};
```

### Phase 3: Standardize Round Numbering

#### 3.1 Naming Conventions
```typescript
// Use consistent naming throughout codebase
type RoundNumber = number;  // 1-4 (user-facing, database storage)
type RoundIndex = number;   // 0-3 (array access, calculations)

// Conversion utilities
const roundToIndex = (round: RoundNumber): RoundIndex => round - 1;
const indexToRound = (index: RoundIndex): RoundNumber => index + 1;
```

#### 3.2 Database Schema Clarification
```typescript
interface Match {
  // Always 1-based (rounds 1, 2, 3, 4)
  currentRound: RoundNumber;
  
  // Always 0-based for array access (indices 0, 1, 2, 3)
  roundLockedStatus: { [index: RoundIndex]: boolean };
  homeConfirmedRounds: { [index: RoundIndex]: boolean };
  awayConfirmedRounds: { [index: RoundIndex]: boolean };
  
  // 1-based for logical grouping (rounds 1, 2, 3, 4)
  lineupHistory: { [round: RoundNumber]: LineupData };
}
```

## Implementation Steps

### Step 1: Create Centralized State Manager
```typescript
// src/context/MatchStateManager.ts
class MatchStateManager {
  private match: Match | null = null;
  private listeners: Set<(match: Match) => void> = new Set();
  
  getCurrentRound(): RoundNumber {
    return this.match?.currentRound ?? 1;
  }
  
  getCurrentRoundIndex(): RoundIndex {
    return this.getCurrentRound() - 1;
  }
  
  isRoundLocked(roundIndex: RoundIndex): boolean {
    return !!this.match?.roundLockedStatus?.[roundIndex];
  }
  
  canAdvanceRound(): boolean {
    const currentRoundIndex = this.getCurrentRoundIndex();
    return this.isRoundLocked(currentRoundIndex) && 
           this.getCurrentRound() < 4;
  }
  
  // ... other computed properties
}
```

### Step 2: Refactor GameFlowContext
- Remove redundant state fields
- Use MatchStateManager for all computations
- Implement optimistic updates with rollback

### Step 3: Update Components
- Replace `activeRound` with `match.currentRound`
- Use consistent round/index conversion utilities
- Remove duplicate state management hooks

### Step 4: Database Migrations
- Ensure all existing matches use consistent round numbering
- Add validation to prevent invalid round states

## Testing Strategy

### Unit Tests
- Test round number conversions
- Test state transition validations
- Test race condition scenarios

### Integration Tests
- Test multi-user scenarios with concurrent updates
- Test network failure and retry scenarios
- Test state machine transitions under load

### E2E Tests
- Full match flow with substitutions
- Captain confirmation workflows
- Match reset and restart scenarios

## Risk Mitigation

### Backward Compatibility
- Maintain support for existing match data
- Gradual migration of legacy state patterns
- Fallback mechanisms for edge cases

### Performance
- Minimize re-renders through proper memoization
- Debounce rapid state updates
- Optimize Firestore listener efficiency

### Monitoring
- Add logging for state transitions
- Track race condition occurrences
- Monitor database update patterns

## Success Metrics

1. **Consistency**: All components show same round state
2. **Reliability**: No race conditions in multi-user scenarios
3. **Performance**: Sub-100ms state update latency
4. **Maintainability**: Single source of truth for all round logic
5. **User Experience**: Smooth transitions without UI flicker

## Timeline

- **Week 1**: Implement MatchStateManager and core utilities
- **Week 2**: Refactor GameFlowContext and hooks
- **Week 3**: Update components and remove duplicate state
- **Week 4**: Testing, validation, and deployment

This plan addresses the core issues of multiple sources of truth and race conditions while establishing a robust, maintainable state management system for the match scoring functionality.