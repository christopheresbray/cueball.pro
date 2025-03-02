// src/utils/schedulingUtils.ts
import { Timestamp } from 'firebase/firestore';
import { Team, Match } from '../services/databaseService';

// Function to get next day of week from date
const getNextDayOfWeek = (date: Date, dayOfWeek: number): Date => {
  const resultDate = new Date(date.getTime());
  resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
  return resultDate;
};

// Convert day string to number
const dayToNumber = (day: string): number => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days.indexOf(day.toLowerCase());
};

// Generate a round-robin schedule
export const generateSchedule = (
  teams: Team[],
  startDate: Date,
  matchDay: string,
  seasonId: string
): Partial<Match>[] => {
  const matches: Partial<Match>[] = [];
  const numTeams = teams.length;
  
  // If odd number of teams, add a dummy team (bye)
  const actualTeams = numTeams % 2 === 0 ? teams : [...teams, { id: 'bye', name: 'BYE' } as Team];
  const n = actualTeams.length;
  
  // Get the day of week as number
  const dayOfWeekNum = dayToNumber(matchDay);
  
  // Generate rounds
  for (let round = 0; round < n - 1; round++) {
    // Calculate the match date for this round
    const roundDate = new Date(startDate);
    roundDate.setDate(roundDate.getDate() + round * 7); // Add weeks
    const matchDate = getNextDayOfWeek(roundDate, dayOfWeekNum);
    
    // Generate matches for this round
    for (let match = 0; match < n / 2; match++) {
      const home = (round + match) % (n - 1);
      const away = (n - 1 - match + round) % (n - 1);
      
      // Last team stays fixed, others rotate
      if (match === 0) {
        const homeTeam = actualTeams[home];
        const awayTeam = actualTeams[n - 1];
        
        // Skip if one team is the dummy bye team
        if (homeTeam.id !== 'bye' && awayTeam.id !== 'bye') {
          matches.push({
            seasonId,
            homeTeamId: homeTeam.id!,
            awayTeamId: awayTeam.id!,
            venueId: homeTeam.homeVenueId,
            scheduledDate: Timestamp.fromDate(matchDate),
            status: 'scheduled',
            homeLineup: [],
            awayLineup: []
          });
        }
      } else {
        const homeTeam = actualTeams[home];
        const awayTeam = actualTeams[away];
        
        // Skip if one team is the dummy bye team
        if (homeTeam.id !== 'bye' && awayTeam.id !== 'bye') {
          matches.push({
            seasonId,
            homeTeamId: homeTeam.id!,
            awayTeamId: awayTeam.id!,
            venueId: homeTeam.homeVenueId,
            scheduledDate: Timestamp.fromDate(matchDate),
            status: 'scheduled',
            homeLineup: [],
            awayLineup: []
          });
        }
      }
    }
  }
  
  return matches;
};