// Deletes projects not opened for GC_INACTIVE_DAYS, then Spaces objects no project references.
// Run daily from a systemd timer: `node dist/gc.js`.
import { config } from './config.ts';
import { pool } from './db.ts';
import { deleteObjects } from './storage.ts';

// Keys are queued in orphaned_objects in the same statement as the delete, so a Spaces
// outage never leaks files: the next run retries them.
const gone = await pool.query(
  `WITH gone AS (
     DELETE FROM projects WHERE last_accessed_at < now() - make_interval(days => $1) RETURNING id
   )
   INSERT INTO orphaned_objects (key)
   SELECT DISTINCT a.key FROM assets a JOIN gone g ON a.project_id = g.id
   ON CONFLICT DO NOTHING`,
  [config.gcInactiveDays],
);
// Still referenced by a surviving duplicate? Keep it.
const { rows } = await pool.query<{ key: string }>(
  `SELECT o.key FROM orphaned_objects o WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.key = o.key)`,
);
const keys = rows.map((r) => r.key);
await deleteObjects(keys);
await pool.query('DELETE FROM orphaned_objects o WHERE EXISTS (SELECT 1 FROM assets a WHERE a.key = o.key) OR o.key = ANY($1)', [keys]);
console.log(`gc: queued ${gone.rowCount ?? 0}, deleted ${keys.length} objects`);
await pool.end();
