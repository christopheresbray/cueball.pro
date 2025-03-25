// src/utils/schedulingUtils.ts
import { Timestamp } from 'firebase/firestore';
import { Team, Match } from '../services/databaseService';

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

// Updated function signature to match how it's being called in ScheduleMatches.tsx
export const generateSchedule = (
  teams: Team[],
  seasonId: string,
  startDate: Date,
  matchDay: string,
  weeksBetweenMatches: number = 1
): Match[] => {
  const matches: Match[] = [];

  // Ensure an even number of teams
  const adjustedTeams = teams.length % 2 === 0 ? teams : [...teams, { id: 'bye', name: 'BYE', homeVenueId: '' }];
  const totalRounds = adjustedTeams.length - 1;
  const dayOfWeek = dayToNumber(matchDay);

  // Store the last home team to ensure alternating home/away
  const lastHomeMatch: Record<string, boolean> = {};
  adjustedTeams.forEach(team => {
    if (team.id && team.id !== 'bye') {
      lastHomeMatch[team.id] = false; // Initialize all teams as not having a home match
    }
  });

  // Schedule rounds
  for (let round = 0; round < totalRounds; round++) {
    const roundDate = new Date(startDate);
    roundDate.setDate(roundDate.getDate() + round * weeksBetweenMatches * 7);

    const matchDate = getNextDayOfWeek(roundDate, dayOfWeek);

    for (let matchIndex = 0; matchIndex < adjustedTeams.length / 2; matchIndex++) {
      const homeIdx = (round + matchIndex) % (adjustedTeams.length - 1);
      let awayIdx = (adjustedTeams.length - 1 - matchIndex + round) % (adjustedTeams.length - 1);

      // Special case handling for fixed last team
      if (matchIndex === 0) awayIdx = adjustedTeams.length - 1;

      let homeTeam = adjustedTeams[homeIdx];
      let awayTeam = adjustedTeams[awayIdx];

      // Skip matches involving 'BYE' teams
      if (homeTeam.id && awayTeam.id && homeTeam.id !== 'bye' && awayTeam.id !== 'bye') {
        // Determine if we need to swap home/away to ensure alternating
        const homeTeamWasLastHome = homeTeam.id in lastHomeMatch ? lastHomeMatch[homeTeam.id] : false;
        const awayTeamWasLastHome = awayTeam.id in lastHomeMatch ? lastHomeMatch[awayTeam.id] : false;
        
        // If both teams had the same status last round, prefer to keep the current assignment
        // If the home team was home last round but away team wasn't home, swap them
        if (homeTeamWasLastHome && !awayTeamWasLastHome) {
          // Swap home and away
          const temp = homeTeam;
          homeTeam = awayTeam;
          awayTeam = temp;
        }
        
        // Update the last home match status for these teams
        if (homeTeam.id) lastHomeMatch[homeTeam.id] = true;
        if (awayTeam.id) lastHomeMatch[awayTeam.id] = false;

        // Create a match object that conforms to your Match type
        const match: Match = {
          seasonId,
          homeTeamId: homeTeam.id || '',
          awayTeamId: awayTeam.id || '',
          venueId: homeTeam.homeVenueId || '',
          scheduledDate: Timestamp.fromDate(matchDate),
          status: 'scheduled'
        };
        
        matches.push(match);
      }
    }

    // Rotate teams (round-robin rotation)
    adjustedTeams.splice(1, 0, adjustedTeams.pop()!);
  }

  return matches;
};

// Conflict detection function
export const findScheduleConflicts = (matches: Match[]): string[] => {
  const conflicts: string[] = [];
  const matchesByDate: Record<string, Match[]> = {};

  matches.forEach(match => {
    if (match.scheduledDate) {
      const dateStr = match.scheduledDate.toDate().toDateString();
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