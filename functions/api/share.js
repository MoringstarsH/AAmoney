const TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days
const MAX_PAYLOAD_BYTES = 64 * 1024; // 64KB
const KEY_PREFIX = 's:';
const KEY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function toSafeString(value, fallback = '', maxLen = 120) {
  const text = typeof value === 'string' ? value : fallback;
  return text.slice(0, maxLen);
}

function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePayload(raw) {
  const tripName = toSafeString(raw?.n, 'Untitled Trip', 120);
  const createdAt = toSafeString(raw?.c, '', 64);

  const members = Array.isArray(raw?.m)
    ? raw.m.slice(0, 80).map((m) => ({
        n: toSafeString(m?.n, 'Member', 64),
        g: m?.g === 1 ? 1 : 0,
        c: Math.max(1, Math.min(99, Math.floor(toSafeNumber(m?.c, 1))))
      }))
    : [];

  const memberCount = members.length;
  const expenses = Array.isArray(raw?.e)
    ? raw.e.slice(0, 1000).map((e) => {
        const beneficiaries = Array.isArray(e?.b)
          ? e.b.map((id) => Math.floor(toSafeNumber(id, -1))).filter((id) => id >= 0 && id < memberCount)
          : [];

        const payerIndex = Math.floor(toSafeNumber(e?.p, 0));
        const safePayer = payerIndex >= 0 && payerIndex < memberCount ? payerIndex : 0;

        return {
          d: toSafeString(e?.d, 'Expense', 120),
          a: Math.max(0, toSafeNumber(e?.a, 0)),
          p: safePayer,
          b: beneficiaries
        };
      })
    : [];

  if (!tripName || members.length === 0) {
    throw new Error('invalid-payload');
  }

  return { n: tripName, c: createdAt, m: members, e: expenses };
}

function randomKey(length = 6) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let key = '';
  for (let i = 0; i < length; i++) {
    key += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  }
  return key;
}

async function allocateShortKey(kv) {
  for (let i = 0; i < 12; i++) {
    const candidate = randomKey(6);
    const exists = await kv.get(KEY_PREFIX + candidate);
    if (!exists) return candidate;
  }
  throw new Error('key-exhausted');
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('origin') || '*';
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin)
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || new URL(request.url).origin;

  if (!env.SHARE_KV) {
    return json({ ok: false, error: 'missing-kv-binding' }, 500, corsHeaders(origin));
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json({ ok: false, error: 'invalid-json' }, 400, corsHeaders(origin));
  }

  const bytes = new TextEncoder().encode(JSON.stringify(payload || {})).length;
  if (bytes > MAX_PAYLOAD_BYTES) {
    return json({ ok: false, error: 'payload-too-large' }, 413, corsHeaders(origin));
  }

  let normalized;
  try {
    normalized = normalizePayload(payload);
  } catch (error) {
    return json({ ok: false, error: 'invalid-payload' }, 400, corsHeaders(origin));
  }

  let key;
  try {
    key = await allocateShortKey(env.SHARE_KV);
  } catch (error) {
    return json({ ok: false, error: 'cannot-generate-key' }, 500, corsHeaders(origin));
  }

  const record = {
    v: 1,
    d: normalized,
    t: Date.now()
  };

  await env.SHARE_KV.put(KEY_PREFIX + key, JSON.stringify(record), {
    expirationTtl: TTL_SECONDS
  });

  const url = `${new URL(request.url).origin}/s/${key}`;
  return json({ ok: true, key, url }, 201, corsHeaders(origin));
}
