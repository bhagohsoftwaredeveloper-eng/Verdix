const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  console.log('Starting External API settings migration...');
  
  try {
    // Ensure connection
    await prisma.$connect();
    console.log('Connected to database.');

    const defaultSettings = [
      { settingKey: 'enabled', settingValue: 'false' },
      { settingKey: 'api_endpoint', settingValue: '' },
      { settingKey: 'auth_type', settingValue: 'api_key' },
      { settingKey: 'api_key', settingValue: '' },
      { settingKey: 'bearer_token', settingValue: '' },
      { settingKey: 'timeout', settingValue: '30000' },
      { settingKey: 'retry_attempts', settingValue: '3' },
      { settingKey: 'retry_delay', settingValue: '2000' },
      { settingKey: 'sync_mode', settingValue: 'realtime' },
      { settingKey: 'on_error_action', settingValue: 'log_only' }
    ];

    console.log('Upserting default settings...');
    for (const setting of defaultSettings) {
      await prisma.externalApiSettings.upsert({
        where: { settingKey: setting.settingKey },
        update: {}, // Keep existing values if already present
        create: setting
      });
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
