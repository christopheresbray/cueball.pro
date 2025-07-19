// scripts/migrate-matches-v2.ts

import { 
  getCollectionDocs, 
  updateMatch, 
  migrateMatchToV2,
  createDefaultMatchFormat 
} from '../src/services/databaseService';
import { where } from 'firebase/firestore';
import type { Match } from '../src/types/match';

/**
 * Migration script to upgrade all matches to V2 format
 * Run this script to add new fields and migrate frame structure
 */

interface MigrationStats {
  totalMatches: number;
  migratedMatches: number;
  skippedMatches: number;
  errors: string[];
}

/**
 * Migrate all matches in a season to V2 format
 */
export const migrateSeasonMatches = async (seasonId: string): Promise<MigrationStats> => {
  console.log(`🚀 Starting migration for season ${seasonId}`);
  
  const stats: MigrationStats = {
    totalMatches: 0,
    migratedMatches: 0,
    skippedMatches: 0,
    errors: []
  };

  try {
    // Get all matches for the season
    const matches = await getCollectionDocs<Match>('matches', [
      where('seasonId', '==', seasonId)
    ]);

    stats.totalMatches = matches.length;
    console.log(`📊 Found ${matches.length} matches to process`);

    for (const match of matches) {
      try {
        console.log(`🔄 Processing match ${match.id}`);

        // Skip if already migrated
        if (match.version === 2) {
          console.log(`⏭️  Match ${match.id} already migrated (v${match.version})`);
          stats.skippedMatches++;
          continue;
        }

        // Migrate the match
        await migrateMatchToV2(match.id!);
        
        console.log(`✅ Successfully migrated match ${match.id}`);
        stats.migratedMatches++;

      } catch (error) {
        const errorMsg = `Failed to migrate match ${match.id}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Failed to get matches for season ${seasonId}: ${error}`;
    console.error(`❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
  }

  return stats;
};

/**
 * Migrate all matches across all seasons
 */
export const migrateAllMatches = async (): Promise<MigrationStats> => {
  console.log(`🌟 Starting global match migration`);
  
  const globalStats: MigrationStats = {
    totalMatches: 0,
    migratedMatches: 0,
    skippedMatches: 0,
    errors: []
  };

  try {
    // Get all matches
    const allMatches = await getCollectionDocs<Match>('matches');
    globalStats.totalMatches = allMatches.length;
    
    console.log(`📊 Found ${allMatches.length} total matches to process`);

    for (const match of allMatches) {
      try {
        console.log(`🔄 Processing match ${match.id} (Season: ${match.seasonId})`);

        // Skip if already migrated
        if (match.version === 2) {
          console.log(`⏭️  Match ${match.id} already migrated (v${match.version})`);
          globalStats.skippedMatches++;
          continue;
        }

        // Migrate the match
        await migrateMatchToV2(match.id!);
        
        console.log(`✅ Successfully migrated match ${match.id}`);
        globalStats.migratedMatches++;

      } catch (error) {
        const errorMsg = `Failed to migrate match ${match.id}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        globalStats.errors.push(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Failed to get all matches: ${error}`;
    console.error(`❌ ${errorMsg}`);
    globalStats.errors.push(errorMsg);
  }

  return globalStats;
};

/**
 * Validate migrated matches
 */
export const validateMigration = async (seasonId?: string): Promise<void> => {
  console.log(`🔍 Validating migration${seasonId ? ` for season ${seasonId}` : ' for all matches'}`);

  try {
    const queryConstraints = seasonId ? [where('seasonId', '==', seasonId)] : [];
    const matches = await getCollectionDocs<Match>('matches', queryConstraints);

    let v1Count = 0;
    let v2Count = 0;
    let invalidCount = 0;

    for (const match of matches) {
      if (match.version === 2) {
        v2Count++;
        
        // Validate V2 structure
        if (!match.format) {
          console.warn(`⚠️  Match ${match.id} is V2 but missing format`);
          invalidCount++;
        }
        if (!match.state) {
          console.warn(`⚠️  Match ${match.id} is V2 but missing state`);
          invalidCount++;
        }
      } else {
        v1Count++;
      }
    }

    console.log(`📊 Migration Validation Results:`);
    console.log(`   V1 Matches: ${v1Count}`);
    console.log(`   V2 Matches: ${v2Count}`);
    console.log(`   Invalid V2: ${invalidCount}`);
    console.log(`   Total: ${matches.length}`);

    if (v1Count === 0 && invalidCount === 0) {
      console.log(`🎉 All matches successfully migrated!`);
    } else if (v1Count > 0) {
      console.log(`⚠️  ${v1Count} matches still need migration`);
    }

    if (invalidCount > 0) {
      console.log(`❌ ${invalidCount} matches have invalid V2 structure`);
    }

  } catch (error) {
    console.error(`❌ Validation failed: ${error}`);
  }
};

/**
 * Print migration summary
 */
export const printMigrationSummary = (stats: MigrationStats): void => {
  console.log(`\n📋 Migration Summary:`);
  console.log(`   Total Matches: ${stats.totalMatches}`);
  console.log(`   Migrated: ${stats.migratedMatches}`);
  console.log(`   Skipped: ${stats.skippedMatches}`);
  console.log(`   Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  const successRate = stats.totalMatches > 0 ? 
    Math.round(((stats.migratedMatches + stats.skippedMatches) / stats.totalMatches) * 100) : 100;
  
  console.log(`\n🎯 Success Rate: ${successRate}%`);
};

/**
 * CLI-like interface for running migrations
 */
export const runMigration = async (options: {
  seasonId?: string;
  validate?: boolean;
  dryRun?: boolean;
}): Promise<void> => {
  console.log(`🚀 CueBall Pro Match Migration V2`);
  console.log(`=================================`);

  if (options.dryRun) {
    console.log(`🧪 DRY RUN MODE - No changes will be made`);
  }

  try {
    let stats: MigrationStats;

    if (options.seasonId) {
      console.log(`🎯 Migrating season: ${options.seasonId}`);
      stats = options.dryRun ? 
        { totalMatches: 0, migratedMatches: 0, skippedMatches: 0, errors: [] } :
        await migrateSeasonMatches(options.seasonId);
    } else {
      console.log(`🌍 Migrating all seasons`);
      stats = options.dryRun ? 
        { totalMatches: 0, migratedMatches: 0, skippedMatches: 0, errors: [] } :
        await migrateAllMatches();
    }

    if (!options.dryRun) {
      printMigrationSummary(stats);
    }

    if (options.validate) {
      console.log(`\n🔍 Running validation...`);
      await validateMigration(options.seasonId);
    }

    console.log(`\n✨ Migration completed!`);

  } catch (error) {
    console.error(`💥 Migration failed: ${error}`);
    process.exit(1);
  }
};

// Export for use in other scripts
export { MigrationStats };

// CLI execution if run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const seasonId = args.find(arg => arg.startsWith('--season='))?.split('=')[1];
  const validate = args.includes('--validate');
  const dryRun = args.includes('--dry-run');

  runMigration({ seasonId, validate, dryRun });
} 