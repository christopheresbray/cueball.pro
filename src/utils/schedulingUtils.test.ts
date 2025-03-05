// src/utils/schedulingUtils.test.ts
import { describe, it, expect } from 'vitest';
import { generateSchedule } from './schedulingUtils';
import { Team } from '../services/databaseService';

describe('generateSchedule', () => {
  const mockTeams: Team[] = [
    { id: 'team1', name: 'Team 1', homeVenueId: 'venue1', captainId: 'captain1', playerIds: [], seasonId: 'season1' },
    { id: 'team2', name: 'Team 2', homeVenueId: 'venue2', captainId: 'captain2', playerIds: [], seasonId: 'season1' },
    { id: 'team3', name: 'Team 3', homeVenueId: 'venue3', captainId: 'captain3', playerIds: [], seasonId: 'season1' },
    { id: 'team4', name: 'Team 4', homeVenueId: 'venue4', captainId: 'captain4', playerIds: [], seasonId: 'season1' },
  ];
  
  const startDate = new Date('2025-05-01');
  const matchDay = 'wednesday';
  const seasonId = 'season1';

  it('should generate the correct number of matches for even number of teams', () => {
    const fixtures = generateSchedule(mockTeams, startDate, matchDay, seasonId);
    
    // For n teams, there should be n*(n-1)/2 matches in total (each team plays every other team once)
    const expectedMatchCount = (mockTeams.length * (mockTeams.length - 1)) / 2;
    expect(fixtures.length).toBe(expectedMatchCount);
  });

  it('should generate matches where each team plays every other team exactly once', () => {
    const fixtures = generateSchedule(mockTeams, startDate, matchDay, seasonId);
    
    // Create a map to track how many times each team pair plays
    const teamPairings = new Map<string, number>();
    
    fixtures.forEach(match => {
      const homeTeamId = match.homeTeamId as string;
      const awayTeamId = match.awayTeamId as string;
      
      // Create a unique key for each team pairing (sorted for consistency)
      const pairingKey = [homeTeamId, awayTeamId].sort().join('-');
      
      const currentCount = teamPairings.get(pairingKey) || 0;
      teamPairings.set(pairingKey, currentCount + 1);
    });
    
    // Verify each team pair plays exactly once
    for (const count of teamPairings.values()) {
      expect(count).toBe(1);
    }
  });

  it('should assign venues correctly', () => {
    const fixtures = generateSchedule(mockTeams, startDate, matchDay, seasonId);
    
    fixtures.forEach(match => {
      const homeTeamId = match.homeTeamId as string;
      const homeTeam = mockTeams.find(team => team.id === homeTeamId);
      
      // The venue should be the home team's venue
      expect(match.venueId).toBe(homeTeam?.homeVenueId);
    });
  });

  it('should handle odd number of teams correctly (with byes)', () => {
    // Create an array with an odd number of teams
    const oddTeams = mockTeams.slice(0, 3);
    
    const fixtures = generateSchedule(oddTeams, startDate, matchDay, seasonId);
    
    // For n teams where n is odd, each team plays (n-1)/2 matches
    const expectedMatchesPerTeam = (oddTeams.length - 1) / 2;
    
    // Count how many matches each team is involved in
    const teamMatchCounts: Record<string, number> = {};
    
    fixtures.forEach(match => {
      const homeTeamId = match.homeTeamId as string;
      const awayTeamId = match.awayTeamId as string;
      
      teamMatchCounts[homeTeamId] = (teamMatchCounts[homeTeamId] || 0) + 1;
      teamMatchCounts[awayTeamId] = (teamMatchCounts[awayTeamId] || 0) + 1;
    });
    
    // Verify each team has the correct number of matches
    for (const teamId of oddTeams.map(team => team.id as string)) {
      expect(teamMatchCounts[teamId]).toBe(oddTeams.length - 1);
    }
  });
});
