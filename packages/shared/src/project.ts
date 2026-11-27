import type { CardData } from './card.ts';

/** Where a card's art comes from. Official art is never an option (see CLAUDE.md). */
export type ArtChoice =
  | { kind: 'anhelo'; salt: number; pal?: 'balanced' | 'vivid' | 'pastel' | 'parchment' }
  | { kind: 'upload'; key: string; url: string; /** focal point, 0–1 */ x?: number; y?: number };

export interface CardEntry {
  /** Stable id within the project (client-generated). */
  id: string;
  qty: number;
  card: CardData;
  art: ArtChoice;
  /** Kit id; null = the project's default frame. */
  frame: string | null;
}

export interface ProjectDoc {
  name: string;
  /** Kit applied to every card whose `frame` is null. */
  defaultFrame: string;
  cards: CardEntry[];
}

export const MAX_CARDS = 1000;
export const BUILTIN_FRAME = 'plain';

export function emptyProject(): ProjectDoc {
  return { name: 'Untitled project', defaultFrame: BUILTIN_FRAME, cards: [] };
}

// ---- API DTOs ----

export interface CreateProjectResponse {
  slug: string;
  /** Edit secret. Shown once; the client keeps it in localStorage. */
  token: string;
}

export interface GetProjectResponse {
  slug: string;
  version: number;
  doc: ProjectDoc;
  updatedAt: string;
}

export interface SaveProjectRequest {
  /** Optimistic concurrency: the version this edit is based on. */
  version: number;
  doc: ProjectDoc;
}

export interface SaveProjectResponse {
  version: number;
}

export interface PresignUploadRequest {
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  bytes: number;
}

export interface PresignUploadResponse {
  key: string;
  url: string;
  headers: Record<string, string>;
  publicUrl: string;
}

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
