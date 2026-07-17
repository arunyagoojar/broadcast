import { fetchInvidiousResults } from '../../src/api/searchBackend.js';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
    });
  }

  const results = await fetchInvidiousResults(query, {});

  if (results.length > 0) {
    return new Response(JSON.stringify(results), {
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
    });
  }

  return new Response(JSON.stringify({ error: 'All instances failed' }), {
    status: 502,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    },
  });
}
