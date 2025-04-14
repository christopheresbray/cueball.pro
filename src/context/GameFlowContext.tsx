import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { Match, updateMatch } from '../services/databaseService';
import { isRoundComplete } from '../utils/matchUtils';

// Define game state types
export enum GameState {
  SETUP = 'setup',
  SCORING_ROUND = 'scoring_round',
  ROUND_COMPLETED = 'round_completed',
  SUBSTITUTION_PHASE = 'substitution_phase',
  AWAITING_CONFIRMATIONS = 'awaiting_confirmations',
  TRANSITIONING_TO_NEXT_ROUND = 'transitioning_to_next_round',
}

// Define all possible events that can happen
export enum GameEvent {
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
  RESET_GAME_FLOW = 'reset_game_flow',
}

// State context with additional information
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

// Define the action types for reducer
type GameFlowAction = 
  | { type: GameEvent.START_MATCH }
  | { type: GameEvent.SCORE_FRAME }
  | { type: GameEvent.COMPLETE_ROUND }
  | { type: GameEvent.LOCK_ROUND; payload: { roundIndex: number } }
  | { type: GameEvent.MAKE_SUBSTITUTION; payload: { position: number, isHomeTeam: boolean, playerId: string, roundIndex: number } }
  | { type: GameEvent.CONFIRM_HOME_LINEUP; payload: { roundIndex: number } }
  | { type: GameEvent.CONFIRM_AWAY_LINEUP; payload: { roundIndex: number } }
  | { type: GameEvent.EDIT_HOME_LINEUP; payload: { roundIndex: number } }
  | { type: GameEvent.EDIT_AWAY_LINEUP; payload: { roundIndex: number } }
  | { type: GameEvent.ADVANCE_ROUND; payload: { roundIndex: number } }
  | { type: GameEvent.RESET_GAME_FLOW }
  | { type: 'SET_MATCH'; payload: { match: Match, skipIfUnchanged?: boolean } }
  | { type: 'SET_ERROR'; payload: { error: string | null } };

// Create the GameFlow context
export const GameFlowContext = createContext<{
  state: GameFlowState;
  dispatch: React.Dispatch<GameFlowAction>;
  canSubstitute: (position: number, isHomeTeam: boolean, playerId: string, roundIndex: number) => boolean;
  isRoundLocked: (roundIndex: number) => boolean;
} | undefined>(undefined);

// Initial game state
const initialState: GameFlowState = {
  state: GameState.SETUP,
  currentRound: 0,
  matchId: null,
  match: null,
  homeTeamConfirmed: {},
  awayTeamConfirmed: {},
  lineupHistory: {},
  isLoading: false,
  error: null,
};

// Define the state machine transitions
const gameFlowReducer = (state: GameFlowState, action: GameFlowAction): GameFlowState => {
  // Only log significant state changes, not every render
  if (action.type !== 'SET_MATCH') {
    console.log('GameFlow reducer:', { currentState: state.state, action: action.type });
  }
  
  // First handle the SET_MATCH action with skipIfUnchanged flag
  if (action.type === 'SET_MATCH') {
    // Check if we should skip update when match hasn't changed
    if (action.payload.skipIfUnchanged && state.match) {
      // Strict comparison to prevent unnecessary re-renders
      if (JSON.stringify(state.match) === JSON.stringify(action.payload.match)) {
        return state; // Return the exact same state reference to prevent re-renders
      }
    }
  }
  
  switch (state.state) {
    case GameState.SETUP:
      if (action.type === GameEvent.START_MATCH) {
        return {
          ...state,
          state: GameState.SCORING_ROUND,
          currentRound: 1,
          isLoading: false,
        };
      } else if (action.type === 'SET_MATCH') {
        const match = action.payload.match;
        const newState = {
          ...state,
          match,
          matchId: match.id || null,
          currentRound: match.currentRound || 1,
        };
        
        // If match is already in progress, update the state accordingly
        if (match.status === 'in_progress') {
          newState.state = GameState.SCORING_ROUND;
          
          // Check if current round is complete but not locked
          const currentRoundIndex = (match.currentRound || 1) - 1;
          if (isRoundComplete(match, currentRoundIndex) && !match.roundLockedStatus?.[currentRoundIndex]) {
            newState.state = GameState.ROUND_COMPLETED;
          }
          
          // Check if round is locked and waiting for confirmations
          if (match.roundLockedStatus?.[currentRoundIndex]) {
            const homeConfirmed = !!match.homeConfirmedRounds?.[currentRoundIndex];
            const awayConfirmed = !!match.awayConfirmedRounds?.[currentRoundIndex];
            
            if (!homeConfirmed || !awayConfirmed) {
              newState.state = GameState.SUBSTITUTION_PHASE;
            } else {
              newState.state = GameState.TRANSITIONING_TO_NEXT_ROUND;
            }
          }
        }
        
        // Update confirmation states
        if (match.homeConfirmedRounds) {
          newState.homeTeamConfirmed = {...match.homeConfirmedRounds};
        }
        if (match.awayConfirmedRounds) {
          newState.awayTeamConfirmed = {...match.awayConfirmedRounds};
        }
        
        return newState;
      }
      break;
    
    case GameState.SCORING_ROUND:
      if (action.type === GameEvent.COMPLETE_ROUND) {
        return {
          ...state,
          state: GameState.ROUND_COMPLETED,
        };
      } else if (action.type === 'SET_MATCH') {
        const match = action.payload.match;
        const currentRoundIndex = (match.currentRound || 1) - 1;
        
        // Check if round is now complete
        if (isRoundComplete(match, currentRoundIndex)) {
          return {
            ...state,
            match,
            state: GameState.ROUND_COMPLETED,
          };
        }
        
        return {
          ...state,
          match,
        };
      }
      break;
    
    case GameState.ROUND_COMPLETED:
      if (action.type === GameEvent.LOCK_ROUND) {
        return {
          ...state,
          state: GameState.SUBSTITUTION_PHASE,
          isLoading: false,
        };
      } else if (action.type === 'SET_MATCH') {
        const match = action.payload.match;
        const currentRoundIndex = (match.currentRound || 1) - 1;
        
        // Check if round is now locked
        if (match.roundLockedStatus?.[currentRoundIndex]) {
          return {
            ...state,
            match,
            state: GameState.SUBSTITUTION_PHASE,
          };
        }
        
        return {
          ...state,
          match,
        };
      }
      break;
    
    case GameState.SUBSTITUTION_PHASE:
      if (action.type === GameEvent.MAKE_SUBSTITUTION) {
        // Update local lineup history for this round
        const { position, isHomeTeam, playerId, roundIndex } = action.payload;
        const nextRound = roundIndex + 2;
        
        const newLineupHistory = { ...state.lineupHistory };
        
        // Initialize if needed
        if (!newLineupHistory[nextRound]) {
          // Find the last lineup to use as a base
          let lastLineupRound = nextRound - 1;
          let baseHomeLineup = state.match?.homeLineup?.slice(0, 4) || [];
          let baseAwayLineup = state.match?.awayLineup?.slice(0, 4) || [];
          
          while (lastLineupRound >= 1) {
            if (newLineupHistory[lastLineupRound]) {
              baseHomeLineup = [...newLineupHistory[lastLineupRound].homeLineup];
              baseAwayLineup = [...newLineupHistory[lastLineupRound].awayLineup];
              break;
            }
            lastLineupRound--;
          }
          
          newLineupHistory[nextRound] = {
            homeLineup: [...baseHomeLineup],
            awayLineup: [...baseAwayLineup],
          };
        }
        
        // Apply the substitution
        if (isHomeTeam) {
          newLineupHistory[nextRound].homeLineup[position] = playerId;
        } else {
          newLineupHistory[nextRound].awayLineup[position] = playerId;
        }
        
        return {
          ...state,
          lineupHistory: newLineupHistory,
        };
      } else if (action.type === GameEvent.CONFIRM_HOME_LINEUP) {
        const { roundIndex } = action.payload;
        const newHomeTeamConfirmed = { ...state.homeTeamConfirmed, [roundIndex]: true };
        
        // Check if both teams have confirmed
        if (state.awayTeamConfirmed[roundIndex]) {
          return {
            ...state,
            homeTeamConfirmed: newHomeTeamConfirmed,
            state: GameState.TRANSITIONING_TO_NEXT_ROUND,
            isLoading: true,
          };
        }
        
        return {
          ...state,
          homeTeamConfirmed: newHomeTeamConfirmed,
          state: GameState.AWAITING_CONFIRMATIONS,
        };
      } else if (action.type === GameEvent.CONFIRM_AWAY_LINEUP) {
        const { roundIndex } = action.payload;
        const newAwayTeamConfirmed = { ...state.awayTeamConfirmed, [roundIndex]: true };
        
        // Check if both teams have confirmed
        if (state.homeTeamConfirmed[roundIndex]) {
          return {
            ...state,
            awayTeamConfirmed: newAwayTeamConfirmed,
            state: GameState.TRANSITIONING_TO_NEXT_ROUND,
            isLoading: true,
          };
        }
        
        return {
          ...state,
          awayTeamConfirmed: newAwayTeamConfirmed,
          state: GameState.AWAITING_CONFIRMATIONS,
        };
      } else if (action.type === GameEvent.EDIT_HOME_LINEUP) {
        // Added explicit logging for state change
        console.log("EDIT_HOME_LINEUP event in SUBSTITUTION_PHASE state", action.payload);
        const { roundIndex } = action.payload;
        return {
          ...state,
          homeTeamConfirmed: { ...state.homeTeamConfirmed, [roundIndex]: false },
          // Stay in SUBSTITUTION_PHASE
          state: GameState.SUBSTITUTION_PHASE,
        };
      } else if (action.type === GameEvent.EDIT_AWAY_LINEUP) {
        // Added explicit logging for state change
        console.log("EDIT_AWAY_LINEUP event in SUBSTITUTION_PHASE state", action.payload);
        const { roundIndex } = action.payload;
        return {
          ...state,
          awayTeamConfirmed: { ...state.awayTeamConfirmed, [roundIndex]: false },
          // Stay in SUBSTITUTION_PHASE
          state: GameState.SUBSTITUTION_PHASE,
        };
      } else if (action.type === 'SET_MATCH') {
        const match = action.payload.match;
        const currentRoundIndex = (match.currentRound || 1) - 1;
        
        // Update team confirmations
        const homeConfirmed = !!match.homeConfirmedRounds?.[currentRoundIndex];
        const awayConfirmed = !!match.awayConfirmedRounds?.[currentRoundIndex];
        
        // If both teams have confirmed, transition to next round
        if (homeConfirmed && awayConfirmed) {
          return {
            ...state,
            match,
            homeTeamConfirmed: { ...state.homeTeamConfirmed, [currentRoundIndex]: true },
            awayTeamConfirmed: { ...state.awayTeamConfirmed, [currentRoundIndex]: true },
            state: GameState.TRANSITIONING_TO_NEXT_ROUND,
          };
        }
        
        return {
          ...state,
          match,
          homeTeamConfirmed: { ...state.homeTeamConfirmed, [currentRoundIndex]: homeConfirmed },
          awayTeamConfirmed: { ...state.awayTeamConfirmed, [currentRoundIndex]: awayConfirmed },
        };
      }
      break;
    
    case GameState.AWAITING_CONFIRMATIONS:
      if (action.type === GameEvent.EDIT_HOME_LINEUP) {
        const { roundIndex } = action.payload;
        return {
          ...state,
          homeTeamConfirmed: { ...state.homeTeamConfirmed, [roundIndex]: false },
          state: GameState.SUBSTITUTION_PHASE,
        };
      } else if (action.type === GameEvent.EDIT_AWAY_LINEUP) {
        const { roundIndex } = action.payload;
        return {
          ...state,
          awayTeamConfirmed: { ...state.awayTeamConfirmed, [roundIndex]: false },
          state: GameState.SUBSTITUTION_PHASE,
        };
      } else if (action.type === GameEvent.CONFIRM_HOME_LINEUP && state.awayTeamConfirmed[action.payload.roundIndex]) {
        return {
          ...state,
          homeTeamConfirmed: { ...state.homeTeamConfirmed, [action.payload.roundIndex]: true },
          state: GameState.TRANSITIONING_TO_NEXT_ROUND,
          isLoading: true,
        };
      } else if (action.type === GameEvent.CONFIRM_AWAY_LINEUP && state.homeTeamConfirmed[action.payload.roundIndex]) {
        return {
          ...state,
          awayTeamConfirmed: { ...state.awayTeamConfirmed, [action.payload.roundIndex]: true },
          state: GameState.TRANSITIONING_TO_NEXT_ROUND,
          isLoading: true,
        };
      } else if (action.type === 'SET_MATCH') {
        const match = action.payload.match;
        const currentRoundIndex = (match.currentRound || 1) - 1;
        
        // Update team confirmations
        const homeConfirmed = !!match.homeConfirmedRounds?.[currentRoundIndex];
        const awayConfirmed = !!match.awayConfirmedRounds?.[currentRoundIndex];
        
        // If both teams have confirmed, transition to next round
        if (homeConfirmed && awayConfirmed) {
          return {
            ...state,
            match,
            homeTeamConfirmed: { ...state.homeTeamConfirmed, [currentRoundIndex]: true },
            awayTeamConfirmed: { ...state.awayTeamConfirmed, [currentRoundIndex]: true },
            state: GameState.TRANSITIONING_TO_NEXT_ROUND,
          };
        }
        
        return {
          ...state,
          match,
          homeTeamConfirmed: { ...state.homeTeamConfirmed, [currentRoundIndex]: homeConfirmed },
          awayTeamConfirmed: { ...state.awayTeamConfirmed, [currentRoundIndex]: awayConfirmed },
        };
      }
      break;
    
    case GameState.TRANSITIONING_TO_NEXT_ROUND:
      if (action.type === GameEvent.ADVANCE_ROUND) {
        const nextRound = state.currentRound + 1;
        console.log(`Advancing from round ${state.currentRound} to round ${nextRound} in GameFlowContext reducer`);
        
        // Special handling for advancing to round 4
        const advancingToRound4 = nextRound === 4;
        if (advancingToRound4) {
          console.log("Advancing to final round 4 - ensuring state updates properly");
        }
        
        return {
          ...state,
          state: GameState.SCORING_ROUND,
          currentRound: nextRound,
          isLoading: false,
        };
      } else if (action.type === 'SET_MATCH') {
        const match = action.payload.match;
        
        // Ensure we properly handle round 4 updates
        const isUpdateToRound4 = match.currentRound === 4;
        if (isUpdateToRound4) {
          console.log("Received SET_MATCH with currentRound = 4, ensuring state is updated properly");
        }
        
        // Only update if the match's current round is greater than or equal to our current round
        // Changed from strictly greater than to greater than or equal to, to handle Round 4 correctly
        if (match.currentRound && match.currentRound >= state.currentRound) {
          console.log(`Match currentRound=${match.currentRound} updating state currentRound=${state.currentRound}`);
          return {
            ...state,
            match,
            currentRound: match.currentRound,
            state: GameState.SCORING_ROUND,
            isLoading: false,
          };
        }
        
        // Only reset loading and change state if we are actually in a loading state
        if (state.isLoading) {
          return {
            ...state,
            match,
            state: GameState.SCORING_ROUND,
            isLoading: false,
          };
        }
        
        // Return state with updated match
        return {
          ...state,
          match,
        };
      }
      break;
  }

  // Handle common actions
  if (action.type === 'SET_ERROR') {
    return {
      ...state,
      error: action.payload.error,
      isLoading: false,
    };
  }
  
  // Handle RESET_GAME_FLOW action (complete reset)
  if (action.type === GameEvent.RESET_GAME_FLOW) {
    // Preserve matchId and match reference but reset everything else
    console.log("Performing complete GameFlow state reset");
    return {
      ...initialState,
      matchId: state.matchId,
      match: state.match,
      state: GameState.SCORING_ROUND,
      currentRound: 1
    };
  }
  
  // Default case: no state change
  return state;
};

// Provider component
export const GameFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameFlowReducer, initialState);
  
  // Helper function to check if a substitution is valid
  const canSubstitute = (position: number, isHomeTeam: boolean, playerId: string, roundIndex: number): boolean => {
    if (!state.match) return false;
    
    console.log(`Checking substitution eligibility for player ${playerId} in round ${roundIndex + 2}, position ${position}`);
    
    // If this is for round 2 (first substitution opportunity), all players are eligible except those 
    // already in the current round's lineup
    if (roundIndex === 0) {
      console.log("Round 2 substitution check - all players are eligible except those already in the lineup");
      
      // Get the players who would be in the next round
      const nextRound = roundIndex + 2; // Round 2
      let lineup = [];
      
      if (state.lineupHistory[nextRound]) {
        lineup = isHomeTeam ? state.lineupHistory[nextRound].homeLineup : state.lineupHistory[nextRound].awayLineup;
      } else {
        lineup = isHomeTeam ? state.match.homeLineup?.slice(0, 4) || [] : state.match.awayLineup?.slice(0, 4) || [];
      }
      
      // Player can't be in multiple positions in the same round
      const currentPositionOfPlayer = lineup.indexOf(playerId);
      if (currentPositionOfPlayer !== -1 && currentPositionOfPlayer !== position) {
        console.log(`Player ${playerId} is already in position ${currentPositionOfPlayer} for round 2`);
        return false; // Player is already in a different position
      }
      
      // NEW CHECK: If the player is being moved out of a position in this substitution phase,
      // they can't be used as a sub for another position
      // Get the original lineup for round 1
      const originalLineup = isHomeTeam ? state.match.homeLineup?.slice(0, 4) || [] : state.match.awayLineup?.slice(0, 4) || [];
      
      // Check if player is in original lineup but not in their original position in the next round
      for (let pos = 0; pos < 4; pos++) {
        if (originalLineup[pos] === playerId && lineup[pos] !== playerId && pos !== position) {
          console.log(`Player ${playerId} is being substituted out from position ${pos} in round 1 and cannot be used as a substitute in another position in round 2`);
          return false;
        }
      }
      
      console.log(`Player ${playerId} is eligible for substitution in round 2`);
      return true;
    }
    
    // For rounds 3 and 4, players can't play in consecutive rounds
    const playersLastRound = new Set<string>();
    for (let pos = 0; pos < 4; pos++) {
      const getPlayer = (round: number, pos: number, isHome: boolean): string => {
        if (!state.lineupHistory || !state.lineupHistory[round]) {
          // Return empty string if lineup history for this round doesn't exist
          console.log(`No lineup history found for round ${round}`);
          return '';
        }
        
        // Ensure the lineup arrays exist and have values at the position
        const lineup = isHome ? state.lineupHistory[round].homeLineup : state.lineupHistory[round].awayLineup;
        if (!lineup || !lineup[pos]) {
          console.log(`Missing lineup data for round ${round}, position ${pos}, isHome: ${isHome}`);
          return '';
        }
        
        return isHome ? state.lineupHistory[round].homeLineup[pos] : state.lineupHistory[round].awayLineup[pos];
      };
      
      // Add ONLY players from the IMMEDIATE previous round (not any earlier rounds)
      // This is the key fix - we only check roundIndex + 1 (the immediate previous round)
      // For round 3 (roundIndex=1), this will only check round 2 (not round 1)
      // For round 4 (roundIndex=2), this will only check round 3 (not rounds 1 or 2)
      const previousRound = roundIndex + 1; // The immediate previous round
      
      // Double-check we have lineup history for the previous round
      if (state.lineupHistory && state.lineupHistory[previousRound]) {
        const homePlayer = getPlayer(previousRound, pos, true);
        const awayPlayer = getPlayer(previousRound, pos, false);
        
        if (homePlayer) playersLastRound.add(homePlayer);
        if (awayPlayer) playersLastRound.add(awayPlayer);
        
        console.log(`Added players from round ${previousRound}, position ${pos}:`, 
                    `Home: ${homePlayer || 'none'}, Away: ${awayPlayer || 'none'}`);
      } else {
        console.log(`Warning: Missing lineup history for previous round ${previousRound}`);
      }
    }
    
    // Remove empty strings
    playersLastRound.delete('');
    
    console.log(`Players in previous round (${roundIndex + 1}):`, [...playersLastRound]);
    
    // Check if this player specifically was in the previous round
    if (playersLastRound.has(playerId)) {
      console.log(`Player ${playerId} is ineligible because they played in the immediate previous round (round ${roundIndex + 1})`);
      return false; // Player played in the immediately previous round
    } else {
      console.log(`Player ${playerId} did NOT play in round ${roundIndex + 1}, so they are eligible`);
    }
    
    // Player can't be in multiple positions in the same round
    const nextRound = roundIndex + 2;
    let lineup = [];
    
    if (state.lineupHistory[nextRound]) {
      lineup = isHomeTeam ? state.lineupHistory[nextRound].homeLineup : state.lineupHistory[nextRound].awayLineup;
    } else {
      lineup = isHomeTeam ? state.match.homeLineup || [] : state.match.awayLineup || [];
    }
    
    const currentPositionOfPlayer = lineup.indexOf(playerId);
    if (currentPositionOfPlayer !== -1 && currentPositionOfPlayer !== position) {
      console.log(`Player ${playerId} is already in position ${currentPositionOfPlayer} for round ${nextRound}`);
      return false; // Player is already in a different position
    }
    
    // NEW CHECK: If the player is being moved out of a position in this substitution phase,
    // they can't be used as a sub for another position
    const currentRoundLineup = state.lineupHistory[roundIndex + 1] 
      ? (isHomeTeam ? state.lineupHistory[roundIndex + 1].homeLineup : state.lineupHistory[roundIndex + 1].awayLineup)
      : (isHomeTeam ? state.match.homeLineup?.slice(0, 4) || [] : state.match.awayLineup?.slice(0, 4) || []);
    
    // Check if player is in current round but not in their current position in the next round
    for (let pos = 0; pos < 4; pos++) {
      if (currentRoundLineup[pos] === playerId && lineup[pos] !== playerId && pos !== position) {
        console.log(`Player ${playerId} is being substituted out from position ${pos} in round ${roundIndex + 1} and cannot be used as a substitute in another position in round ${nextRound}`);
        return false;
      }
    }
    
    console.log(`Player ${playerId} is eligible for substitution in round ${nextRound}`);
    return true;
  };
  
  // Helper function to check if a round is locked
  const isRoundLocked = useCallback((roundIndex: number): boolean => {
    return !!state.match?.roundLockedStatus?.[roundIndex];
  }, [state.match?.roundLockedStatus]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ 
    state, 
    dispatch, 
    canSubstitute, 
    isRoundLocked 
  }), [
    state, 
    dispatch, 
    canSubstitute, 
    isRoundLocked
  ]);
  
  return (
    <GameFlowContext.Provider value={contextValue}>
      {children}
    </GameFlowContext.Provider>
  );
};

// Custom hook to use the GameFlow context
export const useGameFlow = () => {
  const context = useContext(GameFlowContext);
  if (context === undefined) {
    throw new Error('useGameFlow must be used within a GameFlowProvider');
  }
  return context;
}; 