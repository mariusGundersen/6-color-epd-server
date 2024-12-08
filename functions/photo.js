export async function onRequest({ request, env }) {
  const listed = await env.BUCKET.list({ prefix: 'img-', limit: 1 });
  const object = await env.BUCKET.get(listed.objects[0].key);

  if (object === null) {
    return new Response("Object Not Found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, {
    headers,
  });
}