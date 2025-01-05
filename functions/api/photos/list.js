export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const cursor = url.searchParams.get("cursor") ?? undefined;

  // list r2
  const result = await env.BUCKET.list({
    prefix: "img-",
    cursor,
  });

  const entries = await Promise.all(
    result.objects.map(async ({ key }) => {
      const time = 2 ** 32 - key.slice(4, -5);
      const date = new Date(time * 1000);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const { keys } = await env.KV.list({
        prefix: nextDay.toISOString().split("T")[0],
      });

      const reqs = await Promise.all(
        keys.map(async ({ name }) => {
          const req = await env.KV.get(name, "json");
          const who = await env.KV.get(req.ip);
          return {
            ...req,
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
      (r) => `
        <li>
          <img src="/api/photos/${r.key}" loading="lazy" />
          <h2>${formatDate(r.date)}</h2>
          <table>
            <tr>
              <th>IP</th>
              <th>Who</th>
              <th>Battery</th>
            </tr>
            ${r.reqs
              .map(
                (r) => `
                <tr>
                  <td>${r.ip}</td>
                  <td>${r.who}</td>
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
  return date.toDateString();
}
