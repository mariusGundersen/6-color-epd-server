export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (request.headers.get('authorization') === `bearer ${env.SECRET}`) return await next();
  if (request.headers.get('cookie').includes(`login=${env.SECRET}`)) return await next();

  if (url.pathname === '/login') return await next();
  return Response.redirect(new URL('/login', url));
}