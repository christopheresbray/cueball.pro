// src/types/match.ts

import { Timestamp } from 'firebase/firestore';

// Interface for Match data coming from Firebase
export interface Match {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  scheduledDate: Timestamp;
  status: 'completed' | 'scheduled' | 'in_progress';
  homeLineup?: string[];
  awayLineup?: string[];
  // Optional team name fields that might be populated by a join operation
  homeTeamName?: string;
  awayTeamName?: string;
}