export const INVIDIOUS_INSTANCES = [
  'https://iv.melmac.space',
  'https://inv.thepixora.com',
  'https://inv.tux.it',
  'https://invidious.perennialte.ch',
  'https://invidious.slipfox.xyz',
  'https://invidious.asir.dev',
  'https://yewtu.be',
];

const MUSIC_TERMS = [
  'music',
  'songs',
  'song',
  'single',
  'singles',
  'track',
  'tracks',
  'soundtrack',
  'theme',
  'lyrics',
  'ost',
  'amv',
  'edit',
  'remix',
  'piano',
  'guitar',
];

const LONGFORM_MUSIC_TERMS = [
  'album',
  'playlist',
  'mix',
  'compilation',
  'concert',
  'live',
  'set',
  'radio',
  'hour',
];

const LONGFORM_TITLE_TERMS = [
  'full album',
  'album',
  'playlist',
  'mix',
  'compilation',
  'live stream',
  'livestream',
  'concert',
  '1 hour',
  '2 hours',
  '3 hours',
  'lofi radio',
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesAny(value, terms) {
  return terms.some((term) => {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`);
    return pattern.test(value);
  });
}

function getSearchIntent(query) {
  const lower = query.toLowerCase();
  return {
    userWantsMusic: includesAny(lower, MUSIC_TERMS),
    userWantsLongformMusic: includesAny(lower, LONGFORM_MUSIC_TERMS),
  };
}

export function buildFocusedSearchQuery(query, focused = true) {
  void focused;
  const clean = query.trim().replace(/\s+/g, ' ');
  return clean;
}

export function normalizeInvidiousResults(data) {
  if (!Array.isArray(data)) return [];

  return data
    .map((v) => ({
      id: v.videoId || v.id,
      title: v.title || '',
      dur: Number(v.lengthSeconds || v.dur || 300),
    }))
    .filter((v) => v.id && typeof v.id === 'string');
}

export function filterFocusedResults(query, videos, focused = true) {
  void focused;
  const { userWantsMusic, userWantsLongformMusic } = getSearchIntent(query);

  if (userWantsMusic && !userWantsLongformMusic) {
    const singles = videos.filter((video) => {
      const title = video.title.toLowerCase();
      const duration = Number(video.dur || 0);
      const looksLongform = includesAny(title, LONGFORM_TITLE_TERMS);
      return duration >= 75 && duration <= 540 && !looksLongform;
    });

    return singles.length > 0 ? singles : videos;
  }

  return videos;
}
