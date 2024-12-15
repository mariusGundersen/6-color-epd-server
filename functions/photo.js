

export async function onRequest({ request, env }) {
  const listed = await env.BUCKET.list({ prefix: 'img-', limit: 1 });
  const object = await env.BUCKET.get(listed.objects[0].key, { onlyIf: request.headers });

  await env.KV.put(Date.now(), JSON.stringify({
    ip: request.headers.get('CF-Connecting-IP'),
    status: object ? object.body ? 200 : 304 : 404,
    key: object?.key
  }));
  
  if (!object) {
    return new Response("Object Not Found", { status: 404 });
  }

  if (!object.body) {
    return new Response(null, { status: 304 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, {
    headers,
  });
}
