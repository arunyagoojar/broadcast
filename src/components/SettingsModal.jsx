import { useEffect, useRef, useState } from 'react';
import { playClick } from '../utils/sounds';
import { writeJson } from '../utils/storage';
import {
  PROXY_TOKEN_KEY,
  PROXY_URL_KEY,
  getProxyToken,
  getProxyUrl,
} from '../api/proxySearch';

const ASPECT_RATIOS = [
  { value: '16-9', label: '16 : 9', sub: 'Widescreen (default)' },
  { value: '4-3', label: '4 : 3', sub: 'Classic TV' },
  { value: '21-9', label: '21 : 9', sub: 'Cinematic' },
  { value: 'full', label: 'Full', sub: 'Stretch to fill' },
];

export default function SettingsModal({
  settingsOpen,
  closeSettingsFn,
  overlayEnabled,
  setOverlayEnabled,
  vignetteEnabled,
  setVignetteEnabled,
  aspectRatio,
  setAspectRatio,
  themeIndex,
  setTheme,
  themes,
}) {
  const panelRef = useRef(null);
  const themeLabels = ['COLOR', 'GREEN', 'AMBER', 'B&W'];
  const [proxyUrl, setProxyUrl] = useState(() => getProxyUrl());
  const [proxyToken, setProxyToken] = useState(() => getProxyToken());

  function saveProxy(kind, value) {
    if (kind === 'url') setProxyUrl(value);
    else setProxyToken(value);
    writeJson(kind === 'url' ? PROXY_URL_KEY : PROXY_TOKEN_KEY, value.trim());
  }

  useEffect(() => {
    if (!settingsOpen) return undefined;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        closeSettingsFn();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen, closeSettingsFn]);

  return (
    <div
      className={`left-menu-container settings-slab${settingsOpen ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Broadcast settings"
    >
      <div className="left-menu-perspective">
        <div className="left-menu" ref={panelRef}>
          <div className="left-menu-header settings-header">
            <span className="search-title">SETTINGS</span>
            <button
              className="search-close-btn"
              type="button"
              onClick={closeSettingsFn}
              aria-label="Close settings"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="left-menu-content settings-content">
            {/* Aspect ratio */}
            <div className="left-menu-group-label">ASPECT RATIO</div>
            <div className="left-menu-list">
              {ASPECT_RATIOS.map((ar) => {
                const active = aspectRatio === ar.value;
                return (
                  <button
                    key={ar.value}
                    type="button"
                    className={`left-menu-item settings-option${active ? ' active' : ''}`}
                    onClick={() => {
                      playClick();
                      setAspectRatio(ar.value);
                    }}
                  >
                    <div
                      className={`radio-dot${active ? ' on' : ''}`}
                      aria-hidden="true"
                    />
                    <div className="settings-option-text">
                      <span className="channel-name">{ar.label}</span>
                      <span className="settings-option-sub">{ar.sub}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Appearance */}
            <div className="left-menu-group-label">APPEARANCE</div>
            <div className="left-menu-list">
              <button
                type="button"
                className={`left-menu-item settings-option${overlayEnabled ? ' active' : ''}`}
                onClick={() => {
                  playClick();
                  setOverlayEnabled((v) => !v);
                }}
              >
                <div className={`radio-dot${overlayEnabled ? ' on' : ''}`} />
                <span className="channel-name">CRT OVERLAY</span>
              </button>
              <button
                type="button"
                className={`left-menu-item settings-option${vignetteEnabled ? ' active' : ''}`}
                onClick={() => {
                  playClick();
                  setVignetteEnabled((v) => !v);
                }}
              >
                <div className={`radio-dot${vignetteEnabled ? ' on' : ''}`} />
                <span className="channel-name">VIGNETTE</span>
              </button>
            </div>

            {/* Theme */}
            <div className="left-menu-group-label">THEME</div>
            <div className="theme-row">
              {themes.map((theme, i) => (
                <button
                  key={theme || 'theme-color'}
                  type="button"
                  className={`theme-chip${themeIndex === i ? ' active' : ''}`}
                  onClick={() => setTheme(i)}
                >
                  {themeLabels[i]}
                </button>
              ))}
            </div>

            {/* Search proxy */}
            <div className="left-menu-group-label">SEARCH PROXY</div>
            <div className="settings-proxy">
              <span
                className={`settings-proxy-status${
                  proxyUrl ? ' on' : ''
                }`}
              >
                {proxyUrl ? 'CUSTOM PROXY ACTIVE' : 'PUBLIC FALLBACK'}
              </span>
              <input
                className="settings-input"
                type="url"
                spellCheck="false"
                placeholder="https://broadcast-search.your-name.workers.dev"
                value={proxyUrl}
                onChange={(e) => saveProxy('url', e.target.value)}
                aria-label="Search proxy URL"
              />
              <input
                className="settings-input"
                type="text"
                spellCheck="false"
                placeholder="Proxy token (optional)"
                value={proxyToken}
                onChange={(e) => saveProxy('token', e.target.value)}
                aria-label="Search proxy token"
              />
              <p className="settings-proxy-help">
                Deploy the free worker in <code>worker/</code> for search that
                never dies — see README, takes 2 minutes. Empty = public
                Invidious pool (unreliable).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
