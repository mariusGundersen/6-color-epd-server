export default function html(strings, ...parts) {
  const str = String.raw(strings, ...parts.map(p => {
    if (Array.isArray(p)) {
      return p.join('');
    } else if (p === false) {
      return '';
    } else {
      return p;
    }
  }));

  return str;
}