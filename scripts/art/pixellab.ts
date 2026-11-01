const BASE = 'https://api.pixellab.ai/v2';
const SECRET = process.env.PIXELLAB_SECRET;
if (!SECRET) throw new Error('PIXELLAB_SECRET missing: add it to .env');

export type Direction = 'south' | 'south-east' | 'east' | 'north-east' | 'north' | 'north-west' | 'west' | 'south-west';
export const DIRECTIONS: Direction[] = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_JOBS = Number(process.env.PIXELLAB_MAX_JOBS ?? 6);
let activeJobs = 0;
const waiting: (() => void)[] = [];

async function withJobSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeJobs >= MAX_JOBS) await new Promise<void>((r) => waiting.push(r));
  activeJobs++;
  try {
    return await fn();
  } finally {
    activeJobs--;
    waiting.shift()?.();
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, attempt = 0): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 40) {
    await sleep(8000 + Math.random() * 7000);
    return request(method, path, body, attempt + 1);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 600)}`);
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
};

export async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

interface Job {
  status: 'processing' | 'completed' | 'failed';
  last_response: Record<string, unknown> | null;
}

export async function waitJob(id: string, timeoutMs = 15 * 60_000): Promise<Record<string, unknown>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await api.get<Job>(`/background-jobs/${id}`);
    if (job.status === 'completed') return job.last_response ?? {};
    if (job.status === 'failed') throw new Error(`job ${id} failed: ${JSON.stringify(job.last_response).slice(0, 400)}`);
    await sleep(6000);
  }
  throw new Error(`job ${id} timed out`);
}

export interface StyleParams {
  outline?: string;
  shading?: string;
  detail?: string;
  view?: string;
  isometric?: boolean;
}

export async function pixflux(opts: StyleParams & { description: string; width: number; height: number; palette?: Buffer; seed?: number; noBackground?: boolean }) {
  const res = await withJobSlot(() => api.post<{ image: { base64: string } }>('/create-image-pixflux', {
    description: opts.description,
    image_size: { width: opts.width, height: opts.height },
    outline: opts.outline,
    shading: opts.shading,
    detail: opts.detail,
    view: opts.view,
    isometric: opts.isometric ?? false,
    no_background: opts.noBackground ?? true,
    color_image: opts.palette ? { type: 'base64', base64: opts.palette.toString('base64') } : undefined,
    seed: opts.seed,
  }));
  return Buffer.from(res.image.base64, 'base64');
}

interface CharacterDetail {
  status: 'pending' | 'completed' | 'failed';
  rotation_urls: Record<Direction, string> | null;
  animations: { animation_type: string; animation_group_id: string; directions: { direction: Direction; frames: string[] }[] }[];
}

export async function createCharacter(opts: { description: string; size: number; outline: string; detail: string; view: string; template?: string; seed?: number }) {
  return withJobSlot(async () => {
    const res = await api.post<{ background_job_id: string; character_id: string }>('/create-character-v3', {
      description: opts.description,
      image_size: { width: opts.size, height: opts.size },
      view: opts.view,
      outline: opts.outline,
      detail: opts.detail,
      template_id: opts.template ?? 'mannequin',
      seed: opts.seed,
    });
    await waitJob(res.background_job_id);
    return res.character_id;
  });
}

export async function getCharacter(id: string) {
  return api.get<CharacterDetail & Record<string, unknown>>(`/characters/${id}`);
}

export async function animateCharacter(id: string, template: string, chunk = 2) {
  let group: string | undefined;
  for (let i = 0; i < DIRECTIONS.length; i += chunk) {
    const res = await api.post<{ background_job_ids: string[]; animation_group_id?: string }>('/animate-character', {
      character_id: id,
      template_animation_id: template,
      directions: DIRECTIONS.slice(i, i + chunk),
      animation_group_id: group,
    });
    group ??= res.animation_group_id;
    await Promise.all(res.background_job_ids.map((j) => waitJob(j)));
  }
  return group;
}

export async function balance() {
  return api.get<{ subscription?: { generations: number } }>('/balance');
}

export async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length) await fn(queue.shift()!);
    }),
  );
}
