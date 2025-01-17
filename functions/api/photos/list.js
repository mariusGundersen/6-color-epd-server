// @ts-check
import html from "../../html";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const cursor = url.searchParams.get("cursor") ?? undefined;

  /**
   * @type {{key: string, date: string, future?: boolean, cursor?: string}[]}
   */
  const entries = [];
  const futures = [];
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

      futures.unshift({
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

  const body = html`
    ${!!futures.length && renderFutures(futures)}
    ${entries
      .map(
        ({ date, key, cursor }) => html`
        ${cursor
            ? html`<li hx-get="/api/photos/list?cursor=${cursor}" hx-swap="afterend" hx-trigger="intersect once">`
            : html`<li>`
          }
          ${key ? html`
            <button popovertarget="${date}">
              <img src="/api/photos/${key}" loading="lazy" draggable="false" />
            </button>
            <img popover id="${date}" src="/api/photos/${key}" loading="lazy">
          ` : html`
            <div></div>
          `}
          <h2>${formatDate(date)}</h2>
          <div hx-get="/api/photos/req/${date}" hx-trigger="intersect once"></div>
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

/**
 * @param {{ date: string; key: string; }[]} futures
 */
function renderFutures(futures) {
  return html`
    <form hx-post="/api/photos/list" hx-trigger="drop" hx-swap="outerHTML">
      ${futures.map(({ date, key }) => html`
        <li draggable="true">
          <button popovertarget="${date}" type="button">
            <img src="/api/photos/${key}" loading="lazy" draggable="false" />
            <div class="drag-handle">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14 5V19M5 14L3 12L5 10M19 14L21 12L19 10M10 5L10 19" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
            </div>
          </button>
          <img popover id="${date}" src="/api/photos/${key}" loading="lazy">
          <h2>${formatDate(date)}</h2>
          <input type="hidden" name="item" value="${key}">
        </li>
      `)}
      <div class="remove-drop-zone">
        Remove
        <input type=hidden name=remove>
      </div>
    </form>
  `;
}

export async function onRequestPost({ request, env }) {
  const formData = await request.formData();

  const remove = formData.get('remove');
  const items = formData.getAll('item').reverse();

  let date = new Date();

  const futures = [];
  for (const item of items) {
    date.setDate(date.getDate() + 1);
    const key = date.toISOString().split('T')[0];
    futures.unshift({
      date: key,
      key: item
    });
  }

  await Promise.all(futures.map(({ date, key }) => env.KV.put(`img-${date}`, key)));
  if (remove === 'true') {
    date.setDate(date.getDate() + 1);
    const key = date.toISOString().split('T')[0];
    await env.KV.delete(`img-${key}`)
  }

  return new Response(renderFutures(futures), {
    headers: {
      "Content-Type": "text/html"
    }
  })
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
