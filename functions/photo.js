export async function onRequest({ request, env }) {
  const date = new Date();
  let key = `img-${date.toISOString().split('T')[0]}`;

  let name = await env.KV.get(key);
  while (!name) {
    date.setDate(date.getDate() - 1);
    key = `img-${date.toISOString().split('T')[0]}`;
    console.log(key);
    name = await env.KV.get(key);

    if (key < 'img-2024') {
      return new Response("Object not found", { status: 404 });
    }
  }

  const object = await env.BUCKET.get(name, { onlyIf: request.headers });

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
