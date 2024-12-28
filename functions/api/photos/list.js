export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const cursor = url.searchParams.get("cursor") ?? undefined;

  // list r2
  const result = await env.BUCKET.list({
    prefix: "img-",
    cursor,
  });

  const body = result.objects.map((r) => (`
        <li>
          <img src="/api/photos/${r.key}" />
          <span>${formatDate(r.key)}</span>
        </li>
      `)).join('\n');

  // return json
  return new Response(body, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

function formatDate(key) {
  //const key = `img-${Math.floor(2 ** 32 - Date.now() / 1000)}.jpeg`;
  const time = 2 ** 32 - key.slice(4, -5);
  const date = new Date(time * 1000);

  return date.toDateString();
}
