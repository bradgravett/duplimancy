-- Projects: one per slug. No accounts; edit rights = knowing the token.
CREATE TABLE projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  -- sha256 of the edit token; the token itself is never stored.
  token_hash       bytea NOT NULL,
  doc              jsonb NOT NULL,
  version          integer NOT NULL DEFAULT 1,
  -- Set when duplicated after a lost token, for provenance only.
  duplicated_from  uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Bumped on every open (read or write). GC keys on this, not updated_at.
  last_accessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_last_accessed_idx ON projects (last_accessed_at);

-- Which projects reference which uploaded Spaces objects. A duplicate project gets its own
-- rows for the same keys, so GC deletes an object only once no project references it.
CREATE TABLE assets (
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key          text NOT NULL,
  content_type text NOT NULL,
  bytes        integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, key)
);
CREATE INDEX assets_key_idx ON assets (key);

-- Frame kits (designer uploads, later). Status drives the admin review/takedown page.
CREATE TABLE kits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL,
  version     text NOT NULL,
  name        text NOT NULL,
  author      text,
  license     text,
  bundle_key  text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  status_note text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (slug, version)
);

-- Objects that GC removed from Postgres but has not yet deleted from Spaces.
CREATE TABLE orphaned_objects (
  key        text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
