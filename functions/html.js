const symbol = Symbol("html");


export default function html(strings, ...parts) {
  const str = new String(String.raw(strings, ...parts.map(p => {
    if (Array.isArray(p)) {
      return p.join('');
    } else if (p === false) {
      return '';
    } else {
      return p;
    }
  })));

  str[symbol] = true;

  return str;
}