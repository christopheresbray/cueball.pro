// src/utils/scheduleGenerator.ts
import { Team, Match } from '../services/databaseService';
import { Timestamp } from 'firebase/firestore';

/**
 * Get the next match day date from a start date and day of week
 * @param startDate The starting date
 * @param dayOfWeek Day of week as string (e.g., 'monday', 'tuesday', etc.)
 * @param weekOffset Number of weeks to offset from start date
 * @returns Date object for the next match day
 */
export const getNextMatchDate = (
  startDate: Date,
  dayOfWeek: string,
  weekOffset: number = 0
): Date => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDayIndex = days.indexOf(dayOfWeek.toLowerCase());
  
  if (targetDayIndex === -1) {
    throw new Error(`Invalid day of week: ${dayOfWeek}`);
  }
  
  const result = new Date(startDate);
  const currentDayIndex = result.getDay();
  
  // Calculate days to add to reach the target day
  let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
  
  // If we're already on the target day, we still want to move to next week
  if (daysToAdd === 0 && weekOffset === 0) {
    daysToAdd = 7;
  }
  
  // Add weeks based on the offset
  daysToAdd += weekOffset * 7;
  
  result.setDate(result.getDate() + daysToAdd);
  
  // Set time to 7:00 PM
  result.setHours(19, 0, 0, 0);
  
  return result;
};

/**
 * Generate a round-robin schedule for a list of teams
 * @param teams List of teams
 * @param startDate Start date for the season
 * @param matchDay Day of the week for matches
 * @param seasonId Season ID
 * @returns Array of match objects
 */
export const generateSchedule = (
  teams: Team[],
  startDate: Date,
  matchDay: string,
  seasonId: string
): Partial<Match>[] => {
  const matches: Partial<Match>[] = [];
  
  // If there's an odd number of teams, add a "bye" team
  const teamsForScheduling = teams.length % 2 === 0 
    ? [...teams] 
    : [...teams, { id: 'bye', name: 'BYE', homeVenueId: 'none' } as Team];
  
  const n = teamsForScheduling.length;
  
  // In a round-robin tournament with n teams:
  // - If n is even, we need (n-1) rounds with n/2 matches per round
  // - If n is odd, we need n rounds with (n-1)/2 matches per round
  const numberOfRounds = n - 1;
  
  // Circle algorithm for round-robin scheduling
  // Keep the first team fixed and rotate all others
  for (let round = 0; round < numberOfRounds; round++) {
    const roundMatches: Partial<Match>[] = [];
    
    // Calculate match date for this round
    const matchDate = getNextMatchDate(startDate, matchDay, round);
    
    for (let i = 0; i < n / 2; i++) {
      const homeIndex = i;
      const awayIndex = n - 1 - i;
      
      // Get the teams for this pairing
      // The first team stays fixed, the rest rotate clockwise
      const firstTeamIndex = 0;
      const secondTeamIndex = (round + 1 + i) % (n - 1);
      
      const team1 = i === 0 ? teamsForScheduling[firstTeamIndex] : teamsForScheduling[secondTeamIndex];
      const team2 = teamsForScheduling[n - 1 - i];
      
      // Skip matches involving the bye team
      if (team1.id === 'bye' || team2.id === 'bye') {
        continue;
      }
      
      // Alternate home/away to balance the schedule
      // For even rounds, the first team is home; for odd rounds, away
      const homeTeam = round % 2 === 0 ? team1 : team2;
      const awayTeam = round % 2 === 0 ? team2 : team1;
      
      // Create the match - use proper type for status
      const match: Partial<Match> = {
        seasonId,
        homeTeamId: homeTeam.id!,
        awayTeamId: awayTeam.id!,
        venueId: homeTeam.homeVenueId,
        scheduledDate: Timestamp.fromDate(matchDate),
        status: "scheduled",  // Use the explicit string literal
        homeLineup: [],
        awayLineup: []
      };
      
      roundMatches.push(match);
    }
    
    // For each round, rotate the teams (except the first one)
    const rotating = teamsForScheduling.slice(1);
    rotating.unshift(rotating.pop()!); // Move the last item to the first position
    teamsForScheduling.splice(1, rotating.length, ...rotating);
    
    matches.push(...roundMatches);
  }
  
  return matches;
};

/**
 * Generate return fixtures (each team plays each other twice)
 * @param teams List of teams
 * @param startDate Start date for the season
 * @param matchDay Day of the week for matches
 * @param seasonId Season ID
 * @returns Array of match objects for both home and away fixtures
 */
export const generateFullSchedule = (
  teams: Team[],
  startDate: Date,
  matchDay: string,
  seasonId: string
): Partial<Match>[] => {
  // Generate first half of the season (each team plays each other once)
  const firstHalfMatches = generateSchedule(teams, startDate, matchDay, seasonId);
  
  // Calculate start date for second half of the season
  const secondHalfStartDate = new Date(startDate);
  secondHalfStartDate.setDate(secondHalfStartDate.getDate() + (teams.length - 1) * 7);
  
  // Generate second half by swapping home/away teams from first half
  const secondHalfMatches = firstHalfMatches.map(match => {
    // Calculate the date for return fixture (add weeks based on number of teams)
    const originalDate = match.scheduledDate?.toDate() || new Date();
    const returnDate = new Date(originalDate);
    returnDate.setDate(returnDate.getDate() + (teams.length - 1) * 7);
    
    return {
      seasonId,
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId,
      venueId: teams.find(team => team.id === match.awayTeamId)?.homeVenueId || '',
      scheduledDate: Timestamp.fromDate(returnDate),
      status: "scheduled" as "scheduled" | "in_progress" | "completed",  // Use explicit type casting
      homeLineup: [],
      awayLineup: []
    };
  });
  
  return [...firstHalfMatches, ...secondHalfMatches];
};

/**
 * Check if a schedule has any conflicts (same team playing multiple matches on same day)
 * @param matches List of matches
 * @returns Array of conflict descriptions
 */
export const findScheduleConflicts = (matches: Partial<Match>[]): string[] => {
  const conflicts: string[] = [];
  const matchesByDate: Record<string, Partial<Match>[]> = {};
  
  // Group matches by date
  matches.forEach(match => {
    if (!match.scheduledDate) return;
    
    const dateStr = match.scheduledDate.toDate().toDateString();
    if (!matchesByDate[dateStr]) {
      matchesByDate[dateStr] = [];
    }
    
    matchesByDate[dateStr].push(match);
  });
  
  // Check each date for teams playing multiple matches
  Object.entries(matchesByDate).forEach(([dateStr, dateMatches]) => {
    const teamsPlaying: Record<string, number> = {};
    
    dateMatches.forEach(match => {
      if (match.homeTeamId) {
        teamsPlaying[match.homeTeamId] = (teamsPlaying[match.homeTeamId] || 0) + 1;
      }
      
      if (match.awayTeamId) {
        teamsPlaying[match.awayTeamId] = (teamsPlaying[match.awayTeamId] || 0) + 1;
      }
    });
    
    // Find teams playing more than once
    Object.entries(teamsPlaying).forEach(([teamId, count]) => {
      if (count > 1) {
        conflicts.push(`Team ${teamId} is scheduled for ${count} matches on ${dateStr}`);
      }
    });
  });
  
  return conflicts;
};

/**
 * Adjust a schedule to eliminate conflicts
 * @param matches List of matches
 * @param matchDay Day of the week for matches
 * @returns Adjusted list of matches
 */
export const resolveScheduleConflicts = (
  matches: Partial<Match>[],
  matchDay: string
): Partial<Match>[] => {
  const adjustedMatches = [...matches];
  const matchesByDate: Record<string, Partial<Match>[]> = {};
  
  // Group matches by date
  adjustedMatches.forEach(match => {
    if (!match.scheduledDate) return;
    
    const dateStr = match.scheduledDate.toDate().toDateString();
    if (!matchesByDate[dateStr]) {
      matchesByDate[dateStr] = [];
    }
    
    matchesByDate[dateStr].push(match);
  });
  
  // Resolve conflicts by adjusting dates
  Object.entries(matchesByDate).forEach(([dateStr, dateMatches]) => {
    if (dateMatches.length <= 1) return;
    
    const teamsPlaying: Record<string, Partial<Match>[]> = {};
    
    // Find which teams are playing in multiple matches
    dateMatches.forEach(match => {
      if (match.homeTeamId) {
        if (!teamsPlaying[match.homeTeamId]) {
          teamsPlaying[match.homeTeamId] = [];
        }
        teamsPlaying[match.homeTeamId].push(match);
      }
      
      if (match.awayTeamId) {
        if (!teamsPlaying[match.awayTeamId]) {
          teamsPlaying[match.awayTeamId] = [];
        }
        teamsPlaying[match.awayTeamId].push(match);
      }
    });
    
    // For each team with conflicts, move their second match to the next week
    Object.entries(teamsPlaying).forEach(([teamId, teamMatches]) => {
      if (teamMatches.length > 1) {
        // Sort matches chronologically
        teamMatches.sort((a, b) => {
          const dateA = a.scheduledDate?.toDate() || new Date();
          const dateB = b.scheduledDate?.toDate() || new Date();
          return dateA.getTime() - dateB.getTime();
        });
        
        // Move all except the first match forward by one week
        for (let i = 1; i < teamMatches.length; i++) {
          const match = teamMatches[i];
          if (match.scheduledDate) {
            const currentDate = match.scheduledDate.toDate();
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + 7);
            match.scheduledDate = Timestamp.fromDate(newDate);
          }
        }
      }
    });
  });
  
  return adjustedMatches;
};

export default {
  generateSchedule,
  generateFullSchedule,
  findScheduleConflicts,
  resolveScheduleConflicts,
  getNextMatchDate
};