import { useRef, useState, useEffect, useCallback } from 'react';

import { seededShuffle } from './utils/helpers';
import { readJson, writeJson } from './utils/storage';
import { searchYouTube } from './api/youtube';
import { createNoiseController } from './components/NoiseCanvasController';
import { useWakeLock } from './hooks/useWakeLock';
import PlayerStage from './components/PlayerStage';
import HUD from './components/HUD';
import SearchModal from './components/SearchModal';
import SettingsModal from './components/SettingsModal';
import Overlays from './components/Overlays';

const CHANNEL_COUNT = 10;
const HISTORY_KEY = 'ytTV_history';
const SUBS_KEY = 'ytTV_subs';
const SETTINGS_KEY = 'ytTV_settings';
const THEMES = ['', 'theme-green', 'theme-amber', 'theme-bw'];

function cleanQuery(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function queryKey(value) {
  return cleanQuery(value).toLowerCase();
}

function makeSeed(query) {
  return `${cleanQuery(query)}::${Date.now()}::${Math.random().toString(36).slice(2)}`;
}

function normalizeSavedNetwork(item) {
  if (typeof item === 'string') {
    const query = cleanQuery(item);
    return query ? { query, seed: makeSeed(query) } : null;
  }

  if (item && typeof item === 'object') {
    const query = cleanQuery(item.query);
    return query ? { query, seed: item.seed || makeSeed(query) } : null;
  }

  return null;
}

function normalizeSavedNetworks(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  return value
    .map(normalizeSavedNetwork)
    .filter(Boolean)
    .filter((item) => {
      const key = queryKey(item.query);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function dedupeVideos(videos) {
  const seen = new Set();
  return videos.filter((video) => {
    if (!video?.id || seen.has(video.id)) return false;
    seen.add(video.id);
    return true;
  });
}

function getVideoDuration(video) {
  return Math.max(30, Number(video?.dur || 300));
}

function getInitialData() {
  const history = readJson(HISTORY_KEY, []);
  const subscriptions = normalizeSavedNetworks(readJson(SUBS_KEY, []));
  const settings = readJson(SETTINGS_KEY, {});

  return {
    history: Array.isArray(history) ? history.map(cleanQuery).filter(Boolean).slice(0, 5) : [],
    subscriptions,
    settings: {
      overlayEnabled: settings.overlayEnabled ?? true,
      fxEnabled: settings.fxEnabled ?? true,
      edgeVideo: settings.edgeVideo ?? false,
      themeIndex: settings.themeIndex ?? 0,
    },
  };
}

export default function App() {
  const [initialData] = useState(getInitialData);

  const canvasRef = useRef(null);
  const glitchRef = useRef(null);
  const searchInputRef = useRef(null);
  const hudTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const tuningTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const playerRef = useRef(null);
  const playerInitRef = useRef(false);
  const playerReadyRef = useRef(false);
  const pendingLoadRef = useRef(null);
  const noiseRef = useRef(null);
  const audioCtxRef = useRef(null);
  const touchStartRef = useRef(null);

  const S = useRef({
    query: '',
    sessionSeed: '',
    activeIndex: null,
    channels: [],
    pool: [],
    poolCursor: 0,
    switchToken: 0,
    reqId: 0,
    failChainCount: 0,
  });

  const shouldShowOnboarding =
    initialData.history.length === 0 && initialData.subscriptions.length === 0;

  const [statusText, setStatusText] = useState('TUNE A NETWORK');
  const [statusVisible, setStatusVisible] = useState(!shouldShowOnboarding);
  const [hudFadeOut, setHudFadeOut] = useState(false);
  const [networkFadeOut, setNetworkFadeOut] = useState(false);
  const [networkActive, setNetworkActive] = useState(false);
  const [networkName, setNetworkName] = useState('-');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(shouldShowOnboarding);
  const [currentQuery, setCurrentQuery] = useState('');
  const [activeIndexState, setActiveIndexState] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [channelLabel, setChannelLabel] = useState('CH 00');
  const [volume, setVolume] = useState(70);
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchBg, setGlitchBg] = useState('');
  const [isPoweredOff, setIsPoweredOff] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(
    initialData.settings.overlayEnabled
  );
  const [fxEnabled, setFxEnabled] = useState(initialData.settings.fxEnabled);
  const [edgeVideo, setEdgeVideo] = useState(initialData.settings.edgeVideo);
  const [themeIndex, setThemeIndex] = useState(initialData.settings.themeIndex);
  const [history, setHistory] = useState(initialData.history);
  const [subscriptions, setSubscriptions] = useState(initialData.subscriptions);
  const [helpVisible, setHelpVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const subsRef = useRef(subscriptions);
  const poweredOffRef = useRef(isPoweredOff);
  const fxEnabledRef = useRef(fxEnabled);
  const advanceChannelRef = useRef(null);
  const clearStatusRef = useRef(null);

  useWakeLock();

  useEffect(() => {
    subsRef.current = subscriptions;
  }, [subscriptions]);

  useEffect(() => {
    poweredOffRef.current = isPoweredOff;
  }, [isPoweredOff]);

  useEffect(() => {
    fxEnabledRef.current = fxEnabled;
  }, [fxEnabled]);

  useEffect(() => {
    writeJson(SETTINGS_KEY, {
      overlayEnabled,
      fxEnabled,
      edgeVideo,
      themeIndex,
    });
  }, [overlayEnabled, fxEnabled, edgeVideo, themeIndex]);

  const showToast = useCallback((msg, ms = 2600) => {
    setToastMsg(msg);
    setToastShow(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastShow(false), ms);
  }, []);

  const setStatus = useCallback((label) => {
    clearTimeout(tuningTimerRef.current);
    setStatusText(label);
    setStatusVisible(true);
    noiseRef.current?.start();
  }, []);

  const setStatusAfterDelay = useCallback(
    (label, delayMs, token = S.current.switchToken) => {
      clearTimeout(tuningTimerRef.current);
      tuningTimerRef.current = setTimeout(() => {
        if (token === S.current.switchToken && !poweredOffRef.current) {
          setStatus(label);
        }
      }, delayMs);
    },
    [setStatus]
  );

  const clearStatusFn = useCallback(() => {
    clearTimeout(tuningTimerRef.current);
    setStatusVisible(false);
    noiseRef.current?.stop();
  }, []);

  const syncLabels = useCallback(() => {
    const s = S.current;
    const channel = s.activeIndex == null ? null : s.channels[s.activeIndex];
    const query = channel?.query || s.query;

    setChannelLabel(
      channel ? `CH ${String(s.activeIndex + 1).padStart(2, '0')}` : 'CH 00'
    );
    setCurrentQuery(query || '');
    setActiveIndexState(s.activeIndex);
    setNetworkName(
      channel
        ? `${channel.query.toUpperCase()} / ${String(channel.slot + 1).padStart(2, '0')}`
        : query
          ? query.toUpperCase()
          : '-'
    );
    setNetworkActive(Boolean(query));
    setIsSubscribed(
      Boolean(
        query &&
          subsRef.current.some((x) => queryKey(x.query) === queryKey(query))
      )
    );
  }, []);

  const flashGlitch = useCallback(() => {
    setGlitchActive(false);
    if (glitchRef.current) void glitchRef.current.offsetWidth;
    setGlitchBg(
      `repeating-linear-gradient(0deg,rgba(255,255,255,0.78) 0 1px,rgba(0,0,0,0.9) 1px ${2 + Math.random() * 3}px)`
    );
    setGlitchActive(true);
  }, []);

  const playStaticClick = useCallback(() => {
    if (!fxEnabledRef.current) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;

      const duration = 0.045;
      const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }

      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      gain.gain.value = 0.012;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.warn('[TV] Static click unavailable:', err);
    }
  }, []);

  const resetHudIdle = useCallback(() => {
    setHudFadeOut(false);
    setNetworkFadeOut(false);
    clearTimeout(hudTimerRef.current);
    if (document.querySelector('.search-modal.open')) return;
    hudTimerRef.current = setTimeout(() => {
      setHudFadeOut(true);
      setNetworkFadeOut(true);
    }, 3000);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const noise = createNoiseController(canvas);
    noise.init();
    if (shouldShowOnboarding) noise.stop();
    noiseRef.current = noise;
    return () => {
      noise.destroy();
      noiseRef.current = null;
    };
  }, [shouldShowOnboarding]);

  useEffect(() => {
    const handler = () => resetHudIdle();
    window.addEventListener('mousemove', handler);
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', handler);
    const t = setTimeout(resetHudIdle, 0);
    return () => {
      window.removeEventListener('mousemove', handler);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', handler);
      clearTimeout(t);
      clearTimeout(hudTimerRef.current);
    };
  }, [resetHudIdle]);

  useEffect(() => {
    return () => {
      clearTimeout(toastTimerRef.current);
      clearTimeout(tuningTimerRef.current);
      clearTimeout(retryTimerRef.current);
    };
  }, []);

  const fetchNetworkPool = useCallback(async (source) => {
    const results = await searchYouTube(source.query);
    if (!results?.length) return [];
    return dedupeVideos(seededShuffle(results, source.seed));
  }, []);

  const takeNextVideo = useCallback(() => {
    const s = S.current;
    if (!s.pool.length || s.poolCursor >= s.pool.length) return null;
    const video = s.pool[s.poolCursor];
    s.poolCursor += 1;
    return video;
  }, []);

  const prepareLineup = useCallback(
    async (primary) => {
      const pool = await fetchNetworkPool(primary);
      const channels = [];
      const now = Date.now();
      let poolCursor = 0;

      for (let slot = 0; slot < Math.min(CHANNEL_COUNT, pool.length); slot++) {
        const current = pool[poolCursor];
        poolCursor += 1;
        channels.push({
          id: `${primary.seed}:${slot}`,
          query: primary.query,
          seed: primary.seed,
          slot,
          current,
          startedAt: now,
        });
      }

      return { channels, pool, poolCursor };
    },
    [fetchNetworkPool]
  );

  const updateChannelAt = useCallback((index, patch) => {
    const s = S.current;
    if (index == null || !s.channels[index]) return null;

    let updatedChannel = null;
    s.channels = s.channels.map((channel, i) => {
      if (i !== index) return channel;
      updatedChannel = { ...channel, ...patch };
      return updatedChannel;
    });

    return updatedChannel;
  }, []);

  const syncActiveChannelClock = useCallback(() => {
    const s = S.current;
    const index = s.activeIndex;
    const channel = index == null ? null : s.channels[index];
    if (!channel?.current || !playerRef.current?.getCurrentTime) return;

    try {
      const currentTime = Number(playerRef.current.getCurrentTime() || 0);
      if (Number.isFinite(currentTime)) {
        updateChannelAt(index, { startedAt: Date.now() - currentTime * 1000 });
      }
    } catch (err) {
      console.warn('[TV] Could not sync live channel clock:', err);
    }
  }, [updateChannelAt]);

  const resolveLiveChannel = useCallback(
    async (index) => {
      let channel = S.current.channels[index];
      if (!channel?.current) return null;

      const now = Date.now();
      let elapsed = Math.max(0, (now - (channel.startedAt || now)) / 1000);
      let duration = getVideoDuration(channel.current);
      let safety = 0;

      while (elapsed >= duration && safety < 100) {
        elapsed -= duration;
        const nextVideo = takeNextVideo();
        if (!nextVideo) {
          elapsed = elapsed % duration;
          break;
        }

        channel = { ...channel, current: nextVideo };
        duration = getVideoDuration(channel.current);
        safety += 1;
      }

      if (elapsed >= duration) elapsed = elapsed % duration;

      const startedAt = Date.now() - elapsed * 1000;
      updateChannelAt(index, {
        current: channel.current,
        startedAt,
      });

      return {
        video: channel.current,
        startSeconds: Math.min(
          Math.floor(elapsed),
          Math.max(0, getVideoDuration(channel.current) - 2)
        ),
      };
    },
    [takeNextVideo, updateChannelAt]
  );

  const loadVideo = useCallback((video, startSeconds = 0) => {
    if (!video) return;
    const payload = { videoId: video.id, startSeconds };
    if (playerReadyRef.current && playerRef.current?.loadVideoById) {
      const loadedVideoId = playerRef.current.getVideoData?.().video_id;
      if (loadedVideoId === video.id && playerRef.current.seekTo) {
        const currentTime = Number(playerRef.current.getCurrentTime?.() || 0);
        if (Math.abs(currentTime - startSeconds) > 1.25) {
          playerRef.current.seekTo(startSeconds, true);
        }
        clearStatusFn();
        return;
      }
      playerRef.current.loadVideoById(payload);
    } else {
      pendingLoadRef.current = payload;
    }
  }, [clearStatusFn]);

  const switchTo = useCallback(
    async (index) => {
      const s = S.current;
      if (poweredOffRef.current) return;
      if (!s.channels.length) {
        setStatus('NO SIGNAL');
        return;
      }

      const nextIndex =
        index < 0
          ? (s.channels.length + (index % s.channels.length)) % s.channels.length
          : index % s.channels.length;
      const isWrapping = index < 0 || index >= s.channels.length;

      syncActiveChannelClock();

      s.switchToken += 1;
      const token = s.switchToken;

      playStaticClick();
      flashGlitch();
      setStatusAfterDelay('TUNING', 360, token);

      const channel = s.channels[nextIndex];
      if (!channel?.current) {
        setStatus('NO SIGNAL');
        return;
      }

      if (isWrapping) {
        const nextVideo = takeNextVideo();
        if (nextVideo) {
          updateChannelAt(nextIndex, {
            current: nextVideo,
            startedAt: Date.now(),
          });
        }
      }

      const live = await resolveLiveChannel(nextIndex);
      if (token !== s.switchToken) return;
      if (!live) {
        setStatus('NO SIGNAL');
        return;
      }

      s.activeIndex = nextIndex;
      s.failChainCount = 0;
      syncLabels();
      loadVideo(live.video, live.startSeconds);
      resetHudIdle();
    },
    [
      flashGlitch,
      loadVideo,
      playStaticClick,
      resetHudIdle,
      resolveLiveChannel,
      setStatus,
      setStatusAfterDelay,
      syncActiveChannelClock,
      syncLabels,
      takeNextVideo,
      updateChannelAt,
    ]
  );

  const advanceChannel = useCallback(
    async (reason = 'ended') => {
      const s = S.current;
      const index = s.activeIndex;
      if (poweredOffRef.current || index == null || !s.channels[index]) return;

      s.switchToken += 1;
      const token = s.switchToken;

      playStaticClick();
      flashGlitch();
      setStatusAfterDelay(
        reason === 'error' ? 'SEARCHING SIGNAL' : 'NEXT PROGRAM',
        reason === 'error' ? 180 : 320,
        token
      );

      const nextVideo = takeNextVideo();
      if (token !== s.switchToken) return;

      if (!nextVideo) {
        s.failChainCount += 1;
        if (s.failChainCount > CHANNEL_COUNT) {
          setStatus('NO SIGNAL');
          showToast('SIGNAL LOSS DETECTED - TRY ANOTHER SEARCH');
          return;
        }
        switchTo(index + 1);
        return;
      }

      updateChannelAt(index, {
        current: nextVideo,
        startedAt: Date.now(),
      });
      s.failChainCount = 0;
      syncLabels();

      await new Promise((resolve) => setTimeout(resolve, reason === 'error' ? 420 : 180));
      if (token !== s.switchToken) return;
      loadVideo(nextVideo, 0);
    },
    [
      flashGlitch,
      loadVideo,
      playStaticClick,
      setStatus,
      setStatusAfterDelay,
      showToast,
      switchTo,
      syncLabels,
      takeNextVideo,
      updateChannelAt,
    ]
  );

  const retuneActiveChannel = useCallback(async () => {
    const s = S.current;
    const index = s.activeIndex;
    if (poweredOffRef.current || index == null || !s.channels[index]) return;

    s.switchToken += 1;
    const token = s.switchToken;
    const live = await resolveLiveChannel(index);
    if (token !== s.switchToken || !live) return;

    syncLabels();
    loadVideo(live.video, live.startSeconds);
  }, [loadVideo, resolveLiveChannel, syncLabels]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        syncActiveChannelClock();
      } else if (document.visibilityState === 'visible') {
        retuneActiveChannel();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [retuneActiveChannel, syncActiveChannelClock]);

  useEffect(() => {
    advanceChannelRef.current = advanceChannel;
  }, [advanceChannel]);

  useEffect(() => {
    clearStatusRef.current = clearStatusFn;
  }, [clearStatusFn]);

  const saveHistory = useCallback((q) => {
    setHistory((prev) => {
      const updated = [q, ...prev.filter((x) => queryKey(x) !== queryKey(q))].slice(0, 5);
      writeJson(HISTORY_KEY, updated);
      return updated;
    });
  }, []);

  const handleSearchRef = useRef(null);

  const handleSearch = useCallback(
    async (rawQuery, isRetry = false, seedHint = null) => {
      const query = cleanQuery(rawQuery);
      if (!query) return;

      setSearchOpen(false);
      resetHudIdle();
      setStatus(isRetry ? 'RETRYING' : 'SCANNING');

      const s = S.current;
      s.switchToken += 1;
      s.reqId += 1;
      s.activeIndex = null;
      s.query = query;
      s.sessionSeed = seedHint || makeSeed(query);
      s.channels = [];
      s.pool = [];
      s.poolCursor = 0;
      s.failChainCount = 0;
      pendingLoadRef.current = null;
      setCurrentQuery(query);
      setActiveIndexState(null);

      playerRef.current?.stopVideo?.();
      syncLabels();

      const reqId = s.reqId;
      const primary = { query, seed: s.sessionSeed };

      try {
        const { channels, pool, poolCursor } = await prepareLineup(primary);
        if (reqId !== s.reqId) return;

        if (!channels.length) {
          if (!isRetry) {
            showToast('CONNECTION FAILED - RETRYING...');
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(
              () => handleSearchRef.current?.(query, true, seedHint),
              1500
            );
          } else {
            setStatus('NO SIGNAL');
            showToast('SIGNAL LOST. TRY ANOTHER SEARCH.');
          }
          return;
        }

        s.channels = channels;
        s.pool = pool;
        s.poolCursor = poolCursor;
        saveHistory(query);
        syncLabels();
        showToast(`${channels.length} CHANNELS ONLINE`);
        switchTo(0);
      } catch (err) {
        console.warn('[TV] Search failed:', err);
        if (reqId !== s.reqId) return;
        if (!isRetry) {
          showToast('CONNECTION FAILED - RETRYING...');
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(
            () => handleSearchRef.current?.(query, true, seedHint),
            1500
          );
        } else {
          setStatus('NO SIGNAL');
          showToast('TRANS-LINK TIMED OUT');
        }
      }
    },
    [prepareLineup, resetHudIdle, saveHistory, setStatus, showToast, switchTo, syncLabels]
  );

  useEffect(() => {
    handleSearchRef.current = handleSearch;
  }, [handleSearch]);

  useEffect(() => {
    if (playerInitRef.current) return;

    const currentOrigin =
      window.location.protocol === 'file:' ||
      !window.location.origin ||
      window.location.origin === 'null'
        ? 'http://localhost'
        : window.location.origin;

    function initPlayer() {
      if (playerInitRef.current) return;
      playerInitRef.current = true;

      playerRef.current = new window.YT.Player('player', {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          origin: currentOrigin,
        },
        events: {
          onReady(e) {
            playerRef.current = e.target;
            playerReadyRef.current = true;
            playerRef.current.setVolume(volume);
            if (pendingLoadRef.current) {
              playerRef.current.loadVideoById(pendingLoadRef.current);
              pendingLoadRef.current = null;
            }
          },
          onStateChange(e) {
            if (!window.YT) return;
            playerRef.current = e.target;
            if (e.data === window.YT.PlayerState.PLAYING) {
              S.current.failChainCount = 0;
              const channel =
                S.current.activeIndex == null
                  ? null
                  : S.current.channels[S.current.activeIndex];
              if (channel?.current && playerRef.current?.getCurrentTime) {
                updateChannelAt(S.current.activeIndex, {
                  startedAt:
                    Date.now() - Number(playerRef.current.getCurrentTime() || 0) * 1000,
                });
              }
              clearStatusRef.current?.();
            }
            if (e.data === window.YT.PlayerState.ENDED) {
              advanceChannelRef.current?.('ended');
            }
          },
          onError(e) {
            playerRef.current = e.target;
            advanceChannelRef.current?.('error');
          },
        },
      });
    }

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, [updateChannelAt, volume]);

  const handleVolumeChange = useCallback((e) => {
    const v = Number(e.target.value);
    setVolume(v);
    playerRef.current?.setVolume?.(v);
    if (playerRef.current?.isMuted?.()) playerRef.current.unMute?.();
  }, []);

  const openSearchFn = useCallback(
    (q = '') => {
      setSearchOpen(true);
      setHudFadeOut(false);
      setNetworkFadeOut(false);
      clearTimeout(hudTimerRef.current);
      if (q) setSearchValue(q);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    },
    []
  );

  const closeSearchFn = useCallback(() => {
    setSearchOpen(false);
    resetHudIdle();
  }, [resetHudIdle]);

  const openSettingsFn = useCallback(() => {
    setSettingsVisible(true);
  }, []);

  const closeSettingsFn = useCallback(() => {
    setSettingsVisible(false);
  }, []);

  const toggleSubscription = useCallback(() => {
    const s = S.current;
    const query = cleanQuery(s.query);
    if (!query) return;

    setSubscriptions((prev) => {
      const idx = prev.findIndex((x) => queryKey(x.query) === queryKey(query));
      let updated;

      if (idx > -1) {
        updated = prev.filter((_, i) => i !== idx);
        showToast('REMOVED FROM SAVED NETWORKS');
      } else {
        updated = [{ query, seed: s.sessionSeed || makeSeed(query) }, ...prev];
        showToast('ADDED TO SAVED NETWORKS');
      }

      writeJson(SUBS_KEY, updated);
      setIsSubscribed(updated.some((x) => queryKey(x.query) === queryKey(query)));
      return updated;
    });
  }, [showToast]);

  const deleteSubscription = useCallback((network) => {
    const target = typeof network === 'string' ? network : network.query;
    setSubscriptions((prev) => {
      const updated = prev.filter((x) => queryKey(x.query) !== queryKey(target));
      writeJson(SUBS_KEY, updated);
      if (queryKey(S.current.query) === queryKey(target)) setIsSubscribed(false);
      return updated;
    });

  }, []);

  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      handleSearch(searchValue);
    },
    [searchValue, handleSearch]
  );

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeIndex((idx) => (idx + 1) % THEMES.length);
  }, []);

  const setTheme = useCallback((idx) => {
    setThemeIndex(idx % THEMES.length);
  }, []);

  const togglePower = useCallback(() => {
    setIsPoweredOff((prev) => {
      const next = !prev;
      if (next) {
        playerRef.current?.pauseVideo?.();
        noiseRef.current?.stop();
      } else {
        playerRef.current?.playVideo?.();
        if (document.querySelector('.status-layer.visible')) noiseRef.current?.start();
      }
      return next;
    });
  }, []);

  const goRelative = useCallback(
    (delta) => {
      const s = S.current;
      if (!s.query) return openSearchFn();
      switchTo((s.activeIndex ?? 0) + delta);
    },
    [openSearchFn, switchTo]
  );

  useEffect(() => {
    function onKeyDown(e) {
      if (searchOpen) {
        if (e.key === 'Escape') closeSearchFn();
        return;
      }

      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      const s = S.current;
      const key = e.key.toLowerCase();

      if (key === 'p') {
        e.preventDefault();
        togglePower();
        return;
      }

      if (poweredOffRef.current) return;

      if (e.key === ' ') {
        e.preventDefault();
        if (playerRef.current?.isMuted?.()) {
          playerRef.current.unMute?.();
          setVolume(playerRef.current.getVolume?.() || 70);
        } else {
          playerRef.current?.mute?.();
          setVolume(0);
        }
      } else if (key === 'c') {
        e.preventDefault();
        cycleTheme();
      } else if (key === 'o') {
        e.preventDefault();
        setOverlayEnabled((prev) => !prev);
      } else if (e.key === '/' || key === 's') {
        e.preventDefault();
        openSearchFn(s.query);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        goRelative(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        goRelative(-1);
      } else if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        if (s.query) switchTo(Number(e.key) - 1);
      } else if (e.key === '0') {
        e.preventDefault();
        if (s.query) switchTo(9);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    searchOpen,
    closeSearchFn,
    cycleTheme,
    goRelative,
    openSearchFn,
    switchTo,
    togglePower,
  ]);

  const handleTouchStart = useCallback((e) => {
    if (searchOpen || poweredOffRef.current) return;
    const touch = e.changedTouches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      t: Date.now(),
    };
  }, [searchOpen]);

  const handleTouchEnd = useCallback(
    (e) => {
      if (!touchStartRef.current || searchOpen || poweredOffRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.t;
      touchStartRef.current = null;

      if (dt > 700 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      goRelative(dx < 0 ? 1 : -1);
    },
    [goRelative, searchOpen]
  );

  const hasBothSections = history.length > 0 && subscriptions.length > 0;
  const onboarding = !currentQuery && history.length === 0 && subscriptions.length === 0;

  return (
    <div
      className={`app${isPoweredOff ? ' power-off' : ''}${edgeVideo ? ' edge-video' : ''}${THEMES[themeIndex] ? ` ${THEMES[themeIndex]}` : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <PlayerStage />

      <Overlays
        canvasRef={canvasRef}
        overlayEnabled={overlayEnabled}
        glitchRef={glitchRef}
        glitchActive={glitchActive}
        glitchBg={glitchBg}
        statusVisible={statusVisible}
        statusText={statusText}
        networkActive={networkActive}
        networkFadeOut={networkFadeOut}
        networkName={networkName}
        isSubscribed={isSubscribed}
        toggleSubscription={toggleSubscription}
        toastShow={toastShow}
        toastMsg={toastMsg}
        togglePower={togglePower}
      />

      <HUD
        hudFadeOut={hudFadeOut}
        volume={volume}
        channelLabel={channelLabel}
        openSearchFn={openSearchFn}
        handleVolumeChange={handleVolumeChange}
        switchTo={switchTo}
        toggleFullscreen={toggleFullscreen}
        query={currentQuery}
        activeIndex={activeIndexState}
      />

      <SearchModal
        searchOpen={searchOpen}
        closeSearchFn={closeSearchFn}
        searchInputRef={searchInputRef}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        handleSearchSubmit={handleSearchSubmit}
        history={history}
        handleSearch={handleSearch}
        subscriptions={subscriptions}
        deleteSubscription={deleteSubscription}
        helpVisible={helpVisible}
        setHelpVisible={setHelpVisible}
        openSettingsFn={openSettingsFn}
        hasBothSections={hasBothSections}
        onboarding={onboarding}
      />

      <SettingsModal
        settingsOpen={settingsVisible}
        closeSettingsFn={closeSettingsFn}
        overlayEnabled={overlayEnabled}
        setOverlayEnabled={setOverlayEnabled}
        fxEnabled={fxEnabled}
        setFxEnabled={setFxEnabled}
        edgeVideo={edgeVideo}
        setEdgeVideo={setEdgeVideo}
        themeIndex={themeIndex}
        setTheme={setTheme}
        themes={THEMES}
      />
    </div>
  );
}
