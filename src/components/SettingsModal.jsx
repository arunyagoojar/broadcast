export default function SettingsModal({
  settingsOpen,
  closeSettingsFn,
  overlayEnabled,
  setOverlayEnabled,
  fxEnabled,
  setFxEnabled,
  edgeVideo,
  setEdgeVideo,
  themeIndex,
  setTheme,
  themes,
}) {
  const themeLabels = ['COLOR', 'GREEN', 'AMBER', 'B&W'];

  return (
    <div
      className={`settings-modal${settingsOpen ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Broadcast settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSettingsFn();
      }}
    >
      <div className="settings-panel">
        <div className="search-header">
          <span className="search-title">BROADCAST SETTINGS</span>
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

        <div className="settings-grid">
          <label className="setting-row">
            <span>TUNE SOUND</span>
            <input
              type="checkbox"
              checked={fxEnabled}
              onChange={(e) => setFxEnabled(e.target.checked)}
            />
          </label>
          <label className="setting-row">
            <span>CRT OVERLAY</span>
            <input
              type="checkbox"
              checked={overlayEnabled}
              onChange={(e) => setOverlayEnabled(e.target.checked)}
            />
          </label>
          <label className="setting-row">
            <span>EDGE VIDEO</span>
            <input
              type="checkbox"
              checked={edgeVideo}
              onChange={(e) => setEdgeVideo(e.target.checked)}
            />
          </label>
        </div>

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
  );
}
