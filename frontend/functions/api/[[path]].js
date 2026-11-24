// Forward only /api requests to the explicitly configured Render service.
// Credentials stay in Render; BACKEND_ORIGIN is just the public HTTPS origin.
export async function onRequest({ request, env }) {
  let backend;
  try {
    backend = new URL(env.BACKEND_ORIGIN);
    if (backend.protocol !== 'https:' || !backend.hostname.endsWith('.onrender.com') ||
        backend.username || backend.password || backend.port ||
        backend.pathname !== '/' || backend.search || backend.hash) {
      throw new Error('invalid origin');
    }
  } catch {
    return Response.json({ message: '後端服務尚未設定，請確認 BACKEND_ORIGIN。' }, { status: 503 });
  }

  const incoming = new URL(request.url);
  backend.pathname = incoming.pathname;
  backend.search = incoming.search;
  try {
    const upstream = new Request(backend.toString(), request);
    // The upstream host must be derived from BACKEND_ORIGIN, never from the visitor.
    // Do not pass client-supplied proxy headers through as trusted metadata.
    for (const header of ['host', 'forwarded', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for']) {
      upstream.headers.delete(header);
    }
    // Keep Authorization, cookies, request bodies and Set-Cookie intact.
    // Manual redirects prevent automatically forwarding credentials elsewhere.
    return await fetch(upstream, { redirect: 'manual' });
  } catch {
    return Response.json({ message: '後端服務暫時無法連線，請稍後再試。' }, { status: 502 });
  }
}
