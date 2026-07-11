import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

/**
 * Ang logApiSync kaniadto mo-INSERT ug bag-ong 'pending' row sa MATAG retry,
 * imbes mo-update sa naa na. Ang scheduler mo-sweep sa pending rows ug mo-retry
 * — busa ang matag sweep mo-clone sa row. Resulta: 123,448 ka pending rows para
 * sa 14 ra ka tinuod nga transaction.
 *
 * Kini nga migration mo-collapse sa duplicates: mo-bilin sa PINAKABAG-O nga
 * pending row kada (transaction_type, transaction_id), ug mo-papas sa uban.
 * DILI kini mo-hikap sa 'success' o 'failed' nga rows.
 *
 * IRREVERSIBLE ang delete — ang down() mo-drop ra sa index. Ok ra kay ang matag
 * gipapas nga row kay byte-identical duplicate sa nabilin, gawas sa id/timestamps.
 */
const migration: Migration = {
  name: '095_dedupe_external_api_logs',
  timestamp: '2026-07-10_12-00-00',

  async up(): Promise<void> {
    // 1. Kuhaon ang mga id nga i-bilin: pinakabag-o kada (type, transaction_id).
    //
    //    DILI mogamit ug CREATE TEMPORARY TABLE dinhi: ang lib/mysql.ts kay
    //    connection POOL, ug ang temporary table kay per-connection — ang sunod
    //    nga query basin lain nga connection, ug mawala ang table. Ihatod nato
    //    ang keep-list sa JS (14 ra ka rows).
    //
    //    Gamiton ang ROW_NUMBER() imbes GROUP BY: ang MySQL 8 naa'y
    //    ONLY_FULL_GROUP_BY nga default sql_mode, busa ang `SELECT l.id ...
    //    GROUP BY transaction_type, transaction_id` mo-error ug
    //    ER_WRONG_FIELD_WITH_GROUP. Ang window function usab deterministic
    //    kung parehas ang created_at (tie-break sa id).
    const keepRows = await query(`
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY transaction_type, transaction_id
                 ORDER BY created_at DESC, id DESC
               ) AS rn
          FROM external_api_logs
         WHERE status = 'pending'
      ) ranked
      WHERE rn = 1
    `);

    const keepIds: string[] = keepRows.map((r: any) => r.id);
    console.log(`   keeping ${keepIds.length} pending row(s) — one per transaction`);

    // 2. I-papas ang duplicates nga chunked, aron dili mo-lock ug dugay ug dili
    //    mo-bulge ang undo log sa 123k+ nga rows.
    let totalDeleted = 0;
    if (keepIds.length > 0) {
      const placeholders = keepIds.map(() => '?').join(',');
      for (;;) {
        const result = await query(
          `DELETE FROM external_api_logs
            WHERE status = 'pending'
              AND id NOT IN (${placeholders})
            LIMIT 5000`,
          keepIds,
        );
        const affected = result.affectedRows ?? 0;
        totalDeleted += affected;
        if (affected > 0) console.log(`   deleted ${totalDeleted} duplicate pending row(s)...`);
        if (affected < 5000) break;
      }
    }

    console.log(`✅ Removed ${totalDeleted} duplicate pending rows`);

    // 3. Index nga mo-suporta sa bag-ong lookup sa logApiSync.
    //    DILI UNIQUE — pwede ma-re-sync ug tinuyo ang usa ka transaction, busa
    //    pwede ma-duha ang 'success' rows niini.
    const idx = await query(`
      SELECT COUNT(*) AS c FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'external_api_logs'
         AND index_name = 'idx_txn_status'
    `);
    if (idx[0].c === 0) {
      await query('CREATE INDEX idx_txn_status ON external_api_logs (transaction_type, transaction_id, status)');
      console.log('✅ Created idx_txn_status');
    } else {
      console.log('ℹ️  idx_txn_status already exists');
    }
  },

  async down(): Promise<void> {
    // Ang gipapas nga duplicate rows DILI mabalik — tinuyo kini.
    const idx = await query(`
      SELECT COUNT(*) AS c FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'external_api_logs'
         AND index_name = 'idx_txn_status'
    `);
    if (idx[0].c > 0) {
      await query('DROP INDEX idx_txn_status ON external_api_logs');
      console.log('✅ Dropped idx_txn_status');
    }
  }
};

registerMigration(migration);

// Gi-export usab aron matestingan ang up()/down() nga dili moagi sa runner.
export default migration;
