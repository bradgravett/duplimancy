import pg from 'pg';
import { config } from './config.ts';

// Small pool: the droplet has 512 MB and Postgres shares it.
export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });
