/**
 * Drinks API
 *
 * POST /api/drinks   - 创建一条新的喝酒事件
 * GET  /api/drinks   - 获取最近的喝酒事件（可选 since=timestamp 过滤）
 *
 * 存储策略：
 * - 如果绑定了 KV (env.DRINKS)，则将最近的事件列表写入 KV key "events"
 * - 如果没有绑定 KV，则使用内存数组（适合开发环境/demo）
 */

// Cloudflare Workers 类型通过 @cloudflare/workers-types 提供为全局声明
// 这里定义 Env 以便在 PagesFunction 中使用
export type Env = {
  DRINKS?: KVNamespace;
  ENVIRONMENT?: string;
};

export interface DrinkEvent {
  id: string;
  createdAt: number; // Unix ms
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  // 饮品类型：酒精 + 非酒精都支持
  // beer / wine / whisky / sake / cocktail / spirits / coffee / tea / soda / juice / water / mocktail / other
  drinkType: string;
  drinkName?: string;  // 具体品牌或名字
  message?: string;    // 心情/备注
  gender?: 'male' | 'female' | 'other'; // 性别
}

export interface DrinkRequestBody {
  drinkType: string;
  drinkName?: string;
  message?: string;
  gender?: 'male' | 'female' | 'other';
}

// 内存存储作为 KV 缺失时的 fallback（开发环境）
const inMemoryEvents: DrinkEvent[] = [];
const MAX_EVENTS = 500;

function generateId() {
  return Math.random().toString(36).slice(2);
}

async function loadEvents(env: Env): Promise<DrinkEvent[]> {
  if (env.DRINKS) {
    try {
      const raw = await env.DRINKS.get('events');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as DrinkEvent[];
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (err) {
      console.error('Failed to read events from KV:', err);
      return [];
    }
  }
  return inMemoryEvents;
}

async function saveEvent(env: Env, event: DrinkEvent): Promise<void> {
  if (env.DRINKS) {
    const existing = await loadEvents(env);
    const updated = [...existing, event].slice(-MAX_EVENTS);
    await env.DRINKS.put('events', JSON.stringify(updated));
    return;
  }

  inMemoryEvents.push(event);
  if (inMemoryEvents.length > MAX_EVENTS) {
    inMemoryEvents.splice(0, inMemoryEvents.length - MAX_EVENTS);
  }
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, num));
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get('since');

  const events = await loadEvents(env);

  let filtered = events;
  if (sinceParam) {
    const since = Number(sinceParam);
    if (!Number.isNaN(since)) {
      filtered = events.filter((e) => e.createdAt > since);
    }
  }

  // 新到旧排序，并限制返回数量
  filtered = [...filtered].sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);

  return new Response(JSON.stringify({ events: filtered }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.headers.get('Content-Type')?.includes('application/json') === false) {
    return new Response(JSON.stringify({ error: 'Expected application/json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  let body: DrinkRequestBody;
  try {
    body = (await request.json()) as DrinkRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const drinkType = (body.drinkType || '').trim().toLowerCase();
  if (!drinkType) {
    return new Response(JSON.stringify({ error: 'drinkType is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const allowedTypes = [
    'beer',
    'wine',
    'whisky',
    'sake',
    'cocktail',
    'spirits',
    'brandy',
    'gin',
    'rum',
    'vodka',
    'baijiu',
    // 预留 fallback
    'other',
  ];
  const normalizedType = allowedTypes.includes(drinkType) ? drinkType : 'other';

  const drinkName = body.drinkName?.slice(0, 80);
  const message = body.message?.slice(0, 160);
  const gender = ['male', 'female', 'other'].includes(body.gender || '')
    ? body.gender as 'male' | 'female' | 'other'
    : undefined;

  // 从 Cloudflare 提供的地理信息中获取位置
  const cf = (request as any).cf || {};
  const country = typeof cf.country === 'string' ? cf.country : undefined;
  const city = typeof cf.city === 'string' ? cf.city : undefined;

  let lat = parseNumber(cf.latitude);
  let lng = parseNumber(cf.longitude);

  if (typeof lat === 'number') lat = clamp(lat, -90, 90);
  if (typeof lng === 'number') lng = clamp(lng, -180, 180);

  const event: DrinkEvent = {
    id: generateId(),
    createdAt: Date.now(),
    country,
    city,
    lat,
    lng,
    drinkType: normalizedType,
    drinkName,
    message,
    gender,
  };

  await saveEvent(env, event);

  return new Response(JSON.stringify({ event }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
