-- ============================================================
-- Rename the live MySQL database  stock_pilot  ->  verdix
-- ============================================================
-- MySQL has no "RENAME DATABASE" statement. This script creates the
-- new database and moves every base table into it via RENAME TABLE
-- (an instant metadata operation - no data copy).
--
-- HOW TO RUN (from this folder, adjust user/password):
--   mysql -u root -p < migrate_db_to_verdix.sql
--
-- IMPORTANT:
--   * Stop the app before running so nothing writes to the old DB.
--   * Take a backup first:  mysqldump -u root -p stock_pilot > pre_rename_backup.sql
--   * RENAME TABLE moves BASE TABLES only. If you have VIEWS, TRIGGERS,
--     or STORED PROCEDURES, see the notes at the bottom.
-- ============================================================

-- 1) Create the new database (match your existing charset/collation).
CREATE DATABASE IF NOT EXISTS `verdix`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- 2) Build one RENAME TABLE statement covering every base table
--    currently in stock_pilot, then execute it.
SET SESSION group_concat_max_len = 1024 * 1024;

SELECT GROUP_CONCAT(
         '`stock_pilot`.`', table_name, '` TO `verdix`.`', table_name, '`'
         SEPARATOR ', ')
  INTO @rename_sql
  FROM information_schema.tables
 WHERE table_schema = 'stock_pilot'
   AND table_type   = 'BASE TABLE';

-- Guard: only run if there is at least one table to move.
SET @rename_sql = IF(@rename_sql IS NULL,
                     'SELECT "No base tables found in stock_pilot - nothing to rename"',
                     CONCAT('RENAME TABLE ', @rename_sql));

PREPARE stmt FROM @rename_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Verify the move, then (optionally) drop the now-empty old database.
--    Review the table list first, then uncomment the DROP when satisfied.
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'verdix';
-- DROP DATABASE `stock_pilot`;

-- ============================================================
-- NOTES on objects RENAME TABLE does NOT move:
--   VIEWS:      recreate in verdix, then drop in stock_pilot. Find them with:
--               SELECT table_name FROM information_schema.views
--                WHERE table_schema = 'stock_pilot';
--   TRIGGERS:   move with the table only if defined on it; otherwise re-create.
--   ROUTINES:   SELECT routine_name, routine_type FROM information_schema.routines
--                WHERE routine_schema = 'stock_pilot';
--   GRANTS:     re-grant privileges on `verdix`.* to the app user if you use a
--               dedicated DB user (this project's .env uses DB_USER=root).
-- ============================================================
