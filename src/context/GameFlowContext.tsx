import React, { createContext, useContext, useReducer, useEffect } from 'react';
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
  | { type: 'SET_MATCH'; payload: { match: Match } }
  | { type: 'SET_ERROR'; payload: { error: string | null } };

// Create the GameFlow context
const GameFlowContext = createContext<{
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
  console.log('GameFlow reducer:', { currentState: state.state, action: action.type });
  
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
        return {
          ...state,
          state: GameState.SCORING_ROUND,
          currentRound: state.currentRound + 1,
          isLoading: false,
        };
      } else if (action.type === 'SET_MATCH') {
        const match = action.payload.match;
        if (match.currentRound && match.currentRound > state.currentRound) {
          return {
            ...state,
            match,
            currentRound: match.currentRound,
            state: GameState.SCORING_ROUND,
            isLoading: false,
          };
        }
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
  
  // Default case: no state change
  return state;
};

// Provider component
export const GameFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameFlowReducer, initialState);
  
  // Helper function to check if a substitution is valid
  const canSubstitute = (position: number, isHomeTeam: boolean, playerId: string, roundIndex: number): boolean => {
    if (!state.match) return false;
    
    // Players can't play in consecutive rounds
    const playersLastRound = new Set<string>();
    for (let pos = 0; pos < 4; pos++) {
      const getPlayer = (round: number, pos: number, isHome: boolean): string => {
        if (state.lineupHistory[round]) {
          return isHome ? state.lineupHistory[round].homeLineup[pos] : state.lineupHistory[round].awayLineup[pos];
        }
        return isHome ? state.match!.homeLineup?.[pos] || '' : state.match!.awayLineup?.[pos] || '';
      };
      
      playersLastRound.add(getPlayer(roundIndex, pos, true));
      playersLastRound.add(getPlayer(roundIndex, pos, false));
    }
    playersLastRound.delete('');
    
    if (playersLastRound.has(playerId)) {
      return false; // Player played in the last round
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
      return false; // Player is already in a different position
    }
    
    return true;
  };
  
  // Helper function to check if a round is locked
  const isRoundLocked = (roundIndex: number): boolean => {
    return !!state.match?.roundLockedStatus?.[roundIndex];
  };
  
  return (
    <GameFlowContext.Provider value={{ state, dispatch, canSubstitute, isRoundLocked }}>
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