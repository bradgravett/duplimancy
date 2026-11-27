import type {
  CreateProjectResponse, GetProjectResponse, PresignUploadRequest, PresignUploadResponse,
  ProjectDoc, SaveProjectResponse,
} from '@duplimancy/shared';

export class ApiError extends Error {
  constructor(public status: number, public code: string, public body?: unknown) {
    super(`${status} ${code}`);
  }
}

async function call<T>(method: string, path: string, body?: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.error ?? 'error', json);
  return json as T;
}

export const api = {
  create: (doc: ProjectDoc) => call<CreateProjectResponse>('POST', '/projects', { doc }),
  get: (slug: string) => call<GetProjectResponse>('GET', `/projects/${slug}`),
  save: (slug: string, token: string, version: number, doc: ProjectDoc) =>
    call<SaveProjectResponse>('PUT', `/projects/${slug}`, { version, doc }, token),
  duplicate: (slug: string) => call<CreateProjectResponse>('POST', `/projects/${slug}/duplicate`),
  presign: (slug: string, token: string, req: PresignUploadRequest) =>
    call<PresignUploadResponse>('POST', `/projects/${slug}/uploads`, req, token),
};

// ---- edit tokens: localStorage only, never sent anywhere but our API ----
const KEY = (slug: string) => `duplimancy:token:${slug}`;
export const tokens = {
  get(slug: string): string | null {
    try { return localStorage.getItem(KEY(slug)); } catch { return null; }
  },
  set(slug: string, token: string) {
    try { localStorage.setItem(KEY(slug), token); } catch { /* private mode: edits last for this tab only */ }
  },
};
