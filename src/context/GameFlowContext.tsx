import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { Match, updateMatch } from '../services/databaseService';
import { isRoundComplete } from '../utils/matchUtils';
import { GameState } from '../types/gameState';

// Define game state types
export { GameState };

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

// Helper function to validate substitution
const validateSubstitution = (
  match: Match | null,
  position: number,
  isHomeTeam: boolean,
  playerId: string,
  roundIndex: number,
  lineupHistory: { [round: number]: { homeLineup: string[], awayLineup: string[] } }
): boolean => {
  if (!match?.matchParticipants) return false;
  
  // 1. Check if player is in the original match participants list
  const teamParticipants = isHomeTeam ? 
    match.matchParticipants.homeTeam : 
    match.matchParticipants.awayTeam;
  
  if (!teamParticipants.includes(playerId)) {
    console.log(`Player ${playerId} is not in original match participants`);
    return false;
  }

  const nextRound = roundIndex + 2; // The round we're making substitutions for
  const currentRound = roundIndex + 1; // The current round
  
  // Get the next round's lineup
  let nextRoundLineup = [];
  if (lineupHistory[nextRound]) {
    nextRoundLineup = isHomeTeam ? lineupHistory[nextRound].homeLineup : lineupHistory[nextRound].awayLineup;
  } else {
    // Get Round 1 lineup from history as default
    const round1Lineup = match?.lineupHistory?.[1];
    nextRoundLineup = isHomeTeam ? round1Lineup?.homeLineup?.slice(0, 4) || [] : round1Lineup?.awayLineup?.slice(0, 4) || [];
  }

  // Get the current round's lineup
  let currentRoundLineup = [];
  if (lineupHistory[currentRound]) {
    currentRoundLineup = isHomeTeam ? lineupHistory[currentRound].homeLineup : lineupHistory[currentRound].awayLineup;
  } else {
    // Get Round 1 lineup from history as default
    const round1Lineup = match?.lineupHistory?.[1];
    currentRoundLineup = isHomeTeam ? round1Lineup?.homeLineup?.slice(0, 4) || [] : round1Lineup?.awayLineup?.slice(0, 4) || [];
  }

  // 2. Check if player is already assigned to a different position in next round
  const playerNextPosition = nextRoundLineup.indexOf(playerId);
  if (playerNextPosition !== -1 && playerNextPosition !== position) {
    console.log(`Player ${playerId} is already assigned to position ${playerNextPosition} in round ${nextRound}`);
    return false;
  }

  // 3. Get player's current position in this round (if any)
  const playerCurrentPosition = currentRoundLineup.indexOf(playerId);

  // Special case: Player can stay in their current position
  if (playerCurrentPosition === position) {
    console.log(`Player ${playerId} is staying in position ${position}`);
    return true;
  }

  // 4. If player is in current round but being substituted out, they can't be substituted into a different position
  if (playerCurrentPosition !== -1) {
    // Check if they're being substituted out (their position in next round has a different player)
    if (nextRoundLineup[playerCurrentPosition] !== playerId) {
      console.log(`Player ${playerId} is being substituted out from position ${playerCurrentPosition} and cannot be substituted into position ${position}`);
      return false;
    }
  }

  // If we get here, the substitution is valid:
  // - Player is in match participants
  // - Player is not already in a different position for next round
  // - Player is either not in current round, or is staying in same position
  // - Player is not being substituted out from another position
  return true;
};

// Define the state machine transitions
const gameFlowReducer = (state: GameFlowState, action: GameFlowAction): GameFlowState => {
  // Only log significant state changes, not every render
  if (action.type !== 'SET_MATCH') {
    console.log('GameFlow reducer:', { currentState: state.state, action: action.type });
  }
  
  // Universal SET_MATCH handler: if all rounds are locked, always transition to MATCH_COMPLETED
  if (action.type === 'SET_MATCH') {
    const match = action.payload.match;
    // Find the max round in frames
    const maxRound = match.frames ? Math.max(...Object.values(match.frames).map(f => f.round)) : 4;
    // Check if all rounds are locked
    const allRoundsLocked = [0,1,2,3].every(idx => match.roundLockedStatus?.[idx]);
    if (allRoundsLocked) {
      return {
        ...state,
        match,
        state: GameState.MATCH_COMPLETED,
        currentRound: maxRound,
        homeTeamConfirmed: { ...state.homeTeamConfirmed },
        awayTeamConfirmed: { ...state.awayTeamConfirmed }
      };
    }
    // Clamp currentRound to maxRound if needed
    if ((match.currentRound ?? maxRound) > maxRound) {
      return {
        ...state,
        match,
        currentRound: maxRound
      };
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
        // When a round is locked, check if all rounds are now locked
        const updatedRoundLockedStatus = {
          ...state.match?.roundLockedStatus,
          [action.payload.roundIndex]: true
        };
        // Find the max round in frames
        const maxRound = state.match?.frames ? Math.max(...Object.values(state.match.frames).map(f => f.round)) : 4;
        const allRoundsLocked = [0,1,2,3].every(idx => updatedRoundLockedStatus[idx]);
        if (allRoundsLocked) {
          return {
            ...state,
            state: GameState.MATCH_COMPLETED,
            isLoading: false,
            currentRound: maxRound,
            homeTeamConfirmed: { ...state.homeTeamConfirmed, [state.currentRound - 1]: false },
            awayTeamConfirmed: { ...state.awayTeamConfirmed, [state.currentRound - 1]: false }
          };
        }
        // Otherwise, transition to substitution phase as before
        const nextRound = state.currentRound ? state.currentRound + 1 : 2;
        return {
          ...state,
          state: GameState.SUBSTITUTION_PHASE,
          isLoading: false,
          currentRound: nextRound,
          homeTeamConfirmed: { ...state.homeTeamConfirmed, [state.currentRound - 1]: false },
          awayTeamConfirmed: { ...state.awayTeamConfirmed, [state.currentRound - 1]: false }
        };
      } else if (action.type === 'SET_MATCH') {
        const match = action.payload.match;
        const currentRoundIndex = (match.currentRound || 1) - 1;
        // Find the max round in frames
        const maxRound = match.frames ? Math.max(...Object.values(match.frames).map(f => f.round)) : 4;
        // Check if all rounds are locked
        const allRoundsLocked = [0,1,2,3].every(idx => match.roundLockedStatus?.[idx]);
        if (allRoundsLocked) {
          return {
            ...state,
            match,
            state: GameState.MATCH_COMPLETED,
            currentRound: maxRound,
            homeTeamConfirmed: { ...state.homeTeamConfirmed },
            awayTeamConfirmed: { ...state.awayTeamConfirmed }
          };
        }
        // Check if round is now locked
        if (match.roundLockedStatus?.[currentRoundIndex]) {
          const nextRound = match.currentRound || state.currentRound || 1;
          return {
            ...state,
            match,
            state: GameState.SUBSTITUTION_PHASE,
            currentRound: nextRound,
            homeTeamConfirmed: { ...state.homeTeamConfirmed, [currentRoundIndex]: false },
            awayTeamConfirmed: { ...state.awayTeamConfirmed, [currentRoundIndex]: false }
          };
        }
        return {
          ...state,
          match
        };
      }
      break;
    
    case GameState.SUBSTITUTION_PHASE:
      if (action.type === GameEvent.MAKE_SUBSTITUTION) {
        const { position, isHomeTeam, playerId, roundIndex } = action.payload;
        
        // Validate that the player is in the original match participants
        if (!validateSubstitution(state.match, position, isHomeTeam, playerId, roundIndex, state.lineupHistory)) {
          return {
            ...state,
            error: 'Invalid substitution: Player must be in original match participants'
          };
        }

        // Update lineup history for the round
        const nextRound = roundIndex + 2;
        // Get Round 1 lineup from *match* history as default if state history is empty
        const round1LineupHistory = state.match?.lineupHistory?.[1]; 
        const defaultLineup = {
            homeLineup: round1LineupHistory?.homeLineup?.slice(0,4) || [],
            awayLineup: round1LineupHistory?.awayLineup?.slice(0,4) || []
        };
        const currentLineup = state.lineupHistory[nextRound] || defaultLineup;

        const newLineup = {
            ...currentLineup,
            [isHomeTeam ? 'homeLineup' : 'awayLineup']: currentLineup[isHomeTeam ? 'homeLineup' : 'awayLineup'].map(
                (id, i) => i === position ? playerId : id
            )
        };

        return {
            ...state,
            lineupHistory: {
                ...state.lineupHistory,
                [nextRound]: newLineup
            }
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
        const previousRoundIndex = currentRoundIndex - 1;
        
        // Update team confirmations from the match data
        const homeConfirmed = !!match.homeConfirmedRounds?.[previousRoundIndex];
        const awayConfirmed = !!match.awayConfirmedRounds?.[previousRoundIndex];
        
        console.log('Substitution Phase SET_MATCH:', {
          currentRoundIndex,
          previousRoundIndex,
          homeConfirmed,
          awayConfirmed,
          matchHomeConfirmed: match.homeConfirmedRounds,
          matchAwayConfirmed: match.awayConfirmedRounds
        });

        // If both teams have confirmed, transition to scoring the next round
        if (homeConfirmed && awayConfirmed) {
          return {
            ...state,
            match,
            homeTeamConfirmed: { ...state.homeTeamConfirmed, [previousRoundIndex]: true },
            awayTeamConfirmed: { ...state.awayTeamConfirmed, [previousRoundIndex]: true },
            state: GameState.TRANSITIONING_TO_NEXT_ROUND
          };
        }
        
        // If at least one team has confirmed but not both, go to awaiting confirmations
        if (homeConfirmed || awayConfirmed) {
          return {
            ...state,
            match,
            homeTeamConfirmed: { ...state.homeTeamConfirmed, [previousRoundIndex]: homeConfirmed },
            awayTeamConfirmed: { ...state.awayTeamConfirmed, [previousRoundIndex]: awayConfirmed },
            state: GameState.AWAITING_CONFIRMATIONS
          };
        }

        // Otherwise stay in substitution phase with updated match data
        return {
          ...state,
          match,
          homeTeamConfirmed: { ...state.homeTeamConfirmed, [previousRoundIndex]: false },
          awayTeamConfirmed: { ...state.awayTeamConfirmed, [previousRoundIndex]: false }
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
      state: GameState.SETUP, // Reset to SETUP state instead of SCORING_ROUND
      currentRound: 1,
      homeTeamConfirmed: {}, // Explicitly reset confirmation states
      awayTeamConfirmed: {},
      lineupHistory: {
        1: {
          // Get Round 1 lineup from match history
          homeLineup: state.match?.lineupHistory?.[1]?.homeLineup?.slice(0, 4) || [],
          awayLineup: state.match?.lineupHistory?.[1]?.awayLineup?.slice(0, 4) || []
        }
      }
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
    
    return validateSubstitution(state.match, position, isHomeTeam, playerId, roundIndex, state.lineupHistory);
  };
  
  // Helper function to check if a round is locked
  const isRoundLocked = useCallback((roundIndex: number): boolean => {
    return !!state.match?.roundLockedStatus?.[roundIndex];
  }, [state.match?.roundLockedStatus]);
  
  // Assign contextValue to the correct object shape:
  const contextValue = { state, dispatch, canSubstitute, isRoundLocked };
  
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