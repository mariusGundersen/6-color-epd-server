export async function onRequest({ request, env }) {
  const name = `img-${Math.floor(2 ** 32 - Date.now() / 1000)}.jpeg`;
  await env.BUCKET.put(name, request.body);

  const date = new Date();
  let key = `img-${date.toISOString().split('T')[0]}`;

  while (await env.KV.get(key)) {
    date.setDate(date.getDate() + 1);
    key = `img-${date.toISOString().split('T')[0]}`;
  }

  await env.KV.put(key, name);
  return new Response(`Put ${name} successfully!`);
}
