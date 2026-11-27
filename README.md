# Duplimancy

Apply custom card frames to whole Magic: The Gathering decklists, with original art from Anhelo or your own uploads, and export PNGs for print-on-demand or Tabletop Simulator.

```sh
pnpm install
cp .env.example .env
createdb duplimancy && pnpm db:migrate
pnpm dev     # http://localhost:5173
```

See `docs/architecture.md` for how it fits together and `CLAUDE.md` for product rules.
