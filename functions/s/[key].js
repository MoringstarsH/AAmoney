function isValidKey(key) {
  return /^[A-Za-z0-9_-]{4,24}$/.test(key || '');
}

export async function onRequestGet(context) {
  const { request, params } = context;
  const key = params?.key;

  if (!isValidKey(key)) {
    return new Response('Invalid share key', { status: 400 });
  }

  const target = new URL(request.url);
  target.pathname = '/share.html';
  target.search = `?k=${encodeURIComponent(key)}`;
  return Response.redirect(target.toString(), 302);
}
