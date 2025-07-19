# CueBall Pro Match System V2

## 🎯 Overview

The CueBall Pro Match System V2 is a comprehensive upgrade that addresses critical limitations of the original system:

- ✅ **Configurable Match Formats** - Support for 2v2, 4v4, 8v8, and custom formats
- ✅ **Enhanced State Management** - Granular tracking of match and frame states
- ✅ **Pre-Match Roster Management** - Player availability confirmation and planning
- ✅ **Sub-Collection Architecture** - Improved performance and scalability
- ✅ **Comprehensive Audit Trail** - Track all changes with detailed logging
- ✅ **Type Safety Improvements** - Better TypeScript support throughout
- ✅ **Migration Tools** - Seamless upgrade from V1 to V2

## 🔧 Key Improvements

### 1. **Configurable Match Formats**

**Problem:** Hard-coded 4v4 format couldn't support different league types.

**Solution:** Flexible format configuration:

```typescript
interface MatchFormat {
  roundsPerMatch: number;     // e.g., 4 for standard matches
  framesPerRound: number;     // e.g., 4 frames per round
  positionsPerTeam: number;   // e.g., 4 players per team
  name?: string;              // e.g., "4v4 Standard"
}

// Pre-defined formats
const formats = {
  '4v4_standard': { roundsPerMatch: 4, framesPerRound: 4, positionsPerTeam: 4 },
  '2v2_doubles': { roundsPerMatch: 4, framesPerRound: 2, positionsPerTeam: 2 },
  '8v8_large': { roundsPerMatch: 4, framesPerRound: 8, positionsPerTeam: 8 }
};
```

### 2. **Enhanced Frame Structure**

**Problem:** Type inconsistencies and missing state tracking.

**Solution:** Improved Frame interface:

```typescript
interface Frame {
  // Immutable identifiers (set at match creation)
  homePosition: string;       // 'A', 'B', 'C', 'D' (FIXED)
  awayPosition: number;       // 1, 2, 3, 4 (FIXED)
  
  // Mutable assignments (updated by substitutions)
  homePlayerId: string | 'vacant';
  awayPlayerId: string | 'vacant';
  
  // Enhanced state tracking
  state: 'future' | 'unplayed' | 'resulted' | 'locked';
  breakerSide: 'home' | 'away';
  
  // Audit fields
  scoredAt?: Timestamp;
  scoredBy?: string;
  lastEditedAt?: Timestamp;
  lastEditedBy?: string;
}
```

### 3. **Pre-Match State Management**

**Problem:** No way to manage player availability or roster confirmation.

**Solution:** Pre-match workflow:

```typescript
interface PreMatchState {
  homeRosterConfirmed: boolean;
  awayRosterConfirmed: boolean;
  homeAvailablePlayers: string[];
  awayAvailablePlayers: string[];
  round1Assignments?: {
    home: Record<string, string | 'vacant'>;
    away: Record<number, string | 'vacant'>;
  };
}
```

### 4. **Sub-Collection Architecture**

**Problem:** Large arrays in documents causing performance issues.

**Solution:** Sub-collections for scalability:

```
matches/{matchId}/
  ├── frames/{frameId}      - Individual frame documents
  ├── rounds/{roundId}      - Round state tracking
  └── audit/{auditId}       - Change audit trail
```

## 📚 Usage Guide

### Creating a Match with Custom Format

```typescript
import { createMatch, MATCH_FORMATS } from '../services/databaseService';

const match: Match = {
  // ... standard match fields
  format: MATCH_FORMATS['2v2_doubles'],  // Use pre-defined format
  state: 'pre-match',
  preMatchState: {
    homeRosterConfirmed: false,
    awayRosterConfirmed: false,
    homeAvailablePlayers: [],
    awayAvailablePlayers: []
  },
  version: 2
};

await createMatch(match);
```

### Confirming Team Rosters

```typescript
import { confirmTeamRoster } from '../services/databaseService';

// Home team confirms their roster
await confirmTeamRoster(
  matchId, 
  'home', 
  ['player1', 'player2', 'player3', 'player4'],
  currentUserId
);

// System automatically transitions to 'ready' when both teams confirm
```

### Starting a Match with Custom Format

```typescript
import { startMatch, initializeMatchFrames } from '../services/databaseService';

// The system now automatically supports the match's configured format
await startMatch(
  matchId,
  ['homePlayer1', 'homePlayer2', 'homePlayer3', 'homePlayer4'],
  ['awayPlayer1', 'awayPlayer2', 'awayPlayer3', 'awayPlayer4']
);
```

### Working with Sub-Collections

```typescript
import { 
  createFrame, 
  getMatchFrames, 
  updateFrameWithAudit 
} from '../services/databaseService';

// Create frame in sub-collection
const frameId = await createFrame(matchId, frame);

// Get all frames from sub-collection
const frames = await getMatchFrames(matchId);

// Update frame with audit trail
await updateFrameWithAudit(
  matchId, 
  frameId, 
  { winnerPlayerId: 'player123' },
  currentUserId,
  'frame_scored'
);
```

### Using Match Format Utilities

```typescript
import { MatchFormatUtils } from '../utils/matchUtils';

// Check if match is complete
const isComplete = MatchFormatUtils.isMatchComplete(frames, format);

// Calculate scores
const score = MatchFormatUtils.calculateMatchScore(frames);

// Get next round to play
const nextRound = MatchFormatUtils.getNextRound(frames, format);

// Validate frame structure
const errors = MatchFormatUtils.validateFrameStructure(frames, format);
```

## 🔄 Migration Guide

### Running the Migration

```bash
# Migrate all matches
npm run migrate:matches-v2

# Migrate specific season
npm run migrate:matches-v2 --season=season123

# Dry run (no changes)
npm run migrate:matches-v2 --dry-run

# Validate after migration
npm run migrate:matches-v2 --validate
```

### Migration Script Usage

```typescript
import { migrateMatchToV2, validateMigration } from '../scripts/migrate-matches-v2';

// Migrate single match
await migrateMatchToV2(matchId);

// Validate migration results
await validateMigration(seasonId);
```

### What the Migration Does

1. **Adds new fields:** `format`, `state`, `preMatchState`, `version`
2. **Infers format:** From existing frame structure or defaults to 4v4
3. **Sets appropriate state:** Based on current match status
4. **Migrates frames:** To sub-collection if they exist
5. **Fixes property names:** Updates old field names to new structure
6. **Adds audit capability:** Prepares for enhanced tracking

## 🏗️ Architecture Changes

### Database Structure

**Before (V1):**
```
matches/{matchId}
  ├── frames: Frame[]     // Large array in document
  ├── status: string
  └── currentRound: number
```

**After (V2):**
```
matches/{matchId}
  ├── format: MatchFormat
  ├── state: MatchState
  ├── preMatchState: PreMatchState
  ├── version: 2
  └── frames: []          // Empty after migration

matches/{matchId}/frames/{frameId}
  └── Frame with enhanced structure

matches/{matchId}/audit/{auditId}
  └── AuditEntry for change tracking
```

### Service Layer Changes

**Centralized Updates:**
- All frame updates go through `updateMatchFrames()`
- All participant updates go through `updateMatchParticipants()`
- Automatic audit logging for all changes

**Enhanced Type Safety:**
- `QueryConstraint[]` instead of `any[]`
- Proper typing for all service functions
- Comprehensive error handling

## 🎮 Frontend Integration

### Using New State Management

```typescript
// Check match state before showing UI
const canScore = match.state === 'in-progress' && 
                frame.state === 'unplayed';

// Show appropriate buttons based on state
{match.state === 'pre-match' && (
  <RosterConfirmationPanel />
)}

{match.state === 'ready' && (
  <StartMatchButton />
)}

{match.state === 'in-progress' && (
  <MatchScoringInterface />
)}
```

### Format-Aware UI

```typescript
// Generate position labels based on format
const positions = generatePositions(match.format.positionsPerTeam);

// Render frames dynamically
{Array.from({ length: format.framesPerRound }, (_, i) => (
  <FrameCard 
    key={i}
    round={currentRound}
    position={positions.home[i]}
    format={match.format}
  />
))}
```

## 🚀 Performance Benefits

### Before V2:
- ❌ 16 frames stored in single document (16KB)
- ❌ Entire frames array rewritten on each update
- ❌ No query optimization for frame-specific operations
- ❌ No granular change tracking

### After V2:
- ✅ Frames stored in sub-collection (~1KB each)
- ✅ Individual frame updates (much faster)
- ✅ Efficient queries by round, player, etc.
- ✅ Comprehensive audit trail with minimal overhead
- ✅ Better caching and real-time sync

## 🔒 Backward Compatibility

The V2 system maintains backward compatibility:

- **Existing matches:** Continue to work until migrated
- **API compatibility:** All existing functions still work
- **Gradual migration:** Can migrate matches individually
- **Rollback capability:** V1 data preserved during migration

## 🧪 Testing

### Unit Tests

```typescript
import { validateFrameStructure, isMatchComplete } from '../utils/matchUtils';

describe('Match Format Utils', () => {
  test('validates 4v4 frame structure', () => {
    const errors = validateFrameStructure(frames, MATCH_FORMATS['4v4_standard']);
    expect(errors).toHaveLength(0);
  });

  test('detects match completion', () => {
    const complete = isMatchComplete(allScoredFrames, format);
    expect(complete).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Match Migration', () => {
  test('migrates V1 match to V2', async () => {
    await migrateMatchToV2(testMatchId);
    const match = await getMatch(testMatchId);
    
    expect(match.version).toBe(2);
    expect(match.format).toBeDefined();
    expect(match.state).toBeDefined();
  });
});
```

## 📈 Future Enhancements

The V2 system enables future features:

- **Custom Format Builder:** UI for creating league-specific formats
- **Advanced Statistics:** Player performance across different formats
- **Match Simulation:** Predict outcomes based on historical data
- **Real-time Collaboration:** Multiple scorers with conflict resolution
- **Mobile Optimization:** Offline scoring with sync
- **Tournament Brackets:** Multi-match competition support

## 🎉 Summary

The V2 Match System represents a complete modernization of CueBall Pro's core functionality:

- **Flexible:** Supports any match format your league needs
- **Scalable:** Sub-collection architecture grows with your data
- **Reliable:** Comprehensive audit trail and state management
- **Fast:** Optimized queries and minimal data transfer
- **Future-proof:** Extensible architecture for new features

The migration is seamless and can be done gradually, ensuring no disruption to ongoing matches while unlocking powerful new capabilities for your pool league management. 