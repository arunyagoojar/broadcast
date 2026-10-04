import test from 'node:test';
import assert from 'node:assert/strict';

function stubFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

test('searchYouTube prefers the configured proxy and skips Invidious', async () => {
  const mock = stubFetch(async (url) => {
    if (url.startsWith('https://proxy.example/')) {
      return Response.json({
        videos: [{ id: 'dQw4w9WgXcQ', title: 'Proxied video', dur: 212 }],
      });
    }
    throw new Error(`unexpected fetch to ${url}`);
  });

  try {
    const { searchYouTube } = await import('../src/api/youtube.js');
    const results = await searchYouTube('proxy test', {
      proxyUrl: 'https://proxy.example',
    });

    assert.deepEqual(results, [
      { id: 'dQw4w9WgXcQ', title: 'Proxied video', dur: 212 },
    ]);
    assert.ok(
      mock.calls.every(({ url }) => url.startsWith('https://proxy.example/')),
      'no request should reach Invidious when the proxy succeeds'
    );
  } finally {
    mock.restore();
  }
});

test('searchYouTube falls back to Invidious when the proxy fails', async () => {
  const mock = stubFetch(async (url) => {
    if (url.startsWith('https://proxy.example/')) {
      return new Response('boom', { status: 500 });
    }
    if (url.includes('/api/v1/search')) {
      return Response.json([
        { videoId: 'jNQXAC9IVRw', title: 'Invidious video', lengthSeconds: 190 },
      ]);
    }
    return new Response('unexpected', { status: 404 });
  });

  try {
    const { searchYouTube } = await import('../src/api/youtube.js');
    const results = await searchYouTube('fallback test', {
      proxyUrl: 'https://proxy.example',
    });

    assert.deepEqual(results, [
      { id: 'jNQXAC9IVRw', title: 'Invidious video', dur: 190 },
    ]);
    assert.ok(
      mock.calls.some(({ url }) => url.includes('/api/v1/search')),
      'Invidious pool should be queried after proxy failure'
    );
  } finally {
    mock.restore();
  }
});

test('proxy results are validated and deduplicated by video id', async () => {
  const mock = stubFetch(async (url) => {
    if (url.startsWith('https://proxy.example/')) {
      return Response.json({
        videos: [
          { id: 'dQw4w9WgXcQ', title: 'kept', dur: 212 },
          { id: 'short', title: 'bad id', dur: 10 },
          { videoId: 'jNQXAC9IVRw', title: 'videoId field', dur: '180' },
          { title: 'no id' },
        ],
      });
    }
    return new Response('unexpected', { status: 404 });
  });

  try {
    const { fetchProxyResults } = await import('../src/api/proxySearch.js');
    const results = await fetchProxyResults('validation test', {
      proxyUrl: 'https://proxy.example',
    });

    assert.deepEqual(results, [
      { id: 'dQw4w9WgXcQ', title: 'kept', dur: 212 },
      { id: 'jNQXAC9IVRw', title: 'videoId field', dur: 180 },
    ]);
  } finally {
    mock.restore();
  }
});
