// @ts-check
import html from "../../html";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const cursor = url.searchParams.get("cursor") ?? undefined;

  /**
   * @type {{key: string, date: string, future?: boolean, cursor?: string}[]}
   */
  const entries = [];
  let date;

  if (cursor) {
    date = new Date(Date.parse(`${cursor}T12:00:00.0Z`));
    date.setDate(date.getDate() - 1);
  } else {
    date = new Date();
    while (true) {
      date.setDate(date.getDate() + 1);
      const key = date.toISOString().split('T')[0];
      const name = await env.KV.get(`img-${key}`);

      if (!name) break;

      entries.unshift({
        key: name,
        date: key,
        future: true
      });
    }
    // reset date to today
    date = new Date();
  }

  for (let i = 0; i < 10; i++) {
    const key = date.toISOString().split('T')[0];
    const name = await env.KV.get(`img-${key}`);
    entries.push({
      key: name,
      date: key,
      cursor: i == 9 ? key : undefined
    });
    date.setDate(date.getDate() - 1);
  }

  const body = html`${entries
    .map(
      ({ date, key, cursor, future }) => html`
        ${cursor
          ? html`<li hx-get="/api/photos/list?cursor=${cursor}" hx-swap="afterend" hx-trigger="intersect once">`
          : html`<li class="${future && 'draggable'}">`
        }
          ${key ? html`
            <button popovertarget="${date}">
              <img src="/api/photos/${key}" loading="lazy" />
            </button>
            <img popover id="${date}" src="/api/photos/${key}" loading="lazy">
          ` : html`
            <div></div>
          `}
          <h2>${formatDate(date)}</h2>
          ${future ? html`
            <div class="drag-handle" draggable="false">Drag me</div>
          ` : html`
            <div hx-get="/api/photos/req/${date}" hx-trigger="intersect once"></div>
          `}
        </li>
      `
    )
    }`;

  // return json
  return new Response(body, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}


const WEEKDAY = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  timeZone: 'Europe/Oslo',
});
const DATE = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Oslo',

})

function formatDate(date) {
  const day = Date.parse(date);
  const today = Date.parse(new Date().toISOString().split("T")[0]);
  const diff = (today - day) / 1000 / 86400;
  if (diff >= -1) {
    if (diff < 0) return html`i morgen<br>&nbsp;`;
    if (diff < 1) return html`i dag<br>&nbsp;`;
    if (diff < 2) return html`i går<br>&nbsp;`;
  }

  return html`${WEEKDAY.format(day)}<br>${DATE.format(day)}`;
}
