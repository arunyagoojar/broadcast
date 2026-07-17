import test from 'node:test';
import assert from 'node:assert/strict';

test('search fails over to another primary instance and caches the result', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.startsWith('https://yt.chocolatemoo53.com')) {
      return new Response('unavailable', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      });
    }

    return Response.json([
      { videoId: 'dQw4w9WgXcQ', title: 'Test video', lengthSeconds: 212 },
    ]);
  };

  try {
    const { fetchInvidiousResults } = await import('../src/api/searchBackend.js');
    const first = await fetchInvidiousResults('failover test');
    const callCountAfterFirstSearch = calls.length;
    const cached = await fetchInvidiousResults('failover test');

    assert.deepEqual(first, [
      { id: 'dQw4w9WgXcQ', title: 'Test video', dur: 212 },
    ]);
    assert.deepEqual(cached, first);
    assert.equal(calls.length, callCountAfterFirstSearch);
    assert.ok(calls.some((url) => url.startsWith('https://invidious.flokinet.to')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
