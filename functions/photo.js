export async function onRequest({ request, env }) {
  const listed = await env.BUCKET.list({ prefix: 'img-', limit: 1 });
  const object = await env.BUCKET.get(listed.objects[0].key, { onlyIf: request.headers });

  await env.KV.put(new Date().toISOString(), JSON.stringify({
    ip: request.headers.get('CF-Connecting-IP'),
    status: object ? object.body ? 200 : 304 : 404,
    key: object?.key,
    battery: {
      voltage: request.headers.get('x-battery-voltage'),
      percent: request.headers.get('x-battery-percent'),
      chargeRate: request.headers.get('x-battery-chargerate'),
    },
    version: request.headers.get('x-release-version')
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
