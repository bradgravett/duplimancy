import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import {
  emptyProject, MAX_CARDS, MAX_UPLOAD_BYTES,
  type CreateProjectResponse, type GetProjectResponse, type PresignUploadRequest,
  type PresignUploadResponse, type ProjectDoc, type SaveProjectRequest, type SaveProjectResponse,
} from '@duplimancy/shared';
import { config } from './config.ts';
import { pool } from './db.ts';
import { hashToken, newSlug, newToken, SLUG_RE, tokenMatches } from './secrets.ts';
import { presignPut, uploadsEnabled } from './storage.ts';

const UPLOAD_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

function validDoc(doc: unknown): doc is ProjectDoc {
  const d = doc as ProjectDoc;
  return !!d && typeof d.name === 'string' && typeof d.defaultFrame === 'string' && Array.isArray(d.cards) && d.cards.length <= MAX_CARDS;
}

async function insertProject(doc: ProjectDoc, duplicatedFrom: string | null): Promise<CreateProjectResponse> {
  const token = newToken();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    const r = await pool.query(
      `INSERT INTO projects (slug, token_hash, doc, duplicated_from) VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO NOTHING RETURNING slug`,
      [slug, hashToken(token), doc, duplicatedFrom],
    );
    if (r.rowCount) return { slug, token };
  }
  throw new Error('could not allocate slug');
}

/** Loads a project and checks the edit token. Replies 404/401 itself and returns null on failure. */
async function authorize(req: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) {
  const token = bearer(req);
  const r = await pool.query<{ id: string; token_hash: Buffer; version: number }>(
    'SELECT id, token_hash, version FROM projects WHERE slug = $1',
    [req.params.slug],
  );
  const row = r.rows[0];
  if (!row) return void reply.code(404).send({ error: 'not_found' }), null;
  if (!token || !tokenMatches(token, row.token_hash)) return void reply.code(401).send({ error: 'bad_token' }), null;
  return row;
}

export function buildApp() {
  // 8 MB covers ~1000 cards of Scryfall text with room to spare.
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, bodyLimit: 8 * 1024 * 1024 });
  app.register(cors, { origin: config.webOrigin, methods: ['GET', 'POST', 'PUT'] });

  app.get('/api/health', async () => ({ ok: true, uploads: uploadsEnabled }));

  app.post<{ Body: { doc?: ProjectDoc } | undefined }>('/api/projects', async (req, reply) => {
    const doc = req.body?.doc ?? emptyProject();
    if (!validDoc(doc)) return reply.code(400).send({ error: 'bad_doc' });
    return reply.code(201).send(await insertProject(doc, null));
  });

  app.get<{ Params: { slug: string } }>('/api/projects/:slug', async (req, reply) => {
    if (!SLUG_RE.test(req.params.slug)) return reply.code(404).send({ error: 'not_found' });
    const r = await pool.query(
      `UPDATE projects SET last_accessed_at = now() WHERE slug = $1
       RETURNING slug, version, doc, updated_at`,
      [req.params.slug],
    );
    const row = r.rows[0];
    if (!row) return reply.code(404).send({ error: 'not_found' });
    const res: GetProjectResponse = { slug: row.slug, version: row.version, doc: row.doc, updatedAt: row.updated_at.toISOString() };
    return res;
  });

  app.put<{ Params: { slug: string }; Body: SaveProjectRequest }>('/api/projects/:slug', async (req, reply) => {
    if (!validDoc(req.body?.doc)) return reply.code(400).send({ error: 'bad_doc' });
    const row = await authorize(req, reply);
    if (!row) return;
    const r = await pool.query<{ version: number }>(
      `UPDATE projects SET doc = $2, version = version + 1, updated_at = now(), last_accessed_at = now()
       WHERE id = $1 AND version = $3 RETURNING version`,
      [row.id, req.body.doc, req.body.version],
    );
    if (!r.rowCount) return reply.code(409).send({ error: 'version_conflict', version: row.version });
    const res: SaveProjectResponse = { version: r.rows[0]!.version };
    return res;
  });

  // Anyone with the link can duplicate: this is the recovery path for a lost token.
  app.post<{ Params: { slug: string } }>('/api/projects/:slug/duplicate', async (req, reply) => {
    const r = await pool.query<{ id: string; doc: ProjectDoc }>('SELECT id, doc FROM projects WHERE slug = $1', [req.params.slug]);
    const row = r.rows[0];
    if (!row) return reply.code(404).send({ error: 'not_found' });
    const created = await insertProject(row.doc, row.id);
    // Uploaded art is shared by key; reference it from the copy so GC keeps it while either project lives.
    await pool.query(
      `INSERT INTO assets (project_id, key, content_type, bytes)
       SELECT p.id, a.key, a.content_type, a.bytes FROM assets a, projects p
       WHERE a.project_id = $1 AND p.slug = $2`,
      [row.id, created.slug],
    );
    return reply.code(201).send(created);
  });

  app.post<{ Params: { slug: string }; Body: PresignUploadRequest }>('/api/projects/:slug/uploads', async (req, reply) => {
    if (!uploadsEnabled) return reply.code(503).send({ error: 'uploads_disabled' });
    const ext = UPLOAD_TYPES[req.body?.contentType];
    const bytes = Number(req.body?.bytes);
    if (!ext || !Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_UPLOAD_BYTES) return reply.code(400).send({ error: 'bad_upload' });
    const row = await authorize(req, reply);
    if (!row) return;
    const key = `art/${row.id}/${randomUUID()}.${ext}`;
    await pool.query('INSERT INTO assets (key, project_id, content_type, bytes) VALUES ($1, $2, $3, $4)', [key, row.id, req.body.contentType, bytes]);
    const signed = await presignPut(key, req.body.contentType, bytes);
    const res: PresignUploadResponse = { key, ...signed };
    return res;
  });

  return app;
}
