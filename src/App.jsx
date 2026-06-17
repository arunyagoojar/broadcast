import { useRef, useState, useEffect, useCallback } from 'react';

import { seededShuffle } from './utils/helpers';
import { searchYouTube } from './api/youtube';
import { createNoiseController } from './components/NoiseCanvasController';
import { useWakeLock } from './hooks/useWakeLock';
import PlayerStage from './components/PlayerStage';
import HUD from './components/HUD';
import SearchModal from './components/SearchModal';
import Overlays from './components/Overlays';


/* ─────────────────────────────────────────────────────
   MAIN APP COMPONENT
───────────────────────────────────────────────────── */
export default function App() {
  /* ── Refs ── */
  const canvasRef = useRef(null);
  const glitchRef = useRef(null);
  const searchInputRef = useRef(null);
  const hudTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const playerRef = useRef(null);
  const playerInitRef = useRef(false);
  const noiseRef = useRef(null);

  /* ── Mutable state (not triggering re-render) via ref ── */
  const S = useRef({
    query: '',
    sessionSeed: '',
    activeIndex: null,
    pool: [],
    poolPointer: 0,
    switchToken: 0,
    reqId: 0,
    failChainCount: 0,
    channelHistory: {},
  });

  /* ── React state (triggers re-render) ── */
  const [statusText, setStatusText] = useState('NO SIGNAL');
  const [statusVisible, setStatusVisible] = useState(true);
  const [hudFadeOut, setHudFadeOut] = useState(false);
  const [networkFadeOut, setNetworkFadeOut] = useState(false);
  const [networkActive, setNetworkActive] = useState(false);
  const [networkName, setNetworkName] = useState('-');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [channelLabel, setChannelLabel] = useState('CH 00');
  const [volume, setVolume] = useState(70);
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchBg, setGlitchBg] = useState('');
  const [isPoweredOff, setIsPoweredOff] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [history, setHistory] = useState(() =>
    JSON.parse(localStorage.getItem('ytTV_history') || '[]').slice(0, 5)
  );
  const [subscriptions, setSubscriptions] = useState(() =>
    JSON.parse(localStorage.getItem('ytTV_subs') || '[]')
  );
  const [helpVisible, setHelpVisible] = useState(false);

  /* Keep latest subscriptions in ref for non-render callbacks */
  const subsRef = useRef(subscriptions);
  useEffect(() => { subsRef.current = subscriptions; }, [subscriptions]);

  /* ── Callback refs for YouTube event handlers ──
     These refs always point to the latest function,
     so YouTube events never call stale closures. */
  const switchToRef = useRef(null);
  const handleChannelFailureRef = useRef(null);
  const clearStatusRef = useRef(null);

  /* ── Screen Wake Lock ── */
  useWakeLock();

  /* ── Toast helper ── */
  const showToast = useCallback((msg, ms = 2600) => {
    setToastMsg(msg);
    setToastShow(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastShow(false), ms);
  }, []);

  /* ── Status helpers ── */
  const setStatus = useCallback((label) => {
    setStatusText(label);
    setStatusVisible(true);
    if (noiseRef.current) noiseRef.current.start();
  }, []);

  const clearStatusFn = useCallback(() => {
    setStatusVisible(false);
    if (noiseRef.current) noiseRef.current.stop();
  }, []);

  /* ── Channel label sync ── */
  const syncLabels = useCallback(() => {
    const s = S.current;
    const ch = s.activeIndex == null ? '00' : String(s.activeIndex + 1).padStart(2, '0');
    setChannelLabel(`CH ${ch}`);
  }, []);

  /* ── Subscription UI sync ── */
  const syncSubscriptionUI = useCallback(() => {
    const s = S.current;
    if (!s.query) {
      setNetworkActive(false);
      return;
    }
    setNetworkName(s.query.toUpperCase());
    setNetworkActive(true);
    const isSub = subsRef.current.some(
      (x) => x.toLowerCase() === s.query.trim().toLowerCase()
    );
    setIsSubscribed(isSub);
  }, []);

  /* ── Glitch flash ── */
  const flashGlitch = useCallback(() => {
    setGlitchActive(false);
    // Force reflow via ref
    if (glitchRef.current) void glitchRef.current.offsetWidth;
    setGlitchBg(
      `repeating-linear-gradient(0deg,rgba(255,255,255,0.85) 0 1px,rgba(0,0,0,0.9) 1px ${2 + Math.random() * 3}px)`
    );
    setGlitchActive(true);
  }, []);

  /* ── HUD auto-hide ── */
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

  /* ── Noise canvas (imperative, once) ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const noise = createNoiseController(canvas);
    noise.init();
    noiseRef.current = noise;
    return () => {
      noise.destroy();
      noiseRef.current = null;
    };
  }, []);



  /* ── HUD idle listeners ── */
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

  /* ── Generate random offset for video playback ── */
  function generateRandomOffset(item) {
    const duration = item.dur || 300;
    return duration > 60 ? Math.floor(Math.random() * (duration * 0.7)) : 0;
  }

  /* ── Switch channel ── */
  const switchTo = useCallback(
    async (index, dir = 'forward', isVideoEnd = false) => {
      const s = S.current;
      void dir;
      if (!s.pool.length) {
        setStatus('NO SIGNAL');
        return;
      }

      // Save current position
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === 'function' &&
        s.activeIndex !== null &&
        s.pool[s.activeIndex]
      ) {
        try {
          const playerState = playerRef.current.getPlayerState?.();
          if (playerState === 1 || playerState === 2 || playerState === 3) {
            const currentVideo = s.pool[s.activeIndex];
            s.channelHistory[currentVideo.id] = {
              savedTime: playerRef.current.getCurrentTime() || 0,
              leftAt: Date.now(),
            };
          }
        } catch (err) {
          console.warn('[TV] Safely bypassed history tracking allocation:', err);
        }
      }

      if (index < 0)
        index = (s.pool.length + (index % s.pool.length)) % s.pool.length;
      else index = index % s.pool.length;

      s.switchToken++;
      const tok = s.switchToken;

      flashGlitch();
      setStatus('TUNING');

      const delayTime = s.failChainCount > 2 ? 800 : 250;
      await new Promise((r) => setTimeout(r, delayTime));
      if (tok !== s.switchToken) return;

      const item = s.pool[index];

      let startTime = 0;
      if (!isVideoEnd) {
        if (s.channelHistory[item.id]) {
          const hist = s.channelHistory[item.id];
          const elapsedSeconds = (Date.now() - hist.leftAt) / 1000;
          startTime = Math.floor(hist.savedTime + elapsedSeconds);
          if (item.dur && startTime >= item.dur) {
            startTime = startTime % item.dur;
          }
        } else {
          startTime = generateRandomOffset(item);
        }
      }

      s.activeIndex = index;
      syncLabels();

      if (playerRef.current && playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById({
          videoId: item.id,
          startSeconds: startTime,
        });
      }
    },
    [flashGlitch, setStatus, syncLabels]
  );

  /* ── Handle channel failure ── */
  const handleChannelFailure = useCallback(() => {
    const s = S.current;
    if (s.activeIndex == null || !s.pool.length) return;
    s.failChainCount++;

    if (s.failChainCount > s.pool.length) {
      showToast('SIGNAL LOSS DETECTED - SEARCH AGAIN');
      s.failChainCount = 0;
      setStatus('NO SIGNAL');
      return;
    }

    console.warn(
      `[TV] Restricted video bypass. Auto-tuning past index: ${s.activeIndex}`
    );
    switchTo(s.activeIndex + 1, 'forward');
  }, [showToast, setStatus, switchTo]);

  /* ── Keep callback refs updated for YouTube events ── */
  useEffect(() => { switchToRef.current = switchTo; }, [switchTo]);
  useEffect(() => { handleChannelFailureRef.current = handleChannelFailure; }, [handleChannelFailure]);
  useEffect(() => { clearStatusRef.current = clearStatusFn; }, [clearStatusFn]);

  /* ── Build session from search results ── */
  const buildSession = useCallback(
    (query, pool) => {
      const s = S.current;
      s.query = query;
      s.sessionSeed = `${query}::${Date.now()}`;
      s.activeIndex = 0;
      s.pool = seededShuffle(pool, s.sessionSeed);
      s.poolPointer = 0;
      s.failChainCount = 0;
      s.channelHistory = {};
      syncLabels();
      syncSubscriptionUI();
    },
    [syncLabels, syncSubscriptionUI]
  );

  /* ── Save search to history ── */
  const saveHistory = useCallback((q) => {
    setHistory((prev) => {
      const updated = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
      localStorage.setItem('ytTV_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleSearchRef = useRef(null);

  /* ── Handle search ── */
  const handleSearch = useCallback(
    async (q, isRetry = false) => {
      const query = q.trim().replace(/\s+/g, ' ');
      if (!query) return;

      // Close search
      setSearchOpen(false);
      resetHudIdle();
      setStatus(isRetry ? 'RETRYING' : 'SCANNING');

      const s = S.current;
      s.switchToken++;
      if (playerRef.current && playerRef.current.stopVideo)
        playerRef.current.stopVideo();

      s.reqId++;
      const reqId = s.reqId;

      let enrichedQuery = query;
      const lowerQ = query.toLowerCase();
      if (
        !lowerQ.includes('mix') &&
        !lowerQ.includes('compilation') &&
        !lowerQ.includes('album') &&
        !lowerQ.includes('playlist')
      ) {
        enrichedQuery += ' compilation mix';
      }

      try {
        const pool = await searchYouTube(enrichedQuery);
        if (reqId !== s.reqId) return;

        if (!pool || pool.length === 0) {
          if (!isRetry) {
            showToast('CONNECTION FAILED - RETRYING...');
            setTimeout(() => handleSearchRef.current?.(q, true), 1500);
          } else {
            setStatus('NO SIGNAL');
            showToast('SIGNAL LOST. TRY ANOTHER SEARCH.');
          }
          return;
        }

        buildSession(query, pool);
        saveHistory(query);
        showToast(`${pool.length} CHANNELS ONLINE`);
        switchTo(0, 'forward');
      } catch {
        if (reqId !== s.reqId) return;
        if (!isRetry) {
          showToast('CONNECTION FAILED - RETRYING...');
          setTimeout(() => handleSearchRef.current?.(q, true), 1500);
        } else {
          setStatus('NO SIGNAL');
          showToast('TRANS-LINK TIMED OUT');
        }
      }
    },
    [setStatus, showToast, buildSession, saveHistory, switchTo, resetHudIdle]
  );

  useEffect(() => {
    handleSearchRef.current = handleSearch;
  }, [handleSearch]);

  /* ── YouTube IFrame API ──
     Uses a guard ref to prevent double-initialization (React StrictMode),
     and callback refs so event handlers always call latest functions. */
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
            playerRef.current.setVolume(70);
          },
          onStateChange(e) {
            if (!window.YT) return;
            playerRef.current = e.target;
            if (e.data === window.YT.PlayerState.PLAYING) {
              S.current.failChainCount = 0;
              clearStatusRef.current?.();
            }
            if (e.data === window.YT.PlayerState.ENDED) {
              if (S.current.activeIndex == null) return;
              switchToRef.current?.(S.current.activeIndex + 1, 'forward', true);
            }
          },
          onError(e) {
            playerRef.current = e.target;
            handleChannelFailureRef.current?.();
          },
        },
      });
    }

    // YT API may already be loaded or we need to wait
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, []);

  /* ── Volume change handler ── */
  const handleVolumeChange = useCallback((e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (playerRef.current?.setVolume) playerRef.current.setVolume(v);
    if (playerRef.current?.unMute && playerRef.current.isMuted())
      playerRef.current.unMute();
  }, []);

  /* ── Open / Close search ── */
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

  /* ── Toggle subscription ── */
  const toggleSubscription = useCallback(() => {
    const s = S.current;
    if (!s.query) return;
    const normalized = s.query.trim();

    setSubscriptions((prev) => {
      const idx = prev.findIndex(
        (x) => x.toLowerCase() === normalized.toLowerCase()
      );
      let updated;
      if (idx > -1) {
        updated = prev.filter((_, i) => i !== idx);
        showToast('REMOVED FROM SAVED NETWORKS');
      } else {
        updated = [normalized, ...prev];
        showToast('ADDED TO SAVED NETWORKS');
      }
      localStorage.setItem('ytTV_subs', JSON.stringify(updated));
      const isSub = updated.some(
        (x) => x.toLowerCase() === s.query.trim().toLowerCase()
      );
      setIsSubscribed(isSub);
      return updated;
    });
  }, [showToast]);

  /* ── Delete subscription ── */
  const deleteSubscription = useCallback(
    (q) => {
      setSubscriptions((prev) => {
        const updated = prev.filter((x) => x !== q);
        localStorage.setItem('ytTV_subs', JSON.stringify(updated));
        if (S.current.query.toLowerCase() === q.toLowerCase()) {
          const isSub = updated.some(
            (x) => x.toLowerCase() === S.current.query.trim().toLowerCase()
          );
          setIsSubscribed(isSub);
        }
        return updated;
      });
    },
    []
  );

  /* ── Search form submit ── */
  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      handleSearch(searchValue);
    },
    [searchValue, handleSearch]
  );

  /* ── Fullscreen toggle ── */
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.().catch(() => { });
    } else {
      await document.exitFullscreen?.().catch(() => { });
    }
  }, []);

  /* ── Theme cycling ── */
  const themes = useRef(['', 'theme-green', 'theme-amber', 'theme-bw']);
  const themeIdx = useRef(0);
  const cycleTheme = useCallback(() => {
    themeIdx.current = (themeIdx.current + 1) % themes.current.length;
    document.body.className = themes.current[themeIdx.current];
  }, []);

  /* ── Power toggle ── */
  const togglePower = useCallback(() => {
    setIsPoweredOff((prev) => {
      const next = !prev;
      if (next) {
        if (playerRef.current?.pauseVideo) playerRef.current.pauseVideo();
        if (noiseRef.current) noiseRef.current.stop();
      } else {
        if (playerRef.current?.playVideo) playerRef.current.playVideo();
        // If status layer is visible, restart noise
        if (document.querySelector('.status-layer.visible')) {
          if (noiseRef.current) noiseRef.current.start();
        }
      }
      return next;
    });
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function onKeyDown(e) {
      if (searchOpen) {
        if (e.key === 'Escape') closeSearchFn();
        return;
      }
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
      )
        return;

      const s = S.current;

      if (e.key === ' ') {
        e.preventDefault();
        if (playerRef.current?.isMuted) {
          if (playerRef.current.isMuted()) {
            playerRef.current.unMute();
            setVolume(playerRef.current.getVolume());
          } else {
            playerRef.current.mute();
            setVolume(0);
          }
        }
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        cycleTheme();
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setOverlayEnabled((prev) => !prev);
      } else if (e.key === '/' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        openSearchFn(s.query);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!s.query) return openSearchFn();
        switchTo((s.activeIndex ?? -1) + 1, 'forward');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!s.query) return openSearchFn();
        switchTo((s.activeIndex ?? 0) - 1, 'back');
      } else if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        if (s.query) switchTo(Number(e.key) - 1, 'forward');
      } else if (e.key === '0') {
        e.preventDefault();
        if (s.query) switchTo(9, 'forward');
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, closeSearchFn, openSearchFn, switchTo, cycleTheme]);

  /* ── Derived values ── */
  const hasBothSections = history.length > 0 && subscriptions.length > 0;

  /* ── JSX ── */
  return (
    <div className={`app${isPoweredOff ? ' power-off' : ''}`}>
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
        query={S.current.query}
        activeIndex={S.current.activeIndex}
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
        hasBothSections={hasBothSections}
      />
    </div>
  );
}
