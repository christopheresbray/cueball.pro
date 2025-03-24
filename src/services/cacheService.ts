import { League, Season, Team, Match, Frame, Player } from './databaseService';

interface CacheData {
  // League data
  leagues: League[] | null;
  activeLeague: League | null;
  
  // Season data
  seasons: Record<string, Season[]>; // leagueId -> [seasons]
  activeSeason: Season | null;
  
  // Teams data
  teams: Record<string, Team[]>; // seasonId -> [teams]
  
  // Matches data
  matches: Record<string, Match[]>; // seasonId -> [matches]
  
  // Frames data
  frames: Record<string, Frame[]>; // matchId -> [frames]
  
  // Player data
  players: Record<string, Player[]>; // teamId -> [players]
  
  // Timestamp to track cache age
  timestamp: Record<string, number>; // key -> timestamp
  
  // Players for seasons
  playersForSeason: Record<string, Player[]>; // seasonId -> [players]
  
  // Player stats by season
  playerStatsBySeason: Record<string, any[]>; // seasonId_includeIgnored -> [playerStats]
  
  // Generic cache for custom data
  genericCache: Record<string, any>; // key -> value
}

class CacheService {
  private static instance: CacheService;
  private cache: CacheData = {
    leagues: null,
    activeLeague: null,
    activeSeason: null,
    seasons: {},
    teams: {},
    matches: {},
    frames: {},
    players: {},
    timestamp: {},
    playersForSeason: {},
    playerStatsBySeason: {},
    genericCache: {}
  };
  
  // Cache expiration time in milliseconds (default: 5 minutes)
  private CACHE_EXPIRY = 5 * 60 * 1000;
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }
  
  // Check if cache is expired for a specific key
  private isCacheExpired(key: string): boolean {
    const timestamp = this.cache.timestamp[key];
    if (!timestamp) return true;
    
    const now = Date.now();
    return now - timestamp > this.CACHE_EXPIRY;
  }
  
  // Set cache with timestamp
  private setTimestamp(key: string): void {
    this.cache.timestamp[key] = Date.now();
  }
  
  // Generic cache methods
  public getCache<T>(key: string): T | null {
    if (this.isCacheExpired(key)) return null;
    return this.cache.genericCache[key] as T || null;
  }
  
  public setCache<T>(key: string, value: T): void {
    this.cache.genericCache[key] = value;
    this.setTimestamp(key);
  }
  
  // Leagues
  public getLeagues(): League[] | null {
    if (this.isCacheExpired('leagues')) return null;
    return this.cache.leagues;
  }
  
  public setLeagues(leagues: League[]): void {
    this.cache.leagues = leagues;
    this.setTimestamp('leagues');
  }
  
  public getActiveLeague(): League | null {
    if (this.isCacheExpired('activeLeague')) return null;
    return this.cache.activeLeague;
  }
  
  public setActiveLeague(league: League): void {
    this.cache.activeLeague = league;
    this.setTimestamp('activeLeague');
  }
  
  // Seasons
  public getSeasons(leagueId: string): Season[] | null {
    const key = `seasons_${leagueId}`;
    if (this.isCacheExpired(key)) return null;
    return this.cache.seasons[leagueId] || null;
  }
  
  public setSeasons(leagueId: string, seasons: Season[]): void {
    this.cache.seasons[leagueId] = seasons;
    this.setTimestamp(`seasons_${leagueId}`);
  }
  
  public getActiveSeason(): Season | null {
    if (this.isCacheExpired('activeSeason')) return null;
    return this.cache.activeSeason;
  }
  
  public setActiveSeason(season: Season): void {
    this.cache.activeSeason = season;
    this.setTimestamp('activeSeason');
  }
  
  // Teams
  public getTeams(seasonId: string): Team[] | null {
    const key = `teams_${seasonId}`;
    if (this.isCacheExpired(key)) return null;
    return this.cache.teams[seasonId] || null;
  }
  
  public setTeams(seasonId: string, teams: Team[]): void {
    this.cache.teams[seasonId] = teams;
    this.setTimestamp(`teams_${seasonId}`);
  }
  
  // Matches
  public getMatches(seasonId: string): Match[] | null {
    const key = `matches_${seasonId}`;
    if (this.isCacheExpired(key)) return null;
    return this.cache.matches[seasonId] || null;
  }
  
  public setMatches(seasonId: string, matches: Match[]): void {
    this.cache.matches[seasonId] = matches;
    this.setTimestamp(`matches_${seasonId}`);
  }
  
  // Frames
  public getFrames(matchId: string): Frame[] | null {
    const key = `frames_${matchId}`;
    if (this.isCacheExpired(key)) return null;
    return this.cache.frames[matchId] || null;
  }
  
  public setFrames(matchId: string, frames: Frame[]): void {
    this.cache.frames[matchId] = frames;
    this.setTimestamp(`frames_${matchId}`);
  }
  
  // Frames for multiple matches
  public getFramesForMatches(matchIds: string[]): Record<string, Frame[]> {
    const result: Record<string, Frame[]> = {};
    let hasMissingData = false;
    
    for (const matchId of matchIds) {
      const frames = this.getFrames(matchId);
      if (frames) {
        result[matchId] = frames;
      } else {
        hasMissingData = true;
        break;
      }
    }
    
    return hasMissingData ? {} : result;
  }
  
  public setFramesForMatches(framesMap: Record<string, Frame[]>): void {
    for (const [matchId, frames] of Object.entries(framesMap)) {
      this.setFrames(matchId, frames);
    }
  }
  
  // Players
  public getPlayers(teamId: string): Player[] | null {
    const key = `players_${teamId}`;
    if (this.isCacheExpired(key)) return null;
    return this.cache.players[teamId] || null;
  }
  
  public setPlayers(teamId: string, players: Player[]): void {
    this.cache.players[teamId] = players;
    this.setTimestamp(`players_${teamId}`);
  }
  
  // Players for seasons
  public getPlayersForSeason(seasonId: string): Player[] | null {
    const key = `playersForSeason_${seasonId}`;
    if (this.isCacheExpired(key)) return null;
    return this.cache.playersForSeason[seasonId] || null;
  }
  
  public setPlayersForSeason(seasonId: string, players: Player[]): void {
    this.cache.playersForSeason[seasonId] = players;
    this.setTimestamp(`playersForSeason_${seasonId}`);
  }
  
  // Player stats by season
  public getPlayerStatsBySeason(seasonId: string, includeIgnored: boolean): any[] | null {
    const key = `playerStats_${seasonId}_${includeIgnored}`;
    if (this.isCacheExpired(key)) return null;
    return this.cache.playerStatsBySeason[key] || null;
  }
  
  public setPlayerStatsBySeason(seasonId: string, includeIgnored: boolean, stats: any[]): void {
    const key = `playerStats_${seasonId}_${includeIgnored}`;
    this.cache.playerStatsBySeason[key] = stats;
    this.setTimestamp(key);
  }
  
  // Clear specific cache
  public clearCache(key: string): void {
    if (key === 'leagues') {
      this.cache.leagues = null;
      delete this.cache.timestamp['leagues'];
    } else if (key === 'activeLeague') {
      this.cache.activeLeague = null;
      delete this.cache.timestamp['activeLeague'];
    } else if (key === 'activeSeason') {
      this.cache.activeSeason = null;
      delete this.cache.timestamp['activeSeason'];
    } else if (key.startsWith('seasons_')) {
      const leagueId = key.replace('seasons_', '');
      delete this.cache.seasons[leagueId];
      delete this.cache.timestamp[key];
    } else if (key.startsWith('teams_')) {
      const seasonId = key.replace('teams_', '');
      delete this.cache.teams[seasonId];
      delete this.cache.timestamp[key];
    } else if (key.startsWith('matches_')) {
      const seasonId = key.replace('matches_', '');
      delete this.cache.matches[seasonId];
      delete this.cache.timestamp[key];
    } else if (key.startsWith('frames_')) {
      const matchId = key.replace('frames_', '');
      delete this.cache.frames[matchId];
      delete this.cache.timestamp[key];
    } else if (key.startsWith('players_')) {
      const teamId = key.replace('players_', '');
      delete this.cache.players[teamId];
      delete this.cache.timestamp[key];
    } else if (key.startsWith('playersForSeason_')) {
      const seasonId = key.replace('playersForSeason_', '');
      delete this.cache.playersForSeason[seasonId];
      delete this.cache.timestamp[key];
    } else if (key.startsWith('playerStats_')) {
      const [seasonId, includeIgnored] = key.replace('playerStats_', '').split('_');
      delete this.cache.playerStatsBySeason[key];
      delete this.cache.timestamp[key];
    }
  }
  
  // Clear all cache
  public clearAllCache(): void {
    this.cache = {
      leagues: null,
      activeLeague: null,
      activeSeason: null,
      seasons: {},
      teams: {},
      matches: {},
      frames: {},
      players: {},
      timestamp: {},
      playersForSeason: {},
      playerStatsBySeason: {},
      genericCache: {}
    };
  }
}

export const cacheService = CacheService.getInstance();
export default cacheService; 