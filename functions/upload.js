export async function onRequest({ request, env }) {
  const key = `img-${Math.floor(2 ** 32 - Date.now() / 1000)}.jpeg`;
  await env.BUCKET.put(key, request.body);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, time] = tomorrow.toISOString().split('T');
  await env.KV.put(`img-${date}`, key);
  return new Response(`Put ${key} successfully!`);
}
