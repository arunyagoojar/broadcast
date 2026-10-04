import { useEffect, useRef } from 'react';
import { playClick } from '../utils/sounds';

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
          </div>
        </div>
      </div>
    </div>
  );
}
