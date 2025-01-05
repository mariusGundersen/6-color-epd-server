export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const cursor = url.searchParams.get("cursor") ?? undefined;

  // list r2
  const result = await env.BUCKET.list({
    prefix: "img-",
    cursor,
    limit: 10,
  });

  const entries = await Promise.all(
    result.objects.map(async ({ key }) => {
      const time = 2 ** 32 - key.slice(4, -5);
      const date = new Date(time * 1000);
      date.setDate(date.getDate() + 1);

      const { keys } = await env.KV.list({
        prefix: date.toISOString().split("T")[0],
      });

      const reqs = await Promise.all(
        keys.map(async ({ name }) => {
          const req = await env.KV.get(name, "json");
          const who = await env.KV.get(req.ip);
          return {
            ...req,
            time: name.split("T")[1].split(".")[0],
            who,
          };
        })
      );

      return {
        key,
        date,
        reqs,
      };
    })
  );

  const body = entries
    .map(
      (r, i, { length }) => `
        <li ${
          i === length - 1 && result.cursor
            ? `hx-get="/api/photos/list?cursor=${result.cursor}" hx-swap="afterend" hx-trigger="intersect once"`
            : ""
        }>
          <img src="/api/photos/${r.key}" loading="lazy" />
          <h2>${formatDate(r.date)}</h2>
          <table>
            <tr>
              <th>Who</th>
              <th>Time</th>
              <th>Battery</th>
            </tr>
            ${r.reqs
              .sort((a, b) => a.who && b.who && a.who.localeCompare(b.who))
              .map(
                (r) => `
                <tr>
                  <td>${r.who}</td>
                  <td>${r.time}</td>
                  <td>${r.battery.voltage}</td>
                </tr>`
              )
              .join("")}
          </table>
        </li>
      `
    )
    .join("\n");

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
