const { runMigrations } = require('./scripts/migrations/runner');

async function run() {
  try {
    console.log('Running warehouse foreign key migration...');
    await runMigrations(['026']);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

run();
