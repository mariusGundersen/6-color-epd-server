export async function onRequestPost({ request, env }) {

  const form = await request.formData();
  const username = form.get('username');
  const password = form.get('password');

  console.log(username, password);

  if (username != env.USERNAME) return new Response('Wrong', { status: 401 });
  if (password != env.PASSWORD) return new Response('Wrong', { status: 401 });

  return new Response(null, {
    status: 302,
    headers: {
      'Location': new URL('/', request.url).toString(),
      'Set-Cookie': `login=${env.SECRET}; path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
    }
  });
}