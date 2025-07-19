// src/utils/schedulingUtils.ts
import { Timestamp } from 'firebase/firestore';
import { Team, Match } from '../services/databaseService';
import { MatchFormat } from '../types/match';

// Helper function to get the next specific weekday from a given date
const getNextDayOfWeek = (date: Date, dayOfWeek: number): Date => {
  const resultDate = new Date(date);
  const daysUntilNextDayOfWeek = (dayOfWeek + 7 - date.getDay()) % 7;
  resultDate.setDate(date.getDate() + daysUntilNextDayOfWeek);
  resultDate.setHours(19, 0, 0, 0);
  return resultDate;
};

// Convert weekday string to number (0=Sunday, 6=Saturday)
const dayToNumber = (day: string): number => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days.indexOf(day.toLowerCase());
};

// Helper function to create a Timestamp from a Date
// This function ensures compatibility between Firebase Admin and Client SDKs
function createTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

// Helper function to generate complete frame structure for a match
function generateMatchFrames(matchId: string, seasonId: string, format: MatchFormat = {
  roundsPerMatch: 4,
  framesPerRound: 4,
  positionsPerTeam: 4,
  name: '4v4 Standard'
}): any[] {
  const frames: any[] = [];
  
  // Generate complete frame structure for all rounds
  for (let round = 1; round <= format.roundsPerMatch; round++) {
    for (let frameNum = 1; frameNum <= format.framesPerRound; frameNum++) {
      // Calculate position rotation (A,B,C,D vs 1,2,3,4)
      const homePositionIndex = (frameNum - 1) % format.positionsPerTeam;
      const awayPositionIndex = (frameNum - 1 + round - 1) % format.positionsPerTeam;
      
      const homePosition = String.fromCharCode(65 + homePositionIndex); // A, B, C, D
      const awayPosition = awayPositionIndex + 1; // 1, 2, 3, 4
      
      const frameId = `${matchId}-R${round}-F${frameNum}`;
      
      frames.push({
        frameId,
        matchId,
        round,
        frameNumber: frameNum,
        homePosition,
        awayPosition,
        homePlayerId: 'vacant',
        awayPlayerId: 'vacant', 
        winnerPlayerId: null,
        homeScore: 0,
        awayScore: 0,
        isComplete: false,
        seasonId
      });
    }
  }
  
  return frames;
}

// Updated function signature to match how it's being called in ScheduleMatches.tsx
export function generateSchedule(
  teams: Team[],
  seasonId: string,
  startDate: Date | { toDate: () => Date },
  matchDay: string,
  weeksBetweenMatches: number = 1
): Partial<Match>[] {
  // Handle odd number of teams by adding a "bye" team
  const useByeTeam = teams.length % 2 !== 0;
  const allTeams = [...teams];
  
  if (useByeTeam) {
    // Add a virtual "bye" team
    allTeams.push({
      id: 'bye',
      name: 'BYE',
      homeVenueId: 'none',
      captainUserId: 'none',
      playerIds: [],
      seasonId
    } as Team);
  }

  // Convert startDate to Date if it's a Timestamp
  const initialDate = startDate instanceof Date ? startDate : startDate.toDate();
  const dayNumber = dayToNumber(matchDay);
  let currentDate = getNextDayOfWeek(initialDate, dayNumber);

  const numTeams = allTeams.length;
  const numRounds = numTeams - 1;
  const numMatchesPerRound = Math.floor(numTeams / 2);

  // Create array of team indices
  let teamIndices = allTeams.map((_, index) => index);
  const matches: Partial<Match>[] = [];

  for (let round = 0; round < numRounds; round++) {
    console.log(`Scheduling round ${round + 1} for date:`, currentDate);

    for (let match = 0; match < numMatchesPerRound; match++) {
      const homeIndex = teamIndices[match];
      const awayIndex = teamIndices[numTeams - 1 - match];

      // Skip if either team is undefined or if it's a bye match
      if (homeIndex === undefined || awayIndex === undefined) continue;
      
      const homeTeam = allTeams[homeIndex];
      const awayTeam = allTeams[awayIndex];
      
      // Skip creating actual match if either team is the bye team
      if (homeTeam.id === 'bye' || awayTeam.id === 'bye') {
        console.log(`BYE round for ${homeTeam.id === 'bye' ? awayTeam.name : homeTeam.name}`);
        continue;
      }

      const matchDate = new Date(currentDate);
      console.log(`Creating match: ${homeTeam.name} vs ${awayTeam.name} on ${matchDate}`);

      // Create consistent timestamps for both date and scheduledDate
      const dateTimestamp = createTimestamp(matchDate);
      
      // Assign the home team's venue to the match
      const venueId = homeTeam.homeVenueId || '';
      
      // Generate a temporary match ID for frame generation
      const tempMatchId = `${seasonId}-${homeTeam.id}-${awayTeam.id}-${matchDate.getTime()}`;
      
      // Generate complete frame structure with position rotation
      const matchFrames = generateMatchFrames(tempMatchId, seasonId);
      
      matches.push({
        seasonId,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        venueId: venueId, // Use the home team's venue
        date: dateTimestamp,
        scheduledDate: dateTimestamp,
        status: 'scheduled',
        frames: matchFrames,
        format: {
          roundsPerMatch: 4,
          framesPerRound: 4,
          positionsPerTeam: 4,
          name: '4v4 Standard'
        },
        state: 'pre-match' // Set initial state for V2 system
      });
    }

    // Rotate teams (keeping first team fixed)
    teamIndices = [teamIndices[0], ...teamIndices.slice(-1), ...teamIndices.slice(1, -1)];

    // Move to next match date
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + (7 * weeksBetweenMatches));
  }

  return matches;
}

// Conflict detection function
export const findScheduleConflicts = (matches: Match[]): string[] => {
  const conflicts: string[] = [];
  const matchesByDate: Record<string, Match[]> = {};

  matches.forEach(match => {
    if (match.date) {
      const dateStr = match.date.toDate().toDateString();
      if (!matchesByDate[dateStr]) matchesByDate[dateStr] = [];
      matchesByDate[dateStr].push(match);
    }
  });

  Object.entries(matchesByDate).forEach(([dateStr, dateMatches]) => {
    const teamOccurrences: Record<string, number> = {};

    dateMatches.forEach(match => {
      teamOccurrences[match.homeTeamId] = (teamOccurrences[match.homeTeamId] || 0) + 1;
      teamOccurrences[match.awayTeamId] = (teamOccurrences[match.awayTeamId] || 0) + 1;
    });

    Object.entries(teamOccurrences).forEach(([teamId, count]) => {
      if (count > 1) conflicts.push(`Team ${teamId} has ${count} matches on ${dateStr}`);
    });
  });

  return conflicts;
};