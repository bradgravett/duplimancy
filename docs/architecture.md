# Architecture

How the app is put together. Kit format and rendering details live in `kit-spec.md`; Anhelo in `anhelo-design.md`.

## Layout

```
apps/web         React + Vite editor (root page)
apps/api         Fastify + TypeScript API, bundled by esbuild into dist/
packages/shared  Card schema (Scryfall-shaped), project doc, API DTOs, decklist parser
packages/anhelo  Anhelo art generator, ported verbatim from the test bench
deploy/          systemd units, Caddyfile, Spaces CORS rules
```

pnpm workspaces. Shared packages are TypeScript source; Vite and esbuild compile them into each app, so there is no separate package build step.

## Editor flow

1. `/` opens an empty editor. Pasting a decklist resolves cards with Scryfall's `/cards/collection` endpoint (75 per request, 100 ms apart) straight from the browser. Only rules text and stats are kept; `image_uris` are dropped in `toCardData`.
2. The first edit creates the project (`POST /api/projects`) and the URL becomes `/<slug>`, e.g. `/gilded-wyrm-hollow-42`.
3. Each card gets art (Anhelo by default, seeded by name + salt; or an upload) and a frame (per card, or the project default).
4. Edits autosave after 1.2 s with optimistic concurrency (`version`); a stale tab gets a 409 and a reload prompt.
5. Export renders every card in the browser and streams PNGs into a zip: print PNGs at 744×1039 (63×88 mm @ 300 dpi), or Tabletop Simulator sheets (10×7 grid, 69 cards, slot 70 left for TTS's hidden face).

Thumbnails are lazy: tiles render Anhelo only when within 400 px of the viewport, in a worker pool, cached as object URLs. Tiles use `content-visibility: auto`, which keeps 800-card cubes responsive without a virtualized list.

## No-login projects

- The slug is public and random (three generic fantasy words + two digits; no WotC trademarks).
- `POST /api/projects` returns an edit token once. The browser keeps it in `localStorage` (`duplimancy:token:<slug>`); Postgres stores only its sha256.
- Writes send `Authorization: Bearer <token>`. Without the token the page is read-only and offers **Duplicate it to edit**, which copies the project under a new slug and token.
- Every open (`GET`) bumps `last_accessed_at`. `dist/gc.js` (daily systemd timer) deletes projects not opened for `GC_INACTIVE_DAYS` (default 270, about 9 months).

## Storage

- **Postgres** (on the droplet): `projects` (doc as jsonb), `assets` (which project references which Spaces key), `kits` (designer uploads with a review status for the admin/takedown page), `orphaned_objects` (Spaces keys waiting for deletion). Migrations are plain SQL in `apps/api/migrations`, applied by `dist/migrate.js`.
- **DigitalOcean Spaces**: uploaded art under `art/<project-id>/<uuid>.<ext>`. The browser asks the API for a presigned PUT (5 min, size and type locked), uploads directly, and stores the public URL in the card. A duplicated project shares the same objects; GC deletes an object only after no project references it.
- The bucket needs the CORS rules in `deploy/spaces-cors.json`, or uploads fail and exported canvases are tainted.

## Rendering: open decision

`apps/web/src/export/renderer.ts` defines a `CardRenderer`. Today `placeholder.ts` draws the built-in plain frame on a canvas so export works end to end; it is temporary and should not grow into a second frame engine.

The intended replacement compiles each card's Typst kit with typst.ts (WASM) in the browser → SVG → canvas → PNG. This keeps one renderer (Typst) for kits, runs untrusted kit code in the user's browser instead of on the 512 MB droplet, and leaves the server CLI only for upload validation. `CLAUDE.md` still describes server-side Typst export; update one or the other once this is decided.

## Deploy

CI (`.github/workflows/ci.yml`) typechecks, tests and builds, then uploads `apps/api/dist`, `apps/api/migrations` and `apps/web/dist` as an artifact. The droplet never builds.

On the droplet: copy the artifact to `/srv/duplimancy/{api,web}`, put the env file at `/srv/duplimancy/.env` (see `.env.example`), install the units from `deploy/`, run `node dist/migrate.js`, then `systemctl enable --now duplimancy-api duplimancy-gc.timer`. Caddy serves the web build and proxies `/api`. The API bundle includes its dependencies, so there's no `npm install` on the droplet.

## Local dev

```sh
pnpm install
cp .env.example .env          # set DATABASE_URL; Spaces vars optional
createdb duplimancy && pnpm db:migrate
pnpm dev                      # API on :8787, web on :5173 (proxies /api)
```

Without Spaces credentials the API runs with uploads disabled and the rest works.

## Not built yet

- Typst kit rendering (typst.ts) and kit upload/validation (`kit-spec.md` §7–8).
- Frame upload page and admin review/takedown page (the `kits` table is ready).
- TTS card back image and deck JSON; print sheets/PDF.
- Removing an upload's asset row when the card's art changes (objects currently live until project GC).
