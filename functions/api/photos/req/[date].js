import html from "../../../html";

export async function onRequestGet({ request, env, params }) {
  const prefix = params.date;

  const { keys } = await env.KV.list({
    prefix,
  });

  const reqs = await Promise.all(
    keys.map(async ({ name }) => {
      const req = await env.KV.get(name, "json");
      const who = await env.KV.get(req.ip) ?? '&lt;unknown&gt;';
      return {
        ...req,
        time: name.split("T")[1].split(".")[0],
        who,
      };
    })
  );

  const body = reqs.length ? html`
    <table>
      <tr>
        <th>Who</th>
        <th>Time</th>
        <th>Battery</th>
        <th>Version</th>
      </tr>
      ${reqs
      .sort((a, b) => a.who.localeCompare(b.who))
      .map(
        (r) => html`
                <tr>
                  <td>${r.who}</td>
                  <td>${r.time}</td>
                  <td>${r.battery.voltage} V</td>
                  <td>${r.version}</td>
                </tr>`
      )}
    </table>
  ` : '';

  return new Response(body, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
