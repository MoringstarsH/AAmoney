const KEY_PREFIX = 's:';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function isValidKey(key) {
  return /^[A-Za-z0-9_-]{4,24}$/.test(key || '');
}

export async function onRequestGet(context) {
  const { params, env } = context;
  const key = params?.key;

  if (!isValidKey(key)) {
    return json({ ok: false, error: 'invalid-key' }, 400);
  }
  if (!env.SHARE_KV) {
    return json({ ok: false, error: 'missing-kv-binding' }, 500);
  }

  const raw = await env.SHARE_KV.get(KEY_PREFIX + key);
  if (!raw) {
    return json({ ok: false, error: 'not-found' }, 404);
  }

  try {
    const parsed = JSON.parse(raw);
    const data = parsed?.d || parsed?.data || parsed;
    return json({ ok: true, data });
  } catch (error) {
    return json({ ok: false, error: 'corrupted-data' }, 500);
  }
}
