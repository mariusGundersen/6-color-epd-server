import html from "../../html";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const cursor = url.searchParams.get("cursor") ?? undefined;

  // list r2
  const result = await env.BUCKET.list({
    prefix: "img-",
    cursor,
    limit: 2,
  });

  const entries = await Promise.all(
    result.objects.map(async ({ key }, i, { length }) => {
      const time = 2 ** 32 - key.slice(4, -5);
      const date = new Date(time * 1000);
      date.setDate(date.getDate() + 1);

      const kvKey = `img-${date.toISOString().split('T')[0]}`;

      if (await env.KV.get(kvKey)) {
        console.log('exists ', kvKey, key);
      } else {
        console.log('put', kvKey, key);
        await env.KV.put(kvKey, key);
      }

      return {
        key,
        date,
        cursor: i === length - 1 ? result.cursor : undefined
      };
    })
  );

  const body = html`${entries
    .map(
      (r) => html`
        ${r.cursor
          ? html`<li hx-get="/api/photos/list?cursor=${r.cursor}" hx-swap="afterend" hx-trigger="intersect once">`
          : html`<li>`
        }
          <button popovertarget="${r.key}"><img src="/api/photos/${r.key}" loading="lazy" /></button>
          <img popover id="${r.key}" src="/api/photos/${r.key}" loading="lazy">
          <h2>${formatDate(r.date)}</h2>
          <div hx-get="/api/photos/req/${r.date.toISOString().split('T')[0]}" hx-trigger="intersect once"></div>
        </li>
      `
    )}`;

  // return json
  return new Response(body, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

function formatDate(date) {
  const day = Date.parse(date.toISOString().split("T")[0]);
  const today = Date.parse(new Date().toISOString().split("T")[0]);
  const diff = (today - day) / 1000 / 86400;
  if (diff < -1) return date.toDateString();
  if (diff < 0) return "Tomorow";
  if (diff < 1) return "Today";
  if (diff < 2) return "Yesterday";

  return date.toDateString();
}
