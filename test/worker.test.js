import test from 'node:test';
import assert from 'node:assert/strict';

const INNERTUBE_PAYLOAD = {
  contents: {
    twoColumnSearchResultsRenderer: {
      primaryContents: {
        sectionListRenderer: {
          contents: [
            {
              itemSectionRenderer: {
                contents: [
                  {
                    videoRenderer: {
                      videoId: 'dQw4w9WgXcQ',
                      title: { runs: [{ text: 'Test video' }] },
                      lengthText: { simpleText: '3:32' },
                    },
                  },
                  {
                    videoRenderer: {
                      videoId: 'bad id with spaces',
                      title: { runs: [{ text: 'junk' }] },
                    },
                  },
                  {
                    videoRenderer: {
                      videoId: 'dQw4w9WgXcQ',
                      title: { runs: [{ text: 'duplicate' }] },
                    },
                  },
                  { notAVideo: true },
                ],
              },
            },
          ],
        },
      },
    },
  },
};

function withMockedFetch(payload, status = 200) {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return {
    get callCount() {
      return calls;
    },
    restore() {
      globalThis.fetch = original;
    },
  };
}

test('worker /search returns normalized videos with CORS headers', async () => {
  const mock = withMockedFetch(INNERTUBE_PAYLOAD);
  try {
    const { default: worker } = await import('../worker/src/worker.js');
    const response = await worker.fetch(
      new Request('https://proxy.example/search?q=lofi')
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');

    const body = await response.json();
    assert.deepEqual(body, {
      videos: [{ id: 'dQw4w9WgXcQ', title: 'Test video', dur: 212 }],
    });
  } finally {
    mock.restore();
  }
});

test('worker /search serves repeat queries from its cache', async () => {
  const mock = withMockedFetch(INNERTUBE_PAYLOAD);
  try {
    const { default: worker } = await import('../worker/src/worker.js');
    const url = 'https://proxy.example/search?q=cached%20query';
    await worker.fetch(new Request(url));
    await worker.fetch(new Request(url));
    assert.equal(mock.callCount, 1);
  } finally {
    mock.restore();
  }
});

test('worker rejects other paths and answers CORS preflight', async () => {
  const { default: worker } = await import('../worker/src/worker.js');

  const missing = await worker.fetch(new Request('https://proxy.example/nope'));
  assert.equal(missing.status, 404);

  const preflight = await worker.fetch(
    new Request('https://proxy.example/search', { method: 'OPTIONS' })
  );
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get('access-control-allow-origin'),
    '*'
  );
});

test('worker proxies YouTube errors as 502', async () => {
  const mock = withMockedFetch({ error: 'blocked' }, 403);
  try {
    const { default: worker } = await import('../worker/src/worker.js');
    const response = await worker.fetch(
      new Request('https://proxy.example/search?q=unique-error-query')
    );
    assert.equal(response.status, 502);
  } finally {
    mock.restore();
  }
});
