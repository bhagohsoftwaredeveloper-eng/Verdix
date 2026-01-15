# Database Migration System

This project uses a custom database migration system to manage MySQL database schema changes.

## 📁 **Migration Structure**

```
scripts/
├── migrations/
│   ├── runner.ts          # Migration runner logic
│   ├── index.ts           # Loads all migrations
│   └── 001_initial_schema.ts  # First migration file
```

## 🔧 **Available Commands**

```bash
# Run pending migrations (creates tables)
npm run migrate

# Rollback last migration (drops tables)
npm run migrate:down

# Run specific migration
tsx scripts/migrations/runner.ts up
tsx scripts/migrations/runner.ts down
```

## 📝 **Creating a New Migration**

1. **Create a new migration file** named `XXX_description.ts`:
   ```typescript
   import { registerMigration, Migration } from './runner';
   import { query } from '../../../src/lib/mysql';

   const migration: Migration = {
     name: '999_add_new_table',
     timestamp: '2025-01-24_10-00-00',

     async up(): Promise<void> {
       // Add your schema changes here
       await query('CREATE TABLE new_table (id INT PRIMARY KEY)');
     },

     async down(): Promise<void> {
       // Add rollback logic here
       await query('DROP TABLE new_table');
     }
   };

   registerMigration(migration);
   ```

2. **Add the import to `index.ts`**:
   ```typescript
   import './999_add_new_table';
   ```

3. **Run the migration**:
   ```bash
   npm run migrate
   ```

## ⚙️ **How It Works**

- **migrations table**: Tracks executed migrations to prevent re-running
- **up()**: Applies the migration changes
- **down()**: Reverts the migration changes
- **Transactions**: Each migration runs atomically
- **Rollback**: Last migration can be reverted with down command

## 🔍 **Migration Files**

| File | Purpose |
|------|---------|
| `runner.ts` | Core migration logic, CLI runner |
| `index.ts` | Imports all migrations, exports commands |
| `001_initial_schema.ts` | Creates initial database tables |

## 🗄️ **Database Tables Created**

The `001_initial_schema` migration creates:

- **products** - Main product catalog
- **brands** - Product brand management
- **categories** - Product category classification
- **subcategories** - Product sub-category classification
- **units_of_measure** - Measurement units (pieces, boxes, etc.)
- **migrations** - Migration tracking table

## ❗ **Important Notes**

- ✅ **Run migrations in order** - numbered sequence matters
- ✅ **Test down migrations** - ensure rollback works
- ✅ **Backup database** - before running migrations
- ✅ **DEV environment only** - migrations are for development
- ❌ **No data loss** - down migrations should be safe

## 🔄 **Migration Process**

1. Create migration with unique timestamp and number
2. Test up/down locally
3. Commit changes
4. Run on staging/production carefully

For questions or issues with migrations, check the migration logs in your terminal output.
