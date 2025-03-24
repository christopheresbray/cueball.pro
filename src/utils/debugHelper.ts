// src/utils/debugHelper.ts

/**
 * A utility function to safely get team information from the database
 * This can help track down where data is missing or malformed
 */
export const debugMatchData = (match: any): void => {
    console.group('Match Data Debug');
    
    // Check for null/undefined match
    if (!match) {
      console.error('Match data is null or undefined');
      console.groupEnd();
      return;
    }
    
    // Log all match properties
    console.log('All match properties:', Object.keys(match));
    
    // Check specific important properties
    const criticalProps = [
      'id', 'homeTeamId', 'awayTeamId', 'homeTeamName', 'awayTeamName', 
      'date', 'venue', 'status', 'homeLineup', 'awayLineup'
    ];
    
    criticalProps.forEach(prop => {
      console.log(`${prop}:`, match[prop], 
        match[prop] === undefined ? '(MISSING)' : 
        match[prop] === null ? '(NULL)' : 
        match[prop] === '' ? '(EMPTY STRING)' : '(OK)');
    });
    
    // Check date format specifically
    if (match.date) {
      const dateObj = new Date(match.date);
      console.log('Date parsing:', {
        original: match.date,
        parsed: dateObj.toString(),
        isValid: !isNaN(dateObj.getTime()),
        timestamp: dateObj.getTime()
      });
    }
    
    console.groupEnd();
  };
  
  /**
   * Use this function to check the structure of the team data
   */
  export const debugTeamData = (team: any): void => {
    console.group('Team Data Debug');
    
    if (!team) {
      console.error('Team data is null or undefined');
      console.groupEnd();
      return;
    }
    
    console.log('Team properties:', Object.keys(team));
    console.log('Team:', team.name);
    console.log('Team ID:', team.id);
    console.log('captainUserId:', team.captainUserId);
    
    console.groupEnd();
  };