// src/models/index.ts
import { Timestamp } from 'firebase/firestore';

// Base model with common fields
export interface BaseModel {
  id?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// User model
export interface User extends BaseModel {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'captain' | 'player' | 'public';
  teamId?: string;
  phoneNumber?: string;
  photoURL?: string;
}

// League model
export interface League extends BaseModel {
  name: string;
  description?: string;
  location?: string;
  active: boolean;
  startDate?: Timestamp;
  endDate?: Timestamp;
  rules?: string;
}

// Season model
export interface Season extends BaseModel {
  leagueId: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  active: boolean;
  description?: string;
}

// Team model
export interface Team extends BaseModel {
  name: string;
  leagueId: string;
  seasonId?: string;
  venueId?: string;
  homeVenueId?: string;
  captainUserId?: string;
  playerIds?: string[];
  logo?: string;
  active: boolean;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
}

// Player model
export interface Player extends BaseModel {
  userId?: string;
  firstName: string;
  lastName: string;
  teamId: string;
  active: boolean;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  handicap?: number;
  joinDate?: Timestamp;
  notes?: string;
}

// Venue model
export interface Venue extends BaseModel {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  tableCount?: number;
  notes?: string;
  active: boolean;
}

// Fixture model
export interface Fixture extends BaseModel {
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledDate: Timestamp;
  startTime: string;
  completed: boolean;
  matchId?: string;
  round?: number;
  notes?: string;
}

// Match model
export interface Match extends BaseModel {
  fixtureId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  date: Timestamp;
  homeTeamScore: number;
  awayTeamScore: number;
  completed: boolean;
  submittedBy: string;
  approvedBy?: string;
  notes?: string;
}

// Frame model (individual games within a match)
export interface Frame extends BaseModel {
  matchId: string;
  frameNumber: number;
  homePlayerId: string;
  awayPlayerId: string;
  winnerId: string;
  homeBreak: boolean;
  eightBallPocketed: boolean;
  scratchOnEightBall: boolean;
  notes?: string;
}

// Statistic model for player and team stats
export interface Statistic extends BaseModel {
  seasonId: string;
  entityId: string; // playerId or teamId
  entityType: 'player' | 'team';
  matchesPlayed: number;
  matchesWon: number;
  framesPlayed: number;
  framesWon: number;
  winPercentage: number;
}