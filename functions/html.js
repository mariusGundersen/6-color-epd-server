const symbol = Symbol("html");

const escapeHTML = str => str.replace(/[&<>'"]/g,
  tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag]));

export default function html(strings, ...parts) {
  const str = new String(String.raw(strings, ...parts.map(p => {
    if (Array.isArray(p)) {
      return p.join('');
    } else if (p === false) {
      return '';
    } else if (p && typeof p === 'object') {
      return JSON.stringify(p);
    } else if (typeof p === 'string' && !p[symbol]) {
      return escapeHTML(p)
    }
    return p;
  })));

  str[symbol] = true;

  return str;
}