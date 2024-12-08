export async function onRequest({ request, env }) {
  const key = `img-${Math.floor(2 ** 32 - Date.now() / 1000)}.jpeg`;
  await env.BUCKET.put(key, request.body);
  return new Response(`Put ${key} successfully!`);
}